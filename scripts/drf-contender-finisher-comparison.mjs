// Research-only DRF Contender vs DRF Finisher ranking comparison.
// Inputs are pre-race frozen model selections and independently reconciled results.
// Never recompute selections from post-race evidence.
import { requireDrfCard } from './drf-only-research-guard.mjs';

const normalize=x=>String(x??'').trim().toUpperCase();
const ranked=(items)=>items.map(x=>normalize(typeof x==='object'?(x.program??x.n??x.name):x));
export function compareDrfFrozenRace({card,race,contender,finisher,finishOrder}){
 requireDrfCard(card);
 if(!card.races[String(race)])throw Error('Race missing from DRF card');
 const a=ranked(contender||[]),b=ranked(finisher||[]),actual=ranked(finishOrder||[]);
 for(const [label,ids] of [['DRF Contender',a],['DRF Finisher',b],['Official finish',actual]]){
  if(ids.length<4||ids.slice(0,4).some(x=>!x)||new Set(ids).size!==ids.length)
   throw Error(label+' requires four distinct ranked entries');
 }
 const available=new Set((card.races[String(race)].horses||[]).flatMap(h=>[normalize(h.n),normalize(h.name)].filter(Boolean)));
 for(const [label,ids] of [['DRF Contender',a],['DRF Finisher',b],['Official finish',actual]]){
  for(const id of ids.slice(0,4))if(!available.has(id))throw Error(label+' has unknown DRF runner '+id);
 }
 const stats=ids=>({winnerRank:ids.indexOf(actual[0])+1||null,topChoiceWon:ids[0]===actual[0],topFourHits:actual.slice(0,4).filter(id=>ids.slice(0,4).includes(id)).length,exactTopFourOrder:ids.slice(0,4).every((id,i)=>id===actual[i])});
 return {race,source_format:'DRF',contender:stats(a),finisher:stats(b),contenderTopFour:a.slice(0,4),finisherTopFour:b.slice(0,4),officialTopFour:actual.slice(0,4),wagersEvaluated:false};
}
