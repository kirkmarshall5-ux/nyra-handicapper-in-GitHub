// Replay ORIGINAL Belmont PDF bytes through the same browser upload controls as Race Day.
// Requires local copies of the PDFs; the manifest hashes reject substitutions.
// Usage (with site served on localhost:8765):
//   node scripts/real-pdf-replay.mjs "/path/BEL--10-17-2026.pdf" "/path/Bel-10-17-2026 Premium Plus.pdf"
// Requires playwright already installed (same dependency as browser-qa.mjs).
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const manifest=JSON.parse(readFileSync(new URL('../fixtures/belmont-2026-10-17-real-pdf-manifest.json',import.meta.url),'utf8'));
const paths={DRF:process.argv[2],BRISNET:process.argv[3]};
for(const [provider,file] of Object.entries(paths)){
 if(!file)throw Error('Both original PDF paths required; refusing fixture-only certification.');
 const bytes=readFileSync(file),expected=manifest.sourcePdfs[provider];
 assert.equal(bytes.length,expected.bytes,provider+' original PDF byte count mismatch');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),expected.sha256,provider+' original PDF SHA-256 mismatch');
}
const browser=await chromium.launch({headless:true});
const report={manifest:'belmont-2026-10-17-real-pdf-manifest.json',date:manifest.date,verifiedOriginalBytes:true,providerResults:{},errors:[],certified:false};
try{
 const page=await browser.newPage({viewport:{width:1365,height:850}});
 const url=process.env.QA_URL||'http://127.0.0.1:8765/';
 const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
 assert.equal(response?.status(),200);
 await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:30000});
 for(const [provider,path] of Object.entries(paths)){
  const input=provider==='DRF'?'#drfFile':'#brisnetFile';
  await page.locator(input).setInputFiles(path);
  await page.locator('#raceDayUploadStatus').getByText(provider+' card saved.',{exact:false}).waitFor({timeout:180000});
  const result=await page.evaluate(async p=>{
   const {readProviderCards}=await import('./dual-pp-cards.js');
   const {displayedProviderModels}=await import('./pre-race-provider-adapter.js');
   const card=(await readProviderCards())[p];
   if(!card)throw Error(p+' upload did not persist');
   const races={};
   for(const [key,race] of Object.entries(card.races||{})){
    const adapted=displayedProviderModels(card,race);
    races[key]={horses:race.horses.map(h=>({program:String(h.n),horse:h.name,entryStatus:h.entry_status||'REGULAR',scratched:h.odds==='SCR',included:h.included_in_frozen_field!==false})),field:adapted.field,models:adapted.models.map(m=>({family:m.family,decision:m.decision,rankings:m.rankings})),unratedRunners:adapted.unratedRunners,ratedNotDisplayed:adapted.ratedNotDisplayed};
   }
   return {track:card.track,date:card.date,sourceSha256:card.source_sha256,sourceName:card.sourceName,parserVersion:card.parser_version,races};
  },provider);
  assert.equal(result.date,manifest.date,provider+' card date');
  assert.equal(result.sourceSha256,manifest.sourcePdfs[provider].sha256,provider+' browser PDF fingerprint');
  assert.equal(Object.keys(result.races).length,manifest.expectedRaces,provider+' race count');
  let entries=0;
  for(const [rn,expectedNames] of Object.entries(manifest.raceNames)){
   const race=result.races[rn];assert.ok(race,provider+' missing race '+rn);
   const actualNames=race.horses.map(h=>h.horse.trim());
   const missing=expectedNames.filter(n=>!actualNames.includes(n));
   const unexpected=actualNames.filter(n=>!expectedNames.includes(n));
   assert.deepEqual({missing,unexpected},{missing:[],unexpected:[]},provider+' race '+rn+' identities differ from DRF printed index');
   assert.equal(actualNames.length,expectedNames.length,provider+' race '+rn+' horse count');
   entries+=actualNames.length;
   assert.equal(race.models.length,3,provider+' race '+rn+' three models');
   const active=new Set(race.field.map(h=>h.program));
   const covered=new Set(race.models.find(m=>m.family==='V44C').rankings.map(h=>h.program));
   for(const h of [...race.ratedNotDisplayed,...race.unratedRunners]){
    assert.ok(active.has(h.program),provider+' race '+rn+' coverage outside active field');
    assert.ok(!covered.has(h.program),provider+' race '+rn+' duplicate rated/unrated classification');
    covered.add(h.program);
   }
   assert.equal(covered.size,active.size,provider+' race '+rn+' incomplete rating classification');
   for(const model of race.models){
    assert.ok(['RATEABLE','PASS','HOLD'].includes(model.decision));
    for(const h of model.rankings)assert.ok(active.has(h.program),provider+' race '+rn+' ineligible model selection');
   }
  }
  assert.equal(entries,manifest.expectedEntries,provider+' total entry count');
  report.providerResults[provider]={...result,entryCount:entries};
  console.log('PASS',provider,'original PDF upload, SHA-256, 11 races, 85 entries, model/coverage validation');
 }
 report.certified=true;
}catch(e){report.errors.push(String(e));console.error('REAL PDF REPLAY FAILED:',String(e));}
finally{
 await browser.close();
 mkdirSync('real-pdf-replay-artifacts',{recursive:true});
 writeFileSync('real-pdf-replay-artifacts/belmont-2026-10-17-replay.json',JSON.stringify(report,null,2));
}
if(!report.certified)process.exitCode=1;
