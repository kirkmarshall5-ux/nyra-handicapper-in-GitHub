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
// Explicit synthetic verification fixture: tests code paths, never certifies real race evidence.
example.gradeabilityEvidence={testOnlySynthetic:true,raceId:example.raceId,predictionArtifactId:example.predictionArtifactId,field:{entries:example.runners.map(x=>({program:x.program,status:'STARTER'}))},rankedPrograms:example.runners.map(x=>x.program),originalPdfReplayVerified:true,officialChartFinishVerified:true,independentFreezeTimeVerified:true};
const clone=()=>structuredClone(example);
test('research grading refuses missing independent evidence even with well-formed synthetic positions',()=>{
 const x=clone();delete x.gradeabilityEvidence;
 assert.throws(()=>gradeRace(x),/Race evidence identity|Race grading blocked by evidence gate/);
 assert.throws(()=>gradeDataset([x]),/Race evidence identity|Race grading blocked by evidence gate/);
});
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
 const dev=clone();dev.raceId='DEV-R1';dev.predictionArtifactId='sha256:dev';dev.datasetSplit='development';dev.gradeabilityEvidence.raceId=dev.raceId;dev.gradeabilityEvidence.predictionArtifactId=dev.predictionArtifactId;
 assert.equal(gradeDataset([example,dev]).races,1);
 assert.equal(gradeDataset([dev]).status,'NO_VALIDATION_DATA');
 assert.throws(()=>gradeDataset([example,example]));
 const duplicateArtifact=clone();duplicateArtifact.raceId='NEW';duplicateArtifact.gradeabilityEvidence.raceId='NEW';assert.throws(()=>gradeDataset([example,duplicateArtifact]));
});
test('no probabilities returns null probability metrics',()=>{
 const r=clone();r.runners.forEach(x=>delete x.winProbability);
 assert.equal(gradeDataset([r]).winBrier,null);
});

// Stage 2 research safety: absent verified holdout data must never produce accuracy.
test('Stage 2: no verified historical pairs means no accuracy claim',()=>{
 const report=gradeDataset([]);
 assert.equal(report.status,'NO_VALIDATION_DATA');
 assert.equal(report.races,0);
 assert.equal(report.top1Accuracy,null);
 assert.equal(report.top3Recall,null);
 assert.equal(report.probabilityRaces,0);
 assert.equal(report.winBrier,null);
 assert.equal(report.winLogLoss,null);
 assert.deepEqual(report.perCall,{});
});

test('Stage 2: predicted positions alone cannot be scored as official outcomes',()=>{
 const r=clone();
 for(const runner of r.runners)delete runner.actual;
 assert.throws(()=>gradeRace(r),/Missing or invalid complete call positions/);
});

test('Stage 2: reject chart publication at or before prediction freeze',()=>{
 for(const chartPublishedAt of [example.predictionFrozenAt,'2026-10-10T14:59:59Z']){
  assert.throws(()=>validateRaceRecord({...clone(),chartPublishedAt}),/Prediction must be frozen before chart publication/);
 }
});

test('audit: reject detached evidence from a different race, artifact, or runner field',()=>{
 const a=clone();a.gradeabilityEvidence.raceId='OTHER-RACE';assert.throws(()=>gradeRace(a),/evidence identity/);
 const b=clone();b.gradeabilityEvidence.predictionArtifactId='sha256:other';assert.throws(()=>gradeRace(b),/evidence identity/);
 const c=clone();c.gradeabilityEvidence.rankedPrograms=['1','2','4'];assert.throws(()=>gradeRace(c),/evidence field/);
});

test('real race grading rejects bare caller booleans and unauthenticated provenance',()=>{
 const a=clone();delete a.gradeabilityEvidence.testOnlySynthetic;
 assert.throws(()=>gradeRace(a),/unverified provenance/);
 const b=clone();delete b.gradeabilityEvidence.testOnlySynthetic;
 b.gradeabilityEvidence.provenance={originalPdfReplay:{verified:true},officialChart:{verified:true},independentFreeze:{verified:true}};
 assert.throws(()=>gradeDataset([b]),/unverified provenance/);
});

test('dataset rejects unauthenticated development records even when grading holdout only',()=>{
 const dev=clone();dev.raceId='UNVERIFIED-DEV';dev.predictionArtifactId='sha256:unverified-dev';dev.datasetSplit='development';
 dev.gradeabilityEvidence.raceId=dev.raceId;dev.gradeabilityEvidence.predictionArtifactId=dev.predictionArtifactId;
 delete dev.gradeabilityEvidence.testOnlySynthetic;
 assert.throws(()=>gradeDataset([example,dev]),/unverified provenance/);
});
test('synthetic fixture cannot be passed off as independently verified production evidence',()=>{
 assert.throws(()=>gradeRace(clone(),{verificationContext:{artifacts:{},trustStore:{}}}),/Synthetic research evidence cannot use a production verification context/);
 assert.throws(()=>gradeDataset([clone()],{verificationContexts:{[example.raceId]:{artifacts:{},trustStore:{}}}}),/Synthetic research evidence cannot use a production verification context/);
});
