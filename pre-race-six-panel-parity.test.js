import test from 'node:test';
import assert from 'node:assert/strict';
import {convertDisplayedModel} from './pre-race-provider-adapter.js';

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
