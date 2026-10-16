// Independent hypothesis model: never changes parent engines or authorizes bets.
import {rankBrisnetModels,BRISNET_MODEL_IDS} from './brisnet-models.js';
import {brisnetPaceDisplay} from './brisnet-pace-display.js';
import {displayDistance} from './race-conditions.js';
import {classifyRace,orderMetrics} from './race-selector.js';
export const PACE_CANDIDATE_ID='BRIS-PACE-CONTEXT-v1';
export const PACE_PROFILES=Object.freeze({
 'Dirt sprint':Object.freeze({e1:.45,e2:.40,late:.15}),
 'Turf sprint':Object.freeze({e1:.15,e2:.30,late:.55}),
 'Dirt route':Object.freeze({e1:.10,e2:.45,late:.45}),
 'Turf route':Object.freeze({e1:.10,e2:.25,late:.65})
});
export const PACE_VARIANTS=Object.freeze(['BASE','FLAT','CONDITION','TURN']);
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const pct=(v,values)=>!finite(v)?50:values.length<2||new Set(values).size<2?50:100*(values.filter(x=>x<v).length+.5*(values.filter(x=>x===v).length-1))/(values.length-1);
const active=h=>h.odds!=='SCR'&&h.included_in_frozen_field!==false&&(!h.entry_status||h.entry_status==='REGULAR');
function compactDistance(text){
 const t=displayDistance(text||'').replace(/½/g,' 1/2').replace(/¼/g,' 1/4').replace(/¾/g,' 3/4');
 const m=t.match(/^\s*(\d+(?:\.\d+)?)(?:\s+(\d+)\/(\d+))?\s*(M|F|Miles?|Furlongs?)\s*$/i);
 return m&&(!m[3]||+m[3]>0)?(+m[1]+(m[2]?+m[2]/+m[3]:0))*(/^m/i.test(m[4])?8:1):null;
}
export function rankBrisnetPace(race,{variant='CONDITION'}={}){
 if(!PACE_VARIANTS.includes(variant))throw Error('Unknown pace candidate variant');
 const compact=compactDistance(race.dist),context=classifyRace({...race,distance_furlongs:finite(race.distance_furlongs)?race.distance_furlongs:compact??undefined}),meta={model_id:PACE_CANDIDATE_ID+':'+variant,variant,race_key:[race.track,race.date,race.race].join('|'),research_only:true,decision:'PASS',bettingEnabled:false,probabilityCalibrated:false,probabilities:null,context};
 const hold=reason=>({...meta,status:'HOLD',reason,rankings:[],unrated:[],profiles:PACE_PROFILES});
 if(finite(compact)&&finite(race.distance_furlongs)&&Math.abs(compact-race.distance_furlongs)>1e-8)return hold('Compact distance and source furlongs conflict');
 if(context.status!=='CLASSIFIED')return hold(context.reason);
 if(context.provider_family!=='BRISNET')return hold('Verified native Brisnet source required; no Timeform or Beyer substitution');
 if(!PACE_PROFILES[context.group])return hold('Synthetic profile not specified: collect evidence before defining its weights');
 // Existing native validator governs identities, historical sequence, source blockers and FTS.
 const normalized={...race,surface:context.surface,distance_furlongs:context.furlongs};
 const parents=rankBrisnetModels(normalized),parent=parents?.v44c;
 if(!parent?.rankings?.length)return {...hold('No source-verified native base ranking available'),unrated:parent?.unrated||[]};
 const field=(race.horses||[]).filter(active);
 if(field.length<2)return hold('At least two eligible runners required');
 const display=brisnetPaceDisplay(normalized),source=new Map(display.rows.map(h=>[String(h.n),h]));
 const candidates=parent.rankings.map(h=>({h,p:source.get(String(h.n))}));
 const observed=Object.fromEntries(['e1','e2','late','turn'].map(k=>[k,candidates.flatMap(x=>finite(x.p?.metrics[k]?.value)?[x.p.metrics[k].value]:[])]));
 const baseValues=candidates.map(x=>x.h.score),profile=variant==='FLAT'?{e1:1/3,e2:1/3,late:1/3}:PACE_PROFILES[context.group];
 const completePace=field.length===candidates.length&&candidates.every(({p})=>['e1','e2','late'].every(k=>finite(p?.metrics[k]?.value)));
 const completeStyles=completePace&&candidates.every(({p})=>['E','E/P','P','S'].includes(p.style));
 const earlyTypes=candidates.filter(({p})=>p&&['E','E/P'].includes(p.style));
 const pressure=completeStyles?(candidates.filter(({p})=>p.style==='E'&&p.metrics.e2.value>=Math.max(...observed.e2)-5).length>=2?'MULTIPLE_COMPETITIVE_E_TYPES':earlyTypes.length===1?'ONE_EARLY_STYLE_TYPE':'OTHER_STYLE_MIX'):'UNKNOWN_INCOMPLETE_FIELD_EVIDENCE';
 const rankings=candidates.map(({h,p})=>{
  const raw=Object.fromEntries(['e1','e2','late','turn'].map(k=>[k,p?.metrics[k]?.value??null]));
  const percentiles=Object.fromEntries(Object.keys(raw).map(k=>[k,pct(raw[k],observed[k])]));
  const basePercentile=pct(h.score,baseValues);
  const weightedPace=Object.entries(profile).reduce((s,[k,w])=>s+w*percentiles[k],0);
  const paceScore=variant==='TURN'?.9*weightedPace+.1*percentiles.turn:weightedPace;
  const score=variant==='BASE'?basePercentile:.75*basePercentile+.25*paceScore;
  const flags=[];
  if(p?.matched===0)flags.push('NO_MATCHING_PACE_HISTORY');
  if(p?.matched===1)flags.push('SINGLE_MATCH_ONLY');
  if(completePace){
   const others=candidates.filter(x=>String(x.h.n)!==String(h.n));
   if(others.length&&['E','E/P'].includes(p.style)&&['e1','e2'].every(k=>raw[k]-Math.max(...others.map(x=>x.p.metrics[k].value))>=4))flags.push('CLEAR_EARLY_4PT_HYPOTHESIS');
   if(context.group==='Turf sprint'&&['E/P','P'].includes(p.style)&&raw.e2>=Math.max(...observed.e2)-3&&percentiles.late>=75)flags.push('TACTICAL_LATE_HYPOTHESIS');
   if(context.group==='Turf sprint'&&percentiles.e1>=75&&percentiles.late<=25)flags.push('EARLY_LATE_IMBALANCE_REVIEW');
   if(context.group==='Dirt route'&&percentiles.e2>=60&&percentiles.late>=60)flags.push('BALANCED_E2_LP_HYPOTHESIS');
   if(context.group==='Turf route'&&pressure==='ONE_EARLY_STYLE_TYPE'&&['E','E/P'].includes(p.style))flags.push('LOW_STYLE_PRESSURE_HYPOTHESIS');
  }
  const original=field.find(x=>String(x.n)===String(h.n));const first=original?.ratings?.lines?.[0];
  if(context.category==='route'&&first?.surface===context.surface&&finite(first.furlongs)&&first.furlongs<8)flags.push('SPRINT_TO_ROUTE_REVIEW_NOT_PACE_SUBSTITUTION');
  return {n:String(h.n),name:h.name,score,base_score:h.score,base_percentile:basePercentile,pace_score:variant==='BASE'?null:paceScore,raw_pace:raw,pace_percentiles:percentiles,evidence:p?.metrics??{},matched_starts:p?.matched??0,source_style:p?.style??'Unknown',early_speed_points:p?.quirin??null,missing_pace:Object.keys(profile).filter(k=>!finite(raw[k])),flags};
 }).sort((a,b)=>b.score-a.score||b.base_score-a.base_score||a.name.localeCompare(b.name));
 rankings.forEach((h,i)=>h.rank=i+1);
 const anyPace=rankings.some(h=>Object.values(h.raw_pace).some(finite));
 return {...meta,status:parent.unrated.length?'PARTIAL_RESEARCH_RANKING':'RESEARCH_RANKING',reason:parent.unrated.length?'Partial field: unrated horses may be competitive':anyPace?'Experimental weights; no improvement established':'No comparable pace: neutral pace preserves base order',rankings,unrated:parent.unrated,eligible_count:field.length,rated_count:rankings.length,complete_pace_field:completePace,scenario:pressure,scenario_flags_affect_score:false,base_model_id:BRISNET_MODEL_IDS.v44c,profile:variant==='BASE'?null:{...profile},blend:variant==='BASE'?{base:1,pace:0}:{base:.75,pace:.25},turn_fraction_of_pace:variant==='TURN'?.1:0,method:'Latest available E1/E2/LP separately among latest five actual starts, same surface, same sprint/route category, within 0.5f and 365 days. Within-field midrank percentiles among source-validated rated runners. Missing pace stays neutral at 50, never zero; no unmatched fallback. Turn index E2-E1 uses one source race. Score is not a probability. Flags are review-only; field coverage controls scenario claims. Going, bias, post, trips, class and race shape are not modeled. Profiles and 75/25 blend are untrained hypotheses.'};
}
export function paceCandidateBatch(card,{capturedAt=new Date().toISOString()}={}){
 return {schema_version:1,model_id:PACE_CANDIDATE_ID,capturedAt,timing_status:'LOCAL_CAPTURE_NOT_INDEPENDENTLY_ANCHORED',forecast_pre_off_verified:false,source:{card_id:card.id,track:card.track,date:card.date,parser_version:card.parser_version},research_only:true,bettingEnabled:false,results:null,races:Object.values(card.races||{}).map(r=>({race:r.race,date:r.date,track:r.track,scheduled_post:r.post??null,final_field_verified:false,models:rankBrisnetModels(r),candidates:Object.fromEntries(PACE_VARIANTS.map(variant=>[variant,rankBrisnetPace(r,{variant})]))}))};
}
export function gradePaceCandidate(candidate,record){
 const hold=reason=>({status:'HOLD',reason,metrics:null});
 if(record?.race_key!==candidate.race_key)return hold('Official result race identity must match candidate');
 if(record?.official_order_verified!==true||record.final_field_verified!==true||record.forecast_pre_off_verified!==true)return hold('Verified pre-off forecast, final field and full official order required');
 if(record.dead_heat===true||record.nonfinishers===true)return hold('Dead heats and nonfinishers require separate ordinal grading rules');
 if(candidate.status!=='RESEARCH_RANKING'||candidate.unrated?.length)return hold('Complete source-verified candidate field required');
 try{const metrics=orderMetrics(candidate.rankings.map(h=>String(h.n)),record.actual_order?.map(String));if(candidate.rankings.length<4){metrics.first4set=null;metrics.ordered4=null;}return {status:'GRADED',model_id:candidate.model_id,group:candidate.context.group,metrics};}catch(e){return hold(e.message);}
}
