import test from 'node:test';
import assert from 'node:assert/strict';
import {compareDrfReplayWithFreeze} from './drf-research-freeze-parity.js';
const horses=[{program:'1',name:'Alpha'},{program:'2',name:'Bravo'}];
const race={id:'Belmont Park-2026-10-28-R1',metadata:{source:'DRF',track:'Belmont Park',card_date:'2026-10-28',race:1},runners:horses,contender_baseline:[{program:'1',score:.8},{program:'2',score:.2}],finisher_baseline:[{program:'1',score:70},{program:'2',score:40}]};
const ranked=(id,field)=>({id,decision:'RATEABLE',complete:true,rankings:race[field].map(h=>({...horses.find(x=>x.program===h.program),n:h.program,score:h.score}))});
const freeze={schema:'nyra-local-research-freeze-v1',source:'DRF',track:'Belmont Park',card_date:'2026-10-28',races:[{race:1,dashboard:{source_cards:{DRF:{track:'Belmont Park',date:'2026-10-28'}},models:[ranked('drfContender','contender_baseline'),ranked('drfFinisher','finisher_baseline')]}}]};
const dataset={schema:'drf-research-lab-v1',races:[race]};
test('replayed model scores and ordering must equal original frozen full field',()=>{const a=compareDrfReplayWithFreeze(dataset,freeze);assert.equal(a.status,'SCORE_REPLAY_MATCHED');assert.equal(a.checks.length,2);assert.equal(a.independent_timestamp_verified,false)});
test('rejects score drift even when rankings agree',()=>{const d=structuredClone(dataset);d.races[0].contender_baseline[0].score+=.01;assert.throws(()=>compareDrfReplayWithFreeze(d,freeze),/score\/name parity failed/)});
test('rejects changed program identity and names',()=>{const d=structuredClone(dataset);d.races[0].runners[0].name='Different';assert.throws(()=>compareDrfReplayWithFreeze(d,freeze),/score\/name parity failed/)});
test('rejects partial or PASS frozen fields',()=>{const f=structuredClone(freeze);f.races[0].dashboard.models[0].decision='PASS';assert.throws(()=>compareDrfReplayWithFreeze(dataset,f),/missing\/incomplete/)});
test('rejects mismatched source-card date',()=>{const f=structuredClone(freeze);f.races[0].dashboard.source_cards.DRF.date='2026-10-27';assert.throws(()=>compareDrfReplayWithFreeze(dataset,f),/source card identity mismatch/)});
test('rejects missing replay runner',()=>{const d=structuredClone(dataset);d.races[0].finisher_baseline.pop();assert.throws(()=>compareDrfReplayWithFreeze(d,freeze),/baseline incomplete/)});

test('rejects empty research export rather than declaring a vacuous pass',()=>assert.throws(()=>compareDrfReplayWithFreeze({...dataset,races:[]},freeze),/Production DRF Research Lab export required/));
test('rejects duplicate race entries',()=>assert.throws(()=>compareDrfReplayWithFreeze({...dataset,races:[race,race]},freeze),/duplicate research race identity/));
test('rejects duplicate replay program entries',()=>{const d=structuredClone(dataset);d.races[0].finisher_baseline[1]={...d.races[0].finisher_baseline[0]};assert.throws(()=>compareDrfReplayWithFreeze(d,freeze),/baseline incomplete/)});
