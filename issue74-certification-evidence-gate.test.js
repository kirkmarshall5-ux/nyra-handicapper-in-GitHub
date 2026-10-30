import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {auditIssue74} from './scripts/check-issue74-certification.mjs';
const ledger=JSON.parse(fs.readFileSync(new URL('./audits/issue74-bel1025-certification-ledger.json',import.meta.url),'utf8'));
test('October 25 pilot remains blocked until full official chart, pdfjs and independent timestamps',()=>{
 const result=auditIssue74(ledger);
 assert.equal(result.total,9);
 assert.equal(result.certified,0);
 assert.equal(result.blocked,9);
 assert.equal(result.certification_status,'CERTIFICATION_BLOCKED');
 assert.ok(result.races.every(r=>r.original_decision==='PASS'));
 assert.ok(result.races.every(r=>r.blockers.some(b=>b.includes('before-post'))));
});
test('a chart index URL cannot certify an individual race',()=>{
 const fake=structuredClone(ledger);
 fake.chart_source.review_status='ALL_CHARTS_MANUALLY_VERIFIED';
 fake.source_pdf.production_pdfjs_replay_executed=true;
 fake.freeze.independent_before_post_anchor_verified=true;
 fake.races.forEach(r=>{
  r.official_chart_manually_reviewed=true;
  r.official_post_time_verified=true;
  r.official_surface_distance_verified=true;
  r.official_scratch_ae_mto_verified=true;
  r.official_finish_and_corrections_verified=true;
  r.pp_to_official_starter_identity_verified=true;
  r.pre_race_full_field_rankings_verified=true;
  r.pre_race_anchor_verified=true;
 });
 const result=auditIssue74(fake);
 assert.equal(result.certified,0);
 assert.ok(result.races.every(r=>r.blockers.includes('Missing official_chart_url')));
 assert.ok(result.races.every(r=>r.blockers.some(b=>b.includes('Independent timestamp evidence URL'))));
});
test('a timestamp after official off time must never certify a race',()=>{
 const fake=structuredClone(ledger);
 fake.chart_source.review_status='ALL_CHARTS_MANUALLY_VERIFIED';
 fake.source_pdf.production_pdfjs_replay_executed=true;
 fake.freeze.independent_before_post_anchor_verified=true;
 fake.races.forEach(r=>{
  r.known_discrepancies=[];
  r.official_chart_url='https://example.org/chart';
  r.official_chart_id='example-chart';
  r.official_chart_manually_reviewed=true;
  r.official_post_time_verified=true;
  r.official_surface_distance_verified=true;
  r.official_scratch_ae_mto_verified=true;
  r.official_finish_and_corrections_verified=true;
  r.pp_to_official_starter_identity_verified=true;
  r.pre_race_full_field_rankings_verified=true;
  r.pre_race_anchor_verified=true;
  r.independent_anchor_evidence_uri='https://example.org/anchor';
  r.pre_race_anchor_observed_at_utc='2026-10-25T19:04:47Z';
  r.official_post_at_utc='2026-10-25T18:00:00Z';
 });
 assert.equal(auditIssue74(fake).certified,0);
});
test('reject duplicate or invalid race IDs',()=>{
 const fake=structuredClone(ledger);
 fake.races[8].race=1;
 assert.throws(()=>auditIssue74(fake),/Duplicate or invalid/);
});

