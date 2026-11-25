import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import {arms,contenderScore,v44Score,replayFreeze} from '../scripts/evaluate-drf-pace.mjs';
test('direct late removal retains early and interaction; context removal retains direct late',()=>{
 const e={contributions:Array(19).fill(0),trend:.1};e.contributions[6]=.2;e.contributions[7]=.3;e.contributions[8]=.4;
 assert.ok(Math.abs(contenderScore(e,arms[1])-.7)<1e-12);
 assert.ok(Math.abs(contenderScore(e,arms[2])-.6)<1e-12);
 assert.equal(contenderScore(e,arms[4]),.1);
});
test('V4.4c pace removal reapplies adjustment cap, retaining every other signal',()=>{
 const e={base:80,signals:[['field-relative',2],['rebound-protection',2],['lightly-raced-upside',2],['pace-fit',3]]};
 assert.equal(v44Score(e,arms[0]),86);assert.equal(v44Score(e,arms[2]),86);
 assert.equal(v44Score({base:80,signals:[['pace-fit',-1],['field-relative',-2]]},arms[2]),78);
});
test('portable DRF replay reproduces all recorded summaries and retains fields',()=>{
 const dir=new URL('./drf-pace-comparison-20261021/',import.meta.url);
 const f=JSON.parse(gunzipSync(fs.readFileSync(new URL('feature-freeze.json.gz',dir))));
 const expected=JSON.parse(gunzipSync(fs.readFileSync(new URL('results.json.gz',dir))));
 const before=JSON.stringify(f),actual=replayFreeze(f);assert.deepEqual(actual,expected);assert.equal(JSON.stringify(f),before);
 assert.equal(actual.rows.length,124*3*5);assert.equal(actual.holdout_files_used,0);
 for(const r of f.races)for(const model of ['v44c','finisher','contender'])assert.deepEqual(actual.rows.find(x=>x.key===r.key&&x.model===model&&x.arm==='current').rankings.map(h=>h.n),r.baseline_orders[model]);
});
