import test from 'node:test';
import assert from 'node:assert/strict';
import {brisnetRaceSurface,repairWoodbineSurface} from './brisnet-race-surface.js';
test('Woodbine main-course default is synthetic and explicit surfaces remain distinct',()=>{
 assert.equal(brisnetRaceSurface('Woodbine','Clm 25000 6 Furlongs'),'Synth');
 for(const h of ['1 Mile (T)','6 Furlongs Turf','1 Mile Grass'])assert.equal(brisnetRaceSurface('Woodbine',h),'Turf');
 assert.equal(brisnetRaceSurface('Woodbine','6 Furlongs Dirt'),'Dirt');
 assert.equal(brisnetRaceSurface('Del Mar','6 Furlongs'),'Dirt');
 assert.equal(brisnetRaceSurface('Belmont Park','1 Mile (T)'),'Turf');
 assert.equal(brisnetRaceSurface('Belmont Park','1 Mile All-Weather'),'Synth');
});
test('saved Woodbine PP repair is immutable, idempotent and preserves source history',()=>{
 const card={track:'Woodbine',source_format:'BRISNET_PREMIUM_PLUS',races:{1:{surface:'Dirt',header:'6 Furlongs',conditions:{surface:'Dirt'},horses:[{ratings:{lines:[{surface:'Dirt'},{surface:'Synth'}]}}]},2:{surface:'Turf',header:'1 Mile (T)'}}};
 const before=structuredClone(card),fixed=repairWoodbineSurface(card);
 assert.deepEqual(card,before);assert.equal(fixed.races[1].surface,'Synth');assert.equal(fixed.races[1].conditions.surface,'Synth');assert.equal(fixed.races[2].surface,'Turf');
 assert.deepEqual(fixed.races[1].horses,before.races[1].horses);assert.deepEqual(repairWoodbineSurface(fixed),fixed);
 for(const key of ['manual_conditions','equibase_snapshot','track_conditions']){
  const explicit=structuredClone(card);explicit.races[1][key]={surface:'Dirt'};
  assert.equal(repairWoodbineSurface(explicit).races[1].surface,'Dirt');
 }
 const freeze={schema:'nyra-local-research-freeze-v1',track:'Woodbine',races:[{surface:'Dirt'}]};assert.deepEqual(repairWoodbineSurface(freeze),freeze);
});
