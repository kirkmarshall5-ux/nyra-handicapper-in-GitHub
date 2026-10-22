import test from 'node:test';
import assert from 'node:assert/strict';
import {brisnetPaceDisplay,brisnetPaceMapHtml,brisnetCallRanksHtml,brisnetComparisonHtml,brisnetEvidenceHtml} from './brisnet-pace-display.js';
import {rankBrisnetModels} from './brisnet-models.js';
import {displayPaceStyle} from './runner-display.js';
const line=(over={})=>({date:'2026-09-20',surface:'Dirt',furlongs:8,e1:87,e2:85,late:79,speed:73,source:{provider:'BRISNET',page:1,text:'Verified test source'},...over});
const horse=(n,lines=[line()],over={})=>({n:String(n),name:'Horse '+n,life_starts:lines.length,odds:'—',ratings:{provider:'BRISNET',run_style:'E/P',quirin_points:5,lines},...over});
const race=horses=>({date:'2026-10-16',surface:'Dirt',distance_furlongs:8,ratings_provider:'BRISNET',horses});
test('unmatched sprint figures remain visible as context without route pace ranks',()=>{
 const r=race([horse(1,[line({furlongs:6})])]),m=brisnetPaceDisplay(r);
 assert.equal(m.rows[0].early,null);assert.equal(m.leaders.e2.length,0);
 assert.match(brisnetEvidenceHtml(m),/87<\/td><td>85<\/td><td>79/);
 assert.match(brisnetEvidenceHtml(m),/Unmatched - context only/);
 assert.match(brisnetPaceMapHtml(m),/Brisnet E\/P/);
 assert.match(brisnetCallRanksHtml(m),/No qualifying pace line/);
});
test('latest available metric uses its own date; turn index stays on a single line',()=>{
 const r=race([horse(1,[line({e1:null}),line({date:'2026-08-20',e1:80,e2:83,late:90})])]);
 const m=brisnetPaceDisplay(r),h=m.rows[0];
 assert.equal(h.metrics.e1.date,'2026-08-20');assert.equal(h.metrics.e2.date,'2026-09-20');
 assert.equal(h.metrics.turn.value,3);assert.equal(h.metrics.turn.date,'2026-08-20');
 const native=rankBrisnetModels(r);
 assert.equal(native.contender.rankings[0].raw_features[6],h.early);
 assert.equal(native.contender.rankings[0].raw_features[7],h.late);
 assert.equal(native.mix1.rankings[0].raw_features.early,h.early);
});
test('surface, category, half furlong, age, calendar and future gates exclude incomparable history',()=>{
 for(const patch of [{surface:'Turf'},{furlongs:7.5},{furlongs:9},{date:'2025-10-15'},{date:'2026-02-30'},{date:'2026-10-16'},{date:'2026-10-17'}]){
  assert.equal(brisnetPaceDisplay(race([horse(1,[line(patch)])])).rows[0].matched,0,JSON.stringify(patch));
 }
 assert.equal(brisnetPaceDisplay(race([horse(1,[line({furlongs:8.5})])])).rows[0].matched,1);
});
test('ties share rank, zero is real and missing is never zero',()=>{
 const m=brisnetPaceDisplay(race([horse(1),horse(2),horse(3,[line({e2:0})]),horse(4,[line({e2:null})])]));
 assert.deepEqual(m.leaders.e2.map(h=>[h.n,h.rank,h.value]),[['1',1,85],['2',1,85],['3',3,0]]);
 assert.equal(m.rows[3].early,null);
});
test('FTS and unverified career remain Unknown even with injected figures, styles and Timeform fields',()=>{
 for(const starts of [0,null]){
 const h=horse(1,[line()],{life_starts:starts,tfEarly:120,tfLate:100});
 const m=brisnetPaceDisplay(race([h]));assert.equal(m.rows[0].early,null);assert.equal(m.rows[0].style,'Unknown');assert.equal(displayPaceStyle(h),'Unknown');
 }
 assert.equal(displayPaceStyle(horse(2)),'E/P');
});
test('latest five actual starts preserved; scratches and conditional entries excluded; display is nonmutating',()=>{
 const lines=[line({date:'2026-10-01',furlongs:6}),line({date:'2026-09-01',furlongs:6}),line({date:'2026-08-01',furlongs:6}),line({date:'2026-07-01',furlongs:6}),line({date:'2026-06-01',furlongs:6}),line({date:'2026-05-01'})];
 const r=race([horse(1,lines),horse(2,undefined,{odds:'SCR'}),horse(3,undefined,{entry_status:'AE'}),horse(4,undefined,{included_in_frozen_field:false})]);
 const before=JSON.stringify(r),m=brisnetPaceDisplay(r);assert.equal(m.rows.length,1);assert.equal(m.rows[0].matched,0);assert.equal(JSON.stringify(r),before);
});
test('sprint early is E1, route early is E2; model use labels distinguish all three engines',()=>{
 const r=race([horse(1,[line({furlongs:6})])]);r.distance_furlongs=6;
 const m=brisnetPaceDisplay(r);assert.equal(m.rows[0].early,87);
 const native=rankBrisnetModels(r);assert.equal(native.mix1.rankings[0].raw_features.early,87);
 assert.match(brisnetEvidenceHtml(m),/V4.4c-Brisnet base: no pace weight/);
 assert.match(brisnetEvidenceHtml(m),/MIX1: E1 only/);
});

