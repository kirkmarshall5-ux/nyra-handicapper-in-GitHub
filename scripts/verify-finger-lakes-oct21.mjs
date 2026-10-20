#!/usr/bin/env node
// Acceptance test against the exact user-provided October 21 Brisnet PDF.
// Does not certify official scratches, DRF parsing, or pre-race timestamps.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const path=process.argv[2];
if(!path)throw Error('Usage: node scripts/verify-finger-lakes-oct21.mjs /path/to/flx1021p.pdf');
const bytes=await readFile(path);
const digest=createHash('sha256').update(bytes).digest('hex');
assert.equal(digest,'1c9e3bedecd761d2a825c4513642c4aeb31d477cfde56695df725a9ecc43637a','Wrong October 21 Brisnet PDF');
const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
const doc=await pdfjs.getDocument({data:new Uint8Array(bytes),useSystemFonts:true,disableFontFace:true}).promise;
assert.equal(doc.numPages,18);
const pages=[];
for(let i=1;i<=doc.numPages;i++){
 const page=await doc.getPage(i),content=await page.getTextContent();
 pages.push({pageNumber:i,items:content.items.filter(x=>typeof x.str==='string'&&Array.isArray(x.transform))});
}
const {parsePremiumCard}=await import(pathToFileURL(resolve('brisnet-premium-parser.js')).href);
const card=parsePremiumCard(pages,{sourceName:'flx1021p.pdf'});
assert.equal(card.date,'2026-10-21');
assert.equal(Object.keys(card.races).length,8,'Appendix must not become race 9');
const expected={"1":["Biyombo","Hunters Ghost","Khali's Dream","Monomoy Beach","Muazarah","Paint the Line"],"2":["Anna Brocknana","Crystal","Dancinwiththeboys","Free Spin Kim","Snowbody Blink","Sonoranite"],"3":["Golden Miracle","Lovelee Racer","Mizty Fog","My Gorgeous","Secord","Shes Sal's Dream"],"4":["Action Seeker","Buck Wild","Doha Desert","Street Cop Officer","Swift Bank","Whiskey Frens"],"5":["Bad Connection","Book of Wisdom","Dream On Cara","Follow Your Arrow","Isle Storm","Itwillbefun","Signifying Nothing","Tale of the Tail"],"6":["Fidela","Funny Forecast","Going for Glory","Immortal Poet","Jayme's Turn","Lady of Mercia","Tiz Goldy"],"7":["Lincolnville Beach","Observer","Practical Rachel","Queens Over Threes","Redwineandwhiskey","Teresa"],"8":["Bossy Jeans","Danneel","Going Home Now","Jayce and Liam","Jessica's Ride","Maizey Blue","Silent Melody"]};
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
for(let n=1;n<=8;n++){
 const race=card.races[n];
 assert.ok(race,'Missing race '+n);
 const actual=race.horses.map(h=>norm(h.name)).sort();
 const wanted=expected[n].map(norm).sort();
 assert.deepEqual(actual,wanted,'Race '+n+' horse identity mismatch');
}
assert.ok(Math.abs(card.races[8].distance_furlongs-(8+70/220))<1e-9,'Race 8 distance incorrect');
console.log(JSON.stringify({status:'PASS',date:card.date,provider:'BRISNET',races:8,entries:52,sha256:digest,scratch_reconciliation:'NOT_CERTIFIED'},null,2));
