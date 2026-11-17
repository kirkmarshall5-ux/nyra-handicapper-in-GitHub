// Research-only eligibility inventory for frozen race cards.
// Never treat an available model ranking as a verified official outcome.
export function inventoryFinisherCandidates(freeze){
 if(!freeze||!Array.isArray(freeze.races))throw new Error('Frozen races required');
 const rows=freeze.races.map(r=>{
  const models=r.dashboard?.models??[];
  const rr=models.find(m=>m.id==='brisResearch');
  const finisher=models.find(m=>m.id==='brisFinisher');
  const field=r.dashboard?.field??[];
  const reasons=[];
  if(!rr?.rankings?.length||!finisher?.rankings?.length)reasons.push('MISSING_RR_OR_FINISHER');
  if(!rr?.rankings?.[0]||!rr?.rankings?.[1])reasons.push('RR_TOP_TWO_MISSING');
  if(!field.length)reasons.push('NO_ACTIVE_FIELD');
  if(rr?.decision==='PASS'||rr?.decision==='HOLD'||finisher?.decision==='PASS'||finisher?.decision==='HOLD')reasons.push('MODEL_PASS_OR_HOLD');
  return {race:r.race,surface:r.dashboard?.race?.surface??null,distance:r.dashboard?.race?.distance??null,
   activeField:field.length,rrFirst:rr?.rankings?.[0]?.n??null,rrSecond:rr?.rankings?.[1]?.n??null,
   finisherFirst:finisher?.rankings?.[0]?.n??null,finisherSecond:finisher?.rankings?.[1]?.n??null,
   candidate:reasons.length===0,reasons,officialResultsVerified:false};
 });
 return {track:freeze.track,date:freeze.card_date,total:rows.length,candidates:rows.filter(r=>r.candidate).length,
  excluded:rows.filter(r=>!r.candidate).length,rows,researchOnly:true};
}
