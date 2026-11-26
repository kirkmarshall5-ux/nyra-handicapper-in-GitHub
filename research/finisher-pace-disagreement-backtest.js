// Paired historical evaluation: count only races where two pre-result methods
// disagree; report official second-place accuracy and $1 exacta box ROI.
// Never treat unverified payouts, post-race scores or PASS races as observations.
import {comparePaceScenarioMethods} from './finisher-pace-ablation.js';
export function evaluateFinisherDisagreements(races,{adjustment=5}={}){
 if(!Array.isArray(races))throw new Error('Expected historical race array');
 const rows=[],excluded=[];
 for(const r of races){
  const id=r.id??String(r.race??'unknown');
  if(r.decision==='PASS'||r.decision==='HOLD'){excluded.push({id,reason:'PASS_OR_HOLD'});continue;}
  if(r.frozenBeforeResults!==true||r.resultVerified!==true){excluded.push({id,reason:'UNVERIFIED_FREEZE_OR_RESULT'});continue;}
  if(!Array.isArray(r.horses)||!r.rrFirstProgram||!r.officialFirst||!r.officialSecond){
   excluded.push({id,reason:'INCOMPLETE_RACE_OR_RESULT'});continue;
  }
  let comparison;
  try{comparison=comparePaceScenarioMethods(r.horses,r.rrFirstProgram,adjustment);}
  catch(e){excluded.push({id,reason:'INVALID_RACE_INPUT'});continue;}
  if(!comparison.comparable){excluded.push({id,reason:comparison.reason});continue;}
  if(!comparison.changesCompanion){excluded.push({id,reason:'SAME_COMPANION'});continue;}
  const winningBox=companion=>[String(r.rrFirstProgram),String(companion)].includes(String(r.officialFirst))&&
   [String(r.rrFirstProgram),String(companion)].includes(String(r.officialSecond))&&
   String(r.officialFirst)!==String(r.officialSecond);
  const payoutValid=Number.isFinite(r.exactaPayoutForOneDollar)&&r.exactaPayoutForOneDollar>=0&&r.exactaPayoutVerified===true;
  rows.push({id,styleCompanion:comparison.styleCompanion,quirinCompanion:comparison.quirinCompanion,
   officialSecond:String(r.officialSecond),styleSecondHit:comparison.styleCompanion===String(r.officialSecond),
   quirinSecondHit:comparison.quirinCompanion===String(r.officialSecond),
   styleExactaHit:winningBox(comparison.styleCompanion),quirinExactaHit:winningBox(comparison.quirinCompanion),
   payoutValid,payout:payoutValid?r.exactaPayoutForOneDollar:null,
   styleReturn:payoutValid&&winningBox(comparison.styleCompanion)?r.exactaPayoutForOneDollar:0,
   quirinReturn:payoutValid&&winningBox(comparison.quirinCompanion)?r.exactaPayoutForOneDollar:0});
 }
 const sum=(key,rs=rows)=>rs.reduce((a,r)=>a+Number(r[key]??0),0);
 const paid=rows.filter(r=>r.payoutValid);
 const roi=key=>paid.length?(sum(key,paid)-2*paid.length)/(2*paid.length):null;
 return {disagreementRaces:rows.length,excluded,rows,
  styleSecondHits:sum('styleSecondHit'),quirinSecondHits:sum('quirinSecondHit'),
  styleExactaHits:sum('styleExactaHit'),quirinExactaHits:sum('quirinExactaHit'),
  payoutVerifiedRaces:paid.length,styleExactaROI:roi('styleReturn'),quirinExactaROI:roi('quirinReturn'),
  researchOnly:true};
}
