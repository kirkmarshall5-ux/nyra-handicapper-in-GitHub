import test from 'node:test';
import assert from 'node:assert/strict';
import {MODEL} from './contender-model.js';
import {DRF_CONTENDER_MODEL_ID,DRF_CONTENDER_COEFFICIENTS,rankContenders} from './contender-rankings.js';
import {releaseRace} from './rankings-release.js';
import {rankFinishers} from './finisher-inputs.js';
const horse=(n,early,late)=>({n,name:'Runner '+n,life_starts:1,beyer_figures:[70],timeform_early:early,timeform_late:late,entry_status:'REGULAR',parser_blockers:[],switch_evidence:{running_lines:[{running_date_track:'1æ26=1Bel'}],boxes:{}},beyer_evidence:[{figure:70,running_date_track:'1æ26=1Bel',source_line:'1æ26=1Bel fst 6f 70 1/5'}],source_context:{}});
test('DRF-only profile changes exactly the Late coefficient',()=>{
 assert.ok(Object.isFrozen(DRF_CONTENDER_COEFFICIENTS));
 MODEL.contender.coefficients.forEach((v,j)=>assert.equal(DRF_CONTENDER_COEFFICIENTS[j],j===7?v*1.5:v));
 assert.equal(MODEL.contender.coefficients[7],0.14536183174709905);
 assert.notEqual(DRF_CONTENDER_MODEL_ID,MODEL.model_id);
});
test('higher Late weight changes a close race while preserving inputs, V44c and Finisher',()=>{
 const race={date:'2026-10-11',surface:'Dirt',conditions:{surface:'Dirt'},header:'6 Furlongs',horses:[horse('1',100,50),horse('2',50,100)],parser_blockers:[]};
 const before=structuredClone(race),base=releaseRace(race),finisher=rankFinishers(race);
 // Original Early .1787 exceeds original Late .1454; the new Late .2180 reverses that comparison.
 assert.ok(MODEL.contender.coefficients[6]>MODEL.contender.coefficients[7]);
 const ranked=rankContenders(race,base);
 assert.equal(ranked.model_id,DRF_CONTENDER_MODEL_ID);
 assert.deepEqual(ranked.rankings.map(h=>h.n),['2','1']);
 assert.deepEqual(race,before);assert.deepEqual(releaseRace(race),base);assert.deepEqual(rankFinishers(race),finisher);
 race.horses.forEach(h=>h.timeform_late=null);
 assert.ok(rankContenders(race,releaseRace(race)).rankings.every(h=>Number.isFinite(h.score)));
});
