// Read-only trace of the actual displayed models; MIX1 is retained as research.
import {rankBrisnetModels} from './brisnet-models.js';
import {finisherInputs} from './finisher-inputs.js';
import {rankFinisherFeatures,FINISHER_SPEC} from './finisher-model.js';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const category=v=>finite(v)?v>=8?'route':'sprint':null;
export function brisnetMatchTrace(h,r){
 const lines=h.ratings?.lines||[],call=category(r.distance_furlongs)==='route'?'e2':'e1';
 const history=lines.map((l,i)=>{
  const age=(Date.parse(r.date)-Date.parse(l.date))/86400000,reasons=[];
  if(i>=FINISHER_SPEC.recent_window)reasons.push('OUTSIDE_LATEST_FIVE');
  if(!Number.isFinite(age)||age<=0)reasons.push('INVALID_OR_NONPRIOR_DATE');
  if(age>FINISHER_SPEC.history_days)reasons.push('OLDER_THAN_365_DAYS');
  if(!['Dirt','Turf','Synth'].includes(l.surface)||l.surface!==r.surface)reasons.push('SURFACE_MISMATCH_OR_UNKNOWN');
  if(category(l.furlongs)===null||category(r.distance_furlongs)===null||category(l.furlongs)!==category(r.distance_furlongs))reasons.push('SPRINT_ROUTE_MISMATCH_OR_UNKNOWN');
  if(!finite(l.furlongs)||!finite(r.distance_furlongs)||Math.abs(l.furlongs-r.distance_furlongs)>FINISHER_SPEC.distance_tolerance_furlongs)reasons.push('DISTANCE_OUTSIDE_HALF_FURLONG_OR_UNKNOWN');
  return {history_index:i+1,date:l.date,surface:l.surface,furlongs:l.furlongs,source_page:l.source?.page??null,matched:reasons.length===0,reasons,speed_available:finite(l.speed),early_available:finite(l[call]),late_available:finite(l.late)};
 });
 const matched=history.filter(l=>l.matched),speeds=matched.filter(l=>l.speed_available).length;
 return {program:h.n,name:h.name,pace_call:call.toUpperCase(),history,
  matched_lines:matched.length,matched_speed_lines:speeds,
  requirements:{finisher_matched_speed:1,mix1_surfaceDistance:2},
  gaps:{finisher_matched_speed:speeds?null:'No verified matched Speed in latest five starts',mix1_surfaceDistance:speeds>=2?null:'Requires two verified matched Speed starts',early:matched.some(l=>l.early_available)?null:'No verified matched '+call.toUpperCase(),late:matched.some(l=>l.late_available)?null:'No verified matched LP'}};
}
export function brisnetRaceModelAudit(r){
 const models=rankBrisnetModels(r);
 if(!models)throw Error('Brisnet model adapter unavailable');
 const inputs=finisherInputs(r),finisher=rankFinisherFeatures(inputs);
 const native=Object.fromEntries(['v44c','mix1','contender'].map(id=>{const m=models[id];return [id,{model_id:m.model_id,decision:m.decision,bettingEnabled:m.bettingEnabled,probabilityCalibrated:m.probabilityCalibrated,eligible_count:m.eligible_count,rated_count:m.rated_count,unrated:m.unrated,rankings:m.rankings.map(h=>({program:h.n,name:h.name,rank:h.rank,score:h.score,raw_features:h.raw_features??null,component_scores:h.component_scores??null,effective_weights:h.effective_weights??null,available_weight:h.available_weight??null,feature_contributions:h.feature_contributions??null,trend_adjustment:h.trend_adjustment??null,evidence:h.evidence??null}))}]}));
 native.finisher={...finisher,decision:'PASS',rated_count:finisher.rankings.length,inputs,rankings:finisher.rankings.map(h=>({...h,program:h.n}))};
 return {race:r.race,date:r.date,surface:r.surface,distance_furlongs:r.distance_furlongs,conditions:r.conditions??null,parser_blockers:r.parser_blockers??[],
  displayed_models:['v44c','finisher','contender'],research_models:['mix1'],
  runners:(r.horses||[]).map(h=>({program:h.n,name:h.name,odds:h.odds??null,entry_status:h.entry_status??null,included_in_frozen_field:h.included_in_frozen_field??null,life_starts:h.life_starts??null,parser_blockers:h.parser_blockers??[],source_context:h.source_context??null,history:(h.ratings?.lines||[]).map(l=>({date:l.date,surface:l.surface,furlongs:l.furlongs,speed:l.speed,e1:l.e1,e2:l.e2,late:l.late,source_page:l.source?.page??null,source_text:l.source?.text??null}))})),
  matching_diagnostics:(r.horses||[]).map(h=>brisnetMatchTrace(h,r)),models:native};
}
