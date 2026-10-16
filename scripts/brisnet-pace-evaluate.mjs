// Usage: node scripts/brisnet-pace-evaluate.mjs parsed-card.json output.json [verified-results.json]
import fs from 'node:fs';
import {paceCandidateBatch,gradePaceCandidate} from '../brisnet-pace-candidate.js';
const [input,output,resultsPath]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node scripts/brisnet-pace-evaluate.mjs parsed-card.json output.json [verified-results.json]');
const data=JSON.parse(fs.readFileSync(input,'utf8'));
const preserved=data.model_id==='BRIS-PACE-CONTEXT-v1'&&Array.isArray(data.races)&&data.races.every(r=>r.candidates?.CONDITION);
if(resultsPath&&!preserved)throw Error('Grade a preserved candidate export, not regenerated forecasts from a parsed card');
const batch=preserved?structuredClone(data):paceCandidateBatch(data);
if(resultsPath){
 const raceKeys=batch.races.map(r=>r.candidates.CONDITION.race_key);if(new Set(raceKeys).size!==raceKeys.length)throw Error('Duplicate forecast races require reconciliation');
 const records=JSON.parse(fs.readFileSync(resultsPath,'utf8')).records;
 if(!Array.isArray(records))throw Error('Results file must contain records array');
 const keys=records.map(r=>r.race_key);if(new Set(keys).size!==keys.length)throw Error('Duplicate official race records require reconciliation');
 batch.results=batch.races.map(r=>{
  const reference=r.candidates.CONDITION,record=records.find(x=>x.race_key===reference.race_key);
  const arms={...r.candidates,...Object.fromEntries(Object.entries(r.models||{}).map(([key,m])=>[key,{...m,status:m.ranking_status,race_key:reference.race_key,context:reference.context}]))};
  return {race:r.race,group:reference.context.group,grades:Object.fromEntries(Object.entries(arms).map(([key,c])=>[key,gradePaceCandidate(c,record)]))};
 });
 batch.summary={};
 const rows=batch.results;
 for(const group of [...new Set(rows.map(r=>r.group)),'ALL']){
  const groupRows=rows.filter(r=>group==='ALL'||r.group===group);
  // Every arm uses the same races; no candidate-specific cherry picking.
  const paired=groupRows.filter(r=>Object.values(r.grades).length===7&&Object.values(r.grades).every(g=>g.status==='GRADED'));
  batch.summary[group]={races_seen:groupRows.length,paired_graded_races:paired.length,excluded_races:groupRows.filter(r=>!paired.includes(r)).map(r=>r.race),arms:Object.fromEntries(['BASE','FLAT','CONDITION','TURN','v44c','contender','mix1'].map(key=>{
   const metrics=paired.map(r=>r.grades[key].metrics);return [key,{races:metrics.length,first4_eligible_races:metrics.filter(m=>m.ordered4!==null).length,top1_winners:metrics.filter(m=>m.top1).length,ordered_first2:metrics.filter(m=>m.ordered2).length,first4_set:metrics.filter(m=>m.first4set).length,ordered_first4:metrics.filter(m=>m.ordered4).length,winner_in_first4:metrics.filter(m=>m.winner_in_four).length,mean_full_field_rank_error:metrics.length?metrics.reduce((s,m)=>s+m.rank_mae,0)/metrics.length:null}];
  }))};
 }
 batch.results_note='Requires independently reviewed pre-off capture, source roster/final field and official complete order. Boolean attestations are input requirements, not independently verified by this script. Dead heats and nonfinishers need separate grading rules. No odds, ticket returns or ROI are inferred.';
}
fs.writeFileSync(output,JSON.stringify(batch,null,2)+'\n');
console.log(JSON.stringify({model_id:batch.model_id,races:batch.races.length,complete_candidate_fields:batch.races.filter(r=>r.candidates.CONDITION.status==='RESEARCH_RANKING').length,output,summary:batch.summary??'No official results supplied; no performance claims'},null,2));
