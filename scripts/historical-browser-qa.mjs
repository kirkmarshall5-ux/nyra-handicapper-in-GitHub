import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const snapshot=await readFile(new URL('../fixtures/historical-results-synthetic.json',import.meta.url));
const browser=await chromium.launch({headless:true});
await mkdir('browser-qa-artifacts',{recursive:true});
try{
 for(const [name,viewport]of [['desktop',{width:1280,height:900}],['ipad',{width:820,height:1180}],['iphone',{width:390,height:844}]]){
  const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle'});
  await page.locator('.tab[data-tab="historical"]').click();
  await page.locator('#historicalJson').setInputFiles({name:'synthetic-historical.json',mimeType:'application/json',buffer:snapshot});
  await page.locator('#historicalIdentity').waitFor({state:'visible'});
  await page.waitForFunction(()=>document.querySelector('#historicalStatus').textContent.includes('imported'));
  assert.match(await page.locator('#historicalReport').innerText(),/Official result not yet entered/);
  await page.locator('#historicalCorrections summary').click();
  await page.locator('#historicalSourceRef').fill('synthetic-fixture-only.pdf');
  await page.locator('#historicalFinish').fill('1, 2, 3');
  await page.locator('#historicalWin').fill('8');
  await page.locator('#historicalPlaceFirst').fill('4');
  await page.locator('#historicalPlaceSecond').fill('3');
  await page.locator('#historicalExactaPay').fill('30');
  await page.locator('#historicalExactaBase').fill('2');
  await page.locator('#historicalOfficialVerified').check();
  await page.locator('#historicalSettle').click();
  await page.waitForFunction(()=>document.querySelector('#historicalStatus').textContent.includes('official result saved'));
  const rr=page.locator('#historicalReport table').first().locator('tbody tr').filter({has:page.getByText('Brisnet-RR',{exact:true})});
  assert.match(await rr.innerText(),/\$6\.00/);
  assert.match(await rr.innerText(),/\$12\.00/);
  assert.match(await page.locator('#historicalReport').innerText(),/RR found the winner, missed the companion/);
  await page.locator('#historicalStrategy').selectOption('WIN_EXACTA');
  assert.match(await rr.innerText(),/\$4\.00/);
  assert.match(await rr.innerText(),/\$8\.00/);
  // Failed settlement must preserve the earlier confirmed result.
  await page.locator('#historicalExactaBase').fill('0');
  await page.locator('#historicalSettle').click();
  await page.waitForFunction(()=>document.querySelector('#historicalStatus').textContent.includes('denomination'));
  assert.match(await rr.innerText(),/\$8\.00/);
  // Exercise the real PDF.js/file-input path with a clearly synthetic PDF.
  await page.locator('#historicalResultFile').setInputFiles(new URL('../fixtures/equibase-results-synthetic.pdf',import.meta.url).pathname);
  await page.waitForFunction(()=>document.querySelector('#historicalStatus').textContent.includes('1 races imported and checked automatically'));
  const pp=page.locator('#historicalReport table').first().locator('tbody tr').filter({has:page.getByText('Prime Power',{exact:true})});
  assert.match(await pp.innerText(),/\$23\.00/);
  assert.match(await page.locator('#historicalReport').innerText(),/automatically checked/);
  assert.match(await rr.innerText(),/\$8\.00/);
  const dl=page.waitForEvent('download');await page.locator('#historicalBackup').click();assert.match((await dl).suggestedFilename(),/Historical_Results/);
  await page.screenshot({path:'browser-qa-artifacts/historical-'+name+'.png',fullPage:true});
  await page.reload({waitUntil:'networkidle'});
  await page.locator('.tab[data-tab="historical"]').click();
  await page.locator('#historicalSaved').selectOption({index:1});
  await page.locator('#historicalOpen').click();
  assert.match(await page.locator('#historicalReport').innerText(),/\$8\.00/);
  await page.locator('.tab[data-tab="raceday"]').click();
  assert.equal(await page.locator('#historical').isVisible(),false);
  assert.equal(await page.locator('#raceDayDashboard').isVisible(),true);
  assert.deepEqual(errors,[]);
  await context.close();
  console.log('Historical Results: '+name+' passed');
 }
}finally{await browser.close();}
