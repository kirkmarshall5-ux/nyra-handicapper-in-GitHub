import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyGitHubTimestampReceipt,verifySealedGitHubTimestampReceipt} from './pre-race-github-timestamp.js';
const digest='a'.repeat(64);
const exported={schemaVersion:3,mode:'RESEARCH_ONLY',anchorStatus:'UNVERIFIED_LOCAL_EXPORT',digestSha256:digest,records:[{recordedAt:'2026-10-19T13:00:00Z',scheduledPost:'2026-10-19T15:00:00Z'}]};
const issue=()=>({html_url:'https://github.com/kirkmarshall5-ux/nyra-handicapper-in-GitHub/issues/123',created_at:'2026-10-19T13:10:00Z',updated_at:'2026-10-19T13:10:00Z',body:'Research digest SHA-256: '+digest});
const now=Date.parse('2026-10-19T14:00:00Z');
test('independent GitHub timestamp receipt passes with matching pre-post digest',()=>{
 const result=verifyGitHubTimestampReceipt(exported,issue(),{now});assert.equal(result.verified,true);assert.equal(result.independentlyTimestamped,true);
});
test('changed digest, edited-after-post, late creation, forged host and future times fail closed',()=>{
 const tampered=issue();tampered.body='SHA-256: '+'b'.repeat(64);assert.equal(verifyGitHubTimestampReceipt(exported,tampered,{now}).verified,false);
 const edited=issue();edited.updated_at='2026-10-19T15:01:00Z';assert.equal(verifyGitHubTimestampReceipt(exported,edited,{now:Date.parse('2026-10-19T16:00:00Z')}).verified,false);
 const late=issue();late.created_at='2026-10-19T15:01:00Z';late.updated_at=late.created_at;assert.equal(verifyGitHubTimestampReceipt(exported,late,{now:Date.parse('2026-10-19T16:00:00Z')}).verified,false);
 const host=issue();host.html_url='https://evil.example/issues/123';assert.equal(verifyGitHubTimestampReceipt(exported,host,{now}).verified,false);
 const future=issue();future.created_at='2026-10-19T14:01:00Z';future.updated_at=future.created_at;assert.equal(verifyGitHubTimestampReceipt(exported,future,{now}).verified,false);
});
test('receipt must follow freeze and represent all races before their scheduled post',()=>{
 const early=issue();early.created_at='2026-10-19T12:59:00Z';early.updated_at=early.created_at;assert.equal(verifyGitHubTimestampReceipt(exported,early,{now}).verified,false);
 const multi={...exported,records:[...exported.records,{recordedAt:'2026-10-19T13:00:00Z',scheduledPost:'2026-10-19T13:05:00Z'}]};
 assert.equal(verifyGitHubTimestampReceipt(multi,issue(),{now}).verified,false);
});

test('receipt cannot certify an unsealed or non-research export',()=>{
 const fake={...exported,mode:'BETTING'};
 assert.match(verifyGitHubTimestampReceipt(fake,issue(),{now}).errors.join(' '),/metadata invalid/);
 const missing={...exported};delete missing.anchorStatus;
 assert.equal(verifyGitHubTimestampReceipt(missing,issue(),{now}).verified,false);
});


test('sealed timestamp gate rejects tampered prediction payload even when GitHub receipt matches digest',async()=>{
 const {freezeResearchSnapshot,sealResearchSnapshots}=await import('./pre-race-provider-freeze.js');
 const snapshot={provider:'DRF',cardId:'drf-test',track:'Finger Lakes',date:'2026-10-19',race:1,parserVersion:'test',sourceName:'test.pdf',scheduledPost:'2026-10-19T15:00:00Z',postTimeEvidence:{verification:'USER_CONFIRMED_OFFICIAL_REFERENCE_NOT_INDEPENDENTLY_ANCHORED',scheduledPost:'2026-10-19T15:00:00Z',sourceUrl:'https://www.nyra.com/'},fieldVerified:true,surfaceVerified:true,surface:'Dirt',field:[{program:'1',horse:'A'}],models:['V44C','CONTENDER','FINISHER'].map(family=>({family,modelId:family,provider:'DRF',decision:'RATEABLE',fullFieldRanked:true,rankings:[{program:'1',horse:'A',score:75}]}))};
 const record=freezeResearchSnapshot({snapshot,now:Date.parse('2026-10-19T13:00:00Z')}).record;
 assert.ok(record);
 const sealed=await sealResearchSnapshots([record]);
 const receipt={...issue(),body:'SHA-256: '+sealed.digestSha256};
 assert.equal((await verifySealedGitHubTimestampReceipt(sealed,receipt,{now})).verified,true);
 const tampered=structuredClone(sealed);tampered.records[0].models[0].rankings[0].score=999;
 const rejected=await verifySealedGitHubTimestampReceipt(tampered,receipt,{now});
 assert.equal(rejected.verified,false);
 assert.match(rejected.errors.join(' '),/digest mismatch/);
});
