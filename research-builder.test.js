import test from 'node:test';import assert from 'node:assert/strict';import {previewBudget,quoteCapture,money,timestamp,preRaceFreeze,sealedResearchExport} from './research-builder.js';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const b={cash:300,dailyStaked:0,outstandingBets:0,alreadyBet:false};
const now=Date.parse('2026-10-07T17:07:00Z'),input={card:{id:'test',sourceName:'fixture.pdf'},race:{date:'2026-10-07',track:'Belmont Park',race:1,horses:[{n:'3',name:'Runner'}]},rating:{model_id:'V44C-test',decision:'RATEABLE',rankings:[{n:'3',name:'Runner',v44c_rank:1,v44c_unrounded_score:80}],pass_reasons:[]},horseNumber:'3',odds:'5/2',sourceId:'synthetic-test-only',evidenceRef:'synthetic-test-only',quoteTime:'2026-10-07T13:06:30-04:00',postTime:'2026-10-07T13:10:00-04:00',now,observedLive:true,finalFieldVerified:true,surfaceVerified:true,budget:previewBudget(b)};
const modelFixtures={contenderRating:{model_id:'CONTENDER-V2-test',decision:'RATEABLE',rankings:[{n:'3',name:'Runner',score:1.234}]},mix1Rating:{model_id:'MIX1-test',decision:'RATEABLE',rankings:[{n:'3',name:'Runner',score:78.5}]}};
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

test('late manual submissions cannot backfill a supposedly pre-race quote',()=>{
 const late=quoteCapture({...input,now:Date.parse('2026-10-07T17:11:00Z')});
 assert.equal(late.record,null);assert.ok(late.errors.some(e=>e.includes('before the scheduled post time')));
});
test('freeze captures the full field before post and rejects post-race or unverified snapshots',()=>{
 const p={card:input.card,race:input.race,rating:input.rating,...modelFixtures,postTime:input.postTime,now,finalFieldVerified:true,surfaceVerified:true};
 const {freeze,errors}=preRaceFreeze(p);assert.deepEqual(errors,[]);assert.equal(freeze.decision,'PASS');assert.equal(freeze.activeField.length,1);assert.equal(freeze.rankingSnapshot[0].rank,1);assert.equal(freeze.untouchedStatus,'NOT_INDEPENDENTLY_VERIFIED');
 assert.equal(freeze.schemaVersion,2);assert.deepEqual(Object.keys(freeze.models),['V44C','CONTENDER','MIX1']);assert.equal(freeze.models.CONTENDER.rankings[0].rawScore,1.234);assert.equal(freeze.models.MIX1.rankings[0].rawScore,78.5);assert.equal(freeze.models.V44C.fullFieldRanked,true);
 assert.equal(preRaceFreeze({...p,now:Date.parse('2026-10-07T17:10:00Z')}).freeze,null);
 assert.equal(preRaceFreeze({...p,finalFieldVerified:false}).freeze,null);
 assert.equal(preRaceFreeze({...p,postTime:'2026-10-08T13:10:00-04:00'}).freeze,null);
});
test('export digest covers exact records and frozen rankings, and changes on tampering',async()=>{
  const freezes=[preRaceFreeze({card:input.card,race:input.race,rating:input.rating,...modelFixtures,postTime:input.postTime,now,finalFieldVerified:true,surfaceVerified:true}).freeze];
  const records=[quoteCapture(input).record];
  const sealed=await sealedResearchExport({records,freezes,exportedAt:'2026-10-07T17:08:00Z'});
  const payload={schemaVersion:2,mode:'RESEARCH_ONLY',records,freezes};
  assert.equal(sealed.recordsDigestSha256,createHash('sha256').update(JSON.stringify(payload)).digest('hex'));
  assert.equal(sealed.anchorStatus,'UNVERIFIED_LOCAL_EXPORT');
  const modified=await sealedResearchExport({records,freezes:[{...freezes[0],raceDecision:'PASS_TAMPERED'}],exportedAt:'2026-10-07T17:08:00Z'});
  assert.notEqual(modified.recordsDigestSha256,sealed.recordsDigestSha256);
});

