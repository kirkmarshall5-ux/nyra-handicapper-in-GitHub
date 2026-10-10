// Research-only running-style derivation. Never uses race outcomes as predictive inputs.
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s))&&!Number.isNaN(Date.parse(s));
export function extractHistoricalCandidates(text,{sourceId,horseName}={}){
 if(typeof text!=='string'||!sourceId||!horseName)throw Error('PP text, source and horse required');
 return text.split(/\r?\n/).flatMap((raw,i)=>{
  const date=raw.match(/^\s*\d{1,2}[^\d\s]{1,3}\d{2}=/),field=raw.match(/\b\d{1,2}\s*\/\s*(\d{1,2})\b/);
  return date&&field&&+field[1]>=2&&+field[1]<=30?[{sourceId,horseName,lineNumber:i+1,dateToken:date[0].trim(),fieldSize:+field[1],rawLine:raw.trim(),candidateOnly:true,requiresHumanReview:true}]:[];
 });
}
export function deriveReviewedRunningStyle(runner,{raceDate,minLines=2,matchSurface=false}={}){
 if(!validDate(raceDate)||!Number.isInteger(minLines)||minLines<2)throw Error('Race date and >=2 lines required');
 const accepted=[],rejected=[];
 for(const [i,l] of (runner?.historicalCalls||[]).entries()){
  const reason=!validDate(l.date)||l.date>=raceDate?'Not strictly before target race':
   !l.reviewedAgainstOriginalPP||!l.reviewedBy?'Original PP mapping not reviewed':
   !l.sourceId||!Number.isInteger(l.page)||l.page<1||!Number.isInteger(l.lineNumber)||l.lineNumber<1?'Missing provenance':
   !Number.isInteger(l.fieldSize)||l.fieldSize<2||l.fieldSize>30||!Number.isInteger(l.earlyPosition)||l.earlyPosition<1||l.earlyPosition>l.fieldSize?'Invalid fractional call position':
   matchSurface&&l.surface!==runner.surface?'Different surface':null;
  if(reason)rejected.push({index:i,reason});else accepted.push(l);
 }
 if(accepted.length<minLines)return {style:null,usableLines:accepted.length,rejected,confidence:'insufficient',reason:'Insufficient reviewed historical calls'};
 const f=accepted.map(l=>(l.earlyPosition-1)/(l.fieldSize-1)).sort((a,b)=>a-b);
 const m=Math.floor(f.length/2),median=f.length%2?f[m]:(f[m-1]+f[m])/2;
 const style=median<=.15?'E':median<=.35?'EP':median<=.65?'P':'S';
 return {style,usableLines:accepted.length,rejected,confidence:accepted.length>=3?'reviewed_multiple':'reviewed_limited',medianNormalizedEarlyRank:median,latestDate:accepted.map(l=>l.date).sort().at(-1),sourceIds:[...new Set(accepted.map(l=>l.sourceId))]};
}
export function enrichRaceWithReviewedStyles(race,{minLines=2,matchSurface=false}={}){
 if(!race||!validDate(race.date)||!Array.isArray(race.runners))throw Error('Dated pre-race field required');
 const audit=[];
 const runners=race.runners.map(h=>{
  const d=deriveReviewedRunningStyle(h,{raceDate:race.date,minLines,matchSurface});
  const fts=h.careerStarts!==null&&h.careerStarts!==undefined&&Number(h.careerStarts)===0;
  const complete=h.tfEarly!=null&&h.tfLate!=null;
  const existing=Boolean(h.style&&h.styleSource&&h.styleSourceDate);
  const applied=Boolean(d.style&&!fts&&!complete&&!existing);
  audit.push({program:String(h.program),name:h.name,derivedStyle:d.style,applied,usableLines:d.usableLines,confidence:d.confidence,rejected:d.rejected,reason:applied?'Reviewed prior fractional positions':fts?'First-time starter':complete?'Complete Timeform pair':existing?'Existing sourced style retained':d.reason});
  return applied?{...h,style:d.style,styleSource:'Reviewed pre-race PP running lines: '+d.sourceIds.join(', '),styleSourceDate:d.latestDate}:h;
 });
 return {race:{...race,runners},audit,researchOnly:true,validated:false,warning:'Use with missingness v0.2 simulator; no outcome leakage, no betting'};
}
