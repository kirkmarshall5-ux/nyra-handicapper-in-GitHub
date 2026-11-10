// Feature-removal research only. Does not modify production or read PP PDFs.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {releaseRace} from '../rankings-release.js';import {rankContenders,contenderFeatures} from '../contender-rankings.js';import {MODEL} from '../contender-model.js';import {finisherInputs} from '../finisher-inputs.js';import {rankFinisherFeatures} from '../finisher-model.js';import {positionMetrics} from './evaluate-speed-pace-matching.mjs';
export const arms=[{id:'current',late:false,context:false,early:false},{id:'no_direct_late',late:true,context:false,early:false},{id:'no_context',late:false,context:true,early:false},{id:'no_late_or_context',late:true,context:true,early:false},{id:'no_pace',late:true,context:true,early:true}];
const finite=x=>typeof x==='number'&&Number.isFinite(x),sort=rows=>rows.sort((a,b)=>b.score-a.score||(a.name<b.name?-1:a.name>b.name?1:0));
const centered=(v,a)=>v===null||a.length<=1||new Set(a).size===1?0:2*(a.filter(q=>q<v).length+.5*(a.filter(q=>q===v).length-1))/(a.length-1)-1;
export function contenderScore(e,arm){return e.contributions.reduce((s,v,j)=>s+((arm.late&&j===7||arm.context&&j===8||arm.early&&j===6)?0:v),0)+e.trend;}
export function v44Score(e,arm){return e.base+Math.max(-6,Math.min(6,e.signals.filter(([name])=>!arm.context||name!=='pace-fit').reduce((s,[,v])=>s+v,0)));}
export function summarizeDRF(rows){
 const out=[];for(const cohort of ['ALL',...new Set(rows.map(r=>r.cohort))])for(const model of ['v44c','finisher','contender'])for(const arm of arms){
  const rr=rows.filter(r=>(cohort==='ALL'||r.cohort===cohort)&&r.model===model&&r.arm===arm.id);if(!rr.length)continue;
  out.push({cohort,model,arm:arm.id,races:rr.length,wins:rr.filter(r=>r.grade.win).length,exactas:rr.filter(r=>r.grade.exacta).length,trifectas:rr.filter(r=>r.grade.trifecta).length,superfectas:rr.filter(r=>r.grade.superfecta).length,slot_hits:[0,1,2,3].map(i=>rr.filter(r=>r.grade.slot_hits[i]).length),underneath_correct:rr.reduce((s,r)=>s+r.grade.underneath_correct,0),underneath_possible:rr.length*3,mean_top4_position_error:rr.reduce((s,r)=>s+r.grade.top4_position_error,0)/rr.length});
 }return out;
}
export function replayFreeze(freeze){
 assert.equal(freeze.classification,'POSTHOC_REUSED_DRF_DEVELOPMENT_ONLY');assert.equal(freeze.holdout_files_used,0);
 const rows=[];
 for(const r of freeze.races)for(const arm of arms)for(const model of ['v44c','finisher','contender']){
  let rankings;
  if(model==='finisher')rankings=rankFinisherFeatures(r.finisher_inputs.map(e=>({...e,late_pace:arm.late?null:e.late_pace}))).rankings;
  else rankings=sort(r[model+'_entries'].map(e=>({n:e.n,name:e.name,score:model==='v44c'?v44Score(e,arm):contenderScore(e,arm)})));
  assert.deepEqual(rankings.map(h=>h.n).sort(),r.actual_field.slice().sort());
  rows.push({key:r.key,cohort:r.cohort,model,arm:arm.id,actual:r.actual,rankings:rankings.map(h=>({n:String(h.n),score:h.score})),grade:positionMetrics(rankings,r.actual,r.actual_field.length)});
 }return {classification:'POSTHOC_REUSED_DRF_DEVELOPMENT_ONLY',holdout_files_used:0,live_rule_changed:false,arms,attempts:freeze.attempts,coverage:freeze.coverage,summary:summarizeDRF(rows),rows};
}
export function freezeInputs(manifest){
 assert.equal(manifest.holdout_files_used,0);const races=[],attempts=[],keys=new Set();
 for(const item of manifest.races){
  assert.equal(item.role,'DEVELOPMENT_PREVIOUSLY_ANALYZED');assert.ok(!keys.has(item.key));keys.add(item.key);
  const r=item.race,before=JSON.stringify(r),baseline=releaseRace(r),field=r.horses.filter(h=>h.odds!=='SCR'&&(!h.entry_status||h.entry_status==='REGULAR'));
  if(field.some(h=>!h.n)||new Set(field.map(h=>String(h.n))).size!==field.length){attempts.push({key:item.key,cohort:item.cohort,included:false,reason:'ARCHIVED_PROGRAM_IDENTITIES_MISSING_OR_DUPLICATE'});continue;}
  assert.ok(field.every(h=>h.life_starts>0),'This comparison is explicitly zero-FTS');
  const f=finisherInputs(r),fm=rankFinisherFeatures(f),cm=rankContenders(r,baseline);
  const included=baseline.decision==='RATEABLE'&&fm.unrated.length===0&&cm.rankings.length===field.length;
  attempts.push({key:item.key,cohort:item.cohort,included,v44_decision:baseline.decision,finisher_unrated:fm.unrated,contender_decision:cm.decision,pass_reasons:baseline.pass_reasons});
  if(!included)continue;
  const es=field.map(h=>contenderFeatures(h,{...r,field})),observed=MODEL.features.map((_,j)=>es.map(e=>e.raw[j]).filter(v=>v!==null)),slopes=es.map(e=>e.slope).filter(v=>v!==null);
  const ce=field.map((h,i)=>({n:String(h.n),name:h.name,raw:es[i].raw,contributions:es[i].raw.map((v,j)=>centered(v,observed[j])*MODEL.contender.coefficients[j]),trend:.1*centered(es[i].slope,slopes)}));
  const ve=baseline.rankings.map(h=>({n:String(h.n),name:h.name,base:h.base_rating,signals:h.v44c_signals}));
  for(const e of ce)assert.ok(Math.abs(contenderScore(e,arms[0])-cm.rankings.find(h=>String(h.n)===e.n).score)<1e-12);
  for(const e of ve)assert.equal(v44Score(e,arms[0]),baseline.rankings.find(h=>String(h.n)===e.n).v44c_unrounded_score);
  assert.deepEqual(sort(ce.map(e=>({...e,score:contenderScore(e,arms[0])}))).map(e=>e.n),item.archived_contender_order.map(String));
  assert.equal(JSON.stringify(r),before);
  races.push({key:item.key,cohort:item.cohort,date:r.date,surface:r.surface,actual:item.actual,actual_field:field.map(h=>String(h.n)),source_sha256:createHash('sha256').update(before).digest('hex'),v44c_entries:ve,contender_entries:ce,finisher_inputs:f,baseline_orders:{v44c:baseline.rankings.map(h=>String(h.n)),finisher:fm.rankings.map(h=>String(h.n)),contender:cm.rankings.map(h=>String(h.n))}});
 }
 const all=races.flatMap(r=>r.finisher_inputs),winners=races.map(r=>r.finisher_inputs.find(h=>String(h.n)===r.actual[0]));
 return {classification:'POSTHOC_REUSED_DRF_DEVELOPMENT_ONLY',holdout_files_used:0,source_manifest_sha256:createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),selection:manifest.selection,coefficients:MODEL.contender.coefficients,coverage:{races:races.length,rated_horses:all.length,late_available:all.filter(h=>finite(h.late_pace)).length,winners_with_late:winners.filter(h=>finite(h.late_pace)).length},attempts,races};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){
 if(process.argv[2]==='--replay'){
  const [, , ,input,out]=process.argv;const result=replayFreeze(JSON.parse(gunzipSync(fs.readFileSync(input))));fs.writeFileSync(out,JSON.stringify(result)+'\n');console.log('Replayed '+result.coverage.races+' DRF development races.');
 }else{
 const [input,out]=process.argv.slice(2);if(!input||!out)throw Error('Usage: evaluate-drf-pace.mjs MANIFEST OUTPUT_DIRECTORY');fs.mkdirSync(out,{recursive:true});
 const freeze=freezeInputs(JSON.parse(fs.readFileSync(input))),result=replayFreeze(freeze);
 for(const r of freeze.races)for(const model of ['v44c','finisher','contender'])assert.deepEqual(result.rows.find(x=>x.key===r.key&&x.model===model&&x.arm==='current').rankings.map(h=>h.n),r.baseline_orders[model]);
 fs.writeFileSync(path.join(out,'feature-freeze.json'),JSON.stringify(freeze)+'\n');fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result)+'\n');console.log(JSON.stringify({coverage:result.coverage,excluded:result.attempts.filter(x=>!x.included),summary:result.summary.filter(x=>x.cohort==='ALL')},null,2));
 }
}