test('clean pace layout keeps comparable dates, styles, ranks and Unknown without changing model results',()=>{
 const r=race([horse(1,[line({e1:null}),line({date:'2026-08-20',e1:80,e2:83})]),horse(2,[line({furlongs:6})]),horse(3,[],{life_starts:0})]);
 const before=structuredClone(r),rankings=rankBrisnetModels(r),m=brisnetPaceDisplay(r),comparison=brisnetComparisonHtml(m),overview=brisnetPaceMapHtml(m,{compact:true});
 assert.doesNotMatch(overview,/<table/);assert.match(overview,/Comparable pace leaders/);assert.match(overview,/Unknown style/);
 assert.equal((comparison.match(/<table/g)||[]).length,1);assert.match(comparison,/E\/P/);assert.match(comparison,/Early points/);assert.match(comparison,/2026-08-20/);assert.match(comparison,/2026-09-20/);assert.match(comparison,/Unknown/);
 assert.deepEqual(r,before);assert.deepEqual(rankBrisnetModels(r),rankings);
});
test('source-only evidence retains unmatched latest start and preserves original detailed renderer',()=>{
 const m=brisnetPaceDisplay(race([horse(1,[line({furlongs:6})])])),compact=brisnetEvidenceHtml(m,{sourceOnly:true});
 assert.equal((compact.match(/<table/g)||[]).length,1);assert.match(compact,/Unmatched - context only/);assert.match(compact,/87<\/td><td>85<\/td><td>79/);assert.doesNotMatch(compact,/Early model input/);
 assert.match(brisnetEvidenceHtml(m),/Early model input/);assert.match(brisnetCallRanksHtml(m),/Turn rank \/ index/);
});

test('nonqualifying historical pace has a distinct label from absent figures and first-time starters',()=>{
 const r=race([horse(1,[line({furlongs:6})]),horse(2,[line({furlongs:6,e1:null,e2:null,late:null})]),horse(3,[line({furlongs:6})],{life_starts:0})]);
 const before=JSON.stringify(r),native=rankBrisnetModels(r),m=brisnetPaceDisplay(r);
 for(const render of [brisnetComparisonHtml,brisnetCallRanksHtml]){
  const html=render(m),rows=html.split('<tbody>')[1].split('</tr>');
  assert.equal((rows[0].match(/<td>No qualifying pace line<\/td>/g)||[]).length,4);
  assert.equal((rows[1].match(/<td>Unknown<\/td>/g)||[]).length,4);
  assert.match(rows[2],/(<td>Unknown<\/td>){4}$/);
 }
 assert.equal(m.rows[0].early,null);assert.equal(m.rows[0].late,null);
 assert.equal(JSON.stringify(r),before);assert.deepEqual(rankBrisnetModels(r),native);
});
