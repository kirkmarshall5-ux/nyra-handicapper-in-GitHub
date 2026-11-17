import test from 'node:test';
import assert from 'node:assert/strict';
import {loneSpeedSignal} from './finisher-lone-speed.js';
const field=[{program:'1',runStyle:'E',quirinPoints:8,e1:100,e2:105},
 {program:'2',runStyle:'EP',quirinPoints:5,e1:95,e2:100},
 {program:'3',runStyle:'P',quirinPoints:3,e1:92,e2:96}];
test('single E with 2 Quirin and 3+ E1/E2 separation qualifies',()=>{
 const r=loneSpeedSignal(field);
 assert.equal(r.qualifies,true);assert.equal(r.quirinGap,3);assert.equal(r.e1Gap,5);
});
test('competing E runner disqualifies',()=>{
 assert.equal(loneSpeedSignal([...field,{program:'4',runStyle:'E',quirinPoints:7,e1:99,e2:103}]).reason,'MULTIPLE_E');
});
test('unknown style or unverified E1/E2 never passes',()=>{
 assert.equal(loneSpeedSignal([...field,{program:'4',runStyle:'NA',quirinPoints:null,e1:null,e2:null}]).reason,'INCOMPLETE_STYLE_OR_QUIRIN');
 assert.equal(loneSpeedSignal(field.map(h=>({...h,e2:null}))).reason,'E1_E2_NOT_VERIFIED');
});
test('scratch removes rival from pressure competition',()=>{
 assert.equal(loneSpeedSignal([...field,{program:'4',runStyle:'E',quirinPoints:8,e1:105,e2:107,scratched:true}]).qualifies,true);
});
