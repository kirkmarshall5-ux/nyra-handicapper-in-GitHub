import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ledger = JSON.parse(readFileSync(new URL('./audits/issue74-bel1025-certification-ledger.json', import.meta.url), 'utf8'));

test('Issue #74 original October 25 pilot stays ungradeable without independent evidence', () => {
  assert.equal(ledger.issue, 74);
  assert.equal(ledger.scope.pilot, 'BEL-2026-10-25');
  assert.equal(ledger.scope.pilot_races, 9);
  assert.equal(ledger.races.length, 9);
  assert.deepEqual(ledger.races.map(r => r.race), [1,2,3,4,5,6,7,8,9]);
  assert.equal(ledger.source_pdf.production_pdfjs_replay_executed, false);
  assert.equal(ledger.freeze.independent_before_post_anchor_verified, false);
  for (const race of ledger.races) {
    assert.equal(race.prospective_gradeable, false, `R${race.race} must not be certified from historical freeze`);
    assert.equal(race.pre_race_anchor_verified, false, `R${race.race} has no verified external pre-off anchor`);
    assert.equal(race.pre_race_full_field_rankings_verified, false, `R${race.race} rankings incomplete`);
    assert.equal(race.independent_anchor_evidence_uri, null);
  }
});

test('Issue #74 chart links remain unresolved until verified individually', () => {
  assert.equal(ledger.chart_source.individual_chart_urls_verified, false);
  assert.equal(ledger.chart_source.individual_chart_ids_verified, false);
  for (const race of ledger.races) {
    assert.equal(race.official_chart_url, null);
    assert.equal(race.official_chart_id, null);
    assert.equal(race.official_chart_manually_reviewed, true);
    assert.equal(race.pp_to_official_starter_identity_verified, true);
  }
});
