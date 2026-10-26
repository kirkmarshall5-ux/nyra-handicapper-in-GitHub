import test from 'node:test';
import assert from 'node:assert/strict';
import {convertDisplayedModel} from './pre-race-provider-adapter.js';
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
