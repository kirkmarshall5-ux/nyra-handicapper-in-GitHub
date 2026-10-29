import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('./audits/belmont-2026-10-25-r9-brisnet-source-identity.json',import.meta.url),'utf8'));
const source=JSON.parse(readFileSync(new URL('./audits/issue74-bel1025-private-pdf-source-programs.json',import.meta.url),'utf8'));
test('original PDF R9 horse blocks occupy pages 20-23, not index page 24',()=>{
 assert.deepEqual(manifest.source.race9_pages_1_indexed,[20,21,22,23]);
 assert.deepEqual(source.races.find(r=>r.race===9).pp_pages,manifest.source.race9_pages_1_indexed);
 assert.equal(manifest.source.pdf_horse_index_page_1_indexed,24);
 assert.equal(source.source.pdf_pages,24);
});
test('every original PP race-data page is assigned once; last page is index',()=>{
 const pages=source.races.flatMap(r=>r.pp_pages);
 assert.deepEqual(pages,Array.from({length:23},(_,i)=>i+1));
 assert.ok(!pages.includes(manifest.source.pdf_horse_index_page_1_indexed));
 assert.equal(source.races.length,9);
});
