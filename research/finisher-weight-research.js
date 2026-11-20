// Research-only Finisher reweighting. Uses the SAME verified component extractor
// and field-percentile semantics as live Finisher. Never edits the live model.
import {finisherInputs} from '../finisher-inputs.js';
import {rankFinisherFeatures,FINISHER_SPEC} from '../finisher-model.js';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export const RESEARCH_WEIGHTS=Object.freeze({
 control:Object.freeze({recent_speed:.60,matched_speed:.25,late_pace:.15,trainer:0}),
 balanced:Object.freeze({recent_speed:.45,matched_speed:.20,late_pace:.30,trainer:.05}),
 pace:Object.freeze({recent_speed:.35,matched_speed:.20,late_pace:.35,trainer:.10}),
 moderate:Object.freeze({recent_speed:.50,matched_speed:.20,late_pace:.25,trainer:.05})
});
function percentile(value,observed){
 if(!finite(value)||observed.length<2||new Set(observed).size===1)return 50;
 return 100*(observed.filter(x=>x<value).length+.5*(observed.filter(x=>x===value).length-1))/(observed.length-1);
}
function trainerRate(h){
 // Only verified PRE-RACE records; missing or small samples stay neutral.
 const t=h.source_context?.trainer;
 for(const r of [t?.annual,t]){
  if(r?.status==='SOURCE_COUNTS_VERIFIED'&&Number.isInteger(r.starts)&&Number.isInteger(r.wins)&&r.starts>=25&&r.wins>=0&&r.wins<=r.starts)
   return 100*(r.wins+3)/(r.starts+20);
 }
 return null;
}
export function researchFinisherWeights(race){
 const extracted=finisherInputs(race);
 const live=rankFinisherFeatures(extracted.map((h,i)=>({...h,n:String(i+1)})));
 const horses=(race.horses||[]).filter(h=>h.odds!=='SCR'&&h.included_in_frozen_field!==false&&(!h.entry_status||h.entry_status==='REGULAR'));
 const entries=extracted.map((h,i)=>({...h,trainer:trainerRate(horses[i]),_id:String(i+1)}));
 const eligible=entries.filter(h=>!h.blocker&&finite(h.recent_speed));
 const keys=['recent_speed','matched_speed','late_pace','trainer'];
 const observed=Object.fromEntries(keys.map(k=>[k,eligible.map(h=>h[k]).filter(finite)]));
 const variants={};
 for(const [name,weights] of Object.entries(RESEARCH_WEIGHTS)){
  const rankings=eligible.map(h=>{
   const components=Object.fromEntries(keys.map(k=>[k,{raw:finite(h[k])?h[k]:null,percentile:percentile(h[k],observed[k]),status:finite(h[k])?'AVAILABLE':'UNKNOWN_NEUTRAL'}]));
   return {n:h.n,name:h.name,score:keys.reduce((sum,k)=>sum+weights[k]*components[k].percentile,0),components};
  }).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).map((h,i)=>({...h,rank:i+1}));
  variants[name]={rankings,unrated:entries.filter(h=>h.blocker||!finite(h.recent_speed)).map(h=>({n:h.n,name:h.name,reason:h.blocker||'Recent speed missing'})),complete_field:rankings.length===entries.length};
 }
 const expected=live.rankings.map(h=>h.name);
 const actual=variants.control.rankings.map(h=>h.name);
 if(JSON.stringify(expected)!==JSON.stringify(actual)||variants.control.rankings.some((h,i)=>Math.abs(h.score-live.rankings[i].score)>1e-8))
  throw Error('Control variant must reproduce live Finisher scores and order');
 return {research_only:true,model_id:FINISHER_SPEC.id,live_unchanged:true,eligible_count:entries.length,missing_components:eligible.flatMap(h=>keys.filter(k=>!finite(h[k])).map(k=>({n:h.n,component:k}))),variants};
}
