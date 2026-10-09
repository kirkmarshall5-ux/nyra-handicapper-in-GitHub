import test from 'node:test';import assert from 'node:assert/strict';import {previewBudget,quoteCapture,money,timestamp} from './research-builder.js';
const b={cash:300,dailyStaked:0,outstandingBets:0,alreadyBet:false};
const now=Date.parse('2026-10-07T17:07:00Z'),input={card:{id:'test',sourceName:'fixture.pdf'},race:{date:'2026-10-07',track:'Belmont Park',race:1,horses:[{n:'3',name:'Runner'}]},rating:{decision:'RATEABLE',rankings:[{n:'3',name:'Runner',v44c_rank:1,v44c_unrounded_score:80}],pass_reasons:[]},horseNumber:'3',odds:'5/2',sourceId:'synthetic-test-only',evidenceRef:'synthetic-test-only',quoteTime:'2026-10-07T13:06:30-04:00',postTime:'2026-10-07T13:10:00-04:00',now,observedLive:true,finalFieldVerified:true,surfaceVerified:true,budget:previewBudget(b)};
test('fixed $2 preview respects cash, exposure, outstanding and duplicate boundaries',()=>{
 assert.equal(previewBudget(b).cashAfterPreview,298);assert.equal(previewBudget({...b,cash:242,dailyStaked:28}).allowed,true);
 for(const patch of [{cash:241.99},{dailyStaked:28.01},{dailyStaked:-1},{outstandingBets:1},{alreadyBet:true},{cash:NaN},{floor:NaN},{cap:-1}])assert.equal(previewBudget({...b,...patch}).allowed,false);
 assert.equal(previewBudget({...b,cap:40}).policyOverride,true);
});
test('money rejects blanks, exponential and excessive precision; timestamps require explicit zones',()=>{
 for(const v of ['',-1,'Infinity','1e3','1.999'])assert.equal(money(v),null);assert.equal(money('300.25'),300.25);
 for(const t of ['2026-10-07T13:10','2026-02-30T13:10:00Z','2026-10-07T24:00:00Z'])assert.equal(timestamp(t),null);assert.equal(timestamp('2026-10-07T13:10:00-04:00'),Date.parse(input.postTime));
});
test('capture preserves source/timing and frozen ranks but cannot manufacture calibration or a wager',()=>{
 const {record,errors}=quoteCapture({...input,probabilityCalibrated:true,winProbability:.9,decision:'BET'});assert.deepEqual(errors,[]);
 assert.equal(record.decision,'PASS');assert.equal(record.automatedStake,0);assert.equal(record.winProbability,null);assert.equal(record.probabilityCalibrated,false);assert.equal(record.quoteEvidenceVerified,false);assert.equal(record.quoteTimingEligible,true);assert.equal(record.netOdds,2.5);
 input.rating.rankings[0].v44c_unrounded_score=81;assert.equal(record.rankingSnapshot[0].rawScore,80);input.rating.rankings[0].v44c_unrounded_score=80;
});
test('bad identity, conditional/scratched horses, malformed odds and future quote fail capture',()=>{
 for(const patch of [{horseNumber:'9'},{odds:'2/1/4'},{observedLive:false},{evidenceRef:''},{quoteTime:'2026-10-07T17:07:01Z'},{postTime:'2026-10-08T13:10:00-04:00'}])assert.equal(quoteCapture({...input,...patch}).record,null);
 for(const patch of [{odds:'SCR'},{included_in_frozen_field:false}])assert.equal(quoteCapture({...input,race:{...input.race,horses:[{...input.race.horses[0],...patch}]}}).record,null);
});
test('quotes at or after recorded post time are rejected before saving',()=>{
 for(const quoteTime of ['2026-10-07T13:10:00-04:00','2026-10-07T13:10:01-04:00','2026-10-07T13:11:00-04:00']){
  const result=quoteCapture({...input,quoteTime,now:Date.parse('2026-10-07T17:12:00Z')});
  assert.equal(result.record,null);
  assert.ok(result.errors.some(e=>e.includes('before the recorded post time')));
 }
 const valid=quoteCapture({...input,quoteTime:'2026-10-07T13:09:59-04:00',now:Date.parse('2026-10-07T17:09:59Z')});
 assert.deepEqual(valid.errors,[]);
 assert.equal(valid.record.decision,'PASS');
});

test('stale, late and PASS-race observations remain auditable, never become wagers',()=>{
 const a=quoteCapture({...input,quoteTime:'2026-10-07T13:00:00-04:00'}).record;assert.equal(a.quoteTimingEligible,false);assert.equal(a.decision,'PASS');
 const r=quoteCapture({...input,rating:{decision:'PASS',rankings:[],pass_reasons:[{reason:'FTS-unrated'}]}}).record;assert.equal(r.selectionFrozen,false);assert.equal(r.rank,null);assert.equal(r.racePassReasons[0].reason,'FTS-unrated');
});

test('program-less PPs cannot capture quotes; recorded model matches the frozen rating',()=>{
 const missing=quoteCapture({...input,horseNumber:'',race:{...input.race,horses:[{n:'',name:'Runner'}]}});assert.equal(missing.record,null);
 const {record}=quoteCapture({...input,rating:{...input.rating,model_id:'release-version-test'}});assert.equal(record.model,'release-version-test');
});
