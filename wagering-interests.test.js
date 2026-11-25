import test from 'node:test';
import assert from 'node:assert/strict';
import {distinctInterests,verifyInterestExacta,settleInterestWinExacta,settleInterestPlace} from './wagering-interests.js';
import {runnerProgram,matchUpdateRunner} from './runner-identity.js';
test('coupled interests retain first ranked horse and skip duplicate interest',()=>{const rows=['1a','1','5','7'].map(n=>({n}));const before=structuredClone(rows);assert.deepEqual(distinctInterests(rows,{'1A':'1'}),[{program:'1A',interest:'1'},{program:'5',interest:'5'},{program:'7',interest:'7'}]);assert.deepEqual(rows,before);});
test('suffix alone cannot establish coupling',()=>{assert.throws(()=>distinctInterests([{n:'1A'}]),/Official wagering/);assert.throws(()=>distinctInterests([{n:'1A'}],{'1A':'bad'}),/Invalid/);});
test('lowercase identity is normalized without merging distinct runners',()=>{const horses=[{n:'1',name:'Alpha'},{n:'1a',name:'Beta'}];assert.equal(runnerProgram('1a'),'1A');assert.equal(matchUpdateRunner(horses,{program:'1A'}).name,'Beta');assert.equal(matchUpdateRunner(horses,{program:'1'}).name,'Alpha');});

test('official exacta skips coupled partner but rejects conflicting payout numbers',()=>{assert.deepEqual(verifyInterestExacta(['1A','1','5','7'],{'1A':'1'},['1','5']),['1','5']);assert.throws(()=>verifyInterestExacta(['1A','1','5'],{'1A':'1'},['1','1']),/conflicts/);assert.throws(()=>verifyInterestExacta(['1A','1','5'],{},['1','5']),/Official wagering/);});

test('winning coupled partner cashes ticket without crediting horse prediction',()=>{const result=settleInterestWinExacta({rankings:['1','1A','5'].map(n=>({n})),finish:['1A','1','5'],officialMap:{'1A':'1'},exactaPair:['1','5'],win2:8,exactaPay:30,exactaBase:2});assert.deepEqual(result,{firstChoiceWinner:false,winHit:true,exactaHit:true,stake:4,returned:23,net:19,roi:475});});

test('place settlement uses verified interest payouts and rejects incomplete tables',()=>{const input={rankings:[{n:'1A'},{n:'5'}],finish:['1','1A','5'],officialMap:{'1A':'1'},place2:{'1':3.2,'5':4.4}};assert.deepEqual(settleInterestPlace(input),{interest:'1',hit:true,stake:2,returned:3.2});assert.throws(()=>settleInterestPlace({...input,place2:{'1':3.2}}),/Complete verified/);assert.throws(()=>settleInterestPlace({...input,place2:{'1':3.2,'7':4.4}}),/Complete verified/);});
