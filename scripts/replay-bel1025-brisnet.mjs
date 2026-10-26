import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {parsePPCard,detectPPFormat} from '../pp-format-router.js';
import {correctRaceField} from '../race-field-corrections.js';
const pdf=process.argv[2];
if(!pdf){console.error('Usage: node scripts/replay-bel1025-brisnet.mjs /path/to/bel1025p.pdf');process.exit(2)}
const raw=fs.readFileSync(pdf),sha=crypto.createHash('sha256').update(raw).digest('hex');
const expected=JSON.parse(fs.readFileSync(new URL('../audits/belmont-2026-10-25-r9-brisnet-source-identity.json',import.meta.url)));
assert.equal(sha,expected.source.sha256,'Original PDF SHA-256 mismatch');
const doc=await getDocument({data:new Uint8Array(raw),disableFontFace:true}).promise;
const pages=[];
for(let n=1;n<=doc.numPages;n++){const page=await doc.getPage(n);await page.getOperatorList();const tc=await page.getTextContent({disableNormalization:true});pages.push({pageNumber:n,items:tc.items})}
assert.equal(doc.numPages,expected.source.pages);
assert.equal(detectPPFormat(pages),'BRISNET_PREMIUM_PLUS');
const card=parsePPCard(pages,{sourceName:'bel1025p.pdf'});
const race=card.races?.[9];assert.ok(race,'Race 9 not imported');
const identities=race.horses.map(h=>({program:String(h.n),name:h.name,entry_status:h.entry_status}));
const pairs=identities.map(h=>[h.program,h.name]);
assert.deepEqual(pairs,expected.entries.map(h=>[h.program,h.name]),'Imported horse identities differ from original source manifest');
assert.deepEqual(identities.filter(h=>h.entry_status==='AE').map(h=>h.program),['13','14']);
const initialEligible=race.horses.filter(h=>h.included_in_frozen_field!==false);
assert.equal(initialEligible.length,12,'Expected 12 regular pre-correction entries');
const report={source_sha256:sha,format:'BRISNET_PREMIUM_PLUS',pages:doc.numPages,initial_entries:identities,initial_eligible_programs:initialEligible.map(h=>String(h.n)),status:'SOURCE_IMPORT_VERIFIED_ONLY',note:'Actual final-field correction is verified by separate race-field-corrections regression; no predictions or ROI certified.'};
console.log(JSON.stringify(report,null,2));
await doc.destroy();
