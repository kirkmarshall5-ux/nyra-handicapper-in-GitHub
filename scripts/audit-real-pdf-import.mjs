import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {parseCard,reconstructPage} from '../card-loader.js';
const dir=process.argv[2],out=process.argv[3]||'real-pdf-import-audit.json';
if(!dir){console.error('Usage: node scripts/audit-real-pdf-import.mjs PDF_DIRECTORY [OUTPUT_JSON]');process.exit(2)}
const expected={'AQU--12-26-2025.pdf':10,'AQU--12-27-2025.pdf':11,'AQU--12-28-2025.pdf':10,'FG--12-20-2025.pdf':12,'GP--12-20-2025.pdf':11,'GP--12-21-2025.pdf':10,'GP--12-26-2025.pdf':10,'GP--12-27-2025.pdf':11,'GP--12-28-2025.pdf':10,'RP--12-20-2025.pdf':12};
const expectedRunners={'AQU--12-26-2025.pdf':85,'AQU--12-27-2025.pdf':99,'AQU--12-28-2025.pdf':80,'FG--12-20-2025.pdf':126,'GP--12-20-2025.pdf':107,'GP--12-21-2025.pdf':93,'GP--12-26-2025.pdf':82,'GP--12-27-2025.pdf':106,'GP--12-28-2025.pdf':86,'RP--12-20-2025.pdf':101};
const reports=[];
for(const [file,count] of Object.entries(expected)){
 const report={file,expected_races:count,expected_runners:expectedRunners[file],status:'ERROR'};
 try{
  const bytes=new Uint8Array(await readFile(join(dir,file)));
  report.sha256=createHash('sha256').update(bytes).digest('hex');
  const pdf=await getDocument({data:bytes,useSystemFonts:true,disableFontFace:true}).promise;
  const pages=[];
  for(let n=1;n<=pdf.numPages;n++){
   const page=await pdf.getPage(n),content=await page.getTextContent();
   pages.push(reconstructPage(content.items,n));
  }
  const card=parseCard(pages,{sourceName:file});
  const races=Object.values(card.races);
  report.track=card.track;report.date=card.date;report.parsed_races=races.length;
  report.runners=races.reduce((n,r)=>n+r.horses.length,0);
  report.races=races.map(r=>({race:r.race,runner_count:r.horses.length,dist:r.dist,surface:r.surface,horses:r.horses.map(h=>({program:h.n,name:h.name,morning_line:h.ml,beyer_figures:h.figs??h.beyer_figures??null,timeform_early:h.ppEvidence?.timeformEarly??null,timeform_late:h.ppEvidence?.timeformLate??null,pace_source:h.ppEvidence?.source??null}))}));
  const numbers=races.map(r=>Number(r.race));
  report.missing_races=Array.from({length:count},(_,i)=>i+1).filter(n=>!numbers.includes(n));
  report.empty_races=races.filter(r=>!r.horses.length).map(r=>r.race);
  report.unexpected_races=numbers.filter(n=>!Number.isInteger(n)||n<1||n>count);
  report.duplicate_races=numbers.filter((n,i)=>numbers.indexOf(n)!==i);
  report.runner_count_matches=report.runners===report.expected_runners;
  report.duplicate_programs=races.flatMap(r=>r.horses.map(h=>h.n).filter((n,i,a)=>a.indexOf(n)!==i).map(n=>({race:r.race,program:n})));
  report.status=!report.runner_count_matches||report.duplicate_programs.length||report.parsed_races!==count||report.missing_races.length||report.empty_races.length||report.unexpected_races.length||report.duplicate_races.length?'INCOMPLETE':'STRUCTURE_PASS';
 }catch(e){report.error=String(e?.stack||e)}
 reports.push(report);
 console.log(file,report.status,report.parsed_races??0,report.runners??0);
}
const summary={expected_races:107,parsed_races:reports.reduce((n,r)=>n+(r.parsed_races||0),0),parsed_entries:reports.reduce((n,r)=>n+(r.runners||0),0),expected_entries:965,passed_cards:reports.filter(r=>r.status==='STRUCTURE_PASS').length,warning:'STRUCTURE_PASS does not certify horse identity or figure completeness.',reports};
await writeFile(out,JSON.stringify(summary,null,2)+'\n');
if(summary.passed_cards!==10||summary.parsed_entries!==summary.expected_entries)process.exitCode=1;
