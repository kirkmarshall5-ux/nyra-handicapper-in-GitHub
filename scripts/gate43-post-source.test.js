import test from 'node:test';
import assert from 'node:assert/strict';
import {officialPostTimeSourceType} from './gate43-post-source.js';
test('NYRA official schedule remains NYRA_OFFICIAL',()=>assert.equal(officialPostTimeSourceType('DRF','https://www.nyra.com/'), 'NYRA_OFFICIAL'));
test('Finger Lakes HTTPS schedule is not falsely classified as NYRA',()=>assert.equal(officialPostTimeSourceType('BRISNET','https://www.fingerlakesgaming.com/'), 'TRACK_OFFICIAL'));
test('invalid and insecure references fail closed',()=>{
 assert.throws(()=>officialPostTimeSourceType('BRISNET','http://example.com'));
 assert.throws(()=>officialPostTimeSourceType('BRISNET','not-a-url'));
});
