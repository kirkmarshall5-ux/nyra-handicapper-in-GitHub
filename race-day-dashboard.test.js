import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRaceDashboard,dashboardHtml,paperPlan,morningLineNumber,selectMorningLineProvider,morningLineForRunner} from './race-day-dashboard.js';

const horse=(n,extra={})=>({n:String(n),name:'Horse '+n,ml:n+'/1',odds:'—',...extra});
const race=(horses=Array.from({length:6},(_,i)=>horse(i+1)),extra={})=>({track:'Belmont Park',date:'2026-10-23',race:1,surface:'Dirt',distance_furlongs:6,dist:'6F',horses,...extra});
const ranked=(r,order=[1,2,3,4,5,6])=>({model_id:'fixture',decision:'PASS',rankings:order.map(n=>r.horses.find(h=>+h.n===n)).filter(Boolean)});
const input=(anchor=race())=>({anchor,sources:{DRF:{race:structuredClone(anchor)},BRISNET:{race:structuredClone(anchor)}},morningLineProvider:'DRF'});

test('Brisnet-only dashboard includes ranked horses beyond the shortlist',()=>{
 const anchor=race();const d=buildRaceDashboard({anchor,sources:{BRISNET:{race:structuredClone(anchor)}},morningLineProvider:'BRISNET'},(id,r)=>ranked(r));
 assert.deepEqual(d.shortlist.map(h=>h.n),['1','2','3','4']);
 assert.deepEqual(d.remaining.map(h=>h.n),['5','6']);
 assert.equal(d.remaining[0].ranks.brisContender,5);
 assert.equal(d.remaining[0].ranks.drfContender,null);
 assert.doesNotMatch(dashboardHtml(d),/<details/);
});

test('retains full orders and separate ML; agreement never changes or blends model scores',()=>{
 const i=input(),before=structuredClone(i);
 const d=buildRaceDashboard(i,(id,r)=>ranked(r,id==='brisFinisher'?[6,5,4,3,2,1]:[1,2,3,4,5,6]));
 assert.deepEqual(i,before);
 assert.equal(d.models[0].rankings.length,6);
 assert.equal(d.shortlist.find(h=>h.n==='4').top_four_models,4);
 assert.equal(d.shortlist.find(h=>h.n==='1').top_four_models,3);
 assert.equal(d.shortlist.find(h=>h.n==='1').ranks.brisFinisher,6);
 assert.equal(d.morning_line.rankings[0].n,'1');
 assert.equal(d.betting_enabled,false);
 assert.equal(d.paper_plans.drfContender.total_cost,14);
 assert.match(dashboardHtml(d),/6\/6 ranked · full field · PASS/);
});

