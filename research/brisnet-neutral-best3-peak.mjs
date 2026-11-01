// Offline shadow research only. Never imported by the live application.
import {rankBrisnetModels} from '../brisnet-models.js';
import {MODEL} from '../contender-model.js';
export const CANDIDATE_ID='BRIS-CONTENDER-NEUTRAL-BEST3-PEAK-v1-20261101';
export function shadowRankings(baseline){
 if(MODEL.features[2]!=='best_three'||MODEL.features[5]!=='same_surface_peak_90_days')throw Error('Feature specification changed');
 const rows=structuredClone(baseline.rankings);
 for(const h of rows){
  if(!Number.isFinite(h.score)||![2,5].every(i=>Number.isFinite(h.feature_contributions?.[i])))throw Error('Verified baseline contributions required');
  h.baseline_score=h.score;
  h.neutralized_contribution=h.feature_contributions[2]+h.feature_contributions[5];
  h.score-=h.neutralized_contribution;
 }
 rows.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
 rows.forEach((h,i)=>{h.rank=i+1;h.v44c_rank=i+1;h.v44c_unrounded_score=h.score;h.v44c_display_score=Math.round(h.score*10)/10;});
 return {...structuredClone(baseline),model_id:CANDIDATE_ID,rankings:rows,runners:rows,decision:'PASS',research_only:true,bettingEnabled:false,neutralized_features:[MODEL.features[2],MODEL.features[5]]};
}
export function researchCandidate(race){
 const models=rankBrisnetModels(race);
 if(!models)throw Error('Native Brisnet input required');
 return shadowRankings(models.contender);
}
