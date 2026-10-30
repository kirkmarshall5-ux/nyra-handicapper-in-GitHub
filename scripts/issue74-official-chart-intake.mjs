// Issue #74: validate a separately, manually transcribed official-chart intake.
// This module never fetches copyrighted charts or authenticates an assertion.
const canonical = value => String(value ?? '').trim().toUpperCase();
const unique = xs => new Set(xs).size === xs.length;
const asArray = x => Array.isArray(x) ? x : [];
// A random HTTPS page is not an official chart source. Require the Equibase
// publisher's actual domain boundary; do not authenticate chart contents here.
const officialChartPublisherUrl = value => {
  if(typeof value!=='string') return false;
  try {
    const url=new URL(value);
    return url.protocol==='https:' && !url.username && !url.password &&
      (url.hostname==='equibase.com' || url.hostname.endsWith('.equibase.com'));
  } catch {return false;}
};
const nameKey = s => String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function inspectOfficialChartIntake(publishedRace, intake, originalPPIdentities) {
  if(!publishedRace || !Number.isInteger(publishedRace.race))
    throw Error('Published race manifest required');
  const errors=[],warnings=[];
  if(!intake || typeof intake!=='object')
    return {race:publishedRace.race,status:'AWAITING_MANUAL_OFFICIAL_CHART',errors:['No independently transcribed chart intake supplied'],warnings:[]};
  if(intake.race!==publishedRace.race) errors.push('Race number mismatch');
  if(intake.date!=='2026-10-25') errors.push('Date mismatch');
  if(canonical(intake.track)!=='BELMONT PARK') errors.push('Track mismatch');
  if(!officialChartPublisherUrl(intake.officialChartUrl)) errors.push('Official chart URL must be HTTPS on an Equibase publisher domain');
  if(typeof intake.officialChartId!=='string'||!intake.officialChartId.trim()) errors.push('Missing official chart ID');
  if(intake.manuallyReviewed!==true) errors.push('Official chart not manually reviewed');
  if(typeof intake.reviewer!=='string'||!intake.reviewer.trim()) errors.push('Reviewer not recorded');
  if(!Number.isFinite(Date.parse(intake.reviewedAtUtc||''))) errors.push('Review timestamp missing or invalid');
  if(!Number.isFinite(Date.parse(intake.offAtUtc||''))) errors.push('Official off time missing or invalid');
  if(typeof intake.surface!=='string'||!intake.surface.trim()) errors.push('Official surface missing');
  if(typeof intake.distance!=='string'||!intake.distance.trim()) errors.push('Official distance missing');
  if(intake.chartCorrectionsReviewed!==true) errors.push('Chart corrections not reviewed');
  if(intake.deadHeatsReviewed!==true) errors.push('Dead heats not reviewed');
  if(intake.disqualificationsReviewed!==true) errors.push('Disqualifications not reviewed');
  if(intake.coupledEntriesReviewed!==true) errors.push('Coupled entries not reviewed');
  if(intake.aeMtoScratchesReviewed!==true) errors.push('AE/MTO/scratches not reviewed');
  const entries=asArray(intake.entries),roster=publishedRace.saved_roster_programs.map(canonical);
  const programs=entries.map(e=>canonical(e?.program));
  if(!entries.length) errors.push('Official chart runner entries missing');
  if(programs.some(p=>!p)) errors.push('Blank chart program');
  if(!unique(programs)) errors.push('Duplicate chart program');
  for(const p of programs) if(!roster.includes(p)) errors.push('Chart starter/nonstarter absent from source PP roster #'+p);
  // A program number alone is not a unique horse identity. Independently
  // captured original PP horse names must be checked against chart starter names.
  const sourceIdentities=asArray(originalPPIdentities);
  const sourcePrograms=sourceIdentities.map(x=>canonical(x?.program));
  if(!sourceIdentities.length) errors.push('Original PP horse-name identity evidence missing');
  if(!unique(sourcePrograms)) errors.push('Duplicate original PP identity program');
  if(sourceIdentities.some(x=>!canonical(x?.program)||!nameKey(x?.name))) errors.push('Original PP identity has missing program or name');
  if(JSON.stringify([...sourcePrograms].sort())!==JSON.stringify([...roster].sort()))
    errors.push('Original PP horse-name identity list does not cover complete source roster');
  const sourceByProgram=new Map(sourceIdentities.map(x=>[canonical(x.program),nameKey(x.name)]));
  for(const entry of entries){
    const program=canonical(entry?.program),name=nameKey(entry?.name);
    if(!name) errors.push('Official chart starter name missing #'+program);
    else if(sourceByProgram.has(program)&&sourceByProgram.get(program)!==name)
      errors.push('Original PP versus official chart horse-name mismatch #'+program);
  }
  // Charts may omit scratches, so require a separate reviewed nonstarter list.
  const nonstarters=asArray(intake.officialNonstarterPrograms).map(canonical);
  if(!unique(nonstarters)) errors.push('Duplicate nonstarter program');
  if(nonstarters.some(p=>!roster.includes(p))) errors.push('Nonstarter absent from PP roster');
  if(nonstarters.some(p=>programs.includes(p))) errors.push('Starter/nonstarter overlap');
  const chartField=[...programs,...nonstarters].sort();
  if(JSON.stringify(chartField)!==JSON.stringify([...roster].sort()))
    errors.push('Official starters plus nonstarters do not reconcile exactly to PP source roster');
  const finish=asArray(intake.officialFinishOrderPrograms).map(canonical);
  if(!finish.length) errors.push('Official finish order missing');
  if(!unique(finish)) errors.push('Duplicate finish position program; dead heats require explicit separate adjudication');
  if(finish.some(p=>!programs.includes(p))) errors.push('Finish program not an official starter');
  if(JSON.stringify([...finish].sort())!==JSON.stringify([...programs].sort()))
    errors.push('Finish order does not cover every official starter (DNF/dead heat requires adjudication)');
  const prior=publishedRace.finish_order_programs.map(canonical);
  if(JSON.stringify(finish)!==JSON.stringify(prior))
    warnings.push('Official finish differs from published third-party results; require correction adjudication');
  const priorNonstarters=publishedRace.published_nonstarters.map(canonical);
  if(JSON.stringify([...nonstarters].sort())!==JSON.stringify([...priorNonstarters].sort()))
    warnings.push('Official scratches/nonstarters differ from inferred third-party nonstarters');
  const missing=publishedRace.missing_published_starters_from_dashboard.map(canonical);
  const unranked=publishedRace.published_starters_unranked_by_brisnet.map(canonical);
  if(missing.length) warnings.push('Archived dashboard omitted starter(s): '+missing.join(','));
  if(unranked.length) warnings.push('Archived Brisnet rankings incomplete: '+unranked.join(','));
  return {race:publishedRace.race,status:errors.length?'MANUAL_REVIEW_REQUIRED':warnings.length?'OFFICIAL_CHART_INTAKE_WITH_DISCREPANCIES':'OFFICIAL_CHART_INTAKE_STRUCTURALLY_COMPLETE_NOT_AUTHENTICATED',errors,warnings,prospectiveGradeable:false};
}
