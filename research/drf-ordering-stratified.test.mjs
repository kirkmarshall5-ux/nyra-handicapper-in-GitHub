import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const runner=new URL('./drf-ordering-stratified.mjs',import.meta.url).pathname;
const horse=(program,finish,early)=>{const contributions=Array(19).fill(0);contributions[6]=early;return {program:String(program),name:'Horse '+program,finish,contributions,score:early};};
const race=(overrides={})=>({date:'2026-10-22',track:'Belmont Park',race:1,race_type:'Allowance',distance_furlongs:6,surface:'Dirt',first_time_starters:0,starters:[horse(1,2,0.8),horse(2,1,0.7),horse(3,3,0.6),horse(4,4,0.5),horse(5,5,0.4),horse(6,6,0.3)],...overrides});
function run(data){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'drf-ordering-'));try{const input=path.join(dir,'races.json'),output=path.join(dir,'results.json');fs.writeFileSync(input,JSON.stringify(data));const p=spawnSync(process.execPath,[runner,input,output],{encoding:'utf8'});assert.equal(p.status,0,p.stderr);return JSON.parse(fs.readFileSync(output,'utf8'));}finally{fs.rmSync(dir,{recursive:true,force:true});}}
test('winner promoted when early pace is neutralized, original unchanged, notation rendered',()=>{const r=run([race()]);assert.equal(r.variants.original.rows[0].winner_rank,2);assert.equal(r.variants.late_emphasis.rows[0].winner_rank,2);assert.equal(r.variants.original.rows[0].rank_finish[0].notation,'1/2');assert.equal(r.variants.original.rows[0].rank_finish[1].notation,'2/1');assert.equal(r.variants.original.primary.races,1);});
test('small fields and FTS excluded only from primary cohort',()=>{const small=race({starters:[horse(1,2,.8),horse(2,1,.7),horse(3,3,.6),horse(4,4,.5)]});const fts=race({race:2,first_time_starters:2});const r=run([small,fts]);assert.equal(r.variants.original.summary.races,2);assert.equal(r.variants.original.primary.races,0);assert.equal(r.variants.original.strata.small_field.true.races,1);assert.equal(r.variants.original.strata.fts_gt20pct.true.races,1);});
test('score parity failures are excluded rather than silently analyzed',()=>{const bad=race();bad.starters[0].score=9;const r=run([bad]);assert.equal(r.variants.original.summary.races,0);assert.match(r.excluded[0].reason,/parity/);});
