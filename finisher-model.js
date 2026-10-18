// Finisher v1: three fixed, auditable inputs. Research only; V4.4c is unchanged.
export const FINISHER_SPEC=Object.freeze({id:'FINISHER-3F-v1-20261018',weights:Object.freeze({recent_speed:.60,matched_speed:.25,late_pace:.15}),missing_percentile:50,recent_window:5,recent_weights:Object.freeze([.50,.25,.15,.07,.03]),history_days:365,distance_tolerance_furlongs:.5,matched_decay_half_life_days:90});
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function percentile(value,observed){if(!finite(value)||observed.length<2||new Set(observed).size===1)return 50;return 100*(observed.filter(x=>x<value).length+.5*(observed.filter(x=>x===value).length-1))/(observed.length-1);}
export function rankFinisherFeatures(entries){
 const before=JSON.stringify(entries),seen=new Set(),names=new Set();
 for(const h of entries){if(!h.n||!h.name||seen.has(String(h.n))||names.has(h.name))throw Error('Unique program numbers and horse names are required');seen.add(String(h.n));names.add(h.name);}
 const eligible=entries.filter(h=>!h.blocker&&finite(h.recent_speed)),unrated=entries.filter(h=>h.blocker||!finite(h.recent_speed)).map(h=>({n:String(h.n),name:h.name,reason:h.blocker||'Verified recent speed unavailable'}));
 const observed=Object.fromEntries(Object.keys(FINISHER_SPEC.weights).map(k=>[k,eligible.map(h=>h[k]).filter(finite)]));
 const rankings=eligible.map(h=>{const components=Object.fromEntries(Object.keys(FINISHER_SPEC.weights).map(k=>[k,{raw:finite(h[k])?h[k]:null,percentile:percentile(h[k],observed[k]),weight:FINISHER_SPEC.weights[k],status:finite(h[k])?'AVAILABLE':'UNKNOWN_NEUTRAL'}]));const contributions=Object.values(components).map(c=>c.percentile*c.weight);return {n:String(h.n),name:h.name,score:contributions.reduce((a,b)=>a+b,0),components,source:h.source||null};}).sort((a,b)=>b.score-a.score||(a.name<b.name?-1:a.name>b.name?1:0)).map((h,i)=>({...h,rank:i+1}));
 if(JSON.stringify(entries)!==before)throw Error('Input mutation');
 return {model_id:FINISHER_SPEC.id,status:!rankings.length?'HOLD':unrated.length?'PARTIAL_FIELD':'COMPLETE_FIELD',rankings,unrated,eligible_count:entries.length,probabilityCalibrated:false,bettingEnabled:false,research_only:true};
}
