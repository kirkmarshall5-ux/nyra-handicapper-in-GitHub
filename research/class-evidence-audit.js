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
export function auditClassRace(race){
 const horses=(race?.horses||[]).filter(h=>h.odds!=='SCR'&&h.included_in_frozen_field!==false&&(!h.entry_status||h.entry_status==='REGULAR'));
 return {research_only:true,scoring_applied:false,track:race?.track||null,date:race?.date||null,race:race?.race??null,horses:horses.map(h=>({program:String(h.n??''),name:h.name,...classEvidenceForHorse(h)}))};
}
