import test from 'node:test';import assert from 'node:assert/strict';import {correctRaceField} from './race-field-corrections.js';
import {eligible} from './pre-race-provider-adapter.js';
import {active as brisnetActive} from './brisnet-models.js';
const card=()=>({track:'Belmont Park',date:'2026-10-25',races:{9:{track:'Belmont Park',date:'2026-10-25',race:9,horses:[{n:'1',name:'Bouquetry',odds:'—',entry_status:'REGULAR'},{n:'13',name:'Cocoa Mills',odds:'10/1',entry_status:'AE',included_in_frozen_field:false,figs:[80]},{n:'14',name:"It's Nancytime Now",odds:'12/1',entry_status:'AE',included_in_frozen_field:false}]}}});
test('confirmed AE and scratches persist across both PP sources without changing figures or original input',()=>{const cards={DRF:card(),BRISNET:card()},before=structuredClone(cards);let x=correctRaceField(cards,'DRF',9,'13','running');x=correctRaceField(x,'DRF',9,'1','scratch');x=correctRaceField(x,'DRF',9,'14','scratch');for(const c of Object.values(x)){const h=c.races[9].horses;assert.equal(h[1].entry_status,'REGULAR');assert.equal(h[1].included_in_frozen_field,true);assert.deepEqual(h[1].figs,[80]);assert.equal(h[0].odds,'SCR');assert.equal(h[2].odds,'SCR');assert.equal(h.length,3);}assert.deepEqual(cards,before);});
test('mismatched identities reject atomically; MTO is not activated and explicit running clears a scratch',()=>{const a={DRF:card(),BRISNET:card()};a.BRISNET.races[9].horses[1].name='Different';assert.throws(()=>correctRaceField(a,'DRF',9,'13','running'),/identity/);a.BRISNET=card();a.DRF.races[9].horses[1].odds='SCR';assert.equal(correctRaceField(a,'DRF',9,'13','running').DRF.races[9].horses[1].odds,'—');a.DRF=card();a.DRF.races[9].horses[1].entry_status='MTO';assert.throws(()=>correctRaceField(a,'DRF',9,'13','running'),/also-eligible/);});

test('Cocoa Mills field correction feeds identical eligibility to both model providers',()=>{
 const original={DRF:card(),BRISNET:card()};
 let updated=correctRaceField(original,'DRF',9,'13','running');
 updated=correctRaceField(updated,'DRF',9,'1','scratch');
 updated=correctRaceField(updated,'DRF',9,'14','scratch');
 for(const source of ['DRF','BRISNET']){
  const horses=updated[source].races[9].horses;
  assert.deepEqual(horses.filter(eligible).map(h=>h.n),['13']);
  assert.deepEqual(horses.filter(brisnetActive).map(h=>h.n),['13']);
  assert.deepEqual(horses.map(h=>h.n),['1','13','14']);
  assert.equal(horses[1].field_status_evidence.action,'running');
  assert.equal(horses[0].field_status_evidence.action,'scratch');
  assert.equal(horses[2].field_status_evidence.action,'scratch');
 }
});

test('ALSO_ELIGIBLE alias can be drawn in across both provider cards without altering figures',()=>{
 const cards={DRF:card(),BRISNET:card()};
 for(const source of ['DRF','BRISNET'])cards[source].races[9].horses[1].entry_status='ALSO_ELIGIBLE';
 const updated=correctRaceField(cards,'DRF',9,'13','running','2026-10-25T18:00:00.000Z');
 for(const source of ['DRF','BRISNET']){
  const h=updated[source].races[9].horses[1];
  assert.equal(h.entry_status,'REGULAR');
  assert.equal(h.original_entry_status,'ALSO_ELIGIBLE');
  assert.equal(h.included_in_frozen_field,true);
  assert.deepEqual(h.figs,[80]);
  assert.deepEqual(updated[source].races[9].horses.filter(eligible).map(h=>h.n),['1','13']);
 }
 assert.equal(cards.DRF.races[9].horses[1].entry_status,'ALSO_ELIGIBLE');
});

test('manual name selection scratches the requested unnumbered horse and syncs numbered PP',()=>{
 const cards={DRF:card(),BRISNET:card()};cards.DRF.races[9].horses.forEach(h=>h.n='');
 const before=structuredClone(cards),updated=correctRaceField(cards,'DRF',9,{program:'',name:'Cocoa Mills'},'scratch');
 for(const c of Object.values(updated)){assert.equal(c.races[9].horses[0].odds,'—');assert.equal(c.races[9].horses[1].odds,'SCR');}
 assert.ok(updated.DRF.races[9].horses.every(h=>h.n===''));assert.deepEqual(cards,before);
 const running=correctRaceField(updated,'BRISNET',9,{program:'13',name:'Cocoa Mills'},'running');
 for(const c of Object.values(running)){assert.equal(c.races[9].horses[1].odds,'—');assert.equal(c.races[9].horses[1].entry_status,'REGULAR');assert.equal(c.races[9].horses[1].scratch_evidence,undefined);}
});
test('empty or duplicate-name selections and conflicting supplied numbers reject without changing cards',()=>{
 const cards={DRF:card(),BRISNET:card()},before=structuredClone(cards);
 assert.throws(()=>correctRaceField(cards,'DRF',9,'','scratch'),/identity/);
 cards.DRF.races[9].horses.forEach(h=>h.n='');cards.DRF.races[9].horses[0].name='Cocoa Mills';
 assert.throws(()=>correctRaceField(cards,'DRF',9,{name:'Cocoa Mills'},'scratch'),/ambiguous/);
 assert.deepEqual(before.BRISNET,cards.BRISNET);
 const conflict={DRF:card(),BRISNET:card()};conflict.BRISNET.races[9].horses[1].n='12';
 assert.throws(()=>correctRaceField(conflict,'DRF',9,{program:'13',name:'Cocoa Mills'},'scratch'),/identity/);
});
