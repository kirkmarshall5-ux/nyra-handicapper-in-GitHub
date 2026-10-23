import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRaceDashboard,dashboardHtml,paperPlan,morningLineNumber} from './race-day-dashboard.js';

const horse=(n,extra={})=>({n:String(n),name:'Horse '+n,ml:n+'/1',odds:'—',...extra});
const race=(horses=Array.from({length:6},(_,i)=>horse(i+1)),extra={})=>({track:'Belmont Park',date:'2026-10-23',race:1,surface:'Dirt',distance_furlongs:6,dist:'6F',horses,...extra});
const ranked=(r,order=[1,2,3,4,5,6])=>({model_id:'fixture',decision:'PASS',rankings:order.map(n=>r.horses.find(h=>+h.n===n)).filter(Boolean)});
const input=(anchor=race())=>({anchor,sources:{DRF:{race:structuredClone(anchor)},BRISNET:{race:structuredClone(anchor)}},morningLineProvider:'DRF'});

test('retains full orders and separate ML; agreement never changes or blends model scores',()=>{
 const i=input(),before=structuredClone(i);
 const d=buildRaceDashboard(i,(id,r)=>ranked(r,id==='drfFinisher'?[6,5,4,3,2,1]:[1,2,3,4,5,6]));
 assert.deepEqual(i,before);
 assert.equal(d.models[0].rankings.length,6);
 assert.equal(d.shortlist.find(h=>h.n==='4').top_four_models,3);
 assert.equal(d.shortlist.find(h=>h.n==='1').top_four_models,2);
 assert.equal(d.shortlist.find(h=>h.n==='1').ranks.drfFinisher,6);
 assert.equal(d.morning_line.rankings[0].n,'1');
 assert.equal(d.betting_enabled,false);
 assert.equal(d.paper_plans.drfContender.total_cost,14);
 assert.match(dashboardHtml(d),/6\/6 ranked · full field · PASS/);
});

test('wrong date, race, track, conditions and scratch fields cannot supply agreement or tickets',()=>{
 for(const change of [{date:'2026-10-22'},{race:2},{track:'Saratoga'},{surface:'Turf'},{distance_furlongs:8},{horses:race().horses.map(h=>h.n==='6'?{...h,odds:'SCR'}:h)}]){
  const i=input();Object.assign(i.sources.BRISNET.race,change);
  const calls=[];const d=buildRaceDashboard(i,(id,r)=>{calls.push(id);return ranked(r);});
  assert.deepEqual(calls,['drfContender','drfFinisher']);
  assert.equal(d.models[0].available,false);
  assert.equal(d.shortlist[0].top_four_models,2);
  assert.equal(d.paper_plans.brisContender.total_cost,0);
  assert.ok(d.issues.length);
 }
});

test('country suffix and punctuation match; program/name mismatch and duplicate programs do not',()=>{
 const i=input();i.sources.BRISNET.race.horses[0].name='Horse 1 (IRE)';
 assert.equal(buildRaceDashboard(i,(_,r)=>ranked(r)).models[0].available,true);
 i.sources.BRISNET.race.horses[0].name='1 Horse';
 assert.equal(buildRaceDashboard(i,(_,r)=>ranked(r)).models[0].available,false);
 i.sources.BRISNET.race.horses[0]=horse(2,{name:'Horse 1'});
 assert.equal(buildRaceDashboard(i,(_,r)=>ranked(r)).models[0].available,false);
});

test('DRF header distances are checked when numeric distance is absent',()=>{
 const i=input();delete i.anchor.distance_furlongs;i.anchor.header='6 Furlongs';
 delete i.sources.BRISNET.race.distance_furlongs;i.sources.BRISNET.race.header='1 Mile';
 const d=buildRaceDashboard(i,(_,r)=>ranked(r));
 assert.equal(d.models[0].available,false);
 assert.equal(d.models[1].available,true);
 assert.match(d.models[0].reason,/conditions differ/);
});

