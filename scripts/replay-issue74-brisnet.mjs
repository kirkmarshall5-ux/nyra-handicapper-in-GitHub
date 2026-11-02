// Issue #74: replay the original private Brisnet PDF through the same PDF.js
// text extraction and format router used by Race Day. Never commit source PDFs.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { getDocument } from 'pdfjs-dist/build/pdf.mjs';
import { restoredPage } from '../release-card-parser.js';
import { parsePPCard } from '../pp-format-router.js';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/replay-issue74-brisnet.mjs /private/path/bel1025p.pdf');
  process.exit(2);
}
const expectedSha = '13930fbc15ee9263777a1a20d16051f8cd6196f8ece396bca38b62fde409705a';
const bytes = fs.readFileSync(file);
const digest = createHash('sha256').update(bytes).digest('hex');
if (digest !== expectedSha) throw Error('Original Brisnet source SHA-256 mismatch; replay aborted.');
const pdf = await getDocument({data:new Uint8Array(bytes)}).promise;
const pages = [];
try {
  for(let n=1;n<=pdf.numPages;n++){
    const page=await pdf.getPage(n);
    const content=await page.getTextContent({disableNormalization:true});
    await page.getOperatorList();
    const fonts=Object.fromEntries(Object.keys(content.styles).map(k=>[k,page.commonObjs.get(k)?.name||'']));
    pages.push({...restoredPage(content.items,n,fonts),items:content.items});
  }
} finally { await pdf.destroy(); }
const card=parsePPCard(pages,{sourceName:file.split(/[\\/]/).pop()});
const audit=JSON.parse(fs.readFileSync(new URL('../audits/issue74-bel1025-equibase-official-chart-reconciliation.json',import.meta.url)));
const failures=[];
if(card.source_format!=='BRISNET_PREMIUM_PLUS')failures.push('Wrong PP format: '+card.source_format);
if(pdf.numPages!==24)failures.push('Expected 24 source pages');
const counts=[];
for(const row of audit.races){
  const race=card.races?.[row.race];
  if(!race){failures.push('Race '+row.race+' missing');continue;}
  const horses=race.horses||[];
  const ids=horses.map(h=>String(h.n??h.program??'').trim().toUpperCase());
  const duplicate=ids.filter((id,i)=>!id||ids.indexOf(id)!==i);
  if(duplicate.length)failures.push('Race '+row.race+' missing/duplicate programs: '+duplicate.join(','));
  if(horses.length!==row.pp_entries)failures.push('Race '+row.race+' entrants '+horses.length+' expected '+row.pp_entries);
  for(const p of [...row.scratched_programs,...row.nonstarter_programs,...row.finish_order_programs,...row.unplaced_starter_programs]){
    if(!ids.includes(String(p)))failures.push('Race '+row.race+' missing official program '+p);
  }
  counts.push({race:row.race,entrants:horses.length,programs:ids});
}
const total=counts.reduce((s,r)=>s+r.entrants,0);
if(total!==audit.totals.pp_entries)failures.push('Entrants '+total+' expected '+audit.totals.pp_entries);
const result={schema:'issue74-production-pdfjs-replay-v1',source_sha256:digest,pages:pages.length,source_format:card.source_format,parser_version:card.parser_version||null,races:counts,total_entrants:total,failures,pass:failures.length===0,certifies_prospective_performance:false};
console.log(JSON.stringify(result,null,2));
if(failures.length)process.exitCode=1;
