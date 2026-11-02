import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const script=new URL('./drf-ordering-roi.mjs',import.meta.url).pathname;
function run(rows,payouts){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'roi-research-'));
 try{const a=path.join(dir,'r.json'),b=path.join(dir,'p.json'),o=path.join(dir,'o.json');fs.writeFileSync(a,JSON.stringify({variants:{original:{rows}}}));fs.writeFileSync(b,JSON.stringify(payouts));const p=spawnSync(process.execPath,[script,a,b,o],{encoding:'utf8'});assert.equal(p.status,0,p.stderr);return JSON.parse(fs.readFileSync(o,'utf8')).variants.original;}
 finally{fs.rmSync(dir,{recursive:true,force:true});}
}
const row={date:'2026-10-22',track:'Belmont Park',race:1,surface:'Turf',trip:'sprint',maiden:false,primary_eligible:true,fts:false,small_field:false,winner_rank:1,runnerup_rank:2};
test('winning $2 win and $1 exacta box use actual payouts and correct stakes',()=>{
 const v=run([row],[{date:row.date,track:row.track,race:1,win_payout_2:12,exacta_payout_2:40,winner_final_odds:5,source:'official chart'}]);
 assert.equal(v.overall.win.stake,2);assert.equal(v.overall.win.returned,12);assert.equal(v.overall.win.roi,5);
 assert.equal(v.overall.exacta.stake,2);assert.equal(v.overall.exacta.returned,40);assert.equal(v.overall.exacta.roi,19);
 assert.equal(v.strata.turf_sprint.win.races,1);assert.equal(v.strata.winner_odds_5to1_plus.win.races,1);
});
test('missing payout does not silently count as a losing wager',()=>{
 const v=run([row],[]);assert.equal(v.overall.win.races,0);assert.equal(v.overall.win.roi,null);assert.equal(v.overall.win.missing_payouts,1);
});
test('incorrect exacta ordering does not pay',()=>{
 const v=run([{...row,runnerup_rank:3}],[{date:row.date,track:row.track,race:1,win_payout_2:12,exacta_payout_2:40,source:'official chart'}]);
 assert.equal(v.overall.exacta.returned,0);assert.equal(v.overall.exacta.stake,2);
});

test('unknown winner or runner-up rank must not produce an exacta hit',()=>{
 const payout=[{date:row.date,track:row.track,race:1,win_payout_2:12,exacta_payout_2:40,source:'official chart'}];
 for(const missing of [{winner_rank:null,runnerup_rank:1},{winner_rank:1,runnerup_rank:null}]){
  const v=run([{...row,...missing}],payout);
  assert.equal(v.overall.exacta.returned,0);
  assert.equal(v.overall.exacta.stake,2);
 }
});
