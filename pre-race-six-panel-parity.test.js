import test from 'node:test';
import assert from 'node:assert/strict';
import {convertDisplayedModel,unratedRunnerEvidence,runnerRatingCoverage} from './pre-race-provider-adapter.js';
import {freezeResearchSnapshot,sealResearchSnapshots,verifyResearchExport} from './pre-race-provider-freeze.js';

const field=[{program:'1',horse:'Alpha'},{program:'2',horse:'Beta'}];
const rows=[{n:'2',name:'Beta',score:87},{n:'1',name:'Alpha',score:80}];
const raw=(status='RATEABLE')=>({model_id:'test-model',decision:status,rankings:structuredClone(rows)});
test('six panel identities, ordering, scores and provider tags match source outputs',()=>{
 for(const provider of ['BRISNET','DRF'])for(const family of ['V44C','CONTENDER','FINISHER']){
  const result=family==='FINISHER'?{model_id:'finisher',status:'COMPLETE_FIELD',rankings:structuredClone(rows)}:raw(provider==='BRISNET'?'PASS':'RATEABLE');
  const frozen=convertDisplayedModel(family,result,field,provider);
  assert.deepEqual(frozen.rankings,[{program:'2',horse:'Beta',score:87},{program:'1',horse:'Alpha',score:80}]);
  assert.equal(frozen.provider,provider);
  assert.equal(frozen.family,family);
  assert.equal(frozen.decision,provider==='BRISNET'?'PASS':'RATEABLE');
 }
});
test('Finisher HOLD is never mislabeled PASS',()=>{
 const frozen=convertDisplayedModel('FINISHER',{model_id:'finisher',status:'HOLD',rankings:[]},field,'DRF');
 assert.equal(frozen.decision,'HOLD');
 assert.equal(frozen.fullFieldRanked,false);
});
test('partial fields must not be marked fully rateable',()=>{
 const result=raw();result.rankings.pop();
 assert.throws(()=>convertDisplayedModel('CONTENDER',result,field,'DRF'),/incomplete RATEABLE/);
});
test('rejects changed runner, duplicate, ineligible or unscored output',()=>{
 for(const changed of [
  [{n:'2',name:'Wrong',score:87}],
  [{n:'3',name:'Other',score:87}],
  [{n:'1',name:'Alpha',score:70},{n:'1',name:'Alpha',score:70}],
  [{n:'2',name:'Beta',score:null}],
 ]){
  assert.throws(()=>convertDisplayedModel('V44C',{model_id:'v',decision:'PASS',rankings:changed},field,'BRISNET'),/differs from displayed eligible field|verified score/);
 }
});
test('V4.4c preserves exact unrounded source score',()=>{
 const result=raw();result.rankings[0].v44c_unrounded_score=87.123456;
 assert.equal(convertDisplayedModel('V44C',result,field,'DRF').rankings[0].score,87.123456);
});


test('panel adapter preserves PASS and HOLD rankings without promoting decisions',()=>{
 for(const provider of ['BRISNET','DRF'])for(const family of ['V44C','CONTENDER'])for(const decision of ['PASS','HOLD']){
  const result=raw(decision);
  const frozen=convertDisplayedModel(family,result,field,provider);
  assert.equal(frozen.decision,decision);
  assert.equal(frozen.fullFieldRanked,false);
  assert.deepEqual(frozen.rankings,[{program:'2',horse:'Beta',score:87},{program:'1',horse:'Alpha',score:80}]);
 }
});

test('panel adapter never reorders tied scores or rounds decimal evidence',()=>{
 const tied={model_id:'v',decision:'RATEABLE',rankings:[{n:'2',name:'Beta',score:87.125},{n:'1',name:'Alpha',score:87.125}]};
 const frozen=convertDisplayedModel('V44C',tied,field,'DRF');
 assert.deepEqual(frozen.rankings,[{program:'2',horse:'Beta',score:87.125},{program:'1',horse:'Alpha',score:87.125}]);
});

test('panel adapter rejects missing model identifier or invalid decision',()=>{
 assert.throws(()=>convertDisplayedModel('V44C',{decision:'RATEABLE',rankings:rows},field,'DRF'),/model unavailable/);
 assert.throws(()=>convertDisplayedModel('CONTENDER',{model_id:'x',decision:'UNKNOWN',rankings:rows},field,'DRF'),/decision unavailable/);
});


