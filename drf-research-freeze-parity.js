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
 if(dataset?.schema!=='drf-research-lab-v1'||!Array.isArray(dataset.races))throw Error('Production DRF Research Lab export required');
 if(freeze?.schema!=='nyra-local-research-freeze-v1'||freeze.source!=='DRF'||!Array.isArray(freeze.races))throw Error('Original DRF freeze required');
 if(!finite(tolerance)||tolerance<0||tolerance>1e-4)throw Error('Invalid score tolerance');
 const out=[];
 for(const race of dataset.races){
  const meta=race.metadata||{};
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
   if(replay.size!==race.runners.length)throw Error('Replay baseline incomplete: '+race.id+' '+modelId);
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
