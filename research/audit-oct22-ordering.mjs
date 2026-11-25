// Research-only Oct 22 race-by-race ordering audit. Reads existing replay outputs.
// Usage: node research/audit-oct22-ordering.mjs <research-controlled directory>
import fs from 'node:fs';
import path from 'node:path';
const dir=process.argv[2];
if(!dir)throw Error('Usage: node research/audit-oct22-ordering.mjs <research-controlled directory>');
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const variants=read('variants.json').variants,roi=read('roi.json').variants;
const excluded=read('reconstructed.json.exclusions.json').excluded;
const original=variants.original.rows,late=variants.late_emphasis.rows;
const key=r=>r.date+'|'+r.track+'|'+r.race;
const lateIndex=new Map(late.map(r=>[key(r),r]));
const roiOriginal=new Map(roi.original.rows.map(r=>[key(r),r]));
const roiLate=new Map(roi.late_emphasis.rows.map(r=>[key(r),r]));
const money=n=>Number(n.toFixed(2));
const races=original.map(o=>{
 const l=lateIndex.get(key(o)),a=roiOriginal.get(key(o)),b=roiLate.get(key(o));
 if(!l||!a||!b)throw Error('Missing paired variant/ROI row '+key(o));
 const changed=JSON.stringify(o.picks)!==JSON.stringify(l.picks);
 return {race:o.race,surface:o.surface,race_type:o.race_type,primary_eligible:o.primary_eligible,winner_program:o.winner_program,runnerup_program:o.runnerup_program,original_top4:o.picks,late_top4:l.picks,top4_changed:changed,winner_rank_original:o.winner_rank,winner_rank_late:l.winner_rank,runnerup_rank_original:o.runnerup_rank,runnerup_rank_late:l.runnerup_rank,win_return_original:a.win_return,win_return_late:b.win_return,win_return_delta:money(b.win_return-a.win_return),exacta_return_original:a.exacta_return,exacta_return_late:b.exacta_return};
});
const delta=money(races.reduce((s,r)=>s+r.win_return_delta,0));
const expected=money(roi.late_emphasis.overall.win.profit-roi.original.overall.win.profit);
if(delta!==expected)throw Error('ROI delta reconciliation failed: '+delta+' != '+expected);
const report={classification:'RETROSPECTIVE_RESEARCH_NOT_CERTIFIED',production_changed:false,races,excluded,summary:{evaluated:races.length,excluded:excluded.length,top4_order_changed:races.filter(r=>r.top4_changed).length,winner_rank_changed:races.filter(r=>r.winner_rank_original!==r.winner_rank_late).length,win_profit_improvement:delta,win_profit_improvement_verified:true}};
const out=path.join(dir,'ordering-audit.json');fs.writeFileSync(out,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));console.log('Saved:',out);
