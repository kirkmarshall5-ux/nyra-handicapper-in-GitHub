// Posthoc exploration on authorized development cards only. Never runs holdouts.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
import {adapter,positionMetrics,summarize} from './evaluate-speed-pace-matching.mjs';
import {meanLate} from './late-pace-research.mjs';
import {rankBrisnetModels} from '../brisnet-models.js';import {rankFinishers} from '../finisher-inputs.js';
const models=['v44c','finisher','contender'],finite=x=>typeof x==='number'&&Number.isFinite(x);
export const policies=[.5,1,1.5].flatMap(speed=>['latest','mean3'].map(lateMode=>({id:`S${speed}_P0.5_${lateMode}`,speed,pace:.5,lateMode})));
export function strictPaceLines(r,h){
 return (h.ratings?.lines??[]).slice(0,5).filter(l=>{
  const age=(Date.parse(r.date)-Date.parse(l.date))/86400000;
  return age>0&&age<=365&&l.surface===r.surface&&finite(l.furlongs)&&finite(r.distance_furlongs)&&(l.furlongs>=8)===(r.distance_furlongs>=8)&&Math.abs(l.furlongs-r.distance_furlongs)<=.5;
 });
}
export async function evaluateLate(manifest){
 assert.equal(manifest.holdout_files_used,0);assert.deepEqual(manifest.active_models,models);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'strict-late-'));
 try{
  const adapters=await Promise.all(policies.map(p=>adapter(p,dir))),rows=[],evidence=[];
  for(const item of manifest.cards){
   assert.equal(item.role,'DEVELOPMENT_PREVIOUSLY_ANALYZED');
   const card=JSON.parse(fs.readFileSync(item.card_path));
   for(const r of Object.values(card.races)){
    const before=JSON.stringify(r),info=item.results.find(x=>x.race===r.race),actual=info?.top4?.map(String)??null,cohort=info?.cohort??'UNGRADED';
    const outputs=adapters.map(run=>run(r)),baseline=outputs[0],native=rankBrisnetModels(r);
    assert.deepEqual(baseline,{v44c:native.v44c,finisher:rankFinishers(r),contender:native.contender});
    for(let i=0;i<policies.length;i++)for(const model of models){
     const p=policies[i],m=outputs[i][model],b=baseline[model];
     assert.equal(m.bettingEnabled,false);assert.equal(m.probabilityCalibrated,false);
     assert.equal(m.eligible_count,b.eligible_count);assert.deepEqual(m.unrated,b.unrated);
     assert.deepEqual(m.rankings.map(h=>h.n).sort(),b.rankings.map(h=>h.n).sort());
     if(model==='v44c')assert.deepEqual(m.rankings.map(h=>[h.n,h.score,h.raw_features]),b.rankings.map(h=>[h.n,h.score,h.raw_features]));
     for(const h of m.rankings){
      const base=b.rankings.find(x=>x.n===h.n),sameSpeed=outputs[i-i%2][model].rankings.find(x=>x.n===h.n);
      if(model==='finisher'){
       assert.deepEqual(h.components.recent_speed,base.components.recent_speed);
       assert.deepEqual(h.components.matched_speed,sameSpeed.components.matched_speed);
       assert.equal(h.components.late_pace.raw===null,base.components.late_pace.raw===null);
       for(const k of Object.keys(h.components))assert.equal(h.components[k].weight,base.components[k].weight);
      }
      if(model==='contender'){
       for(let j=0;j<h.raw_features.length;j++)if(j!==7)assert.equal(h.raw_features[j],sameSpeed.raw_features[j]);
       assert.equal(h.trend_adjustment,sameSpeed.trend_adjustment);
       assert.equal(h.raw_features[7]===null,base.raw_features[7]===null);
      }
     }
     rows.push({date:r.date,race:r.race,surface:r.surface,distance_furlongs:r.distance_furlongs,field_size:m.eligible_count,cohort,model,policy:p.id,parent_model_id:m.model_id,candidate_id:`STRICT-LP-RESEARCH-${model}-${p.id}`,rated:m.rankings.length,matched_speed:model==='v44c'?null:m.rankings.filter(h=>finite(model==='finisher'?h.components.matched_speed.raw:h.raw_features[4])).length,matched_late:model==='v44c'?null:m.rankings.filter(h=>finite(model==='finisher'?h.components.late_pace.raw:h.raw_features[7])).length,observed_top4:actual,rankings:m.rankings.map(h=>({program:String(h.n),rank:h.rank,score:h.score})),grade:actual?positionMetrics(m.rankings,actual,m.eligible_count):null});
    }
    // Only model-rated horses enter the late-pace diagnostic; no unverified figures promoted.
    const horses=baseline.finisher.rankings.map(entry=>{
     const h=r.horses.find(h=>String(h.n)===String(entry.n)),lines=strictPaceLines(r,h).filter(l=>finite(l.late));
     assert.equal(entry.components.late_pace.raw,lines[0]?.late??null);
     const history=(h.ratings?.lines??[]).slice(0,5),sameSurface=history.filter(l=>(Date.parse(r.date)-Date.parse(l.date))/86400000<=365&&l.surface===r.surface),sameCategory=sameSurface.filter(l=>finite(l.furlongs)&&(l.furlongs>=8)===(r.distance_furlongs>=8));
     const missingReason=lines.length?null:!sameSurface.length?'NO_SAME_SURFACE_WITHIN_HISTORY':!sameCategory.length?'NO_SAME_DISTANCE_CATEGORY':!strictPaceLines(r,h).length?'NO_DISTANCE_WITHIN_HALF_FURLONG':'QUALIFYING_LATE_FIGURES_BLANK';
     return {program:String(h.n),name:h.name,printed_style:h.ratings?.run_style??null,strict_late_count:lines.length,missing_reason:missingReason,latest_late:lines[0]?.late??null,mean3_late:meanLate(lines),strict_late_lines:lines.map(l=>({date:l.date,furlongs:l.furlongs,surface:l.surface,early:l[r.distance_furlongs>=8?'e2':'e1'],late:l.late,speed:l.speed})),baseline_ranks:Object.fromEntries(models.map(m=>[m,baseline[m].rankings.find(x=>String(x.n)===String(h.n))?.rank??null]))};
    });
    evidence.push({date:r.date,race:r.race,surface:r.surface,cohort,observed_top4:actual,horses});
    assert.equal(JSON.stringify(r),before);
   }
  }
  return {classification:'POSTHOC_EXPLORATORY_SAME_DEVELOPMENT_RACES',active_models:models,holdout_files_used:0,live_rule_changed:false,policies,protocol:{pace:'same surface, same sprint/route category, within 0.5f, latest five starts, within 365 days',speed:'0.5/1/1.5f; same category/surface/history limits',late:'latest qualifying versus arithmetic mean of up to three most recent qualifying LP values',weights:'unchanged',limitations:['No sectional positions or complete finish charts: late-pace leaders are not confirmed closers','Same previously analyzed cards; no independent validation','October 21 R2 separate; R8 ungraded','Retrospective surface and field information; no pre-race timing claim']},summary:summarize(rows),races:rows,evidence};
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){
 const [input,out]=process.argv.slice(2);if(!input||!out)throw Error('Usage: evaluate-strict-late-pace.mjs MANIFEST OUTPUT');
 const result=await evaluateLate(JSON.parse(fs.readFileSync(input)));fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result.summary.filter(r=>r.cohort==='ACTUAL_CONDITIONS_MAIN'),null,2));
}
