import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {getDocument} from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/pdfjs-dist/legacy/build/pdf.mjs';
import {restoredPage,parseRestoredCard} from './engine/release-card-parser.js';
const root=path.dirname(new URL(import.meta.url).pathname);
fs.mkdirSync(path.join(root,'parsed'),{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(root,'source-manifest.json'))),summary=[];
for(const m of manifest){
 try{
  const bytes=fs.readFileSync(m.path);if(crypto.createHash('sha256').update(bytes).digest('hex')!==m.sha256)throw Error('Source hash changed');
  const pdf=await getDocument({data:new Uint8Array(bytes),disableFontFace:true}).promise,pages=[];
  for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n);await page.getOperatorList();const content=await page.getTextContent({disableNormalization:true}),fonts=Object.fromEntries(Object.keys(content.styles).map(k=>[k,page.commonObjs.get(k)?.name||'']));pages.push(restoredPage(content.items,n,fonts));}
  const card=parseRestoredCard(pages,{sourceName:m.file});card.source_sha256=m.sha256;
  fs.writeFileSync(path.join(root,'parsed',card.date+'.json'),JSON.stringify(card));
  const races=Object.values(card.races),s={file:m.file,date:card.date,track:card.track,races:races.length,horses:races.reduce((s,r)=>s+r.horses.length,0),pages:pdf.numPages,blockers:races.filter(r=>r.parser_blockers?.length).map(r=>({race:r.race,blockers:r.parser_blockers})),source_sha256:m.sha256};
  summary.push(s);console.log(JSON.stringify(s));await pdf.destroy();
 }catch(e){summary.push({file:m.file,error:String(e.stack)});console.log(m.file,String(e.message));}
}
fs.writeFileSync(path.join(root,'parse-summary.json'),JSON.stringify(summary,null,2)+'\n');
