import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyGitHubTimestampReceipt} from './pre-race-github-timestamp.js';
const digest='a'.repeat(64);
const exported={digestSha256:digest,records:[{recordedAt:'2026-10-19T13:00:00Z',scheduledPost:'2026-10-19T15:00:00Z'}]};
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
