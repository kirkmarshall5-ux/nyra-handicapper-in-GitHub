import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessRaceGradeability} from './race-gradeability-evidence.js';
const field=JSON.parse(readFileSync(new URL('./audits/belmont-2026-10-25-r9-field.json',import.meta.url)));
test('Oct 25 Race 9 cannot be graded from incomplete original field',()=>{
 const a=assessRaceGradeability({field,rankedPrograms:field.archived_freeze_evidence.dashboard_field_programs});
 assert.equal(a.gradeable,false);
 assert.deepEqual(a.missingStarters,['13']);
 assert.deepEqual(a.extraRanked,[]);
 assert.equal(a.starterCount,12);
 assert.equal(a.rankedCount,11);
 assert.ok(a.reasons.includes('MISSING_OFFICIAL_STARTER_IN_RANKED_FIELD'));
 assert.ok(a.reasons.includes('INDEPENDENT_FREEZE_TIME_UNVERIFIED'));
});
test('corrected field still cannot be graded without independent timing, chart and PDF replay',()=>{
 const starters=field.entries.filter(e=>e.status==='STARTER').map(e=>e.program);
 const a=assessRaceGradeability({field,rankedPrograms:starters});
 assert.equal(a.gradeable,false);
 assert.deepEqual(a.missingStarters,[]);
 assert.ok(a.reasons.includes('OFFICIAL_CHART_FINISH_UNVERIFIED'));
});
test('complete independent evidence can pass, duplicates and nonstarters cannot',()=>{
 const starters=field.entries.filter(e=>e.status==='STARTER').map(e=>e.program);
 const flags={field,originalPdfReplayVerified:true,officialChartFinishVerified:true,independentFreezeTimeVerified:true};
 assert.equal(assessRaceGradeability({...flags,rankedPrograms:starters}).gradeable,true);
 assert.ok(assessRaceGradeability({...flags,rankedPrograms:[...starters,'1']}).reasons.includes('NONSTARTER_IN_RANKED_FIELD'));
 assert.ok(assessRaceGradeability({...flags,rankedPrograms:[...starters,'13']}).reasons.includes('DUPLICATE_RANKED_PROGRAM'));
});
