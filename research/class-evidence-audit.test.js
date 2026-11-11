import test from 'node:test';
import assert from 'node:assert/strict';
import {classEvidenceForHorse,classEvidenceForRaceHeader,classEvidenceFromBrisnetRunningLine,compareClassMovement,classCoverageSummary,speedClassCrosscheck,auditSpeedClassPairs,speedClassCoverageByRace,auditClassRace,compareClaimingConditions,withinHorseClassSpeedStudy} from './class-evidence-audit.js';
test('literal class evidence retains source and does not infer class from speed',()=>{
 const h={n:'4',name:'Runner',switch_evidence:{running_lines:[{running_date_track:'10Oct26= BEL',source_line:'10Oct26= BEL 6f MSW Purse $80,000 finished 2nd'},{running_date_track:'01Sep26= BEL',source_line:'01Sep26= BEL 7f Clm Price $25,000 finished 1st'}]}};
 const a=classEvidenceForHorse(h);
 assert.equal(a.observations[0].purse,80000);
 assert.equal(a.observations[0].class_code,'MSW');
 assert.equal(a.observations[1].claiming_price,25000);
 assert.equal(a.observations[1].purse,null);
 assert.equal(a.status,'PARTIAL_LITERAL_EVIDENCE');
 const race=auditClassRace({track:'Belmont Park',date:'2026-11-11',race:1,horses:[h,{n:'5',name:'Scratch',odds:'SCR'}]});
 assert.equal(race.scoring_applied,false);assert.equal(race.horses.length,1);
});
test('missing, ambiguous and unrecognized class evidence are explicitly flagged',()=>{
 assert.equal(classEvidenceForHorse({}).status,'NO_VERIFIED_RUNNING_LINES');
 const a=classEvidenceForHorse({switch_evidence:{running_lines:[{source_line:'Purse $50,000 Purse $60,000'},{source_line:'speed 95 pace 100'}]}});
 assert.ok(a.flags.includes('AMBIGUOUS_CLASS_AMOUNT_0'));
 assert.ok(a.flags.includes('NO_EXPLICIT_CLASS_TOKEN_1'));
 assert.equal(a.observations.length,0,'Ambiguous amounts must not become accepted observations');
});

test('Belmont October 29 Brisnet race-header examples retain literal class and purse separately',()=>{
 const mc=classEvidenceForRaceHeader('Belmont Park MC 35000 1 Mile 3&up Race 1. 1 Mile. MC 35000 Purse $49,000');
 assert.equal(mc.status,'AMBIGUOUS_OR_MISSING_HEADER','Duplicate header codes require manual review');
 const one=classEvidenceForRaceHeader('MC 35000 1 Mile Purse $49,000');
 assert.equal(one.class_code,'MC');assert.equal(one.condition_amount,35000);assert.equal(one.purse,49000);
 const oc=classEvidenceForRaceHeader('OC 55000n1x 5½ Furlongs (t)');
 assert.equal(oc.class_code,'OC');assert.equal(oc.condition_amount,55000);assert.equal(oc.condition_suffix,'n1x');
 assert.equal(oc.purse,null);
});

test('actual October 29 Brisnet RACETYPE cells distinguish class conditions from speed and purse',()=>{
 const a=classEvidenceFromBrisnetRunningLine('10Oct26Bel 7½ ft :23 :45 1:10 1:30 MC35000 82 90/86 -8 -4 86');
 assert.equal(a.status,'LITERAL_RACETYPE');assert.equal(a.class_code,'MC');assert.equal(a.condition_amount,35000);
 const b=classEvidenceFromBrisnetRunningLine('19Sep26Bel 1m fm :49 1:14 MC50000-c 68 67/72 0 +5 69');
 assert.equal(b.condition_amount,50000);
 const horse=classEvidenceForHorse({switch_evidence:{running_lines:[{running_date_track:'10Oct26Bel',source_line:'10Oct26Bel 7½ ft MC35000 82 90/86 86'}]}});
 assert.equal(horse.observations[0].condition_amount,35000);
 assert.equal(horse.observations[0].purse,null);
 assert.equal(classEvidenceFromBrisnetRunningLine('10Oct26Bel 7f 82 90/86 86').status,'MISSING_OR_AMBIGUOUS_RACETYPE');
});

test('class movement is permitted only within verified comparable class conditions',()=>{
 const mc=n=>({class_code:'MC',condition_amount:n});
 assert.equal(compareClassMovement(mc(35000),mc(50000)).direction,'DOWN');
 assert.equal(compareClassMovement(mc(50000),mc(35000)).direction,'UP');
 assert.equal(compareClassMovement(mc(35000),mc(35000)).direction,'SAME');
 assert.equal(compareClassMovement({class_code:'OC',condition_amount:55000},mc(35000)).direction,null);
 assert.equal(compareClassMovement({class_code:'ALW',condition_amount:50000},{class_code:'ALW',condition_amount:40000}).direction,null);
 assert.equal(compareClassMovement({class_code:'MC',condition_amount:null},mc(35000)).direction,null);
});

