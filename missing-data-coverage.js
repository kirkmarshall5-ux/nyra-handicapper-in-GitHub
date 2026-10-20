// Research-only coverage inventory. Never changes rankings, scores or decisions.
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const active=h=>h?.odds!=='SCR'&&h?.included_in_frozen_field!==false&&(!h?.entry_status||h.entry_status==='REGULAR');
const blockers=xs=>(xs||[]).map(x=>typeof x==='string'?x:x?.reason||'UNKNOWN_BLOCKER');
const kind=r=>r?.ratings_provider==='BRISNET'||r?.horses?.length&&r.horses.every(h=>h.ratings?.provider==='BRISNET')?'BRISNET':'DRF';
export function missingDataCoverage(race,{modelOutputs={}}={}){
 if(!race||!Array.isArray(race.horses))throw Error('Race and horse source required');
 const provider=kind(race),field=race.horses.filter(active),raceBlockers=blockers(race.parser_blockers);
 const runners=field.map(h=>{
  const isBrisnet=provider==='BRISNET',lines=h.ratings?.lines||[],figs=h.beyer_figures||h.figs||[];
  const careerVerified=Number.isInteger(h.life_starts)&&h.life_starts>=0;
  const speedVerified=isBrisnet?finite(lines[0]?.speed):Array.isArray(figs)&&figs.length>0&&figs.every(x=>finite(x)&&x>=0);
  const recent=isBrisnet?lines.slice(0,5):[];
  const comparable=isBrisnet?recent.filter(l=>finite(l.furlongs)&&finite(race.distance_furlongs)&&l.surface===race.surface&&(l.furlongs>=8)===(race.distance_furlongs>=8)&&Math.abs(l.furlongs-race.distance_furlongs)<=.5&&finite(l.speed)):[];
  const paceKey=finite(race.distance_furlongs)&&race.distance_furlongs>=8?'e2':'e1';
  const missing=[];
  if(!careerVerified)missing.push('CAREER_STARTS_UNVERIFIED');
  else if(h.life_starts===0)missing.push('FIRST_TIME_STARTER_NO_RACE_SPEED');
  if(h.life_starts>0&&!speedVerified)missing.push(isBrisnet?'LATEST_BRISNET_SPEED_UNVERIFIED':'BEYER_EVIDENCE_UNVERIFIED');
  if(isBrisnet){
   if(!comparable.length)missing.push('NO_MATCHED_SURFACE_DISTANCE_SPEED');
   if(!comparable.some(l=>finite(l[paceKey])))missing.push('NO_MATCHED_EARLY_PACE');
   if(!comparable.some(l=>finite(l.late)))missing.push('NO_MATCHED_LATE_PACE');
  }else{
   if(h.timeform_early==null)missing.push('TIMEFORM_EARLY_UNKNOWN');
   if(h.timeform_late==null)missing.push('TIMEFORM_LATE_UNKNOWN');
   if(!h.contender_evidence&&!h.switch_evidence)missing.push('CONTENDER_SOURCE_EVIDENCE_ABSENT');
  }
  return {program:String(h.n??''),horse:String(h.name??''),careerStarts:careerVerified?h.life_starts:null,sourceProvider:h.ratings?.provider||(isBrisnet?'UNVERIFIED':'DRF_ASSUMED'),speedVerified,sourceLineCount:isBrisnet?lines.length:null,comparableSpeedStarts:isBrisnet?comparable.length:null,missingEvidence:missing,parserBlockers:blockers(h.parser_blockers),sourcePages:isBrisnet?[...new Set(lines.map(l=>l.source?.page).filter(Number.isInteger))]:null};
 });
 const models=Object.fromEntries(Object.entries(modelOutputs).map(([name,result])=>[name,{decision:result?.decision||result?.status||'NOT_RUN',ratedCount:result?.rated_count??result?.rankings?.length??null,unratedCount:result?.unrated?.length??null,reason:result?.reason||null,passReasons:result?.pass_reasons||[],unrated:result?.unrated||[]}]));
 return {mode:'RESEARCH_ONLY',track:race.track||null,date:race.date||null,race:race.race||null,provider,fieldCount:field.length,raceBlockers,runners,models,limitations:['Source-code inventory; not an independent PDF extraction verification','Missing comparable pace does not prove missing printed pace','DRF source verification and scratch status require independent reconciliation','No wagering approval or calibrated probabilities']};
}
