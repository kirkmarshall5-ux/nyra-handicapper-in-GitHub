import {oddsSourceForTrack} from './multitrack-odds.js';
import {matchUpdateRunner,runnerName,runnerProgram} from './runner-identity.js';
export function applyOddsSnapshot(race,snapshot,now=Date.now()){
 const source=oddsSourceForTrack(race.track);
 if(source.mode!=='automatic')throw Error('No NYRA odds adapter for '+race.track);
 const venue=source.venue;
 if(snapshot.schemaVersion!==1||snapshot.track!==venue||snapshot.date!==race.date||snapshot.race!==race.race)throw Error('Snapshot race does not match the active card');
 const time=Date.parse(snapshot.fetchedAt);
 if(!Number.isFinite(time)||time>now+5000||now-time>60000)throw Error('Retrieval timestamp is invalid or too old');
 if(!Array.isArray(snapshot.runners)||snapshot.runners.length!==race.horses.length)throw Error('Incomplete field; previous prices retained');
 const out=structuredClone(race),seen=new Set(),names=new Set();
 for(const row of snapshot.runners){
  if(!runnerProgram(row.program)||!runnerName(row.name))throw Error('Snapshot runner identity is incomplete');
  const horse=matchUpdateRunner(out.horses,row);
  if(seen.has(runnerProgram(row.program))||names.has(runnerName(row.name)))throw Error(`Unknown or duplicate runner #${row.program} (${row.name}); previous prices retained`);
  seen.add(runnerProgram(row.program));names.add(runnerName(row.name));
  if(!/^(SCR|\d+(?:\.\d+)?\/\d+(?:\.\d+)?)$/.test(row.odds)||row.odds!=='SCR'&&Number(row.odds.split('/')[1])<=0)throw Error('Invalid price; previous prices retained');
  if(horse.odds==='SCR'&&row.odds!=='SCR')throw Error('Previously scratched runner requires field verification');
  horse.odds=row.odds;
  horse.pre_race_evidence={sourceUrl:snapshot.sourceUrl,importedAt:snapshot.fetchedAt,observedAt:null,status:'PUBLIC_PAGE_SNAPSHOT',upstreamAgeSeconds:snapshot.upstreamAgeSeconds,bettingEligible:false};
 }
 out.odds_snapshot={fetchedAt:snapshot.fetchedAt,upstreamAgeSeconds:snapshot.upstreamAgeSeconds,sourceUrl:snapshot.sourceUrl};
 return out;
}
