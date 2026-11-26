import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {restoredPage,parseRestoredCard} from '../restored-card-parser.js';
import {websiteRace} from '../scoring-engine.js';
import {rankContenders,DRF_CONTENDER_MODEL_ID} from '../contender-rankings.js';
import {parseEquibaseResults} from '../equibase-results-parser.js';
import {reconcileNativeField} from './native-drf-field.mjs';
import {correctRaceConditions} from '../manual-race-conditions.js';
const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]/g,'');
async function readChart(file){
 const bytes=fs.readFileSync(file),pages=[];
 const doc=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise;
 try{
 for(let p=1;p<=doc.numPages;p++)pages.push({pageNumber:p,items:(await(await doc.getPage(p)).getTextContent()).items});
 return {parsed:parseEquibaseResults(pages,{sourceRef:path.basename(file)}),sha256:createHash('sha256').update(bytes).digest('hex')};
 }finally{await doc.destroy();}
}
const [out,...inputs]=process.argv.slice(2);
if(!out||!inputs.length||inputs.length%2)throw Error('Usage: node scripts/native-drf-batch.mjs output.json pp.pdf chart.pdf [pp.pdf chart.pdf ...]');
if(inputs.some(p=>path.resolve(p)===path.resolve(out)))throw Error('Output must not overwrite input');
const cards=[];
for(let i=0;i<inputs.length;i+=2){
 const file=inputs[i],chart=await readChart(inputs[i+1]);
 const bytes=fs.readFileSync(file),pages=[];
 const doc=await getDocument({data:new Uint8Array(bytes),disableFontFace:true}).promise;
 try{
 for(let p=1;p<=doc.numPages;p++){
 const pg=await doc.getPage(p);await pg.getOperatorList();
 const c=await pg.getTextContent({disableNormalization:true});
 const fonts=Object.fromEntries(Object.keys(c.styles).map(k=>[k,pg.commonObjs.get(k)?.name||'']));
 pages.push(restoredPage(c.items,p,fonts));
 }
 const card=parseRestoredCard(pages,{sourceName:path.basename(file)});
 const {parsed}=chart;
 const numbers=Object.keys(card.races).map(Number);
 if(!numbers.length||new Set(numbers).size!==numbers.length||parsed.identities.length!==numbers.length||parsed.identities.some(id=>id.date!==card.date||norm(id.track)!==norm(card.track)||!numbers.includes(id.race)))throw Error('Chart track/date or full race inventory mismatch');
 const races=Object.entries(card.races).map(([number,original])=>{
 const official=parsed.races.find(r=>r.race===Number(number));
 if(!official)return {number,decision:'PENDING',reason:parsed.pending.find(r=>r.race===Number(number))?.reason??'Missing verified chart',rankings:[]};
 let race;
 try{
 const corrected=correctRaceConditions({drf:card},'drf',number,{surface:official.surface,furlongs:official.distanceFurlongs}).drf.races[number];
 race=reconcileNativeField(corrected,{verified:official.verified,starters:official.field.map(h=>({program:h.n,name:h.name}))});
 }catch(e){return {number,decision:'PENDING',reason:e.message,rankings:[]};}

 const baseline=websiteRace(race);
 const model=rankContenders(race,baseline);
 return {number,decision:model.decision,reason:model.reason??null,rankings:model.rankings.map((h,i)=>({...h,rank:i+1})),field:race.horses.map(h=>({n:h.n,name:h.name,entry_status:h.entry_status}))};
 });
 cards.push({file:path.basename(file),sha256:createHash('sha256').update(bytes).digest('hex'),date:card.date,track:card.track,chart_sha256:chart.sha256,races});
 }finally{await doc.destroy();}
}
fs.writeFileSync(out,JSON.stringify({schema:'native-drf-batch-v1',model_id:DRF_CONTENDER_MODEL_ID,status:cards.some(c=>c.races.some(r=>r.decision==='PENDING'))?'PENDING_RECONCILIATION':'RECONCILED_OFFICIAL_STARTERS',cards},null,2),{flag:'wx'});
console.log('Exported',cards.length,'cards; reference parity verification still required.');
