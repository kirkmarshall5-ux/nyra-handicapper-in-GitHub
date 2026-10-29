import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const load = name => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const result = load('./audits/belmont-2026-10-25-r9-nyra-results-crosscheck.json');
const source = load('./audits/belmont-2026-10-25-r9-brisnet-source-identity.json');
const field = load('./audits/belmont-2026-10-25-r9-field.json');

const sorted = xs => [...xs].sort((a,b)=>Number(a)-Number(b));

test('public NYRA result programs reconcile to 14 source identities and field manifest', () => {
  assert.equal(result.status, 'PUBLIC_NYRA_RESULT_CROSSCHECKED_NOT_CERTIFIED');
  assert.equal(result.pp_source.sha256, source.source.sha256);
  assert.deepEqual(sorted(source.entries.map(e=>e.program)), sorted(field.entries.map(e=>e.program)));
  assert.deepEqual(sorted(result.official_field.starter_programs), sorted(field.entries.filter(e=>e.status==='STARTER').map(e=>e.program)));
  assert.deepEqual(sorted(result.official_field.scratched_programs), sorted(field.entries.filter(e=>e.status==='SCRATCHED').map(e=>e.program)));
  assert.deepEqual(result.official_field.finish_order_programs, field.entries.filter(e=>e.status==='STARTER').sort((a,b)=>a.finish_position-b.finish_position).map(e=>e.program));
  assert.equal(new Set(result.official_field.finish_order_programs).size, 12);
});

test('archived missing starter and independent evidence keep race ungradeable', () => {
  const starters = new Set(result.official_field.starter_programs);
  const ranked = result.archived_freeze.dashboard_ranked_programs;
  assert.equal(new Set(ranked).size, ranked.length);
  assert.ok(ranked.every(program=>starters.has(program)));
  assert.deepEqual([...starters].filter(program=>!ranked.includes(program)), ['13']);
  assert.equal(result.reconciliation.source_to_model_field_parity, false);
  assert.equal(result.reconciliation.prospective_gradeable, false);
  assert.equal(result.reconciliation.independent_pre_post_time_anchor_verified, false);
  assert.equal(result.reconciliation.independently_signed_official_chart_verified, false);
  assert.equal(result.pp_source.production_pdfjs_replay_verified, false);
});
