import test from 'node:test';
import assert from 'node:assert/strict';
import {freezeResearchSnapshot,sealResearchSnapshots} from './pre-race-provider-freeze.js';
const now=Date.parse('2026-10-19T15:00:00Z');
const fixture=(provider='BRISNET')=>({provider,cardId:provider+'-card',track:'Belmont Park',date:'2026-10-19',race:1,parserVersion:'verified-parser',sourceName:provider+'.pdf',scheduledPost:'2026-10-19T16:00:00Z',fieldVerified:true,surfaceVerified:true,surface:'Dirt',field:[{program:'1',horse:'A'},{program:'2',horse:'B'}],models:[{family:'V44C',modelId:provider+'-v44c',decision:'RATEABLE',fullFieldRanked:true,rankings:[{program:'1',horse:'A',score:75},{program:'2',horse:'B',score:70}]}]});
test('provider isolation, duplicate protection and no bet',()=>{
 const a=freezeResearchSnapshot({snapshot:fixture(),now});assert.deepEqual(a.errors,[]);assert.equal(a.record.bettingDecision,'PASS');
 assert.match(freezeResearchSnapshot({snapshot:fixture(),existing:[a.record],now}).errors.join(' '),/already frozen/);
 assert.deepEqual(freezeResearchSnapshot({snapshot:fixture('DRF'),existing:[a.record],now}).errors,[]);
});
test('post time, missing model, incomplete full field fail closed',()=>{
 assert.match(freezeResearchSnapshot({snapshot:fixture(),now:now+3600000}).errors.join(' '),/at or after/);
 const missing=fixture();missing.models=[];assert.match(freezeResearchSnapshot({snapshot:missing,now}).errors.join(' '),/Model evidence/);
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
