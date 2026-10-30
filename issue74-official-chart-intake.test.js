import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectOfficialChartIntake} from './scripts/issue74-official-chart-intake.mjs';
const card=JSON.parse(readFileSync(new URL('./audits/belmont-2026-10-25-fullcard-public-results-crosscheck.json',import.meta.url),'utf8'));
const source=card.races[0];
const identities=r=>r.saved_roster_programs.map(program=>({program,name:'Synthetic Horse '+program}));
const inspect=(r,a)=>inspectOfficialChartIntake(r,a,identities(r));
const synthetic=()=>({
 race:1,date:'2026-10-25',track:'Belmont Park',officialChartUrl:'https://tvg.equibase.com/static/chart/pdf/SYNTHETIC-NOT-A-REAL-CHART.pdf',
 officialChartId:'SYNTHETIC-NOT-A-REAL-CHART',manuallyReviewed:true,reviewer:'synthetic-test',
 reviewedAtUtc:'2026-10-29T13:00:00Z',offAtUtc:'2026-10-25T17:12:00Z',
 surface:'dirt',distance:'6 furlongs',chartCorrectionsReviewed:true,deadHeatsReviewed:true,
 disqualificationsReviewed:true,coupledEntriesReviewed:true,aeMtoScratchesReviewed:true,
 entries:source.saved_roster_programs.map(program=>({program,name:'Synthetic Horse '+program})),officialNonstarterPrograms:[],
 officialFinishOrderPrograms:[...source.finish_order_programs]
});
test('no supplied official chart must not be silently substituted with public results',()=>{
 const result=inspectOfficialChartIntake(source,null);
 assert.equal(result.status,'AWAITING_MANUAL_OFFICIAL_CHART');
});
test('synthetic fully populated intake is structurally complete, NEVER prospective certified',()=>{
 const result=inspect(source,synthetic());
 assert.equal(result.status,'OFFICIAL_CHART_INTAKE_STRUCTURALLY_COMPLETE_NOT_AUTHENTICATED');
 assert.equal(result.prospectiveGradeable,false);
});
test('missing runner and duplicate program are blocked',()=>{
 const a=synthetic();a.entries.pop();
 assert.match(inspect(source,a).errors.join(' '),/do not reconcile exactly/);
 const b=synthetic();b.entries[1].program=b.entries[0].program;
 assert.match(inspect(source,b).errors.join(' '),/Duplicate chart program/);
});
test('starter and scratch cannot overlap',()=>{
 const a=synthetic();a.officialNonstarterPrograms=['1'];
 assert.match(inspect(source,a).errors.join(' '),/Starter\/nonstarter overlap/);
});
test('chart corrections, dead heats, DQs and AE/MTO require review',()=>{
 const a=synthetic();a.chartCorrectionsReviewed=false;a.deadHeatsReviewed=false;
 a.disqualificationsReviewed=false;a.aeMtoScratchesReviewed=false;
 const e=inspect(source,a).errors.join(' ');
 for(const label of ['Chart corrections','Dead heats','Disqualifications','AE/MTO'])assert.ok(e.includes(label));
});
test('official chart mismatch is flagged, not silently overwritten',()=>{
 const a=synthetic();a.officialFinishOrderPrograms.reverse();
 const result=inspect(source,a);
 assert.equal(result.status,'OFFICIAL_CHART_INTAKE_WITH_DISCREPANCIES');
 assert.ok(result.warnings.some(x=>x.includes('differs from published')));
});
test('R9 omitted actual starter remains flagged even with synthetic complete intake',()=>{
 const r9=card.races[8],a=synthetic();a.race=9;
 a.entries=r9.finish_order_programs.map(program=>({program,name:'Synthetic Horse '+program}));
 a.officialNonstarterPrograms=[...r9.published_nonstarters];
 a.officialFinishOrderPrograms=[...r9.finish_order_programs];
 const result=inspect(r9,a);
 assert.equal(result.status,'OFFICIAL_CHART_INTAKE_WITH_DISCREPANCIES');
 assert.ok(result.warnings.some(x=>x.includes('omitted starter(s): 13')));
 assert.equal(result.prospectiveGradeable,false);
});

test('program-only official chart must fail even if numbers match',()=>{
 const a=synthetic();a.entries=a.entries.map(({program})=>({program}));
 const result=inspect(source,a);
 assert.equal(result.status,'MANUAL_REVIEW_REQUIRED');
 assert.ok(result.errors.some(x=>x.includes('starter name missing')));
});
test('horse-name mismatch at same program must fail closed',()=>{
 const a=synthetic();a.entries[0].name='Different Horse';
 const result=inspect(source,a);
 assert.equal(result.status,'MANUAL_REVIEW_REQUIRED');
 assert.ok(result.errors.some(x=>x.includes('horse-name mismatch #1')));
});
test('missing original PP horse-name manifest cannot certify even with chart names',()=>{
 const result=inspectOfficialChartIntake(source,synthetic());
 assert.equal(result.status,'MANUAL_REVIEW_REQUIRED');
 assert.ok(result.errors.some(x=>x.includes('identity evidence missing')));
});
test('duplicate and incomplete source identities fail closed',()=>{
 const a=synthetic(),ids=identities(source);
 ids[1].program=ids[0].program;
 const result=inspectOfficialChartIntake(source,a,ids);
 assert.ok(result.errors.some(x=>x.includes('Duplicate original PP')));
 assert.ok(result.errors.some(x=>x.includes('does not cover complete source roster')));
});

test('unrelated HTTPS domains cannot masquerade as official Equibase charts',()=>{
 for(const url of [
  'https://example.org/manual-chart',
  'https://equibase.com.evil.example/chart',
  'https://fakeequibase.com/chart',
  'https://equibase.com@evil.example/chart',
  'http://tvg.equibase.com/chart',
  'https://user:password@tvg.equibase.com/chart',
  'javascript:alert(1)'
 ]){
  const a=synthetic();a.officialChartUrl=url;
  const result=inspect(source,a);
  assert.equal(result.status,'MANUAL_REVIEW_REQUIRED',url);
  assert.ok(result.errors.some(e=>e.includes('Equibase publisher domain')),url);
 }
});
test('publisher URL only passes structural source check, never authenticates charts',()=>{
 const a=synthetic();
 const result=inspect(source,a);
 assert.equal(result.status,'OFFICIAL_CHART_INTAKE_STRUCTURALLY_COMPLETE_NOT_AUTHENTICATED');
 assert.equal(result.prospectiveGradeable,false);
});
