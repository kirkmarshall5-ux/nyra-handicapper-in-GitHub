import test from 'node:test';
import assert from 'node:assert/strict';
import {freezeResearchSnapshot,sealResearchSnapshots,verifyResearchExport} from './pre-race-provider-freeze.js';
const now=Date.parse('2026-10-19T15:00:00Z');
const fixture=(provider='BRISNET')=>({provider,cardId:provider+'-card',track:'Belmont Park',date:'2026-10-19',race:1,parserVersion:'verified-parser',sourceName:provider+'.pdf',scheduledPost:'2026-10-19T16:00:00Z',postTimeEvidence:{scheduledPost:'2026-10-19T16:00:00Z',verification:'USER_CONFIRMED_OFFICIAL_REFERENCE_NOT_INDEPENDENTLY_ANCHORED',sourceUrl:'https://www.nyra.com/'},fieldVerified:true,surfaceVerified:true,surface:'Dirt',field:[{program:'1',horse:'A'},{program:'2',horse:'B'}],models:['V44C','FINISHER','CONTENDER'].map(family=>({family,provider,modelId:provider+'-'+family,decision:'RATEABLE',fullFieldRanked:true,rankings:[{program:'1',horse:'A',score:75},{program:'2',horse:'B',score:70}]}))});
test('provider isolation, duplicate protection and no bet',()=>{
 const a=freezeResearchSnapshot({snapshot:fixture(),now});assert.deepEqual(a.errors,[]);assert.equal(a.record.bettingDecision,'PASS');
 assert.match(freezeResearchSnapshot({snapshot:fixture(),existing:[a.record],now}).errors.join(' '),/already frozen/);
 assert.deepEqual(freezeResearchSnapshot({snapshot:fixture('DRF'),existing:[a.record],now}).errors,[]);
});
test('post time, missing model, incomplete full field fail closed',()=>{
 assert.match(freezeResearchSnapshot({snapshot:fixture(),now:now+3600000}).errors.join(' '),/at or after/);
 const missing=fixture();missing.models=[];assert.match(freezeResearchSnapshot({snapshot:missing,now}).errors.join(' '),/model families/);
 const partial=fixture();partial.models[0].rankings.pop();assert.match(freezeResearchSnapshot({snapshot:partial,now}).errors.join(' '),/complete active field/);
});
test('scratch and source field mismatches rejected',()=>{
 const x=fixture();x.models[0].rankings[1].program='3';assert.match(freezeResearchSnapshot({snapshot:x,now}).errors.join(' '),/ineligible/);
 const y=fixture();y.fieldVerified=false;assert.match(freezeResearchSnapshot({snapshot:y,now}).errors.join(' '),/Verify official/);
});
test('digest deterministic and anchored only externally',async()=>{
 const a=await sealResearchSnapshots([fixture()]),b=await sealResearchSnapshots([fixture()]);
 assert.equal(a.digestSha256,b.digestSha256);assert.equal(a.digestSha256.length,64);
 assert.equal(a.anchorStatus,'UNVERIFIED_LOCAL_EXPORT');
});

test('post-time evidence missing or mismatched fails closed',()=>{const a=fixture();delete a.postTimeEvidence;assert.match(freezeResearchSnapshot({snapshot:a,now}).errors.join(' '),/post-time evidence/);const b=fixture();b.postTimeEvidence.scheduledPost='2026-10-19T17:00:00Z';assert.match(freezeResearchSnapshot({snapshot:b,now}).errors.join(' '),/post-time evidence/);});

test('all three models and exact provider/runner identities are mandatory',()=>{
 const missing=fixture();missing.models.pop();assert.match(freezeResearchSnapshot({snapshot:missing,now}).errors.join(' '),/three provider model families/);
 const wrongProvider=fixture();wrongProvider.models[1].provider='DRF';assert.match(freezeResearchSnapshot({snapshot:wrongProvider,now}).errors.join(' '),/provider mismatch/);
 const wrongHorse=fixture();wrongHorse.models[2].rankings[0].horse='Other';assert.match(freezeResearchSnapshot({snapshot:wrongHorse,now}).errors.join(' '),/ineligible/);
});

test('export verification detects tampering and never certifies an independent timestamp',async()=>{
 const record=freezeResearchSnapshot({snapshot:fixture(),now}).record;
 const sealed=await sealResearchSnapshots([record]);
 const verified=await verifyResearchExport(sealed);
 assert.equal(verified.valid,true);assert.equal(verified.independentlyTimestamped,false);
 const altered=structuredClone(sealed);altered.records[0].models[0].rankings[0].score=999;
 assert.match((await verifyResearchExport(altered)).errors.join(' '),/digest mismatch/);
 const duplicate=await sealResearchSnapshots([record,record]);
 assert.match((await verifyResearchExport(duplicate)).errors.join(' '),/Duplicate frozen race/);
 const late=structuredClone(record);late.recordedAt='2026-10-19T17:00:00Z';
 const lateExport=await sealResearchSnapshots([late]);
 assert.match((await verifyResearchExport(lateExport)).errors.join(' '),/not before scheduled post/);
});

