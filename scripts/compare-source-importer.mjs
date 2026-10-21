#!/usr/bin/env node
// Research-only comparison of independently transcribed source first dates and actual PDF.js import output.
// Usage: node scripts/compare-source-importer.mjs source_line_evidence.csv importer.json
import {readFile} from 'node:fs/promises';
const [csvFile,jsonFile]=process.argv.slice(2);
if(!csvFile||!jsonFile)throw Error('Usage: node scripts/compare-source-importer.mjs source_line_evidence.csv importer.json');
const parseCsv=s=>{const lines=s.trim().split(/\r?\n/),keys=lines.shift().split(',');return lines.map(line=>{const cells=[];let current='',quoted=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){current+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){cells.push(current);current='';}else current+=c;}cells.push(current);return Object.fromEntries(keys.map((k,i)=>[k,cells[i]||'']));});};
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const source=parseCsv(await readFile(csvFile,'utf8'));
const imported=JSON.parse(await readFile(jsonFile,'utf8'));
if(imported.summary?.mode!=='RESEARCH_ONLY'||!Array.isArray(imported.rows))throw Error('Expected research-only importer audit JSON');
const short={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jly:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
const dateFromPP=s=>{const m=String(s).match(/^(\d{2})([A-Za-z]{3})(\d{2})/);return m&&short[m[2]]?'20'+m[3]+'-'+short[m[2]]+'-'+m[1]:null;};
const findings=source.map(s=>{
 const matches=imported.rows.filter(r=>String(r.race)===String(s.race)&&norm(r.horse)===norm(s.horse));
 if(matches.length!==1)return {race:s.race,horse:s.horse,classification:'IMPORT_IDENTITY_UNRESOLVED',sourcePage:s.source_page};
 const r=matches[0],firstDate=dateFromPP(s.first_date),dates=r.importedHistory?.map(l=>l.date).filter(Boolean)||[];
 let classification='UNRESOLVED_SOURCE_DATE';
 if(Number(s.life_starts)===0)classification='GENUINE_FTS';
 else if(firstDate&&dates.includes(firstDate))classification='FIRST_PRINTED_DATE_IMPORTED';
 else if(firstDate&&dates.length)classification='PRINTED_FIRST_DATE_NOT_IMPORTED';
 else if(firstDate)classification='PRINTED_HISTORY_IMPORT_EMPTY';
 return {race:s.race,horse:s.horse,sourcePage:s.source_page,sourceLifeStarts:Number(s.life_starts),sourceFirstDate:firstDate,importedLineCount:r.importedLines,importedDates:dates,classification};
});
const counts=Object.fromEntries([...new Set(findings.map(f=>f.classification))].map(k=>[k,findings.filter(f=>f.classification===k).length]));
process.stdout.write(JSON.stringify({mode:'RESEARCH_ONLY',source:csvFile,importedSource:imported.summary.source,counts,findings,limitations:['First printed date reconciliation only; full line-by-line Speed/E1/E2/LP verification remains pending','The source CSV and importer JSON must be from the same exact PDF and card','Unmatched identities and missing dates are HOLD, never interpreted as first-time starters']},null,2)+'\n');
if(findings.some(f=>!['GENUINE_FTS','FIRST_PRINTED_DATE_IMPORTED'].includes(f.classification)))process.exitCode=2;
