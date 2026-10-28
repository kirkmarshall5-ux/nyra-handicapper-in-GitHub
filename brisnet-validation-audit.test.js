import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
function run({programs=['1','2','3','4'],starters=['1','2','3','4'],duplicate=false,version=true}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bris-validation-'));fs.mkdirSync(path.join(dir,'freezes'));
 const race={race:1,date:'2026-10-01',track:'Test Track',models:{brisContenderCandidates:`Ranked ${programs.length}/4 eligible runners. PASS`},dashboard:{models:[{id:'brisContender',model_id:version?'CONTENDER-BRISNET-test':null,decision:'PASS',rankings:programs.map(n=>({n}))}]}};
 fs.writeFileSync(path.join(dir,'freezes/NYRA_FREEZE_test.json'),JSON.stringify({source:'BRISNET',captured_at_utc:'2026-10-01T12:00:00Z',clock_source:'browser-device-unverified',races:duplicate?[race,race]:[race]}));
 fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify([{date:race.date,race:1,starters,finish:['1','2','3','4'].map(n=>[n,'Horse '+n]),url:'https://example.test/chart'}]));
 try{const p=spawnSync(process.execPath,['scripts/audit-brisnet-freezes.mjs',path.join(dir,'results.json'),path.join(dir,'freezes'),path.join(dir,'out.json')],{encoding:'utf8'});return {status:p.status,error:p.stderr,report:fs.existsSync(path.join(dir,'out.json'))?JSON.parse(fs.readFileSync(path.join(dir,'out.json'))):null};}finally{fs.rmSync(dir,{recursive:true,force:true});}
}
test('complete winning local forecast remains uncertified despite perfect ranks',()=>{
 const {status,report}=run();assert.equal(status,0);assert.equal(report.certified_races,0);assert.equal(report.full_final_field_program_match_subset.races,1);assert.equal(report.rows[0].certified,false);assert.ok(report.rows[0].blockers.includes('INDEPENDENT_PRE_OFF_ANCHOR_NOT_SUPPLIED'));
});
test('partial and scratched forecasts never become complete through dropping or replacement',()=>{
 const a=run({programs:['1','2']}).report;assert.equal(a.full_final_field_program_match_subset.races,0);assert.deepEqual(a.rows[0].picks,['1','2']);assert.deepEqual(a.rows[0].missing_final_starters,['3','4']);
 const b=run({programs:['1','2','3','5']}).report;assert.deepEqual(b.rows[0].ranked_nonstarters,['5']);assert.equal(b.full_final_field_program_match_subset.races,0);
});
test('missing model version stays explicit and duplicate races or ranks reject',()=>{
 assert.ok(run({version:false}).report.rows[0].blockers.includes('EXACT_MODEL_VERSION_NOT_RECORDED'));
 assert.notEqual(run({duplicate:true}).status,0);assert.notEqual(run({programs:['1','1','3','4']}).status,0);
});
