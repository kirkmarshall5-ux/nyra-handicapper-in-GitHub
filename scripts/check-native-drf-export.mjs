import fs from 'node:fs';
import assert from 'node:assert/strict';
const [batchPath,...refs]=process.argv.slice(2);
assert(batchPath&&refs.length,'Usage: node scripts/check-native-drf-export.mjs batch.json historical.json ...');
const batch=JSON.parse(fs.readFileSync(batchPath));
assert.equal(batch.schema,'native-drf-batch-v1');
assert.equal(batch.model_id,'DRF-CONTENDER-LATE150-20261103');
assert.equal(batch.status,'RECONCILED_OFFICIAL_STARTERS','Official starter reconciliation required');
let checked=0;const errors=[];
for(const ref of refs){
 const s=JSON.parse(fs.readFileSync(ref)).snapshot;
 const matches=batch.cards.filter(c=>s.sources.some(x=>x.sha256===c.sha256));
 assert.equal(matches.length,1,'Unique source hash required: '+ref);
 const card=matches[0];
 for(const race of s.races){
 const n=String(race.race.number),m=race.models.find(x=>x.id==='drfContender');
 try{
 assert(m,'Missing native reference model');
 const found=card.races.filter(x=>String(x.number)===n);
 assert.equal(found.length,1,'Unique race required');
 const a=found[0];
 assert.equal(a.decision,m.decision,'Decision mismatch');
 if(m.decision!=='RATEABLE')continue;
 assert(m.complete,'Incomplete reference');
 assert.equal(a.rankings.length,m.rankings.length,'Field length mismatch');
 for(let i=0;i<m.rankings.length;i++){
 const x=a.rankings[i],y=m.rankings[i];
 assert.equal(String(x.n),String(y.n),'Program mismatch');
 assert.equal(x.name,y.name,'Name mismatch');
 assert(Number.isFinite(x.score)&&Number.isFinite(y.score),'Missing score');
 assert(Math.abs(x.score-y.score)<=1e-9,'Score mismatch');
 }
 checked++;
 }catch(e){errors.push({ref,race:n,error:e.message});}
 }
}
console.log(JSON.stringify({checked,errors},null,2));
if(errors.length||!checked)process.exitCode=1;
