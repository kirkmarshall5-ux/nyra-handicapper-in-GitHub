import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {careerStarts,careerLabel,visibleAngles,displayPaceStyle,clearPaceEvidence} from './runner-display.js';
import {projectRaceSetup} from './projected-race-setup.js';
import {runnerStateKey} from './card-loader.js';

test('trainer first-start statistics and absent Beyers cannot create a debut label',()=>{
 const h={life_starts:null,trainerAngles:'1stStart(280 .17 $1.41)',figs:[],angles:[{label:'First-time starter',why:'Old saved debut claim'},{label:'2YO'}]};
 assert.equal(careerLabel(h),'Starts unknown');assert.deepEqual(visibleAngles(h),[{label:'2YO'}]);
});
test('experienced horses never keep a stale saved debut angle',()=>{
 const h={life_starts:8,lifeStarts:0,angles:[{label:'First-time starter'},{label:'Turf/Dirt'}]};
 assert.equal(careerLabel(h),'Experienced');assert.deepEqual(visibleAngles(h),[{label:'Turf/Dirt'}]);
});
test('verified zero starts keep the debut angle and suppress every pace position',()=>{
 const h={n:1,name:'Debut',life_starts:0,style:'E',tfEarly:140,tfLate:150,angles:[{label:'First-time starter'}]};
 assert.equal(careerLabel(h),'First-time starter');assert.equal(visibleAngles(h).length,1);assert.equal(displayPaceStyle(h),'Unknown');
 const r=projectRaceSetup({dist:'6F',horses:[h,{n:2,name:'Known',life_starts:3,tfEarly:90,tfLate:80}]});
 assert.ok(r.rows.find(x=>x.name==='Debut').positions.every(p=>p===null));
});
test('invalid and blank career values remain unknown; canonical career count takes precedence',()=>{
 for(const v of [null,undefined,'',' ',false,true,-1,1.5,'unknown'])assert.equal(careerStarts({life_starts:v}),null);
 assert.equal(careerStarts({life_starts:4,lifeStarts:0}),4);assert.equal(careerStarts({lifeStarts:'0'}),0);
});
test('missing pace remains unknown while measured zero pace is preserved',()=>{
 assert.equal(displayPaceStyle({life_starts:4,style:'P'}),'Unknown');
 assert.equal(displayPaceStyle({life_starts:4,tfEarly:0,tfLate:90,style:'S'}),'S');
});
test('clearing PP evidence removes both pace aliases without changing identity or notes',()=>{
 const h={n:'10',name:'Measured Runner',note:'Keep my note',life_starts:null,timeform_early:100,timeform_late:80,tfEarly:100,tfLate:80,style:'E'};
 clearPaceEvidence(h);assert.equal(displayPaceStyle(h),'Unknown');assert.equal(h.timeform_early,null);assert.equal(h.tfEarly,'');assert.equal(h.n,'10');assert.equal(h.name,'Measured Runner');assert.equal(h.note,'Keep my note');
});
test('display filtering preserves source data and never invents programs',()=>{
 const h={n:'',name:'Name Only',life_starts:5,angles:[{label:'First-time starter'},{label:'Turf/Dirt'}]};
 const before=structuredClone(h);const shown=visibleAngles(h);shown[0].label='Edited copy';assert.deepEqual(h,before);
});
test('same program in different races and cards cannot share saved runner identity',()=>{
 const h={n:'1',name:'Same Runner'};
 assert.notEqual(runnerStateKey('card-a',1,h),runnerStateKey('card-a',5,h));assert.notEqual(runnerStateKey('card-a',1,h),runnerStateKey('card-b',1,h));
 assert.notEqual(runnerStateKey('card-a',1,{n:'',name:'Alpha'}),runnerStateKey('card-a',1,{n:'',name:'Beta'}));
});
test('website uses guarded career labels, angles, style and pace clearing',()=>{
 const html=fs.readFileSync('index.html','utf8');
 for(const text of ['visibleAngles(h)','displayPaceStyle(h)','careerLabel(h)','clearPaceEvidence(h)'])assert.ok(html.includes(text));
});