test('six panels survive freeze, seal and export verification without ranking or decision drift',async()=>{
 const now=Date.parse('2026-10-19T15:00:00Z');
 const records=[];
 for(const provider of ['BRISNET','DRF']){
  const models=['V44C','CONTENDER','FINISHER'].map((family,i)=>{
   const decision=i===0?'RATEABLE':i===1?'PASS':'HOLD';
   const rawResult=family==='FINISHER'
    ?{model_id:provider+'-finisher',status:'HOLD',rankings:structuredClone(rows)}
    :{model_id:provider+'-'+family,decision,rankings:structuredClone(rows)};
   return convertDisplayedModel(family,rawResult,field,provider);
  });
  const snapshot={provider,cardId:provider+'-fixture',track:'Finger Lakes',date:'2026-10-19',race:1,parserVersion:'synthetic-test',sourceName:provider+'.pdf',scheduledPost:'2026-10-19T16:00:00Z',postTimeEvidence:{scheduledPost:'2026-10-19T16:00:00Z',verification:'USER_CONFIRMED_OFFICIAL_REFERENCE_NOT_INDEPENDENTLY_ANCHORED',sourceUrl:'https://example.org/post'},fieldVerified:true,surfaceVerified:true,surface:'Dirt',field:structuredClone(field),models};
  const frozen=freezeResearchSnapshot({snapshot,existing:records,now});
  assert.deepEqual(frozen.errors,[]);
  assert.deepEqual(frozen.record.models,models);
  assert.equal(frozen.record.bettingDecision,'PASS');
  records.push(frozen.record);
 }
 assert.equal(records.length,2);
 assert.equal(records.reduce((n,r)=>n+r.models.length,0),6);
 const exported=await sealResearchSnapshots(records);
 const checked=await verifyResearchExport(exported);
 assert.deepEqual(checked.errors,[]);
 assert.equal(checked.valid,true);
 assert.equal(checked.independentlyTimestamped,false);
 assert.deepEqual(exported.records,records);
});

test('Finisher recorder matches actual Race Day PASS when baseline V4.4c passes',()=>{
 const complete={model_id:'finisher',status:'COMPLETE_FIELD',rankings:structuredClone(rows)};
 const frozen=convertDisplayedModel('FINISHER',complete,field,'DRF',{baselineDecision:'PASS'});
 assert.equal(frozen.decision,'PASS');
 assert.equal(frozen.fullFieldRanked,false);
 assert.deepEqual(frozen.rankings,[{program:'2',horse:'Beta',score:87},{program:'1',horse:'Alpha',score:80}]);
 const normal=convertDisplayedModel('FINISHER',complete,field,'DRF',{baselineDecision:'RATEABLE'});
 assert.equal(normal.decision,'RATEABLE');
});

test('recorder excludes scratched and inactive also-eligible runners while preserving active identities',()=>{
 const activeField=[{program:'1',horse:'Runner One'},{program:'13',horse:'Drawn In'}];
 const result={model_id:'native-v44c',decision:'PASS',rankings:[
  {n:'13',name:'Drawn In',score:72.125},
  {n:'1',name:'Runner One',score:70.5}
 ]};
 const frozen=convertDisplayedModel('V44C',result,activeField,'BRISNET');
 assert.deepEqual(frozen.rankings.map(h=>h.program),['13','1']);
 assert.equal(frozen.decision,'PASS');
 for(const invalid of [
  {...result,rankings:[...result.rankings,{n:'14',name:'Inactive AE',score:65}]},
  {...result,rankings:[...result.rankings,{n:'2',name:'Scratched',score:65}]}
 ])assert.throws(()=>convertDisplayedModel('V44C',invalid,activeField,'BRISNET'),/differs from displayed eligible field/);
});
test('recorder refuses provider contamination when rankings come from other card',()=>{
 const drfField=[{program:'3',horse:'DRF Runner'}];
 const brisnetResult={model_id:'brisnet-v44c',decision:'PASS',rankings:[{n:'3',name:'Different Runner',score:80}]};
 assert.throws(()=>convertDisplayedModel('V44C',brisnetResult,drfField,'DRF'),/differs from displayed eligible field/);
});

