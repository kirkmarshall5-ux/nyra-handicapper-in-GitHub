import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectOfficialChartIntake} from './scripts/issue74-official-chart-intake.mjs';
const card=JSON.parse(readFileSync(new URL('./audits/belmont-2026-10-25-fullcard-public-results-crosscheck.json',import.meta.url),'utf8'));
const source=card.races[0];
const synthetic=()=>({
 race:1,date:'2026-10-25',track:'Belmont Park',officialChartUrl:'https://example.org/manual-chart',
 officialChartId:'SYNTHETIC-NOT-A-REAL-CHART',manuallyReviewed:true,reviewer:'synthetic-test',
 reviewedAtUtc:'2026-10-29T13:00:00Z',offAtUtc:'2026-10-25T17:12:00Z',
 surface:'dirt',distance:'6 furlongs',chartCorrectionsReviewed:true,deadHeatsReviewed:true,
 disqualificationsReviewed:true,coupledEntriesReviewed:true,aeMtoScratchesReviewed:true,
 entries:source.saved_roster_programs.map(program=>({program})),officialNonstarterPrograms:[],
 officialFinishOrderPrograms:[...source.finish_order_programs]
});
test('no supplied official chart must not be silently substituted with public results',()=>{
 const result=inspectOfficialChartIntake(source,null);
 assert.equal(result.status,'AWAITING_MANUAL_OFFICIAL_CHART');
});
test('synthetic fully populated intake is structurally complete, NEVER prospective certified',()=>{
 const result=inspectOfficialChartIntake(source,synthetic());
 assert.equal(result.status,'OFFICIAL_CHART_INTAKE_STRUCTURALLY_COMPLETE_NOT_AUTHENTICATED');
 assert.equal(result.prospectiveGradeable,false);
});
test('missing runner and duplicate program are blocked',()=>{
 const a=synthetic();a.entries.pop();
 assert.match(inspectOfficialChartIntake(source,a).errors.join(' '),/do not reconcile exactly/);
 const b=synthetic();b.entries[1].program=b.entries[0].program;
 assert.match(inspectOfficialChartIntake(source,b).errors.join(' '),/Duplicate chart program/);
});
test('starter and scratch cannot overlap',()=>{
 const a=synthetic();a.officialNonstarterPrograms=['1'];
 assert.match(inspectOfficialChartIntake(source,a).errors.join(' '),/Starter\/nonstarter overlap/);
});
test('chart corrections, dead heats, DQs and AE/MTO require review',()=>{
 const a=synthetic();a.chartCorrectionsReviewed=false;a.deadHeatsReviewed=false;
 a.disqualificationsReviewed=false;a.aeMtoScratchesReviewed=false;
 const e=inspectOfficialChartIntake(source,a).errors.join(' ');
 for(const label of ['Chart corrections','Dead heats','Disqualifications','AE/MTO'])assert.ok(e.includes(label));
});
test('official chart mismatch is flagged, not silently overwritten',()=>{
 const a=synthetic();a.officialFinishOrderPrograms.reverse();
 const result=inspectOfficialChartIntake(source,a);
 assert.equal(result.status,'OFFICIAL_CHART_INTAKE_WITH_DISCREPANCIES');
 assert.ok(result.warnings.some(x=>x.includes('differs from published')));
});
test('R9 omitted actual starter remains flagged even with synthetic complete intake',()=>{
 const r9=card.races[8],a=synthetic();a.race=9;
 a.entries=r9.finish_order_programs.map(program=>({program}));
 a.officialNonstarterPrograms=[...r9.published_nonstarters];
 a.officialFinishOrderPrograms=[...r9.finish_order_programs];
 const result=inspectOfficialChartIntake(r9,a);
 assert.equal(result.status,'OFFICIAL_CHART_INTAKE_WITH_DISCREPANCIES');
 assert.ok(result.warnings.some(x=>x.includes('omitted starter(s): 13')));
 assert.equal(result.prospectiveGradeable,false);
});
