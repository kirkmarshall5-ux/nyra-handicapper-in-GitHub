import test from 'node:test';import assert from 'node:assert/strict';import {parseNyraText} from './nyra-entry-parser.js';
const text="Race 1\nFirst\nJockey • Trainer\n1\nML 2/1\nSecond\nJockey • Trainer\n2\nML 4/1\nThird\nJockey • Trainer\n3\nML 6/5";
test('each entry keeps its own morning line without looking into the next entry',()=>{const r=parseNyraText(text);assert.deepEqual(r.horses.map(h=>[h.n,h.ml]),[[1,'2/1'],[2,'4/1'],[3,'6/5']]);});
test('missing morning line remains unknown instead of taking the next horse price',()=>{const r=parseNyraText(text.replace('ML 2/1\n',''));assert.equal(r.horses[0].ml,'—');assert.equal(r.horses[1].ml,'4/1');});
test('selected venue and date survive race navigation headings',()=>{const r=parseNyraText('Race 1\nRace 2\n'+text,{track:'aqueduct',date:'2026-10-07',race:1});assert.equal(r.track,'Aqueduct');assert.equal(r.date,'2026-10-07');assert.equal(r.race,1);});

import fs from 'node:fs';
test('unmodified official page distinguishes weight bullets and 3/16 distance',()=>{
 const r=parseNyraText(fs.readFileSync(new URL('./fixtures/nyra-saratoga-20260822-r12.txt',import.meta.url),'utf8'),{track:'saratoga',date:'2026-08-22',race:12});
 assert.equal(r.race,12);assert.equal(r.dist,'1 3/16M');assert.equal(r.surface,'Turf');assert.equal(r.post,'7:21P');assert.equal(r.horses.length,9);
 assert.deepEqual(r.horses.map(h=>h.ml),['9/2','8/1','10/1','4/1','3/1','7/2','50/1','9/2','50/1']);assert.equal(r.horses[8].odds,'SCR');assert.equal(r.horses[5].name,'Mary Lois (IRE)');
});
