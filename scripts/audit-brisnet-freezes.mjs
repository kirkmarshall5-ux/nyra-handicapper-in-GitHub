// Audit saved forecasts; never recompute a historical model or certify local-clock files.
// Usage: node scripts/audit-brisnet-freezes.mjs results.json frozen-directory output.json
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const [resultFile,dir,out,benchmarkFile]=process.argv.slice(2);if(!out)throw Error('Supply results, freeze directory and output');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const results=JSON.parse(fs.readFileSync(resultFile)),rows=[],sources=[];
for(const file of fs.readdirSync(dir).filter(f=>/^NYRA_FREEZE_.*\.json$/.test(f)).sort()){
 const bytes=fs.readFileSync(path.join(dir,file)),d=JSON.parse(bytes);assert.equal(d.source,'BRISNET');
 sources.push({file,sha256:hash(bytes),captured_at:d.captured_at_utc,clock_source:d.clock_source});
 for(const r of d.races){
  const result=results.find(x=>x.date===r.date&&x.race===r.race);assert.ok(result,'Missing result');
  const text=r.models.brisContenderCandidates||'',structured=r.dashboard?.models?.find(m=>m.id==='brisContender');
  const list=text.split(/Evidence coverage:|Incomplete field:/)[0];
  const programs=structured?structured.rankings.map(h=>String(h.n)):[...list.matchAll(/\d+\.\s*#(\d+[A-Z]?)\s+/g)].map(m=>m[1]);
  const count=text.match(/Ranked (\d+)\/(\d+) eligible/);assert.ok(count,'Missing declared coverage');
  assert.equal(new Set(programs).size,programs.length,'Duplicate programs');assert.equal(programs.length,+count[1],'Incomplete extraction of archived full rankings');
  const starters=result.starters.map(String),finish=result.finish.map(h=>String(h[0])),picks=programs.slice(0,4);
  assert.equal(finish.length,4);assert.equal(new Set(starters).size,starters.length);
  const missing=starters.filter(n=>!programs.includes(n)),extra=programs.filter(n=>!starters.includes(n));
  const full=programs.length===+count[2]&&!missing.length&&!extra.length;
  const blockers=['INDEPENDENT_PRE_OFF_ANCHOR_NOT_SUPPLIED','AUTHENTICATED_CHART_ATTESTATION_NOT_SUPPLIED','ACTUAL_OFF_TIME_NOT_INDEPENDENTLY_VERIFIED'];
  if(!structured?.model_id)blockers.push('EXACT_MODEL_VERSION_NOT_RECORDED');
  if(!full)blockers.push('FULL_FINAL_FIELD_NOT_RANKED');
  rows.push({date:r.date,track:r.track,race:r.race,source_file:file,model_id:structured?.model_id??null,decision:structured?.decision??(/PASS/.test(text)?'PASS':'UNKNOWN'),declared_ranked:+count[1],declared_eligible:+count[2],archived_ranked_programs:programs,picks,actual:finish,missing_final_starters:missing,ranked_nonstarters:extra,full_final_field_program_match:full,exact_slots:finish.map((n,i)=>picks[i]===n),top4_contains:finish.map(n=>picks.includes(n)),correct_first_two_order:picks.slice(0,2).join('|')===finish.slice(0,2).join('|'),correct_first_four_order:picks.join('|')===finish.join('|'),official_results_url:result.url,certified:false,blockers});
 }
}
assert.equal(new Set(rows.map(r=>r.date+'|'+r.track+'|'+r.race)).size,rows.length,'Duplicate race');
function metrics(rr){const n=rr.length;return {races:n,exact_slots:[0,1,2,3].map(i=>rr.filter(r=>r.exact_slots[i]).length),top4_contains:[0,1,2,3].map(i=>rr.filter(r=>r.top4_contains[i]).length),all_four_selected:rr.filter(r=>r.top4_contains.every(Boolean)).length,correct_first_two_order:rr.filter(r=>r.correct_first_two_order).length,correct_first_four_order:rr.filter(r=>r.correct_first_four_order).length};}
const report={schema:'brisnet-saved-freeze-audit-v1',created_at:new Date().toISOString(),classification:'HISTORICAL_DIAGNOSTIC_ONLY',certified:false,certified_races:0,source_files:sources,results_sha256:hash(fs.readFileSync(resultFile)),results_scope:'Previously archived official-site result summaries; not signed full-chart evidence',all_saved_races:metrics(rows),full_final_field_program_match_subset:metrics(rows.filter(r=>r.full_final_field_program_match)),daily:Object.fromEntries([...new Set(rows.map(r=>r.date))].map(d=>[d,metrics(rows.filter(r=>r.date===d))])),rows,note:'Subset selection uses archived coverage and published final program numbers. It does not establish complete horse identity, untouched forecasts, verified post times or prospectivity. No scratched picks replaced. No model scores recalculated. No ROI certification.'};
if(benchmarkFile){
 const archived=JSON.parse(fs.readFileSync(benchmarkFile));
 const bench=rows.map(r=>{const b=archived.details.find(x=>x.date===r.date&&x.race===r.race&&x.model==='Morning Line');assert.ok(b,'Missing paired morning line');const picks=b.picks.map(String);assert.equal(new Set(picks).size,picks.length);return {...r,picks,exact_slots:r.actual.map((n,i)=>picks[i]===n),top4_contains:r.actual.map(n=>picks.includes(n)),correct_first_two_order:picks.slice(0,2).join('|')===r.actual.slice(0,2).join('|'),correct_first_four_order:picks.join('|')===r.actual.join('|')};});
 report.morning_line_benchmark={source_sha256:hash(fs.readFileSync(benchmarkFile)),scope:'Archived comparison picks: Oct22/23 reconstructed from published morning lines among final starters; Oct24/25 original saved ML picks. Historical diagnostic, not an untouched benchmark.',all:metrics(bench),full_field_program_match_subset:metrics(bench.filter(r=>r.full_final_field_program_match))};
}
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({all:report.all_saved_races,full_field_subset:report.full_final_field_program_match_subset,certified:0},null,2));
