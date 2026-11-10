import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import crypto from 'node:crypto';
import {releaseRace} from './engine/rankings-release.js';
import {rankContenders,contenderFeatures} from './engine/contender-rankings.js';
import {MODEL} from './engine/contender-model.js';
const root=path.dirname(new URL(import.meta.url).pathname),mode=process.argv[2]||'source';
const fieldPath=path.join(root,'verified-fields.json');
const fields=mode==='final'?JSON.parse(fs.existsSync(fieldPath)?fs.readFileSync(fieldPath):zlib.gunzipSync(fs.readFileSync(fieldPath+'.gz'))):null;
const pct=(v,a)=>v===null||a.length<=1||new Set(a).size===1?0:2*(a.filter(x=>x<v).length+.5*(a.filter(x=>x===v).length-1))/(a.length-1)-1;
const clean=s=>String(s).replace(/\s/g,''),date=s=>{const months='âáàßÜÞÛÝæåäã',m=s.match(/^(\d{1,2})(.)(\d{2})=/);if(!m||!months.includes(m[2]))return null;const d=new Date(Date.UTC(2000+ +m[3],months.indexOf(m[2]),+m[1]));return d.getUTCDate()===+m[1]?d.toISOString().slice(0,10):null;};
function last3(h,today){
 const lines=h.contender_evidence?.switch_evidence?.running_lines||[],proof=h.contender_evidence?.beyer_evidence||[];
 if(!Number.isInteger(h.life_starts)||h.life_starts<3)return {eligible:false,reason:'FEWER_THAN_THREE_PRIOR_RACES',life_starts:h.life_starts};
 if(lines.length<3)return {eligible:false,reason:'FEWER_THAN_THREE_PRINTED_PRIOR_ROWS',life_starts:h.life_starts};
 const selected=lines.slice(0,3),dates=selected.map(l=>date(l.running_date_track));
 if(dates.some(d=>!d||d>=today)||dates.some((d,i)=>i&&d>dates[i-1])||new Set(dates).size<3)return {eligible:false,reason:'RECENT_THREE_DATE_ALIGNMENT_UNRESOLVED',life_starts:h.life_starts};
 const selectedProof=selected.map(l=>proof.filter(p=>clean(p.running_date_track)===clean(l.running_date_track)));
 if(selectedProof.some(a=>a.length!==1||!Number.isFinite(a[0].figure)||a[0].figure<0))return {eligible:false,reason:'MISSING_CERTIFIED_BEYER_IN_EXACT_RECENT_THREE',life_starts:h.life_starts,dates};
 const figs=selectedProof.map(a=>a[0].figure);
 return {eligible:true,life_starts:h.life_starts,dates,beyers:figs,average:figs.reduce((a,b)=>a+b,0)/3,proof:selectedProof.map(a=>a[0]),pace3_available:false,combined_status:'UNAVAILABLE_NO_INDIVIDUAL_LAST_THREE_PACE_FIGURES'};
}
const pgm=(a,b)=>parseInt(a.n)-parseInt(b.n)||a.n.localeCompare(b.n);
const ml=s=>{const m=String(s).match(/^(\d+(?:\.\d+)?)[/-](\d+(?:\.\d+)?)$/);return m&&+m[2]>0?+m[1]/+m[2]:null;};
const races=[];
for(const file of fs.readdirSync(path.join(root,'parsed')).filter(x=>x.endsWith('.json')).sort()){
 const card=JSON.parse(fs.readFileSync(path.join(root,'parsed',file)));
 for(const r0 of Object.values(card.races)){
  const key='AQU_'+card.date+'_R'+r0.race;
  if(fields&&!fields[key]){races.push({key,date:card.date,status:'NOT_VERIFIED_FINAL_FIELD'});continue;}
  const wanted=fields?new Set(fields[key].programs):null;
  const r={...r0,horses:r0.horses.filter(h=>!wanted||wanted.has(h.n))};
  if(wanted&&(r.horses.length!==wanted.size||r.horses.some(h=>!wanted.has(h.n))))throw Error('Verified field mismatch '+key);
  const base=releaseRace(r),cont=rankContenders(r,base,{displayPass:base.decision==='PASS'});
  const ranked=new Set(cont.rankings.map(x=>x.n)),field=r.horses.filter(h=>ranked.has(h.n)),es=field.map(h=>contenderFeatures(h,{...r,field}));
  const observed=MODEL.features.map((_,j)=>es.map(e=>e.raw[j]).filter(v=>v!==null)),slopes=es.map(e=>e.slope).filter(v=>v!==null);
  const featureEntries=field.map((h,i)=>{const e=es[i],contributions=e.raw.map((v,j)=>pct(v,observed[j])*MODEL.contender.coefficients[j]),trend=.1*pct(e.slope,slopes);return {n:h.n,name:h.name,raw:e.raw,contributions,trend,score:contributions.reduce((a,b)=>a+b,0)+trend,no_context_score:contributions.filter((_,j)=>j!==8).reduce((a,b)=>a+b,0)+trend};});
  const order=key=>[...featureEntries].sort((a,b)=>b[key]-a[key]||(a.name<b.name?-1:a.name>b.name?1:0)).map(e=>e.n);
  if(JSON.stringify(order('score'))!==JSON.stringify(cont.rankings.map(e=>e.n)))throw Error('Current Contender parity failure '+key);
  const histories=r.horses.map(h=>({n:h.n,name:h.name,...last3(h,card.date)})),b3=histories.filter(h=>h.eligible).sort((a,b)=>b.average-a.average||pgm(a,b)),mls=r.horses.map(h=>({n:h.n,name:h.name,ml:h.ml,value:ml(h.ml)})),validML=mls.every(h=>h.value!==null),mlorder=[...mls].sort((a,b)=>a.value-b.value||pgm(a,b));
  const originalField=r.horses.filter(h=>(!h.entry_status||h.entry_status==='REGULAR')&&h.odds!=='SCR');
  const orders={CURRENT_CONTENDER:order('score'),NO_CONTEXT:order('no_context_score'),MORNING_LINE:validML?mlorder.map(e=>e.n):[],LAST3_BEYER_DIAGNOSTIC:b3.map(e=>e.n),LAST3_PACE_BEYER_EQUAL:[]};
  races.push({key,date:card.date,race:r.race,source_sha256:card.source_sha256,field_size:r.horses.length,source_programs:r.horses.map(h=>h.n),source_names:r.horses.map(h=>({n:h.n,name:h.name})),surface:r.conditions?.surface||r.surface,distance_text:r.dist,source_header:r.header,baseline_decision:base.decision,pass_reasons:base.pass_reasons,contender_status:cont.decision,contender_full_field:cont.rankings.length===originalField.length&&originalField.length===r.horses.length&&r.horses.every(h=>h.n),feature_entries:featureEntries,morning_lines:mls,ml_boundary_tie:validML&&mlorder.length>4&&mlorder[3].value===mlorder[4].value,beyer3_boundary_tie:b3.length>4&&b3[3].average===b3[4].average,histories,orders,combined_status:'UNAVAILABLE_NO_INDIVIDUAL_LAST_THREE_PACE_FIGURES'});
 }
}
const freeze={protocol_sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'protocol.json'))).digest('hex'),mode,classification:'NEWLY_RELEASED_HISTORICAL_CARDS_RETROSPECTIVE_NOT_PROSPECTIVE',races};
fs.writeFileSync(path.join(root,mode+'-prediction-freeze.json.gz'),zlib.gzipSync(JSON.stringify(freeze)));
console.log(JSON.stringify({mode,races:races.length,full_contender:races.filter(r=>r.contender_full_field).length,partial_contender:races.filter(r=>r.contender_full_field===false).length,unknown_ml:races.filter(r=>r.orders?.MORNING_LINE.length===0).length,beyer_eligible:races.reduce((s,r)=>s+(r.histories?.filter(h=>h.eligible).length||0),0),fewer_than_three:races.reduce((s,r)=>s+(r.histories?.filter(h=>h.reason==='FEWER_THAN_THREE_PRIOR_RACES').length||0),0)}));
