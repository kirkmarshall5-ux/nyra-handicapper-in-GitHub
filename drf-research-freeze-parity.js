// Research-only gate: compare a fresh production-parser replay with the original pre-race DRF freeze.
// This is score evidence, not independent timestamp certification.
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const key=x=>String(x??'').trim();
function frozenModel(r,id){
 const m=r?.dashboard?.models?.find(x=>x.id===id);
 if(!m||m.complete!==true||m.decision==='PASS'||!Array.isArray(m.rankings)||!m.rankings.length)throw Error(id+' frozen full-field model missing/incomplete for R'+r?.race);
 return m;
}
export function compareDrfReplayWithFreeze(dataset,freeze,{tolerance=1e-8}={}){
 if(dataset?.schema!=='drf-research-lab-v1'||!Array.isArray(dataset.races)||!dataset.races.length)throw Error('Production DRF Research Lab export required');
 if(freeze?.schema!=='nyra-local-research-freeze-v1'||freeze.source!=='DRF'||!Array.isArray(freeze.races))throw Error('Original DRF freeze required');
 if(!finite(tolerance)||tolerance<0||tolerance>1e-4)throw Error('Invalid score tolerance');
 const out=[],seenRaces=new Set();
 for(const race of dataset.races){
  const meta=race.metadata||{};
  if(!Number.isInteger(Number(meta.race))||Number(meta.race)<1||seenRaces.has(String(meta.race)))throw Error('Invalid or duplicate research race identity: '+race.id);
  seenRaces.add(String(meta.race));
  if(meta.source!=='DRF'||meta.track!==freeze.track||meta.card_date!==freeze.card_date)throw Error('DRF source identity mismatch: '+race.id);
  const fr=freeze.races.find(x=>String(x.race)===String(meta.race));
  if(!fr)throw Error('Frozen race missing: '+race.id);
  const source=fr.dashboard?.source_cards?.DRF;
  if(!source||source.track!==freeze.track||source.date!==freeze.card_date)throw Error('Frozen DRF source card identity mismatch: '+race.id);
  const expected=new Map(race.runners.map(h=>[key(h.program),h]));
  if(expected.size!==race.runners.length||[...expected.keys()].some(x=>!x))throw Error('Duplicate/blank exported programs: '+race.id);
  for(const [modelId,field] of [['drfContender','contender_baseline'],['drfFinisher','finisher_baseline']]){
   const model=frozenModel(fr,modelId),snapshot=model.rankings;
   if(snapshot.length!==race.runners.length)throw Error('Full-field count mismatch: '+race.id+' '+modelId);
   const originals=new Map(snapshot.map(h=>[key(h.n),h]));
   if(originals.size!==snapshot.length)throw Error('Duplicate frozen program: '+race.id);
   const replay=new Map((race[field]||[]).map(h=>[key(h.program),h]));
   if(replay.size!==race.runners.length||(race[field]||[]).length!==race.runners.length)throw Error('Replay baseline incomplete: '+race.id+' '+modelId);
   for(const [program,horse] of originals){
    const runner=expected.get(program),newScore=replay.get(program);
    if(!runner||!newScore||runner.name!==horse.name||!finite(horse.score)||!finite(newScore.score)||Math.abs(horse.score-newScore.score)>tolerance)
     throw Error('Frozen score/name parity failed: '+race.id+' '+modelId+' #'+program);
   }
   const frozenOrder=snapshot.map(h=>key(h.n));
   const replayOrder=[...replay.entries()].sort((a,b)=>b[1].score-a[1].score||expected.get(a[0]).name.localeCompare(expected.get(b[0]).name)).map(x=>x[0]);
   if(JSON.stringify(frozenOrder)!==JSON.stringify(replayOrder))throw Error('Frozen rank order mismatch: '+race.id+' '+modelId);
   out.push({race:race.id,model:modelId,runners:snapshot.length,score_parity:true,rank_parity:true});
  }
 }
 return {status:'SCORE_REPLAY_MATCHED',races:dataset.races.length,checks:out,independent_timestamp_verified:false};
}

// Research-only historical-field replay. A later export's trend adjustment must
// never be reused when the original frozen field differs: it is field-relative.
export function replayContenderOnFrozenField(race, frozenPrograms) {
 const finite=x=>typeof x==='number'&&Number.isFinite(x);
 const center=(v,a)=>!finite(v)||a.length<2||new Set(a).size<2?0:2*(a.filter(x=>x<v).length+.5*(a.filter(x=>x===v).length-1))/(a.length-1)-1;
 if(!Array.isArray(race?.runners)||!Array.isArray(race.contender_coefficients)||race.contender_coefficients.length!==19||!race.contender_coefficients.every(finite))throw Error('Complete original Contender coefficients required');
 if(!Array.isArray(frozenPrograms)||frozenPrograms.length<2||new Set(frozenPrograms.map(String)).size!==frozenPrograms.length)throw Error('Verified frozen field required');
 const byProgram=new Map(race.runners.map(h=>[String(h.program),h]));
 if(byProgram.size!==race.runners.length)throw Error('Duplicate export program');
 const field=frozenPrograms.map(p=>byProgram.get(String(p)));
 if(field.some(h=>!h))throw Error('Frozen runner missing from export');
 if(field.some(h=>!Array.isArray(h.contender?.raw)||h.contender.raw.length!==19||!Object.hasOwn(h.contender,'trend_slope')||(h.contender.trend_slope!==null&&!finite(h.contender.trend_slope))))throw Error('Original raw factors and trend slopes required; re-export source card');
 const observed=Array.from({length:19},(_,j)=>field.map(h=>h.contender.raw[j]).filter(finite));
 const slopes=field.map(h=>h.contender.trend_slope).filter(finite);
 return field.map(h=>{
  const base=h.contender.raw.reduce((s,v,j)=>s+center(v,observed[j])*race.contender_coefficients[j],0);
  const trend_adjustment=.10*center(h.contender.trend_slope,slopes);
  return {program:String(h.program),name:h.name,score:base+trend_adjustment,base_score:base,trend_adjustment};
 }).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
}
