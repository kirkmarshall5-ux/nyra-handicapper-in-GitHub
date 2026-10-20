import test from 'node:test';
import assert from 'node:assert/strict';
import {gradeVerifiedRace} from './research-model-race-grader.js';
const base={provider:'DRF',raceKey:'BEL-2026-10-17-R8',model:'V4.4c',snapshotId:'pre-off-anchor',snapshotTime:'2026-10-17T17:00:00-04:00',officialOffTime:'2026-10-17T17:30:00-04:00',snapshotVerified:true,finalFieldVerified:true,officialResultVerified:true,rankedRunnerIds:['1','2','3','4','5'],officialFinishIds:['2','1','3','5','4'],pass:false};
test('grades a verified full field without wagering',()=>{const r=gradeVerifiedRace([base]);assert.equal(r.status,'GRADED_DESCRIPTIVE_ONLY');assert.equal(r.results[0].firstChoiceWon,false);assert.equal(r.results[0].winnerInTopFour,true);assert.equal(r.results[0].meanAbsoluteRankError,.8);assert.equal(r.results[0].financialGrading,'NOT_PERFORMED');});
test('perfect top four and ordered first two are distinguished',()=>{const r=gradeVerifiedRace([{...base,rankedRunnerIds:['2','1','3','5','4']}]);assert.equal(r.results[0].orderedFirstTwo,true);assert.equal(r.results[0].topFourExactOrder,true);assert.equal(r.results[0].meanAbsoluteRankError,0);});
test('post-off capture is held and not graded',()=>{const r=gradeVerifiedRace([{...base,snapshotTime:'2026-10-17T18:00:00-04:00'}]);assert.equal(r.status,'HOLD');assert.equal(r.results.length,0);});
test('unverified official result is held',()=>{const r=gradeVerifiedRace([{...base,officialResultVerified:false}]);assert.equal(r.status,'HOLD');});
