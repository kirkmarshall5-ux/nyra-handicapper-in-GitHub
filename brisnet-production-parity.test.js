import test from 'node:test';
import assert from 'node:assert/strict';
import {rankBrisnetModels} from './brisnet-models.js';
import {brisnetRaceModelAudit,brisnetMatchTrace} from './brisnet-model-audit.js';
import {finisherInputs} from './finisher-inputs.js';
import {rankFinisherFeatures,FINISHER_SPEC} from './finisher-model.js';

// Execute the production model modules, not an independent reimplementation.
// Two actual starts are at 7f and 6f for a 6f Turf race: both must qualify
// under the released one-furlong rule. A Dirt line must not qualify.
const line=(date,furlongs,speed,late,surface='Turf')=>({
 date,furlongs,surface,speed,e1:90,e2:86,late,
 source:{provider:'BRISNET',text:'Verified historical PP fixture',page:1}
});
const horse=(n,lines)=>({
 n:String(n),name:'Runner '+n,odds:'5/1',entry_status:'REGULAR',
 life_starts:lines.length,parser_blockers:['BRISNET_SPEED_NOT_BEYER'],
 source_context:{jockey:{starts:50,wins:10,status:'SOURCE_COUNTS_VERIFIED'},trainer:{starts:50,wins:8,status:'SOURCE_COUNTS_VERIFIED'}},
 ratings:{provider:'BRISNET',lines}
});
const makeRace=()=>({
 race:1,date:'2026-10-21',surface:'Turf',distance_furlongs:6,
 ratings_provider:'BRISNET',parser_blockers:['BRISNET_SOURCE_MODEL_VALIDATION_PENDING'],
 horses:[
  horse(1,[line('2026-10-12',7,90,92),line('2026-09-10',6,78,74),line('2026-08-01',6,82,80,'Dirt')]),
  horse(2,[line('2026-10-12',6,84,83),line('2026-09-10',7,85,85)]),
  horse(3,[line('2026-10-12',6,80,80),line('2026-09-10',8,99,99)])
 ]
});
test('Priority 1: production Finisher and all native Brisnet heads agree with displayed model audit',()=>{
 const r=makeRace(),original=structuredClone(r),audit=brisnetRaceModelAudit(r),native=rankBrisnetModels(r);
 assert.equal(FINISHER_SPEC.distance_tolerance_furlongs,1);
 assert.deepEqual(audit.displayed_models,['v44c','finisher','contender']);
 assert.deepEqual(audit.research_models,['mix1']);
 const inputs=finisherInputs(r),directFinisher=rankFinisherFeatures(inputs);
 assert.deepEqual(audit.models.finisher.inputs,inputs);
 assert.deepEqual(audit.models.finisher.rankings.map(({program,...h})=>h),directFinisher.rankings);
 for(const id of ['v44c','contender','mix1']){
  const displayed=audit.models[id],direct=native[id];
  assert.equal(displayed.model_id,direct.model_id);
  assert.deepEqual(displayed.rankings.map(h=>[h.program,h.rank,h.score]),direct.rankings.map(h=>[h.n,h.rank,h.score]));
  assert.equal(displayed.bettingEnabled,false);
  assert.equal(displayed.probabilityCalibrated,false);
  assert.equal(displayed.decision,'PASS');
 }
 assert.equal(audit.models.finisher.bettingEnabled,false);
 assert.equal(audit.models.finisher.probabilityCalibrated,false);
 assert.equal(audit.models.finisher.decision,'PASS');
 assert.deepEqual(r,original,'source card cannot be mutated by replay');
});
test('Priority 1: one-furlong boundary changes matching inputs, not cross-surface or sprint/route rules',()=>{
 const r=makeRace(),trace=brisnetMatchTrace(r.horses[0],r);
 assert.equal(trace.matched_speed_lines,2);
 assert.equal(trace.history[0].matched,true,'7f matches 6f at one-furlong boundary');
 assert.equal(trace.history[1].matched,true);
 assert.equal(trace.history[2].matched,false,'Dirt is not comparable to Turf');
 assert.ok(trace.history[2].reasons.includes('SURFACE_MISMATCH_OR_UNKNOWN'));
 const input=finisherInputs(r).find(x=>x.n==='1');
 assert.ok(input.matched_speed>78&&input.matched_speed<90);
 assert.equal(input.late_pace,92);
 const trace3=brisnetMatchTrace(r.horses[2],r);
 assert.ok(trace3.history[1].reasons.includes('SPRINT_ROUTE_MISMATCH_OR_UNKNOWN'));
 assert.ok(trace3.history[1].reasons.includes('DISTANCE_OUTSIDE_ONE_FURLONG_OR_UNKNOWN'));
});
