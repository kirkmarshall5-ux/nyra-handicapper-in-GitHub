import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const key=r=>r.date+'|'+r.race;
export function aggregate(rows){
 const groups=new Map();for(const r of rows){if(!r.grade)continue;const id=r.model+'|'+r.variant;
  const s=groups.get(id)||{model:r.model,variant:r.variant,races:0,wins:0,exactas:0,trifectas:0,superfectas:0,correct_pairs:0,comparable_pairs:0,possible_pairs:0,rated:0,eligible:0,matched_speed:0,matched_late:0};
  s.races++;s.wins+=+r.grade.win;s.exactas+=+r.grade.exacta;s.trifectas+=+r.grade.trifecta;s.superfectas+=+r.grade.superfecta;
  for(const f of ['correct_pairs','comparable_pairs','possible_pairs'])s[f]+=r.grade[f];s.rated+=r.coverage.rated;s.eligible+=r.field_size;s.matched_speed+=r.coverage.speed;s.matched_late+=r.coverage.late;groups.set(id,s);
 }return [...groups.values()].map(s=>({...s,order_credit:s.correct_pairs/s.possible_pairs}));
}
export function followup(original,actual){
 assert.equal(original.holdout_files_used,0);assert.equal(actual.holdout_files_used,0);
 const main=original.races.filter(r=>r.cohort==='MAIN_SCHEDULED_SURFACE'),tapeta=actual.races.filter(r=>r.cohort==='ACTUAL_SURFACE_REPLAY');
 const combined=[...main,...tapeta],seen=new Set();for(const r of combined){const id=[key(r),r.model,r.variant].join('|');assert.ok(!seen.has(id),'Duplicate race/model/variant in combined cohort');seen.add(id);}
 const slices={previous_main_10:main,actual_tapeta_5:tapeta,actual_conditions_15:combined,uncertain_field_separate:original.races.filter(r=>r.cohort==='FIELD_UNCERTAIN_DIAGNOSTIC')};
 for(const [name,predicate] of Object.entries({small_fields:r=>r.field_size<=6,medium_fields:r=>r.field_size>=7&&r.field_size<=9,large_fields:r=>r.field_size>=10,sprints:r=>r.distance_furlongs<8,routes:r=>r.distance_furlongs>=8,dirt:r=>r.surface==='Dirt',turf:r=>r.surface==='Turf',synthetic:r=>r.surface==='Synth',fully_rated_fields:r=>r.coverage.rated===r.field_size,partial_rated_fields:r=>r.coverage.rated<r.field_size}))slices[name]=combined.filter(predicate);
 for(const date of new Set(combined.map(r=>r.date)))slices['date_'+date]=combined.filter(r=>r.date===date);
 const summaries=Object.fromEntries(Object.entries(slices).map(([k,v])=>[k,aggregate(v)]));
 const leftOut=[];for(const omitted of new Set(combined.map(key))){
  const a=aggregate(combined.filter(r=>key(r)!==omitted));for(const s of a){if(s.variant==='control')continue;const control=a.find(c=>c.model===s.model&&c.variant==='control');leftOut.push({omitted,model:s.model,variant:s.variant,races:s.races,winner_delta:s.wins-control.wins,exacta_delta:s.exactas-control.exactas,pair_delta:s.correct_pairs-control.correct_pairs});}
 }
 const conditionEffects=[];for(const r of tapeta.filter(r=>r.variant==='control')){
  const prior=original.races.find(x=>key(x)===key(r)&&x.model===r.model&&x.variant==='control');assert.ok(prior);
  conditionEffects.push({date:r.date,race:r.race,model:r.model,scheduled_surface:prior.surface,actual_surface:r.surface,distance_furlongs:r.distance_furlongs,before_top4:prior.rankings.slice(0,4).map(h=>h.program),after_top4:r.rankings.slice(0,4).map(h=>h.program),observed_top4:r.observed_top4,winner_delta:+r.grade.win- +prior.grade.win,exacta_delta:+r.grade.exacta- +prior.grade.exacta,pair_delta:r.grade.correct_pairs-prior.grade.correct_pairs});
 }
 return {classification:'RETROSPECTIVE_SENSITIVITY_SAME_RACES_NOT_NEW_VALIDATION',holdout_files_used:0,live_rule_changed:false,unique_graded_races:new Set(combined.map(key)).size,unique_dates:[...new Set(combined.map(r=>r.date))],summaries,left_one_race_out:leftOut,condition_effects:conditionEffects};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){
 const [first,second,out]=process.argv.slice(2);if(!first||!second||!out)throw Error('Usage: node scripts/analyze-matching-robustness.mjs ORIGINAL_JSON ACTUAL_CONDITIONS_JSON OUTPUT_JSON');
 const bytes=[fs.readFileSync(first),fs.readFileSync(second)],report=followup(...bytes.map(b=>JSON.parse(b)));report.input_sha256=bytes.map(b=>createHash('sha256').update(b).digest('hex'));fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summaries.actual_conditions_15,null,2));
}
