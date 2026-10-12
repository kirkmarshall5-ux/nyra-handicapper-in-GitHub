import test from 'node:test';
import assert from 'node:assert/strict';
import {raceCallMarkers,projectRaceSetup,paceProfile} from './projected-race-setup.js';
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
 const unknown=projectRaceSetup({dist:'6F',horses:[{n:1,name:'A',odds:'3/1'},{n:2,name:'B',style:'S',odds:'4/1'}]});assert.equal(unknown.incomplete,true);assert.ok(unknown.rows.every(h=>h.positions.every(p=>p===null)));
 assert.equal(projectRaceSetup({dist:'2 3/8M',horses:[]}).available,false);
});

test('DRF glyph distance allows an eligible six-horse simulation',()=>{
 const horses=Array.from({length:6},(_,i)=>({n:i+1,name:'Horse '+(i+1),tfEarly:90-i*4,tfLate:40+i*4,odds:'3/1'}));
 const result=projectRaceSetup({dist:'6ôF',horses});
 assert.equal(result.available,true);
 assert.equal(result.rows.length,6);
 for(let i=0;i<result.markers.length;i++)assert.deepEqual(result.rows.map(h=>h.positions[i]).sort((a,b)=>a-b),[1,2,3,4,5,6]);
});

test('FTS is unknown even with a saved style or provider pace values; known runners remain partial illustration',()=>{
 const race={dist:'6F',horses:[
  {n:1,name:'Debut',life_starts:0,style:'E',tfEarly:150,tfLate:150},
  {n:2,name:'Older saved debut',lifeStarts:0,style:'P'},
  {n:3,name:'Established early',life_starts:5,tfEarly:110,tfLate:40,style:'E'},
  {n:4,name:'Established late',life_starts:5,tfEarly:40,tfLate:110,style:'S'}]};
 const before=structuredClone(race),r=projectRaceSetup(race);
 assert.equal(r.available,true);assert.equal(r.incomplete,true);
 assert.ok(r.rows.slice(0,2).every(h=>h.positions.every(p=>p===null)&&h.source==='FTS — pace unknown'));
 for(let c=0;c<r.markers.length;c++)assert.deepEqual(r.rows.slice(2).map(h=>h.positions[c]).sort(),[1,2]);
 assert.match(r.method,/positions rank only runners with known pace figures/);assert.deepEqual(race,before);
 assert.equal(paceProfile(race.horses[0]).known,false);assert.equal(paceProfile(race.horses[1]).style,'UNKNOWN');
});
test('missing or partial pace figures cannot use default P or manually saved style proxies',()=>{
 for(const h of [{life_starts:5,style:'P'},{life_starts:5,style:'E',tfEarly:120},{life_starts:5,style:'S',tfEarly:'',tfLate:110}]){
  const p=paceProfile(h);assert.equal(p.known,false);assert.equal(p.style,'UNKNOWN');assert.equal(p.early,null);assert.equal(p.late,null);
 }
 const known=paceProfile({life_starts:3,timeform_early:0,timeform_late:90});assert.equal(known.known,true);assert.equal(known.early,0);
});
test('all-FTS field displays Unknown for every projected call with no numeric ranks',()=>{
 const r=projectRaceSetup({dist:'6F',horses:[{n:1,name:'A',life_starts:0,style:'P'},{n:2,name:'B',life_starts:0,style:'E'}]});
 assert.equal(r.available,true);assert.equal(r.incomplete,true);assert.equal(r.rows.length,2);assert.ok(r.rows.every(h=>h.positions.length===4&&h.positions.every(p=>p===null)));
});
test('UI renders null positions as Unknown and excludes unknown runners from pace lanes',async()=>{
 const fs=await import('node:fs');const html=fs.readFileSync('index.html','utf8');assert.ok(html.includes("n===null?'Unknown':n"));assert.ok(html.includes('h.pace.known&&h.pace.style===s'));assert.ok(html.includes('Omitted from pace lanes'));
});
