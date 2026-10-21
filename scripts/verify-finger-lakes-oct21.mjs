#!/usr/bin/env node
// Acceptance test for the exact October 21 Brisnet original PDF. The early-release
// DRF PDF is fingerprinted/page-count checked only; it lacks program numbers.
// Does not certify official scratches, pre-race timestamps, or live deployment.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const brisnetPath=process.argv[2],drfPath=process.argv[3];
if(!brisnetPath||!drfPath)throw Error('Usage: node scripts/verify-finger-lakes-oct21.mjs /path/to/flx1021p.pdf /path/to/FL--10-21-2026.pdf');
async function extractExact(path,expectedDigest,expectedPages){
 const bytes=await readFile(path);
 const digest=createHash('sha256').update(bytes).digest('hex');
 assert.equal(digest,expectedDigest,'Unexpected PDF bytes: '+path);
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const doc=await pdfjs.getDocument({data:new Uint8Array(bytes),useSystemFonts:true,disableFontFace:true}).promise;
 assert.equal(doc.numPages,expectedPages,'Unexpected PDF page count: '+path);
 const pages=[];
 for(let i=1;i<=doc.numPages;i++){
  const page=await doc.getPage(i),content=await page.getTextContent();
  pages.push({pageNumber:i,items:content.items.filter(x=>typeof x.str==='string'&&Array.isArray(x.transform))});
 }
 return {pages,digest};
}
const {pages,digest}=await extractExact(brisnetPath,'1c9e3bedecd761d2a825c4513642c4aeb31d477cfde56695df725a9ecc43637a',18);
const {parsePremiumCard}=await import(pathToFileURL(resolve('brisnet-premium-parser.js')).href);
const card=parsePremiumCard(pages,{sourceName:'flx1021p.pdf'});
const drfExtract=await extractExact(drfPath,'c5a1d507b388bb1df9116da1a6596f6b2d3c2c6cc11b0edcf62dbf49e5ac6a5e',17);
// Early-release DRF lacks assigned program numbers: never require its live-card
// acceptance or use its entry order to manufacture numbered identities.
assert.equal(card.date,'2026-10-21');
assert.equal(Object.keys(card.races).length,8,'Appendix must not become race 9');
const expected={"1":["Biyombo","Hunters Ghost","Khali's Dream","Monomoy Beach","Muazarah","Paint the Line"],"2":["Anna Brocknana","Crystal","Dancinwiththeboys","Free Spin Kim","Snowbody Blink","Sonoranite"],"3":["Golden Miracle","Lovelee Racer","Mizty Fog","My Gorgeous","Secord","Shes Sal's Dream"],"4":["Action Seeker","Buck Wild","Doha Desert","Street Cop Officer","Swift Bank","Whiskey Frens"],"5":["Bad Connection","Book of Wisdom","Dream On Cara","Follow Your Arrow","Isle Storm","Itwillbefun","Signifying Nothing","Tale of the Tail"],"6":["Fidela","Funny Forecast","Going for Glory","Immortal Poet","Jayme's Turn","Lady of Mercia","Tiz Goldy"],"7":["Lincolnville Beach","Observer","Practical Rachel","Queens Over Threes","Redwineandwhiskey","Teresa"],"8":["Bossy Jeans","Danneel","Going Home Now","Jayce and Liam","Jessica's Ride","Maizey Blue","Silent Melody"]};
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
for(let n=1;n<=8;n++){
 const race=card.races[n];
 assert.ok(race,'Missing race '+n);
 const wanted=expected[n].map(norm).sort();
 for(const [provider,source] of [['BRISNET',card]]){
  const current=source.races[n];
  assert.ok(current,'Missing '+provider+' race '+n);
  assert.equal(current.horses.length,wanted.length,provider+' race '+n+' entrant count');
  const actual=current.horses.map(h=>norm(h.name)).sort();
  assert.deepEqual(actual,wanted,provider+' race '+n+' horse identity mismatch');
  const programs=current.horses.map(h=>String(h.n||'').trim());
  assert.ok(programs.every(Boolean),provider+' race '+n+' missing program number');
  assert.equal(new Set(programs).size,programs.length,provider+' race '+n+' duplicate program numbers');
  assert.ok(current.horses.every(h=>String(h.ml||'').trim()&&String(h.ml).trim()!=='—'),provider+' race '+n+' missing morning line');
 }
}
assert.ok(Math.abs(card.races[8].distance_furlongs-(8+70/220))<1e-9,'Race 8 distance incorrect');
console.log(JSON.stringify({status:'PASS',date:card.date,providers:['BRISNET'],races:8,entries_per_provider:52,drf_early_release:'EXCLUDED_FROM_LIVE_PROGRAM_NUMBER_GATE',sha256:{BRISNET:digest,DRF:drfExtract.digest},scratch_reconciliation:'NOT_CERTIFIED'},null,2));
