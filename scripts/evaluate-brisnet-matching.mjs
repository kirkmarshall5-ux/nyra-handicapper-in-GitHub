// Offline development experiment. Never imports a holdout inventory or modifies live models.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {rankBrisnetModels} from '../brisnet-models.js';import {rankFinishers} from '../finisher-inputs.js';
const root=path.resolve(import.meta.dirname,'..');
const variants=[{id:'control',tolerance:.5,window:5},{id:'latest5_1f',tolerance:1,window:5},{id:'latest5_1p5f',tolerance:1.5,window:5},{id:'all_0p5f',tolerance:.5,window:999},{id:'all_1f',tolerance:1,window:999},{id:'all_1p5f',tolerance:1.5,window:999}];
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function replaceOne(s,a,b){assert.equal(s.split(a).length-1,1,'Source contract changed: '+a);return s.replace(a,b);}
function absoluteImports(s){return s.replace(/from (['"])(\.\/[^'"]+)\1/g,(_,q,p)=>'from '+q+new URL(p,pathToFileURL(root+'/')).href+q);}
async function adapter(v,dir){
 let native=fs.readFileSync(path.join(root,'brisnet-models.js'),'utf8'),finisher=fs.readFileSync(path.join(root,'finisher-inputs.js'),'utf8');
 assert.equal(native.split('<=.5').length-1,2);
 native=native.replaceAll('<=.5','<='+v.tolerance);
 native=replaceOne(native,'const matched=surface.filter','const matchingRows=source.slice(0,'+v.window+').map(l=>({...l,age:(Date.parse(r.date)-Date.parse(l.date))/86400000}));\n const matched=matchingRows.filter(l=>l.age<=365&&l.surface===r.surface).filter');
 native=replaceOne(native,'const comparable=rows.filter','const comparable=matchingRows.filter');
 finisher=replaceOne(finisher,'const matched=rows.filter','const matched=all.slice(0,'+v.window+').filter');
 finisher=replaceOne(finisher,'<=FINISHER_SPEC.distance_tolerance_furlongs','<='+v.tolerance);
 if(v.window>5)finisher=replaceOne(finisher,'if(rows.some((l,i)=>','if(all.slice(0,'+v.window+').some((l,i)=>');
 // Validation references the same selected sequence, including older starts.
 if(v.window>5)finisher=replaceOne(finisher,'l.date>=rows[i-1].date','l.date>=all[i-1].date');
 const n=path.join(dir,v.id+'-native.mjs'),f=path.join(dir,v.id+'-finisher.mjs');fs.writeFileSync(n,absoluteImports(native));fs.writeFileSync(f,absoluteImports(finisher));
 const [nm,fm]=await Promise.all([import(pathToFileURL(n)),import(pathToFileURL(f))]);return r=>({native:nm.rankBrisnetModels(r),finisher:fm.rankFinishers(r)});
}
export function gradeOrder(rankings,actual){
 const ranks=new Map(rankings.map((h,i)=>[String(h.n??h.program),i+1])),pred=rankings.map(h=>String(h.n??h.program));
 let correct=0,comparable=0;for(let i=0;i<actual.length;i++)for(let j=i+1;j<actual.length;j++)if(ranks.has(actual[i])&&ranks.has(actual[j])){comparable++;if(ranks.get(actual[i])<ranks.get(actual[j]))correct++;}
 const exact=n=>actual.length>=n&&actual.slice(0,n).every((h,i)=>h===pred[i]);
 return {winner_rank:ranks.get(actual[0])??null,win:exact(1),exacta:exact(2),trifecta:exact(3),superfecta:exact(4),correct_pairs:correct,comparable_pairs:comparable,possible_pairs:actual.length*(actual.length-1)/2,full_top4_ranked:actual.every(h=>ranks.has(h))};
}
function summary(rows){
 const groups={};for(const x of rows){if(!x.grade)continue;const k=[x.cohort,x.model,x.variant].join('|'),s=groups[k]??={cohort:x.cohort,model:x.model,variant:x.variant,races:0,win:0,exacta:0,trifecta:0,superfecta:0,correct_pairs:0,comparable_pairs:0,possible_pairs:0,full_top4_ranked:0,matched_speed:0,matched_late:0,rated:0,winner_rank_sum:0,winner_rank_observed:0};s.races++;
  for(const f of ['win','exacta','trifecta','superfecta','correct_pairs','comparable_pairs','possible_pairs','full_top4_ranked'])s[f]+=Number(x.grade[f]);
  s.matched_speed+=x.coverage.speed;s.matched_late+=x.coverage.late;s.rated+=x.coverage.rated;if(x.grade.winner_rank!==null){s.winner_rank_sum+=x.grade.winner_rank;s.winner_rank_observed++;}
 }return Object.values(groups).map(s=>({...s,pair_accuracy:s.comparable_pairs?s.correct_pairs/s.comparable_pairs:null,order_credit:s.possible_pairs?s.correct_pairs/s.possible_pairs:null,mean_winner_rank:s.winner_rank_observed?s.winner_rank_sum/s.winner_rank_observed:null}));
}
export async function runMatchingExperiment(manifest){
 assert.equal(manifest.holdout_files_used,0);const temp=fs.mkdtempSync(path.join(os.tmpdir(),'brisnet-matching-'));
 try{
  const adapters=await Promise.all(variants.map(v=>adapter(v,temp))),rows=[],sources=[];
  for(const item of manifest.cards){
   assert.equal(item.role,'DEVELOPMENT_PREVIOUSLY_ANALYZED');const bytes=fs.readFileSync(item.card_path),card=JSON.parse(bytes);sources.push({date:card.date,sha256:createHash('sha256').update(bytes).digest('hex'),role:item.role});
   for(const r of Object.values(card.races)){
    const info=item.results.find(x=>x.race===r.race),actual=info?.top4?.map(String)??null,cohort=info?.cohort??'UNGRADED',before=JSON.stringify(r);
    const baseNative=rankBrisnetModels(r),baseFinisher=rankFinishers(r);
    for(let i=0;i<variants.length;i++){
     const v=variants[i],result=adapters[i](r);if(i===0){assert.deepEqual(result.native,baseNative);assert.deepEqual(result.finisher,baseFinisher);}
     assert.deepEqual(result.native.v44c.rankings.map(h=>[h.n,h.score]),baseNative.v44c.rankings.map(h=>[h.n,h.score]),'V4.4c scores and order must not change with matching');
     for(const model of ['v44c','finisher','contender','mix1']){
      const m=model==='finisher'?result.finisher:result.native[model];assert.equal(m.bettingEnabled,false);assert.equal(m.probabilityCalibrated,false);
      const coverage={rated:m.rankings.length,speed:m.rankings.filter(h=>model==='finisher'?finite(h.components.matched_speed.raw):model==='mix1'?finite(h.raw_features.surfaceDistance):model==='contender'?finite(h.raw_features[4]):false).length,late:m.rankings.filter(h=>model==='finisher'?finite(h.components.late_pace.raw):finite(h.evidence?.late)).length};
      rows.push({date:r.date,race:r.race,surface:r.surface,distance_furlongs:r.distance_furlongs,cohort,field_size:m.eligible_count,variant:v.id,model,candidate_id:'MATCHING-RESEARCH-'+v.id+'-'+model,parent_model_id:m.model_id,coverage,observed_top4:actual,rankings:m.rankings.map(h=>({program:String(h.n),rank:h.rank,score:h.score})),grade:actual?gradeOrder(m.rankings,actual):null,notes:info?.notes??[]});
     }
    }
    assert.equal(JSON.stringify(r),before,'Source mutation');
   }
  }
  return {classification:'RETROSPECTIVE_DEVELOPMENT_EXPERIMENT_NOT_VALIDATION',holdout_files_used:0,live_models_changed:false,protocol:manifest.protocol,variants,sources,summary:summary(rows),races:rows};
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){
 const [manifestPath,out]=process.argv.slice(2);if(!manifestPath||!out)throw Error('Usage: node scripts/evaluate-brisnet-matching.mjs MANIFEST_JSON OUTPUT_JSON');
 const report=await runMatchingExperiment(JSON.parse(fs.readFileSync(manifestPath)));fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary,null,2));
}
