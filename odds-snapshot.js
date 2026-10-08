const normalize=s=>String(s||'').replace(/\s*\((?:GB|IRE|FR|GER|ARG|BRZ|CHI|AUS|NZ|JPN|CAN|USA|ITY|SAF)\)\s*$/i,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function applyOddsSnapshot(race,snapshot,now=Date.now()){
 const venue=String(race.track).toLowerCase().includes('saratoga')?'saratoga':String(race.track).toLowerCase().includes('aqueduct')?'aqueduct':'belmont';
 if(snapshot.schemaVersion!==1||snapshot.track!==venue||snapshot.date!==race.date||snapshot.race!==race.race)throw Error('Snapshot race does not match the active card');
 const time=Date.parse(snapshot.fetchedAt);
 if(!Number.isFinite(time)||time>now+5000||now-time>60000)throw Error('Retrieval timestamp is invalid or too old');
 if(!Array.isArray(snapshot.runners)||snapshot.runners.length!==race.horses.length)throw Error('Incomplete field; previous prices retained');
 const out=structuredClone(race),seen=new Set();
 for(const row of snapshot.runners){
  const horse=out.horses.find(h=>String(h.n)===String(row.program)&&normalize(h.name)===normalize(row.name));
  if(!horse||seen.has(String(row.program)))throw Error('Unknown or duplicate runner; previous prices retained');
  seen.add(String(row.program));
  if(!/^(SCR|\d+(?:\.\d+)?\/\d+(?:\.\d+)?)$/.test(row.odds)||row.odds!=='SCR'&&Number(row.odds.split('/')[1])<=0)throw Error('Invalid price; previous prices retained');
  if(horse.odds==='SCR'&&row.odds!=='SCR')throw Error('Previously scratched runner requires field verification');
  horse.odds=row.odds;
  horse.pre_race_evidence={sourceUrl:snapshot.sourceUrl,importedAt:snapshot.fetchedAt,observedAt:null,status:'PUBLIC_PAGE_SNAPSHOT',upstreamAgeSeconds:snapshot.upstreamAgeSeconds,bettingEligible:false};
 }
 out.odds_snapshot={fetchedAt:snapshot.fetchedAt,upstreamAgeSeconds:snapshot.upstreamAgeSeconds,sourceUrl:snapshot.sourceUrl};
 return out;
}