test('three-model freeze fails closed on missing, inconsistent, or invented model data',()=>{
 const p={card:input.card,race:input.race,rating:input.rating,...modelFixtures,postTime:input.postTime,now,finalFieldVerified:true,surfaceVerified:true};
 assert.equal(preRaceFreeze({...p,contenderRating:null}).freeze,null);
 assert.equal(preRaceFreeze({...p,mix1Rating:{...p.mix1Rating,rankings:[{n:'99',name:'Not in field',score:80}]}}).freeze,null);
 assert.equal(preRaceFreeze({...p,contenderRating:{...p.contenderRating,rankings:[]}}).freeze,null);
 const pass={...p,rating:{...p.rating,decision:'PASS',rankings:[],pass_reasons:['missing-evidence']},contenderRating:{...p.contenderRating,decision:'PASS',provisional:true,rankings:[]},mix1Rating:{...p.mix1Rating,decision:'PASS',provisional:true,rankings:[]}};
 const frozen=preRaceFreeze(pass).freeze;
 assert.equal(frozen.decision,'PASS');assert.equal(frozen.models.MIX1.provisional,true);assert.equal(frozen.models.MIX1.fullFieldRanked,false);
 assert.equal(frozen.models.V44C.fullFieldRanked,false);
 const tamper={...p,mix1Rating:{...p.mix1Rating,rankings:[{...p.mix1Rating.rankings[0],score:NaN}]}};
 assert.equal(preRaceFreeze(tamper).freeze,null);
});

test('frozen three-model scores do not mutate and each model is covered by SHA-256',async()=>{
 const p={card:input.card,race:input.race,rating:input.rating,...modelFixtures,postTime:input.postTime,now,finalFieldVerified:true,surfaceVerified:true};
 const {freeze,errors}=preRaceFreeze(p);assert.deepEqual(errors,[]);
 const original=freeze.models.MIX1.rankings[0].rawScore;
 p.mix1Rating.rankings[0].score=999;
 assert.equal(freeze.models.MIX1.rankings[0].rawScore,original);
 p.mix1Rating.rankings[0].score=78.5;
 const digest=async f=>(await sealedResearchExport({records:[],freezes:[f],exportedAt:'2026-10-07T17:08:00Z'})).recordsDigestSha256;
 const baseline=await digest(freeze);
 for(const name of ['V44C','CONTENDER','MIX1']){
  const changed=structuredClone(freeze);changed.models[name].rankings[0].rawScore+=1;
  assert.notEqual(await digest(changed),baseline,name+' changes must invalidate anchored digest');
 }
});
test('web freeze UI supplies three actual model outputs, not synthetic fallback rankings',()=>{
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 assert.match(html,/initResearchBuilder\(\(\)=>\{const native=rankBrisnetModels\(race\),rating=native\?\.v44c\|\|currentRating\(\);return \{card:activeCard,race,rating,contenderRating:native\?\.contender\|\|rankContenders\(race,rating,/);
 assert.match(html,/mix1Rating:native\?\.mix1\|\|rankMix1\(race,rating,/);
 assert.match(html,/Freeze All 3 Models/);
});

test('native Brisnet snapshots retain three distinct model versions and partial-field PASS',async()=>{
 const {rankBrisnetModels}=await import('./brisnet-models.js');
 const race={...input.race,surface:'Dirt',distance_furlongs:8,ratings_provider:'BRISNET',horses:[
  {n:'3',name:'Runner',life_starts:1,ratings:{provider:'BRISNET',lines:[{date:'2026-09-20',speed:80,e1:85,e2:90,late:80,surface:'Dirt',furlongs:8,source:{provider:'BRISNET',page:1,text:'synthetic verified fixture'}}]}},
  {n:'4',name:'Debut',life_starts:0,ratings:{provider:'BRISNET',lines:[]}}
 ]};
 const m=rankBrisnetModels(race);
 const {freeze,errors}=preRaceFreeze({card:input.card,race,rating:m.v44c,contenderRating:m.contender,mix1Rating:m.mix1,postTime:input.postTime,now,finalFieldVerified:true,surfaceVerified:true});
 assert.deepEqual(errors,[]);assert.equal(freeze.decision,'PASS');
 for(const [key,kind]of [['V44C','v44c'],['CONTENDER','contender'],['MIX1','mix1']]){
  assert.equal(freeze.models[key].modelId,m[kind].model_id);
  assert.equal(freeze.models[key].rankings.length,1);
  assert.equal(freeze.models[key].rankings[0].rawScore,m[kind].rankings[0].score);
  assert.equal(freeze.models[key].fullFieldRanked,false);
  assert.equal(freeze.models[key].decision,'PASS');
 }
});
