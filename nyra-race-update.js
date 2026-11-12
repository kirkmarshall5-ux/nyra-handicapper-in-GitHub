import {cardProvider,pairedRace} from './dual-pp-cards.js';
import {oddsSourceForTrack} from './multitrack-odds.js';
import {applyOddsSnapshot} from './odds-snapshot.js?v=20261112-preserve-scratches';
export const NYRA_UPDATE_SERVICE='https://nyra-odds-snapshot.kirkmarshall5.chatgpt.site/odds';
export function nyraRaceUpdateSource(race){return oddsSourceForTrack(race.track);}
export async function fetchNyraRaceUpdate(race,{fetcher=globalThis.fetch,now=()=>Date.now()}={}){
 const source=nyraRaceUpdateSource(race);
 if(source.mode!=='automatic')throw Error('Automatic NYRA updates are unavailable for '+(race.track||'this track'));
 const frozen=structuredClone(race),url=new URL(NYRA_UPDATE_SERVICE);url.search=new URLSearchParams({track:source.venue,date:frozen.date,race:frozen.race});
 const response=await fetcher(url,{cache:'no-store',signal:AbortSignal.timeout(22000)});
 if(!response.ok)throw Error('NYRA service unavailable (HTTP '+response.status+')');
 if(!(response.headers.get('content-type')||'').includes('application/json'))throw Error('NYRA service did not return race data');
 const snapshot=await response.json(),updated=applyOddsSnapshot(frozen,snapshot,now(),{preserveScratches:true});
 for(const h of updated.horses)if(h.odds==='SCR'&&!h.scratch_evidence)h.scratch_evidence={sourceUrl:snapshot.sourceUrl,observedAt:snapshot.fetchedAt,status:'NYRA_PUBLIC_PAGE_SCRATCH_SNAPSHOT'};
 return {race:updated,snapshot};
}

// Reuse the strict snapshot validator for a matching saved PP source.
export {applyOddsSnapshot as applyNyraSnapshotToRace} from './odds-snapshot.js?v=20261112-preserve-scratches';

// Stage both matching PP sources before writing either one.
export function prepareNyraCardUpdate(activeCard,providerCards,race,snapshot,now=Date.now()){
 const selected=cardProvider(activeCard),other=selected==='DRF'?'BRISNET':'DRF';
 const apply=r=>{const out=applyOddsSnapshot(r,snapshot,now,{preserveScratches:true});for(const h of out.horses)if(h.odds==='SCR'&&!h.scratch_evidence)h.scratch_evidence={sourceUrl:snapshot.sourceUrl,observedAt:snapshot.fetchedAt,status:'NYRA_PUBLIC_PAGE_SCRATCH_SNAPSHOT'};return out;};
 const updated=apply(race),cards={...structuredClone(providerCards),[selected]:structuredClone(activeCard)};
 cards[selected].races[race.race]=updated;
 const paired=pairedRace(providerCards,other,race);
 if(paired.race)cards[other].races[race.race]=apply(paired.race);
 return {cards,selected,race:updated,pairedStatus:paired.race?'Matching '+other+' odds and scratches also refreshed.':paired.reason};
}
