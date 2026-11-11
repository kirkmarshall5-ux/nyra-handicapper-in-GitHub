// Research-only inventory of literal PP class evidence. No live model or freeze changes.
// Class levels across jurisdictions are NOT assumed comparable.
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const money=s=>Number(String(s).replace(/,/g,''));

// Brisnet Premium PP RACETYPE column (e.g. 'MC35000', 'MC50000-c').
// The compact amount is a race condition, not a purse or universal class score.
export function classEvidenceFromBrisnetRunningLine(sourceLine){
 const raw=clean(sourceLine);
 const matches=[...raw.matchAll(/(?:^|\s)[‘'’]?\b(MC|OC|CLM|MCL|MSW|MDN|ALW|STK)(\d{4,6})?(n\d+[a-z0-9]*)?(?:-c)?(?=\s|$)/gi)];
 if(matches.length!==1)return {status:'MISSING_OR_AMBIGUOUS_RACETYPE',class_code:null,condition_amount:null,condition_suffix:null,source_line:raw};
 const m=matches[0];
 return {status:'LITERAL_RACETYPE',class_code:m[1].toUpperCase(),condition_amount:m[2]?Number(m[2]):null,condition_suffix:m[3]||null,source_line:raw};
}

export function classEvidenceForHorse(h){
 const lines=h?.contender_evidence?.switch_evidence?.running_lines||h?.switch_evidence?.running_lines||[];
 const out=[],flags=[];
 if(!Array.isArray(lines)||!lines.length)return {status:'NO_VERIFIED_RUNNING_LINES',observations:[],flags:['CLASS_INPUT_UNAVAILABLE']};
 for(const [index,line] of lines.entries()){
  const raw=clean(line?.source_line);
  if(!raw){flags.push('EMPTY_SOURCE_LINE_'+index);continue;}
  // Extract only explicit monetary purses. Do not treat claim prices as purses.
  const purses=[...raw.matchAll(/\b(?:Purse|Prs)\s*[:$]?\s*\$?([\d,]+)\b/gi)];
  const claims=[...raw.matchAll(/\b(?:Claiming|Clm)\s*(?:Price|Prc)?\s*[:$]?\s*\$?([\d,]+)\b/gi)];
  const purse=purses.length===1?money(purses[0][1]):null;
  const claiming_price=claims.length===1?money(claims[0][1]):null;
  const bris=classEvidenceFromBrisnetRunningLine(raw);
  const raceClass=raw.match(/\b(MSW|MCL|ALW|AOC|STK|G[123])\b/i);
  const class_code=raceClass?raceClass[1].toUpperCase():bris.class_code;
  if(purses.length>1||claims.length>1)flags.push('AMBIGUOUS_CLASS_AMOUNT_'+index);
  if(purse===null&&claiming_price===null&&class_code===null){flags.push('NO_EXPLICIT_CLASS_TOKEN_'+index);continue;}
  out.push({index,running_date_track:clean(line.running_date_track),purse,claiming_price,class_code,condition_amount:bris.condition_amount,condition_suffix:bris.condition_suffix,source_line:raw});
 }
 return {status:out.length?'PARTIAL_LITERAL_EVIDENCE':'NO_EXTRACTABLE_CLASS_EVIDENCE',observations:out,flags};
}

// Brisnet race headers use compact codes such as MC 35000 and OC 55000n1x.
// Keep the conditions and purse separate: purse is not a class rating.
export function classEvidenceForRaceHeader(header){
 const raw=clean(header),matches=[...raw.matchAll(/\b(MC|OC|CLM|MCL|MSW|MDN|ALW|STK)\s*(\d{4,6})?(n\d+[a-z0-9]*)?\b/gi)];
 const purses=[...raw.matchAll(/\bPurse\s*\$\s*([\d,]+)\b/gi)];
 const valid=matches.length===1&&purses.length<=1;
 return {status:valid?'LITERAL_HEADER_EVIDENCE':'AMBIGUOUS_OR_MISSING_HEADER',
  class_code:valid?matches[0][1].toUpperCase():null,
  condition_amount:valid&&matches[0][2]?Number(matches[0][2]):null,
  condition_suffix:valid?matches[0][3]||null:null,
  purse:valid&&purses.length===1?money(purses[0][1]):null,
  source_line:raw,
  flags:[...(matches.length!==1?['CLASS_CODE_MISSING_OR_MULTIPLE']:[]),...(purses.length>1?['MULTIPLE_PURSES']:[])]};
}


// Conservative same-code class movement. Only compare the same class family
// and explicit monetary condition; never order allowance/stakes vs claiming.
export function compareClassMovement(current,previous){
 if(!current||!previous)return {status:'INSUFFICIENT_CLASS_EVIDENCE',direction:null};
 const a=String(current.class_code||'').toUpperCase(),b=String(previous.class_code||'').toUpperCase();
 const n=Number(current.condition_amount),p=Number(previous.condition_amount);
 if(!a||a!==b||!Number.isFinite(n)||!Number.isFinite(p)||n<=0||p<=0)
  return {status:'NONCOMPARABLE_CLASS_CONDITIONS',direction:null};
 if(!['MC','MCL','CLM'].includes(a))return {status:'CLASS_ORDERING_UNVERIFIED',direction:null};
 // MC/MCL are separate codes and are not implicitly mapped to each other.
 return {status:'SAME_CLASS_FAMILY_COMPARISON',direction:n>p?'UP':n<p?'DOWN':'SAME',from:p,to:n,code:a};
}

export function auditClassRace(race){
 const horses=(race?.horses||[]).filter(h=>h.odds!=='SCR'&&h.included_in_frozen_field!==false&&(!h.entry_status||h.entry_status==='REGULAR'));
 return {research_only:true,scoring_applied:false,header_class:classEvidenceForRaceHeader(race?.header||''),track:race?.track||null,date:race?.date||null,race:race?.race??null,horses:horses.map(h=>({program:String(h.n??''),name:h.name,...classEvidenceForHorse(h)}))};
}


export function classCoverageSummary(auditedRaces){
 const races=Array.isArray(auditedRaces)?auditedRaces:[];
 let totalHorses=0,withEvidence=0,withComparableMovement=0,missingEvidence=0;
 const raceSummaries=[];
 for(const race of races){
  const horses=Array.isArray(race?.horses)?race.horses:[];
  let raceEvidence=0,raceComparable=0;
  for(const horse of horses){
   totalHorses++;
   const observations=Array.isArray(horse.observations)?horse.observations:[];
   if(observations.length){withEvidence++;raceEvidence++;}else missingEvidence++;
   if(observations.length>=2&&compareClassMovement(observations[0],observations[1]).direction!==null){
    withComparableMovement++;raceComparable++;
   }
  }
  raceSummaries.push({track:race?.track||null,date:race?.date||null,race:race?.race??null,horses:horses.length,withEvidence:raceEvidence,withComparableMovement:raceComparable,completeEvidence:horses.length>0&&raceEvidence===horses.length});
 }
 return {research_only:true,scoring_applied:false,races:races.length,totalHorses,withEvidence,missingEvidence,withComparableMovement,evidenceCoverage:totalHorses?withEvidence/totalHorses:null,movementCoverage:totalHorses?withComparableMovement/totalHorses:null,raceSummaries};
}

// Diagnostic only: a speed figure is not confirmed by purse or class code alone.
// A confirmed comparison requires a verified prior speed figure and a documented,
// comparable class relationship. This function never changes rankings.
export function speedClassCrosscheck({speedFigure,comparison,comparisonSpeedFigure}={}){
 const speed=Number(speedFigure),reference=Number(comparisonSpeedFigure);
 if(speedFigure===null||speedFigure===undefined||!Number.isFinite(speed)||comparisonSpeedFigure===null||comparisonSpeedFigure===undefined||!Number.isFinite(reference))
  return {status:'INSUFFICIENT_SPEED_EVIDENCE',signal:null,scoring_applied:false};
 if(!comparison||comparison.status!=='SAME_CLASS_FAMILY_COMPARISON')
  return {status:'CLASS_NOT_COMPARABLE',signal:null,scoring_applied:false};
 // This is a hypothesis label for retrospective validation, NOT a claim
 // that a stronger-class figure is inherently more accurate.
 const delta=speed-reference;
 return {status:'RESEARCH_HYPOTHESIS_ONLY',signal:comparison.direction==='UP'?'SPEED_AT_HIGHER_CONDITION':comparison.direction==='DOWN'?'SPEED_AT_LOWER_CONDITION':'SAME_CONDITION_SPEED',speedDelta:delta,scoring_applied:false};
}

// Retrospective pairing: only explicitly supplied figure/class pairs from
// the same historical running line are eligible. No cross-line interpolation.
export function auditSpeedClassPairs(lines){
 const rows=Array.isArray(lines)?lines:[];
 const pairs=[],excluded=[];
 for(const [index,line] of rows.entries()){
  const raw=clean(line?.source_line);
  const classInfo=classEvidenceFromBrisnetRunningLine(raw);
  const figure=line?.speed_figure;
  if(classInfo.status!=='LITERAL_RACETYPE'){excluded.push({index,reason:'CLASS_UNVERIFIED'});continue;}
  if(figure===null||figure===undefined||figure===''||!Number.isFinite(Number(figure))){
   excluded.push({index,reason:'SPEED_FIGURE_UNVERIFIED'});continue;
  }
  pairs.push({index,speedFigure:Number(figure),class_code:classInfo.class_code,condition_amount:classInfo.condition_amount,condition_suffix:classInfo.condition_suffix,source_line:raw});
 }
 return {research_only:true,scoring_applied:false,totalLines:rows.length,eligiblePairs:pairs.length,pairs,excluded};
}

// Summarize historical speed/class evidence without excluding incomplete horses.
// This intentionally does not estimate class strength or betting ROI.
export function speedClassCoverageByRace(races){
 const input=Array.isArray(races)?races:[];
 let horses=0,withPairs=0,totalLines=0,eligiblePairs=0,excludedClass=0,excludedSpeed=0;
 const perRace=[];
 for(const race of input){
  const runners=Array.isArray(race?.horses)?race.horses:[];
  let raceHorsesWithPairs=0,racePairs=0;
  for(const h of runners){
   horses++;
   const lines=h?.contender_evidence?.switch_evidence?.running_lines||h?.switch_evidence?.running_lines||[];
   const audit=auditSpeedClassPairs(lines);
   totalLines+=audit.totalLines;eligiblePairs+=audit.eligiblePairs;
   racePairs+=audit.eligiblePairs;
   if(audit.eligiblePairs){withPairs++;raceHorsesWithPairs++;}
   for(const x of audit.excluded){
    if(x.reason==='CLASS_UNVERIFIED')excludedClass++;
    else if(x.reason==='SPEED_FIGURE_UNVERIFIED')excludedSpeed++;
   }
  }
  perRace.push({track:race?.track||null,date:race?.date||null,race:race?.race??null,horses:runners.length,horsesWithPairs:raceHorsesWithPairs,eligiblePairs:racePairs,completeFieldCoverage:runners.length>0&&raceHorsesWithPairs===runners.length});
 }
 return {research_only:true,scoring_applied:false,races:input.length,horses,horsesWithPairs:withPairs,totalLines,eligiblePairs,excludedClass,excludedSpeed,horseCoverage:horses?withPairs/horses:null,lineCoverage:totalLines?eligiblePairs/totalLines:null,perRace};
}
