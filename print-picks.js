// Read-only print view of existing forecasts. No scoring changes.
import {buildRaceDashboard,selectMorningLineProvider} from './race-day-dashboard.js?v=20261113-status';
import {pairedRace,cardProvider} from './dual-pp-cards.js';
import {decodeTodayDistance} from './finisher-drf-distance.js';
const ids=['primePower','brisResearch','brisFinisher','brisContender','drfContender','morningLine'];
const labels=['Prime Power','Brisnet-RR','Brisnet Finisher','Brisnet Contender','DRF Contender Late +50%','M/L'];
const key=h=>String(h.name||'').replace(/\s*\([A-Za-z]{2,3}\)\s*$/,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function printableRace(d,anchor,notes=''){
 const pp=d.field.map(h=>{const value=d.prime_power?.[key(h)]||'',m=value.match(/^(\d+(?:\.\d+)?)\s*\((\d+)/);return {...h,value,score:m?+m[1]:null,printedRank:m?+m[2]:null};}).filter(h=>Number.isFinite(h.score)).sort((a,b)=>b.score-a.score||a.printedRank-b.printedRank).slice(0,4).map((h,i)=>({...h,rank:i+1}));
 const columns=ids.map((id,i)=>{const m=id==='primePower'?{rankings:pp,available:!!pp.length,decision:'REFERENCE',ranked:pp.length,eligible:d.field.length}:id==='morningLine'?d.morning_line:d.models.find(m=>m.id===id);return {...m,id,label:labels[i],nameOnly:(m?.rankings||[]).some(h=>!h.n),rankings:(m?.rankings||[]).slice(0,4),picks:(m?.rankings||[]).slice(0,4).map(h=>String(h.n||h.name))};});
 const selected=new Set(columns.flatMap(c=>c.rankings.map(key))),ordered=[...d.shortlist,...(d.remaining||[]),...(d.unranked||[])];
 const rows=ordered.filter(h=>selected.has(key(h))).map(h=>({...h,primePower:d.prime_power?.[key(h)]||null,ranks:Object.fromEntries(columns.slice(1).map(c=>[c.id,c.rankings.find(x=>key(x)===key(h))?.rank??null]))}));
 const seen=new Set(rows.map(key));for(const h of d.field)if(selected.has(key(h))&&!seen.has(key(h)))rows.push({...h,primePower:d.prime_power?.[key(h)]||null,ranks:Object.fromEntries(columns.slice(1).map(c=>[c.id,c.rankings.find(x=>key(x)===key(h))?.rank??null]))});
 const fts=d.field.filter(h=>d.fts_research?.[key(h)]).map(h=>({...h,evidence:d.fts_research[key(h)]}));
 const dist=Number.isFinite(anchor.distance_furlongs)?anchor.distance_furlongs:decodeTodayDistance(anchor.conditions?.primaryDistanceLine||anchor.header||anchor.dist).furlongs;
 return {race:anchor.race,surface:anchor.surface,distance:Number.isFinite(dist)?dist+' furlongs':anchor.dist||'Distance unverified',going:anchor.going||null,post:anchor.post||null,columns,rows,fts,notes:String(notes),scratches:[...new Set([...(anchor.horses||[]).filter(h=>h.odds==='SCR').map(h=>String(h.n||h.name)),...(anchor.predeclared_scratches||[]).map(h=>String(h.program||h.name))])],conditional:(anchor.horses||[]).filter(h=>h.odds!=='SCR'&&['AE','ALSO_ELIGIBLE','MTO'].includes(h.entry_status)&&h.included_in_frozen_field!==true).map(h=>String(h.n||h.name))};
}
export function buildPicksSheet({cards,card,currentRace=null,notes={},now=new Date().toISOString()},ranker){
 if(!card?.id||!card?.date||!card?.track||!Object.keys(card.races||{}).length)throw Error('Load a dated PP card before printing.');
 const provider=cardProvider(card),sources={...cards,[provider]:structuredClone(card)};
 if(currentRace&&Number.isInteger(Number(currentRace.race)))sources[provider].races[currentRace.race]=structuredClone(currentRace);
 const races=Object.keys(card.races).sort((a,b)=>Number(a)-Number(b)).map(k=>{const anchor=sources[provider].races[k],paired=Object.fromEntries(['BRISNET','DRF'].map(p=>[p,pairedRace(sources,p,anchor)])),morningLineProvider=selectMorningLineProvider({anchor,sources:paired,preferredProvider:provider,importedAt:Object.fromEntries(Object.entries(sources).map(([p,c])=>[p,c.imported_at]))});return printableRace(buildRaceDashboard({anchor,sources:paired,morningLineProvider},ranker),anchor,notes[k]||'');});
 return {track:card.track,date:card.date,generatedAt:now,sourceProvider:provider,races,bettingEnabled:false};
}
// Retained as an API for existing research callers; never rendered on the printout.
export function paperWagers(picks){return {win:picks[0]||'Unavailable',exacta:picks.length>=2?`${picks[0]}-${picks[1]}, ${picks[1]}-${picks[0]}`:'Unavailable',trifecta:picks.length>=3?picks.slice(0,3).join('-')+' box':'Unavailable'};}
const ascii=s=>String(s??'').normalize('NFKD').replace(/[‘’]/g,"'").replace(/[–—]/g,'-').replace(/[^\x20-\x7e]/g,'?');
const escape=s=>ascii(s).replace(/([\\()])/g,'\\$1');
const advances=[278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];

const width=(s,size)=>[...ascii(s)].reduce((n,c)=>n+(advances[c.charCodeAt(0)-32]||556),0)*size/1000;
function wrap(s,max,size){const out=[];let line='';for(const word of ascii(s).split(/\s+/)){if(width((line?line+' ':'')+word,size)>max&&line){out.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)out.push(line);return out.length?out:[''];}
function ftsLines(f,compact=false){
 const e=f.evidence,p=e.pedigree,t=e.trainer,w=e.workouts;
 if(compact)return [(f.n?'#'+f.n+' ':'')+f.name,(p?'PED '+p.score.toFixed(1)+(p.flag||''):'PED -')+' | '+(t?t.category+': '+t.win_pct+'% / '+t.starts:'Trainer debut: unavailable'),(w.percentile==null?'WORK -':'WORK '+Math.round(w.percentile)+'/100 ('+w.compared+' works)')+' | '+w.count30+' in 30d'+(w.latest_days==null?'':' | latest '+w.latest_days+'d ago')];
 return [(f.n?'#'+f.n+' ':'')+f.name,p?'PED '+p.score.toFixed(1)+(p.flag||''):e.pedigree_status==='TAPETA_UNVALIDATED'?'PED - (Tapeta untested)':'PED -',t?t.category+': '+t.win_pct+'% / '+t.starts:'Trainer debut: unavailable',w.percentile==null?'WORK -':'WORK '+Math.round(w.percentile)+'/100 ('+w.compared+' '+(w.compared===1?'work':'works')+')',w.latest_days==null?'Recent works unavailable':w.count30+' in 30d - latest '+w.latest_days+'d ago'];
}
function raceLayout(r,compact=false){
 const rowHeight=compact?9:11,bodySize=compact?7.2:8,lineHeight=compact?8:9,headerHeight=compact?20:23,ftsLineHeight=compact?7.8:8.4,rows=(r.rows||[]).map(h=>({h,lines:wrap((h.n?'#'+h.n+' ':'')+h.name,164,bodySize)})),tableHeight=headerHeight+rows.reduce((s,x)=>s+Math.max(rowHeight,x.lines.length*lineHeight+2),0);
 const ftsRows=[];for(let i=0;i<(r.fts||[]).length;i+=3){const entries=r.fts.slice(i,i+3).map(f=>ftsLines(f,compact).map((s,j)=>wrap(s,174,j===0?7.8:7.2)));ftsRows.push({entries,height:Math.max(...entries.map(e=>e.reduce((n,a)=>n+a.length*ftsLineHeight,0)))+6});}
 const ftsHeight=ftsRows.length?12+ftsRows.reduce((n,x)=>n+x.height,0):0;
 return {rows,tableHeight,ftsRows,ftsHeight,rowHeight,bodySize,lineHeight,headerHeight,ftsLineHeight,height:18+tableHeight+ftsHeight+(compact?14:22)};
}
// Two US-letter pages for a complete card; scale vector content to fit, never drop races or FTS.
export function picksPdf(sheet){
 const split=Math.ceil(sheet.races.length/2),groups=[sheet.races.slice(0,split),sheet.races.slice(split)],pages=[];
 for(let pageIndex=0;pageIndex<2;pageIndex++){
  const commands=[],text=(x,y,s,size=8,bold=false)=>commands.push(`BT /${bold?'F2':'F1'} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escape(s)}) Tj ET`),line=(x,y,x2,y2)=>commands.push(`0.76 G 0.35 w ${x} ${y} m ${x2} ${y2} l S 0 G`);
  text(30,757,'Race Day Handicapper',18,true);text(30,738,sheet.track+' - '+sheet.date,10,true);text(414,757,'SELECTIONS / '+(pageIndex+1)+' OF 2',8,true);
  const stamp=new Date(sheet.generatedAt).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  text(30,723,(sheet.previewLabel?sheet.previewLabel+' | ':'')+'Updated '+stamp+' ET',7.4);line(30,714,582,714);
  const group=groups[pageIndex],layouts=group.map(r=>raceLayout(r,sheet.races.length>10)),natural=layouts.reduce((s,l)=>s+l.height,0),scale=Math.min(1,660/Math.max(1,natural)),extra=group.length?Math.max(0,660/scale-natural)/group.length:0;
  commands.push(`q ${scale} 0 0 ${scale} ${(612-552*scale)/2} 704 cm`);let y=0;
  group.forEach((r,index)=>{
   const l=layouts[index],xs=[0,165,229.5,294,358.5,423,487.5],cw=[165,64.5,64.5,64.5,64.5,64.5,64.5],headers=[['Horse # / Name'],['Prime','Power'],['Brisnet','RR'],['Brisnet','Finisher'],['Brisnet','Contender'],['DRF Contender','Late +50%'],['M/L','Rank']];
   text(0,y,'RACE '+r.race,10,true);text(57,y,[r.distance,r.surface,r.going].filter(Boolean).join(' - '),8);text(452,y,(r.rows||[]).length+' horses shown',7);
   const top=y-8,bottom=top-l.tableHeight;commands.push(`0.98 0.97 0.93 rg ${xs[2]} ${bottom} ${cw[2]} ${l.tableHeight} re f 0 g`);
   headers.forEach((a,i)=>a.forEach((s,j)=>text(xs[i]+(i?Math.max(3,(cw[i]-width(s,7.2))/2):3),top-9-j*8,s,7.2,true)));
   let ry=top-l.headerHeight;line(0,ry,552,ry);
   for(const row of l.rows){const h=row.h,hh=Math.max(l.rowHeight,row.lines.length*l.lineHeight+2);row.lines.forEach((s,j)=>text(3,ry-(l.bodySize===8?8:7)-j*l.lineHeight,s,l.bodySize));
    const cells=[h.primePower||'-',...ids.slice(1).map(id=>h.ranks[id]??'-')];cells.forEach((v,i)=>{const size=i===1?9:8;text(xs[i+1]+Math.max(3,(cw[i+1]-width(v,size))/2),ry-8,v,size,i===1);});ry-=hh;line(0,ry,552,ry);
   }
   commands.push(`0.5 0.43 0.24 RG 1 w ${xs[2]} ${bottom} ${cw[2]} ${l.tableHeight} re S 0 G`);
   let fy=bottom-10;
   if(l.ftsRows.length){text(0,fy,'FIRST-TIME STARTERS',7.5,true);fy-=12;for(const fr of l.ftsRows){fr.entries.forEach((entry,i)=>{let ey=fy;entry.forEach((lines,j)=>{lines.forEach(s=>{text(i*184+3,ey,s,j===0?7.8:7.2,j===0);ey-=l.ftsLineHeight;});});});fy-=fr.height;}}
   text(0,fy-2,'Notes:',8,true);text(32,fy-2,wrap(r.notes||'',510,8)[0],8);
   y-=l.height+extra;
  });commands.push('Q');
  text(30,31,'Ranks 1-4 only. Prime Power as printed. FTS research does not change model ranks.',7);
  text(30,20,'Static snapshot - reprint after scratches or race changes. PASS remains PASS.',7);
  pages.push(commands.join('\n'));
 }
 const objects=[null,'<< /Type /Catalog /Pages 2 0 R >>',null,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'],kids=[];
 for(const content of pages){const id=objects.length;kids.push(`${id} 0 R`);objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${id+1} 0 R >>`);objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);}
 objects[2]=`<< /Type /Pages /Count 2 /Kids [${kids.join(' ')}] >>`;let pdf='%PDF-1.4\n',offsets=[0];for(let i=1;i<objects.length;i++){offsets.push(pdf.length);pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}const offset=pdf.length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`;return new TextEncoder().encode(pdf);
}

export function createPicksPreview({getSheet,open=()=>window.open('','_blank')}={}){
 let preview=null,url=null,signature=null;
 const refresh=()=>{
  if(!preview||preview.closed){preview=null;return false;}
  const sheet=getSheet(),key=JSON.stringify({...sheet,generatedAt:null});if(key===signature)return true;
  const next=URL.createObjectURL(new Blob([picksPdf(sheet)],{type:'application/pdf'}));
  try{preview.location.replace(next);}catch(e){URL.revokeObjectURL(next);throw e;}
  const old=url;url=next;signature=key;if(old)setTimeout(()=>URL.revokeObjectURL(old),60000);return true;
 };
 return {show(){getSheet();if(!preview||preview.closed){preview=open();signature=null;}if(!preview)throw Error('Allow pop-ups for this site, then press Print Picks again.');refresh();return true;},refresh};
}