test('wrong date, race, track, conditions and scratch fields cannot supply agreement or tickets',()=>{
 for(const change of [{date:'2026-10-22'},{race:2},{track:'Saratoga'},{surface:'Turf'},{distance_furlongs:8},{horses:race().horses.map(h=>h.n==='6'?{...h,odds:'SCR'}:h)}]){
  const i=input();Object.assign(i.sources.BRISNET.race,change);
  const calls=[];const d=buildRaceDashboard(i,(id,r)=>{calls.push(id);return ranked(r);});
  assert.deepEqual(calls,['drfContender']);
  assert.equal(d.models[0].available,false);
  assert.equal(d.shortlist[0].top_four_models,1);
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
 assert.equal(d.models[2].available,true);
 assert.match(d.models[0].reason,/conditions differ/);
});

test('partial and unloaded models retain unknown ranks and do not fabricate tickets',()=>{
 const i=input();i.sources.BRISNET={race:null,reason:'Upload Brisnet'};
 const d=buildRaceDashboard(i,(_,r)=>ranked(r,[1]));
 assert.equal(d.models[2].complete,false);
 assert.equal(d.models[2].ranked,1);
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
 assert.doesNotMatch(html,/dashboard-paper|Paper betting plan/);
 assert.doesNotMatch(html,/100%|confidence|recommended bet/i);
});

test('production adapters expose PASS and unranked first-time starters without mutating inputs',()=>{
 const i=input(race([horse(1,{life_starts:0}),horse(2,{life_starts:0})]));
 i.sources.BRISNET={race:null,reason:'Not loaded'};
 const before=structuredClone(i),d=buildRaceDashboard(i);
 assert.deepEqual(i,before);
 assert.ok(d.models.every(m=>m.rankings.length===0));
 assert.equal(d.models[2].decision,'PASS');
 assert.equal(d.models[3].decision,'UNAVAILABLE');
 assert.equal(d.paper_plans.drfContender.total_cost,0);
});

test('unique names connect unnumbered DRF to numbered source without manufacturing programs',()=>{
 const i=input();i.sources.DRF.race.horses.forEach(h=>h.n='');const before=structuredClone(i);
 const d=buildRaceDashboard(i,(id,r)=>({decision:'PASS',rankings:r.horses}));
 assert.ok(d.models.every(m=>m.available));assert.ok(d.models[2].rankings.every(h=>h.n===''));
 assert.equal(d.shortlist[0].ranks.drfContender,1);assert.equal(d.paper_plans.drfContender.available,false);assert.deepEqual(i,before);
 const names=input();names.anchor.horses.forEach(h=>h.n='');names.sources.DRF.race=structuredClone(names.anchor);
 const html=dashboardHtml(buildRaceDashboard(names,(id,r)=>({rankings:r.horses})));
 assert.match(html,/Horse 1/);assert.doesNotMatch(html,/# Horse/);
});

test('unpriced recent DRF falls back to matching priced Brisnet without modifying sources',()=>{
 const i=input();i.sources.DRF.race.horses.forEach(h=>{h.n='';h.ml='—';});const before=structuredClone(i);
 const selected=selectMorningLineProvider({...i,preferredProvider:'DRF',importedAt:{DRF:'2026-11-01T12:00:00Z',BRISNET:'2026-11-01T11:00:00Z'}});
 assert.equal(selected,'BRISNET');const d=buildRaceDashboard(i,(id,r)=>({rankings:r.horses}));assert.equal(d.morning_line.provider,'BRISNET');assert.equal(d.morning_line.ranked,6);
 assert.equal(morningLineForRunner(i.sources.BRISNET.race,i.sources.DRF.race.horses[0]),'1/1');assert.deepEqual(i,before);
 i.sources.BRISNET.race.date='2026-10-24';assert.equal(selectMorningLineProvider({...i,preferredProvider:'DRF'}),'DRF');assert.equal(buildRaceDashboard(i,(id,r)=>({rankings:r.horses})).morning_line.ranked,0);
});
test('fallback cannot substitute a different horse with the same program',()=>{
 assert.equal(morningLineForRunner(race(),{n:'1',name:'Other'}),null);
 assert.equal(morningLineForRunner(race(),{n:'2',name:'Horse 1'}),null);
});

 test('visible grid follows model order and excludes DRF Finisher from agreement and paper plans',()=>{
 const d=buildRaceDashboard(input(),(_,r)=>ranked(r));
 assert.deepEqual(d.models.map(m=>m.id),['brisContender','brisResearch','drfContender','brisFinisher']);
 assert.deepEqual(d.models.map(m=>m.provider),['BRISNET','BRISNET','DRF','BRISNET']);
 assert.equal(d.shortlist[0].top_four_models,4);assert.equal(d.shortlist[0].ranks.drfFinisher,undefined);assert.equal(d.paper_plans.drfFinisher,undefined);
 const html=dashboardHtml(d);assert.doesNotMatch(html,/Models<br>top 4/);assert.doesNotMatch(html,/DRF<br>Finisher|value="drfFinisher"/);
 assert.ok(html.indexOf('Brisnet<br>Finisher</th>')<html.indexOf('Brisnet<br>Contender</th>'));
 assert.ok(html.indexOf('Brisnet-RR</th>')<html.indexOf('Brisnet<br>Finisher</th>'));assert.ok(html.indexOf('Brisnet<br>Finisher</th>')<html.indexOf('DRF Contender<br>Late +50%</th>'));
 assert.match(html, /<th scope="col">DRF Contender<br>Late \+50%<\/th>/);
 assert.doesNotMatch(html, /<th scope="col">DRF<br>Contender<\/th>/);
 const row=d.shortlist.find(h=>h.n==='1');row.ranks={brisContender:1,brisResearch:2,brisFinisher:3,drfContender:4,morningLine:5};assert.match(dashboardHtml({...d,shortlist:[row]}),/<td class="model-rr">2<\/td><td>3<\/td><td>1<\/td><td>4<\/td><td>5<\/td>/);
 });

test('production Brisnet dashboard adapters match each unchanged scoring engine',async()=>{
 const {rankFinishers}=await import('./finisher-inputs.js'),{rankBrisnetModels}=await import('./brisnet-models.js'),{rankBrisnetResearch}=await import('./brisnet-research.js');
 const h=(n,speeds,early,late)=>horse(n,{life_starts:speeds.length,entry_status:'REGULAR',ratings:{provider:'BRISNET',lines:speeds.map((speed,i)=>({date:['2026-10-20','2026-10-01','2026-09-10'][i],speed,e1:early,e2:early,late,surface:'Dirt',furlongs:6,source:{provider:'BRISNET',text:'synthetic test line'}}))}});
 const anchor=race([h('1',[80,90,85],95,60),h('2',[90,80,85],60,95),h('3',[70,85,80],80,80)],{track:'Churchill Downs',date:'2026-11-04',ratings_provider:'BRISNET'}),before=structuredClone(anchor);
 const d=buildRaceDashboard({anchor,sources:{BRISNET:{race:anchor}}}),base=rankBrisnetModels(anchor),expected={brisContender:base.contender,brisResearch:rankBrisnetResearch(anchor),brisFinisher:{...rankFinishers(anchor),decision:'PASS'}};
 for(const [id,result] of Object.entries(expected)){const m=d.models.find(m=>m.id===id);assert.deepEqual(m.rankings.map(h=>[h.n,h.score]),result.rankings.map(h=>[h.n,h.score]));assert.equal(m.model_id,result.model_id);assert.equal(m.decision,result.decision);}
 assert.equal(d.models.find(m=>m.id==='drfContender').available,false);assert.deepEqual(anchor,before);
});

test('Prime Power is a source-only display column and preserves all orders and model counts',()=>{
 const i=input(),baseline=buildRaceDashboard(i,(_,r)=>ranked(r));
 i.sources.BRISNET.race.horses[0].ratings={prime_power:110,prime_power_rank:'3rd',prime_power_display:'110.0 (3rd)'};
 i.sources.BRISNET.race.horses[5].ratings={prime_power:200,prime_power_rank:'1st',prime_power_display:'200.0 (1st)'};
 const before=structuredClone(i),d=buildRaceDashboard(i,(_,r)=>ranked(r));
 for(const k of ['shortlist','remaining','models','paper_plans'])assert.deepEqual(d[k],baseline[k]);
 assert.deepEqual(i,before);
 const html=dashboardHtml(d);
 assert.match(html,/<th scope="col">Prime Power<\/th><th scope="col" class="model-rr">Brisnet-RR/);
 assert.match(html,/<td>110\.0 \(3rd\)<\/td>/);
 assert.match(html,/<td>200\.0 \(1st\)<\/td>/);
 i.sources.BRISNET.race.date='2026-10-22';
 assert.deepEqual(buildRaceDashboard(i,(_,r)=>ranked(r)).prime_power,{});
});


test('active runners absent from every model and morning line remain visible as unranked',()=>{
 const r=race([horse(1),horse(2),horse(3,{ml:'—'}),horse(4,{ml:'—'}),horse(5,{ml:'—',odds:'SCR'})]);
 const d=buildRaceDashboard(input(r),(id,source)=>ranked(source,[1,2]));
 assert.equal(d.field.length,4);
 assert.deepEqual(d.unranked.map(h=>h.n),['3','4']);
 assert.equal(d.unranked[0].ranks.brisContender,null);
 assert.equal(d.models[0].complete,false);
 assert.doesNotMatch(dashboardHtml(d),/<details/);
 assert.equal((dashboardHtml(d).match(/<tr><th scope="row">/g)||[]).length,d.field.length);
 assert.equal(d.paper_plans.brisContender.tickets.length,3);
});


test('optional official starter evidence distinguishes field match, missing starter and unverified source',()=>{
 const i=input();
 i.officialStarterRoster=[...i.anchor.horses.map(h=>({program:h.n,horse:h.name})),{program:'12',horse:'Safety Off'}];
 i.officialStarterSource='https://example.org/official-starters';
 const missing=buildRaceDashboard(i,(_,r)=>ranked(r));
 assert.equal(missing.models[0].complete,true);
 assert.equal(missing.starter_audit.status,'MISMATCH');
 assert.deepEqual(missing.starter_audit.missing,['12']);
 assert.match(dashboardHtml(missing),/Structured freeze validation rejects this supplied-roster mismatch/);
 assert.deepEqual(missing.starter_audit.absentFromPP,['12']);
 assert.deepEqual(missing.starter_audit.inactiveInPP,[]);
 i.officialStarterRoster.pop();
 assert.equal(buildRaceDashboard(i,(_,r)=>ranked(r)).starter_audit.status,'MATCHES_SUPPLIED_ROSTER');
 delete i.officialStarterSource;
 assert.equal(buildRaceDashboard(i,(_,r)=>ranked(r)).starter_audit.status,'UNVERIFIED_ROSTER');
});


test('official starter audit distinguishes PP runner excluded from active field',()=>{
 const i=input();
 const inactive={n:'12',name:'Safety Off',odds:'SCR',entry_status:'REGULAR',included_in_frozen_field:true};
 i.anchor.horses.push(inactive);
 i.officialStarterRoster=[...i.anchor.horses.map(h=>({program:h.n,horse:h.name}))];
 i.officialStarterSource='https://www.equibase.com/';
 const d=buildRaceDashboard(i,(_,r)=>ranked(r));
 assert.equal(d.starter_audit.status,'MISMATCH');
 assert.deepEqual(d.starter_audit.inactiveInPP,['12']);
 assert.deepEqual(d.starter_audit.absentFromPP,[]);
});
