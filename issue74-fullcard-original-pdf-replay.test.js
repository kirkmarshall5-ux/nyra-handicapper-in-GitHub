import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareImportedCardToFrozenRosters} from './scripts/issue74-fullcard-replay-audit.mjs';
const reference=JSON.parse(readFileSync(new URL('./audits/belmont-2026-10-25-fullcard-public-results-crosscheck.json',import.meta.url),'utf8'));
const fixture=()=>({races:Object.fromEntries(reference.races.map(r=>[r.race,{horses:r.saved_roster_programs.map(n=>({n,name:'Synthetic #'+n,entry_status:r.race===9&&['13','14'].includes(n)?'AE':'entered'}))}]))});
test('nine-race synthetic roster parity never certifies official charts or predictions',()=>{
 const result=compareImportedCardToFrozenRosters(fixture(),reference);
 assert.equal(result.races.length,9);
 assert.equal(result.status,'SOURCE_PROGRAM_REPLAY_PASSED_NOT_CERTIFIED');
 assert.equal(result.official_chart_verified,false);
 assert.equal(result.prospective_certified,false);
});
test('missing also-eligible #13 is detected in race 9',()=>{
 const card=fixture();
 card.races[9].horses=card.races[9].horses.filter(h=>h.n!=='13');
 const result=compareImportedCardToFrozenRosters(card,reference);
 assert.equal(result.status,'SOURCE_PROGRAM_REPLAY_FAILED');
 assert.ok(result.races[8].missing.includes('13'));
});
test('duplicate and unexpected programs cannot pass',()=>{
 const card=fixture();
 card.races[2].horses[0].n=card.races[2].horses[1].n;
 card.races[3].horses.push({n:'99',name:'Synthetic'});
 const result=compareImportedCardToFrozenRosters(card,reference);
 assert.ok(result.races[1].blockers.some(x=>x.includes('Duplicate')));
 assert.ok(result.races[2].extra.includes('99'));
 assert.equal(result.status,'SOURCE_PROGRAM_REPLAY_FAILED');
});
test('blank horse name fails, missing race fails',()=>{
 const card=fixture();card.races[1].horses[0].name='';delete card.races[8];
 const result=compareImportedCardToFrozenRosters(card,reference);
 assert.ok(result.races[0].blockers.some(x=>x.includes('Blank imported horse name')));
 assert.equal(result.races[7].status,'MISSING_IMPORTED_RACE');
});
test('also-eligible flag missing for R9 cannot pass',()=>{
 const card=fixture();card.races[9].horses.find(h=>h.n==='13').entry_status='entered';
 const result=compareImportedCardToFrozenRosters(card,reference);
 assert.ok(result.races[8].blockers.some(x=>x.includes('also-eligible')));
});
