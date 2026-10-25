import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
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
 await context.addInitScript(()=>{
  window.qaReadActive=async()=>{const m=await import(new URL('./dual-pp-cards.js',location.href));const session=await m.readProviderSession(),cards=await m.readProviderCards();return cards[session?.selectedProvider]||null;};
  window.qaSetActive=async card=>{if(!card)return;const m=await import(new URL('./dual-pp-cards.js',location.href));const session=await m.readProviderSession();await m.writeProviderSession(card,session?.state||{});};
 });
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
 await check('D02-four-comparison-panels-and-hidden-panels',async()=>{
  for(const id of ['topContenders','finisherCandidates','contenderCandidates'])assert.equal(await page.locator('#'+id).count(),1);
  const boxes=await Promise.all(['topMl','brisContenderCandidates','contenderCandidates','finisherCandidates'].map(id=>page.locator('#'+id).boundingBox()));
  assert.ok(boxes.every(Boolean));
  if(profile.viewport.width>=760){assert.ok(boxes[0].x<boxes[1].x&&boxes[2].x<boxes[3].x,'Both rows must run left to right');assert.ok(Math.abs(boxes[0].y-boxes[1].y)<2&&Math.abs(boxes[2].y-boxes[3].y)<2,'Each pair must share a row');assert.ok(boxes[2].y>boxes[0].y&&Math.abs(boxes[0].x-boxes[2].x)<2,'DRF Contender must sit below Morning Line');}
  else{assert.ok(boxes[0].y<boxes[1].y&&boxes[1].y<boxes[2].y&&boxes[2].y<boxes[3].y,'Mobile panels must retain comparison order');}
  for(const id of ['contenderCandidates','brisContenderCandidates']){
   const panel=page.locator('#'+id);
   for(const table of await panel.locator('table.candidate-table').all()){
    assert.equal(await table.locator('th').nth(1).isVisible(),true);
    for(const n of [2,3])assert.equal(await table.locator('th').nth(n).isVisible(),false);
    for(const cell of await table.locator('tbody td:nth-child(n+3)').all())assert.equal(await cell.isVisible(),false);
   }
   assert.equal(await panel.getByText('True Chance is an estimate',{exact:false}).isVisible(),false);
   assert.equal(await panel.getByText('Fair Odds / True Chance unavailable:',{exact:false}).isVisible(),false);
  }
  for(const id of ['topJockeys','topTrainers','topPairings','topContenders','brisTopContenders','brisFinisherCandidates'])assert.equal(await page.locator('#'+id).isVisible(),false,id+' must remain hidden');
  assert.equal(await page.getByText('Potentially overlooked angles',{exact:false}).isVisible(),false);
  assert.equal(await page.locator('[data-tab="pp"]').count(),0);assert.equal(await page.locator('#ppFile').count(),0);assert.equal(await page.locator('#manageSavedCards').count(),1);assert.equal(await page.locator('#uploadBrisnet').count(),1);assert.equal(await page.locator('#uploadDrf').count(),1);assert.equal(await page.locator('#raceDayUploadStatus').count(),1);assert.equal(await page.locator('#raceDayUploadStatus').getAttribute('aria-live'),'polite');
 });
 await check('D04-clean-Load-NYRA-layout',async()=>{
  assert.equal(await page.locator('#updateOddsScratches').count(),1);assert.equal(await page.locator('#raceday #updateOddsScratches').count(),1);assert.equal(await page.locator('#updateOtherOdds, #updateOtherScratches').count(),0);
  await page.locator('[data-tab="public"]').click();
  for(const id of ['openRace','freezeAllModels','ppSourceView','exportBrisnetSourceAudit','exportBrisnetModelAudit'])assert.equal(await page.locator('#public #'+id).isVisible(),true);
  for(const id of ['tryLoad','nyraPaste','parsePaste','loadSample','loadStatus'])assert.equal(await page.locator('#'+id).isVisible(),false);
  assert.equal(await page.getByText('Why a fallback?',{exact:true}).isVisible(),false);
  const link=await page.locator('#openRace').boundingBox(),source=await page.locator('#ppSourceView').boundingBox(),freeze=await page.locator('#freezeAllModels').boundingBox();
  assert.ok(link.y<source.y&&source.y<freeze.y);
  assert.ok(await page.evaluate(async()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${out}/${profile.name}-load-nyra-cleanup.png`,fullPage:true});
  await page.locator('[data-tab="raceday"]').click();
  for(const id of ['uploadBrisnet','uploadDrf','updateOddsScratches'])assert.equal(await page.locator('#raceday #'+id).isVisible(),true);
  for(const id of ['freezeAllModels','ppSourceView'])assert.equal(await page.locator('#raceday #'+id).count(),0);
  const upload=await page.locator('#uploadDrf').boundingBox(),update=await page.locator('#updateOddsScratches').boundingBox();assert.ok(update.x>upload.x&&Math.abs(update.y-upload.y)<2,'Update button must sit to the right of Upload DRF PP');
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
  assert.equal(await page.locator('#pace #transparentRatingRules, #pace #contenderRules').count(),0);
  await page.locator('[data-tab="knowledge"]').click();
  for(const id of ['transparentRatingRules','contenderRules','weights'])assert.equal(await page.locator('#knowledge #'+id).isVisible(),true);
  await page.locator('[data-tab="pace"]').click();

  assert.equal(errors.length,0,'Uncaught page errors: '+errors.join(' | '));
 });

 await check('D15-Brisnet-native-rankings-and-original-source-restore',async()=>{
  const original=await page.evaluate(async()=>JSON.stringify(await window.qaReadActive()));
  try{
   await page.evaluate(async()=>{
    const date='2026-10-16',track='Belmont Park';
    const horses=[1,2,3].map(n=>({n:String(n),name:'QA Brisnet Runner '+n,ml:'4/1',odds:'—',entry_status:'REGULAR',included_in_frozen_field:true,life_starts:n===3?0:1,lifeStarts:n===3?0:1,style:'UNKNOWN',beyer_figures:[],figs:[],last:null,best:null,timeform_early:null,timeform_late:null,parser_blockers:['BRISNET_SPEED_NOT_BEYER'],angles:[],source_context:{workout_text:'',pedigree_text:''},ratings:{provider:'BRISNET',run_style:n===3?'NA':'E/P',quirin_points:n===3?null:5,lines:n===3?[]:[{date:'2026-09-20',track:'Bel',surface:'Dirt',furlongs:8,e1:85+n,e2:90+n,late:80+n,speed:75+n,source:{provider:'BRISNET',page:1,text:'Synthetic QA source line'}}]}}));
    const race={race:1,date,track,surface:'Dirt',dist:'1 Mile',header:'1 Mile',distance_furlongs:8,cls:'QA maiden',post:'1:10 ET',horses,ratings_provider:'BRISNET',source_format:'BRISNET_PREMIUM_PLUS',parser_blockers:['BRISNET_SOURCE_MODEL_VALIDATION_PENDING']};
    await window.qaSetActive({id:'qa-native-brisnet',schemaVersion:2,track,date,races:{1:race},parser_version:'BRISNET-PREMIUM-PLUS-positioned-v3',source_format:'BRISNET_PREMIUM_PLUS',warnings:[]});
   });
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#brisTopContenders').getByText('V4.4c-Brisnet base · experimental',{exact:false}).waitFor({state:'attached',timeout:20000});
   for(const id of ['brisTopContenders','brisContenderCandidates']){
    const target=page.locator('#'+id);assert.equal(await target.locator('tbody tr').count(),2,id+' must rank the two experienced runners');
    assert.match(await target.innerText(),/Ranked 2\/3/);
    assert.match(await target.textContent(),/First-time starter/);
    assert.match(await target.textContent(),/probability conversion has not been validated/);
   }
   assert.match(await page.locator('#brisFinisherCandidates').innerText(),/Ranked 2\/3/);
   assert.match(await page.locator('#brisFinisherCandidates').innerText(),/Finisher: PASS/);
   assert.equal(await page.locator('#brisFinisherCandidates tbody tr').count(),2);assert.equal(await page.locator('#horseTable tr[data-program="3"] .grid-contender-rank').innerText(),'Unranked');assert.equal(await page.locator('#horseTable tr[data-program="3"] .score').innerText(),'N/A');
   assert.match(await page.locator('#releaseStatus').innerText(),/V44C-BRISNET-BASE/);
   assert.match(await page.locator('#horseTable tbody tr[data-program="1"]').innerText(),/76/);
   assert.match(await page.locator('#horseTable tbody tr[data-program="1"]').innerText(),/E\/P/);
   await page.locator('[data-tab="pace"]').click();
   assert.match(await page.locator('#paceMap').innerText(),/Brisnet E\/P/);
   assert.match(await page.locator('#paceMap').innerText(),/E1/);
   assert.match(await page.locator('#paceMap').innerText(),/LP/);
   assert.match(await page.locator('#projectedRaceSetup').innerText(),/E2 rank \/ figure/i);
   assert.equal(await page.locator('#paceMap table').count(),0);
   assert.equal(await page.locator('#projectedRaceSetup table').count(),1);
   assert.equal(await page.locator('#paceSourceEvidence').getAttribute('open'),null);
   assert.equal(await page.locator('#evidenceSummary').isVisible(),false);
   await page.locator('#paceSourceEvidence > summary').click();
   assert.equal(await page.locator('#evidenceSummary').isVisible(),true);assert.equal(await page.locator('#brisnetEvidence table').count(),1);assert.match(await page.locator('#brisnetEvidence').innerText(),/91/);assert.match(await page.locator('#evidenceSummary').innerText(),/Brisnet Speed/);
   await page.evaluate(async()=>window.scrollTo(0,0));await page.screenshot({path:`${out}/${profile.name}-pace-source-evidence.png`,fullPage:true});
   await page.locator('#paceSourceEvidence > summary').click();
   await page.evaluate(async()=>window.scrollTo(0,0));await page.screenshot({path:`${out}/${profile.name}-pace-cleanup.png`,fullPage:true});

   assert.match(await page.locator('#weights').innerText(),/Pace has no weight/);
   assert.equal(await page.locator('#callRanksTitle').innerText(),'Horse pace comparison');


   assert.match(await page.locator('#contenderRules').innerText(),/Contender consumes early pace and LP/);
   assert.equal(errors.length,0,'Brisnet page errors: '+errors.join(' | '));
   await page.evaluate(async()=>{
    const c=(await window.qaReadActive()),h=c.races[1].horses[2];
    h.life_starts=1;h.lifeStarts=1;h.ratings.run_style='P';h.ratings.lines=structuredClone(c.races[1].horses[0].ratings.lines);h.ratings.lines[0].speed=82;
    await window.qaSetActive(c);
   });
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});
   assert.equal(await page.locator('#brisContenderCandidates tbody tr').count(),3);
   assert.equal(await page.locator('#brisFinisherCandidates tbody tr').count(),3);
   assert.equal(errors.length,0,'Full-field core model errors: '+errors.join(' | '));
   await page.evaluate(async()=>{
    const c=(await window.qaReadActive());
    c.races[1].horses.forEach(h=>h.ratings.lines.forEach(l=>l.furlongs=6));
    await window.qaSetActive(c);
   });
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#brisTopContenders').getByText('V4.4c-Brisnet base · experimental',{exact:false}).waitFor({state:'attached',timeout:20000});
   await page.locator('[data-tab="pace"]').click();
   assert.match(await page.locator('#paceMap').innerText(),/0\/3 eligible runners/);
   await page.locator('[data-tab="pace"]').click();await page.locator('#paceSourceEvidence > summary').click();assert.match(await page.locator('#brisnetEvidence').innerText(),/Unmatched - context only/);assert.match(await page.locator('#brisnetEvidence').innerText(),/91/);await page.locator('#paceSourceEvidence > summary').click();
   assert.match(await page.locator('#projectedRaceSetup').innerText(),/No qualifying pace line/);
   assert.equal(errors.length,0,'Unmatched Brisnet pace errors: '+errors.join(' | '));
   await page.evaluate(async()=>{const c=(await window.qaReadActive());c.parser_version='BRISNET-PREMIUM-PLUS-positioned-v1';await window.qaSetActive(c);});
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});
   assert.match(await page.locator('#ppStatus').innerText(),/saved card is preserved.*Re-upload/i);
   assert.equal(await page.locator('#brisTopContenders tbody tr').count(),0,'Retired parser must not silently rerank saved source');
   assert.equal(await page.locator('#brisFinisherCandidates tbody tr').count(),0,'Finisher must hold retired parser evidence');
   assert.equal(await page.evaluate(async()=>(await window.qaReadActive()).races[1].horses[0].ratings.lines[0].e2),91);

  }finally{
   await page.evaluate(async value=>{if(value!==null)await window.qaSetActive(JSON.parse(value));},original);
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});
  }
  assert.doesNotMatch(await page.locator('#releaseStatus').innerText(),/V44C-BRISNET-BASE/);
  await page.locator('[data-tab="pace"]').click();
  assert.equal(await page.locator('#callRanksTitle').innerText(),'Projected race set up');
  assert.match(await page.locator('#weights').innerText(),/Last verified Beyer/);

 });
 await check('D16-Finisher-DRF-scratches-FTS-and-full-field',async()=>{
  const original=await page.evaluate(async()=>JSON.stringify(await window.qaReadActive()));
  try{
   await page.evaluate(async()=>{
    const {PARSER_ID}=await import('./release-card-parser.js'),date='2026-10-18',track='Belmont Park';
    const horses=[1,2,3,4,5,6,7].map(n=>({n:String(n),name:'QA Finisher Runner '+n,ml:n===7?'6/5':'4/1',odds:n===5?'SCR':'—',entry_status:'REGULAR',included_in_frozen_field:true,life_starts:n===7?0:1,lifeStarts:n===7?0:1,beyer_figures:n===7?[]:[90-n],figs:n===7?[]:[90-n],timeform_early:n===7?null:85,timeform_late:n===7?null:90,parser_blockers:[],angles:[],source_context:{workout_text:'',pedigree_text:''},contender_evidence:{beyer_evidence:[],switch_evidence:{running_lines:[]}}}));
    const race={race:1,date,track,surface:'Dirt',header:'6 Furlongs',dist:'6 Furlongs',cls:'QA maiden',post:'1:10 ET',horses,parser_blockers:[]};
    const second=structuredClone(race);second.race=2;second.horses.forEach(h=>{h.name='QA Second Race Runner '+h.n;});
    await window.qaSetActive({id:'qa-finisher-drf',schemaVersion:3,track,date,races:{1:race,2:second},parser_version:PARSER_ID,warnings:[]});
   });
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});
   const target=page.locator('#finisherCandidates');assert.equal(await target.isVisible(),true);
   assert.equal(await target.locator(':scope > table tbody tr').count(),4);
   const remaining=target.locator('details.remaining-ranked');assert.equal(await remaining.getAttribute('open'),null);await remaining.locator('summary').click();assert.equal(await remaining.locator('tbody tr').count(),1);assert.match(await remaining.innerText(),/5\. #6 QA Finisher Runner 6/);await remaining.locator('summary').click();
   assert.match(await target.innerText(),/Ranked 5\/6/);assert.match(await target.innerText(),/PASS/);
   assert.match(await target.textContent(),/QA Finisher Runner 7/);assert.doesNotMatch(await target.innerText(),/QA Finisher Runner 5/);
   const dashboard=page.locator('#raceDayDashboard');
   assert.match(await dashboard.innerText(),/5\/6 ranked · incomplete field · PASS/);
   assert.equal(await dashboard.locator('.dashboard-paper').getAttribute('open'),null);
   await dashboard.locator('.dashboard-paper > summary').click();
   await page.locator('#dashboardPaperSource').selectOption('drfFinisher');
   assert.equal(await dashboard.locator('.dashboard-paper').getAttribute('open'),'');
   assert.match(await dashboard.locator('.dashboard-tickets').innerText(),/All available tests\s+\$14/);
   await page.locator('#dashboardPaperSource').selectOption('morningLine');
   assert.match(await dashboard.locator('.dashboard-plan-controls').first().innerText(),/#7 → #1 → #2/);
   const dashboardBefore=await dashboard.locator('.dashboard-table').first().innerText();
   const downloading=page.waitForEvent('download');await page.locator('#dashboardFreeze').click();
   const download=await downloading,record=JSON.parse(readFileSync(await download.path(),'utf8'));
   assert.equal(record.races.length,2);
   assert.equal(record.races[1].dashboard.race.number,2);
   assert.match(record.races[1].dashboard.field[0].name,/Second Race/);
   assert.equal(record.races[0].dashboard.schema,'nyra-race-dashboard-v1');
   assert.equal(record.races[0].dashboard.models.find(m=>m.id==='drfContender').rankings.length,5);
   assert.equal(record.races[0].dashboard.morning_line.rankings[0].n,'7');
   assert.ok(record.races[0].dashboard.field.every(h=>h.n!=='5'));
   assert.equal(record.races[0].dashboard.source_cards.DRF.card_id,'qa-finisher-drf');
   assert.equal(record.races[0].dashboard.betting_enabled,false);
   assert.equal(await dashboard.locator('.dashboard-table').first().innerText(),dashboardBefore,'Freeze must restore the selected race dashboard');
   assert.match(await page.locator('#dashboardSnapshotStatus').innerText(),/exported: 2 races/);
   await page.evaluate(async()=>window.scrollTo(0,0));
   await page.screenshot({path:`${out}/${profile.name}-race-dashboard.png`,fullPage:true});
   await page.setViewportSize({width:390,height:844});
   assert.ok(await dashboard.evaluate(el=>el.getBoundingClientRect().width<=innerWidth));
   await page.evaluate(async()=>window.scrollTo(0,0));
   await page.screenshot({path:`${out}/${profile.name}-race-dashboard-narrow.png`,fullPage:true});
   await page.setViewportSize(profile.viewport);

   assert.match(await target.innerText(),/Fair odds and win percentages are unavailable/);
   const drfPanel=page.locator('#contenderCandidates');
   assert.equal(await drfPanel.locator('details.remaining-ranked summary').innerText(),'Remaining Ranked Horses');
   await drfPanel.locator('details.remaining-ranked summary').click();assert.equal(await drfPanel.locator('details.remaining-ranked tbody tr').count(),1);for(const cell of await drfPanel.locator('details.remaining-ranked tbody td:nth-child(n+3)').all())assert.equal(await cell.isVisible(),false);
   assert.match(await drfPanel.locator('details.remaining-ranked').innerText(),/5\. #6 QA Finisher Runner 6/);await drfPanel.locator('details.remaining-ranked summary').click();
   assert.ok(await drfPanel.evaluate(el=>!!(el.querySelector('.remaining-ranked').compareDocumentPosition(el.querySelector('.model-evidence-note'))&Node.DOCUMENT_POSITION_FOLLOWING)));
   assert.equal(await page.locator('#topMl tbody tr').count(),4);
   assert.equal(await page.locator('.comparison-row > .card > details').count(),0);
   await page.locator('[data-tab="knowledge"]').click();assert.equal(await page.locator('#contenderModelDetails').isVisible(),true);assert.equal(await page.locator('#contenderModelDetails details').count(),3);assert.match(await page.locator('#contenderModelDetails').innerText(),/How Contender ranks/);await page.locator('[data-tab="raceday"]').click();

   for(const id of ['topContenders','finisherCandidates','contenderCandidates']){const notice=page.locator('#'+id+' .model-evidence-note');assert.equal(await notice.getAttribute('open'),null);if(await notice.isVisible())await notice.locator(':scope > summary').click();else await notice.evaluate(el=>{el.open=true});assert.equal(await notice.evaluate(el=>el.open),true);assert.match(await notice.innerText(),/ranked 5\/6 starters/);assert.match(await notice.innerText(),/16\.7%/);assert.match(await notice.innerText(),/Morning-line favorite — UNRANKED/);assert.match(await notice.innerText(),/at or below 20% does not clear missing evidence/);assert.match(await notice.innerText(),/ML 6\/5/);}
   await page.screenshot({path:`${out}/${profile.name}-missing-favorite.png`,fullPage:true});
   await page.evaluate(async()=>{const c=(await window.qaReadActive()),h=c.races[1].horses[6];h.life_starts=1;h.lifeStarts=1;h.beyer_figures=[95];h.figs=[95];await window.qaSetActive(c);});
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});
   assert.match(await target.innerText(),/Complete field ranked/);assert.match(await target.innerText(),/Ranked 6\/6/);
   assert.match(await target.locator('tbody tr').first().innerText(),/Runner 7/);
   await page.screenshot({path:`${out}/${profile.name}-finisher-raceday.png`,fullPage:true});
   assert.equal(errors.length,0,'Finisher page errors: '+errors.join(' | '));
  }finally{
   await page.evaluate(async value=>{if(value!==null)await window.qaSetActive(JSON.parse(value));},original);
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});
  }
 });
 await check('D17-Premium-five-sixteenths-upload-routing',async()=>{
  const original=await page.evaluate(async()=>JSON.stringify(await window.qaReadActive()));
  try{
   const parsed=await page.evaluate(async()=>{
    const {parsePPCard}=await import('./pp-format-router.js?v=20261018-premium4');
    const item=(str,x,y)=>({str,transform:[1,0,0,1,x,y],width:str.length*3.16});
    const pages=[{pageNumber:1,items:[item("Premium Plus PP's",10,760),item('Belmont Park',120,760),item('Mdn 100k 1Š Mile (T) Sunday, October 18, 2026 Race 1',200,760),item('brisnet.com Bloodstock Research',10,20),item('QA Fraction Runner (NA 0)',45,650),item('1',17,645),item('Life: 0 0 - 0 - 0',390,650),item('8/1',17,636)]}];
    const c=parsePPCard(pages,{sourceName:'QA-five-sixteenths.pdf'});await window.qaSetActive(c);return {distance:c.races[1].distance_furlongs,surface:c.races[1].surface};
   });
   assert.equal(parsed.distance,10.5);assert.equal(parsed.surface,'Turf');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});
   assert.match(await page.locator('#raceBadges').innerText(),/1 5\/16M/);
   assert.match(await page.locator('#brisFinisherCandidates').innerText(),/QA Fraction Runner/);
   assert.equal(await page.locator('#brisFinisherCandidates tbody tr').count(),0,'FTS must remain unranked');
   assert.equal(errors.length,0,'Fraction upload routing page errors: '+errors.join(' | '));
  }finally{
   await page.evaluate(async value=>{if(value!==null)await window.qaSetActive(JSON.parse(value));},original);
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});
  }
 });
 await check('D18-direct-NYRA-update-scratches-persist-and-fail-safe',async()=>{
  const original=await page.evaluate(async()=>JSON.stringify(await window.qaReadActive()));
  const service='https://nyra-odds-snapshot.beigebeech4.chatgpt.site/odds?*';let fail=false,pause=false,release=null;
  await page.route(service,async route=>{
   if(pause)await new Promise(resolve=>{release=resolve;});
   if(fail){await route.fulfill({status:503,headers:{'access-control-allow-origin':'*'},body:'Unavailable'});return;}
   await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({schemaVersion:1,track:'belmont',date:'2026-10-18',race:1,fetchedAt:new Date().toISOString(),sourceUrl:'https://www.nyra.com/belmont/racing/entries/',upstreamAgeSeconds:null,runners:[1,2,3].map(n=>({program:String(n),name:'QA Update Runner '+n,odds:n===3?'SCR':'3/1'}))})});
  });
  try{
   await page.evaluate(async()=>{
    const date='2026-10-18',track='Belmont Park',horses=[1,2,3].map(n=>({n:String(n),name:'QA Update Runner '+n,ml:'4/1',odds:'—',entry_status:'REGULAR',included_in_frozen_field:true,life_starts:1,lifeStarts:1,beyer_figures:[],figs:[],angles:[],source_context:{},parser_blockers:['BRISNET_SPEED_NOT_BEYER'],ratings:{provider:'BRISNET',run_style:'P',lines:[{date:'2026-09-20',surface:'Dirt',furlongs:8,speed:75+n,e1:85+n,e2:90+n,late:80+n,source:{provider:'BRISNET',text:'Synthetic QA row'}}]}}));
    const race={race:1,date,track,surface:'Dirt',dist:'1 Mile',distance_furlongs:8,header:'1 Mile',cls:'QA allowance',horses,parser_blockers:['BRISNET_SOURCE_MODEL_VALIDATION_PENDING']};
    await window.qaSetActive({id:'qa-direct-update',schemaVersion:2,track,date,races:{1:race,2:{...structuredClone(race),race:2}},parser_version:'BRISNET-PREMIUM-PLUS-positioned-v3',source_format:'BRISNET_PREMIUM_PLUS',warnings:[]});
   });
   await page.reload({waitUntil:'domcontentloaded'});await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});
   await page.locator('[data-tab="raceday"]').click();assert.equal(await page.locator('#updateOddsScratches').isVisible(),true);await page.locator('#updateOddsScratches').click();
   await page.locator('#nyraUpdateStatus').getByText('Selected-source models refreshed.',{exact:false}).waitFor({timeout:10000});
   assert.match(await page.locator('#nyraUpdateStatus').innerText(),/#3 QA Update Runner 3/);
   for(const id of ['brisTopContenders','brisFinisherCandidates','brisContenderCandidates']){assert.equal(await page.locator('#'+id+' tbody tr').count(),2);assert.doesNotMatch(await page.locator('#'+id+' tbody').innerText(),/QA Update Runner 3/);}
   const saved=await page.evaluate(async()=>(await window.qaReadActive()).races[1]);assert.equal(saved.horses[2].odds,'SCR');assert.equal(saved.horses[2].ratings.lines[0].speed,78);assert.equal(saved.horses[0].ml,'4/1');
   await page.reload({waitUntil:'domcontentloaded'});await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});await page.locator('[data-tab="raceday"]').click();assert.match(await page.locator('#nyraUpdateStatus').innerText(),/Last NYRA update/);assert.equal(await page.locator('#brisFinisherCandidates tbody tr').count(),2);
   fail=true;await page.locator('#updateOddsScratches').click();await page.locator('#nyraUpdateStatus').getByText('Update failed:',{exact:false}).waitFor({timeout:10000});assert.equal(await page.evaluate(async()=>(await window.qaReadActive()).races[1].horses[2].odds),'SCR');assert.equal(await page.locator('#updateOddsScratches').isEnabled(),true);
   fail=false;pause=true;const pending=page.waitForRequest(service);await page.locator('#updateOddsScratches').click();await pending;await page.locator('[data-tab="raceday"]').click();await page.locator('#racebar button').nth(1).click();await new Promise(r=>setTimeout(r,20));assert.ok(release);release();await page.waitForFunction(()=>!document.getElementById('updateOddsScratches').disabled);assert.doesNotMatch(await page.locator('#nyraUpdateStatus').innerText(),/Fetching/);assert.equal(await page.locator('#brisFinisherCandidates tbody tr').count(),3,'Late Race 1 response must not scratch Race 2');
   assert.equal(errors.length,0,'NYRA update page errors: '+errors.join(' | '));
  }finally{
   await page.unroute(service);await page.evaluate(async value=>{if(value!==null)await window.qaSetActive(JSON.parse(value));},original);await page.reload({waitUntil:'domcontentloaded'});await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});
  }
 });
 await check('D19-two-provider-retention-matching-and-source-isolation',async()=>{
  const original=await page.evaluate(async()=>{const m=await import('./dual-pp-cards.js');return {cards:await m.readProviderCards(),active:JSON.stringify(await window.qaReadActive())};});
  try{
   await page.evaluate(async()=>{
    const {writeProviderCard}=await import('./dual-pp-cards.js'),{PARSER_ID}=await import('./release-card-parser.js'),{PREMIUM_PARSER_ID}=await import('./brisnet-premium-parser.js');
    const track='Belmont Park',date='2026-10-18';let drf;
    for(const provider of ['DRF','BRISNET']){const races={};for(const rn of [1,2]){const horses=[1,2,3].map(n=>({n:String(n),name:'QA Paired R'+rn+' Runner '+n,ml:n===3?'6/5':'4/1',odds:'—',entry_status:'REGULAR',included_in_frozen_field:true,life_starts:n===3?0:1,lifeStarts:n===3?0:1,beyer_figures:provider==='DRF'&&n!==3?[90+n]:[],figs:provider==='DRF'&&n!==3?[90+n]:[],last:provider==='DRF'&&n!==3?90+n:null,best:provider==='DRF'&&n!==3?90+n:null,timeform_early:n===3?null:85,timeform_late:n===3?null:90,style:'UNKNOWN',parser_blockers:provider==='BRISNET'?['BRISNET_SPEED_NOT_BEYER']:[],angles:[],source_context:{workout_text:'',pedigree_text:''},contender_evidence:{beyer_evidence:[],switch_evidence:{running_lines:[]}},...(provider==='BRISNET'?{ratings:{provider:'BRISNET',run_style:n===3?'NA':'E/P',lines:n===3?[]:[{date:'2026-10-01',surface:'Dirt',furlongs:6,speed:70+n,e1:85,e2:85,late:90,source:{provider:'BRISNET',text:'Synthetic dual-provider QA'}}]}}:{})}));races[rn]={race:rn,date,track,header:'6 Furlongs',dist:'6 Furlongs',surface:'Dirt',conditions:{surface:'Dirt'},cls:'QA maiden',distance_furlongs:6,post:'1:10 ET',horses,parser_blockers:provider==='BRISNET'?['BRISNET_SOURCE_MODEL_VALIDATION_PENDING']:[],...(provider==='BRISNET'?{ratings_provider:'BRISNET'}:{})};}
     const c={id:'qa-paired-'+provider,schemaVersion:3,track,date,races,source_format:provider==='DRF'?'DRF':'BRISNET_PREMIUM_PLUS',parser_version:provider==='DRF'?PARSER_ID:PREMIUM_PARSER_ID,warnings:[]};await writeProviderCard(provider,c);if(provider==='DRF')drf=c;
    }await window.qaSetActive(drf);
   });
   await page.reload({waitUntil:'domcontentloaded'});await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});await page.locator('[data-tab="raceday"]').click();
   for(const id of ['brisTopContenders','brisFinisherCandidates','brisContenderCandidates','topContenders','finisherCandidates','contenderCandidates']){assert.match(await page.locator('#'+id).innerText(),/ranked 2\/3 starters/);assert.match(await page.locator('#'+id).textContent(),/Morning-line favorite — UNRANKED/);}
   const checkContenderGrid=async provider=>{
    const panel=page.locator(provider==='BRISNET'?'#brisContenderCandidates':'#contenderCandidates'),first=panel.locator('tbody tr').first(),gridFirst=page.locator('#horseTable tbody tr').first();
    assert.equal(await gridFirst.locator('.grid-contender-rank').innerText(),'1');assert.equal(await gridFirst.locator('.score').innerText(),await first.locator('td').nth(1).innerText());
    assert.ok((await first.locator('td').first().innerText()).includes(await gridFirst.locator('.horse').innerText()));
    assert.match(await page.locator('#gridModelStatus').innerText(),new RegExp(provider==='BRISNET'?'Brisnet Contender':'DRF Contender'));
   };
   await checkContenderGrid('DRF');
   for(const id of ['contenderCandidates','brisContenderCandidates']){const panel=page.locator('#'+id);assert.equal(await panel.locator('table').first().locator('th:visible').count(),2);assert.equal(await panel.locator('tbody td:nth-child(3)').first().isVisible(),false);assert.equal(await panel.locator('tbody td:nth-child(4)').first().isVisible(),false);}
   const brBox=await page.locator('#brisContenderCandidates').boundingBox(),drBox=await page.locator('#contenderCandidates').boundingBox(),mlBox=await page.locator('#topMl').boundingBox();assert.ok(mlBox.x<brBox.x&&Math.abs(mlBox.y-brBox.y)<2&&drBox.y>mlBox.y,'Two-row layout: Morning Line / Brisnet above DRF Contender / Finisher');assert.equal(await page.locator('#topMl table.candidate-table tbody tr').count(),3);assert.match(await page.locator('#topMl').innerText(),/M.L Odds/);assert.equal(await page.locator('#topMl tbody tr').first().locator('td').last().innerText(),'DRF');
   await page.evaluate(async()=>{const m=await import('./dual-pp-cards.js'),cards=await m.readProviderCards();cards.BRISNET.imported_at='2026-10-22T12:00:00Z';cards.DRF.imported_at='2026-10-22T13:00:00Z';for(const p of ['DRF','BRISNET'])await m.writeProviderCard(p,cards[p]);await window.qaSetActive(cards.DRF);});
   await page.reload({waitUntil:'domcontentloaded'});await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});
   await page.locator('#raceNotes').fill('Paired DRF note');await page.locator('[data-tab="public"]').click();await page.locator('#ppSourceView').selectOption('BRISNET');await page.locator('[data-tab="raceday"]').click();assert.match(await page.locator('#horseTable tbody tr[data-program="1"]').innerText(),/71/);await page.locator('#raceNotes').fill('Paired Brisnet note');await checkContenderGrid('BRISNET');assert.equal(await page.locator('#topMl tbody tr').first().locator('td').last().innerText(),'DRF');
   await page.reload({waitUntil:'domcontentloaded'});await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});assert.equal(await page.locator('#raceNotes').inputValue(),'Paired Brisnet note');await page.locator('[data-tab="public"]').click();await page.locator('#ppSourceView').selectOption('DRF');await page.locator('[data-tab="raceday"]').click();assert.equal(await page.locator('#raceNotes').inputValue(),'Paired DRF note');assert.match(await page.locator('#horseTable tbody tr[data-program="1"]').innerText(),/91/);
   await page.locator('#racebar button').nth(1).click();for(const id of ['brisFinisherCandidates','finisherCandidates'])assert.match(await page.locator('#'+id).innerText(),/QA Paired R2/);
   await page.locator('[data-tab="pace"]').click();assert.equal(await page.locator('#ppSourceView').inputValue(),'BRISNET');assert.match(await page.locator('#paceCardStatus').innerText(),/Showing Brisnet.*2026-10-18.*Race 2/);assert.match(await page.locator('#paceSourceLabel').innerText(),/Brisnet native/i);assert.match(await page.locator('#weights').innerText(),/Brisnet/);
   await page.locator('[data-tab="raceday"]').click();assert.match(await page.locator('#horseTable tbody tr[data-program="1"]').innerText(),/71/);await page.locator('[data-tab="public"]').click();await page.locator('#ppSourceView').selectOption('DRF');await page.locator('[data-tab="raceday"]').click();
   await page.screenshot({path:`${out}/${profile.name}-paired-PPs.png`,fullPage:true});
   const beforeFieldCorrection=await page.evaluate(async()=>{const m=await import('./dual-pp-cards.js');return JSON.stringify(await m.readProviderCards());});
   await page.evaluate(async()=>{const m=await import('./dual-pp-cards.js'),cards=await m.readProviderCards();for(const c of Object.values(cards)){const h=c.races[2].horses.find(h=>String(h.n)==='2');h.entry_status='AE';h.included_in_frozen_field=false;}await m.writeProviderCardsSession(cards,{},'DRF');});
   await page.reload({waitUntil:'domcontentloaded'});await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});await page.locator('#racebar button').nth(1).click();
   await page.locator('#horseTable [data-program="2"][data-field-action="running"]').click();await page.locator('#horseTable tr[data-program="2"]').getByText('AE drawn in',{exact:false}).waitFor();
   await page.locator('#horseTable [data-program="1"][data-field-action="scratch"]').click();await page.locator('#gridFieldStatus').getByText('Scratched: #1',{exact:false}).waitFor();assert.equal(await page.locator('#horseTable tr[data-program="1"]').count(),1);
   await page.reload({waitUntil:'domcontentloaded'});await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});
   const corrected=await page.evaluate(async()=>{const m=await import('./dual-pp-cards.js');return m.readProviderCards();});for(const c of Object.values(corrected)){assert.equal(c.races[2].horses.find(h=>String(h.n)==='2').included_in_frozen_field,true);assert.equal(c.races[2].horses.find(h=>String(h.n)==='1').odds,'SCR');}
   await page.evaluate(async raw=>{const m=await import('./dual-pp-cards.js');await m.writeProviderCardsSession(JSON.parse(raw),{},'DRF');},beforeFieldCorrection);await page.reload({waitUntil:'domcontentloaded'});await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});

   await page.evaluate(async()=>{const m=await import('./dual-pp-cards.js'),cards=await m.readProviderCards(),b=cards.BRISNET;b.date='2026-10-17';Object.values(b.races).forEach(r=>r.date=b.date);await m.writeProviderCard('BRISNET',b);});
   await page.reload({waitUntil:'domcontentloaded'});await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});assert.match(await page.locator('#brisTopContenders').innerText(),/does not match/);assert.equal(await page.locator('#brisTopContenders tbody tr').count(),0);assert.match(await page.locator('#topContenders').innerText(),/QA Paired/);
   await page.locator('[data-tab="pace"]').click();assert.equal(await page.locator('#ppSourceView').inputValue(),'DRF');assert.match(await page.locator('#paceCardStatus').innerText(),/Brisnet unavailable.*does not match.*fallback/);await page.locator('[data-tab="raceday"]').click();
   // Exercise the actual dedicated upload handlers with a synthetic positioned-text PDF reader.
   const pdfRoute='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
   await page.route(pdfRoute,async route=>{await route.fulfill({contentType:'application/javascript',body:`export const GlobalWorkerOptions={};export function getDocument(){const item=(str,x,y)=>({str,transform:[1,0,0,1,x,y],width:str.length*3.16});const items=[item("Premium Plus PP's",10,760),item('Belmont Park',120,760),item('Mdn 100k 6 Furlongs Sunday, October 18, 2026 Race 1',200,760),item('brisnet.com Bloodstock Research',10,20),item('QA Upload FTS (NA 0)',45,650),item('1',17,645),item('Life: 0 0 - 0 - 0',390,650),item('8/1',17,636)];return {promise:Promise.resolve({numPages:1,getPage:async()=>({getOperatorList:async()=>{},getTextContent:async()=>({items,styles:{}}),commonObjs:{get:()=>null}})})};}`});});
   try{
    const drfBefore=await page.evaluate(async()=>{const m=await import('./dual-pp-cards.js');return JSON.stringify((await m.readProviderCards()).DRF);});
    await page.locator('#drfFile').setInputFiles({name:'qa-wrong-provider.pdf',mimeType:'application/pdf',buffer:Buffer.from('synthetic QA bytes')});await page.locator('#providerUploadStatus').getByText('Upload failed',{exact:false}).waitFor({state:'attached',timeout:20000});assert.match(await page.locator('#raceDayUploadStatus').textContent(),/Upload failed/);assert.match(await page.locator('#raceDayUploadStatus').textContent(),/BRISNET/);
    assert.equal(await page.evaluate(async()=>{const m=await import('./dual-pp-cards.js');return JSON.stringify((await m.readProviderCards()).DRF);}),drfBefore);
    await page.locator('#brisnetFile').setInputFiles({name:'qa-correct-brisnet.pdf',mimeType:'application/pdf',buffer:Buffer.from('synthetic QA bytes')});await page.locator('#providerUploadStatus').getByText('card saved',{exact:false}).waitFor({state:'attached',timeout:20000});assert.match(await page.locator('#raceDayUploadStatus').textContent(),/card saved.*1 races.*1 runners loaded/);
    assert.match(await page.locator('#brisFinisherCandidates').innerText(),/QA Upload FTS/);assert.match(await page.locator('#finisherCandidates').innerText(),/QA Paired/);assert.equal(await page.evaluate(async()=>{const m=await import('./dual-pp-cards.js');return JSON.stringify((await m.readProviderCards()).DRF);}),drfBefore);
   }finally{await page.unroute(pdfRoute);}
   await page.locator('[data-tab="public"]').click();await page.locator('#manageSavedCards summary').click();await page.locator('#clearPP').click();assert.match(await page.locator('#ppStatus').innerText(),/other source is retained/);assert.match(await page.locator('#finisherCandidates').innerText(),/QA Paired/);await page.locator('#resetSample').click();assert.match(await page.locator('#cardKicker').innerText(),/2026-10-03/);assert.match(await page.locator('#providerCardsStatus').innerText(),/BRISNET: Belmont Park.*2026-10-18/);

   assert.equal(errors.length,0,'Dual-provider page errors: '+errors.join(' | '));
  }finally{
   await page.evaluate(async original=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('nyra-provider-pps-v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});await new Promise((resolve,reject)=>{const t=db.transaction('cards','readwrite');t.objectStore('cards').clear();for(const[p,c]of Object.entries(original.cards))t.objectStore('cards').put(c,p);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});db.close();if(original.active!==null)await window.qaSetActive(JSON.parse(original.active));},original);
   await page.reload({waitUntil:'domcontentloaded'});await page.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});
  }
 });
 await check('D19-quota-safe-session-migration-and-source-switch',async()=>{
  const qc=await browser.newContext({viewport:profile.viewport,acceptDownloads:true}),qp=await qc.newPage(),quotaErrors=[];
  qp.on('pageerror',e=>quotaErrors.push(String(e)));
  try{
   await qp.goto(root,{waitUntil:'domcontentloaded'});await qp.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});
   await qp.evaluate(async()=>{
    const {PARSER_ID}=await import('./release-card-parser.js'),m=await import('./dual-pp-cards.js'),date='2026-10-24',track='Belmont Park';
    const horse={n:'1',name:'Quota Test Runner',ml:'4/1',odds:'—',entry_status:'REGULAR',life_starts:0,lifeStarts:0,angles:[],beyer_figures:[],figs:[],source_context:{}};
    const r={race:1,date,track,dist:'6 Furlongs',header:'6 Furlongs',distance_furlongs:6,surface:'Dirt',cls:'QA maiden',post:'Unverified',horses:[horse],parser_blockers:[]};
    const d={id:'qa-quota-drf',track,date,parser_version:PARSER_ID,source_format:'DRF',races:{1:r},warnings:[],storage_fixture:'d'.repeat(2*1024*1024)};
    const b=structuredClone(d);b.id='qa-quota-bris';b.source_format='BRISNET_PREMIUM_PLUS';b.parser_version='BRISNET-PREMIUM-PLUS-positioned-v3';b.races[1].ratings_provider='BRISNET';b.races[1].horses[0].ratings={provider:'BRISNET',lines:[]};b.storage_fixture='b'.repeat(2*1024*1024);
    await m.writeProviderCard('DRF',d);await m.writeProviderCard('BRISNET',b);
    const db=await new Promise((resolve,reject)=>{const q=indexedDB.open('nyra-provider-pps-v1',1);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});
    await new Promise((resolve,reject)=>{const t=db.transaction('cards','readwrite');t.objectStore('cards').delete('__session__');t.oncomplete=resolve;t.onerror=()=>reject(t.error);});db.close();
    const legacy=structuredClone(d);delete legacy.storage_fixture;
    localStorage.setItem('nyraV44cReleaseActiveCard',JSON.stringify(legacy));localStorage.setItem('nyraV44cReleaseState',JSON.stringify({cards:{'qa-quota-drf':{runners:{},notes:{1:'Keep legacy notes'}}}}));localStorage.setItem('quota-unrelated','keep');
   });
   await qp.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(this===localStorage)throw new DOMException('The quota has been exceeded.','QuotaExceededError');return original.call(this,key,value);};});
   await qp.reload({waitUntil:'domcontentloaded'});await qp.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});
   assert.equal(await qp.locator('#raceNotes').inputValue(),'Keep legacy notes');
   assert.equal(await qp.evaluate(()=>localStorage.getItem('nyraV44cReleaseActiveCard')),null);
   assert.equal(await qp.evaluate(()=>localStorage.getItem('nyraV44cReleaseState')),null);
   assert.equal(await qp.evaluate(()=>localStorage.getItem('quota-unrelated')),'keep');
   await qp.locator('[data-tab="public"]').click();await qp.locator('#ppSourceView').selectOption('BRISNET');
   await qp.locator('[data-tab="raceday"]').click();assert.match(await qp.locator('#cardKicker').innerText(),/2026-10-24.*Brisnet/i);
   await qp.locator('#raceNotes').fill('Saved under quota');
   await qp.waitForFunction(async()=>{const m=await import('./dual-pp-cards.js');return (await m.readProviderSession())?.state.cards?.['qa-quota-bris']?.notes?.[1]==='Saved under quota';});
   await qp.reload({waitUntil:'domcontentloaded'});await qp.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});
   assert.match(await qp.locator('#cardKicker').innerText(),/2026-10-24.*Brisnet/i);assert.equal(await qp.locator('#raceNotes').inputValue(),'Saved under quota');
   const counts=await qp.evaluate(async()=>{const m=await import('./dual-pp-cards.js'),cards=await m.readProviderCards();return {d:cards.DRF.id,b:cards.BRISNET.storage_fixture.length,providers:Object.keys(cards)};});
   assert.equal(counts.d,'qa-quota-drf');assert.equal(counts.b,2*1024*1024);assert.equal(counts.providers.length,2);
   await qp.locator('[data-tab="public"]').click();await qp.locator('#ppSourceView').selectOption('DRF');await qp.locator('[data-tab="raceday"]').click();assert.equal(await qp.locator('#raceNotes').inputValue(),'Keep legacy notes');
   const pdfRoute='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
   await qp.route(pdfRoute,route=>route.fulfill({contentType:'application/javascript',body:`export const GlobalWorkerOptions={};export function getDocument(){const item=(str,x,y)=>({str,transform:[1,0,0,1,x,y],width:str.length*3.16});const items=[item("Premium Plus PP's",10,760),item('Belmont Park',120,760),item('Mdn 100k 6 Furlongs Saturday, October 24, 2026 Race 1',200,760),item('brisnet.com Bloodstock Research',10,20),item('Quota Upload Runner (NA 0)',45,650),item('1',17,645),item('Life: 0 0 - 0 - 0',390,650),item('8/1',17,636)];return {promise:Promise.resolve({numPages:1,getPage:async()=>({getOperatorList:async()=>{},getTextContent:async()=>({items,styles:{}}),commonObjs:{get:()=>null}})})};}`}));
   // Fail AFTER the card write was scheduled: the transaction must roll it back.
   await qp.evaluate(()=>{window.quotaOriginalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,key){if(key==='__session__'&&value.selectedProvider==='BRISNET')throw new DOMException('The quota has been exceeded.','QuotaExceededError');return window.quotaOriginalPut.call(this,value,key);};});
   await qp.locator('#brisnetFile').setInputFiles({name:'quota-retry.pdf',mimeType:'application/pdf',buffer:Buffer.from('synthetic QA PDF')});
   await qp.locator('#raceDayUploadStatus').getByText('Upload failed',{exact:false}).waitFor({state:'visible',timeout:20000});
   assert.match(await qp.locator('#raceDayUploadStatus').innerText(),/quota/i);
   const failed=await qp.evaluate(async()=>{const m=await import('./dual-pp-cards.js');return {id:(await m.readProviderCards()).BRISNET.id,selected:(await m.readProviderSession()).selectedProvider};});
   assert.equal(failed.id,'qa-quota-bris');assert.equal(failed.selected,'DRF');assert.equal(await qp.locator('#ppSourceView').inputValue(),'DRF');
   await qp.evaluate(()=>{IDBObjectStore.prototype.put=window.quotaOriginalPut;});
   await qp.locator('#brisnetFile').setInputFiles({name:'quota-retry.pdf',mimeType:'application/pdf',buffer:Buffer.from('synthetic QA PDF')});
   await qp.locator('#raceDayUploadStatus').getByText('card saved',{exact:false}).waitFor({state:'visible',timeout:20000});
   await qp.reload({waitUntil:'domcontentloaded'});await qp.locator('#releaseStatus').getByText('Rankings:',{exact:false}).waitFor({timeout:20000});
   assert.match(await qp.locator('#cardKicker').innerText(),/2026-10-24.*Brisnet/i);
   assert.equal(await qp.evaluate(async()=>{const m=await import('./dual-pp-cards.js');return (await m.readProviderCards()).DRF.id;}),'qa-quota-drf');
   assert.equal(quotaErrors.length,0,quotaErrors.join(' | '));
   await qp.screenshot({path:`${out}/${profile.name}-quota-storage.png`,fullPage:true});
  }finally{await qc.close();}
 });
 await page.screenshot({path:`${out}/${profile.name}-final.png`,fullPage:true});
 await context.close();
}
await browser.close();
writeFileSync(`${out}/results.json`,JSON.stringify({source:root,profiles:profiles.map(p=>p.name),results,failures,scope:'Automated Chromium smoke; iPad emulation is NOT device acceptance; no genuine pre-race anchor'},null,2));
console.log(JSON.stringify({total:results.length,failures},null,2));
if(failures)process.exitCode=1;