test('DRF PASS provisional ranking retains rated runners without changing PASS decision',()=>{
 const provisional={model_id:'V44C-data-integrity-rankings-20261007-v2',decision:'PASS',rankings:[
  {n:'4',name:'Rated Runner',score:81.375}
 ]};
 const field=[{program:'4',horse:'Rated Runner'},{program:'5',horse:'First Time Starter'}];
 const recorded=convertDisplayedModel('V44C',provisional,field,'DRF');
 assert.equal(recorded.decision,'PASS');
 assert.equal(recorded.fullFieldRanked,false);
 assert.deepEqual(recorded.rankings,[{program:'4',horse:'Rated Runner',score:81.375}]);
});

test('unrated horse evidence retains verified FTS and does not guess other causes',()=>{
 const runners={horses:[
  {n:'4',name:'Rated Runner',life_starts:3},
  {n:'5',name:'Debut Horse',life_starts:0},
  {n:'6',name:'Unknown Horse'}
 ]};
 const models=[{family:'V44C',rankings:[{program:'4',horse:'Rated Runner',score:81}]}];
 const all=[{program:'4',horse:'Rated Runner'},{program:'5',horse:'Debut Horse'},{program:'6',horse:'Unknown Horse'}];
 const unrated=unratedRunnerEvidence(runners,all,models,'DRF');
 assert.deepEqual(unrated.map(h=>h.program),['5','6']);
 assert.equal(unrated[0].firstTimeStarter,true);
 assert.match(unrated[0].reasons.join(' '),/First-time starter/);
 assert.equal(unrated[1].classification,'UNDETERMINED');
 assert.match(unrated[1].reasons.join(' '),/inspect source PP/);
});

test('five rated runners with only four shown are not misclassified as unrated',async()=>{
 const field=Array.from({length:6},(_,i)=>({program:String(i+1),horse:'Source Runner '+(i+1)}));
 const race={horses:field.map((h,i)=>({n:h.program,name:h.horse,life_starts:i===5?0:3}))};
 const displayed=field.slice(0,4).map((h,i)=>({program:h.program,horse:h.horse,score:90-i}));
 const baseline={runners:race.horses.map((h,i)=>({...h,base_rating:i===5?null:90-i,parser_blockers:[]}))};
 const models=['V44C','CONTENDER','FINISHER'].map(family=>({family,modelId:'source-'+family,decision:'PASS',provider:'DRF',fullFieldRanked:false,rankings:displayed}));
 const coverage=runnerRatingCoverage(race,field,models,'DRF',{baseline});
 assert.deepEqual(coverage.ratedNotDisplayed.map(h=>h.program),['5']);
 assert.deepEqual(coverage.unratedRunners.map(h=>h.program),['6']);
 assert.equal(coverage.unratedRunners[0].firstTimeStarter,true);
 const now=Date.parse('2026-10-19T15:00:00Z');
 const snapshot={provider:'DRF',cardId:'real-source-shaped-coverage',track:'Belmont Park',date:'2026-10-19',race:1,parserVersion:'test',sourceName:'source.pdf',scheduledPost:'2026-10-19T16:00:00Z',postTimeEvidence:{scheduledPost:'2026-10-19T16:00:00Z',verification:'USER_CONFIRMED_OFFICIAL_REFERENCE_NOT_INDEPENDENTLY_ANCHORED',sourceUrl:'https://www.nyra.com/'},fieldVerified:true,surfaceVerified:true,surface:'Dirt',field,models,...coverage};
 const frozen=freezeResearchSnapshot({snapshot,now});
 assert.deepEqual(frozen.errors,[]);
 const exported=await sealResearchSnapshots([frozen.record]);
 assert.equal((await verifyResearchExport(exported)).valid,true);
 const corrupted=structuredClone(exported);
 corrupted.records[0].ratedNotDisplayed[0].horse='Different';
 assert.equal((await verifyResearchExport(corrupted)).valid,false);
 const mislabeled=structuredClone(snapshot);
 mislabeled.unratedRunners.push({program:'5',horse:'Source Runner 5',reasons:['incorrectly labeled']});
 assert.match(freezeResearchSnapshot({snapshot:mislabeled,now}).errors.join(' '),/conflicts/);
});
