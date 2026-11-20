import test from 'node:test';
import assert from 'node:assert/strict';
import {assessHistoricalFinisherEvidence} from './finisher-historical-evidence-gate.js';
test('26-race recovered Finisher audit does not claim unmeasured Quirin improvement',()=>{
 const a=assessHistoricalFinisherEvidence();
 assert.equal(a.racesReviewed,26);
 assert.equal(a.secondPlaceTopTwoDifference,-5);
 assert.equal(a.eligibleForQuirinOutcomeBacktest,false);
 assert.equal(a.missing.length,4);
 assert.equal(a.quirinExactaROILift,null);
 assert.equal(a.quirinSecondPlaceLift,null);
});
