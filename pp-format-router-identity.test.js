import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectRunnerIdentities} from './pp-format-router.js';
const card=horses=>({races:{1:{horses}}});
test('unique runner identities pass unchanged',()=>assert.deepEqual(inspectRunnerIdentities(card([{n:'1',name:'A Horse'},{n:'2',name:'B Horse'}])),[]));
test('missing program number is reported with exact race and index',()=>assert.deepEqual(inspectRunnerIdentities(card([{n:'',name:'A Horse'}]))[0],{race:'1',index:1,reason:'MISSING_RUNNER_IDENTITY',number:'',name:'a horse'}));
test('duplicate program number is reported without discarding a horse',()=>{const horses=[{n:'1',name:'A Horse'},{n:'1',name:'B Horse'}];assert.equal(inspectRunnerIdentities(card(horses))[0].reason,'DUPLICATE_PROGRAM');assert.equal(horses.length,2);});
test('duplicate normalized name is reported',()=>assert.equal(inspectRunnerIdentities(card([{n:'1',name:'A  Horse'},{n:'2',name:'a horse'}]))[0].reason,'DUPLICATE_HORSE_NAME'));
