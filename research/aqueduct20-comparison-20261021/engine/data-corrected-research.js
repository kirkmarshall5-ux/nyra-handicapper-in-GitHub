import {adjustment, pythonRound} from './scoring-engine.js';
export const MODEL_ID='V44C-data-corrected-research-v1';
// Research only: no probability or live betting approval is implied.
const missing=v=>v==null||(typeof v==='string'&&!v.trim());
const number=v=>typeof v==='number'&&Number.isFinite(v);
export function validatedInputs(h,{keepZero=true,removeCap=true}={}){
 const x={...h},issues=[],warnings=[],parts=[];
 if(missing(x.life_starts))return {horse:x,base:null,reason:'career-starts-unverified',issues,warnings};
 if(!Number.isInteger(x.life_starts)||x.life_starts<0)return {horse:x,base:null,reason:'invalid-career-starts',issues,warnings};
 if(x.life_starts===0)return {horse:x,base:null,reason:'FTS-unrated',issues,warnings};
 const figs=x.beyer_figures;
 if(!Array.isArray(figs)||!figs.length)return {horse:x,base:null,reason:'no-beyer-evidence',issues,warnings};
 if(figs.some(v=>!number(v)||v<0))return {horse:x,base:null,reason:'invalid-beyer-evidence',issues,warnings};
 for(const f of figs.filter(v=>v>120)){
  const proof=(x.beyer_evidence||[]).some(p=>p.figure===f&&p.source_line&&p.running_date_track&&/Bold/i.test(p.font||'')&&Number.isInteger(p.post)&&p.post>=1&&p.post<=p.field_size);
  const manual=x.beyer_range_review?.status==='SOURCE_VERIFIED'&&x.beyer_range_review?.source&&x.beyer_range_review.figures?.includes(f);
  // 130 is a review trigger, not a claim about the supplier's maximum.
  if(!manual&&(!proof||f>=130))return {horse:x,base:null,reason:'beyer-source-range-review-required',issues,warnings};
  warnings.push({field:'beyer_figures',value:f,reason:'above-legacy-range-source-verified'});
 }
 for(const [k,w] of [['jockey_win',7],['trainer_win',8],['trainer_context_score',12]]){
  if(missing(x[k])){x[k]=null;continue}
  if(!number(x[k])||x[k]<0||x[k]>100){issues.push({field:k,reason:'invalid-measured-percentage-or-score'});continue}
  const prefix=k.replace('_win',''),counts=x[`${prefix}_local_counts`]||(x.source_context?.[prefix]?.status==='SOURCE_COUNTS_VERIFIED'?x.source_context[prefix]:null);
  if(k.endsWith('_win')&&counts){
   const {starts,wins}=counts;
   if(!Number.isInteger(starts)||!Number.isInteger(wins)||starts<0||wins<0||wins>starts){issues.push({field:k,reason:'invalid-source-counts'});continue}
   if(starts===0){x[k]=null;warnings.push({field:k,reason:'zero-starts-rate-unavailable'});continue}
   if(Math.abs(x[k]-100*wins/starts)>1e-8){issues.push({field:k,reason:'rate-counts-disagree'});continue}
  }
  if(k!=='trainer_context_score'||x.life_starts<=2)parts.push([k==='trainer_context_score'?x[k]:Math.min(100,x[k]*3),w,k]);
 }
 for(const k of ['timeform_early','timeform_late']){if(missing(x[k]))x[k]=null;else if(!number(x[k])||x[k]<0)issues.push({field:k,reason:'invalid-pace-input'})}
 if(issues.length)return {horse:x,base:null,reason:'invalid-optional-rating-input',issues,warnings};
 const cap=v=>removeCap?v:Math.min(110,v);
 for(const [v,w,k] of [[cap(figs[0]),40,'latest'],[cap(Math.max(...figs.slice(0,3))),22,'best3']])if(keepZero||v>0)parts.push([v,w,k]);
 const order={latest:0,best3:1,jockey_win:2,trainer_win:3,trainer_context_score:4};parts.sort((a,b)=>order[a[2]]-order[b[2]]);
 const weight=parts.reduce((s,[,w])=>s+w,0);
 return {horse:x,base:weight?parts.reduce((s,[v,w])=>s+v*w,0)/weight:null,reason:weight?null:'no-measured-rating-evidence',parts,issues,warnings};
}
export function rateResearchRace(field,{raceBlockers=[],keepZero=true,removeCap=true}={}){
 const blockers=[...raceBlockers],runners=field.map(h=>{const v=validatedInputs(h,{keepZero,removeCap});const x={...v.horse,base_rating:v.base,unrated_reason:v.reason,input_issues:v.issues,input_warnings:v.warnings};if(v.reason)blockers.push({horse:h.name,reason:v.reason,issues:v.issues});for(const reason of h.parser_blockers||[])blockers.push({horse:h.name,reason});return x});
 if(!runners.length)blockers.push({reason:'no-unconditional-entrants'});
 if(blockers.length)return {model_id:MODEL_ID,research_only:true,decision:'PASS',pass_reasons:blockers,rankings:[],runners};
 for(const h of runners){const a=adjustment(h,runners);h.v44c_adjustment=a.value;h.v44c_signals=a.signals;h.v44c_unrounded_score=h.base_rating+a.value;h.v44c_display_score=pythonRound(h.v44c_unrounded_score)}
 const rankings=[...runners].sort((a,b)=>b.v44c_unrounded_score-a.v44c_unrounded_score||(a.name<b.name?-1:a.name>b.name?1:0));rankings.forEach((h,i)=>h.v44c_rank=i+1);
 return {model_id:MODEL_ID,research_only:true,decision:'RATEABLE',pass_reasons:[],rankings,runners};
}
