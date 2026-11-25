import test from 'node:test';
import assert from 'node:assert/strict';
import {distinctInterests} from './wagering-interests.js';
import {runnerProgram,matchUpdateRunner} from './runner-identity.js';
test('coupled interests retain first ranked horse and skip duplicate interest',()=>{const rows=['1a','1','5','7'].map(n=>({n}));const before=structuredClone(rows);assert.deepEqual(distinctInterests(rows,{'1A':'1'}),[{program:'1A',interest:'1'},{program:'5',interest:'5'},{program:'7',interest:'7'}]);assert.deepEqual(rows,before);});
test('suffix alone cannot establish coupling',()=>{assert.throws(()=>distinctInterests([{n:'1A'}]),/Official wagering/);assert.throws(()=>distinctInterests([{n:'1A'}],{'1A':'bad'}),/Invalid/);});
test('lowercase identity is normalized without merging distinct runners',()=>{const horses=[{n:'1',name:'Alpha'},{n:'1a',name:'Beta'}];assert.equal(runnerProgram('1a'),'1A');assert.equal(matchUpdateRunner(horses,{program:'1A'}).name,'Beta');assert.equal(matchUpdateRunner(horses,{program:'1'}).name,'Alpha');});
