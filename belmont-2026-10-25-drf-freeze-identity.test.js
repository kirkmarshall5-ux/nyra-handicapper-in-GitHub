import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const identity=load('./audits/belmont-2026-10-25-r9-drf-freeze-identity.json');
const field=load('./audits/belmont-2026-10-25-r9-field.json');
test('original DRF Race 9 program/name identities match 14 official entries',()=>{
 const drf=identity.original_drf_pdf.race9_program_name_pairs;
 assert.equal(drf.length,14);
 assert.deepEqual(drf.map(h=>h.program),Array.from({length:14},(_,i)=>String(i+1)));
 assert.deepEqual(drf.map(h=>[h.program,h.name]),field.entries.map(h=>[h.program,h.name]));
 assert.match(identity.original_drf_pdf.sha256,/^[a-f0-9]{64}$/);
 assert.match(identity.archived_freeze.sha256,/^[a-f0-9]{64}$/);
});
test('freeze retains all 14 DRF entrants but its ranked field missed official starter #13',()=>{
 const a=identity.archived_freeze;
 assert.deepEqual(a.roster_programs,identity.original_drf_pdf.race9_program_name_pairs.map(h=>h.program));
 assert.deepEqual(a.dashboard_field_programs,field.archived_freeze_evidence.dashboard_field_programs);
 const actual=field.entries.filter(h=>h.status==='STARTER').map(h=>h.program);
 assert.deepEqual(actual.filter(n=>!a.dashboard_field_programs.includes(n)),['13']);
 assert.deepEqual(identity.reconciliation.missing_official_starter_in_archived_field,['13']);
});
test('iPad 12/12 coverage is recorded as visual QA, not original-PDF replay or grading',()=>{
 const qa=identity.reconciliation.physical_ipad_2026_10_26;
 assert.equal(qa.brisnet_contender,'12/12 eligible runners');
 assert.equal(qa.drf_contender,'12/12 eligible runners');
 assert.equal(qa.drf_finisher,'12/12 eligible runners');
 assert.deepEqual(qa.scratch_programs,['1','14']);
 assert.equal(field.prospective_gradeable,false);
 assert.equal(field.genuine_pre_race_freeze_verified,false);
});
