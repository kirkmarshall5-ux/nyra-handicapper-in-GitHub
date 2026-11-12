// Display-only first-time-starter evidence. Never consumed by scoring engines.
export const FTS_RESEARCH_ID='FTS-EVIDENCE-20261112-v1';
export function parseFtsEvidence(block,page){
 const pedigree={};
 for(const k of ['Fst','Off','Dis','Trf']){
  const matches=[...String(block).matchAll(new RegExp('\\b'+k+'\\s*\\(\\s*(\\d{1,3})([?*]?)\\s*\\)','g'))];
  if(matches.length===1)pedigree[k]={value:+matches[0][1],flag:matches[0][2],source_text:matches[0][0],page};
 }
 const trainerLine=String(block).split('\n').find(l=>/^\s*Trainer:/.test(l))||'';
 const trainer=[];
 for(const m of trainerLine.matchAll(/(1st time str|Debut MdnSpWt|Debut Mdn Clm|Debut Turf|Debut >= 1m)\s*\(\s*(\d+)\s+(\d+)%\s+([+-]?\d+(?:\.\d+)?)\s*\)/g)){
  if(+m[2]>0&&+m[3]<=100)trainer.push({category:m[1],starts:+m[2],win_pct:+m[3],net_per_2:+m[4],source_text:m[0],page});
 }
 return {version:FTS_RESEARCH_ID,pedigree,trainer,scoring_enabled:false};
}
const finite=Number.isFinite;
export function ftsResearch(h,race){
 if((h.life_starts??h.lifeStarts)!==0)return null;
 const e=h.source_context?.fts_research,p=e?.pedigree||{},surface=race.conditions?.surface||race.surface;
 let keys=surface==='Turf'?['Trf']:surface==='Dirt'?[/^(?:sly|sy|my|muddy|sloppy|wet|wf)$/i.test(race.track_condition||race.conditions?.track_condition||'')?'Off':'Fst','Dis']:[];
 const complete=keys.length&&keys.every(k=>finite(p[k]?.value)),pedigree=complete?{score:keys.reduce((s,k)=>s+p[k].value,0)/keys.length,flag:keys.some(k=>p[k].flag==='*')?'*':keys.some(k=>p[k].flag==='?')?'?':'',components:keys}:null;
 const angles=e?.trainer||[],wanted=surface==='Turf'?'Debut Turf':/\bMC\b|Maiden Claim|Maiden Clming/i.test(race.cls||race.header||'')?'Debut Mdn Clm':'Debut MdnSpWt';
 const trainer=angles.find(a=>a.category===wanted)||angles.find(a=>a.category==='1st time str')||null;
 const today=Date.parse(race.date),works=(h.source_context?.workouts||[]).filter(w=>w.status==='SOURCE_FIELDS_PARSED'&&finite(w.rank)&&finite(w.total)&&w.rank>=1&&w.rank<=w.total&&finite(Date.parse(w.date))&&Date.parse(w.date)<today&&today-Date.parse(w.date)<=30*86400000).sort((a,b)=>b.date.localeCompare(a.date));
 const recent=works.slice(0,3),percentiles=recent.filter(w=>w.total>1).map(w=>100*(w.total-w.rank)/(w.total-1)).sort((a,b)=>a-b),mid=Math.floor(percentiles.length/2),median=percentiles.length?(percentiles.length%2?percentiles[mid]:(percentiles[mid-1]+percentiles[mid])/2):null;
 return {is_fts:true,version:FTS_RESEARCH_ID,pedigree,trainer,workouts:{count30:works.length,compared:percentiles.length,percentile:median,latest_days:works.length?Math.round((today-Date.parse(works[0].date))/86400000):null,status:h.source_context?.workout_status||'EXTRACTION_PENDING'},pedigree_status:surface==='Synth'?'TAPETA_UNVALIDATED':complete?'AVAILABLE':e?'MISSING':'REUPLOAD_REQUIRED',research_only:true};
}
