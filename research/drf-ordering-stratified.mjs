// Research-only DRF Contender ordering replay. Never imports or modifies production rankings.
// Input JSON: array of races {date,track,race,race_type,distance_furlongs,surface,
// first_time_starters,starters:[{program,name,finish,score,contributions:[19 numbers]}]}.
// Contributions are original signed per-feature score contributions, NOT raw PP values.
// Optional trend_adjustment per starter; score must equal sum(contributions)+trend_adjustment.
// finish is positive integer or null (DNF/unverified). No inferred finish places.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const input=process.argv[2];if(!input)throw Error('Usage: node research/drf-ordering-stratified.mjs races.json [output.json]');
const races=JSON.parse(fs.readFileSync(input,'utf8'));assert(Array.isArray(races));
const variants={original:[],reduced_speed:[2,5],recent_form:[2,4,5],late_emphasis:[6]};
const results={schema:'drf-ordering-stratified-research-v1',classification:'RETROSPECTIVE_RESEARCH_NOT_CERTIFIED',production_changed:false,variants:{},excluded:[],race_count:races.length};
const tally=(rows)=>({races:rows.length,winner_first:rows.filter(x=>x.winner_rank===1).length,winner_top4:rows.filter(x=>x.winner_rank&&x.winner_rank<=4).length,winner_rank2to4:rows.filter(x=>x.winner_rank>=2&&x.winner_rank<=4).length,winner_missing:rows.filter(x=>!x.winner_rank||x.winner_rank>4).length,runnerup_first_two:rows.filter(x=>x.runnerup_rank&&x.runnerup_rank<=2).length,exacta_box_hits:rows.filter(x=>x.winner_rank&&x.runnerup_rank&&x.winner_rank<=2&&x.runnerup_rank<=2).length});
for(const [variant,disabled] of Object.entries(variants))results.variants[variant]={rows:[],summary:null,strata:{}};
for(const race of races){
 try{
  assert(race.date&&race.track&&Number.isInteger(race.race));
  assert(typeof race.race_type==='string'&&race.race_type.trim(),'missing race type');
  assert(Number.isFinite(race.distance_furlongs)&&race.distance_furlongs>0,'missing distance');
  assert(['Dirt','Turf','Synthetic'].includes(race.surface),'missing surface');
  assert(Number.isInteger(race.first_time_starters)&&race.first_time_starters>=0,'missing FTS count');
  assert(Array.isArray(race.starters)&&race.starters.length>=2,'missing starters');
  const ids=race.starters.map(h=>String(h.program));assert.equal(new Set(ids).size,ids.length);
  const winners=race.starters.filter(h=>h.finish===1),seconds=race.starters.filter(h=>h.finish===2);
  assert.equal(winners.length,1,'winner missing/ambiguous');assert.equal(seconds.length,1,'runner-up missing/ambiguous');
  for(const h of race.starters){assert(Array.isArray(h.contributions)&&h.contributions.length===19&&h.contributions.every(Number.isFinite),'missing signed feature contributions');assert(Number.isFinite(h.score),'missing original score');assert(Math.abs(h.score-h.contributions.reduce((a,b)=>a+b,0)-(h.trend_adjustment||0))<1e-6,'original score parity failed');}
  const small=race.starters.length<=5,fts=race.first_time_starters>0,maiden=/maiden/i.test(race.race_type),pass=race.first_time_starters/race.starters.length>0.2;
  const strata={surface:race.surface,distance:race.distance_furlongs,trip:race.distance_furlongs<8?'sprint':'route',race_type:race.race_type,maiden,first_time_starters:race.first_time_starters,fts,fts_gt20pct:pass,small_field:small,field_size:race.starters.length,primary_eligible:!small&&!fts&&!pass};
  for(const [variant,disabled] of Object.entries(variants)){
   const ordered=race.starters.map(h=>({...h,variant_score:h.score-disabled.reduce((s,i)=>s+h.contributions[i],0)})).sort((a,b)=>b.variant_score-a.variant_score||String(a.program).localeCompare(String(b.program)));
   const rank=(finish)=>{const i=ordered.findIndex(h=>h.finish===finish);return i<0?null:i+1};
   const row={date:race.date,track:race.track,race:race.race,...strata,picks:ordered.slice(0,4).map(h=>String(h.program)),rank_finish:ordered.slice(0,4).map((h,i)=>({rank:i+1,finish:h.finish,notation:h.finish?`\${i+1}/\${h.finish}`:null})),winner_rank:rank(1),runnerup_rank:rank(2),winner_program:String(winners[0].program),runnerup_program:String(seconds[0].program)};
   results.variants[variant].rows.push(row);
  }
 }catch(e){results.excluded.push({date:race.date,track:race.track,race:race.race,reason:e.message});}
}
for(const v of Object.values(results.variants)){
 v.summary=tally(v.rows);v.primary=tally(v.rows.filter(r=>r.primary_eligible));
 for(const field of ['surface','trip','maiden','fts','fts_gt20pct','small_field','race_type']){v.strata[field]=Object.fromEntries([...new Set(v.rows.map(r=>String(r[field])))].map(k=>[k,tally(v.rows.filter(r=>String(r[field])===k))]));}
}
const base=new Map(results.variants.original.rows.map(r=>[r.date+'|'+r.track+'|'+r.race,r]));
for(const [id,v] of Object.entries(results.variants)){if(id==='original')continue;v.ordering_changes=v.rows.filter(r=>{const b=base.get(r.date+'|'+r.track+'|'+r.race);return b&&r.winner_rank!==b.winner_rank}).map(r=>({date:r.date,track:r.track,race:r.race,from:base.get(r.date+'|'+r.track+'|'+r.race).winner_rank,to:r.winner_rank,primary_eligible:r.primary_eligible}));}
const output=process.argv[3];if(output)fs.writeFileSync(output,JSON.stringify(results,null,2));console.log(JSON.stringify({races:races.length,excluded:results.excluded,variants:Object.fromEntries(Object.entries(results.variants).map(([k,v])=>[k,{overall:v.summary,primary:v.primary,ordering_changes:v.ordering_changes?.length||0}]))},null,2));
