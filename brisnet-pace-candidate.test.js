import test from 'node:test';import assert from 'node:assert/strict';
import {rankBrisnetPace,PACE_PROFILES,PACE_VARIANTS,paceCandidateBatch,gradePaceCandidate} from './brisnet-pace-candidate.js';
import {rankBrisnetModels} from './brisnet-models.js';
import {paceCandidateHtml} from './brisnet-pace-candidate-display.js';
import {parsePPCard} from './pp-format-router.js';
const line=(pace={},extra={})=>({date:'2026-09-20',surface:'Dirt',furlongs:6,speed:80,e1:80,e2:80,late:80,...pace,...extra,source:{provider:'BRISNET',page:1,text:'Verified fixture line'}});
const horse=(n,pace,extra={})=>({n:String(n),name:'Runner '+n,life_starts:1,ratings:{provider:'BRISNET',run_style:'P',quirin_points:4,lines:[line(pace)]},...extra});
const fixture=()=>({race:1,date:'2026-10-16',track:'Belmont Park',dist:'6F',distance_furlongs:6,surface:'Dirt',ratings_provider:'BRISNET',horses:[horse(1,{e1:100,e2:100,late:60}),horse(2,{e1:60,e2:60,late:100}),horse(3,{e1:80,e2:80,late:80})]});
const rec=c=>({race_key:c.race_key,forecast_pre_off_verified:true,final_field_verified:true,official_order_verified:true,actual_order:c.rankings.map(h=>h.n)});
test('recognizes all four condition profiles and flips early/late preference without changing source',()=>{
 for(const [group,weights] of Object.entries(PACE_PROFILES)){
 const r=fixture(),[surface,category]=group.split(' ');r.surface=surface;r.distance_furlongs=category==='route'?8:6;r.dist=category==='route'?'1M':'6F';
 r.horses.forEach(h=>h.ratings.lines.forEach(l=>{l.surface=surface;l.furlongs=r.distance_furlongs;}));
 if(group==='Dirt route'){r.horses[0].ratings.lines[0].e2=60;r.horses[1].ratings.lines[0].e2=90;r.horses[1].ratings.lines[0].late=90;}
 const before=structuredClone(r),c=rankBrisnetPace(r);assert.equal(c.context.group,group);assert.deepEqual(c.profile,weights);assert.ok(Math.abs(Object.values(weights).reduce((a,b)=>a+b)-1)<1e-10);
 assert.equal(c.rankings[0].n,group==='Dirt sprint'?'1':'2');assert.deepEqual(r,before);
 }
});
test('BASE reproduces native base order; FLAT, CONDITION and TURN isolate explicit changes',()=>{
 const r=fixture();r.horses[0].ratings.lines[0].speed=82;
 const base=rankBrisnetModels(r).v44c;
 assert.deepEqual(rankBrisnetPace(r,{variant:'BASE'}).rankings.map(h=>h.n),base.rankings.map(h=>h.n));
 const f=rankBrisnetPace(r,{variant:'FLAT'}),c=rankBrisnetPace(r),t=rankBrisnetPace(r,{variant:'TURN'});
 assert.deepEqual(f.profile,{e1:1/3,e2:1/3,late:1/3});assert.deepEqual(c.profile,PACE_PROFILES['Dirt sprint']);
 for(const h of c.rankings){assert.ok(Math.abs(h.score-(.75*h.base_percentile+.25*h.pace_score))<1e-10);const x=t.rankings.find(x=>x.n===h.n);assert.ok(Math.abs(x.pace_score-(.9*h.pace_score+.1*x.pace_percentiles.turn))<1e-10);}
 assert.throws(()=>rankBrisnetPace(r,{variant:'UNKNOWN'}));
});
test('neutral missing pace preserves base order and is neither zero nor unmatched substitution',()=>{
 const r=fixture();r.horses[0].ratings.lines[0].speed=90;r.horses.forEach(h=>h.ratings.lines[0].furlongs=8);
 const c=rankBrisnetPace(r);assert.equal(c.scenario,'UNKNOWN_INCOMPLETE_FIELD_EVIDENCE');
 for(const h of c.rankings){assert.equal(h.pace_score,50);assert.deepEqual(h.raw_pace,{e1:null,e2:null,late:null,turn:null});}
 assert.deepEqual(c.rankings.map(h=>h.n),rankBrisnetModels(r).v44c.rankings.map(h=>h.n));
});
test('partial missing metric remains neutral while observed zero is ranked',()=>{
 const r=fixture();r.horses[0].ratings.lines[0].late=null;r.horses[1].ratings.lines[0].e1=0;
 const c=rankBrisnetPace(r),a=c.rankings.find(h=>h.n==='1'),b=c.rankings.find(h=>h.n==='2');
 assert.equal(a.pace_percentiles.late,50);assert.ok(a.missing_pace.includes('late'));assert.equal(b.raw_pace.e1,0);assert.equal(b.pace_percentiles.e1,0);
});
test('turn index is computed on one historical line; latest available cells retain dates',()=>{
 const r=fixture(),h=r.horses[0];h.life_starts=2;h.ratings.lines=[line({e1:null,e2:99}),line({e1:70,e2:75},{date:'2026-08-20'})];
 const x=rankBrisnetPace(r,{variant:'TURN'}).rankings.find(h=>h.n==='1');assert.equal(x.raw_pace.turn,5);assert.equal(x.evidence.turn.date,'2026-08-20');assert.equal(x.evidence.e2.date,'2026-09-20');
});
test('unknown, synthetic, contradictory, unsupported and other-provider races HOLD',()=>{
 for(const change of [r=>r.surface='Synthetic',r=>r.surface='Unknown',r=>r.conditions={surface:'Turf'},r=>r.dist='1M',r=>r.cls='Hurdle race',r=>r.parser_blockers=['unverified source']]){
 const r=fixture();change(r);assert.equal(rankBrisnetPace(r).status,'HOLD');}
 const r=fixture();delete r.ratings_provider;r.horses.forEach(h=>delete h.ratings);assert.equal(rankBrisnetPace(r).status,'HOLD');
});
test('source blockers, FTS, future history, and absent latest Speed remain unrated',()=>{
 for(const change of [h=>h.life_starts=0,h=>h.ratings.lines[0].date='2026-10-17',h=>h.ratings.lines[0].speed=null,h=>h.parser_blockers=['review required']]){
 const r=fixture();change(r.horses[0]);const c=rankBrisnetPace(r);assert.equal(c.status,'PARTIAL_RESEARCH_RANKING');assert.equal(c.rankings.length,2);assert.equal(c.unrated[0].n,'1');assert.equal(c.complete_pace_field,false);}
});
test('scratch and AE exclusion is consistent; no scenario certainty with incomplete evidence',()=>{
 const r=fixture();r.horses[0].odds='SCR';r.horses[1].entry_status='AE';assert.equal(rankBrisnetPace(r).status,'HOLD');
 const s=fixture();s.horses[2].ratings.run_style='NA';assert.equal(rankBrisnetPace(s).scenario,'UNKNOWN_INCOMPLETE_FIELD_EVIDENCE');
});
test('clear-early and fade are explicit research flags and never score bonuses or eliminations',()=>{
 const r=fixture();r.horses[0].ratings.run_style='E';const c=rankBrisnetPace(r),h=c.rankings.find(h=>h.n==='1');
 assert.ok(h.flags.includes('CLEAR_EARLY_4PT_HYPOTHESIS'));assert.equal(c.scenario_flags_affect_score,false);
 r.surface='Turf';r.horses.forEach(h=>h.ratings.lines[0].surface='Turf');const t=rankBrisnetPace(r),x=t.rankings.find(h=>h.n==='1');assert.ok(x.flags.includes('EARLY_LATE_IMBALANCE_REVIEW'));assert.equal(t.rankings.length,3);
 r.horses[2].life_starts=0;assert.equal(rankBrisnetPace(r).rankings.some(h=>h.flags.includes('CLEAR_EARLY_4PT_HYPOTHESIS')),false);
});
test('export includes four reproducible arms and unchanged parents; no timing certification or outcomes invented',()=>{
 const r=fixture(),card={id:'test',date:r.date,track:r.track,races:{1:r}},before=structuredClone(card),b=paceCandidateBatch(card,{capturedAt:'2026-10-16T17:30:00Z'});
 assert.deepEqual(Object.keys(b.races[0].candidates),PACE_VARIANTS);assert.equal(b.forecast_pre_off_verified,false);assert.equal(b.results,null);assert.deepEqual(b.races[0].models,rankBrisnetModels(r));assert.deepEqual(card,before);
});
test('grading requires same race, verified pre-off/final-field/order and complete field; ranks are not probabilities',()=>{
 const c=rankBrisnetPace(fixture());assert.equal(gradePaceCandidate(c,rec(c)).status,'GRADED');assert.equal(gradePaceCandidate(c,rec(c)).metrics.rank_mae,0);
 for(const patch of [{race_key:'other'},{forecast_pre_off_verified:false},{final_field_verified:false},{official_order_verified:false},{actual_order:['1','2']}])assert.equal(gradePaceCandidate(c,{...rec(c),...patch}).status,'HOLD');
 const r=fixture();r.horses[0].life_starts=0;const p=rankBrisnetPace(r);assert.equal(gradePaceCandidate(p,rec(p)).status,'HOLD');assert.equal(c.probabilities,null);assert.equal(c.bettingEnabled,false);
});
test('candidate display escapes names, shows condition weights and keeps research flags separate',()=>{
 const r=fixture();r.horses[0].name='<script>bad</script>';const html=paceCandidateHtml(rankBrisnetPace(r));assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/E1 45%/);assert.match(html,/no score adjustment/);assert.match(html,/proposed test weights/);
});
// End-to-end positioned PP text -> existing parser -> native validation -> candidate.
const item=(str,x,y,width=str.length*3.16)=>({str,transform:[1,0,0,1,x,y],width});
test('Premium Plus positioned PP figures flow through parser into candidate with correct surface/distance',()=>{
 const head=[item("Premium Plus PP's",10,760),item('Belmont',120,760),item('6 Furlongs. October 16, 2026 Race 1',200,760),item('brisnet.com Bloodstock Research',10,20)];
 const block=(n,y,e1,e2,lp)=>[item('Example Runner '+n+' (E/P 5)',45,y),item(String(n),17,y-5),item('Life: 1 0 - 0 - 0',390,y),item('8/1',17,y-14),item('DATE TRK',10,y-50),item('E1',218,y-50),item('E2/',229.57,y-50),item('LP',243.89,y-50),item('1c',256.83,y-50),item('2c',267.56,y-50),item('SPD PP ST',279.66,y-50),item('09Sep26Del',10,y-60),item('6f ft',60,y-60),item(e1+' '+e2+'/',214.52,y-60,22.48),item(String(lp),243.68,y-60,6.32),item('+17 +18',253.56,y-60,20.44),item('73',281.81,y-60,8.19),item('10',291.68,y-60,6.32)];
 const card=parsePPCard([{pageNumber:1,items:[...head,...block(1,650,103,105,79),...block(2,450,93,95,89)]}]);
 const c=rankBrisnetPace(card.races[1]);assert.equal(c.context.group,'Dirt sprint');assert.equal(c.rankings.length,2);const h=c.rankings.find(h=>h.n==='1');assert.deepEqual([h.raw_pace.e1,h.raw_pace.e2,h.raw_pace.late],[103,105,79]);assert.equal(h.evidence.e1.page,1);
});

