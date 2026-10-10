// Source routing is deliberately explicit. Only NYRA has a connected automated provider.
const SOURCES=Object.freeze({
 belmont:{label:'Belmont Park',mode:'automatic',venue:'belmont'},
 aqueduct:{label:'Aqueduct',mode:'automatic',venue:'aqueduct'},
 saratoga:{label:'Saratoga',mode:'automatic',venue:'saratoga'},
 keeneland:{label:'Keeneland',mode:'manual',url:'https://www.keeneland.com/odds'},
 churchill:{label:'Churchill Downs',mode:'manual',url:'https://www.churchilldowns.com/racing/'}
});
export function oddsSourceForTrack(track){
 const t=String(track||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
 if(t==='bel'||t==='belmont'||t==='belmontpark'||t==='baq'||t==='belmontatthebiga')return {id:'belmont',...SOURCES.belmont};
 if(t==='aqu'||t==='aqueduct')return {id:'aqueduct',...SOURCES.aqueduct};
 if(t==='sar'||t==='saratoga')return {id:'saratoga',...SOURCES.saratoga};
 if(t==='kee'||t==='keeneland')return {id:'keeneland',...SOURCES.keeneland};
 if(t==='cd'||t==='churchill'||t==='churchilldowns')return {id:'churchill',...SOURCES.churchill};
 return {id:null,label:track||'Unknown track',mode:'unsupported'};
}
const cleanName=s=>String(s||'').replace(/\s*\((?:GB|IRE|FR|GER|ARG|BRZ|CHI|AUS|NZ|JPN|CAN|USA|ITY|SAF)\)\s*$/i,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const validOdds=s=>/^(?:\d+(?:\.\d+)?\/\d+(?:\.\d+)?|\d+(?:\.\d+)?)$/.test(s)&&(!s.includes('/')||Number(s.split('/')[1])>0);
export function applyManualOdds(race,rows,{sourceUrl,observedAt,now=Date.now()}={}){
 const source=oddsSourceForTrack(race.track);
 if(source.mode!=='manual')throw Error('Manual source adapter not configured for this track');
 if(sourceUrl!==source.url)throw Error('Select the official source for the active track');
 const timestamp=Date.parse(observedAt);
 if(!Number.isFinite(timestamp)||timestamp>now+5000||now-timestamp>600000)throw Error('Observation time must be within the last 10 minutes');
 if(!Array.isArray(rows)||rows.length!==race.horses.length)throw Error('Complete field required, including scratched horses');
 const out=structuredClone(race),seen=new Set();
 for(const row of rows){
  const program=String(row.program||'').trim(),horse=out.horses.find(h=>String(h.n)===program);
  if(!horse||seen.has(program)||cleanName(horse.name)!==cleanName(row.name))throw Error('Runner number/name mismatch or duplicate: '+program);
  seen.add(program);
  const price=String(row.odds||'').trim().toUpperCase();
  if(horse.odds==='SCR'){if(price!=='SCR')throw Error('Previously scratched horse cannot be reactivated');continue;}
  if(price==='SCR')throw Error('Verify scratches using official entries before updating odds');
  if(!validOdds(price))throw Error('Invalid odds for #'+program);
  horse.odds=price;
  horse.pre_race_evidence={sourceUrl,importedAt:new Date(now).toISOString(),observedAt:new Date(timestamp).toISOString(),status:'MANUAL_SOURCE_SNAPSHOT',upstreamAgeSeconds:null,bettingEligible:false};
 }
 out.odds_snapshot={fetchedAt:new Date(now).toISOString(),observedAt:new Date(timestamp).toISOString(),sourceUrl,sourceId:source.id,method:'manual',bettingEligible:false};
 return out;
}
export function parseManualOdds(text){
 const lines=String(text||'').trim().split(/\r?\n/).filter(Boolean);
 if(!lines.length)throw Error('Paste one runner per line');
 return lines.map((line,i)=>{
  const parts=line.split(/\s*[,|\t]\s*/).map(x=>x.trim());
  if(parts.length!==3||!parts.every(Boolean))throw Error('Line '+(i+1)+' must contain program number, horse name, odds separated by commas, tabs or |');
  return {program:parts[0],name:parts[1],odds:parts[2]};
 });
}
