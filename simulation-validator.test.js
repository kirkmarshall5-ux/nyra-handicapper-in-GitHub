import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRaceRecord,gradeRace,gradeDataset} from './simulation-validator.js';
const example={
 raceId:'TEST-2026-10-10-R1',track:'Test Track',date:'2026-10-10',surface:'dirt',distance:'6F',modelVersion:'simulation-prototype-0',predictionFrozenAt:'2026-10-10T15:00:00Z',predictionArtifactId:'sha256:example-only',officialChartId:'test-chart-1',chartPublishedAt:'2026-10-10T16:00:00Z',chartSourceUrl:'https://example.org/test-chart',datasetSplit:'holdout',calls:['quarter','half','stretch','finish'],
 runners:[
 {program:'1',name:'A',predicted:{quarter:1,half:1,stretch:2,finish:2},actual:{quarter:1,half:2,stretch:2,finish:3},winProbability:0.2},
 {program:'2',name:'B',predicted:{quarter:2,half:2,stretch:1,finish:1},actual:{quarter:2,half:1,stretch:1,finish:1},winProbability:0.6},
 {program:'3',name:'C',predicted:{quarter:3,half:3,stretch:3,finish:3},actual:{quarter:3,half:3,stretch:3,finish:2},winProbability:0.2}
 ]};
const clone=()=>structuredClone(example);
test('valid frozen full-field race produces call and finish metrics',()=>{
 assert.equal(validateRaceRecord(example),true);
 const x=gradeRace(example);
 assert.equal(x.perCall.quarter.meanAbsoluteError,0);
 assert.equal(x.perCall.half.leaderCorrect,false);
 assert.equal(x.finishTop3Hits,3);
 assert.equal(x.finishWinnerCorrect,true);
 assert.equal(x.winBrier,0.08);
 const d=gradeDataset([example]);
 assert.equal(d.races,1);
 assert.equal(d.perCall.quarter.leaderAccuracy,1);
 assert.equal(d.status,'RESEARCH_UNVALIDATED');
});
test('reject lookahead and missing frozen evidence',()=>{
 for(const patch of [{predictionFrozenAt:'2026-10-10T17:00:00Z'},{predictionArtifactId:''},{datasetSplit:'unknown'},{officialChartId:''}])assert.throws(()=>validateRaceRecord({...clone(),...patch}));
});
test('reject incomplete positions, duplicate horses, and probabilities not summing to one',()=>{
 const bad=clone();bad.runners[1].predicted.half=1;assert.throws(()=>gradeRace(bad));
 const missing=clone();delete missing.runners[0].actual.quarter;assert.throws(()=>gradeRace(missing));
 const dup=clone();dup.runners[1].program='1';assert.throws(()=>gradeRace(dup));
 const probs=clone();probs.runners[0].winProbability=.4;assert.throws(()=>gradeRace(probs));
});
test('holdout evaluation excludes development and prevents duplicate race IDs or artifacts',()=>{
 const dev=clone();dev.raceId='DEV-R1';dev.predictionArtifactId='sha256:dev';dev.datasetSplit='development';
 assert.equal(gradeDataset([example,dev]).races,1);
 assert.equal(gradeDataset([dev]).status,'NO_VALIDATION_DATA');
 assert.throws(()=>gradeDataset([example,example]));
 const duplicateArtifact=clone();duplicateArtifact.raceId='NEW';assert.throws(()=>gradeDataset([example,duplicateArtifact]));
});
test('no probabilities returns null probability metrics',()=>{
 const r=clone();r.runners.forEach(x=>delete x.winProbability);
 assert.equal(gradeDataset([r]).winBrier,null);
});
