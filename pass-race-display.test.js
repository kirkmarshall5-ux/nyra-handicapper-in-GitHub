import test from 'node:test';
import assert from 'node:assert/strict';
import {passRaceDisplay} from './pass-race-display.js';
import {rateResearchRace} from './data-corrected-research.js';
const horse=(n,figs,starts=4)=>({n:String(n),name:'Horse '+n,life_starts:starts,beyer_figures:figs,timeform_early:null,timeform_late:null});
test('PASS remains PASS, with up to four provisional rated horses and separately listed unrated horses',()=>{
 const field=[horse(1,[80,79,78]),horse(2,[75,73,72]),horse(3,[],0),horse(4,[72,70,71]),horse(5,[69,68,67]),horse(6,[65,64,63])];
 const rating=rateResearchRace(field);assert.equal(rating.decision,'PASS');assert.equal(rating.rankings.length,0);
 const view=passRaceDisplay(rating);assert.equal(view.ranked.length,4);assert.deepEqual(view.ranked.map(h=>h.n),['1','2','4','5']);assert.equal(view.unrated.length,1);assert.equal(view.unrated[0].n,'3');assert.deepEqual(view.unrated[0].reasons,['FTS-unrated']);
 assert.equal(rating.decision,'PASS');assert.equal(rating.rankings.length,0);assert.equal(rating.runners[0].v44c_unrounded_score,undefined);
});
test('PASS with no rated horses shows only limited-evidence list',()=>{
 const r=rateResearchRace([horse(1,[],0),horse(2,[],0)]);const v=passRaceDisplay(r);assert.equal(v.ranked.length,0);assert.equal(v.unrated.length,2);
});
test('full-field RATEABLE races never use provisional view',()=>{
 const r=rateResearchRace([horse(1,[80]),horse(2,[70])]);assert.equal(r.decision,'RATEABLE');assert.equal(passRaceDisplay(r),null);
});
test('general race blocker stays visible even when individual runners rate',()=>{
 const r=rateResearchRace([horse(1,[80])],{raceBlockers:['conditions-unverified']});const v=passRaceDisplay(r);assert.equal(r.decision,'PASS');assert.deepEqual(v.general,['conditions-unverified']);assert.equal(v.ranked.length,1);
});