test('partial and unloaded models retain unknown ranks and do not fabricate tickets',()=>{
 const i=input();i.sources.BRISNET={race:null,reason:'Upload Brisnet'};
 const d=buildRaceDashboard(i,(_,r)=>ranked(r,[1]));
 assert.equal(d.models[1].complete,false);
 assert.equal(d.models[1].ranked,1);
 assert.equal(d.models[0].ranked,0);
 assert.equal(d.shortlist.find(h=>h.n==='2').ranks.drfContender,null);
 assert.equal(d.paper_plans.drfContender.total_cost,4);
 assert.equal(d.paper_plans.drfContender.tickets.length,1);
 assert.match(dashboardHtml(d),/1\/6 ranked · incomplete field · PASS/);
 assert.match(dashboardHtml(d),/Upload Brisnet/);
});

test('invalid forecast identities invalidate the source rather than shifting ranks',()=>{
 for(const rows of [[horse(1),horse(1)],[horse(7)],[horse(1,{name:'Wrong horse'})]]){
  const d=buildRaceDashboard(input(),()=>({rankings:rows}));
  assert.ok(d.models.every(m=>!m.available&&m.rankings.length===0));
 }
});

test('active field excludes scratches, AE, MTO and explicitly excluded runners before matching',()=>{
 const r=race([...race().horses,horse(7,{odds:'SCR'}),horse(8,{entry_status:'AE'}),horse(9,{entry_status:'MTO'}),horse(10,{included_in_frozen_field:false})]);
 const d=buildRaceDashboard(input(r),(_,r)=>ranked(r));
 assert.equal(d.field.length,6);assert.equal(d.models[0].complete,true);
 assert.equal(d.morning_line.rankings.length,6);
});

test('morning line uses declared odds, never current odds; source ties stay stable',()=>{
 const i=input(race([horse(2,{ml:'5/2',odds:'100/1'}),horse(1,{ml:'5/2',odds:'1/5'}),horse(3,{ml:'missing'}),horse(4,{ml:'0'})]));
 const d=buildRaceDashboard(i,(_,r)=>ranked(r,[1,2,3,4]));
 assert.deepEqual(d.morning_line.rankings.map(h=>h.n),['4','2','1']);
 assert.equal(d.morning_line.complete,false);
 assert.equal(morningLineNumber('3/0'),Infinity);
});

test('each exacta box has the requested combinations and never fills missing ranks',()=>{
 const h=[horse(9),horse(2),horse(7)];const p=paperPlan(h);
 assert.equal(p.total_cost,14);
 assert.deepEqual(p.tickets[2].combinations,[['9','2'],['2','9']]);
 assert.deepEqual(p.tickets[3].combinations,[['9','2'],['9','7'],['2','9'],['2','7'],['7','9'],['7','2']]);
 assert.equal(paperPlan(h.slice(0,2)).total_cost,8);
 assert.equal(paperPlan([]).total_cost,0);
 assert.equal(paperPlan(h,[...h,horse('1A')]).available,false);
});

test('all dynamic labels are escaped and model details remain compact',()=>{
 const i=input(race([horse(1,{name:'<img src=x onerror=alert(1)>'})]));
 const d=buildRaceDashboard(i,(_,r)=>ranked(r,[1]));const html=dashboardHtml(d);
 assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);
 assert.match(html,/<details class="dashboard-paper">/);
 assert.doesNotMatch(html,/100%|confidence|recommended bet/i);
});

test('production adapters expose PASS and unranked first-time starters without mutating inputs',()=>{
 const i=input(race([horse(1,{life_starts:0}),horse(2,{life_starts:0})]));
 i.sources.BRISNET={race:null,reason:'Not loaded'};
 const before=structuredClone(i),d=buildRaceDashboard(i);
 assert.deepEqual(i,before);
 assert.ok(d.models.every(m=>m.rankings.length===0));
 assert.equal(d.models[1].decision,'PASS');
 assert.equal(d.models[2].decision,'PASS');
 assert.equal(d.paper_plans.drfContender.total_cost,0);
});
