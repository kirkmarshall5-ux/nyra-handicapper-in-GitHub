import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessCertificationReadiness} from './certification-readiness.js';
const field=JSON.parse(readFileSync(new URL('./audits/belmont-2026-10-25-r9-field.json',import.meta.url)));
test('Oct 25 R9 historical pre-race freeze cannot be certified or silently repaired',()=>{
 const a=assessCertificationReadiness({raceId:'BEL-2026-10-25-R9',field,rankedPrograms:field.archived_freeze_evidence.dashboard_field_programs});
 assert.equal(a.status,'NOT_CERTIFIED');assert.equal(a.certified,false);
 assert.deepEqual(a.missingStarters,['13']);assert.equal(a.starterCount,12);assert.equal(a.rankedCount,11);
 assert.ok(a.blockers.includes('ORIGINAL_PDF_REPLAY_UNVERIFIED'));
 assert.ok(a.blockers.includes('OFFICIAL_CHART_FINISH_UNVERIFIED'));
 assert.ok(a.blockers.includes('INDEPENDENT_FREEZE_TIME_UNVERIFIED'));
});
test('corrected post-race field still cannot create historical prospective certification',()=>{
 const rankedPrograms=field.entries.filter(e=>e.status==='STARTER').map(e=>e.program);
 const a=assessCertificationReadiness({raceId:'BEL-2026-10-25-R9',field,rankedPrograms});
 assert.equal(a.certified,false);assert.deepEqual(a.missingStarters,[]);
 assert.ok(a.blockers.includes('INDEPENDENT_FREEZE_TIME_UNVERIFIED'));
});
test('untrusted caller verification booleans do not authorize certification',()=>{
 const rankedPrograms=field.entries.filter(e=>e.status==='STARTER').map(e=>e.program);
 const raceId='BEL-2026-10-25-R9',record={raceId,predictionArtifactId:'test'};
 const evidence={raceId,predictionArtifactId:'test',rankedPrograms,field,originalPdfReplayVerified:true,officialChartFinishVerified:true,independentFreezeTimeVerified:true};
 const a=assessCertificationReadiness({raceId,field,rankedPrograms,record,evidence,productionPdfReplayPassed:true,officialFinishIndependentlyMatched:true,postTimeIndependentlyVerified:true});
 assert.equal(a.certified,false);
 assert.ok(a.blockers.includes('EVIDENCE_PROVENANCE_MISSING'));
});
