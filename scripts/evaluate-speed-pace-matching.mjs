// Active-model-only exploratory factor isolation. No production adapter edits.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {rankBrisnetModels} from '../brisnet-models.js';import {rankFinishers} from '../finisher-inputs.js';import {gradeOrder} from './evaluate-brisnet-matching.mjs';
const root=path.resolve(import.meta.dirname,'..'),models=['v44c','finisher','contender'],finite=x=>typeof x==='number'&&Number.isFinite(x);
const policies=[.5,1,1.5].flatMap(speed=>[.5,1,1.5].map(pace=>({id:'S'+speed+'_P'+pace,speed,pace})));
function replaceOne(s,a,b){assert.equal(s.split(a).length-1,1,'Source contract changed: '+a);return s.replace(a,b);}
function absoluteImports(s){return s.replace(/from (['"])(\.\/[^'"]+)\1/g,(_,q,p)=>'from '+q+new URL(p,pathToFileURL(root+'/')).href+q);}
async function adapter(p,dir){
 let n=fs.readFileSync(path.join(root,'brisnet-models.js'),'utf8'),f=fs.readFileSync(path.join(root,'finisher-inputs.js'),'utf8');
 const nativeLine=n.match(/^ const matched=surface\.filter.*$/m)?.[0];assert.ok(nativeLine);
 const speedLine=nativeLine.replace('<=.5','<='+p.speed),paceLine=nativeLine.replace('const matched=','const paceMatched=').replace('<=.5','<='+p.pace);
 n=replaceOne(n,nativeLine,speedLine+'\n'+paceLine);
 n=replaceOne(n,'earlyLine=matched.find','earlyLine=paceMatched.find');n=replaceOne(n,'lateLine=matched.find','lateLine=paceMatched.find');
 n=replaceOne(n,'<=.5&&finite(l.speed)','<='+p.speed+'&&finite(l.speed)');
 const finLine=f.match(/^   const matched=rows\.filter.*$/m)?.[0];assert.ok(finLine);
 f=replaceOne(f,finLine,finLine.replace('<=FINISHER_SPEC.distance_tolerance_furlongs','<='+p.speed)+'\n'+finLine.replace('const matched=','const paceMatched=').replace('<=FINISHER_SPEC.distance_tolerance_furlongs','<='+p.pace));
 f=replaceOne(f,'late_pace:matched.find','late_pace:paceMatched.find');
 const np=path.join(dir,p.id+'-native.mjs'),fp=path.join(dir,p.id+'-finisher.mjs');fs.writeFileSync(np,absoluteImports(n));fs.writeFileSync(fp,absoluteImports(f));
 const [nm,fm]=await Promise.all([import(pathToFileURL(np)),import(pathToFileURL(fp))]);
 return r=>{const native=nm.rankBrisnetModels(r);return {v44c:native.v44c,finisher:fm.rankFinishers(r),contender:native.contender};};
}
export function positionMetrics(rankings,actual,fieldSize){
 const pred=rankings.map(h=>String(h.n??h.program)),ranks=new Map(pred.map((n,i)=>[n,i+1]));let correct=0,comparable=0;
 for(let i=1;i<4;i++)for(let j=i+1;j<4;j++)if(ranks.has(actual[i])&&ranks.has(actual[j])){comparable++;correct+=+(ranks.get(actual[i])<ranks.get(actual[j]));}
 return {...gradeOrder(rankings,actual),slot_hits:actual.map((n,i)=>n===pred[i]),underneath_correct:correct,underneath_comparable:comparable,underneath_possible:3,top4_position_error:actual.reduce((s,n,i)=>s+Math.abs((ranks.get(n)??fieldSize+1)-(i+1)),0)/4};
}
function summarize(rows){
 const groups={};for(const r of rows){if(!r.grade)continue;const k=r.cohort+'|'+r.model+'|'+r.policy;
  const s=groups[k]??={cohort:r.cohort,model:r.model,policy:r.policy,races:0,wins:0,exactas:0,trifectas:0,superfectas:0,slot_hits:[0,0,0,0],underneath_correct:0,underneath_comparable:0,underneath_possible:0,position_error_sum:0,rated:0,matched_speed:r.model==='v44c'?null:0,matched_late:r.model==='v44c'?null:0};s.races++;s.wins+=+r.grade.win;s.exactas+=+r.grade.exacta;s.trifectas+=+r.grade.trifecta;s.superfectas+=+r.grade.superfecta;
  for(let i=0;i<4;i++)s.slot_hits[i]+=+r.grade.slot_hits[i];for(const f of ['underneath_correct','underneath_comparable','underneath_possible'])s[f]+=r.grade[f];s.position_error_sum+=r.grade.top4_position_error;s.rated+=r.rated;if(r.model!=='v44c'){s.matched_speed+=r.matched_speed??0;s.matched_late+=r.matched_late??0;}
 }return Object.values(groups).map(s=>({...s,mean_top4_position_error:s.position_error_sum/s.races,underneath_order_credit:s.underneath_correct/s.underneath_possible}));
}
export async function evaluateIsolation(manifest){
 assert.equal(manifest.holdout_files_used,0);assert.deepEqual(manifest.active_models,models);const dir=fs.mkdtempSync(path.join(os.tmpdir(),'matching-isolation-'));
 try{
  const adapters=await Promise.all(policies.map(p=>adapter(p,dir))),rows=[],sources=[];
  for(const item of manifest.cards){
   assert.equal(item.role,'DEVELOPMENT_PREVIOUSLY_ANALYZED');const bytes=fs.readFileSync(item.card_path),card=JSON.parse(bytes);sources.push({date:card.date,sha256:createHash('sha256').update(bytes).digest('hex')});
   for(const r of Object.values(card.races)){
    const info=item.results.find(x=>x.race===r.race),cohort=info?.cohort??'UNGRADED',actual=info?.top4?.map(String)??null,before=JSON.stringify(r),native=rankBrisnetModels(r),baseline={v44c:native.v44c,finisher:rankFinishers(r),contender:native.contender};
    for(let i=0;i<policies.length;i++){
     const p=policies[i],out=adapters[i](r);if(i===0)for(const model of models)assert.deepEqual(out[model],baseline[model]);
     assert.deepEqual(out.v44c.rankings.map(h=>[h.n,h.score]),baseline.v44c.rankings.map(h=>[h.n,h.score]));
     for(const model of models){const m=out[model];assert.equal(m.bettingEnabled,false);assert.equal(m.probabilityCalibrated,false);assert.equal(m.eligible_count,baseline[model].eligible_count);assert.deepEqual(m.rankings.map(h=>h.n).sort(),baseline[model].rankings.map(h=>h.n).sort());
      // Altering optional matching must not alter recent-speed or connections.
      for(const h of m.rankings){const b=baseline[model].rankings.find(x=>x.n===h.n);
       if(model==='finisher'){assert.deepEqual(h.components.recent_speed,b.components.recent_speed);if(p.pace===.5)assert.deepEqual(h.components.late_pace,b.components.late_pace);if(p.speed===.5)assert.deepEqual(h.components.matched_speed,b.components.matched_speed);}
       if(model==='contender'){for(const j of [0,1,2,3,5,12,13,14])assert.equal(h.raw_features[j],b.raw_features[j]);if(p.pace===.5)for(const j of [6,7])assert.equal(h.raw_features[j],b.raw_features[j]);if(p.speed===.5){assert.equal(h.raw_features[4],b.raw_features[4]);assert.equal(h.trend_adjustment,b.trend_adjustment);}}
      }
      rows.push({date:r.date,race:r.race,surface:r.surface,distance_furlongs:r.distance_furlongs,field_size:m.eligible_count,cohort,model,policy:p.id,candidate_id:'MATCHING-FACTOR-RESEARCH-'+model+'-'+p.id,parent_model_id:m.model_id,rated:m.rankings.length,matched_speed:model==='v44c'?null:m.rankings.filter(h=>model==='finisher'?finite(h.components.matched_speed.raw):finite(h.raw_features[4])).length,matched_late:model==='v44c'?null:m.rankings.filter(h=>model==='finisher'?finite(h.components.late_pace.raw):finite(h.raw_features[7])).length,observed_top4:actual,rankings:m.rankings.map(h=>({program:String(h.n),rank:h.rank,score:h.score})),grade:actual?positionMetrics(m.rankings,actual,m.eligible_count):null});
     }
    }
    assert.equal(JSON.stringify(r),before);
   }
  }
  return {classification:'POSTHOC_EXPLORATORY_FACTOR_ISOLATION_SAME_DEVELOPMENT_RACES',active_models:models,holdout_files_used:0,live_rule_changed:false,policies,protocol:manifest.protocol,sources,summary:summarize(rows),races:rows};
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){
 const [input,out]=process.argv.slice(2);if(!input||!out)throw Error('Usage: node scripts/evaluate-speed-pace-matching.mjs MANIFEST_JSON OUTPUT_JSON');
 const r=await evaluateIsolation(JSON.parse(fs.readFileSync(input)));fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r.summary,null,2));
}
