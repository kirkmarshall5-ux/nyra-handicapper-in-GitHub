import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const audit=JSON.parse(readFileSync(new URL('./audits/belmont-2026-10-25-r9-field.json',import.meta.url),'utf8'));
test('BEL 2026-10-25 R9 source-anchored final field contains 12 starters, 2 scratches and Cocoa Mills #13',()=>{
 assert.equal(audit.date,'2026-10-25');assert.equal(audit.race,9);
 assert.equal(audit.entries.length,14);assert.equal(new Set(audit.entries.map(h=>h.program)).size,14);
 const starters=audit.entries.filter(h=>h.status==='STARTER'),scratches=audit.entries.filter(h=>h.status==='SCRATCHED');
 assert.equal(starters.length,12);assert.equal(scratches.length,2);
 assert.deepEqual(scratches.map(h=>h.program),['1','14']);
 assert.equal(starters.find(h=>h.program==='13')?.name,'Cocoa Mills');
 assert.deepEqual(starters.map(h=>h.finish_position).sort((a,b)=>a-b),Array.from({length:12},(_,i)=>i+1));
 assert.equal(audit.runner_count,starters.length);assert.equal(audit.scratch_count,scratches.length);
 assert.ok(audit.source_evidence.official_entries.includes('nyra.com'));
 assert.ok(audit.source_evidence.official_scratches.includes('nyra.com'));
});
test('BEL R9 remains ungradeable without original PP identity and frozen predictions',()=>{
 assert.equal(audit.original_pp_identity_verified,false);
 assert.equal(audit.model_input_parity_verified,false);
 assert.equal(audit.genuine_pre_race_freeze_verified,false);
 assert.equal(audit.official_chart_finish_verified,false);
 assert.equal(audit.prospective_gradeable,false);
});

test('Archived October 25 freeze flags drawn-in AE #13 missing from historical model field',()=>{
 const freeze=audit.archived_freeze_evidence;
 assert.equal(freeze.clock_source,'browser-device-unverified');
 assert.equal(freeze.roster_programs.length,14);
 assert.equal(freeze.dashboard_field_programs.length,11);
 const actual=audit.entries.filter(h=>h.status==='STARTER').map(h=>h.program);
 const missing=actual.filter(n=>!freeze.dashboard_field_programs.includes(n));
 assert.deepEqual(missing,['13']);
 assert.deepEqual(freeze.missing_official_starter_programs,missing);
 for(const n of Object.values(freeze.model_ranked_counts))assert.equal(n,11);
 assert.equal(audit.model_input_parity_verified,false);
 assert.equal(audit.prospective_gradeable,false);
});
