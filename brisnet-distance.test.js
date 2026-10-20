import test from 'node:test';
import assert from 'node:assert/strict';
import {brisnetDistance} from './brisnet-card-parser.js';
// Printed headings verified against the user's October 21 Finger Lakes Premium Plus PDF.
const headings=[
 'Clm 5000b 6 Furlongs 3&up',
 'MC 5000 5½ Furlongs 3&up, F & M',
 'Clm 5000n3L 1m70yds 3&up, F & M',
];
test('Oct 21 printed Brisnet race distances parse without guessed conversions',()=>{
 assert.equal(brisnetDistance(headings[0])?.furlongs,6);
 assert.equal(brisnetDistance(headings[1])?.furlongs,5.5);
 assert.ok(Math.abs(brisnetDistance(headings[2]).furlongs-(8+70/220))<1e-12);
});
test('unsupported primary distance remains unresolved',()=>{
 assert.equal(brisnetDistance('Clm 5000 unknown distance'),null);
 assert.equal(brisnetDistance('Clm 5000 1m220yds'),null);
});
