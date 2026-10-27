import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
test('operator CLI refuses missing trust store, unsigned evidence and missing inputs',()=>{
 const dir=mkdtempSync(join(tmpdir(),'nyra-evidence-'));
 try{
  const files=['record.json','evidence.json','replay.json','chart.json','freeze.json'];
  for(const name of files)writeFileSync(join(dir,name),JSON.stringify({raceId:'R1',predictionArtifactId:'p1'}));
  const args=['scripts/verify-race-evidence.mjs',...files.map(x=>join(dir,x))];
  const missing=spawnSync(process.execPath,args,{encoding:'utf8',env:{...process.env,NYRA_TRUST_STORE:''}});
  assert.equal(missing.status,2);
  assert.match(missing.stderr,/TRUST_STORE_NOT_CONFIGURED/);
  const trust=join(dir,'trust.json');writeFileSync(trust,'{}');
  const untrusted=spawnSync(process.execPath,args,{encoding:'utf8',env:{...process.env,NYRA_TRUST_STORE:trust}});
  assert.equal(untrusted.status,1);
  assert.equal(JSON.parse(untrusted.stdout).status,'NOT_CERTIFIED');
  const absent=spawnSync(process.execPath,args.slice(0,-1),{encoding:'utf8',env:{...process.env,NYRA_TRUST_STORE:trust}});
  assert.equal(absent.status,2);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
