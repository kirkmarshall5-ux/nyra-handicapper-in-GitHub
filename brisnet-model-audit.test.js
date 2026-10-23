import test from 'node:test';
import assert from 'node:assert/strict';
import {brisnetRaceModelAudit,brisnetMatchTrace} from './brisnet-model-audit.js';
import {brisnetConnectionRecord,rankBrisnetModels} from './brisnet-models.js';
import {rankFinishers} from './finisher-inputs.js';
const record=(starts,wins)=>({starts,wins,status:'SOURCE_COUNTS_VERIFIED'});
const line=(date='2026-10-01',furlongs=6)=>({date,furlongs,surface:'Turf',speed:80,e1:90,e2:85,late:82,source:{provider:'BRISNET',text:'verified fixture',page:1}});
const horse=(n)=>({n:String(n),name:'Runner '+n,life_starts:6,odds:'—',entry_status:'REGULAR',parser_blockers:['BRISNET_SPEED_NOT_BEYER'],source_context:{jockey:{...record(10,0),annual:record(100,20)},trainer:{...record(0,0),annual:record(100,10)}},ratings:{provider:'BRISNET',lines:[line()]}});
const race=()=>({race:1,date:'2026-10-21',surface:'Turf',distance_furlongs:6,ratings_provider:'BRISNET',parser_blockers:['BRISNET_SOURCE_MODEL_VALIDATION_PENDING'],horses:[horse(1),horse(2)]});
test('small verified local sample falls back to verified annual counts; zero is preserved',()=>{
 const h=horse(1);assert.deepEqual(brisnetConnectionRecord(h,'jockey'),{scope:'annual',starts:100,wins:20,year:null,value:60});
 h.source_context.jockey=record(25,0);assert.equal(brisnetConnectionRecord(h,'jockey').value,0);assert.equal(brisnetConnectionRecord(h,'jockey').scope,'local');
 h.source_context.jockey={...record(1,1),annual:record(24,10)};assert.equal(brisnetConnectionRecord(h,'jockey').value,null);
 h.source_context.jockey.annual={...record(100,20),status:'UNVERIFIED'};assert.equal(brisnetConnectionRecord(h,'jockey').value,null);
 h.source_context.jockey.annual=record(100,101);assert.equal(brisnetConnectionRecord(h,'jockey').value,null);
});
test('connection fallback reaches native raw features without changing their weights or source',()=>{
 const r=race(),before=structuredClone(r),out=rankBrisnetModels(r);
 assert.equal(out.v44c.rankings[0].raw_features.jockey,60);assert.equal(out.v44c.rankings[0].raw_features.trainer,30);
 assert.equal(out.mix1.rankings[0].raw_features.trainer,30);assert.equal(out.v44c.rankings[0].effective_weights.jockey,7/77);
 assert.match(out.v44c.model_id,/20261021-input-v2/);assert.deepEqual(r,before);
});
test('audit contains the displayed Finisher output and inputs, separate from research MIX1',()=>{
 const r=race(),before=structuredClone(r),a=brisnetRaceModelAudit(r),f=rankFinishers(r);
 assert.deepEqual(a.displayed_models,['v44c','finisher','contender']);assert.deepEqual(a.research_models,['mix1']);
 assert.equal(a.models.finisher.model_id,f.model_id);assert.deepEqual(a.models.finisher.rankings.map(({program,...h})=>h),f.rankings);
 assert.equal(a.models.finisher.inputs[0].late_pace,82);assert.equal(a.models.finisher.inputs[0].matched_speed,80);
 assert.equal(a.models.mix1.rankings[0].raw_features.surfaceDistance,null);
 for(const m of Object.values(a.models)){assert.equal(m.bettingEnabled,false);assert.equal(m.probabilityCalibrated,false);assert.equal(m.decision,'PASS');}
 assert.deepEqual(r,before);
});
test('matching trace explains exclusions and the different one/two-start thresholds',()=>{
 const r=race(),h=r.horses[0];h.ratings.lines.push({...line('2026-09-01'),surface:'Dirt'},line('2026-08-01',8),line('2026-07-01',7),line('2025-01-01'),line('2024-12-01'));
 const a=brisnetMatchTrace(h,r);assert.equal(a.matched_speed_lines,2);assert.equal(a.gaps.finisher_matched_speed,null);assert.equal(a.gaps.mix1_surfaceDistance,null);assert.equal(a.history[3].matched,true);
 for(const [i,reason] of [[1,'SURFACE_MISMATCH_OR_UNKNOWN'],[2,'SPRINT_ROUTE_MISMATCH_OR_UNKNOWN'],[4,'OLDER_THAN_365_DAYS'],[5,'OUTSIDE_LATEST_FIVE']])assert.ok(a.history[i].reasons.includes(reason));
});
test('Finisher rejects nonfinite scoring figures instead of treating them as verified',()=>{
 const r=race();r.horses[0].ratings.lines[0].speed=NaN;
 const a=brisnetRaceModelAudit(r);assert.equal(a.models.finisher.rated_count,1);assert.equal(a.models.v44c.rated_count,1);
 assert.match(a.models.finisher.unrated[0].reason,/unverified/);
});
