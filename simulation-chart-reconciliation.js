// Stage 2 official-chart reconciliation. Research only: no scoring, no result inference.
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const nonempty=s=>typeof s==='string'&&s.trim().length>0;
const reject=m=>{throw Error(m)};
const unique=(items,label)=>{if(new Set(items).size!==items.length)reject('Duplicate '+label)};
export function reconcileRaceSources({race,ppRunners,chartRunners,chart}){
 if(!race||!nonempty(race.raceId)||!nonempty(race.ppSourceId)||!nonempty(race.date)||!nonempty(race.track)||!Number.isInteger(race.raceNumber))reject('Race identity and PP source required');
 if(!Array.isArray(ppRunners)||!ppRunners.length)reject('Nonempty PP runners required');
 const pp=ppRunners.map(x=>({program:String(x.program||'').trim(),name:String(x.name||'').trim(),status:String(x.status||'entered').toLowerCase()}));
 if(pp.some(x=>!x.program||!x.name))reject('PP program and horse name required');
 unique(pp.map(x=>x.program),'PP program');
 if(!chart||!nonempty(chart.sourceUrl)||!nonempty(chart.chartId)||!nonempty(chart.retrievedAt)||!Array.isArray(chartRunners)||!chartRunners.length){
  return {raceId:race.raceId,status:'AWAITING_OFFICIAL_CHART',chartVerified:false,runnerReconciliationVerified:false,ppCount:pp.length,chartCount:0,unmatched:[],flags:['Official chart with provenance not supplied'],paired:[]};
 }
 if(!/^https:\/\//.test(chart.sourceUrl))reject('Chart source must be HTTPS');
 if(!chartRunners.every(x=>x&&x.program&&x.name))reject('Chart program and horse name required');
 const cr=chartRunners.map(x=>({program:String(x.program).trim(),name:String(x.name).trim(),status:String(x.status||'ran').toLowerCase()}));
 unique(cr.map(x=>x.program),'chart program');
 const byProgram=new Map(cr.map(x=>[x.program,x])),paired=[],unmatched=[],flags=[];
 for(const x of pp){
  const y=byProgram.get(x.program);
  if(!y){unmatched.push({program:x.program,name:x.name,reason:'Not found in official chart'});continue}
  if(norm(x.name)!==norm(y.name))flags.push('Name mismatch at #'+x.program+': '+x.name+' vs '+y.name);
  if(x.status==='scratched'&&y.status==='ran')flags.push('Scratch mismatch #'+x.program);
  paired.push({program:x.program,ppName:x.name,chartName:y.name,ppStatus:x.status,chartStatus:y.status,nameMatches:norm(x.name)===norm(y.name)});
 }
 for(const y of cr)if(!pp.some(x=>x.program===y.program))unmatched.push({program:y.program,name:y.name,reason:'Not found in PP'});
 if(chart.track&&norm(chart.track)!==norm(race.track))flags.push('Track mismatch');
 if(chart.date&&chart.date!==race.date)flags.push('Date mismatch');
 if(chart.raceNumber&&chart.raceNumber!==race.raceNumber)flags.push('Race number mismatch');
 if(chart.surface&&race.surface&&norm(chart.surface)!==norm(race.surface))flags.push('Surface change: confirm actual conditions');
 if(chart.distance&&race.distance&&norm(chart.distance)!==norm(race.distance))flags.push('Distance mismatch');
 if(cr.some(x=>['dnf','did not finish','eased','pulled up','dead heat'].includes(x.status)))flags.push('Nonstandard finish: manual adjudication required');
 const complete=!unmatched.length&&!flags.length&&chart.manuallyVerified===true&&chart.callsManuallyVerified===true;
 return {raceId:race.raceId,status:complete?'RUNNERS_RECONCILED':'MANUAL_REVIEW_REQUIRED',chartVerified:chart.manuallyVerified===true,runnerReconciliationVerified:complete,ppCount:pp.length,chartCount:cr.length,unmatched,flags,paired};
}
