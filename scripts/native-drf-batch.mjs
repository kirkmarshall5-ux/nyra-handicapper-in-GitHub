import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {restoredPage,parseRestoredCard} from '../restored-card-parser.js';
import {websiteRace} from '../scoring-engine.js';
import {rankContenders,DRF_CONTENDER_MODEL_ID} from '../contender-rankings.js';
const [out,...inputs]=process.argv.slice(2);
if(!out||!inputs.length)throw Error('Usage: node scripts/native-drf-batch.mjs output.json input.pdf ...');
if(inputs.some(p=>path.resolve(p)===path.resolve(out)))throw Error('Output must not overwrite input');
const cards=[];
for(const file of inputs){
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
 const races=Object.entries(card.races).map(([number,race])=>{
 const baseline=websiteRace(race);
 const model=rankContenders(race,baseline);
 return {number,decision:model.decision,reason:model.reason??null,rankings:model.rankings.map((h,i)=>({...h,rank:i+1})),field:race.horses.map(h=>({n:h.n,name:h.name,entry_status:h.entry_status}))};
 });
 cards.push({file:path.basename(file),sha256:createHash('sha256').update(bytes).digest('hex'),date:card.date,track:card.track,races});
 }finally{await doc.destroy();}
}
fs.writeFileSync(out,JSON.stringify({schema:'native-drf-batch-v1',model_id:DRF_CONTENDER_MODEL_ID,status:'UNRECONCILED_PRE_RESULTS',cards},null,2),{flag:'wx'});
console.log('Exported',cards.length,'cards; official field reconciliation and parity verification still required.');
