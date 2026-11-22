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
