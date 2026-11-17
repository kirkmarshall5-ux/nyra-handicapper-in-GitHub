// Historical paired comparison for research-only Finisher Companion.
// Input is a normalized array of frozen race records joined to OFFICIAL results.
// Never infer run styles, rankings, starters, finish order, or payouts.
import {rankPaceCompanions} from './finisher-pace-compatibility.js';
const id = x => String(x);
function boxHit(a,b,finish) { return finish.length >= 2 && ((id(finish[0])===id(a)&&id(finish[1])===id(b))||(id(finish[0])===id(b)&&id(finish[1])===id(a))); }
function count(x) { return x.filter(Boolean).length; }
export function evaluateCompanions(races,adjustment=5) {
 if (!Array.isArray(races)) throw new Error('Expected historical races array');
 const evaluated=[],skipped=[];
 for(const race of races){
  const key=`${race.track ?? 'unknown'} ${race.date ?? '?'} R${race.race ?? '?'}`;
  if(!Array.isArray(race.horses)||!race.rrFirstProgram||!race.rrSecondProgram||!Array.isArray(race.officialFinish)||race.officialFinish.length<3){
   skipped.push({key,reason:'Missing frozen RR ranking, horses, or official top-three'});continue;
  }
  if(race.decision==='PASS'||race.decision==='HOLD'){
   skipped.push({key,reason:'PASS/HOLD excluded from betting comparison'});continue;
  }
  if(race.resultVerified!==true||race.frozenBeforeResults!==true){
   skipped.push({key,reason:'Official result or frozen input provenance not verified'});continue;
  }
  let result;
  try { result=rankPaceCompanions(race.horses,race.rrFirstProgram,adjustment); }
  catch(e){skipped.push({key,reason:e.message});continue;}
  const baseline=result.originalFinisher.find(h=>h.program!==id(race.rrFirstProgram));
  const companion=result.companion;
  if(result.scenario.confidence<1){skipped.push({key,reason:'Incomplete verified running-style coverage; research subset requires full field'});continue;}
  if(!baseline||!companion){skipped.push({key,reason:'No eligible companion score'});continue;}
  const winner=id(race.officialFinish[0]),second=id(race.officialFinish[1]),third=id(race.officialFinish[2]);
  const rr1=id(race.rrFirstProgram),rr2=id(race.rrSecondProgram);
  const payout=typeof race.exactaBoxPayout1==='number'&&Number.isFinite(race.exactaBoxPayout1)?race.exactaBoxPayout1:null;
  evaluated.push({key,scenario:result.scenario.scenario,confidence:result.scenario.confidence,
   rr1,rr2,originalCompanion:baseline.program,researchCompanion:companion.program,
   officialTop3:[winner,second,third],rr1Won:winner===rr1,
   rr2Second:second===rr2,originalSecond:second===baseline.program,researchSecond:second===companion.program,
   originalTop3:[second,third].includes(baseline.program),researchTop3:[second,third].includes(companion.program),
   rrBoxHit:boxHit(rr1,rr2,[winner,second]),originalBoxHit:boxHit(rr1,baseline.program,[winner,second]),
   researchBoxHit:boxHit(rr1,companion.program,[winner,second]),
   payout: payout, payoutVerified:race.payoutVerified===true});
 }
 const summary={races:evaluated.length,skipped:skipped.length,
  rr1Winners:count(evaluated.map(x=>x.rr1Won)),
  runnerUpAt2:{rr:count(evaluated.map(x=>x.rr2Second)),original:count(evaluated.map(x=>x.originalSecond)),research:count(evaluated.map(x=>x.researchSecond))},
  companionTop3:{original:count(evaluated.map(x=>x.originalTop3)),research:count(evaluated.map(x=>x.researchTop3))},
  exactaBoxHits:{rr:count(evaluated.map(x=>x.rrBoxHit)),original:count(evaluated.map(x=>x.originalBoxHit)),research:count(evaluated.map(x=>x.researchBoxHit))},
  conditionalSecondGivenRr1Win:{denominator:count(evaluated.map(x=>x.rr1Won)),
   rr:count(evaluated.map(x=>x.rr1Won&&x.rr2Second)),
   original:count(evaluated.map(x=>x.rr1Won&&x.originalSecond)),
   research:count(evaluated.map(x=>x.rr1Won&&x.researchSecond))}};
 const settled=evaluated.filter(x=>x.payoutVerified&&x.payout!==null);
 summary.exactaRoi=settled.length?Object.fromEntries(['rr','original','research'].map(k=>{
   const stake=2*settled.length,returned=settled.reduce((sum,x)=>sum+(x[k+'BoxHit']?x.payout:0),0);
   return [k,{races:settled.length,stake,returned,roi:(returned-stake)/stake}];
 })):null;
 return {version:'research-v0.1',summary,evaluated,skipped};
}
