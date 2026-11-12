import {cardProvider,matchingCard} from './dual-pp-cards.js';
import {matchUpdateRunner,runnerName} from './runner-identity.js';
import {decodeTodayDistance} from './finisher-drf-distance.js';
import {correctRaceConditions} from './manual-race-conditions.js';
export const EQUiBASE_SERVICE='https://nyra-odds-snapshot.kirkmarshall5.chatgpt.site/equibase';
export const equibaseSupported=r=>/^(bel|belmont|belmontpark)$/i.test(String(r?.track||'').replace(/[^a-z]/gi,''));
export async function fetchEquibaseUpdate(race,{fetcher=globalThis.fetch,now=()=>Date.now()}={}){
 if(!equibaseSupported(race))throw Error('Equibase connection currently supports Belmont Park');
 const url=new URL(EQUiBASE_SERVICE);url.search=new URLSearchParams({track:'BEL',date:race.date});
 const response=await fetcher(url,{cache:'no-store',signal:AbortSignal.timeout(25000)});
 if(!(response.headers.get('content-type')||'').includes('application/json'))throw Error('Equibase service did not return race data');
 const body=await response.json();if(!response.ok)throw Error(body.error||'Equibase service unavailable');
 validateSnapshot(race,body,now());return body;
}
function validateSnapshot(race,s,now){
 if(!equibaseSupported(race)||s.schemaVersion!==1||s.track!=='BEL'||s.date!==race.date||!Array.isArray(s.events))throw Error('Equibase race-day identity mismatch');
 const t=Date.parse(s.fetchedAt),pub=Date.parse(s.publishedAt);if(!Number.isFinite(t)||t>now+5000||now-t>60000||!Number.isFinite(pub)||pub>t+60000)throw Error('Equibase retrieval time is invalid or stale');
 if(s.sourceUrl!=='https://www.equibase.com/static/latechanges/rss/BEL-USA.rss')throw Error('Unexpected Equibase source');
 if(new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(pub))!==s.date)throw Error('Equibase publication date mismatch');
 for(const e of s.events)if(!Number.isInteger(e.race)||e.race<1||e.race>20||!['scratch','surface','distance','going','notice','cancelled'].includes(e.type)||!Number.isFinite(Date.parse(e.postedAt))||Date.parse(e.postedAt)>pub)throw Error('Malformed Equibase change');
}
// Apply the full loaded card atomically across matching PP sources. Omission is never an unscratched signal.
export function prepareEquibaseCardUpdate(activeCard,providerCards,currentRace,snapshot,now=Date.now()){
 validateSnapshot(currentRace,snapshot,now);const selected=cardProvider(activeCard);
 let cards={...structuredClone(providerCards),[selected]:structuredClone(activeCard)};cards[selected].races[currentRace.race]=structuredClone(currentRace);
 const anchor=cards[selected],applied=[];let unmatched=0;
 for(const [number,original] of Object.entries(anchor.races)){
  const events=snapshot.events.filter(e=>e.race===Number(number)).sort((a,b)=>Date.parse(a.postedAt)-Date.parse(b.postedAt));
  if(!events.length)continue;
  if(Date.parse(original.equibase_snapshot?.publishedAt)>Date.parse(snapshot.publishedAt))throw Error('Equibase response is older than the saved update');
  const surface=events.filter(e=>e.type==='surface').at(-1),distance=events.filter(e=>e.type==='distance').at(-1);
  const latestConditionTime=Math.max(...[surface,distance].filter(Boolean).map(e=>Date.parse(e.postedAt)));
  const manual=original.manual_conditions;
  if((surface||distance)&&!(manual?.source==='USER_MANUAL_OVERRIDE'&&Date.parse(manual.observed_at)>latestConditionTime)){
   cards=correctRaceConditions(cards,selected,number,{surface:surface?.surface||original.surface,furlongs:distance?.furlongs??original.distance_furlongs??decodeTodayDistance(original.conditions?.primaryDistanceLine||original.header||original.dist).furlongs},new Date(now).toISOString());
   for(const card of Object.values(cards))if(matchingCard(anchor,card)&&card.races[number]){card.races[number].manual_conditions.source='EQUIBASE_RSS';card.races[number].manual_conditions.posted_at=new Date(latestConditionTime).toISOString();}
  }
  for(const card of Object.values(cards)){
   if(!matchingCard(anchor,card)||!card.races[number])continue;const r=card.races[number];
   for(const e of events){
    if(e.type==='scratch'){
     // Some PPs omit already-scratched entries; absence in every source is harmless.
     const present=r.horses.some(h=>runnerName(h.name)===runnerName(e.name)||String(h.n)===e.program);
     if(!present){unmatched++;continue;}
     const h=matchUpdateRunner(r.horses,e),manualStatus=h.field_status_evidence;
     if(manualStatus?.action==='running'&&Date.parse(manualStatus.observedAt)>Date.parse(e.postedAt))continue;
     h.odds='SCR';h.scratch_evidence={status:'EQUIBASE_RSS_SCRATCH',sourceUrl:snapshot.sourceUrl,observedAt:snapshot.fetchedAt,postedAt:e.postedAt};
    }
    if(e.type==='going'){r.track_conditions??={};r.track_conditions[e.surface]={condition:e.going,postedAt:e.postedAt};if(e.surface===r.surface)r.going=e.going;}
    if(e.type==='cancelled'){r.equibase_cancelled=true;r.conditions={...r.conditions,unsupported:true};}
   }
   r.going=r.track_conditions?.[r.surface]?.condition??null;
   r.equibase_snapshot={sourceUrl:snapshot.sourceUrl,fetchedAt:snapshot.fetchedAt,publishedAt:snapshot.publishedAt,events:structuredClone(events)};
  }
  applied.push(Number(number));
 }
 return {cards,selected,race:structuredClone(cards[selected].races[currentRace.race]),applied,unmatched};
}
