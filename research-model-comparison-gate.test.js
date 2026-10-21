import test from 'node:test';
import assert from 'node:assert/strict';
import {validateModelComparison} from './research-model-comparison-gate.js';
const base={provider:'DRF',raceKey:'BEL-2026-10-17-R8',model:'V4.4c',snapshotId:'anchor-1',snapshotTime:'2026-10-17T17:00:00-04:00',officialOffTime:'2026-10-17T17:30:00-04:00',snapshotVerified:true,finalFieldVerified:true,officialResultVerified:true,rankedRunnerIds:['1','2','3'],officialFinishIds:['2','1','3'],pass:false};
test('eligible same-provider independently verified complete fields',()=>{const r=validateModelComparison([base,{...base,model:'Contender',snapshotId:'anchor-2'}]);assert.equal(r.status,'ELIGIBLE_FOR_DESCRIPTIVE_GRADING');});
test('provider families cannot be pooled',()=>{const r=validateModelComparison([base,{...base,provider:'BRISNET',model:'MIX1'}]);assert.ok(r.reasons.includes('MIXED_PROVIDER_FAMILIES'));});
test('post-off snapshot cannot count as prospective',()=>{const r=validateModelComparison([{...base,snapshotTime:'2026-10-17T18:00:00-04:00'}]);assert.ok(r.reasons.includes('PRE_OFF_TIME_UNVERIFIED'));});
test('unverified result and incomplete fields remain HOLD',()=>{const r=validateModelComparison([{...base,officialResultVerified:false,officialFinishIds:['1','2']}]);assert.ok(r.reasons.includes('OFFICIAL_RESULT_UNVERIFIED'));assert.ok(r.reasons.includes('FIELD_OR_FINISH_MISMATCH'));});
test('pass status retained rather than silently treated as bet',()=>{const r=validateModelComparison([{...base,pass:true}]);assert.ok(r.reasons.includes('PASS_RACE_EXCLUDED_FROM_ACTION_ONLY'));});
