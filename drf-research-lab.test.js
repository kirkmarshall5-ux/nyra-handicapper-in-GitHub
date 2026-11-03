import test from 'node:test';import assert from 'node:assert/strict';
import {runLab,summarize,VARIANTS,CONTENDER_FEATURES} from './drf-research-lab.js';
import {MODEL} from './contender-model.js';
import {FINISHER_SPEC,rankFinisherFeatures} from './finisher-model.js';
import {exportDrfLabRace} from './drf-research-lab-export.js';
const coeff=Array(19).fill(0);coeff[9]=1;coeff[16]=.5;coeff[6]=.25;
const make=(program,name,surface,workout,early)=>({program,name,contender:{raw:Array.from({length:19},(_,i)=>i===9?surface:i===16?workout:i===6?early:null),trend_adjustment:0},finisher:{recent_speed:surface,matched_speed:workout,late_pace:early}});
const data={races:[{id:'TEST-R1',contender_coefficients:coeff,actual:['2','3','1'],runners:[make('1','Alpha',10,10,10),make('2','Bravo',20,20,20),make('3','Charlie',0,0,0)]}]};
test('all eight Contender scenarios plus four Finisher scenarios run',()=>{const rows=runLab(data);assert.equal(rows.length,12);assert.equal(rows.filter(r=>r.model==='DRF Contender').length,VARIANTS.length);assert.equal(summarize(rows).length,12)});
test('metrics distinguish winner from second and exacta',()=>{const base=runLab(data).find(r=>r.model==='DRF Contender'&&r.variant==='baseline');assert.equal(base.first,1);assert.equal(base.second,0);assert.equal(base.exacta,0);assert.equal(base.runnerUpCovered,1)});
test('missing inputs are not imputed',()=>{assert.throws(()=>runLab({races:[{...data.races[0],runners:[data.races[0].runners[0],{...data.races[0].runners[1],contender:null}]}]}),/Incomplete Contender/)});
test('original baseline mismatch blocks research',()=>{assert.throws(()=>runLab({races:[{...data.races[0],contender_baseline:[{program:'1',score:999}]}]}),/baseline parity failed/)});
test('research never mutates source data',()=>{const before=JSON.stringify(data);runLab(data,{late:1.25});assert.equal(JSON.stringify(data),before)});
test('adapter rejects incomplete race before model scoring',()=>{assert.throws(()=>exportDrfLabRace({track:'Belmont',date:'2026-10-28',race:1,horses:[{n:'1',name:'One'}]}),/At least two active/)});
test('adapter rejects mixed provider before scoring',()=>{assert.throws(()=>exportDrfLabRace({track:'Belmont',date:'2026-10-28',race:1,horses:[{n:'1',name:'One',ratings:{provider:'BRISNET'}},{n:'2',name:'Two'}]}),/Brisnet/)});

test('production-format exports require both original model baselines',()=>{assert.throws(()=>runLab({...data,schema:'drf-research-lab-v1'}),/Contender baseline required/)});
test('Finisher baseline mismatch rejects all scenarios',()=>{const baseline=runLab(data).find(r=>r.model==='DRF Contender'&&r.variant==='baseline');const rows=data.races[0].runners;const coeff=data.races[0].contender_coefficients;const center=(v,a)=>2*(a.filter(x=>x<v).length+.5*(a.filter(x=>x===v).length-1))/(a.length-1)-1;const contender_baseline=rows.map(h=>({program:h.program,score:h.contender.raw.reduce((sum,v,j)=>sum+(v===null?0:center(v,rows.map(x=>x.contender.raw[j]).filter(x=>x!==null))*coeff[j]),0)}));assert.throws(()=>runLab({schema:'drf-research-lab-v1',races:[{...data.races[0],contender_baseline,finisher_baseline:rows.map(h=>({program:h.program,score:999}))}]}),/Finisher baseline parity failed/)});


test('research feature order matches locked production Contender specification',()=>{assert.deepEqual(CONTENDER_FEATURES,MODEL.features);assert.equal(CONTENDER_FEATURES.length,MODEL.contender.coefficients.length);assert.equal(CONTENDER_FEATURES[9],'surface_win_record');assert.equal(CONTENDER_FEATURES[16],'workout_best_rank_30_days')});
test('Finisher research baseline matches production score with missing optional evidence',()=>{const runners=[make('1','Alpha',80,null,110),make('2','Bravo',95,70,null),make('3','Charlie',70,60,95)];const original=rankFinisherFeatures(runners.map(h=>({n:h.program,name:h.name,...h.finisher})));const race={id:'FINISHER-PARITY',contender_coefficients:Array(19).fill(0),runners,finisher_baseline:original.rankings.map(h=>({program:h.n,score:h.score}))};const rows=runLab({races:[race]});assert.equal(rows.filter(r=>r.model==='DRF Finisher').length,4);assert.deepEqual(rows.find(r=>r.model==='DRF Finisher'&&r.variant==='baseline').top,original.rankings.map(h=>h.n));assert.deepEqual(FINISHER_SPEC.weights,{recent_speed:.60,matched_speed:.25,late_pace:.15})});
