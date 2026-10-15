import {releaseRace} from './rankings-release.js';
import {adjustment} from './scoring-engine.js';
import {validatedInputs} from './data-corrected-research.js';

// Retained MIX1 specification, not the later recent-three or form-cycle variants.
export const MIX1_ID='MIX1-Timeform-recent2-older3to5-v1';
export const MIX1_WEIGHTS=Object.freeze({recent:37,older:12,jockey:7,trainer:17,early:17,surfaceDistance:10});
const MONTHS={'â':1,'á':2,'à':3,'ß':4,'Ü':5,'Þ':6,'Û':7,'Ý':8,'æ':9,'å':10,'ä':11,'ã':12};
const FR={'Â':1/16,'±':1/8,'²':1/4,'°':1/8,'ô':1/2,'¶':3/16,'ó':5/16,'´':3/8,'ö':3/4,'ø':7/8,'©¥':40/1760,'¬¥':70/1760};
const norm=s=>String(s||'').toLowerCase().replace(/\([^)]*\)/g,'').replace(/[^a-z0-9]/g,'');
const finite=v=>typeof v==='number'&&Number.isFinite(v);
export function mix1Distance(race){
 if(race.conditions?.unsupported)return null;
 const line=race.conditions?.primaryDistanceLine||'';
 const m=line.match(/^\s*(\d+)([Â±²°ô¶ó´öø])?\s+(MILES?|Furlongs?)\b/i);
 return m?(+m[1]+(FR[m[2]]||0))*(/^mile/i.test(m[3])?8:1):null;
}
export function mix1Profile(proof,today){
 const dm=String(proof.running_date_track||'').match(/^(\d{1,2})(.)(\d{2})=/);
 if(!dm||!MONTHS[dm[2]]||!finite(proof.figure)||proof.figure<0)return null;
 const date=new Date(Date.UTC(2000+ +dm[3],MONTHS[dm[2]]-1,+dm[1]));
 if(date.getUTCDate()!==+dm[1]||date.getUTCMonth()+1!==MONTHS[dm[2]])return null;
 const age=(Date.parse(today)-date)/86400000;if(!(age>0&&age<=365))return null;
 const m=String(proof.source_line||'').match(/=\s*\d+\s*[A-Za-z.]+?\s*(?:fst|fm|gd|sly|my|yl|sf|hy|wf)ø?\s+(\d+)([Â±²°ô¶ó´öø]|©¥|¬¥)?(f)?\s*([êÑúü]?)(?=\s|$)/);
 return {date:date.toISOString().slice(0,10),figure:proof.figure,distance:m?(+m[1]+(FR[m[2]]||0))*(m[3]?1:8):null,surface:m?(/[êÑ]/.test(m[4])?'Turf':/[úü]/.test(m[4])?'Synth':'Dirt'):null};
}
function percentile(value,observed){
 if(value==null)return null;if(observed.length<=1)return 50;
 return 100*(observed.filter(v=>v<value).length+.5*(observed.filter(v=>v===value).length-1))/(observed.length-1);
}
function historyVerified(h){
 const proofs=(h.contender_evidence?.beyer_evidence||h.beyer_evidence||[]).slice(0,5),figs=h.beyer_figures?.slice(0,5)||[];
 return proofs.length>0&&proofs.length===figs.length&&proofs.every((p,i)=>finite(p.figure)&&p.figure===figs[i]);
}
export function rankMix1(race,baseline=releaseRace(race),{displayPass=false}={}){
 const meta={model_id:MIX1_ID,research_only:true,probabilityCalibrated:false,bettingEnabled:false};
 const hold=(decision,reason)=>({...meta,decision,reason,rankings:[]});
 // Display-only subset: preserve PASS and never feed provisional scores to a win line.
 if(baseline.decision==='PASS'&&displayPass){
  const all=baseline.runners||[],unrated=[];
  const field=all.filter(h=>{
   const reasons=[...(h.unrated_reason?[h.unrated_reason]:[]),...(h.parser_blockers||[]).map(x=>typeof x==='string'?x:x.reason||'Source verification pending')];
   if(!finite(h.base_rating)&&!reasons.length)reasons.push('Insufficient verified rating evidence');
   if(!reasons.length&&validatedInputs(h).reason)reasons.push('Verified model inputs required');
   if(!reasons.length&&!historyVerified(h))reasons.push('Re-upload DRF PPs to verify MIX1 Beyer history');
   if(reasons.length){unrated.push({n:h.n,name:h.name,reasons});return false}return true;
  }).map(h=>({...h,v44c_signals:adjustment(h,all).signals}));
  const result=field.length?rankMix1(race,{decision:'RATEABLE',runners:field,rankings:field}):hold('PASS','No horses have enough verified evidence for a numerical MIX1 rating.');
  return {...result,decision:'PASS',provisional:true,unrated,pass_reasons:baseline.pass_reasons||[],reason:result.reason||'Provisional ranking of rated runners only; unrated horses may be competitive.'};
 }
 if(baseline.decision!=='RATEABLE')return hold(baseline.decision||'PASS','Original V4.4c race eligibility applies.');
 const field=baseline.runners||[],rows=baseline.rankings||[];
 if(!field.length||field.length!==rows.length)return hold('HOLD','Complete original rated field required.');
 const seen=new Set();const distance=mix1Distance(race),surface=race.surface;
 const features=[];
 for(const h of field){
  const key=norm(h.name);if(!key||seen.has(key))return hold('HOLD','Unique source runner identities required.');seen.add(key);
  const input=validatedInputs(h);if(input.reason)return hold('HOLD','Verified model inputs required.');
  const proofs=(h.contender_evidence?.beyer_evidence||h.beyer_evidence||[]).slice(0,5);
  if(!historyVerified(h))return hold('HOLD','Re-upload DRF PPs to verify MIX1 Beyer history.');
  const figures=proofs.map(p=>p.figure),parts=Object.fromEntries(input.parts.map(([v,w,k])=>[k,v]));
  const matched=proofs.map(p=>mix1Profile(p,race.date)).filter(p=>p&&p.surface===surface&&distance!=null&&p.distance!=null&&Math.abs(p.distance-distance)<=.5).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
  const signals=h.v44c_signals||[];
  const nonpace=Math.max(-6,Math.min(6,signals.filter(([label])=>label!=='pace-fit').reduce((s,[label,v])=>s+v,0)));
  features.push({h,key,raw:{recent:figures.slice(0,2).reduce((s,v)=>s+v,0)/Math.min(2,figures.length),older:figures.length>=3?Math.max(...figures.slice(2,5)):null,jockey:parts.jockey_win??null,trainer:parts.trainer_win??null,early:h.timeform_early??null,surfaceDistance:matched.length>=2?matched.reduce((s,p)=>s+p.figure,0)/matched.length:null},nonpace,multiplier:1+.15*nonpace/6});
 }
 const observed=Object.fromEntries(Object.keys(MIX1_WEIGHTS).map(k=>[k,features.map(f=>f.raw[k]).filter(v=>v!=null)]));
 const rankings=features.map(f=>{
  const scaled=Object.fromEntries(Object.keys(MIX1_WEIGHTS).map(k=>[k,percentile(f.raw[k],observed[k])]).filter(([k,v])=>v!=null));
  const weight=Object.keys(scaled).reduce((s,k)=>s+MIX1_WEIGHTS[k],0),base=Object.entries(scaled).reduce((s,[k,v])=>s+v*MIX1_WEIGHTS[k],0)/weight;
  return {n:f.h.n,name:f.h.name,score:base*f.multiplier,base_score:base,raw_features:f.raw,component_scores:scaled,available_weight:weight,effective_weights:Object.fromEntries(Object.keys(scaled).map(k=>[k,MIX1_WEIGHTS[k]/weight])),nonpace_adjustment:f.nonpace,multiplier:f.multiplier};
 }).sort((a,b)=>b.score-a.score||(norm(a.name)<norm(b.name)?-1:norm(a.name)>norm(b.name)?1:0));
 return {...meta,decision:'RATEABLE',rankings,complete_inputs:rankings.filter(h=>h.available_weight===100).length,eligible_count:rankings.length};
}
