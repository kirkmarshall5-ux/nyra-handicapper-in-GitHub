import test from 'node:test';
import assert from 'node:assert/strict';
import {primePowerGapDiagnostic} from './prime-power-gap-diagnostic.js';
test('near-tie and Prime Power challenger are distinct, without score blending',()=>{
 const x=primePowerGapDiagnostic({modelRankings:[{n:1,score:100},{n:2,score:99.9},{n:3,score:90}],primeRankings:[{n:3,primePower:130},{n:1,primePower:125},{n:2,primePower:124}]});
 assert.equal(x.modelGap.nearTie,true);
 assert.equal(x.primePowerGap.nearTie,false);
 assert.equal(x.reviewPriority,'NEAR_TIE_WITH_OUTSIDE_CHALLENGER');
 assert.deepEqual(x.primePowerOutsideModelTopTwo,['3']);
 assert.equal(x.scoring_applied,false);
});
test('ties and missing scores do not generate false confident gaps',()=>{
 const t=primePowerGapDiagnostic({modelRankings:[{n:1,score:90},{n:2,score:90}],primeRankings:[]});
 assert.equal(t.modelGap.nearTie,true);
 assert.equal(t.primePowerGap.nearTie,null);
 const missing=primePowerGapDiagnostic({modelRankings:[{n:1},{n:2,score:88}],primeRankings:[]});
 assert.equal(missing.modelGap.status,'MISSING_SCORES');
});
test('no challenger when top two agree even if ordering differs',()=>{
 const x=primePowerGapDiagnostic({modelRankings:[{n:1,score:91},{n:2,score:90},{n:3,score:80}],primeRankings:[{n:2,primePower:122},{n:1,primePower:121},{n:3,primePower:100}]});
 assert.equal(x.topTwoSetAgrees,true);
 assert.equal(x.topTwoOrderAgrees,false);
 assert.deepEqual(x.primePowerOutsideModelTopTwo,[]);
});
