import test from 'node:test';
import assert from 'node:assert/strict';
import {extractDrfFreezeInventory} from './scripts/drf-freeze-json-adapter.mjs';
const m=(id,decision='RATEABLE',complete=true)=>({id,decision,complete,rankings:[1,2,3,4].map(n=>({n:String(n),name:'H'+n}))});
const f={schema:'nyra-local-research-freeze-v1',source:'DRF',track:'Belmont Park',card_date:'2026-10-28',captured_at_utc:'2026-10-28T15:17:59.668Z',clock_source:'browser-device-unverified',races:[{race:1,dashboard:{source_cards:{DRF:{track:'Belmont Park',date:'2026-10-28',source_name:'BEL--10-28-2026.pdf'}},models:[m('drfContender'),m('drfFinisher','RESEARCH')]}}]};
test('extracts only DRF models and blocks unverified browser timestamp',()=>{const a=extractDrfFreezeInventory(f)[0];assert.equal(a.contender.top_four[0].program,'1');assert.equal(a.finisher.top_four.length,4);assert.equal(a.status,'BLOCKED');assert.match(a.blockers.join(' '),/independent timestamp/);});
test('PASS model is flagged without promoting provisional ranks',()=>{const x=structuredClone(f);x.races[0].dashboard.models[0].decision='PASS';assert.match(extractDrfFreezeInventory(x)[0].blockers.join(' '),/Contender incomplete or PASS/);});
test('rejects Brisnet freeze',()=>assert.throws(()=>extractDrfFreezeInventory({...f,source:'BRISNET'}),/DRF local/));
test('rejects missing source identity',()=>{const x=structuredClone(f);delete x.races[0].dashboard.source_cards.DRF;assert.match(extractDrfFreezeInventory(x)[0].blockers.join(' '),/source-card identity/);});
