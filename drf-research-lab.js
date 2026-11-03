// DRF Research Lab v1. Pure research calculations; never imports or mutates production scoring.
export const CONTENDER_FEATURES = ['latest_beyer','weighted_recent_five','best_three','same_surface_average','same_surface_distance_average','same_surface_peak_90_days','early_pace','late_pace','pressure_late_fit','surface_win_record','distance_win_record','placing_record','career_record','jockey','trainer','workout_count','workout_rank','layoff','trip'];
export const VARIANTS = [
 ['baseline',[]],['surface-neutral',[9]],['workout-neutral',[16]],['early-neutral',[6]],
 ['surface+workout',[9,16]],['surface+early',[9,6]],['workout+early',[16,6]],['all-three',[9,16,6]]
];
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const center=(v,a)=>!finite(v)||a.length<2||new Set(a).size<2?0:2*(a.filter(x=>x<v).length+.5*(a.filter(x=>x===v).length-1))/(a.length-1)-1;
const pct=(v,a)=>!finite(v)||a.length<2||new Set(a).size<2?50:100*(a.filter(x=>x<v).length+.5*(a.filter(x=>x===v).length-1))/(a.length-1);
const rank=rows=>rows.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
function checkRace(r){if(!r||!Array.isArray(r.runners)||r.runners.length<2)throw Error('Each race needs at least two runners');const ids=r.runners.map(h=>String(h.program));if(new Set(ids).size!==ids.length)throw Error('Duplicate program number in '+r.id);if(!r.id||!r.runners.every(h=>h.name&&h.program!==undefined))throw Error('Race ID, program, and horse name required');}
export function runLab(dataset,{late=1}={}){
 if(!Array.isArray(dataset?.races)||!dataset.races.length)throw Error('Upload a JSON object with races[]');
 if(!finite(late)||late<0||late>2)throw Error('Late multiplier must be between 0 and 2');
 const output=[];
 for(const race of dataset.races){
  checkRace(race);
  const actual=(race.actual||[]).map(String);
  const hasResults=actual.length>=2&&new Set(actual).size===actual.length&&actual.every(n=>race.runners.some(h=>String(h.program)===n));
  const contenders=race.runners.filter(h=>Array.isArray(h.contender?.raw)&&h.contender.raw.length===19&&finite(h.contender.trend_adjustment));
  const finishers=race.runners.filter(h=>h.finisher&&!h.finisher.blocker&&finite(h.finisher.recent_speed));
  const weights=race.contender_coefficients;
  if(!Array.isArray(weights)||weights.length!==19||!weights.every(finite))throw Error('19 original Contender coefficients required for '+race.id);
  if(contenders.length!==race.runners.length)throw Error('Incomplete Contender inputs in '+race.id);
  const observed=Array.from({length:19},(_,j)=>contenders.map(h=>h.contender.raw[j]).filter(finite));
  const baseline=rank(contenders.map(h=>({program:String(h.program),name:h.name,score:h.contender.raw.reduce((s,v,j)=>s+center(v,observed[j])*weights[j],h.contender.trend_adjustment)})));
  if(race.contender_baseline){for(const h of baseline){const expected=race.contender_baseline.find(x=>String(x.program)===h.program);if(!expected||!finite(expected.score)||Math.abs(expected.score-h.score)>1e-8)throw Error('Contender baseline parity failed: '+race.id+' #'+h.program);}}
  const scenarios=[];
  for(const [name,neutral] of VARIANTS){
   const picks=rank(contenders.map(h=>({program:String(h.program),name:h.name,score:h.contender.raw.reduce((s,v,j)=>s+(neutral.includes(j)?0:center(v,observed[j])*weights[j]*(j===7?late:1)),h.contender.trend_adjustment)})));
   scenarios.push({model:'DRF Contender',variant:name+(late!==1?' / Late x'+late:''),picks});
  }
  if(finishers.length===race.runners.length){
   const observedFin=['recent_speed','matched_speed','late_pace'].map(k=>finishers.map(h=>h.finisher[k]).filter(finite));
   for(const mult of [1,0,1.25,1.5]){
    const picks=rank(finishers.map(h=>({program:String(h.program),name:h.name,score:.60*pct(h.finisher.recent_speed,observedFin[0])+.25*pct(h.finisher.matched_speed,observedFin[1])+.15*mult*pct(h.finisher.late_pace,observedFin[2])+(mult===0?7.5:0)})));
    scenarios.push({model:'DRF Finisher',variant:mult===1?'baseline':mult===0?'Late neutral':'Late x'+mult,picks});
   }
  }
  for(const s of scenarios){
   const top=s.picks.slice(0,4).map(h=>h.program);
   output.push({race:race.id,model:s.model,variant:s.variant,top,actual:hasResults?actual:[],hasResults,first:hasResults?Number(top[0]===actual[0]):null,second:hasResults?Number(top[1]===actual[1]):null,exacta:hasResults?Number(top[0]===actual[0]&&top[1]===actual[1]):null,runnerUpCovered:hasResults?Number(top.includes(actual[1])):null,coverage:hasResults?actual.slice(0,4).filter(n=>top.includes(n)).length:null});
  }
 }
 return output;
}
export function summarize(rows){const groups=new Map();for(const r of rows){const key=r.model+'|'+r.variant;const g=groups.get(key)||{model:r.model,variant:r.variant,races:0,graded:0,first:0,second:0,exacta:0,runnerUpCovered:0,coverage:0};g.races++;if(r.hasResults){g.graded++;for(const k of ['first','second','exacta','runnerUpCovered','coverage'])g[k]+=r[k];}groups.set(key,g)}return [...groups.values()];}
