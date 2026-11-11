// Research-only inventory of literal PP class evidence. No live model or freeze changes.
// Class levels across jurisdictions are NOT assumed comparable.
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const money=s=>Number(String(s).replace(/,/g,''));
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
  const raceClass=raw.match(/\b(MSW|MCL|ALW|AOC|STK|G[123])\b/i);
  const class_code=raceClass?raceClass[1].toUpperCase():null;
  if(purses.length>1||claims.length>1)flags.push('AMBIGUOUS_CLASS_AMOUNT_'+index);
  if(purse===null&&claiming_price===null&&class_code===null){flags.push('NO_EXPLICIT_CLASS_TOKEN_'+index);continue;}
  out.push({index,running_date_track:clean(line.running_date_track),purse,claiming_price,class_code,source_line:raw});
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

export function auditClassRace(race){
 const horses=(race?.horses||[]).filter(h=>h.odds!=='SCR'&&h.included_in_frozen_field!==false&&(!h.entry_status||h.entry_status==='REGULAR'));
 return {research_only:true,scoring_applied:false,header_class:classEvidenceForRaceHeader(race?.header||''),track:race?.track||null,date:race?.date||null,race:race?.race??null,horses:horses.map(h=>({program:String(h.n??''),name:h.name,...classEvidenceForHorse(h)}))};
}