test('even fully asserted HTTPS links and manual flags are not independent certification',()=>{
 const fake=structuredClone(ledger);
 fake.chart_source.review_status='ALL_CHARTS_MANUALLY_VERIFIED';
 fake.source_pdf.production_pdfjs_replay_executed=true;
 fake.freeze.independent_before_post_anchor_verified=true;
 fake.races.forEach(r=>{
  r.known_discrepancies=[];
  r.official_chart_url='https://example.org/not-an-official-chart';
  r.official_chart_id='self-asserted';
  r.official_chart_manually_reviewed=true;
  r.official_post_time_verified=true;
  r.official_surface_distance_verified=true;
  r.official_scratch_ae_mto_verified=true;
  r.official_finish_and_corrections_verified=true;
  r.pp_to_official_starter_identity_verified=true;
  r.pre_race_full_field_rankings_verified=true;
  r.pre_race_anchor_verified=true;
  r.independent_anchor_evidence_uri='https://example.org/not-an-anchor';
  r.pre_race_anchor_observed_at_utc='2026-10-25T12:00:00Z';
  r.official_post_at_utc='2026-10-25T18:00:00Z';
  r.prospective_gradeable=false;
 });
 const report=auditIssue74(fake);
 assert.equal(report.evidence_ready_count,0);
 assert.equal(report.certified,0);
 assert.equal(report.blocked,9);
 assert.equal(report.certification_status,'CERTIFICATION_BLOCKED');
 assert.ok(report.races.slice(0,4).every(r=>!r.evidence_complete&&!r.certified));
 assert.ok(report.races.slice(4).every(r=>!r.evidence_complete&&!r.certified));
 assert.ok(report.races.every(r=>r.blockers.some(b=>b.includes('Equibase publisher URL'))));
});

test('pre-freeze timestamp receipt cannot attest a later original freeze',()=>{
 const fake=structuredClone(ledger);
 fake.races[4].official_chart_url='https://tvg.equibase.com/static/chart/pdf/BEL102526USA.html';
 fake.races[4].pre_race_anchor_observed_at_utc='2026-10-25T19:00:00Z';
 fake.races[4].official_post_at_utc='2026-10-25T19:25:12Z';
 const r=auditIssue74(fake).races[4];
 assert.ok(r.blockers.some(b=>b.includes('predates the historical freeze')));
});
test('claimed official off timestamp must match independently published minute',()=>{
 const fake=structuredClone(ledger);
 fake.races[4].official_post_at_utc='2026-10-25T19:40:00Z';
 const r=auditIssue74(fake).races[4];
 assert.ok(r.blockers.some(b=>b.includes('disagrees with published off minute')));
});
test('plausible publisher links and timestamps remain assertions, never certification',()=>{
 const fake=structuredClone(ledger);
 fake.chart_source.review_status='ALL_CHARTS_MANUALLY_VERIFIED';
 fake.source_pdf.production_pdfjs_replay_executed=true;
 fake.freeze.independent_before_post_anchor_verified=true;
 fake.races.forEach((r,i)=>{
  r.known_discrepancies=[];
  r.official_chart_url='https://tvg.equibase.com/static/chart/pdf/BEL102526USA.html';
  r.official_chart_id='UNVERIFIED-ASSERTION';
  for(const field of ['official_chart_manually_reviewed','official_post_time_verified','official_surface_distance_verified','official_scratch_ae_mto_verified','official_finish_and_corrections_verified','pp_to_official_starter_identity_verified','pre_race_full_field_rankings_verified','pre_race_anchor_verified'])r[field]=true;
  r.independent_anchor_evidence_uri='https://example.org/unverified-anchor';
  r.pre_race_anchor_observed_at_utc='2026-10-25T19:04:48Z';
  r.official_post_at_utc=[
    '2026-10-25T17:12:30Z','2026-10-25T17:45:30Z','2026-10-25T18:18:30Z',
    '2026-10-25T18:51:30Z','2026-10-25T19:25:30Z','2026-10-25T20:00:30Z',
    '2026-10-25T20:40:30Z','2026-10-25T21:15:30Z','2026-10-25T21:53:30Z'][i];
 });
 const report=auditIssue74(fake);
 assert.equal(report.evidence_ready_count,5);
 assert.equal(report.certified,0);
 assert.equal(report.blocked,9);
 assert.ok(report.races.slice(0,4).every(r=>r.blockers.some(b=>b.includes('permanently non-prospective'))));
});
