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
 await check('D02-two-model-panels-and-hidden-panels',async()=>{
  for(const id of ['topContenders','contenderCandidates'])assert.equal(await page.locator('#'+id).count(),1);
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
 await check('D14-viewport-and-controls',async()=>{
  await page.locator('[data-tab="raceday"]').click();
  assert.equal(await page.locator('#raceTitle').isVisible(),true);
  for(const id of ['bets','researchFreeze','mix1Candidates','v44PaceCandidates','raceSelector','updateOddsSnapshot','manualOddsPanel'])assert.equal(await page.locator('#'+id).count(),0);
  await page.locator('[data-tab="pace"]').click();
  assert.equal(await page.locator('#paceMap').isVisible(),true);
  assert.equal(errors.length,0,'Uncaught page errors: '+errors.join(' | '));
 });

 await check('D15-Brisnet-native-rankings-and-original-source-restore',async()=>{
  const original=await page.evaluate(()=>localStorage.getItem('nyraV44cReleaseActiveCard'));
  try{
   await page.evaluate(()=>{
    const date='2026-10-16',track='Belmont Park';
    const horses=[1,2,3].map(n=>({n:String(n),name:'QA Brisnet Runner '+n,ml:'4/1',odds:'—',entry_status:'REGULAR',included_in_frozen_field:true,life_starts:n===3?0:1,lifeStarts:n===3?0:1,style:'UNKNOWN',beyer_figures:[],figs:[],last:null,best:null,timeform_early:null,timeform_late:null,parser_blockers:['BRISNET_SPEED_NOT_BEYER'],angles:[],source_context:{workout_text:'',pedigree_text:''},ratings:{provider:'BRISNET',run_style:n===3?'NA':'E/P',quirin_points:n===3?null:5,lines:n===3?[]:[{date:'2026-09-20',track:'Bel',surface:'Dirt',furlongs:8,e1:85+n,e2:90+n,late:80+n,speed:75+n,source:{provider:'BRISNET',page:1,text:'Synthetic QA source line'}}]}}));
    const race={race:1,date,track,surface:'Dirt',dist:'1 Mile',header:'1 Mile',distance_furlongs:8,cls:'QA maiden',post:'1:10 ET',horses,ratings_provider:'BRISNET',source_format:'BRISNET_PREMIUM_PLUS',parser_blockers:['BRISNET_SOURCE_MODEL_VALIDATION_PENDING']};
    localStorage.setItem('nyraV44cReleaseActiveCard',JSON.stringify({id:'qa-native-brisnet',schemaVersion:2,track,date,races:{1:race},parser_version:'BRISNET-PREMIUM-PLUS-positioned-v2',source_format:'BRISNET_PREMIUM_PLUS',warnings:[]}));
   });
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#topContenders').getByText('V4.4c-Brisnet base · experimental',{exact:false}).waitFor({timeout:20000});
   for(const id of ['topContenders','contenderCandidates']){
    const target=page.locator('#'+id);assert.equal(await target.locator('tbody tr').count(),2,id+' must rank the two experienced runners');
    assert.match(await target.innerText(),/Ranked 2\/3/);
    assert.match(await target.innerText(),/First-time starter/);
    assert.match(await target.innerText(),/probability conversion has not been validated/);
   }
   assert.match(await page.locator('#releaseStatus').innerText(),/V44C-BRISNET-BASE/);
   assert.match(await page.locator('#horseTable tbody tr').first().innerText(),/76/);
   assert.match(await page.locator('#horseTable tbody tr').first().innerText(),/E\/P/);
   await page.locator('[data-tab="pace"]').click();
   assert.match(await page.locator('#paceMap').innerText(),/Brisnet E\/P/);
   assert.match(await page.locator('#paceMap').innerText(),/E1/);
   assert.match(await page.locator('#paceMap').innerText(),/LP/);
   assert.match(await page.locator('#projectedRaceSetup').innerText(),/E2 rank \/ figure/i);
   assert.match(await page.locator('#brisnetEvidence').innerText(),/91/);
   assert.match(await page.locator('#weights').innerText(),/Pace has no weight/);
   assert.match(await page.locator('#evidenceSummary').innerText(),/Brisnet Speed/);
   assert.equal(await page.locator('#callRanksTitle').innerText(),'Brisnet historical pace ranks');


   assert.match(await page.locator('#contenderRules').innerText(),/Contender consumes early pace and LP/);
   assert.equal(errors.length,0,'Brisnet page errors: '+errors.join(' | '));
   await page.evaluate(()=>{
    const c=JSON.parse(localStorage.getItem('nyraV44cReleaseActiveCard')),h=c.races[1].horses[2];
    h.life_starts=1;h.lifeStarts=1;h.ratings.run_style='P';h.ratings.lines=structuredClone(c.races[1].horses[0].ratings.lines);h.ratings.lines[0].speed=82;
    localStorage.setItem('nyraV44cReleaseActiveCard',JSON.stringify(c));
   });
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});
   assert.equal(await page.locator('#contenderCandidates tbody tr').count(),3);
   assert.equal(errors.length,0,'Full-field core model errors: '+errors.join(' | '));
   await page.evaluate(()=>{
    const c=JSON.parse(localStorage.getItem('nyraV44cReleaseActiveCard'));
    c.races[1].horses.forEach(h=>h.ratings.lines.forEach(l=>l.furlongs=6));
    localStorage.setItem('nyraV44cReleaseActiveCard',JSON.stringify(c));
   });
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#topContenders').getByText('V4.4c-Brisnet base · experimental',{exact:false}).waitFor({timeout:20000});
   await page.locator('[data-tab="pace"]').click();
   assert.match(await page.locator('#paceMap').innerText(),/0\/3 eligible runners/);
   assert.match(await page.locator('#brisnetEvidence').innerText(),/Unmatched - context only/);
   assert.match(await page.locator('#brisnetEvidence').innerText(),/91/);
   assert.match(await page.locator('#projectedRaceSetup').innerText(),/Unknown/);
   assert.equal(errors.length,0,'Unmatched Brisnet pace errors: '+errors.join(' | '));
   await page.evaluate(()=>{const c=JSON.parse(localStorage.getItem('nyraV44cReleaseActiveCard'));c.parser_version='BRISNET-PREMIUM-PLUS-positioned-v1';localStorage.setItem('nyraV44cReleaseActiveCard',JSON.stringify(c));});
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});
   assert.match(await page.locator('#ppStatus').innerText(),/saved card is preserved.*Re-upload/i);
   assert.equal(await page.locator('#topContenders tbody tr').count(),0,'Retired parser must not silently rerank saved source');
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('nyraV44cReleaseActiveCard')).races[1].horses[0].ratings.lines[0].e2),91);

  }finally{
   await page.evaluate(value=>{if(value===null)localStorage.removeItem('nyraV44cReleaseActiveCard');else localStorage.setItem('nyraV44cReleaseActiveCard',value);},original);
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});
  }
  assert.doesNotMatch(await page.locator('#releaseStatus').innerText(),/V44C-BRISNET-BASE/);
  await page.locator('[data-tab="pace"]').click();
  assert.equal(await page.locator('#callRanksTitle').innerText(),'Projected race set up');
  assert.match(await page.locator('#weights').innerText(),/Last verified Beyer/);

 });
 await page.screenshot({path:`${out}/${profile.name}-final.png`,fullPage:true});
 await context.close();
}
await browser.close();
writeFileSync(`${out}/results.json`,JSON.stringify({source:root,profiles:profiles.map(p=>p.name),results,failures,scope:'Automated Chromium smoke; iPad emulation is NOT device acceptance; no genuine pre-race anchor'},null,2));
console.log(JSON.stringify({total:results.length,failures},null,2));
if(failures)process.exitCode=1;


