import test from 'node:test';import assert from 'node:assert/strict';
import {parseFtsEvidence,ftsResearch} from './fts-research.js';
import {buildRaceDashboard,dashboardHtml} from './race-day-dashboard.js';
const block='Fst (107) Off (105?) Dis (112?) Trf (109?)\nTrainer: 1st time str( 33 18% +0.91 ) Debut MdnSpWt( 26 23% +1.69 )';
const work=(date,rank,total)=>({date,rank,total,status:'SOURCE_FIELDS_PARSED'});
const race={date:'2026-11-12',track:'Belmont Park',race:2,surface:'Dirt',cls:'Mdn 100k',distance_furlongs:7};
const h={n:'6',name:'Kaz Toro',life_starts:0,ml:'12/1',source_context:{fts_research:parseFtsEvidence(block,3),workout_status:'SOURCE_FIELDS_PARSED',workouts:[work('2026-11-05',21,41),work('2026-10-29',1,8),work('2026-10-18',51,71),work('2026-10-10',5,80)]}};
test('source fields retain pedigree uncertainty and category-specific trainer sample',()=>{const f=ftsResearch(h,race);assert.equal(f.pedigree.score,109.5);assert.equal(f.pedigree.flag,'?');assert.equal(f.trainer.win_pct,23);assert.equal(f.trainer.starts,26);assert.equal(f.workouts.count30,3);assert.equal(f.workouts.percentile,50);assert.equal(f.workouts.latest_days,7);});
test('turf switches evidence; Tapeta never impersonates dirt and known runners stay unscored',()=>{assert.equal(ftsResearch(h,{...race,surface:'Turf'}).pedigree.score,109);assert.equal(ftsResearch(h,{...race,surface:'Synth'}).pedigree,null);assert.equal(ftsResearch({...h,life_starts:1},race),null);});
test('unknown trainer and absent inputs remain unknown; lone workouts have no percentile',()=>{const f=ftsResearch({...h,source_context:{workouts:[work('2026-11-05',1,1)]}},race);assert.equal(f.trainer,null);assert.equal(f.pedigree,null);assert.equal(f.workouts.percentile,null);assert.equal(f.workouts.count30,1);});
test('only past works in 30-day window count; up to three percentiles are used',()=>{const f=ftsResearch({...h,source_context:{workouts:[work('2026-11-13',1,10),work('2026-11-12',1,10),work('2026-10-12',1,10),work('2026-10-13',2,3)]}},race);assert.equal(f.workouts.count30,1);assert.equal(f.workouts.percentile,50);});
test('dashboard preserves ranks, ordering, Prime Power and PASS; column conditional on active FTS',()=>{
 const run=horse=>{const anchor={...race,horses:[horse]},snapshot=JSON.stringify(anchor);const d=buildRaceDashboard({anchor,sources:{BRISNET:{race:anchor}}},()=>({decision:'PASS',rankings:[]}));assert.equal(JSON.stringify(anchor),snapshot);return [d,dashboardHtml(d)];};
 let [d,html]=run({...h,ratings:{provider:'BRISNET',prime_power:100}});assert.equal(d.has_fts,true);assert.match(html,/Prime Power/);assert.match(html,/FTS<br>Research/);assert.match(html,/PED 109.5\?/);assert.match(html,/WORK 50/);assert.doesNotMatch(html,/Models<br>top 4/);assert.equal(d.models[0].decision,'PASS');assert.equal(d.models[0].rankings.length,0);
 [d,html]=run({...h,life_starts:1});assert.equal(d.has_fts,false);assert.doesNotMatch(html,/FTS<br>Research/);
});