test('official post-time reference must be present and HTTPS',()=>{
 const missing=fixture();delete missing.postTimeEvidence.sourceUrl;
 assert.match(freezeResearchSnapshot({snapshot:missing,now}).errors.join(' '),/reference URL required/);
 const insecure=fixture();insecure.postTimeEvidence.sourceUrl='http://example.org/post';
 assert.match(freezeResearchSnapshot({snapshot:insecure,now}).errors.join(' '),/reference URL required/);
 const valid=fixture();
 assert.deepEqual(freezeResearchSnapshot({snapshot:valid,now}).errors,[]);
});


test('PASS and HOLD records remain research-only and never become betting instructions',()=>{
 for(const provider of ['BRISNET','DRF'])for(const decision of ['PASS','HOLD']){
  const snap=fixture(provider);
  snap.models=snap.models.map(m=>({...m,decision,fullFieldRanked:false}));
  const result=freezeResearchSnapshot({snapshot:snap,now});
  assert.deepEqual(result.errors,[]);
  assert.equal(result.record.mode,'RESEARCH_ONLY');
  assert.equal(result.record.bettingDecision,'PASS');
  assert.equal(result.record.anchorStatus,'UNVERIFIED_LOCAL');
  assert.ok(result.record.models.every(m=>m.decision===decision));
 }
});

test('scratch excluded from verified field cannot enter any frozen ranking',()=>{
 const snap=fixture();snap.field=[{program:'1',horse:'A'}];
 snap.models=snap.models.map(m=>({...m,rankings:[{program:'1',horse:'A',score:75}]}));
 assert.deepEqual(freezeResearchSnapshot({snapshot:snap,now}).errors,[]);
 snap.models[1].rankings.push({program:'2',horse:'B',score:70});
 assert.match(freezeResearchSnapshot({snapshot:snap,now}).errors.join(' '),/ineligible/);
});


test('resealing an invalid model field cannot launder it into valid research evidence',async()=>{
 const record=freezeResearchSnapshot({snapshot:fixture(),now}).record;
 const invalid=structuredClone(record);
 invalid.models[0].rankings[1].horse='Altered runner';
 const sealed=await sealResearchSnapshots([invalid]);
 const result=await verifyResearchExport(sealed);
 assert.equal(result.valid,false);
 assert.match(result.errors.join(' '),/Invalid frozen snapshot: Model has ineligible/);
});

test('resealing incomplete rateable model is rejected even with a correct digest',async()=>{
 const record=freezeResearchSnapshot({snapshot:fixture(),now}).record;
 const invalid=structuredClone(record);
 invalid.models[1].rankings.pop();
 const sealed=await sealResearchSnapshots([invalid]);
 const result=await verifyResearchExport(sealed);
 assert.equal(result.valid,false);
 assert.match(result.errors.join(' '),/complete active field/);
});


test('verified field rejects duplicate horse names even with different program numbers',()=>{
 const snap=fixture();
 snap.field[1].horse=' a ';
 assert.match(freezeResearchSnapshot({snapshot:snap,now}).errors.join(' '),/duplicate active runner/);
});

test('export validation rejects rehashed duplicate horse identities',async()=>{
 const record=freezeResearchSnapshot({snapshot:fixture(),now}).record;
 const altered=structuredClone(record);
 altered.field[1].horse=' A ';
 const sealed=await sealResearchSnapshots([altered]);
 const result=await verifyResearchExport(sealed);
 assert.equal(result.valid,false);
 assert.match(result.errors.join(' '),/duplicate active runner/);
});

test('unrated first-time starter evidence survives freeze, SHA seal and verification',async()=>{
 const snap=fixture('DRF');
 snap.models=snap.models.map(m=>m.family==='V44C'?{...m,decision:'PASS',fullFieldRanked:false,rankings:[{program:'1',horse:'A',score:75}]}:m);
 snap.unratedRunners=[{program:'2',horse:'B',reasons:['First-time starter; no prior race performance'],firstTimeStarter:true,classification:'SOURCE_EVIDENCE'}];
 const frozen=freezeResearchSnapshot({snapshot:snap,now});
 assert.deepEqual(frozen.errors,[]);
 assert.equal(frozen.record.unratedRunners[0].program,'2');
 const sealed=await sealResearchSnapshots([frozen.record]);
 const checked=await verifyResearchExport(sealed);
 assert.equal(checked.valid,true,checked.errors.join(' | '));
 assert.deepEqual(sealed.records[0].unratedRunners,snap.unratedRunners);
 const changed=structuredClone(sealed);
 changed.records[0].unratedRunners[0].reasons[0]='No reason recorded';
 const tampered=await verifyResearchExport(changed);
 assert.equal(tampered.valid,false);
 assert.match(tampered.errors.join(' '),/digest mismatch/);
});
test('unrated evidence rejects a horse that was already ranked',()=>{
 const snap=fixture('DRF');
 snap.unratedRunners=[{program:'1',horse:'A',reasons:['Missing figures'],firstTimeStarter:false}];
 assert.match(freezeResearchSnapshot({snapshot:snap,now}).errors.join(' '),/Unrated evidence conflicts/);
});
