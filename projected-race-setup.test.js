import test from 'node:test';
import assert from 'node:assert/strict';
import {raceCallMarkers,projectRaceSetup} from './projected-race-setup.js';
test('distance-specific markers include fractional calls and finish',()=>{
 assert.deepEqual(raceCallMarkers('6F').map(x=>x.label),['¼ mile','½ mile','Stretch','Finish']);
 assert.deepEqual(raceCallMarkers('1 1/16M').map(x=>x.label),['¼ mile','½ mile','¾ mile','Stretch','Finish']);
 assert.deepEqual(raceCallMarkers('1M').map(x=>x.label),['¼ mile','½ mile','¾ mile','Stretch','Finish']);
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
