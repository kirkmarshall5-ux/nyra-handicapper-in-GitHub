import test from 'node:test';
import assert from 'node:assert/strict';
import {explicitSyntheticLine,rankRRTapeta} from './rr-tapeta-adapter.js';
import {premiumHistoryConditions} from './brisnet-premium-conditions.js';
const date='2026-11-25';
function line(marker='Ì',token='6f',ratings={}){
 const text='14Nov26WO Ì6f ft'.replace('Ì6f',marker+token);
 return {date:'2026-11-14',...premiumHistoryConditions(text),e1:90,e2:88,late:80,speed:85,...ratings,source:{provider:'BRISNET',text}};
}
test('Tapeta source evidence accepts explicit AW only, with complete prior ratings',()=>{
 assert.equal(explicitSyntheticLine(line(),date).furlongs,6);
 assert.equal(explicitSyntheticLine(line('Ì','1ˆ'),date).furlongs,8.5);
 for(const marker of ['æ','š','à','•',''])assert.equal(explicitSyntheticLine(line(marker),date),null);
 assert.equal(explicitSyntheticLine(line('Ì','6f',{late:null}),date),null);
 assert.equal(explicitSyntheticLine(line(), '2026-11-14'),null);
 assert.equal(explicitSyntheticLine({...line(),condition_evidence:{status:'UNRESOLVED'}},date),null);
});
const horses=[{n:'1',name:'One',ratings:{lines:[line()]}},{n:'2',name:'Two',ratings:{lines:[line('Ì','6f',{e1:100,speed:95})]}},{n:'3',name:'Three',ratings:{lines:[]}}];
const race={surface:'Synth',ratings_provider:'BRISNET',date,distance_furlongs:6,horses};
const base={decision:'RATEABLE',rankings:horses.map((h,i)=>({n:h.n,name:h.name,rank:i+1,score:1-i*.1}))};
test('Tapeta preserves RR baseline and excludes scratched runners',()=>{
 const before=structuredClone(base);
 const result=rankRRTapeta(race,base);
 assert.equal(result.rankings[0].n,'2');
 assert.equal(result.syntheticCoverage,2);
 assert.deepEqual(base,before);
 const scratched={...race,horses:horses.map(h=>h.n==='2'?{...h,odds:'SCR'}:h)};
 assert.equal(rankRRTapeta(scratched,base).decision,'PASS');
 const updated={...base,rankings:base.rankings.filter(h=>h.n!=='2')};
 assert.deepEqual(rankRRTapeta(scratched,updated).rankings.map(h=>h.n),['1','3']);
});
test('Tapeta disappears on dirt and turf, rejects incomplete RR fields',()=>{
 for(const surface of ['Dirt','Turf'])assert.equal(rankRRTapeta({...race,surface},base),null);
 assert.equal(rankRRTapeta({...race,ratings_provider:'DRF'},base),null);
 assert.equal(rankRRTapeta(race,{...base,rankings:base.rankings.slice(0,2)}).decision,'PASS');
});
