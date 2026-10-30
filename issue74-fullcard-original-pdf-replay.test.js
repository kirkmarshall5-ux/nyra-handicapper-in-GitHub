import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareImportedCardToFrozenRosters,digestImportedRaceIdentities} from './scripts/issue74-fullcard-replay-audit.mjs';
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

const r9Source=JSON.parse(readFileSync(new URL('./audits/belmont-2026-10-25-r9-brisnet-source-identity.json',import.meta.url),'utf8'));
const withR9Source=()=>{
 const card=fixture();
 card.races[9].horses=r9Source.entries.map(h=>({n:h.program,name:h.name,entry_status:h.source_ae?'AE':'entered'}));
 return card;
};
test('R9 imported source names and AE flags match original private PDF manifest',()=>{
 const result=compareImportedCardToFrozenRosters(withR9Source(),reference,r9Source);
 assert.equal(result.status,'SOURCE_PROGRAM_REPLAY_PASSED_NOT_CERTIFIED');
});
test('R9 wrong horse at same program fails even when all program numbers match',()=>{
 const card=withR9Source();card.races[9].horses.find(h=>h.n==='13').name='Different Horse';
 const result=compareImportedCardToFrozenRosters(card,reference,r9Source);
 assert.equal(result.status,'SOURCE_PROGRAM_REPLAY_FAILED');
 assert.ok(result.races[8].blockers.some(b=>b.includes('horse-name mismatch #13')));
});
test('R9 wrong non-AE flag fails even when both AEs remain marked',()=>{
 const card=withR9Source();card.races[9].horses.find(h=>h.n==='1').entry_status='AE';
 const result=compareImportedCardToFrozenRosters(card,reference,r9Source);
 assert.equal(result.status,'SOURCE_PROGRAM_REPLAY_FAILED');
 assert.ok(result.races[8].blockers.some(b=>b.includes('flag mismatch #1')));
});
test('R9 invalid original identity manifest fails closed',()=>{
 const manifest={...r9Source,entries:r9Source.entries.slice(1)};
 const result=compareImportedCardToFrozenRosters(withR9Source(),reference,manifest);
 assert.equal(result.status,'SOURCE_PROGRAM_REPLAY_FAILED');
 assert.ok(result.races[8].blockers.some(b=>b.includes('Invalid original')));
});

const independentDigests=JSON.parse(readFileSync(new URL('./audits/issue74-bel1025-original-pp-horse-name-digests.json',import.meta.url),'utf8'));
const syntheticDigests=card=>({...independentDigests,races:independentDigests.races.map(r=>({...r,program_name_sha256:digestImportedRaceIdentities(card.races[r.race].horses)}))});
test('all 80 independent original PDF source identities have nine race digests',()=>{
 assert.equal(independentDigests.races.length,9);
 assert.equal(independentDigests.races.reduce((n,r)=>n+r.source_entries,0),80);
 assert.ok(independentDigests.races.every(r=>/^[a-f0-9]{64}$/.test(r.program_name_sha256)));
 assert.equal(independentDigests.races[8].program_name_sha256,digestImportedRaceIdentities(withR9Source().races[9].horses));
});
test('nine-race matching synthetic identity digest manifest passes without prospective certification',()=>{
 const card=fixture(),manifest=syntheticDigests(card);
 const result=compareImportedCardToFrozenRosters(card,reference,null,manifest);
 assert.equal(result.status,'SOURCE_PROGRAM_REPLAY_PASSED_NOT_CERTIFIED');
 assert.equal(result.prospective_certified,false);
});
test('wrong horse name at same program in race 2 fails all-card source identity digest',()=>{
 const card=fixture(),manifest=syntheticDigests(card);
 card.races[2].horses[4].name='Different Runner';
 const result=compareImportedCardToFrozenRosters(card,reference,null,manifest);
 assert.equal(result.status,'SOURCE_PROGRAM_REPLAY_FAILED');
 assert.ok(result.races[1].blockers.some(x=>x.includes('horse-name identity digest mismatch')));
});
test('missing or altered original full-card digest evidence fails closed',()=>{
 const card=fixture(),manifest=syntheticDigests(card);
 manifest.races[4].program_name_sha256='not-a-hash';
 const result=compareImportedCardToFrozenRosters(card,reference,null,manifest);
 assert.equal(result.status,'SOURCE_PROGRAM_REPLAY_FAILED');
 assert.ok(result.races[4].blockers.some(x=>x.includes('digest evidence invalid')));
});
