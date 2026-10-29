// Execute only with the original private Brisnet PDF; never commit the PDF or its extracted content.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {parsePPCard,detectPPFormat} from '../pp-format-router.js';
import {compareImportedCardToFrozenRosters} from './issue74-fullcard-replay-audit.mjs';
const filename=process.argv[2];
if(!filename){console.error('Usage: node scripts/replay-bel1025-fullcard.mjs /private/path/bel1025p.pdf');process.exit(2)}
const expectedSha='13930fbc15ee9263777a1a20d16051f8cd6196f8ece396bca38b62fde409705a';
const raw=fs.readFileSync(filename);
const sha=crypto.createHash('sha256').update(raw).digest('hex');
assert.equal(sha,expectedSha,'Original private Brisnet PDF SHA-256 mismatch');
const doc=await getDocument({data:new Uint8Array(raw),disableFontFace:true}).promise;
try {
  assert.equal(doc.numPages,24,'Original Brisnet PDF page count mismatch');
  const pages=[];
  for(let n=1;n<=doc.numPages;n++){
    const page=await doc.getPage(n);
    await page.getOperatorList();
    const tc=await page.getTextContent({disableNormalization:true});
    pages.push({pageNumber:n,items:tc.items});
  }
  assert.equal(detectPPFormat(pages),'BRISNET_PREMIUM_PLUS','Incorrect source PDF format');
  const card=parsePPCard(pages,{sourceName:'bel1025p.pdf'});
  const reference=JSON.parse(fs.readFileSync(new URL('../audits/belmont-2026-10-25-fullcard-public-results-crosscheck.json',import.meta.url),'utf8'));
  const result=compareImportedCardToFrozenRosters(card,reference);
  const report={...result,original_pdf_verified:true,original_pdf_sha256:sha,original_pdf_pages:doc.numPages,production_parser:'pp-format-router.js parsePPCard',replayed_at_utc:new Date().toISOString(),caveat:'Retrospective import roster parity only; official charts, independently timed freezes and model performance are NOT certified.'};
  console.log(JSON.stringify(report,null,2));
  if(result.status!=='SOURCE_PROGRAM_REPLAY_PASSED_NOT_CERTIFIED')process.exitCode=1;
} finally {await doc.destroy()}
