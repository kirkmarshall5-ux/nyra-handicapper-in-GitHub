import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const original=JSON.parse(readFileSync(new URL('./audits/issue74-bel1025-private-pdf-source-programs.json',import.meta.url),'utf8'));
const reference=JSON.parse(readFileSync(new URL('./audits/belmont-2026-10-25-fullcard-public-results-crosscheck.json',import.meta.url),'utf8'));
test('original private PDF has nine PP races and 80 unique program entries',()=>{
 assert.equal(original.source.pdf_pages,24);
 assert.equal(original.source.bytes,1635111);
 assert.equal(original.races.length,9);
 assert.equal(original.races.reduce((sum,r)=>sum+r.pp_entry_count,0),80);
 assert.equal(original.total_pp_entries,80);
 for(const r of original.races){
  assert.equal(r.programs.length,r.pp_entry_count);
  assert.equal(new Set(r.programs).size,r.pp_entry_count);
  assert.equal(r.production_importer_confirmed,false);
  assert.equal(r.official_starters_confirmed,false);
 }
});
test('original source program rosters exactly match frozen card source rosters',()=>{
 for(const r of original.races){
  const ref=reference.races.find(x=>x.race===r.race);
  assert.ok(ref);
  assert.deepEqual(r.programs,ref.saved_roster_programs);
 }
});
test('race 9 source has both AEs, not just archived dashboard starters',()=>{
 const r9=original.races[8];
 assert.ok(r9.programs.includes('13'));
 assert.ok(r9.programs.includes('14'));
 assert.ok(reference.races[8].missing_published_starters_from_dashboard.includes('13'));
});
test('independent source extraction is not claimed as official chart or production replay',()=>{
 assert.equal(original.source.original_private_pdf_committed,false);
 assert.match(original.status,/NOT_PRODUCTION_REPLAY/);
 assert.ok(original.races.every(r=>!r.production_importer_confirmed&&!r.official_starters_confirmed));
});
