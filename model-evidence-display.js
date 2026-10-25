// Read-only presentation of field coverage. Never changes ratings, eligibility or PASS.
import {contenderFeatures} from './contender-rankings.js';
import {MODEL} from './contender-model.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const active=h=>h.odds!=='SCR'&&h.included_in_frozen_field!==false&&(!h.entry_status||h.entry_status==='REGULAR');
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const key=h=>h.n!=null&&String(h.n)!==''?'#'+h.n:'name:'+h.name;
const reason=v=>typeof v==='string'?v:v?.reason||'Source evidence unavailable';
export function morningLineValue(value){
 const s=String(value??'').trim();if(/^(?:evens?|evs)$/i.test(s))return 1;
 const m=s.match(/^(\d+(?:\.\d+)?)\s*[\/-]\s*(\d+(?:\.\d+)?)$/);if(m)return +m[2]>0?+m[1]/+m[2]:null;
 return /^\d+(?:\.\d+)?$/.test(s)?+s:null;
}
function rankedRows(result){
 if(result.rankings?.length)return result.rankings;
 return (result.runners||[]).filter(h=>finite(h.base_rating)&&!h.unrated_reason&&!(h.parser_blockers||[]).length);
}
export function modelEvidence(race,result){
 const field=(race.horses||[]).filter(active),rankedKeys=new Set(rankedRows(result).map(key)),mls=field.map(h=>morningLineValue(h.ml)),known=mls.filter(v=>v!==null),best=known.length?Math.min(...known):null;
 const favorites=best===null?[]:field.filter((h,i)=>mls[i]===best),favoriteKeys=new Set(favorites.map(key));
 const details=[...(result.unrated||[]),...(result.runners||[]).filter(h=>h.unrated_reason||(h.parser_blockers||[]).length)];
 const unranked=field.filter(h=>!rankedKeys.has(key(h))).map(h=>{
  const d=details.find(x=>key(x)===key(h)),fts=(h.life_starts??h.lifeStarts)===0;
  const rs=fts?['First-time starter: no prior race speed or pace; ability unknown.']:[...(d?.reasons||[]),...(d?.reason?[d.reason]:[]),...(d?.unrated_reason?[d.unrated_reason]:[]),...(d?.parser_blockers||[])].map(reason);
  if(!rs.length)rs.push(result.reason||'No numerical ranking; required source evidence unavailable.');
  return {n:h.n,name:h.name,ml:h.ml,fts,reasons:[...new Set(rs)],favorite:favoriteKeys.has(key(h))};
 });
 const fts=field.filter(h=>(h.life_starts??h.lifeStarts)===0).length;
 return {field,ranked:field.length-unranked.length,total:field.length,fts,ftsPercent:field.length?100*fts/field.length:0,unranked,favoriteCount:favorites.length,completeMorningLine:known.length===field.length};
}
const labels={recent_speed:'Recent speed',matched_speed:'Matched surface/distance speed',late_pace:'Late pace',latest:'Latest Speed',best3:'Best-three Speed',jockey:'Jockey record',trainer:'Trainer record',recent:'Recent Speed',older:'Older Speed',early:'Matched early pace',surfaceDistance:'Matched surface/distance Speed'};
const contenderLabels=['Latest speed','Recent-five speed','Best-three speed','Surface speed average','Surface/distance speed average','90-day surface peak','Early pace','Late pace','Pressure/late fit','Surface win record','Distance win record','Placing record','Jockey record','Trainer record','Days since latest start','Workout count','Workout rank','Verified latest trip','Prior opposition'];
function optionalGaps(race,result,model,view){
 const ranked=new Set(view.field.filter(h=>!view.unranked.some(u=>key(u)===key(h))).map(key)),field=view.field.filter(h=>ranked.has(key(h)));
 return field.flatMap(h=>{
  const r=rankedRows(result).find(x=>key(x)===key(h));let missing=[];
  if(r?.components)missing=Object.entries(r.components).filter(([,v])=>v.status==='UNKNOWN_NEUTRAL').map(([k])=>labels[k]||k);
  else if(Array.isArray(r?.raw_features))missing=r.raw_features.flatMap((v,j)=>v===null?[contenderLabels[j]||MODEL.features[j]]:[]);
  else if(r?.raw_features)missing=Object.entries(r.raw_features).filter(([,v])=>v===null).map(([k])=>labels[k]||k);
  else if(model==='contender'){
   const e=contenderFeatures(h,{...race,field});missing=e.raw.flatMap((v,j)=>v===null?[contenderLabels[j]]:[]);
   if(e.slope===null)missing.push('Comparable form trend');
  }else if(model==='v44c'){
   const source=(result.runners||[]).find(x=>key(x)===key(h))||h;
   for(const [k,label]of [['jockey_win','Jockey record'],['trainer_win','Trainer record'],['timeform_early','Early pace'],['timeform_late','Late pace']])if(!finite(source[k]))missing.push(label);
  }
  return missing.length?[{n:h.n,name:h.name,missing}]:[];
 });
}
export function modelEvidenceHtml(race,result,{model='v44c'}={}){
 const v=modelEvidence(race,result),incomplete=v.unranked.length>0;
 const title=incomplete?`Incomplete field: ranked ${v.ranked}/${v.total} starters`:`Evidence coverage: ranked ${v.ranked}/${v.total} starters`;
 const warning=incomplete?'<div style="margin-top:5px"><b>Full-field PASS: provisional selections only.</b> Every starter needs a numerical ranking for a complete-field forecast. The FTS percentage is a separate check; being at or below 20% does not clear missing evidence. Unranked ability remains unknown.</div>':'';
 const list=v.unranked.map(h=>{
  const favorite=h.favorite?(v.completeMorningLine?(v.favoriteCount>1?'Joint morning-line favorite — UNRANKED':'Morning-line favorite — UNRANKED'):'Lowest available morning line — UNRANKED (ML incomplete)'):'';
  return `<li style="margin-top:7px"><b>#${esc(h.n||'—')} ${esc(h.name)}</b> · ML ${esc(h.ml||'unknown')}${favorite?`<div style="font-weight:700">${favorite}</div>`:''}<div>${h.reasons.map(esc).join('; ')}</div></li>`;
 }).join('');
 const gaps=optionalGaps(race,result,model,v),handling=model==='finisher'?'Missing optional inputs retain neutral percentiles and fixed weights.':model==='contender'?'Missing optional inputs contribute neutral zero under the existing model.':'Existing model handling is retained; missing components may be omitted and available components reweighted.';
 const optional=gaps.length?`<details class="tiny" style="margin-top:8px"><summary>Optional evidence gaps: ${gaps.length} ranked runner${gaps.length===1?'':'s'}</summary><p>${handling} These gaps are separate from unranked starters.</p><ul>${gaps.map(h=>`<li>#${esc(h.n)} ${esc(h.name)}: ${h.missing.map(esc).join(', ')}</li>`).join('')}</ul></details>`:'';
 const tag=incomplete?'details':'section';
 return `<${tag} class="model-evidence-note" aria-label="Model evidence coverage" style="border:1px solid ${incomplete?'#b66b12':'#56737b'};background:${incomplete?'#fff0d6':'#eef5f6'};color:#172d38;padding:10px;border-radius:8px;margin:8px 0 12px;overflow-wrap:anywhere">${incomplete?`<summary><b>${title}</b></summary>`:`<b>${title}</b>`}<div class="tiny">First-time starters: ${v.fts}/${v.total} (${v.ftsPercent.toFixed(1)}%).</div>${warning}${list?'<ul style="margin:6px 0 0;padding-left:18px">'+list+'</ul>':''}${optional}</${tag}>`;
}
