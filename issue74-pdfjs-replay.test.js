import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script=fileURLToPath(new URL('./scripts/replay-issue74-brisnet.mjs',import.meta.url));
test('Issue #74 replay requires an explicit private PDF path',()=>{
 const r=spawnSync(process.execPath,[script],{encoding:'utf8'});
 assert.equal(r.status,2);
 assert.match(r.stderr,/Usage:/);
});
test('Issue #74 replay rejects any PDF bytes that do not match the original SHA-256',()=>{
 const dir=mkdtempSync(join(tmpdir(),'issue74-replay-'));
 try{
  const fake=join(dir,'bel1025p.pdf');
  writeFileSync(fake,'%PDF-1.7\nnot the original source\n');
  const r=spawnSync(process.execPath,[script,fake],{encoding:'utf8'});
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/Original Brisnet source SHA-256 mismatch/);
  assert.doesNotMatch(r.stdout,/"pass":true/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
