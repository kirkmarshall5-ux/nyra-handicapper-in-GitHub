import test from 'node:test';
import assert from 'node:assert/strict';
import {historicalSnapshot,importHistoricalSnapshot,evaluateHistoricalRace,evaluateHistoricalCard,summarizeHistorical} from './historical-results.js';
import {historicalReportHtml,historicalStarterSelection} from './historical-results-ui.js';
const d={"schema":"nyra-race-dashboard-v1","race":{"track":"Synthetic Test Track","date":"2024-08-31","number":1,"surface":"Dirt","distance":"6F"},"field":[{"n":"1","name":"Demo Alpha"},{"n":"2","name":"Demo Beta"},{"n":"3","name":"Demo Gamma"}],"models":[{"id":"brisResearch","label":"Brisnet-RR","model_id":"SYNTHETIC-brisResearch","validation_status":"PENDING","available":true,"decision":"RATEABLE","rankings":[{"n":"1","name":"Demo Alpha","rank":1,"score":3},{"n":"3","name":"Demo Gamma","rank":2,"score":2},{"n":"2","name":"Demo Beta","rank":3,"score":1}]},{"id":"brisRRV2","label":"RR-V2","model_id":"SYNTHETIC-brisRRV2","validation_status":"PENDING","available":true,"decision":"RATEABLE","rankings":[{"n":"1","name":"Demo Alpha","rank":1,"score":3},{"n":"2","name":"Demo Beta","rank":2,"score":2},{"n":"3","name":"Demo Gamma","rank":3,"score":1}]},{"id":"brisContender","label":"Brisnet Contender","model_id":"SYNTHETIC-brisContender","validation_status":"PENDING","available":true,"decision":"RATEABLE","rankings":[{"n":"2","name":"Demo Beta","rank":1,"score":3},{"n":"1","name":"Demo Alpha","rank":2,"score":2},{"n":"3","name":"Demo Gamma","rank":3,"score":1}]},{"id":"drfContender","label":"DRF Contender Late +50%","model_id":"SYNTHETIC-drfContender","validation_status":"PENDING","available":true,"decision":"RATEABLE","rankings":[{"n":"3","name":"Demo Gamma","rank":1,"score":3},{"n":"2","name":"Demo Beta","rank":2,"score":2},{"n":"1","name":"Demo Alpha","rank":3,"score":1}]}],"prime_power":{"demoalpha":"120.3 (1)","demobeta":"118.2 (2)","demogamma":"110.4 (3)"},"morning_line":{"id":"morningLine","label":"Morning Line","available":true,"rankings":[{"n":"1","name":"Demo Alpha","rank":1},{"n":"2","name":"Demo Beta","rank":2},{"n":"3","name":"Demo Gamma","rank":3}]}};
const clone=x=>structuredClone(x);
const snapshot=()=>historicalSnapshot({dashboards:[clone(d)],capturedAt:'2026-11-16T23:00:00Z'});
const official=()=>({track:d.race.track,date:d.race.date,race:1,surface:'Dirt',distance:'6F',verified:true,sourceRef:'synthetic-fixture-only.pdf',field:clone(d.field),finish:['1','2','3'],win2:8,place2:{1:4,2:3},exactaPay:30,exactaBase:2});
test('historical capture accepts a past card and preserves original data and model versions',()=>{
 const before=JSON.stringify(d),s=snapshot();s.races[0].models[1].rankings[0].name='changed';
 assert.equal(JSON.stringify(d),before);assert.equal(s.kind,'RETROSPECTIVE');assert.match(s.notice,/Not verified pre-race/);
 assert.equal(snapshot().races[0].models[1].model_id,'SYNTHETIC-brisResearch');
});
test('source Prime Power numbers, not printed ranks, determine the active-field order',()=>{
 const s=snapshot(),pp=s.races[0].models[0];assert.equal(pp.id,'primePower');assert.deepEqual(pp.rankings.map(h=>h.n),['1','2','3']);
 const changed=clone(d);changed.prime_power.demoalpha=null;
 const r=historicalSnapshot({dashboards:[changed]}).races[0];const row=evaluateHistoricalRace(r,official())[0];
 assert.equal(row.included,false);assert.equal(row.eligibility.unrated[0].name,'Demo Alpha');assert.equal(row.stake,0);
});
test('place and exacta denominations settle independently; pending validation does not exclude',()=>{
 const rows=evaluateHistoricalRace(snapshot().races[0],official(),'WIN_PLACE_EXACTA'),rr=rows.find(r=>r.model==='brisResearch'),fin=rows.find(r=>r.model==='brisRRV2');
 assert.equal(rr.included,true);assert.equal(rr.stake,6);assert.equal(rr.returned,12);assert.equal(rr.runnerUpRank,3);assert.equal(rr.rrCompanionMiss,true);
 assert.equal(fin.returned,27);assert.equal(fin.exactSecond,true);assert.equal(fin.exactaHit,true);
 assert.equal(summarizeHistorical(rows).find(s=>s.id==='brisRRV2').winning,3);
 assert.equal(summarizeHistorical(rows).find(s=>s.id==='brisRRV2').bets,4);
});
test('both exacta directions are independent bets and the box costs $2 total',()=>{
 const row=evaluateHistoricalRace(snapshot().races[0],official(),'WIN_EXACTA').find(r=>r.model==='brisContender');
 assert.equal(row.stake,4);assert.equal(row.returned,15);assert.equal(row.wagers.length,3);
 assert.equal(row.wagers.find(w=>w.type==='exacta12').returned,0);assert.equal(row.wagers.find(w=>w.type==='exacta21').returned,15);
});
test('win/place strategy does not charge exacta combinations',()=>{
 const r=evaluateHistoricalRace(snapshot().races[0],official(),'WIN_PLACE').find(r=>r.model==='brisResearch');assert.equal(r.stake,4);assert.equal(r.returned,12);assert.equal(r.wagers.length,2);
});
test('PASS and an unranked active runner retain exact reasons and contribute no stake',()=>{
 const s=snapshot(),m=s.races[0].models.find(m=>m.id==='brisResearch');
 m.decision='PASS';m.reason='Latest speed unavailable';m.rankings=m.rankings.filter(h=>h.n!=='2');m.unrated=[{n:'2',name:'Demo Beta',reasons:['Latest verified speed missing']}];
 const r=evaluateHistoricalRace(s.races[0],official()).find(r=>r.model===m.id);assert.equal(r.included,false);assert.equal(r.stake,0);assert.equal(r.eligibility.unrated[0].reasons[0],'Latest verified speed missing');
});
test('unsettled or invalid result remains pending, never a losing bet',()=>{
 const s=snapshot();
 assert.equal(evaluateHistoricalCard(s,{},'WIN_EXACTA').rows.length,0);
 for(const patch of [{verified:false},{track:'Wrong Track'},{date:'2024-09-01'},{surface:'Turf'},{finish:['1','2']},{finish:['1','1','3']},{exactaBase:0},{exactaPay:null},{nonstandard:true},{field:d.field.slice(0,2)}]){
  const out=evaluateHistoricalCard(s,{1:{...official(),...patch}},'WIN_EXACTA');assert.equal(out.rows.length,0);assert.equal(out.pending.length,1);
 }
});
test('place payouts cannot silently become zero and failed races do not affect totals',()=>{
 const o=official();delete o.place2['2'];
 const out=evaluateHistoricalCard(snapshot(),{1:o},'WIN_PLACE_EXACTA');assert.equal(out.summary.length,0);assert.match(out.pending[0].reason,/place payouts/);
 assert.equal(evaluateHistoricalCard(snapshot(),{1:o},'WIN_EXACTA').pending.length,0);
});
test('duplicate races, mixed cards, unknown schemas and coupled entries are rejected',()=>{
 assert.throws(()=>historicalSnapshot({dashboards:[d,d]}),/duplicate/);
 const b=clone(d);b.race.date='2024-09-01';assert.throws(()=>historicalSnapshot({dashboards:[d,b]}),/Mixed/);
 assert.throws(()=>importHistoricalSnapshot({schema:'unknown'}));
 const c=clone(d);c.field[0].n='1A';assert.throws(()=>historicalSnapshot({dashboards:[c]}),/uncoupled/);
});
test('Freeze All Models import retains its capture time and does not certify pre-race evidence',()=>{
 const s=importHistoricalSnapshot({schema:'nyra-local-research-freeze-v1',captured_at_utc:'2026-11-16T21:36:33.250Z',races:[{dashboard:d}]});
 assert.equal(s.capturedAt,'2026-11-16T21:36:33.250Z');assert.match(s.notice,/not certified/);assert.equal(s.races[0].models.length,6);
});
test('PDF/HTML report escapes source text and presents companion misses and wager counts',()=>{
 const s=snapshot();s.track='<script>alert(1)</script>';
 const report=historicalReportHtml(s,evaluateHistoricalCard(s,{1:official()},'WIN_PLACE_EXACTA'),'WIN_PLACE_EXACTA');
 assert.ok(!report.includes('<script>'));assert.match(report,/&lt;script&gt;/);assert.match(report,/Runner-up at #2/);assert.match(report,/RR found the winner/);assert.match(report,/3\/4/);
});

test('historical actual-starter review handles activated AE/MTO runners without changing the live card',()=>{
 const race={...d.race,race:1,horses:[{n:'1',name:'Demo Alpha',odds:'3/1',entry_status:'REGULAR'},{n:'2',name:'Demo Beta',odds:'SCR',entry_status:'MTO',included_in_frozen_field:false}]};
 const cards={BRISNET:{date:d.race.date,track:d.race.track,races:{1:race}}},before=JSON.stringify(cards);
 const out=historicalStarterSelection(cards,'BRISNET',1,['2']);
 assert.equal(out.BRISNET.races[1].horses[0].odds,'SCR');
 assert.equal(out.BRISNET.races[1].horses[1].entry_status,'REGULAR');
 assert.equal(out.BRISNET.races[1].horses[1].included_in_frozen_field,true);
 assert.equal(JSON.stringify(cards),before);
 assert.throws(()=>historicalStarterSelection(cards,'BRISNET',1,['9']),/unique PP/);
});
test('recovery cohort survives freeze and JSON roundtrip; old records stay unknown',()=>{const x=clone(d);x.models[0].recovery_status='RECOVERED';x.models[0].recovery_reasons=[{n:'1',name:'Demo Alpha',reasons:['Missing latest speed']}];const s=importHistoricalSnapshot({schema:'nyra-local-research-freeze-v1',captured_at_utc:'2026-11-16T21:36:33.250Z',races:[{dashboard:x}]});const out=evaluateHistoricalCard(importHistoricalSnapshot(JSON.parse(JSON.stringify(s))),{1:official()});const rr=out.rows.find(r=>r.model==='brisResearch');assert.deepEqual(rr.recovery_reasons,x.models[0].recovery_reasons);assert.equal(out.rrRecoverySummary.find(r=>r.status==='RECOVERED').stake,rr.stake);assert.equal(evaluateHistoricalCard(snapshot(),{1:official()}).rrRecoverySummary.find(r=>r.status==='UNKNOWN').races,1);});
