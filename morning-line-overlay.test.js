import test from 'node:test';import assert from 'node:assert/strict';import{applyMorningLines}from './morning-line-overlay.js';
const race={track:'Belmont Park',date:'2026-10-07',race:1,horses:[{n:'3',name:'Weighted Average',ml:'—',odds:'—',beyer_figures:[88,80],actual_post:null}]},candidate={...race,horses:[{n:3,name:'Weighted Average',ml:'6/5',odds:'6/5'}]},source={sourceUrl:'https://www.nyra.com/belmont/racing/entries/',observedAt:'2026-10-07T13:00:00Z'};
test('ML overlay preserves all rating data and never fills live odds/gate',()=>{const x=applyMorningLines(race,candidate,source);assert.equal(x.horses[0].ml,'6/5');assert.equal(x.horses[0].odds,'—');assert.equal(x.horses[0].actual_post,null);assert.deepEqual(x.horses[0].beyer_figures,[88,80]);assert.equal(race.horses[0].ml,'—')});
test('wrong race or horse rejects atomically',()=>{assert.throws(()=>applyMorningLines(race,{...candidate,race:2},source));assert.throws(()=>applyMorningLines(race,{...candidate,horses:[{n:3,name:'Other',ml:'6/5'}]},source))});
test('duplicate or missing lines fail',()=>{assert.throws(()=>applyMorningLines(race,{...candidate,horses:[candidate.horses[0],candidate.horses[0]]},source));assert.throws(()=>applyMorningLines(race,{...candidate,horses:[{...candidate.horses[0],ml:'—'}]},source))});

test('program-less PP gets program from matched official entry, never gate',()=>{const x=applyMorningLines({...race,horses:[{...race.horses[0],n:''}]},candidate,source);assert.equal(x.horses[0].n,'3');assert.equal(x.horses[0].actual_post,null);assert.deepEqual(x.horses[0].beyer_figures,[88,80])});

import {releaseRace}from './rankings-release.js';
test('official scratch removes top selection and recomputes final-field rankings without copying tote prices',()=>{
 const pp={track:'Saratoga',date:'2026-08-22',race:12,surface:'Turf',horses:[{name:'First',n:'1',ml:'2/1',odds:'—',life_starts:6,beyer_figures:[90]},{name:'Second',n:'2',ml:'4/1',odds:'—',life_starts:6,beyer_figures:[80]}]};
 const entries={...pp,dist:'1 3/16M',post:'7:21P',horses:[{name:'First',n:1,ml:'2/1',odds:'SCR'},{name:'Second',n:2,ml:'4/1',odds:'9/1'}]};
 assert.equal(releaseRace(pp).rankings[0].name,'First');const updated=applyMorningLines(pp,entries,source);
 assert.equal(releaseRace(updated).rankings[0].name,'Second');assert.equal(releaseRace(updated).rankings.length,1);assert.equal(updated.horses[1].odds,'—');assert.deepEqual(updated.horses.map(h=>h.beyer_figures),pp.horses.map(h=>h.beyer_figures));assert.equal(updated.dist,'1 3/16M');assert.equal(pp.horses[0].odds,'—');
 assert.throws(()=>applyMorningLines(pp,{...entries,surface:'Dirt'},source),/surface differs/);
});
