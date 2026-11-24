import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileChartStarters} from './historical-chart-reconcile.js';
const pp=[{n:'1',name:'Runner One'},{n:'2',name:'Runner Two'},{n:'13',name:'Papa Brez'}];
test('AE runner appearing in official chart is included automatically',()=>{
 assert.deepEqual(reconcileChartStarters(pp,[{n:'1',name:'Runner One'},{n:'13',name:'Papa Brez'}]),{ok:true,starters:['1','13']});
});
test('scratched PP entrant is excluded when absent from verified chart',()=>{
 assert.deepEqual(reconcileChartStarters(pp,[{n:'1',name:'Runner One'}]),{ok:true,starters:['1']});
});
test('program or horse-name mismatch fails closed',()=>{
 assert.equal(reconcileChartStarters(pp,[{n:'13',name:'Different Horse'}]).ok,false);
 assert.equal(reconcileChartStarters(pp,[{n:'14',name:'Papa Brez'}]).ok,false);
});
test('duplicate or missing chart starters fail closed',()=>{
 assert.equal(reconcileChartStarters(pp,[{n:'1',name:'Runner One'},{n:'1',name:'Runner One'}]).ok,false);
 assert.equal(reconcileChartStarters(pp,[]).ok,false);
});

test('Belmont November 20 Race 8 official AE Papa Brez is retained as a starter',()=>{
 const field=[{n:'12',name:'Rugby'},{n:'13',name:'Papa Brez'},{n:'14',name:'Other AE'}];
 const official=[{n:'12',name:'Rugby'},{n:'13',name:'Papa Brez'}];
 assert.deepEqual(reconcileChartStarters(field,official),{ok:true,starters:['12','13']});
});

test('country suffix differences do not prevent matching official starters',()=>{
 const horse={n:'3',name:'Carmensita'};
 const foreign={n:'3',name:'Carmensita (ARG)'};
 assert.deepEqual(reconcileChartStarters([horse],[foreign]),{ok:true,starters:['3']});
 assert.deepEqual(reconcileChartStarters([foreign],[horse]),{ok:true,starters:['3']});
 assert.equal(reconcileChartStarters([horse],[{n:'4',name:foreign.name}]).ok,false);
 assert.equal(reconcileChartStarters([horse],[{n:'3',name:'Different Horse (ARG)'}]).ok,false);
});
