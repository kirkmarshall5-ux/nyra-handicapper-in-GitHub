import test from 'node:test';
import assert from 'node:assert/strict';
import {comparePrintedHistory} from './research-source-importer-reconcile.js';
test('flags printed history missing from importer, preserving dates',()=>{const r=comparePrintedHistory({horse:'Runner A',life_starts:3,dates:['2026-10-01','2026-09-01']},{horse:'Runner A',dates:['2026-10-01']});assert.equal(r.classification,'PARTIAL_IMPORT_DATE_MISMATCH');assert.deepEqual(r.missingDates,['2026-09-01']);});
test('zero source transcription does not mean first time starter',()=>{assert.equal(comparePrintedHistory({horse:'Runner',life_starts:4,dates:[]},{horse:'Runner',dates:[]}).classification,'SOURCE_LINES_NOT_TRANSCRIBED');});
test('first time starter and mismatched identity remain distinct',()=>{assert.equal(comparePrintedHistory({horse:'A',life_starts:0,dates:[]},{horse:'A',dates:[]}).classification,'GENUINE_FIRST_TIME_STARTER');assert.equal(comparePrintedHistory({horse:'A',life_starts:2,dates:['2026-09-01']},{horse:'B',dates:['2026-09-01']}).classification,'IDENTITY_MISMATCH');});

test('rejects source section contamination when printed dates exceed career starts',()=>{const r=comparePrintedHistory({horse:'A',life_starts:1,dates:['2026-10-01','2026-09-01']},{horse:'A',dates:['2026-10-01','2026-09-01']});assert.equal(r.classification,'SOURCE_SECTION_BOUNDARY_UNVERIFIED');});
test('does not accept historical lines for a first time starter',()=>{const r=comparePrintedHistory({horse:'A',life_starts:0,dates:['2026-09-01']},{horse:'A',dates:[]});assert.equal(r.classification,'SOURCE_FTS_HISTORY_CONTRADICTION');});
