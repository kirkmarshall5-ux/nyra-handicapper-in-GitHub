// Research-only gate: fail closed unless all 8 Oct 22 races, 59 starters,
// original 19-feature scores and official payouts reconcile.
// Usage: node research/verify-oct22-replay-inputs.mjs reconstructed.json
import fs from 'node:fs';
import assert from 'node:assert/strict';
const path=process.argv[2];if(!path)throw Error('Provide reconstructed DRF horse-level input JSON');
const rows=JSON.parse(fs.readFileSync(path,'utf8'));
const official=JSON.parse(fs.readFileSync(new URL('./official-belmont-2026-10-22-finishes.json',import.meta.url),'utf8'));
const payouts=JSON.parse(fs.readFileSync(new URL('./official-belmont-2026-10-22-payouts.json',import.meta.url),'utf8'));
assert.equal(rows.length,8,'all eight races required');
const key=r=>r.date+'|'+r.track+'|'+r.race;
assert.equal(new Set(rows.map(key)).size,8,'duplicate races');
assert.equal(new Set(official.map(key)).size,8);
assert.equal(new Set(payouts.map(key)).size,8);
let count=0;
for(const ref of official){
 const r=rows.find(x=>key(x)===key(ref));assert(r,'missing race '+key(ref));
 const p=payouts.find(x=>key(x)===key(ref));assert(p,'missing payout '+key(ref));
 assert(Number.isFinite(p.win_payout_2)&&p.win_payout_2>=0);
 assert(Number.isFinite(p.exacta_payout_2)&&p.exacta_payout_2>=0);
 assert.equal(r.starters.length,ref.finish.length,'starter count mismatch race '+r.race);
 assert(Number.isInteger(r.first_time_starters)&&r.first_time_starters>=0,'FTS unverified race '+r.race);
 const ids=new Set();
 for(const h of ref.finish){
  const a=r.starters.find(x=>String(x.program)===String(h.program));
  assert(a,'program missing '+r.race+'/'+h.program);
  assert.equal(a.name.toLowerCase().replace(/[^a-z0-9]/g,''),h.name.toLowerCase().replace(/[^a-z0-9]/g,''),'horse identity mismatch');
  assert.equal(a.finish,h.finish,'finish mismatch');
  assert(!ids.has(String(a.program)),'duplicate program');ids.add(String(a.program));
  assert.equal(a.contributions?.length,19,'missing contributions');
  assert(a.contributions.every(Number.isFinite),'invalid contributions');
  assert(Number.isFinite(a.score),'missing score');
  assert(Math.abs(a.score-a.contributions.reduce((s,v)=>s+v,0)-(a.trend_adjustment||0))<1e-6,'score parity mismatch');
  count++;
 }
}
assert.equal(count,59);
console.log(JSON.stringify({status:'INPUT_GATE_PASSED',races:8,starters:count,official_payouts:8,score_parity:true}));
