import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBrisnetRunningStyleHeader,extractBrisnetHeaderEvidence} from './brisnet-running-style-header.js';
test('real Finger Lakes Nov 9 page 1 header: Cast a Coin P3',()=>{
 const h=parseBrisnetRunningStyleHeader('          Cast a Coin (P 3)     B. g. 4 OBSMAR 2024 $27k   Prime Power: 109.7 (6th)',{page:1,race:1});
 assert.equal(h.name,'Cast a Coin');assert.equal(h.style,'P');assert.equal(h.quirinPoints,3);
 assert.equal(h.sourceText,'(P 3)');
});
test('real Finger Lakes Nov 9 page 2 header: Vino\'s Valentine E/P5',()=>{
 const h=parseBrisnetRunningStyleHeader("Vino's Valentine (E/P 5) B. c. 4 OBSOPN 2024 $19k Prime Power: 114.8 (4th)",{page:2,race:1});
 assert.equal(h.name,"Vino's Valentine");assert.equal(h.style,'EP');assert.equal(h.quirinPoints,5);
});
test('NA is unknown and malformed or unrelated lines are rejected',()=>{
 assert.equal(parseBrisnetRunningStyleHeader('Debut Runner (NA) B. f. 2 Prime Power: 110.0').quirinPoints,null);
 assert.equal(parseBrisnetRunningStyleHeader('Horse (E 9) Prime Power: 100'),null);
 assert.equal(parseBrisnetRunningStyleHeader('Horse (E 8) running line'),null);
 assert.equal(extractBrisnetHeaderEvidence('Horse (E 8) Prime Power: 100\nOther (S 1) Prime Power: 90').length,2);
});
