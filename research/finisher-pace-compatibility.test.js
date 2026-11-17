import test from 'node:test';
import assert from 'node:assert/strict';
import {paceScenario,rankPaceCompanions} from './finisher-pace-compatibility.js';
test('contested pace helps stalker over leader for companion',()=>{
 const h=[{program:'1',runStyle:'E',finisherScore:90},{program:'2',runStyle:'E',finisherScore:82},{program:'3',runStyle:'P',finisherScore:81}];
 const r=rankPaceCompanions(h,'1');
 assert.equal(r.scenario.scenario,'FAST');
 assert.equal(r.companion.program,'3');
 assert.equal(r.originalFinisher[1].program,'2');
});
test('lone speed not penalized',()=>{
 const r=rankPaceCompanions([{program:'1',runStyle:'P',finisherScore:90},{program:'2',runStyle:'E',finisherScore:70},{program:'3',runStyle:'S',finisherScore:72}],'1');
 assert.equal(r.scenario.scenario,'SLOW');
 assert.equal(r.companion.program,'2');
});
test('missing running styles reduce confidence; scratches excluded',()=>{
 const r=rankPaceCompanions([{program:'1',runStyle:'E',finisherScore:80},{program:'2',runStyle:'?',finisherScore:75},{program:'3',runStyle:'E',finisherScore:70,scratched:true}],'1');
 assert.equal(r.scenario.unknown,1);
 assert.equal(r.scenario.confidence,0.5);
 assert.equal(r.ranked.length,2);
 assert.equal(r.ranked[1].adjustmentPoints,0);
});
test('RR winner must be active and bounds enforced',()=>{
 assert.throws(()=>rankPaceCompanions([{program:'2',runStyle:'E',finisherScore:80}],'1'));
 assert.throws(()=>rankPaceCompanions([{program:'1',runStyle:'E',finisherScore:80}],'1',10));
});
