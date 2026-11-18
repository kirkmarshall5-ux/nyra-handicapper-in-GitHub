// Run with: node --test tests/brisnet-pace-ordering.test.mjs
// Research display regression checks; no live model scoring is invoked.
import test from 'node:test';
import assert from 'node:assert/strict';
import {brisnetPaceDisplay} from '../brisnet-pace-display.js';

const line=(date,e1,e2,late,furlongs=6,surface='DIRT')=>({date,e1,e2,late,furlongs,surface,source:{provider:'BRISNET',page:1}});
const race=lines=>({date:'2026-11-17',distance_furlongs:6,surface:'DIRT',horses:[{n:1,name:'Example',odds:'4-1',life_starts:8,ratings:{provider:'BRISNET',lines}}]});

test('uses newest five actual dated starts, not importer array order',()=>{
 const lines=[
  line('2026-07-01',99,99,99),line('2026-11-01',81,82,83),
  line('2026-10-01',71,72,73),line('2026-09-01',61,62,63),
  line('2026-08-01',51,52,53),line('2026-06-01',100,100,100)
 ];
 const h=brisnetPaceDisplay(race(lines)).rows[0];
 assert.equal(h.latest.date,'2026-11-01');
 assert.equal(h.matched,5);
 assert.equal(h.metrics.e1.value,81);
 assert.equal(h.metrics.e1.date,'2026-11-01');
});

test('never replaces a missing matching line with an unmatched surface',()=>{
 const h=brisnetPaceDisplay(race([line('2026-11-01',90,91,92,6,'TURF')])).rows[0];
 assert.equal(h.matched,0);
 assert.equal(h.metrics.e1,null);
});

test('first-time starter has no invented historical figures',()=>{
 const r=race([line('2026-11-01',90,91,92)]);
 r.horses[0].life_starts=0;
 const h=brisnetPaceDisplay(r).rows[0];
 assert.equal(h.fts,true);
 assert.equal(h.metrics.e1,null);
});

test('turn index uses E1 and E2 from one dated line',()=>{
 const h=brisnetPaceDisplay(race([line('2026-11-01',75,88,70)])).rows[0];
 assert.equal(h.metrics.turn.value,13);
 assert.equal(h.metrics.turn.date,'2026-11-01');
});
