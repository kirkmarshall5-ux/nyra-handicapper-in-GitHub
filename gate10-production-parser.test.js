import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRestoredCard} from './data-corrected-parser.js';

// Minimal owner-anchored lines preserve the exact lowercase tokens observed
// in the archived AQU 2025-03-01 DRF PDF. Exercise the real production parser,
// rather than duplicating its extraction regex inside the test.
function page(race,program,odds,name) {
 const lines=[
  String(race),'Aqueduct 6 Furlongs','Purse $50,000','',
  program,odds,name,'Own: Verified Owner',
  'Life 3 1 1 0','TRAINER: verified',
  'Daily Racing Form Aqueduct (3/1/2025)',
  `Aqu, race ${race}, page: 1`
 ];
 return {pageNumber:race,lines:lines.map(text=>({text,proofs:[]}))};
}

test('production parser preserves Race 5 Embraceable Gal as 1A',()=>{
 const card=parseRestoredCard([page(5,'1a','7-2','Embraceable Gal')]);
 assert.equal(card.races?.[0]?.horses?.[0]?.n??card.races?.[5]?.horses?.[0]?.n,'1A');
});

test("production parser preserves Race 9 Hagrid's Flame as 1A",()=>{
 const card=parseRestoredCard([page(9,'1a','4-1',"Hagrid's Flame")]);
 assert.equal(card.races?.[0]?.horses?.[0]?.n??card.races?.[9]?.horses?.[0]?.n,'1A');
});

test('production parser does not manufacture an unverified program',()=>{
 const card=parseRestoredCard([page(5,'1c','7-2','Unknown Program')]);
 assert.equal(card.races?.[0]?.horses?.[0]?.n??card.races?.[5]?.horses?.[0]?.n,'');
});
