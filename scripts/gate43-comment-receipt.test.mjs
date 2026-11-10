import test from 'node:test';
import assert from 'node:assert/strict';
import {freezeResearchSnapshot,sealResearchSnapshots} from '../pre-race-provider-freeze.js';
import {verifyGate43CommentReceipt} from './gate43-comment-receipt.mjs';
const now=Date.parse('2026-11-10T13:00:00Z');
const snapshot={provider:'DRF',cardId:'test',track:'Belmont',date:'2026-11-10',race:1,
 parserVersion:'test',sourceName:'test.pdf',sourceSha256:'a'.repeat(64),
 fieldSnapshot:[{program:'1',horse:'Example'}],scheduledPost:'2026-11-10T15:00:00Z',
 postTimeEvidence:{verification:'USER_CONFIRMED_OFFICIAL_REFERENCE_NOT_INDEPENDENTLY_ANCHORED',
 scheduledPost:'2026-11-10T15:00:00Z',sourceUrl:'https://www.nyra.com/'},
 fieldVerified:true,surfaceVerified:true,surface:'Dirt',field:[{program:'1',horse:'Example'}],
 models:['V44C','CONTENDER','FINISHER'].map(family=>({family,modelId:family,provider:'DRF',decision:'RATEABLE',fullFieldRanked:true,rankings:[{program:'1',horse:'Example',score:75}]}))};
test('gate43 verifies actual comment creation, not original issue creation',async()=>{
 const frozen=freezeResearchSnapshot({snapshot,now}).record;
 assert.ok(frozen);
 const exported=await sealResearchSnapshots([frozen]);
 const comment={id:123,html_url:'https://github.com/kirkmarshall5-ux/nyra-handicapper-in-GitHub/issues/43#issuecomment-123',
 url:'https://api.github.com/repos/kirkmarshall5-ux/nyra-handicapper-in-GitHub/issues/comments/123',
 issue_url:'https://api.github.com/repos/kirkmarshall5-ux/nyra-handicapper-in-GitHub/issues/43',
 created_at:'2026-11-10T13:01:00Z',updated_at:'2026-11-10T13:01:00Z',
 body:'Card 2026-11-10 | Belmont | Race 1 | SHA-256 '+exported.digestSha256};
 const opts={now:Date.parse('2026-11-10T14:00:00Z')};
 const ok=await verifyGate43CommentReceipt(exported,comment,opts);
 assert.equal(ok.verified,true);assert.equal(ok.prospectiveCertified,false);
 assert.equal((await verifyGate43CommentReceipt(exported,{...comment,created_at:'2026-11-10T15:01:00Z',updated_at:'2026-11-10T15:01:00Z'},{now:Date.parse('2026-11-10T16:00:00Z')})).verified,false);
 assert.equal((await verifyGate43CommentReceipt(exported,{...comment,updated_at:'2026-11-10T15:01:00Z'},{now:Date.parse('2026-11-10T16:00:00Z')})).verified,false);
 assert.equal((await verifyGate43CommentReceipt(exported,{...comment,html_url:comment.html_url.replace('/43#','/44#')},opts)).verified,false);
 assert.equal((await verifyGate43CommentReceipt({...exported,records:[{...frozen,models:[]}]},comment,opts)).verified,false);
});
