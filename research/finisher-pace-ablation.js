// Research-only paired ablation: same frozen scores and runners, vary ONLY
// scenario inference (style count vs Quirin pressure). No live scoring changes.
import {rankPaceCompanions,paceScenario} from './finisher-pace-compatibility.js';
import {quirinPaceScenario} from './finisher-quirin-scenario.js';
const fit={FAST:{E:-1,EP:0,P:1,S:1},MODERATE:{E:0,EP:1,P:1,S:0},SLOW:{E:1,EP:1,P:0,S:-1}};
export function comparePaceScenarioMethods(horses,rrFirstProgram,adjustment=5){
 const base=rankPaceCompanions(horses,rrFirstProgram,adjustment);
 const q=quirinPaceScenario(horses);
 const active=horses.filter(h=>!h.scratched&&h.active!==false);
 if(q.confidence!==1||base.scenario.confidence!==1)
  return {comparable:false,reason:'INCOMPLETE_STYLE_OR_QUIRIN',style:base.scenario,quirin:q};
 const scores=active.filter(h=>Number.isFinite(h.finisherScore)).map(h=>{
  const style=String(h.runStyle).toUpperCase().replace('/','');
  const delta=adjustment*fit[q.scenario][style];
  return {program:String(h.program),baseScore:h.finisherScore,adjustedScore:h.finisherScore+delta,delta};
 }).sort((a,b)=>b.adjustedScore-a.adjustedScore||b.baseScore-a.baseScore||a.program.localeCompare(b.program,undefined,{numeric:true}));
 return {comparable:true,styleScenario:paceScenario(horses).scenario,quirinScenario:q.scenario,
  originalCompanion:base.originalFinisher.find(h=>h.program!==String(rrFirstProgram))?.program??null,
  styleCompanion:base.companion?.program??null,
  quirinCompanion:scores.find(h=>h.program!==String(rrFirstProgram))?.program??null,
  changesCompanion:base.companion?.program!==scores.find(h=>h.program!==String(rrFirstProgram))?.program,
  researchOnly:true};
}
