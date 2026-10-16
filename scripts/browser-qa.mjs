import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

// Automated Chromium checks only. The iPad profile emulates viewport/touch;
// it is NOT a real iPad Chrome or WebKit acceptance test.
const root=process.env.QA_URL||'http://127.0.0.1:8765/';
const out='browser-qa-artifacts';mkdirSync(out,{recursive:true});
const profiles=[
 {name:'desktop-chromium',viewport:{width:1365,height:850},isMobile:false,hasTouch:false},
 {name:'ipad-chromium-emulation',viewport:{width:820,height:1180},deviceScaleFactor:2,isMobile:true,hasTouch:true}
];
const browser=await chromium.launch({headless:true});
const results=[];let failures=0;
for(const profile of profiles){
 const context=await browser.newContext({viewport:profile.viewport,deviceScaleFactor:profile.deviceScaleFactor||1,isMobile:profile.isMobile,hasTouch:profile.hasTouch,acceptDownloads:true});
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 const check=async(name,fn)=>{
  try{await fn();results.push({profile:profile.name,check,status:'PASS'});console.log('PASS',profile.name,name)}
  catch(e){failures++;results.push({profile:profile.name,check:name,status:'FAIL',message:String(e)});console.error('FAIL',profile.name,name,String(e));try{await page.screenshot({path:`${out}/${profile.name}-${name.replace(/[^a-z0-9]/gi,'-')}.png`,fullPage:true})}catch{}}
 };
 await check('D01-load-and-initialize',async()=>{
  const r=await page.goto(root,{waitUntil:'domcontentloaded',timeout:30000});assert.equal(r?.status(),200);
  await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});
  await page.locator('#raceTitle').waitFor();
  assert.equal(errors.length,0,'Uncaught page errors: '+errors.join(' | '));
 });
 await check('D02-three-model-panels-and-hidden-panels',async()=>{
  for(const id of ['topContenders','contenderCandidates','mix1Candidates'])assert.equal(await page.locator('#'+id).count(),1);
  for(const id of ['topJockeys','topTrainers','topPairings'])assert.equal(await page.locator('#'+id).isVisible(),false,id+' must remain hidden');
  assert.equal(await page.getByText('Potentially overlooked angles',{exact:false}).isVisible(),false);
 });
 await check('D05-notes-follow-race-and-reload',async()=>{
  await page.locator('[data-tab="raceday"]').click();
  const buttons=page.locator('#racebar button');
  assert.ok(await buttons.count()>0,'No race navigation');
  await buttons.nth(0).click();
  await page.locator('#raceNotes').fill('QA smoke note race 1');
  if(await buttons.count()>1){
   await buttons.nth(1).click();
   assert.notEqual(await page.locator('#raceNotes').inputValue(),'QA smoke note race 1','Race 1 notes leaked to Race 2');
   await page.locator('#raceNotes').fill('QA smoke note race 2');
   await buttons.nth(0).click();
   assert.equal(await page.locator('#raceNotes').inputValue(),'QA smoke note race 1');
  }
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});
  await page.locator('#racebar button').first().click();
  assert.equal(await page.locator('#raceNotes').inputValue(),'QA smoke note race 1');
 });
 await check('D08-D09-research-only-and-PASS',async()=>{
  await page.locator('[data-tab="bets"]').click();
  await page.locator('#betSuggestions').getByText('BETTING: PASS',{exact:false}).waitFor();
  assert.match(await page.locator('#researchPreview').innerText(),/Automated betting: PASS/);
  assert.equal((await page.locator('#researchFreeze').innerText()).trim(),'Freeze All 3 Models');
  assert.match(await page.locator('#releaseStatus').innerText(),/Betting disabled/i);
 });
 await check('D12-missing-attestations-block-freeze',async()=>{
  await page.locator('#researchPostTime').fill('');
  await page.locator('#researchField').uncheck();
  await page.locator('#researchSurface').uncheck();
  await page.locator('#researchFreeze').click();
  assert.match(await page.locator('#researchStatus').innerText(),/post time|verify/i);
  assert.match(await page.locator('#researchCount').innerText(),/0 frozen pre-race snapshots/);
 });
 await check('D14-viewport-and-controls',async()=>{
  await page.locator('[data-tab="raceday"]').click();
  assert.equal(await page.locator('#raceTitle').isVisible(),true);
  await page.locator('[data-tab="bets"]').click();
  assert.equal(await page.locator('#researchFreeze').isVisible(),true);
  assert.equal(await page.locator('#researchExport').isVisible(),true);
  assert.equal(errors.length,0,'Uncaught page errors: '+errors.join(' | '));
 });
 await page.screenshot({path:`${out}/${profile.name}-final.png`,fullPage:true});
 await context.close();
}
await browser.close();
writeFileSync(`${out}/results.json`,JSON.stringify({source:root,profiles:profiles.map(p=>p.name),results,failures,scope:'Automated Chromium smoke; iPad emulation is NOT device acceptance; no genuine pre-race anchor'},null,2));
console.log(JSON.stringify({total:results.length,failures},null,2));
if(failures)process.exitCode=1;
