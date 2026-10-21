import test from 'node:test';
import assert from 'node:assert/strict';
import {brisnetDistance} from './brisnet-card-parser.js';

// PR #116: prevent the Finger Lakes 1 mile 70 yards regression.
// This tests the actual exported production distance decoder, not a copy.
test('Finger Lakes compact 1m70yds decodes to 8 + 70/220 furlongs',()=>{
  const result=brisnetDistance('OC 30000b 1m70yds');
  assert.ok(result);
  assert.ok(Math.abs(result.furlongs-(8+70/220))<1e-10);
  assert.equal(result.display,'1M 70Y');
});

test('compact distance accepts spacing and case variations',()=>{
  for(const value of ['1m70yds','1 m 70 yds','1M70YDS']){
    assert.ok(Math.abs(brisnetDistance(value).furlongs-(8+70/220))<1e-10,value);
  }
});

test('compact distance rejects malformed or unsupported yard counts',()=>{
  for(const value of ['1m0yds','1m220yds','1m999yds','0m70yds','5m70yds']){
    assert.equal(brisnetDistance(value),null,value);
  }
});

test('standard furlong distances remain unchanged',()=>{
  assert.equal(brisnetDistance('6 Furlongs').furlongs,6);
  assert.equal(brisnetDistance('5½ Furlongs').furlongs,5.5);
  assert.equal(brisnetDistance('1 Mile').furlongs,8);
});
