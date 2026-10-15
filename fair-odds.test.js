import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {estimatedWinLine,fairOddsFromProbability,winLineFields} from './fair-odds.js';
const horses=Array.from({length:6},(_,i)=>({n:i+1,name:`Horse ${i+1}`}));
const race={horses};
const result=(scores,key='v44c_unrounded_score')=>({decision:'RATEABLE',rankings:horses.map((h,i)=>({...h,[key]:scores[i]}))});
test('full-field equal ratings total 100 percent and produce 5/1, including outside top four',()=>{const l=estimatedWinLine(race,result([60,60,60,60,60,60]),'v44c');assert.equal(l.entries.length,6);assert.ok(Math.abs(l.entries.reduce((s,h)=>s+h.probability,0)-1)<1e-12);l.entries.forEach(h=>assert.ok(Math.abs(h.fairOdds-5)<1e-12));assert.equal(l.calibrated,false);assert.equal(l.bettingEnabled,false)});
test('model-specific scales, raw unrounded scores, invariance and inverse odds',()=>{const a=estimatedWinLine(race,result([80,70,60,50,40,30]),'v44c'),b=estimatedWinLine(race,result([8,7,6,5,4,3],'score'),'contender'),c=estimatedWinLine(race,result([1080,1070,1060,1050,1040,1030]),'v44c');a.entries.forEach((h,i)=>{assert.ok(Math.abs(h.probability-b.entries[i].probability)<1e-12);assert.ok(Math.abs(h.probability-c.entries[i].probability)<1e-12);assert.ok(Math.abs(1/(h.fairOdds+1)-h.probability)<1e-12)});assert.equal(fairOddsFromProbability(.25),3);assert.equal(fairOddsFromProbability(.2),4);assert.equal(fairOddsFromProbability(0),null)});
test('PASS provisional, HOLD, incomplete, duplicate, nonfinite and blocked fields withhold',()=>{for(const r of [{...result([1,2,3,4,5,6]),decision:'PASS'},{...result([1,2,3,4,5,6]),provisional:true},{decision:'HOLD',rankings:[]},{decision:'RATEABLE',rankings:result([1,2,3,4,5,6]).rankings.slice(0,4)},result([1,2,NaN,4,5,6])])assert.equal(estimatedWinLine(race,r,'v44c').status,'UNAVAILABLE');assert.equal(estimatedWinLine({...race,parser_blockers:['bad']},result([1,2,3,4,5,6]),'v44c').status,'UNAVAILABLE');assert.equal(estimatedWinLine({horses:[horses[0],horses[0]]},{decision:'RATEABLE',rankings:[{...horses[0],score:1},{...horses[0],score:1}]},'contender').status,'UNAVAILABLE')});
test('scratches and inactive conditional runners do not absorb probability; recalculate after scratch',()=>{const before=estimatedWinLine(race,result([60,60,60,60,60,60]),'v44c');const changed={horses:horses.map((h,i)=>i===5?{...h,odds:'SCR'}:h).concat({n:7,name:'AE',entry_status:'AE'})},ranked={...result([60,60,60,60,60,60]),rankings:result([60,60,60,60,60,60]).rankings.slice(0,5)};const after=estimatedWinLine(changed,ranked,'v44c');assert.equal(after.entries.length,5);assert.ok(after.entries[0].probability>before.entries[0].probability);assert.ok(Math.abs(after.entries[0].probability-.2)<1e-12)});
test('fields show estimates or unavailable and UI wires both model boxes',()=>{const l=estimatedWinLine(race,result([60,60,60,60,60,60]),'v44c');assert.match(winLineFields(l,horses[0]),/<td>5.00\/1<\/td>/);assert.match(winLineFields(l,horses[0]),/<td>16.7%<\/td>/);assert.match(winLineFields({entries:[]},horses[0]),/<td>—<\/td>/);const html=fs.readFileSync('index.html','utf8');assert.ok(html.includes('winLineFields(v44cLine,h)'));assert.ok(html.includes('winLineFields(contenderLine,h)'));assert.ok(html.includes('Best Value: PASS — probability validation pending'))});

test('MIX1 estimates use the complete field, preserve ranks and withhold incomplete fields',()=>{
 const r=result([75,64.4,62.5,50.5,45,30],'score'),before=structuredClone(r);
 const line=estimatedWinLine(race,r,'mix1');
 assert.equal(line.status,'ESTIMATED');assert.equal(line.model_id,'MIX1-research-softmax-v1');
 assert.equal(line.calibrated,false);assert.equal(line.bettingEnabled,false);
 assert.equal(line.entries.length,6);assert.ok(Math.abs(line.entries.reduce((s,h)=>s+h.probability,0)-1)<1e-12);
 assert.ok(line.entries.slice(0,4).reduce((s,h)=>s+h.probability,0)<1);
 line.entries.forEach((h,i)=>{assert.ok(Math.abs(1/(h.fairOdds+1)-h.probability)<1e-12);if(i)assert.ok(h.probability<line.entries[i-1].probability)});
 assert.doesNotMatch(winLineFields(line,horses[0]),/—/);assert.deepEqual(r,before);
 for(const bad of [{...r,decision:'PASS'},{...r,decision:'HOLD'},{...r,rankings:r.rankings.slice(0,4)}])assert.equal(estimatedWinLine(race,bad,'mix1').status,'UNAVAILABLE');
 const scratched={horses:horses.map((h,i)=>i===5?{...h,odds:'SCR'}:h)},after=estimatedWinLine(scratched,{...r,rankings:r.rankings.slice(0,5)},'mix1');
 assert.equal(after.entries.length,5);assert.ok(after.entries[0].probability>line.entries[0].probability);
 const equal=estimatedWinLine(race,result([50,50,50,50,50,50],'score'),'mix1');equal.entries.forEach(h=>assert.ok(Math.abs(h.fairOdds-5)<1e-12));
});
