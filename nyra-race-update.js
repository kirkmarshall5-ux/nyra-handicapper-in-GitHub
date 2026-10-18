import {oddsSourceForTrack} from './multitrack-odds.js';
import {applyOddsSnapshot} from './odds-snapshot.js';
export const NYRA_UPDATE_SERVICE='https://nyra-odds-snapshot.beigebeech4.chatgpt.site/odds';
export function nyraRaceUpdateSource(race){return oddsSourceForTrack(race.track);}
export async function fetchNyraRaceUpdate(race,{fetcher=globalThis.fetch,now=()=>Date.now()}={}){
 const source=nyraRaceUpdateSource(race);
 if(source.mode!=='automatic')throw Error('Automatic NYRA updates are unavailable for '+(race.track||'this track'));
 const frozen=structuredClone(race),url=new URL(NYRA_UPDATE_SERVICE);url.search=new URLSearchParams({track:source.venue,date:frozen.date,race:frozen.race});
 const response=await fetcher(url,{cache:'no-store',signal:AbortSignal.timeout(22000)});
 if(!response.ok)throw Error('NYRA service unavailable (HTTP '+response.status+')');
 if(!(response.headers.get('content-type')||'').includes('application/json'))throw Error('NYRA service did not return race data');
 const snapshot=await response.json(),updated=applyOddsSnapshot(frozen,snapshot,now());
 for(const h of updated.horses)if(h.odds==='SCR')h.scratch_evidence={sourceUrl:snapshot.sourceUrl,observedAt:snapshot.fetchedAt,status:'NYRA_PUBLIC_PAGE_SCRATCH_SNAPSHOT'};
 return {race:updated,snapshot};
}

// Reuse the strict snapshot validator for a matching saved PP source.
export {applyOddsSnapshot as applyNyraSnapshotToRace} from './odds-snapshot.js';
