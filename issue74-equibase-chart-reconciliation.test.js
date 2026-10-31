import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const chart=load('./audits/issue74-bel1025-equibase-official-chart-reconciliation.json');
const source=load('./audits/issue74-bel1025-original-pp-horse-name-digests.json');
const ledger=load('./audits/issue74-bel1025-certification-ledger.json');
test('official-chart evidence reconciles all nine source PP rosters without inventing finishing positions',()=>{
 assert.equal(chart.races.length,9);
 assert.equal(source.total_source_entries,80);
 assert.equal(chart.totals.pp_entries,80);
 assert.equal(chart.totals.actual_starters,73);
 assert.equal(chart.totals.scratches,6);
 assert.equal(chart.totals.declared_nonstarters,1);
 assert.equal(chart.totals.pp_entries,chart.totals.actual_starters+chart.totals.scratches+chart.totals.declared_nonstarters);
 assert.equal(chart.source.original_pp_sha256,source.source_pdf_sha256);
 for(const r of chart.races){
  const n=source.races.find(x=>x.race===r.race);
  assert.ok(n,'Missing original PP digest for race '+r.race);
  assert.equal(r.pp_entries,n.source_entries);
  const finish=r.finish_order_programs.map(String);
  const unplaced=r.unplaced_starter_programs.map(String);
  const scratch=r.scratched_programs.map(String);
  const nonstarter=r.nonstarter_programs.map(String);
  const all=[...finish,...unplaced,...scratch,...nonstarter];
  assert.equal(new Set(all).size,all.length,'Duplicated adjudicated program in race '+r.race);
  assert.equal(all.length,r.pp_entries,'Unaccounted source program in race '+r.race);
  assert.equal(finish.length+unplaced.length,r.actual_starters,'Non-finishers must still count as actual starters');
 }
});
test('Race 6 declared nonstarter and Race 8 lost rider are distinct statuses',()=>{
 const r6=chart.races.find(r=>r.race===6);
 const r8=chart.races.find(r=>r.race===8);
 assert.deepEqual(r6.nonstarter_programs,[7]);
 assert.ok(!r6.finish_order_programs.includes(7));
 assert.deepEqual(r8.unplaced_starter_programs,[11]);
 assert.ok(!r8.finish_order_programs.includes(11));
 assert.equal(r8.actual_starters,11);
 assert.equal(r8.finish_order_programs.length,10);
 const r9=chart.races.find(r=>r.race===9);
 assert.equal(r9.finish_order_programs.indexOf(13),8,'Cocoa Mills finished ninth');
});
test('source and chart reconciliation never upgrades an unauthenticated historical freeze',()=>{
 assert.equal(ledger.source_pdf.production_pdfjs_replay_executed,false);
 assert.equal(ledger.freeze.independent_before_post_anchor_verified,false);
 assert.ok(ledger.races.every(r=>r.prospective_gradeable===false));
 assert.ok(ledger.races.every(r=>r.official_chart_url===null && r.official_chart_id===null));
 assert.ok(ledger.races.every(r=>r.official_chart_manually_reviewed===true));
});
