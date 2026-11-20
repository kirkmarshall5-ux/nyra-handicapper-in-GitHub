import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateCompanions} from './finisher-pace-backtest.js';
const race={track:'Fixture',date:'2026-01-01',race:1,decision:'RANKED',frozenBeforeResults:true,resultVerified:true,
 rrFirstProgram:'1',rrSecondProgram:'2',officialFinish:['1','3','2'],payoutVerified:true,exactaBoxPayout1:12,
 horses:[{program:'1',runStyle:'E',finisherScore:90},{program:'2',runStyle:'E',finisherScore:82},{program:'3',runStyle:'P',finisherScore:81}]};
test('paired comparison isolates second-place improvement and ROI',()=>{
 const r=evaluateCompanions([race]);
 assert.equal(r.summary.races,1);
 assert.equal(r.summary.runnerUpAt2.research,1);
 assert.equal(r.summary.runnerUpAt2.rr,0);
 assert.equal(r.summary.runnerUpAt2.original,0);
 assert.equal(r.summary.exactaBoxHits.research,1);
 assert.equal(r.summary.exactaRoi.research.roi,5);
});
test('PASS and unverified data never enter ROI',()=>{
 const r=evaluateCompanions([{...race,decision:'PASS'},{...race,resultVerified:false}]);
 assert.equal(r.summary.races,0);
 assert.equal(r.summary.skipped,2);
 assert.equal(r.summary.exactaRoi,null);
});
test('missing official order skips rather than fabricates',()=>{
 const r=evaluateCompanions([{...race,officialFinish:[]}]);
 assert.equal(r.summary.races,0);
});

test('incomplete style evidence is excluded from paired research comparison',()=>{
 const r=evaluateCompanions([{...race,horses:race.horses.map((h,i)=>i===2?{...h,runStyle:null}:h)}]);
 assert.equal(r.summary.races,0);
 assert.match(r.skipped[0].reason,/Incomplete verified running-style coverage/);
});
