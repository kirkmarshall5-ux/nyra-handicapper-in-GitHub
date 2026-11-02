// Converts local browser freeze exports into DRF-only research inventory.
// Browser-device timestamps are never treated as independent evidence.
export function extractDrfFreezeInventory(freeze){
 if(freeze?.schema!=='nyra-local-research-freeze-v1'||freeze.source!=='DRF')throw Error('Expected DRF local research freeze');
 if(!Array.isArray(freeze.races))throw Error('Freeze races missing');
 return freeze.races.map(r=>{
  const models=r.dashboard?.models||[];
  const contender=models.find(m=>m.id==='drfContender');
  const finisher=models.find(m=>m.id==='drfFinisher');
  const drf=r.dashboard?.source_cards?.DRF;
  const blockers=[];
  if(!drf||drf.date!==freeze.card_date||drf.track!==freeze.track)blockers.push('DRF source-card identity missing or mismatched');
  if(!contender||!finisher)blockers.push('One or both DRF model snapshots missing');
  for(const [name,model] of [['Contender',contender],['Finisher',finisher]]){
   if(model&&(model.decision==='PASS'||model.complete!==true||(model.rankings||[]).length<4))blockers.push(name+' incomplete or PASS');
  }
  if(freeze.clock_source!=='independent-verified')blockers.push('Browser clock is not an independent timestamp');
  blockers.push('Official results not supplied or reconciled');
  return {track:freeze.track,date:freeze.card_date,race:r.race,source:'DRF',source_name:drf?.source_name||null,captured_at_utc:freeze.captured_at_utc,clock_source:freeze.clock_source,contender:{decision:contender?.decision||'MISSING',top_four:(contender?.rankings||[]).slice(0,4).map(x=>({program:x.n,name:x.name}))},finisher:{decision:finisher?.decision||'MISSING',top_four:(finisher?.rankings||[]).slice(0,4).map(x=>({program:x.n,name:x.name}))},status:'BLOCKED',blockers};
 });
}
