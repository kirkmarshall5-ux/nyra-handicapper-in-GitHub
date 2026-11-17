import test from 'node:test';
import assert from 'node:assert/strict';
import {comparePaceScenarioMethods} from './finisher-pace-ablation.js';
test('scenario ablation isolates Quirin change from base scores',()=>{
 const horses=[{program:'1',runStyle:'E',quirinPoints:8,finisherScore:90},
 {program:'2',runStyle:'EP',quirinPoints:2,finisherScore:82},
 {program:'3',runStyle:'P',quirinPoints:3,finisherScore:81}];
 const r=comparePaceScenarioMethods(horses,'1');
 assert.equal(r.comparable,true);
 assert.equal(r.styleScenario,'MODERATE');assert.equal(r.quirinScenario,'SLOW');
 assert.equal(r.originalCompanion,'2');
});
test('missing Quirin blocks comparison rather than assigning zero',()=>{
 const r=comparePaceScenarioMethods([{program:'1',runStyle:'E',quirinPoints:8,finisherScore:90},
 {program:'2',runStyle:'S',quirinPoints:null,finisherScore:80}],'1');
 assert.equal(r.comparable,false);assert.equal(r.reason,'INCOMPLETE_STYLE_OR_QUIRIN');
});
