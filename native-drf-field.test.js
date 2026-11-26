import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileNativeField} from './scripts/native-drf-field.mjs';
import {activeRunner} from './active-field.js';
test('official starters reconciled before scoring without mutating source',()=>{
 const race={horses:[{n:'1',name:'Alpha',odds:'2/1'},{n:'2',name:'Beta',odds:'3/1'},{n:'3',name:'Gamma',entry_status:'AE',odds:'SCR',ml:'5/1'}]};
 const official={verified:true,starters:[{program:'1',name:'Alpha'},{program:'3',name:'Gamma'}]};
 const result=reconcileNativeField(race,official);
 assert.deepEqual(result.horses.filter(activeRunner).map(h=>h.n),['1','3']);
 assert.equal(race.horses[1].odds,'3/1');
 assert.equal(race.horses[2].odds,'SCR');
 for(const bad of [{...official,verified:false},{...official,starters:[official.starters[0],official.starters[0]]},{...official,starters:[official.starters[0],{program:'2',name:'Gamma'}]},{...official,starters:[official.starters[0],{program:'4',name:'Unknown'}]}])assert.throws(()=>reconcileNativeField(race,bad));
});

test('coupled entry retains distinct program identity',()=>{
 const race={horses:[{n:'1',name:'Alpha',odds:'2/1'},{n:'1A',name:'Beta',odds:'2/1'},{n:'2',name:'Gamma',odds:'3/1'}]};
 const official={verified:true,starters:[{program:'1A',name:'Beta'},{program:'2',name:'Gamma'}]};
 assert.deepEqual(reconcileNativeField(race,official).horses.filter(activeRunner).map(h=>h.n),['1A','2']);
 assert.throws(()=>reconcileNativeField(race,{...official,starters:[{program:'1',name:'Beta'},official.starters[1]]}));
});
