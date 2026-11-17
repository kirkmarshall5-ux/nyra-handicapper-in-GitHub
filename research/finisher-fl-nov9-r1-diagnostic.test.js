import test from 'node:test';
import assert from 'node:assert/strict';
import {fingerLakesNov9Race1Diagnostic} from './finisher-fl-nov9-r1-diagnostic.js';
test('real frozen Finger Lakes race 1 retains RR #1 and compares companion methods',()=>{
 const r=fingerLakesNov9Race1Diagnostic();
 assert.equal(r.sourceMatched,6);
 assert.equal(r.rrFirstProgram,'3');
 assert.equal(r.rrSecondProgram,'6');
 assert.equal(r.comparison.comparable,true);
 assert.equal(r.comparison.originalCompanion,'4');
 assert.equal(r.comparison.styleScenario,'FAST');
 assert.equal(r.comparison.quirinScenario,'FAST');
 assert.equal(r.comparison.styleCompanion,'4');
 assert.equal(r.comparison.quirinCompanion,'4');
 assert.equal(r.officialOutcomeEvaluated,false);
 assert.equal(r.decision,'PASS');
});
