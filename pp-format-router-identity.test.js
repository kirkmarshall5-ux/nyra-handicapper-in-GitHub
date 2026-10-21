import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectRunnerIdentities} from './pp-format-router.js';
const card=horses=>({races:{1:{horses}}});
test('unique runner identities pass unchanged',()=>assert.deepEqual(inspectRunnerIdentities(card([{n:'1',name:'A Horse'},{n:'2',name:'B Horse'}])),[]));
test('missing program number is reported with exact race and index',()=>assert.deepEqual(inspectRunnerIdentities(card([{n:'',name:'A Horse'}]))[0],{race:'1',index:1,reason:'MISSING_RUNNER_IDENTITY',number:'',name:'a horse'}));
test('duplicate program number is reported without discarding a horse',()=>{const horses=[{n:'1',name:'A Horse'},{n:'1',name:'B Horse'}];assert.equal(inspectRunnerIdentities(card(horses))[0].reason,'DUPLICATE_PROGRAM');assert.equal(horses.length,2);});
test('duplicate normalized name is reported',()=>assert.equal(inspectRunnerIdentities(card([{n:'1',name:'A  Horse'},{n:'2',name:'a horse'}]))[0].reason,'DUPLICATE_HORSE_NAME'));

test('same program number in different races is allowed',()=>assert.deepEqual(inspectRunnerIdentities({races:{1:{horses:[{n:'1',name:'First'}]},2:{horses:[{n:'1',name:'Second'}]}}}),[]));
test('coupled entry identifiers 1 and 1A remain distinct',()=>assert.deepEqual(inspectRunnerIdentities(card([{n:'1',name:'First'},{n:'1A',name:'Second'}])),[]));
test('missing horse name is identified and never invented',()=>assert.equal(inspectRunnerIdentities(card([{n:'3',name:''}]))[0].reason,'MISSING_RUNNER_IDENTITY'));
test('lowercase and uppercase program letters are the same identity',()=>assert.equal(inspectRunnerIdentities(card([{n:'1a',name:'First'},{n:'1A',name:'Second'}]))[0].reason,'DUPLICATE_PROGRAM'));
