// Independent research layer. Parent engines, scores and betting gates are immutable.
import {mix1Distance,MIX1_ID} from './mix1-rankings.js';
import {RELEASE_ID} from './rankings-release.js';
import {MODEL} from './contender-model.js';
import {BRISNET_MODEL_IDS,isBrisnetRace} from './brisnet-models.js';
export const SELECTOR_VERSION='RACE-SELECTOR-v1';
export const MODEL_KEYS=Object.freeze(['v44c','contender','mix1']);
export const EQUAL_WEIGHTS=Object.freeze({v44c:1/3,contender:1/3,mix1:1/3});
export const WEIGHT_CANDIDATES=Object.freeze([EQUAL_WEIGHTS,...MODEL_KEYS.map(k=>Object.freeze(Object.fromEntries(MODEL_KEYS.map(m=>[m,m===k?.5:.25]))))]);
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const active=h=>h.odds!=='SCR'&&h.included_in_frozen_field!==false&&(!h.entry_status||h.entry_status==='REGULAR');
const dateOK=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
function expectedIds(family){return family==='BRISNET'?BRISNET_MODEL_IDS:family==='DRF_TIMEFORM'?{v44c:RELEASE_ID,contender:MODEL.model_id,mix1:MIX1_ID}:null;}
function weightsOK(w){return w&&Object.keys(w).length===3&&MODEL_KEYS.every(k=>finite(w[k])&&w[k]>=0)&&Math.abs(MODEL_KEYS.reduce((s,k)=>s+w[k],0)-1)<1e-9;}
export function classifyRace(race){
 const raw=race.conditions?.surface||race.surface,surface=({Dirt:'Dirt',Turf:'Turf',Synth:'Synthetic',Synthetic:'Synthetic'})[raw];
 const furlongs=finite(race.distance_furlongs)?race.distance_furlongs:mix1Distance(race);
 if(race.conditions?.unsupported||/hurdle|steeplechase/i.test([race.header,race.cls,raw].join(' ')))return {status:'HOLD',reason:'Unsupported race type'};
 if(!surface||!finite(furlongs)||furlongs<=0)return {status:'HOLD',reason:'Verified surface and distance required'};
 const category=furlongs>=8?'route':'sprint',field=(race.horses||[]).filter(active);
 return {status:'CLASSIFIED',surface,furlongs,category,group:surface+' '+category,provider_family:isBrisnetRace(race)?'BRISNET':'DRF_TIMEFORM',field_size:field.length,maiden:/\b(?:Mdn|Maiden|Moc)\b/i.test(race.cls||race.header||''),going:race.going??race.track_condition??null,going_used_for_weights:false};
}
// Rank-percentile blend: no raw score or uncalibrated probability averaging.
export function combineOrders(orders,weights=EQUAL_WEIGHTS){
 if(!weightsOK(weights))throw Error('Three nonnegative weights summing to one required');
 const keys=MODEL_KEYS,reference=orders.v44c;if(!Array.isArray(reference)||reference.length<2)throw Error('At least two complete runners required');
 const programs=reference.map(h=>String(h.n)),names=new Map(reference.map(h=>[String(h.n),h.name]));
 if(new Set(programs).size!==programs.length||new Set(reference.map(h=>h.name)).size!==reference.length)throw Error('Unique runner identities required');
 const positions={};for(const key of keys){const rows=orders[key];if(!Array.isArray(rows)||rows.length!==programs.length||new Set(rows.map(h=>String(h.n))).size!==rows.length||rows.some(h=>!programs.includes(String(h.n))||names.get(String(h.n))!==h.name))throw Error('All models must rank the same complete field');positions[key]=new Map(rows.map((h,i)=>[String(h.n),i+1]));}
 const n=programs.length;
 return reference.map(h=>{const parent_ranks=Object.fromEntries(keys.map(k=>[k,positions[k].get(String(h.n))]));const score=keys.reduce((sum,k)=>sum+weights[k]*100*(n-parent_ranks[k])/(n-1),0);return {n:String(h.n),name:h.name,score,parent_ranks};}).sort((a,b)=>Math.abs(b.score-a.score)>1e-9?b.score-a.score:a.parent_ranks.v44c-b.parent_ranks.v44c).map((h,i)=>({...h,rank:i+1}));
}
export function rankRaceSelector(race,models,{policy=null}={}){
 const context=classifyRace(race),meta={version:SELECTOR_VERSION,research_only:true,provisional:true,decision:'PASS',bettingEnabled:false,probabilityCalibrated:false,probabilities:null,context};
 const hold=reason=>({...meta,model_id:SELECTOR_VERSION+'-HOLD',status:'HOLD',reason,rankings:[],weights:null});
 if(context.status!=='CLASSIFIED')return hold(context.reason);
 const allowedBlocker=context.provider_family==='BRISNET'?'BRISNET_SOURCE_MODEL_VALIDATION_PENDING':null;
 if((race.parser_blockers||[]).some(b=>(typeof b==='string'?b:b.reason)!==allowedBlocker))return hold('Source verification blocker retained');
 const field=(race.horses||[]).filter(active);if(field.length<2)return hold('At least two eligible runners required');
 if(new Set(field.map(h=>String(h.n))).size!==field.length||field.some(h=>h.n==null||!h.name))return hold('Unique source runner identities required');
 const expected=expectedIds(context.provider_family);
 for(const k of MODEL_KEYS){const m=models?.[k];if(!m||m.model_id!==expected[k])return hold('Matching parent model versions and provider family required');
  const eligible=m.decision==='RATEABLE'||context.provider_family==='BRISNET'&&m.decision==='PASS'&&m.research_only===true&&m.ranking_status==='RESEARCH_RANKING';
  if(!eligible||m.unrated?.length||!Array.isArray(m.rankings)||m.rankings.length!==field.length)return hold('All three models need complete-field rankings; parent PASS/HOLD or unrated runners retained');
  if(m.rankings.some(h=>!field.some(f=>String(f.n)===String(h.n)&&f.name===h.name)))return hold('Parent forecasts must match current eligible runner identities');
 }
 let weights=EQUAL_WEIGHTS,policy_id='EQUAL-THIRDS-v1';
 if(policy){
  if(policy.status!=='RESEARCH_ONLY_NOT_VALIDATED'||policy.provider_family!==context.provider_family||policy.group!==context.group||!MODEL_KEYS.every(k=>policy.parent_ids?.[k]===expected[k])||!dateOK(policy.trained_through)||!dateOK(race.date)||policy.trained_through>=race.date||!weightsOK(policy.weights)||!policy.policy_id)return hold('Condition policy must be versioned, provider-matched and trained before this card date');
  weights=policy.weights;policy_id=policy.policy_id;
 }
 try{const rankings=combineOrders(Object.fromEntries(MODEL_KEYS.map(k=>[k,models[k].rankings])),weights);return {...meta,model_id:SELECTOR_VERSION+':'+policy_id+':'+context.provider_family+':'+context.group,status:'RESEARCH_RANKED',reason:policy?'Condition weights are experimental and need forward validation.':'Equal weights: condition-specific advantage has not been established.',rankings,weights:{...weights},policy_id,parent_ids:Object.fromEntries(MODEL_KEYS.map(k=>[k,models[k].model_id])),ranking_method:'Weighted within-field rank percentiles; score ties retain V4.4c order; score is not a probability.'};}catch(e){return hold(e.message);}
}
export function orderMetrics(predicted,actual){
 if(!Array.isArray(actual)||!Array.isArray(predicted)||actual.length<2||predicted.length!==actual.length||new Set(actual).size!==actual.length||new Set(predicted).size!==predicted.length||actual.some(n=>!predicted.includes(n)))throw Error('Complete matching official order required for full-field rank error');
 return {rank_mae:predicted.reduce((sum,n,i)=>sum+Math.abs(i-actual.indexOf(n)),0)/actual.length,top1:predicted[0]===actual[0],ordered2:predicted.slice(0,2).join('|')===actual.slice(0,2).join('|'),first4set:actual.length>=4&&predicted.slice(0,4).every(n=>actual.slice(0,4).includes(n)),ordered4:actual.length>=4&&predicted.slice(0,4).join('|')===actual.slice(0,4).join('|'),winner_in_four:predicted.slice(0,4).includes(actual[0])};
}
// Research fitting only: no policy produced by this function is installed on Race Day.
// Fixed four-policy grid, equal weighting preferred on ties. No after-cutoff records.
export function fitConditionPolicy(records,{provider_family,group,beforeDate,minRaces=30,minDates=5}={}){
 if(!dateOK(beforeDate))throw Error('Valid forward test date required');
 const parent_ids=expectedIds(provider_family);if(!parent_ids)throw Error('Known provider family required');
 const seen=new Set(),accepted=[],excluded=[];
 for(const r of records){let reason=null;
  if(!r.id||seen.has(r.id))reason='Missing or duplicate race identity';else seen.add(r.id);
  if(!dateOK(r.date)||r.date>=beforeDate)reason='Not strictly before forward-test date';
  else if(r.provider_family!==provider_family||r.group!==group)reason='Different provider or race type';
  else if(!MODEL_KEYS.every(k=>r.parent_ids?.[k]===parent_ids[k]))reason='Different or unverified parent model versions';
  else if(r.forecast_pre_off_verified!==true||r.final_field_verified!==true||r.official_order_verified!==true)reason='Verified pre-off forecasts, final field and full official order required';
  if(!reason)try{const blended=combineOrders(r.orders);orderMetrics(blended.map(h=>h.n),r.actual_order);}catch(e){reason=e.message;}
  if(reason)excluded.push({id:r.id,reason});else accepted.push(r);
 }
 const dates=[...new Set(accepted.map(r=>r.date))].sort();
 if(accepted.length<minRaces||dates.length<minDates)return {status:'HOLD',reason:'Insufficient certified condition-specific training races/dates',accepted:accepted.length,dates:dates.length,minimum_races:minRaces,minimum_dates:minDates,excluded,weights:{...EQUAL_WEIGHTS}};
 const trials=WEIGHT_CANDIDATES.map((weights,index)=>({index,weights:{...weights},mean_rank_mae:accepted.reduce((sum,r)=>sum+orderMetrics(combineOrders(r.orders,weights).map(h=>h.n),r.actual_order).rank_mae,0)/accepted.length})).sort((a,b)=>a.mean_rank_mae-b.mean_rank_mae||a.index-b.index),best=trials[0];
 return {status:'RESEARCH_ONLY_NOT_VALIDATED',policy_id:SELECTOR_VERSION+'-FIT:'+provider_family+':'+group+':'+beforeDate,provider_family,group,parent_ids:{...parent_ids},trained_through:dates.at(-1),training_race_ids:accepted.map(r=>r.id),training_dates:dates,weights:best.weights,training_mean_rank_mae:best.mean_rank_mae,trials,excluded,objective:'race-average full-field absolute rank error',production_approved:false,probabilityCalibrated:false,bettingEnabled:false};
}
