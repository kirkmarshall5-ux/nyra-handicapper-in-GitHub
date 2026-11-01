// Explicit user-confirmed field status; never inferred from odds or morning lines.
import {matchingCard} from './dual-pp-cards.js';
import {matchUpdateRunner} from './runner-identity.js';
export function correctRaceField(cards,selected,raceNumber,program,action,now=new Date().toISOString()){
 if(!['running','scratch'].includes(action))throw Error('Unknown field correction');
 const out=structuredClone(cards),anchor=out[selected]?.races?.[raceNumber];
 const identity=typeof program==='object'?program:{program};
 const original=anchor&&matchUpdateRunner(anchor.horses,identity);
 if(!original)throw Error('Runner not found in selected PP');
 for(const card of Object.values(out)){
  if(!matchingCard(anchor,card))continue;
  const race=card.races?.[raceNumber];if(!race)continue;
  const horse=matchUpdateRunner(race.horses,{program:original.n,name:original.name});
  if(!horse)throw Error('Matching PP runner identity differs; no field changes saved');
  if(action==='running'){
   if(horse.odds==='SCR'){horse.odds='—';delete horse.scratch_evidence;}
   if(!['AE','ALSO_ELIGIBLE','REGULAR'].includes(horse.entry_status||'REGULAR'))throw Error('Only an also-eligible can be confirmed running');
   horse.original_entry_status??=horse.entry_status||'REGULAR';horse.entry_status='REGULAR';horse.included_in_frozen_field=true;
  }else{horse.odds='SCR';horse.scratch_evidence={status:'USER_CONFIRMED_SCRATCH',observedAt:now};}
  horse.field_status_evidence={status:'USER_CONFIRMED',action,observedAt:now,program:String(horse.n??''),name:horse.name};
 }
 return out;
}
