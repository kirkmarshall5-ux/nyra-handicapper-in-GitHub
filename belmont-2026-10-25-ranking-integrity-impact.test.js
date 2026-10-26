import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const audit=read('./audits/belmont-2026-10-25-r9-ranking-integrity-impact.json');
const field=read('./audits/belmont-2026-10-25-r9-field.json');
const freeze=read('./audits/belmont-2026-10-25-r9-drf-freeze-identity.json');
test('historical ranked field omitted exactly one official starter',()=>{
 const official=field.entries.filter(x=>x.status==='STARTER').map(x=>x.program);
 assert.deepEqual(audit.historical.official_starter_programs,official);
 assert.deepEqual(audit.historical.archived_ranked_programs,freeze.archived_freeze.dashboard_field_programs);
 assert.deepEqual(official.filter(x=>!audit.historical.archived_ranked_programs.includes(x)),audit.historical.missing_ranked_starter_programs);
 assert.deepEqual(audit.historical.missing_ranked_starter_programs,['13']);
 assert.equal(audit.historical.gradeable,false);
 for(const count of Object.values(audit.historical.model_ranked_counts))assert.equal(count,11);
});
test('later 12/12 display is not mislabeled as an original frozen performance result',()=>{
 const qa=freeze.reconciliation.physical_ipad_2026_10_26;
 assert.equal(audit.corrected_visual_qa.program13_drf_contender_rank,qa.program13_drf_contender_rank);
 assert.equal(audit.corrected_visual_qa.program13_drf_finisher_rank,qa.program13_drf_finisher_rank);
 assert.equal(audit.corrected_visual_qa.program13_brisnet_rank,null);
 assert.equal(audit.corrected_visual_qa.status,'POST_RACE_DISPLAY_ONLY');
 assert.equal(field.prospective_gradeable,false);
 assert.equal(field.genuine_pre_race_freeze_verified,false);
});
