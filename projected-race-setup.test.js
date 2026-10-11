import test from 'node:test';
import assert from 'node:assert/strict';
import {raceCallMarkers,projectRaceSetup} from './projected-race-setup.js';
test('distance-specific markers include fractional calls and finish',()=>{
 assert.deepEqual(raceCallMarkers('6F').map(x=>x.label),['¼ mile','½ mile','Stretch','Finish']);
 assert.deepEqual(raceCallMarkers('1 1/16M').map(x=>x.label),['¼ mile','½ mile','¾ mile','Stretch','Finish']);
 assert.deepEqual(raceCallMarkers('1M').map(x=>x.label),['¼ mile','½ mile','¾ mile','Stretch','Finish']);
 assert.deepEqual(raceCallMarkers('6ôF').map(x=>x.label),['¼ mile','½ mile','Stretch','Finish']);
 assert.deepEqual(raceCallMarkers('6ô Furlongs').map(x=>x.label),['¼ mile','½ mile','Stretch','Finish']);
 assert.deepEqual(raceCallMarkers('1ÂM').map(x=>x.label),['¼ mile','½ mile','¾ mile','Stretch','Finish']);
 assert.equal(raceCallMarkers('Unknown'),null);
});
test('positions form unique ordinal ranks at every call and early leader can fade',()=>{
 const r=projectRaceSetup({dist:'6F',horses:[
  {n:8,name:'Early Leader',tfEarly:120,tfLate:12,style:'E',odds:'3/1'},
  {n:2,name:'Closer',tfEarly:25,tfLate:120,style:'S',odds:'5/1'},
  {n:4,name:'Presser',tfEarly:70,tfLate:70,style:'P',odds:'4/1'}]});
 assert.equal(r.available,true);
 const leader=r.rows.find(h=>h.program===8);
 assert.equal(leader.positions[0],1);
 assert.ok(leader.positions.at(-1)>1);
 for(let c=0;c<r.markers.length;c++)assert.deepEqual(r.rows.map(x=>x.positions[c]).sort((a,b)=>a-b),[1,2,3]);
});
test('scratch and excluded MTO/AE horses are not projected',()=>{
 const r=projectRaceSetup({dist:'1M',horses:[
  {n:1,name:'A',style:'E',odds:'3/1'},
  {n:2,name:'B',style:'S',odds:'5/1'},
  {n:3,name:'C',style:'E',odds:'SCR'},
  {n:4,name:'D',style:'E',odds:'4/1',entry_status:'MTO'},
  {n:5,name:'E',style:'E',odds:'4/1',included_in_frozen_field:false}]});
 assert.deepEqual(r.rows.map(h=>h.program),[1,2]);
});
test('insufficient pace evidence or unsupported distance does not invent rankings',()=>{
 assert.equal(projectRaceSetup({dist:'6F',horses:[{n:1,name:'A',odds:'3/1'},{n:2,name:'B',style:'S',odds:'4/1'}]}).available,false);
 assert.equal(projectRaceSetup({dist:'2 3/8M',horses:[]}).available,false);
});

test('DRF glyph distance allows an eligible six-horse simulation',()=>{
 const horses=Array.from({length:6},(_,i)=>({n:i+1,name:'Horse '+(i+1),tfEarly:90-i*4,tfLate:40+i*4,odds:'3/1'}));
 const result=projectRaceSetup({dist:'6ôF',horses});
 assert.equal(result.available,true);
 assert.equal(result.rows.length,6);
 for(let i=0;i<result.markers.length;i++)assert.deepEqual(result.rows.map(h=>h.positions[i]).sort((a,b)=>a-b),[1,2,3,4,5,6]);
});

// Screenshot-backed Stage 1 regression fixture: Race 2 five-runner display.
// This tests ordinal integrity and evidence labels, not historical accuracy.
test('Stage 1 Race 2: five runners have unique ranks and traceable evidence',()=>{
 const race={dist:'6ôF',horses:[
  {n:1,name:'Fantasy Road',style:'P',odds:'3/1'},
  {n:2,name:'Fairy Tale',style:'P',odds:'4/1'},
  {n:3,name:'Ethereal Quality',tfEarly:105,tfLate:101,odds:'2/1'},
  {n:4,name:'Asset Light',tfEarly:100,tfLate:45,odds:'5/1'},
  {n:5,name:'Turn N Burn',style:'S',odds:'8/1'}
 ]};
 const result=projectRaceSetup(race);
 assert.equal(result.available,true);
 assert.deepEqual(result.markers.map(x=>x.label),['¼ mile','½ mile','Stretch','Finish']);
 assert.equal(result.rows.length,5);
 assert.deepEqual(result.rows.map(x=>x.program),[1,2,3,4,5]);
 for(let c=0;c<result.markers.length;c++)assert.deepEqual(result.rows.map(x=>x.positions[c]).sort((a,b)=>a-b),[1,2,3,4,5]);
 assert.deepEqual(result.rows.map(x=>x.source),['Running-style proxy','Running-style proxy','TimeformUS Early/Late','TimeformUS Early/Late','Running-style proxy']);
});

test('Stage 1 gate: scratch, MTO, AE, and missing evidence cannot create phantom ranks',()=>{
 const horses=[{n:1,name:'A',style:'E',odds:'2/1'},{n:2,name:'B',style:'S',odds:'4/1'},
  {n:3,name:'Scratch',style:'E',odds:'SCR'},
  {n:4,name:'MTO',style:'E',odds:'5/1',entry_status:'MTO'},
  {n:5,name:'AE',style:'E',odds:'5/1',entry_status:'AE'}];
 const projected=projectRaceSetup({dist:'6ôF',horses});
 assert.equal(projected.available,true);
 assert.deepEqual(projected.rows.map(x=>x.program),[1,2]);
 assert.equal(projectRaceSetup({dist:'6ôF',horses:[...horses,{n:6,name:'Unknown',odds:'10/1'}]}).available,false);
});
