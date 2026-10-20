#!/usr/bin/env node
// Research-only source-to-production-importer audit for Brisnet Premium Plus.
// Usage: node scripts/audit-premium-history.mjs card.pdf
// Requires pdfjs-dist; does not alter scoring, decisions or uploaded cards.
import {readFile} from 'node:fs/promises';
import {basename,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const path=process.argv[2];
if(!path)throw Error('Usage: node scripts/audit-premium-history.mjs card.pdf');
const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
const {parsePremiumCard}=await import(pathToFileURL(resolve('brisnet-premium-parser.js')).href);
const bytes=await readFile(path);
const pdf=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true,disableFontFace:true}).promise;
const pages=[];
for(let i=1;i<=pdf.numPages;i++){
 const page=await pdf.getPage(i),content=await page.getTextContent();
 pages.push({pageNumber:i,items:content.items.filter(x=>typeof x.str==='string'&&Array.isArray(x.transform))});
}
const card=parsePremiumCard(pages,{sourceName:basename(path)});
const rows=[],failures=[];
for(const race of Object.values(card.races)){
 for(const horse of race.horses){
  const starts=horse.life_starts,lines=horse.ratings?.lines||[];
  const problems=[];
  if(!Number.isInteger(starts)||starts<0)problems.push('CAREER_STARTS_UNVERIFIED');
  if(starts===0&&lines.length)problems.push('FTS_HAS_IMPORTED_HISTORY');
  if(starts>0&&!lines.length)problems.push('PRIOR_STARTS_BUT_ZERO_IMPORTED_LINES');
  if(Number.isInteger(starts)&&lines.length>starts)problems.push('MORE_LINES_THAN_CAREER_STARTS');
  const unknown=lines.filter(l=>!Number.isFinite(l.speed)).length;
  const incompletePace=lines.filter(l=>!Number.isFinite(l.e1)||!Number.isFinite(l.e2)||!Number.isFinite(l.late)).length;
  const result={race:race.race,program:String(horse.n),horse:horse.name,sourcePage:horse.source_evidence?.page??null,careerStarts:starts,importedLines:lines.length,missingSpeedLines:unknown,incompletePaceLines:incompletePace,problems};
  rows.push(result);
  if(problems.length)failures.push(result);
 }
}
const summary={mode:'RESEARCH_ONLY',source:basename(path),parserVersion:card.parser_version,track:card.track,date:card.date,races:Object.keys(card.races).length,runners:rows.length,priorStartZeroLineCount:failures.filter(x=>x.problems.includes('PRIOR_STARTS_BUT_ZERO_IMPORTED_LINES')).length,flags:failures.length,limitations:['PDF.js positioned-text importer, not an independent visual/source transcription','Missing figures may be genuinely absent or a parsing defect; compare source cells','Source-page and official scratches require separate verification']};
process.stdout.write(JSON.stringify({summary,rows},null,2)+'\n');
if(failures.length)process.exitCode=2;
