import test from 'node:test';
import assert from 'node:assert/strict';
import {missingDataCoverage} from './missing-data-coverage.js';
test('coverage report is read-only and excludes scratches',()=>{
 const race={date:'2026-10-21',race:1,horses:[{n:'1',name:'A',life_starts:4,beyer_figures:[75]},{n:'2',name:'B',odds:'SCR'}]};
 const original=structuredClone(race);
 const report=missingDataCoverage(race);
 assert.deepEqual(race,original);
 assert.equal(report.mode,'RESEARCH_ONLY');
 assert.equal(report.fieldCount,1);
 assert.equal(report.runners[0].speedVerified,true);
 assert.ok(report.runners[0].missingEvidence.includes('CONTENDER_SOURCE_EVIDENCE_ABSENT'));
});
test('Brisnet missing comparable pace is reported separately from latest Speed',()=>{
 const race={ratings_provider:'BRISNET',surface:'Dirt',distance_furlongs:6,date:'2026-10-21',horses:[{n:'1',name:'A',life_starts:2,ratings:{provider:'BRISNET',lines:[{speed:75,surface:'Turf',furlongs:6,source:{page:3}}]}}]};
 const report=missingDataCoverage(race);
 assert.equal(report.runners[0].speedVerified,true);
 assert.ok(report.runners[0].missingEvidence.includes('NO_MATCHED_EARLY_PACE'));
 assert.deepEqual(report.runners[0].sourcePages,[3]);
});
