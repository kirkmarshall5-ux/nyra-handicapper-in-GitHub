import test from 'node:test';
import assert from 'node:assert/strict';
import {rankBrisnetModels} from './brisnet-models.js';
import {rankBrisnetResearch} from './brisnet-research.js';
import {rankFinishers} from './finisher-inputs.js';
import {buildRaceDashboard,dashboardHtml} from './race-day-dashboard.js';
import {brisnetRankingHtml} from './brisnet-ranking-display.js';
import {finisherRankingHtml} from './finisher-ranking-display.js';
const horse=(n,speed)=>({n:String(n),name:'Horse '+n,life_starts:1,entry_status:'REGULAR',ml:'4/1',ratings:{provider:'BRISNET',lines:[{date:'2026-10-01',speed,surface:'Dirt',furlongs:6,e1:null,e2:null,late:null,source:{provider:'BRISNET',text:'verified fixture'}}]}});
const fixture=()=>({track:'Belmont',race:1,date:'2026-11-13',surface:'Dirt',distance_furlongs:6,ratings_provider:'BRISNET',parser_blockers:['BRISNET_SOURCE_MODEL_VALIDATION_PENDING'],horses:[horse(1,85),horse(2,80)]});
const models=r=>[rankBrisnetModels(r).contender,rankBrisnetResearch(r),rankFinishers(r)];
test('complete evidence is RATEABLE with a separate validation label despite optional missing pace',()=>{
 const r=fixture(),before=structuredClone(r);
 for(const m of models(r)){assert.equal(m.decision,'RATEABLE');assert.equal(m.validation_status,'PENDING');assert.equal(m.research_only,true);assert.equal(m.bettingEnabled,false);assert.equal(m.probabilityCalibrated,false);assert.equal(m.rankings.length,2);}
 const d=buildRaceDashboard({anchor:r,sources:{BRISNET:{race:r}}});
 for(const m of d.models.filter(m=>m.provider==='BRISNET')){assert.equal(m.decision,'RATEABLE');assert.equal(m.validation_status,'PENDING');assert.equal(m.complete,true);}
 for(const html of [dashboardHtml(d),brisnetRankingHtml(models(r)[0],'contender',r),finisherRankingHtml(r)]){assert.match(html,/validation pending/i);assert.doesNotMatch(html,/PASS — no wager/);}
 assert.deepEqual(r,before);
});
test('FTS and experienced missing latest Speed still PASS, then recover after a scratch',()=>{
 for(const debut of [true,false]){
  const r=fixture();if(debut){r.horses[1].life_starts=0;r.horses[1].ratings.lines=[];}else r.horses[1].ratings.lines[0].speed=null;
  for(const m of models(r)){assert.equal(m.decision,'PASS');assert.equal(m.unrated.length,1);assert.equal(m.validation_status,'PENDING');}
  r.horses[1].odds='SCR';for(const m of models(r))assert.equal(m.decision,'RATEABLE');
 }
});
test('source blockers, duplicate identities and empty fields still HOLD',()=>{
 for(const change of [r=>r.parser_blockers.push('source-parse-failed'),r=>r.horses[1].n='1',r=>r.horses=[]]){
  const r=fixture();change(r);for(const m of models(r)){assert.equal(m.decision,'HOLD');assert.equal(m.rankings.length,0);}
 }
});

test('structured recorder keeps race eligibility and validation separate',async()=>{
 const {convertDisplayedModel}=await import('./pre-race-provider-adapter.js');
 const r=fixture(),field=r.horses.map(h=>({program:h.n,horse:h.name}));
 for(const [i,result] of models(r).entries()){
  const frozen=convertDisplayedModel(i===2?'FINISHER':'CONTENDER',result,field,'BRISNET');
  assert.equal(frozen.decision,'RATEABLE');assert.equal(frozen.fullFieldRanked,true);assert.equal(frozen.validation_status,'PENDING');
 }
});
