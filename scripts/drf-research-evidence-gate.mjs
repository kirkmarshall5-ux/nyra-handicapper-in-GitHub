// Research evidence gate: do not grade DRF Contender or Finisher without
// independently recorded pre-race freezes and verified official results.
import {compareDrfFrozenRace} from './drf-contender-finisher-comparison.mjs';
export function gradeVerifiedDrfRace(input){
 const {evidence}=input||{};
 if(!evidence?.drf_source_verified)throw Error('DRF source verification required');
 if(!evidence?.contender_frozen_before_post||!evidence?.finisher_frozen_before_post)
  throw Error('Both DRF model rankings must be frozen before post time');
 if(!evidence?.independent_timestamp_verified)throw Error('Independent pre-race timestamp evidence required');
 if(!evidence?.official_results_reconciled)throw Error('Official results reconciliation required');
 return {...compareDrfFrozenRace(input),evidence_status:'VERIFIED_PRE_RACE',eligible_for_prospective_grading:true};
}