test('coverage counts all runners and distinguishes observed class from comparable movement',()=>{
 const audit={track:'Belmont Park',date:'2026-10-29',race:1,horses:[
  {name:'A',observations:[{class_code:'MC',condition_amount:35000},{class_code:'MC',condition_amount:50000}]},
  {name:'B',observations:[{class_code:'OC',condition_amount:55000}]},
  {name:'C',observations:[]}
 ]};
 const s=classCoverageSummary([audit]);
 assert.equal(s.totalHorses,3);assert.equal(s.withEvidence,2);
 assert.equal(s.withComparableMovement,1);assert.equal(s.missingEvidence,1);
 assert.equal(s.evidenceCoverage,2/3);assert.equal(s.movementCoverage,1/3);
 assert.equal(s.raceSummaries[0].completeEvidence,false);
 assert.equal(classCoverageSummary([]).evidenceCoverage,null);
});

test('speed-class research requires verified speed and comparable class, never changes scores',()=>{
 const comparable={status:'SAME_CLASS_FAMILY_COMPARISON',direction:'UP'};
 const a=speedClassCrosscheck({speedFigure:90,comparisonSpeedFigure:86,comparison:comparable});
 assert.equal(a.signal,'SPEED_AT_HIGHER_CONDITION');assert.equal(a.speedDelta,4);assert.equal(a.scoring_applied,false);
 assert.equal(speedClassCrosscheck({speedFigure:90,comparisonSpeedFigure:86,comparison:{status:'NONCOMPARABLE_CLASS_CONDITIONS'}}).signal,null);
 assert.equal(speedClassCrosscheck({speedFigure:90,comparisonSpeedFigure:null,comparison:comparable}).signal,null);
 assert.equal(speedClassCrosscheck({speedFigure:0,comparisonSpeedFigure:86,comparison:comparable}).status,'RESEARCH_HYPOTHESIS_ONLY');
});

test('speed-class pairs require class and speed on same running line',()=>{
 const r=auditSpeedClassPairs([
  {source_line:'10Oct26Bel 7f ft MC35000 82 90/86 86',speed_figure:86},
  {source_line:'07Sep26Sar 6f ft MC35000 88 89/77 75'},
  {source_line:'06Aug26Sar 7f ft 84 85/69 70',speed_figure:70},
  {source_line:'20Jun26Baq 7f ft MC35000 90 91/63 70',speed_figure:70}
 ]);
 assert.equal(r.totalLines,4);assert.equal(r.eligiblePairs,2);
 assert.equal(r.pairs[0].speedFigure,86);assert.equal(r.pairs[0].condition_amount,35000);
 assert.deepEqual(r.excluded.map(x=>x.reason),['SPEED_FIGURE_UNVERIFIED','CLASS_UNVERIFIED']);
 assert.equal(r.scoring_applied,false);
});

test('speed/class coverage preserves incomplete runners in denominator',()=>{
 const races=[{track:'Belmont Park',date:'2026-10-29',race:1,horses:[
  {switch_evidence:{running_lines:[{source_line:'10Oct26Bel 7f MC35000 82 90/86 86',speed_figure:86},{source_line:'07Sep26Sar 6f MC35000 88 89/77 75'}]}},
  {switch_evidence:{running_lines:[{source_line:'06Aug26Sar 7f 84 85/69 70',speed_figure:70}]}},
  {switch_evidence:{running_lines:[]}}
 ]}];
 const s=speedClassCoverageByRace(races);
 assert.equal(s.horses,3);assert.equal(s.horsesWithPairs,1);
 assert.equal(s.totalLines,3);assert.equal(s.eligiblePairs,1);
 assert.equal(s.excludedClass,1);assert.equal(s.excludedSpeed,1);
 assert.equal(s.horseCoverage,1/3);assert.equal(s.lineCoverage,1/3);
 assert.equal(s.perRace[0].completeFieldCoverage,false);
});

test('claiming amount proxy compares only compatible class families',()=>{
 const c=(class_code)=>({class_code});
 assert.equal(compareClaimingConditions(c('Clm25000-c'),c('Clm16000-c')).direction,'A_HIGHER');
 assert.equal(compareClaimingConditions(c('C25k'),c('C25000')).direction,'EQUAL');
 assert.equal(compareClaimingConditions(c('Mcl25000'),c('Clm25000')).status,'NOT_COMPARABLE');
 assert.equal(compareClaimingConditions(c('OC50k-N'),c('Clm25000')).status,'NOT_COMPARABLE');
 assert.equal(compareClaimingConditions(c('Alw110000n1x'),c('Clm25000')).status,'NOT_COMPARABLE');
 assert.equal(compareClaimingConditions(c('Clm25000'),c('Clm16000')).scoring_applied,false);
});

test('within-horse study compares verified same-family speed/class lines only',()=>{
 const x=withinHorseClassSpeedStudy([
  {source_line:'10Oct26 Bel 6f MC35000 88 89/86 86',speed_figure:86},
  {source_line:'01Sep26 Bel 6f MC25000 88 89/81 81',speed_figure:81},
  {source_line:'01Aug26 Bel 6f OC50000 88 89/99 99',speed_figure:99},
  {source_line:'01Jul26 Bel 6f MC35000 88 89/84 84'}
 ]);
 assert.equal(x.eligiblePairs,3);
 assert.equal(x.comparisons.length,1);
 assert.equal(x.comparisons[0].condition,'UP');
 assert.equal(x.comparisons[0].higherConditionSpeed,86);
 assert.equal(x.comparisons[0].lowerConditionSpeed,81);
 assert.equal(x.scoring_applied,false);
});
