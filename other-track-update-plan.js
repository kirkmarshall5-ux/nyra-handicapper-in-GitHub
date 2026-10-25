import {cardProvider,pairedRace} from './dual-pp-cards.js';
import {applyOtherTrackSnapshot} from './other-track-updates.js';
// Pure preparation before any persistence. Both source fields validate independently.
export function prepareOtherTrackUpdate(activeCard,providerCards,race,snapshot,kind,now=Date.now()){
 const selected=cardProvider(activeCard),other=selected==='DRF'?'BRISNET':'DRF';
 const updated=applyOtherTrackSnapshot(race,snapshot,kind,now),cards={[selected]:structuredClone(activeCard)};
 cards[selected].races[race.race]=updated;
 const paired=pairedRace(providerCards,other,race);
 let pairedStatus=paired.reason||'';
 if(paired.race){
  // Reject the entire two-source update if any runner identity differs.
  const next=applyOtherTrackSnapshot(paired.race,snapshot,kind,now);
  cards[other]=structuredClone(providerCards[other]);cards[other].races[race.race]=next;
  pairedStatus='Matching '+other+' source updated.';
 }
 return {cards,selected,race:updated,pairedStatus};
}
