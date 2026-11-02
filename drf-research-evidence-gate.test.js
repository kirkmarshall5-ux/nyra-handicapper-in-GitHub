import test from 'node:test';
import assert from 'node:assert/strict';
import {gradeVerifiedDrfRace} from './scripts/drf-research-evidence-gate.mjs';
const card={source_format:'DRF',races:{1:{horses:[1,2,3,4].map(n=>({n:String(n)}))}}};
const input={card,race:1,contender:[1,2,3,4],finisher:[2,1,3,4],finishOrder:[1,2,3,4]};
const verified={drf_source_verified:true,contender_frozen_before_post:true,finisher_frozen_before_post:true,independent_timestamp_verified:true,official_results_reconciled:true};
for(const key of Object.keys(verified))test('rejects missing '+key,()=>assert.throws(()=>gradeVerifiedDrfRace({...input,evidence:{...verified,[key]:false}}),/required|frozen/));
test('rejects absent evidence',()=>assert.throws(()=>gradeVerifiedDrfRace(input),/required/));
test('grades only fully verified DRF evidence',()=>{const x=gradeVerifiedDrfRace({...input,evidence:verified});assert.equal(x.eligible_for_prospective_grading,true);assert.equal(x.contender.topChoiceWon,true);});
