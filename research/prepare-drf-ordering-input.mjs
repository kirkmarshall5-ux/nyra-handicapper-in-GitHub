// Convert a DRF parsed card plus verified finish reference to signed original
// feature contributions for research replay. No live model changes.
// Usage: node research/prepare-drf-ordering-input.mjs card.json official.json output.json
// official.json: [{date,track,race,race_type,distance_furlongs,surface,
//   first_time_starters,finish:[{program,name,finish}]}]
// Rejects incomplete fields, score mismatches, or absent race conditions.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {contenderFeatures,rankContenders} from '../contender-rankings.js';
import {releaseRace} from '../rankings-release.js';
import {MODEL} from '../contender-model.js';
const [cardPath,refPath,outPath]=process.argv.slice(2);
if(!cardPath||!refPath||!outPath)throw Error('Usage: node research/prepare-drf-ordering-input.mjs card.json official.json output.json');
const card=JSON.parse(fs.readFileSync(cardPath,'utf8')),refs=JSON.parse(fs.readFileSync(refPath,'utf8'));
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const center=(v,a)=>!finite(v)||a.length<2||new Set(a).size<2?0:2*(a.filter(x=>x<v).length+.5*(a.filter(x=>x===v).length-1))/(a.length-1)-1;
const clean=s=>String(s||'').replace(/\s*\([A-Z]{2,3}\)\s*$/,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const output=[],excluded=[];
for(const ref of refs){
 try{
  assert.equal(ref.date,card.date);assert.equal(ref.track,card.track);
  assert(typeof ref.race_type==='string'&&ref.race_type.trim());
  assert(finite(ref.distance_furlongs)&&ref.distance_furlongs>0);
  assert(['Dirt','Turf','Synthetic'].includes(ref.surface));
  assert(Number.isInteger(ref.first_time_starters)&&ref.first_time_starters>=0);
  const race=structuredClone(card.races[ref.race]);assert(race,'race absent');
  const finish=ref.finish;assert(Array.isArray(finish)&&finish.length>=2);
  const ids=finish.map(h=>String(h.program));assert.equal(new Set(ids).size,ids.length);
  assert.equal(finish.filter(h=>h.finish===1).length,1);assert.equal(finish.filter(h=>h.finish===2).length,1);
  race.horses=finish.map(h=>{const match=race.horses.filter(x=>String(x.n)===String(h.program)&&clean(x.name)===clean(h.name));assert.equal(match.length,1,'missing/ambiguous horse '+h.program+' '+h.name);return {...match[0],odds:'—',entry_status:'REGULAR',included_in_frozen_field:true};});
  const raceSurface=race.conditions?.surface||race.surface;
  assert.equal(raceSurface,ref.surface,'surface mismatch');
  if(finite(race.distance_furlongs))assert.equal(race.distance_furlongs,ref.distance_furlongs,'distance mismatch');
  const released=releaseRace(race),ranked=rankContenders(race,released,{displayPass:released.decision==='PASS'});
  assert.equal(ranked.rankings.length,finish.length,'incomplete ranked field');
  const raw=race.horses.map(h=>contenderFeatures(h,{...race,field:race.horses}).raw);
  const observed=MODEL.features.map((_,j)=>raw.map(a=>a[j]).filter(finite));
  const featureById=new Map(race.horses.map((h,i)=>[String(h.n),raw[i]]));
  const rankById=new Map(ranked.rankings.map(h=>[String(h.n),h]));
  const starters=finish.map(h=>{
   const score=rankById.get(String(h.program));assert(score,'missing ranked horse');
   const contributions=featureById.get(String(h.program)).map((v,j)=>center(v,observed[j])*MODEL.contender.coefficients[j]);
   const trend_adjustment=score.matched_beyer_trend?.score_adjustment??0;
   assert(finite(score.score)&&finite(trend_adjustment));assert(Math.abs(contributions.reduce((a,b)=>a+b,0)+trend_adjustment-score.score)<1e-9,'original parity failed');
   return {program:String(h.program),name:h.name,finish:h.finish,score:score.score,contributions,trend_adjustment};
  });
  output.push({date:ref.date,track:ref.track,race:ref.race,race_type:ref.race_type,distance_furlongs:ref.distance_furlongs,surface:ref.surface,first_time_starters:ref.first_time_starters,starters});
 }catch(e){excluded.push({date:ref.date,track:ref.track,race:ref.race,reason:e.message});}
}
fs.writeFileSync(outPath,JSON.stringify(output,null,2));
console.log(JSON.stringify({accepted:output.length,excluded},null,2));
