import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditIssue74} from './scripts/check-issue74-certification.mjs';
const ledger=JSON.parse(readFileSync(new URL('./audits/issue74-bel1025-certification-ledger.json',import.meta.url),'utf8'));
const claimedComplete=()=>{
 const l=structuredClone(ledger);
 l.chart_source.review_status='ALL_CHARTS_MANUALLY_VERIFIED';
 l.source_pdf.production_pdfjs_replay_executed=true;
 l.freeze.independent_before_post_anchor_verified=true;
 for(const r of l.races){
  r.known_discrepancies=[];
  r.official_chart_url='https://example.org/synthetic-not-official';
  r.official_chart_id='SYNTHETIC';
  for(const key of ['official_chart_manually_reviewed','official_post_time_verified',
    'official_surface_distance_verified','official_scratch_ae_mto_verified',
    'official_finish_and_corrections_verified','pp_to_official_starter_identity_verified',
    'pre_race_full_field_rankings_verified','pass_action_record_verified','pre_race_anchor_verified'])r[key]=true;
  r.independent_anchor_evidence_uri='https://example.org/synthetic-anchor';
  r.pre_race_anchor_observed_at_utc='2026-10-25T16:00:00Z';
  r.official_post_at_utc='2026-10-25T23:00:00Z';
 }
 return l;
};
test('R1-R4 permanently blocked even if all review flags, URLs and discrepancies are altered',()=>{
 const result=auditIssue74(claimedComplete());
 assert.equal(result.evidence_ready_count,5);
 assert.equal(result.certified,0);
 for(const r of result.races.slice(0,4))
  assert.ok(r.blockers.some(x=>x.includes('permanently non-prospective')));
});
test('tampering with frozen source capture time cannot make past races prospective',()=>{
 const l=claimedComplete();l.freeze.browser_recorded_at_utc='2026-10-25T12:00:00Z';
 const result=auditIssue74(l);
 assert.equal(result.evidence_ready_count,0);
 assert.ok(result.races.every(r=>r.blockers.some(x=>x.includes('capture time changed'))));
});
test('tampering with source SHA256 blocks every race',()=>{
 const l=claimedComplete();l.freeze.sha256='0'.repeat(64);
 const result=auditIssue74(l);
 assert.equal(result.evidence_ready_count,0);
 assert.ok(result.races.every(r=>r.blockers.some(x=>x.includes('SHA-256 changed'))));
});
test('tampering with published off minute blocks that race',()=>{
 const l=claimedComplete();l.races[4].equibase_published_off_time_local='2026-10-25 19:00 EDT';
 const result=auditIssue74(l);
 assert.ok(result.races[4].blockers.some(x=>x.includes('off-minute observation modified')));
});
