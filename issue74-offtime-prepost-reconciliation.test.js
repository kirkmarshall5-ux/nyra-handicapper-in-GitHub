import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditIssue74} from './scripts/check-issue74-certification.mjs';
const ledger=JSON.parse(readFileSync(new URL('./audits/issue74-bel1025-certification-ledger.json',import.meta.url),'utf8'));
test('Equibase published off minutes classify 1-4 as after post and 5-9 as earlier but unauthenticated',()=>{
 const freeze=Date.parse(ledger.freeze.browser_recorded_at_utc);
 assert.equal(ledger.races.length,9);
 for(const r of ledger.races){
  const local=r.equibase_published_off_time_local;
  assert.match(local,/^2026-10-25 \d{2}:\d{2} EDT$/);
  const t=Date.parse(local.replace(' EDT',':00-04:00').replace(' ','T'));
  assert.ok(Number.isFinite(t));
  assert.equal(r.freeze_time_vs_published_off_minute,r.race<=4?'AFTER_PUBLISHED_OFF_MINUTE_NOT_PROSPECTIVE':'BEFORE_PUBLISHED_OFF_MINUTE_UNAUTHENTICATED');
  assert.equal(freeze>=t,r.race<=4);
  assert.equal(r.official_post_time_verified,true); // publisher off-minute confirmed; exact seconds not attested
  assert.equal(r.official_post_at_utc,null);
  assert.equal(r.prospective_gradeable,false);
 }
});
test('published off minutes do not authenticate original freeze or override gate',()=>{
 assert.equal(ledger.freeze.independent_before_post_anchor_verified,false);
 assert.equal(auditIssue74(ledger).certified,0);
 assert.ok(ledger.races.slice(0,4).every(r=>r.known_discrepancies.some(s=>s.includes('permanently ineligible'))));
});
