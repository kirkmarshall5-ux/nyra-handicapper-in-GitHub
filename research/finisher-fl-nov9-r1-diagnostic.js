// Historical source-derived R1 diagnostic. Finger Lakes 2026-11-09.
// Frozen Brisnet RR and Finisher rankings + horse headers from Brisnet Premium Plus.
// R1 decision was PASS; no official finish or payout is asserted here.
// This is a real-input selection comparison, NOT a betting backtest.
import {joinBrisnetHeaderEvidence} from './brisnet-header-evidence-join.js';
import {comparePaceScenarioMethods} from './finisher-pace-ablation.js';
export const FL_NOV9_R1={
 number:1,track:'Finger Lakes',date:'2026-11-09',decision:'PASS',
 horses:[{n:'1',name:'Cast a Coin',finisherScore:0},
 {n:'2',name:'Gold Templar',finisherScore:35},
 {n:'3',name:"Banker's Jet",finisherScore:95},
 {n:'4',name:"Vino's Valentine",finisherScore:68.33333333333334},
 {n:'5',name:'Fric and Frac',scratched:true},
 {n:'6',name:'Guilty',finisherScore:51.66666666666667}],
 rrFirstProgram:'3',rrSecondProgram:'6'
};
export const FL_NOV9_R1_HEADERS=[
 {page:1,race:1,text:"Cast a Coin (P 3) B. g. 4 Prime Power: 109.7\nGold Templar (E/P 3) B. g. 6 Prime Power: 105.0\nBanker's Jet (E 7) B. g. 3 Prime Power: 111.0"},
 {page:2,race:1,text:"Vino's Valentine (E/P 5) B. c. 4 Prime Power: 114.8\nFric and Frac (E/P 4) Gr. g. 4 Prime Power: 113.0\nGuilty (E 7) B. g. 4 Prime Power: 115.0"}
];
export function fingerLakesNov9Race1Diagnostic(){
 const joined=joinBrisnetHeaderEvidence(FL_NOV9_R1,FL_NOV9_R1_HEADERS);
 const byProgram=new Map(joined.matched.map(h=>[h.program,h]));
 const horses=FL_NOV9_R1.horses.map(h=>({
  program:h.n,runStyle:byProgram.get(h.n)?.runStyle??null,
  quirinPoints:byProgram.get(h.n)?.quirinPoints??null,
  finisherScore:h.finisherScore,scratched:h.scratched===true
 }));
 return {race:'Finger Lakes 2026-11-09 R1',decision:'PASS',sourceMatched:joined.matched.length,
  frozenField:FL_NOV9_R1.horses.length,rrFirstProgram:'3',rrSecondProgram:'6',
  comparison:comparePaceScenarioMethods(horses,'3'),researchOnly:true,officialOutcomeEvaluated:false};
}
