// Gate 10: compare clean post-fix full-card replay with the archived pre-fix
// output. Usage: node scripts/gate10-compare-replay.mjs old.json new.json
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const [beforePath,afterPath]=process.argv.slice(2);
if(!beforePath||!afterPath)throw Error('Usage: node scripts/gate10-compare-replay.mjs BEFORE.json AFTER.json');
const before=JSON.parse(readFileSync(beforePath,'utf8'));
const after=JSON.parse(readFileSync(afterPath,'utf8'));
assert.equal(before.source_pdf_sha256,'7102102c9c4e5fc8906e8a5dfd6daa9cb58166e33825aebe0e1393b168f3c303');
assert.equal(after.source_pdf_sha256,before.source_pdf_sha256);
assert.equal(after.git_dirty,false);
assert.equal(after.kind,'RETROSPECTIVE_REPLAY_NOT_PROSPECTIVE');
assert.equal(after.races.length,10);
assert.equal(before.races.length,10);
const changes=[];
let starters=0,rankings=0;
for(const oldRace of before.races){
 const fresh=after.races.find(r=>r.race===oldRace.race);
 assert.ok(fresh,'Missing race '+oldRace.race);
 assert.equal(fresh.field_count,oldRace.field_count);
 assert.deepEqual(fresh.verified_finish_order,oldRace.verified_finish_order);
 assert.equal(fresh.prospective_gradeable,false);
 starters+=fresh.field_count;
 for(const model of ['baseline','contender']){
  const a=oldRace[model],b=fresh[model];
  assert.equal(b.decision,a.decision,`Race ${fresh.race} ${model} decision drift`);
  assert.equal(b.rankings.length,a.rankings.length);
  for(let i=0;i<a.rankings.length;i++){
   const x=a.rankings[i],y=b.rankings[i];
   assert.equal(y.name,x.name,`Race ${fresh.race} ${model} name/order drift`);
   assert.equal(y.rank,x.rank,`Race ${fresh.race} ${model} rank drift`);
   assert.equal(y.score,x.score,`Race ${fresh.race} ${model} score drift`);
   const expected=(fresh.race===5&&y.name==='Embraceable Gal')||(fresh.race===9&&y.name==="Hagrid's Flame");
   if(expected){
    assert.equal(x.program,'','Expected archived missing program');
    assert.equal(y.program,'1A','Corrected program must be 1A');
    changes.push({race:fresh.race,model,horse:y.name,from:x.program,to:y.program});
   }else assert.equal(y.program,x.program,`Race ${fresh.race} ${model} unexpected program drift`);
   rankings++;
  }
 }
}
assert.equal(starters,83,'Expected 83 starters');
assert.equal(changes.length,4,'Expected exactly four ranking-record corrections');
console.log(JSON.stringify({status:'PASS',source_sha256:after.source_pdf_sha256,git_commit:after.git_commit,races:after.races.length,starters,rankings_compared:rankings,expected_identity_corrections:changes,model_scores_and_rankings_unchanged:true,prospective_gradeable:false},null,2));
