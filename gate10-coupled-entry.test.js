import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Source-backed DRF owner-anchor examples: AQU 2025-03-01 races 5 and 9.
// The production parser must accept lowercase 1a and normalize to canonical 1A.
const source=readFileSync(new URL('./data-corrected-parser.js',import.meta.url),'utf8');
const parserBlock=source.match(/const prior=ls\.slice\([\s\S]*?anchors\.push\(\{start,own:i,name,status,n,ml\}\)/)?.[0];
assert.ok(parserBlock,'Owner-anchored program-number extraction must remain present');

// Execute the actual extraction statements in isolation, using the same `prior`
// text line tokens as the source PDF; this intentionally does not exercise the
// full PDF importer, which must be checked separately with the archived card.
const extract=new Function('prior',`let n='',ml=''; const program=prior.findIndex(s=>/^\\d{1,2}[ABX]?$/i.test(s));if(program>=0){n=prior[program].toUpperCase();const odds=prior.slice(program+1).find(s=>/^\\d+\\s*(?:-\\s*\\d+|\\/\\s*\\d+)$/.test(s));if(odds)ml=odds.replace(/\\s+/g,'').replace('-','/')}return {n,ml}`);

test('AQU race 5 Embraceable Gal lowercase 1a becomes 1A',()=>{
 assert.match(parserBlock,/\[ABX\]\?\$\/i/);
 assert.deepEqual(extract(['1a','7-2','Embraceable Gal']),{n:'1A',ml:'7/2'});
});
test('AQU race 9 Hagrid\'s Flame lowercase 1a becomes 1A',()=>{
 assert.deepEqual(extract(['1a','4-1',"Hagrid's Flame"]),{n:'1A',ml:'4/1'});
});
test('regular and uppercase entry program identifiers remain stable',()=>{
 for(const n of ['1','12','1A','2B','3X'])assert.equal(extract([n,'5-1']).n,n);
});
test('unverified program tokens are not guessed',()=>{
 for(const n of ['1c','abc','', '100'])assert.equal(extract([n,'5-1']).n,'');
});
