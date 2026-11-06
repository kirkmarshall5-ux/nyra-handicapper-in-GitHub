// Issue #74: local, source-authentic production PDF.js replay.
// Do not commit the private Brisnet PDF or generated audit to this public repository.
// Usage: node scripts/issue74-replay-original-brisnet.mjs "/private/path/bel1025p(1).pdf"
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {parsePPCard} from '../pp-format-router.js';
import {compareImportedCardToFrozenRosters} from './issue74-fullcard-replay-audit.mjs';

const expectedSha='13930fbc15ee9263777a1a20d16051f8cd6196f8ece396bca38b62fde409705a';
const source=process.argv[2];
if(!source)throw Error('Original private PDF path required; never upload it to the public repository');
const bytes=readFileSync(source);
const sha=createHash('sha256').update(bytes).digest('hex');
if(sha!==expectedSha)throw Error('Original PDF SHA-256 mismatch; refusing replay');
const reference=JSON.parse(readFileSync(new URL('../audits/belmont-2026-10-25-fullcard-public-results-crosscheck.json',import.meta.url)));
const r9=JSON.parse(readFileSync(new URL('../audits/belmont-2026-10-25-r9-brisnet-source-identity.json',import.meta.url)));
const digests=JSON.parse(readFileSync(new URL('../audits/issue74-bel1025-original-pp-horse-name-digests.json',import.meta.url)));
const pdf=await getDocument({data:new Uint8Array(bytes),disableFontFace:true,useSystemFonts:false}).promise;
let card;
try {
  if(pdf.numPages!==24)throw Error('Unexpected original PDF page count: '+pdf.numPages);
  const pages=[];
  for(let n=1;n<=pdf.numPages;n++){
    const page=await pdf.getPage(n);
    const content=await page.getTextContent({disableNormalization:true});
    pages.push({pageNumber:n,items:content.items});
  }
  // Use the same format router and production Brisnet parser as the website.
  card=parsePPCard(pages,{sourceName:'bel1025p.pdf'});
} finally {await pdf.destroy();}
if(card.source_format!=='BRISNET_PREMIUM_PLUS' && card.source_format!=='BRISNET_ULTIMATE')
  throw Error('Original source unexpectedly routed to '+card.source_format);
if(card.date!=='2026-10-25')throw Error('Unexpected card date: '+card.date);
const comparison=compareImportedCardToFrozenRosters(card,reference,r9,digests);
const audit={
  issue:74,scope:'BEL-2026-10-25',source_sha256:sha,
  original_pdf_pages:24,parser_version:card.parser_version,
  source_format:card.source_format,card_date:card.date,card_track:card.track,
  source_entries:Object.values(card.races).reduce((n,r)=>n+r.horses.length,0),
  parser_validation_issue_count:card.validation_issues?.length??0,
  replay_status:comparison.status,
  races:comparison.races.map(r=>({
    race:r.race,status:r.status,source_horses:r.source_horses,
    imported_horses:r.imported_horses,missing:r.missing,extra:r.extra,
    ae_programs:r.ae_programs,blockers:r.blockers
  })),
  // This is source identity replay only, NOT official starter or timestamp certification.
  official_chart_verified_by_replay:false,prospective_certified:false
};
const output=process.argv[3]||'issue74-original-brisnet-replay-audit.json';
writeFileSync(output,JSON.stringify(audit,null,2)+'\n',{flag:'w',mode:0o600});
console.log(JSON.stringify({output,replay_status:audit.replay_status,races:audit.races.length,entries:audit.source_entries,parser_validation_issue_count:audit.parser_validation_issue_count},null,2));
if(comparison.status!=='SOURCE_PROGRAM_REPLAY_PASSED_NOT_CERTIFIED')process.exitCode=1;
