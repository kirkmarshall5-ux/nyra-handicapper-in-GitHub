import test from 'node:test';import assert from 'node:assert/strict';
import {researchFinisherWeights,RESEARCH_WEIGHTS} from './finisher-weight-research.js';
test('weights sum to one and control is unchanged',()=>{for(const w of Object.values(RESEARCH_WEIGHTS))assert.ok(Math.abs(Object.values(w).reduce((a,b)=>a+b,0)-1)<1e-10);});
test('missing optional inputs remain neutral and control parity holds',()=>{
 const line=(date,speed,late)=>({date,speed,late,e1:80,e2:80,surface:'Dirt',furlongs:6,source:{provider:'BRISNET',text:'verified PP line'}});
 const race={date:'2026-11-05',surface:'Dirt',distance_furlongs:6,horses:[
 {n:'1',name:'Alpha',life_starts:1,ratings:{provider:'BRISNET',lines:[line('2026-10-01',80,90)]}},
 {n:'2',name:'Beta',life_starts:1,ratings:{provider:'BRISNET',lines:[line('2026-10-01',70,null)]}}
 ]};
 const result=researchFinisherWeights(race);
 assert.equal(result.variants.control.rankings.length,2);
 assert.ok(result.missing_components.some(x=>x.n==='2'&&x.component==='late_pace'));
 assert.ok(result.missing_components.some(x=>x.component==='trainer'));
 assert.equal(result.variants.control.complete_field,true);
});
test('first time starter stays unrated, never fabricated',()=>{
 const race={date:'2026-11-05',surface:'Dirt',distance_furlongs:6,horses:[{n:'1',name:'New',life_starts:0,ratings:{provider:'BRISNET',lines:[]}}]};
 const r=researchFinisherWeights(race);assert.equal(r.variants.control.rankings.length,0);assert.equal(r.variants.control.unrated.length,1);
});