test('CLI grades the preserved export on identical seven-arm cohorts and rejects regenerated forecasts',async()=>{
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path'),{spawnSync}=await import('node:child_process');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bris-pace-test-'));
 try{
  const r=fixture(),card={id:'test',date:r.date,track:r.track,races:{1:r}},input=path.join(dir,'card.json'),snap=path.join(dir,'snapshot.json'),results=path.join(dir,'results.json'),graded=path.join(dir,'graded.json');
  fs.writeFileSync(input,JSON.stringify(card));fs.writeFileSync(results,JSON.stringify({records:[rec(rankBrisnetPace(r))]}));
  const script=new URL('./scripts/brisnet-pace-evaluate.mjs',import.meta.url).pathname;
  let run=spawnSync(process.execPath,[script,input,snap],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);
  run=spawnSync(process.execPath,[script,input,graded,results],{encoding:'utf8'});assert.notEqual(run.status,0);assert.match(run.stderr,/preserved candidate export/);
  run=spawnSync(process.execPath,[script,snap,graded,results],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);
  const g=JSON.parse(fs.readFileSync(graded));assert.equal(g.summary.ALL.paired_graded_races,1);assert.equal(Object.keys(g.summary.ALL.arms).length,7);assert.equal(g.summary.ALL.arms.CONDITION.first4_eligible_races,0);assert.equal(g.summary.ALL.arms.CONDITION.mean_full_field_rank_error,0);
  fs.writeFileSync(results,JSON.stringify({records:[rec(rankBrisnetPace(r)),rec(rankBrisnetPace(r))]}));
  run=spawnSync(process.execPath,[script,snap,graded,results],{encoding:'utf8'});assert.notEqual(run.status,0);assert.match(run.stderr,/Duplicate official/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
