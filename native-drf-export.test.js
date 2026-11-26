import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
test('native export checker accepts exact reference and rejects discrepancies',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'drf-parity-'));
 try{
 const b=path.join(dir,'batch.json'),r=path.join(dir,'reference.json');
 const rankings=[{n:'1',name:'Example A',score:0.5},{n:'2',name:'Example B',score:-0.5}];
 const batch={schema:'native-drf-batch-v1',model_id:'DRF-CONTENDER-LATE150-20261103',cards:[{sha256:'fixture',races:[{number:'1',decision:'RATEABLE',rankings}]}]};
 const ref={snapshot:{sources:[{sha256:'fixture'}],races:[{race:{number:1},models:[{id:'drfContender',decision:'RATEABLE',complete:true,rankings}]}]}};
 fs.writeFileSync(r,JSON.stringify(ref));
 const run=x=>{fs.writeFileSync(b,JSON.stringify(x));return spawnSync(process.execPath,['scripts/check-native-drf-export.mjs',b,r],{encoding:'utf8'});};
 const ok=run(batch);assert.equal(ok.status,0,ok.stderr+ok.stdout);
 for(const mutate of [x=>x.cards[0].sha256='wrong',x=>x.cards[0].races[0].decision='PASS',x=>x.cards[0].races[0].rankings.reverse(),x=>x.cards[0].races[0].rankings[0].score+=0.01,x=>x.cards[0].races[0].rankings.pop(),x=>x.cards[0].races[0].rankings[0].name='Wrong']){
 const x=structuredClone(batch);mutate(x);assert.notEqual(run(x).status,0);
 }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
