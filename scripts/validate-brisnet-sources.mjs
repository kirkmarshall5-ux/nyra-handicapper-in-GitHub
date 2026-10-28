// Read-only production importer/model replay. Source PDFs and parsed cards stay local.
// Usage: node scripts/validate-brisnet-sources.mjs manifest.json output-directory
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {parsePPCard,detectPPFormat} from '../pp-format-router.js';
import {rankBrisnetModels,BRISNET_MODEL_IDS,active} from '../brisnet-models.js';
const [manifestFile,out]=process.argv.slice(2);
if(!manifestFile||!out)throw Error('Supply a local PDF manifest and output directory');
fs.mkdirSync(out,{recursive:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const report={schema:'brisnet-source-validation-v1',executed_at:new Date().toISOString(),model_id:BRISNET_MODEL_IDS.contender,model_sha256:hash(fs.readFileSync(new URL('../brisnet-models.js',import.meta.url))),coefficient_sha256:hash(fs.readFileSync(new URL('../contender-model.js',import.meta.url))),certified:false,scope:'Production parser and scoring replay, not browser upload or independent race certification',cards:[],failures:[]};
for(const spec of JSON.parse(fs.readFileSync(manifestFile))){
 const entry={id:spec.id,source_sha256:null,races:[],status:'FAILED'};report.cards.push(entry);
 let doc;
 try{
  const bytes=fs.readFileSync(spec.path);entry.source_sha256=hash(bytes);entry.source_bytes=bytes.length;
  if(spec.sha256)assert.equal(entry.source_sha256,spec.sha256,'Original source hash');
  doc=await getDocument({data:new Uint8Array(bytes),disableFontFace:true}).promise;
  const pages=[];for(let n=1;n<=doc.numPages;n++){const p=await doc.getPage(n);await p.getOperatorList();const tc=await p.getTextContent({disableNormalization:true});pages.push({pageNumber:n,items:tc.items});}
  assert.equal(detectPPFormat(pages),'BRISNET_PREMIUM_PLUS');
  const card=parsePPCard(pages,{sourceName:path.basename(spec.path)});card.source_sha256=entry.source_sha256;
  assert.equal(card.track,spec.track);assert.equal(card.date,spec.date);
  entry.date=card.date;entry.track=card.track;entry.pages=doc.numPages;entry.parser_version=card.parser_version;
  for(const r of Object.values(card.races)){
   const before=JSON.stringify(r),a=rankBrisnetModels(r),b=rankBrisnetModels(r),m=a.contender;
   assert.equal(JSON.stringify(a),JSON.stringify(b),'Nondeterministic rankings');assert.equal(JSON.stringify(r),before,'Source mutated');
   assert.equal(m.model_id,BRISNET_MODEL_IDS.contender);assert.equal(m.decision,'PASS');assert.equal(m.bettingEnabled,false);assert.equal(m.probabilityCalibrated,false);
   const field=r.horses.filter(active),ranked=new Set(m.rankings.map(h=>String(h.n))),unrated=new Set(m.unrated.map(h=>String(h.n)));
   assert.equal(ranked.size,m.rankings.length,'Duplicate rank');assert.equal(unrated.size,m.unrated.length,'Duplicate unrated');
   for(const h of m.rankings){assert.ok(field.some(f=>String(f.n)===String(h.n)));assert.ok(Number.isFinite(h.score));assert.ok(!unrated.has(String(h.n)));}
   assert.equal(ranked.size+unrated.size,field.length,'Unaccounted runner');
   entry.races.push({race:r.race,entries:r.horses.length,eligible:field.length,ranked:ranked.size,unrated:unrated.size,complete:ranked.size===field.length&&field.length>0,history_lines:r.horses.reduce((s,h)=>s+h.ratings.lines.length,0),conditional:r.horses.filter(h=>['AE','MTO','ALSO_ELIGIBLE'].includes(h.entry_status)).map(h=>String(h.n)),unrated_reasons:m.unrated.flatMap(h=>h.reasons),source_unchanged:true,deterministic:true,safeguards:true});
  }
  fs.writeFileSync(path.join(out,spec.id+'-card.json'),JSON.stringify(card));entry.status='REPLAY_PASSED';
 }catch(e){entry.error=e.message;report.failures.push(spec.id+': '+e.message);}finally{await doc?.destroy();}
}
report.summary={cards:report.cards.length,passed:report.cards.filter(c=>c.status==='REPLAY_PASSED').length,races:report.cards.reduce((s,c)=>s+c.races.length,0),entries:report.cards.flatMap(c=>c.races).reduce((s,r)=>s+r.entries,0),history_lines:report.cards.flatMap(c=>c.races).reduce((s,r)=>s+r.history_lines,0),complete_races:report.cards.flatMap(c=>c.races).filter(r=>r.complete).length};
fs.writeFileSync(path.join(out,'source-replay.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));if(report.failures.length){console.error(report.failures);process.exitCode=1;}
