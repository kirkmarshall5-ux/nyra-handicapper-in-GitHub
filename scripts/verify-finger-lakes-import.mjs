import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

// Explicit acceptance runner, not a CI test that silently skips absent PDFs.
// Run from repo root: node scripts/verify-finger-lakes-import.mjs /path/to/flx1019p.pdf
const pdfPath=process.argv[2];
if(!pdfPath){console.error('Usage: node scripts/verify-finger-lakes-import.mjs <Finger Lakes Premium Plus PDF>');process.exit(2);}
const pdf=await readFile(pdfPath);
const digest=createHash('sha256').update(pdf).digest('hex');
assert.equal(digest,'2fde9ed763820989d1f8c29b209c5cb0d700bd4b549de80112d006f2802e0072','Wrong source PDF');
const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
const doc=await pdfjs.getDocument({data:new Uint8Array(pdf),useSystemFonts:true,disableFontFace:true}).promise;
assert.equal(doc.numPages,18,'Expected 18 pages');
const pages=[];
for(let pageNumber=1;pageNumber<=doc.numPages;pageNumber++){
 const page=await doc.getPage(pageNumber);
 const content=await page.getTextContent();
 pages.push({pageNumber,items:content.items.filter(item=>typeof item.str==='string'&&Array.isArray(item.transform))});
}
const {parsePremiumCard}=await import(pathToFileURL(resolve('brisnet-premium-parser.js')).href);
const card=parsePremiumCard(pages,{sourceName:'flx1019p.pdf'});
assert.equal(card.date,'2026-10-19');
assert.equal(Object.keys(card.races).length,8);
const counts=[6,6,5,7,10,7,7,8];
for(let i=1;i<=8;i++){
 const race=card.races[i];
 assert.ok(race,`Race ${i} missing`);
 assert.equal(race.horses.length,counts[i-1],`Race ${i} count mismatch`);
 const names=race.horses.map(h=>h.name.toLowerCase().replace(/[^a-z0-9]/g,''));
 assert.equal(new Set(names).size,names.length,`Race ${i} duplicate horse names`);
}
assert.ok(Math.abs(card.races[7].distance_furlongs-(8+70/220))<1e-10);
assert.ok(card.races[8].horses.some(h=>/ringgood/i.test(h.name)),'Ringgood must remain a PP entrant until independent scratch verification');
assert.equal(Object.values(card.races).reduce((n,r)=>n+r.horses.length,0),56);
console.log(JSON.stringify({status:'PASS',source_sha256:digest,races:8,pp_entries:56,counts,race7_furlongs:card.races[7].distance_furlongs,excluded_appendix_pages:card.excluded_appendix_pages,validation_issues:card.validation_issues?.length??0,scratch_reconciliation:'NOT_CERTIFIED'},null,2));
