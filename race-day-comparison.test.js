import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {selectMorningLineProvider,morningLineNumber} from './race-day-dashboard.js';
import {rankBrisnetModels} from './brisnet-models.js';
import {rankBrisnetResearch} from './brisnet-research.js';
import {brisnetRankingHtml} from './brisnet-ranking-display.js';
import {rankContenders} from './contender-rankings.js';
import {releaseRace} from './rankings-release.js';
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const providerFn=html.match(/function morningLineProvider\(\)\{[\s\S]*?\n\}/)[0];
test('morning line follows latest matching upload independently of active source',()=>{
 const race={track:'Belmont Park',date:'2026-11-01',race:1,surface:'Dirt',distance_furlongs:6,horses:[{n:'1',name:'Example',ml:'4/1'}]};
 const context={race,selectMorningLineProvider,activeCard:{provider:'BRISNET'},cardProvider:c=>c.provider,providerCards:{DRF:{imported_at:'2026-10-22T13:00:00Z'},BRISNET:{imported_at:'2026-10-22T12:00:00Z'}},providerRace:()=>({race})};
 assert.equal(vm.runInNewContext(providerFn+';morningLineProvider()',context),'DRF');
 context.providerCards.BRISNET.imported_at='2026-10-22T14:00:00Z';assert.equal(vm.runInNewContext('morningLineProvider()',context),'BRISNET');
 context.providerRace=p=>({race:p==='DRF'?race:null});assert.equal(vm.runInNewContext('morningLineProvider()',context),'DRF');
});
test('morning line renders four eligible runners from only the chosen source',()=>{
 const horses=Array.from({length:7},(_,i)=>({n:String(i+1),name:'Horse '+(i+1),ml:(i+1)+'/1',odds:i===0?'SCR':'—',entry_status:i===1?'AE':'REGULAR'}));
 const body=html.slice(html.indexOf(' const mlProvider='),html.indexOf(' const panel=kind=>'));
 const oddsFn=html.match(/function oddsNumber\(o\)\{[^\n]+/)[0];
 const context={morningLineNumber,morningLineProvider:()=> 'DRF',providerRace:p=>{assert.equal(p,'DRF');return {race:{horses}};},topMl:{innerHTML:''},escapeText:s=>String(s)};
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

const gridFn=html.match(/function contenderGridRating\(\)\{[\s\S]*?\n\}/)[0];
const gridKey=html.match(/const gridRunnerKey=[^\n]+/)[0];
const scratchedGridFn=html.match(/function scratchedGridRows\(\)\{[\s\S]*?\n\}/)[0];
const gridSortFn=html.match(/function sortedGridHorses\([^\n]*\)\{[\s\S]*?\n\}/)[0];
const drfGridRace=()=>({date:'2026-10-11',surface:'Dirt',conditions:{surface:'Dirt'},header:'6 Furlongs',parser_blockers:[],horses:[60,70,80].map((figure,i)=>({n:String(i+1),name:'Grid runner '+(i+1),life_starts:1,beyer_figures:[figure],timeform_early:80+10*i,timeform_late:80,entry_status:'REGULAR',parser_blockers:[],switch_evidence:{running_lines:[{running_date_track:'1æ26=1Bel'}],boxes:{}},beyer_evidence:[{figure,running_date_track:'1æ26=1Bel',source_line:'1æ26=1Bel fst 6f '+figure+' 1/5'}],source_context:{}}))});
function gridContext(race,hasBrisnet=true){
 const context={race,providerRace:()=>({race:hasBrisnet?race:null}),rankBrisnetResearch,gridSort:{key:'rr',dir:1}};
 vm.runInNewContext(gridFn+'\n'+gridKey+'\n'+scratchedGridFn+'\n'+gridSortFn,context);
 return context;
}
test('handicapping grid uses Brisnet RR rankings without changing its scoring',()=>{
 const race={date:'2026-10-22',surface:'Dirt',distance_furlongs:6,ratings_provider:'BRISNET',horses:[70,90,80].map((speed,i)=>({n:String(i+1),name:'Native grid '+i,life_starts:1,odds:'—',ratings:{provider:'BRISNET',lines:[{date:'2026-10-01',surface:'Dirt',furlongs:6,speed,late:80,e1:80,e2:80,source:{provider:'BRISNET',page:1,text:'fixture'}}]}}))};
 const before=structuredClone(race),expected=rankBrisnetResearch(race),context=gridContext(race);
 assert.deepEqual(context.contenderGridRating(),expected);
 assert.deepEqual(Array.from(context.sortedGridHorses(),h=>h.n),expected.rankings.map(h=>h.n));
 assert.deepEqual(race,before);
});
test('missing Brisnet source does not fall back to Contender',()=>{
 const context=gridContext(drfGridRace(),false),out=context.contenderGridRating();
 assert.equal(out.decision,'HOLD');assert.equal(out.rankings.length,0);
});
test('RR-unranked and scratched horses remain in grid',()=>{
 const race={date:'2026-10-22',surface:'Dirt',distance_furlongs:6,ratings_provider:'BRISNET',horses:[70,90,80].map((speed,i)=>({n:String(i+1),name:'Native grid '+i,life_starts:i===0?0:1,odds:i===2?'SCR':'—',ratings:{provider:'BRISNET',lines:[{date:'2026-10-01',surface:'Dirt',furlongs:6,speed,late:80,e1:80,e2:80,source:{provider:'BRISNET',page:1,text:'fixture'}}]}}))};
 const context=gridContext(race),out=context.contenderGridRating();
 const ordered=Array.from(context.sortedGridHorses(),h=>h.n);
 assert.equal(ordered.length,3);assert.equal(new Set(ordered).size,3);
 assert.equal(ordered[ordered.length-1],'3');
 context.gridSort={key:'number',dir:1};
 assert.deepEqual(Array.from(context.sortedGridHorses(),h=>h.n),['1','2','3']);
});
