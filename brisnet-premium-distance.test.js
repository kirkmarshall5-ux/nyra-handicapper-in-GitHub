import test from 'node:test';import assert from 'node:assert/strict';
import {brisnetDistance} from './brisnet-card-parser.js';import {parsePPCard} from './pp-format-router.js';
const item=(str,x,y,width=str.length*3.16)=>({str,transform:[1,0,0,1,x,y],width});
const card=distance=>[{pageNumber:1,items:[item("Premium Plus PP's",10,760),item('Belmont Park',120,760),item('Alw 32000s '+distance+' 3&up Saturday, October 17, 2026 Race 3',200,760),item('brisnet.com Bloodstock Research',10,20),item('Example Runner (E/P 5)',45,650),item('1',17,645),item('Life: 0 0 - 0 - 0',390,650),item('8/1',17,636)]}];
test('Churchill October 28 primary ellipsis glyph means one and three-eighths miles',()=>{
 assert.deepEqual(brisnetDistance('1… Mile'),{furlongs:11,display:'1 3/8M'});
 const c=parsePPCard(card('1… Mile (T)'));
 assert.equal(c.races[3].distance_furlongs,11);
 assert.equal(c.races[3].surface,'Turf');
 assert.deepEqual(brisnetDistance('1… Mile'),brisnetDistance('1 3/8 Mile'));
});
test('Belmont Premium Plus low-quote quarter glyph means one and one-quarter miles',()=>{const x=parsePPCard(card('1‚ Mile'));assert.equal(x.track,'Belmont Park');assert.equal(x.date,'2026-10-17');assert.equal(x.races[3].distance_furlongs,10);assert.equal(x.races[3].dist,'1 1/4M');assert.equal(x.races[3].horses[0].name,'Example Runner');assert.equal(x.races[3].horses[0].life_starts,0);assert.deepEqual(x.races[3].horses[0].ratings.lines,[]);});
test('quarter glyph is equivalent to existing supported printed quarter representations',()=>{for(const d of ['1‚ Mile','1¼ Mile','1 1/4 Mile'])assert.deepEqual(brisnetDistance(d),{furlongs:10,display:'1 1/4M'});assert.deepEqual(brisnetDistance('6½ Furlongs'),{furlongs:6.5,display:'6 1/2F'});});
test('unsupported heading distance and conflicting repeated race distances still reject',()=>{assert.throws(()=>parsePPCard(card('1Z Mile')),/primary distance unverified/);const f=card('1‚ Mile'),g=card('1 Mile');g[0].pageNumber=2;assert.throws(()=>parsePPCard([...f,...g]),/Conflicting Premium Plus race conditions/);});

test('October 18 Belmont five-sixteenths glyph decodes the primary turf distance exactly',()=>{const f=card('1Š Mile (T)');const c=parsePPCard(f);assert.equal(c.races[3].distance_furlongs,10.5);assert.equal(c.races[3].dist,'1 5/16M');assert.equal(c.races[3].surface,'Turf');assert.deepEqual(brisnetDistance('1Š Mile'),brisnetDistance('1 5/16 Mile'));assert.notEqual(c.races[3].distance_furlongs,9.5);});

// Real October 31 Belmont R9 heading uses the per-mille fraction glyph.
test('Belmont October 31 R9 three-sixteenths heading imports at 9.5 furlongs',()=>{
 assert.deepEqual(brisnetDistance('KnkrbkrL175K 1‰ Mile (t)'),{furlongs:9.5,display:'1 3/16M'});
 assert.deepEqual(brisnetDistance('1‰ Mile'),brisnetDistance('1 3/16 Mile'));
 const c=parsePPCard(card('1‰ Mile (t)'));
 assert.equal(c.races[3].distance_furlongs,9.5);assert.equal(c.races[3].surface,'Turf');
 assert.equal(brisnetDistance('1Z Mile'),null);
});
