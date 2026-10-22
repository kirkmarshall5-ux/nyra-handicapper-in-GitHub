import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {rankBrisnetModels} from './brisnet-models.js';
import {brisnetRankingHtml} from './brisnet-ranking-display.js';
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const providerFn=html.match(/function morningLineProvider\(\)\{[\s\S]*?\n\}/)[0];
test('morning line follows latest matching upload independently of active source',()=>{
 const context={activeCard:{provider:'BRISNET'},cardProvider:c=>c.provider,providerCards:{DRF:{imported_at:'2026-10-22T13:00:00Z'},BRISNET:{imported_at:'2026-10-22T12:00:00Z'}},providerRace:()=>({race:{}})};
 assert.equal(vm.runInNewContext(providerFn+';morningLineProvider()',context),'DRF');
 context.providerCards.BRISNET.imported_at='2026-10-22T14:00:00Z';assert.equal(vm.runInNewContext('morningLineProvider()',context),'BRISNET');
 context.providerRace=p=>({race:p==='DRF'?{}:null});assert.equal(vm.runInNewContext('morningLineProvider()',context),'DRF');
});
test('morning line renders four eligible runners from only the chosen source',()=>{
 const horses=Array.from({length:7},(_,i)=>({n:String(i+1),name:'Horse '+(i+1),ml:(i+1)+'/1',odds:i===0?'SCR':'—',entry_status:i===1?'AE':'REGULAR'}));
 const body=html.slice(html.indexOf(' const mlProvider='),html.indexOf(' const panel=kind=>'));
 const oddsFn=html.match(/function oddsNumber\(o\)\{[^\n]+/)[0];
 const context={morningLineProvider:()=> 'DRF',providerRace:p=>{assert.equal(p,'DRF');return {race:{horses}};},topMl:{innerHTML:''},escapeText:s=>String(s)};
 vm.runInNewContext(oddsFn+'\n'+body,context);
 assert.equal((context.topMl.innerHTML.match(/<tr><td>/g)||[]).length,4);
 assert.match(context.topMl.innerHTML,/#3 Horse 3/);assert.match(context.topMl.innerHTML,/#6 Horse 6/);assert.doesNotMatch(context.topMl.innerHTML,/#7 Horse 7|BRISNET/);
});
test('Brisnet remaining ranks preserve order and evidence follows the dropdown',()=>{
 const race={date:'2026-10-22',surface:'Dirt',distance_furlongs:6,ratings_provider:'BRISNET',horses:Array.from({length:6},(_,i)=>({n:String(i+1),name:'Horse '+(i+1),life_starts:1,odds:'—',ml:'4/1',ratings:{provider:'BRISNET',lines:[{date:'2026-10-01',surface:'Dirt',furlongs:6,speed:90-i,late:80,e1:80,e2:80,source:{provider:"BRISNET",page:1,text:"synthetic source row"}}]}}))};
 const result=rankBrisnetModels(race).contender,before=structuredClone(result),rendered=brisnetRankingHtml(result,'contender',race);
 assert.ok(rendered.indexOf('Remaining Ranked Horses')<rendered.indexOf('class="model-evidence-note"'));
 assert.match(rendered,/5\. #5 Horse 5/);assert.match(rendered,/6\. #6 Horse 6/);assert.deepEqual(result,before);
});
