// Research-only ROI evaluation. Inputs: ordering result JSON and independently verified
// payouts JSON array [{date,track,race,win_payout_2,exacta_payout_2,
// winner_final_odds,source}]. Payouts are $2 base returns including stake.
// Never substitute morning-line for final odds or infer missing payouts.
import fs from 'node:fs';
const [rankPath,payPath,outPath]=process.argv.slice(2);
if(!rankPath||!payPath)throw Error('Usage: node research/drf-ordering-roi.mjs rankings.json payouts.json [out.json]');
const rankings=JSON.parse(fs.readFileSync(rankPath,'utf8'));
const payouts=JSON.parse(fs.readFileSync(payPath,'utf8'));
if(!Array.isArray(payouts))throw Error('Payouts must be an array');
const key=r=>[r.date,r.track,r.race].join('|');
const index=new Map();
for(const p of payouts){const k=key(p);if(index.has(k))throw Error('Duplicate payout record: '+k);index.set(k,p);}
const valid=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const buckets=[['turf_sprint',r=>r.surface==='Turf'&&r.trip==='sprint'],['turf_route',r=>r.surface==='Turf'&&r.trip==='route'],['dirt_sprint',r=>r.surface==='Dirt'&&r.trip==='sprint'],['dirt_route',r=>r.surface==='Dirt'&&r.trip==='route'],['synthetic',r=>r.surface==='Synthetic'],['maiden',r=>r.maiden],['nonmaiden',r=>!r.maiden],['primary',r=>r.primary_eligible],['fts',r=>r.fts],['small_field',r=>r.small_field],['winner_odds_under_2to1',r=>r.winner_final_odds!==null&&r.winner_final_odds<2],['winner_odds_2to1_to_5to1',r=>r.winner_final_odds!==null&&r.winner_final_odds>=2&&r.winner_final_odds<5],['winner_odds_5to1_plus',r=>r.winner_final_odds!==null&&r.winner_final_odds>=5]];
function summarize(rows,kind){
 const eligible=rows.filter(r=>r[kind+'_eligible']);
 const stake=eligible.reduce((s,r)=>s+r[kind+'_stake'],0),returned=eligible.reduce((s,r)=>s+r[kind+'_return'],0);
 return {races:eligible.length,stake,returned,profit:returned-stake,roi:stake?returned/stake-1:null,missing_payouts:rows.length-eligible.length};
}
const report={schema:'drf-ordering-roi-v1',classification:'RETROSPECTIVE_NOT_CERTIFIED',wagers:{win:'$2 win on rank 1',exacta:'$1 exacta box ranks 1 and 2 ($2 total)'},variants:{}};
for(const [name,v] of Object.entries(rankings.variants)){
 const rows=v.rows.map(r=>{
  const p=index.get(key(r));
  const winEligible=!!p&&valid(p.win_payout_2);
  const exactaEligible=!!p&&valid(p.exacta_payout_2);
  if(p&&p.winner_final_odds!=null&&!valid(p.winner_final_odds))throw Error('Invalid odds '+key(r));
  return {...r,winner_final_odds:p&&valid(p.winner_final_odds)?p.winner_final_odds:null,
   win_eligible:winEligible,win_stake:winEligible?2:0,win_return:winEligible&&r.winner_rank===1?p.win_payout_2:0,
   exacta_eligible:exactaEligible,exacta_stake:exactaEligible?2:0,exacta_return:exactaEligible&&Number.isInteger(r.winner_rank)&&r.winner_rank>=1&&r.winner_rank<=2&&Number.isInteger(r.runnerup_rank)&&r.runnerup_rank>=1&&r.runnerup_rank<=2?p.exacta_payout_2:0,
   payout_source:p?.source||null};
 });
 const group=rs=>({win:summarize(rs,'win'),exacta:summarize(rs,'exacta')});
 report.variants[name]={overall:group(rows),strata:Object.fromEntries(buckets.map(([k,f])=>[k,group(rows.filter(f))])),rows};
}
if(outPath)fs.writeFileSync(outPath,JSON.stringify(report,null,2));
console.log(JSON.stringify(Object.fromEntries(Object.entries(report.variants).map(([k,v])=>[k,v.overall])),null,2));
