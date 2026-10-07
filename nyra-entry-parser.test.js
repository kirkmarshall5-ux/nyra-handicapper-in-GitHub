import test from 'node:test';import assert from 'node:assert/strict';import {parseNyraText} from './nyra-entry-parser.js';
const text="Race 1\nFirst\nJockey • Trainer\n1\nML 2/1\nSecond\nJockey • Trainer\n2\nML 4/1\nThird\nJockey • Trainer\n3\nML 6/5";
test('each entry keeps its own morning line without looking into the next entry',()=>{const r=parseNyraText(text);assert.deepEqual(r.horses.map(h=>[h.n,h.ml]),[[1,'2/1'],[2,'4/1'],[3,'6/5']]);});
test('missing morning line remains unknown instead of taking the next horse price',()=>{const r=parseNyraText(text.replace('ML 2/1\n',''));assert.equal(r.horses[0].ml,'—');assert.equal(r.horses[1].ml,'4/1');});
test('selected venue and date survive race navigation headings',()=>{const r=parseNyraText('Race 1\nRace 2\n'+text,{track:'aqueduct',date:'2026-10-07',race:1});assert.equal(r.track,'Aqueduct');assert.equal(r.date,'2026-10-07');assert.equal(r.race,1);});
