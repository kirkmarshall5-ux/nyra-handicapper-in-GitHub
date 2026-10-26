import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {correctRaceField} from './race-field-corrections.js';
import {eligible} from './pre-race-provider-adapter.js';
import {active as brisnetActive} from './brisnet-models.js';
const source=JSON.parse(readFileSync(new URL('./audits/belmont-2026-10-25-r9-brisnet-source-identity.json',import.meta.url)));
const official=JSON.parse(readFileSync(new URL('./audits/belmont-2026-10-25-r9-field.json',import.meta.url)));
const makeCard=()=>({track:'Belmont Park',date:'2026-10-25',races:{9:{track:'Belmont Park',date:'2026-10-25',race:9,horses:source.entries.map((x,i)=>({n:x.program,name:x.name,entry_status:x.source_ae?'AE':'REGULAR',included_in_frozen_field:!x.source_ae,odds:'—',ratings:{lines:[{speed:60+i}]}}))}}});
test('all 14 original Brisnet entries correct to the official 12-starter field across both providers',()=>{
 const cards={BRISNET:makeCard(),DRF:makeCard()},original=structuredClone(cards);
 let corrected=correctRaceField(cards,'BRISNET',9,'13','running');
 corrected=correctRaceField(corrected,'BRISNET',9,'1','scratch');
 corrected=correctRaceField(corrected,'BRISNET',9,'14','scratch');
 const starters=official.entries.filter(x=>x.status==='STARTER').map(x=>x.program);
 const scratches=official.entries.filter(x=>x.status==='SCRATCHED').map(x=>x.program);
 assert.equal(starters.length,12);assert.deepEqual(scratches,['1','14']);
 for(const provider of ['BRISNET','DRF']){
  const horses=corrected[provider].races[9].horses;
  assert.equal(horses.length,14);
  assert.deepEqual(horses.filter(eligible).map(x=>x.n),starters);
  assert.deepEqual(horses.filter(brisnetActive).map(x=>x.n),starters);
  assert.deepEqual(horses.filter(x=>x.odds==='SCR').map(x=>x.n),scratches);
  assert.equal(horses.find(x=>x.n==='13').field_status_evidence.action,'running');
  assert.deepEqual(horses.map(x=>x.ratings),original[provider].races[9].horses.map(x=>x.ratings));
 }
 assert.deepEqual(cards,original,'original uploaded cards are immutable');
 assert.equal(official.prospective_gradeable,false,'retrospective correction is not a certified freeze');
});
