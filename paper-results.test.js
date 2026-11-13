import test from 'node:test';
import assert from 'node:assert/strict';
import {paperEligibility,settlePaperResult,summarizePaperResults} from './paper-results.js';
import {buildRaceDashboard,dashboardHtml} from './race-day-dashboard.js';
const field=[{n:'1',name:'Runner One'},{n:'2',name:'Runner Two'},{n:'3',name:'Runner Three'}];
const model={id:'brisResearch',available:true,decision:'RATEABLE',research_only:true,validation_status:'PENDING',rankings:field.map((h,i)=>({...h,score:90-i}))};
const official={verified:true,field,finish:['1','2','3'],win2:8.40,exactaPay:25.20,exactaBase:2};
test('validation label never changes eligibility, tickets or paper ROI',()=>{
 const pending=settlePaperResult({model,field,official}),validated=settlePaperResult({model:{...model,research_only:false,validation_status:'VALIDATED'},field,official});
 assert.deepEqual(pending,validated);assert.equal(pending.stake,4);assert.equal(pending.returned,21);assert.equal(pending.net,17);assert.equal(pending.roi,425);assert.deepEqual(pending.wagers.map(w=>w.cost),[2,1,1]);
 const reversed=settlePaperResult({model,field,official:{...official,finish:['2','1','3']}});assert.equal(reversed.returned,12.60);assert.equal(reversed.wagers[2].returned,12.60);
});
test('PASS and HOLD contribute zero stake and retain exact missing runner reasons',()=>{
 for(const decision of ['PASS','HOLD']){
  const result=settlePaperResult({model:{...model,decision,rankings:model.rankings.slice(0,2),unrated:[{...field[2],reasons:['Latest start has no verified Speed']}]},field});
  assert.equal(result.included,false);assert.equal(result.stake,0);assert.equal(result.roi,null);assert.deepEqual(result.eligibility.unrated,[{...field[2],reasons:['Latest start has no verified Speed']}]);
 }
});
test('only eligible races enter total stakes, returns and ROI denominator',()=>{
 const yes=settlePaperResult({model,field,official}),no=settlePaperResult({model:{...model,decision:'PASS'},field});
 assert.deepEqual(summarizePaperResults([yes,no]),{races:1,excluded:1,stake:4,returned:21,net:17,roi:425});assert.equal(summarizePaperResults([no]).roi,null);
});
test('complete-looking fields with source errors or conflicting identities remain excluded',()=>{
 for(const m of [{...model,available:false,reason:'Source dates differ'},{...model,decision:'HOLD',reason:'Card source unverified'},{...model,rankings:[field[0],field[1],field[1]]},{...model,rankings:[field[0],field[1],{...field[2],name:'Another horse'}]}])assert.equal(paperEligibility(m,field).included,false);
 assert.equal(paperEligibility(model,[...field,{n:'1A',name:'Coupled'}]).included,false);assert.equal(paperEligibility(model,[field[0],field[0],field[1]]).included,false);
});
test('settlement rejects unverified charts, missing payouts and different official starters',()=>{
 for(const chart of [{...official,verified:false},{...official,exactaBase:0},{...official,win2:null},{...official,finish:['1','1','3']},{...official,field:field.slice(1)}])assert.throws(()=>settlePaperResult({model,field,official:chart}));
});
test('dashboard exports eligibility and exact exclusions beside separate validation label',()=>{
 const race={track:'Belmont',date:'2026-11-13',race:1,surface:'Dirt',distance_furlongs:6,horses:field.map(h=>({...h,life_starts:1}))};
 const d=buildRaceDashboard({anchor:race,sources:{BRISNET:{race}}},()=>({...model,model_id:'fixture',decision:'PASS',rankings:model.rankings.slice(0,2),unrated:[{...field[2],reasons:['Verified latest Speed missing']}]}));
 const m=d.models.find(m=>m.id==='brisResearch');assert.deepEqual(m.unrated,[{...field[2],reasons:['Verified latest Speed missing']}]);assert.equal(d.paper_plans.brisResearch.total_cost,0);
 const html=dashboardHtml(d);assert.match(html,/#3 Runner Three: Verified latest Speed missing/);assert.match(html,/Validation pending/);
 const complete=buildRaceDashboard({anchor:race,sources:{BRISNET:{race}}},()=>({...model,model_id:'fixture'}));assert.equal(complete.paper_plans.brisResearch.total_cost,4);assert.equal(complete.paper_plans.brisResearch.available,true);
});

test('supplied starter-roster mismatch blocks paper tickets even with complete PP rankings',()=>{
 const race={track:'Belmont',date:'2026-11-13',race:1,surface:'Dirt',distance_furlongs:6,horses:field};
 const d=buildRaceDashboard({anchor:race,sources:{BRISNET:{race}},officialStarterRoster:[{program:'1',horse:'Runner One'},{program:'2',horse:'Runner Two'}],officialStarterSource:'https://www.equibase.com/chart'},()=>({...model,model_id:'fixture'}));
 assert.equal(d.starter_audit.status,'MISMATCH');assert.equal(d.paper_plans.brisResearch.available,false);assert.equal(d.paper_plans.brisResearch.total_cost,0);
});
