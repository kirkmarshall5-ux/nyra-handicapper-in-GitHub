import test from 'node:test';
import assert from 'node:assert/strict';
import {brisnetDistance} from './brisnet-card-parser.js';

test('Finger Lakes Premium Plus 2026-10-19 current-race headings preserve distance',()=>{
 const cases=[
  ['Alw 26900n3L 5½ Furlongs 3&up',5.5],
  ['MC 5000 1 Mile 3&up',8],
  ['OC 30000b 1m70yds 3&up',8+70/220],
  ['Clm 5000 6 Furlongs 3&up',6],
 ];
 for(const [heading,expected] of cases){
  const result=brisnetDistance(heading);
  assert.ok(result,'Missing primary distance: '+heading);
  assert.ok(Math.abs(result.furlongs-expected)<1e-8,heading+': '+JSON.stringify(result));
 }
});
test('unknown or invalid compact distance still fails closed',()=>{
 for(const heading of ['OC 30000b 1m0yds 3&up','OC 30000b 1m220yds 3&up','OC 30000b 1mXXyds 3&up']){
  assert.equal(brisnetDistance(heading),null,heading);
 }
});
