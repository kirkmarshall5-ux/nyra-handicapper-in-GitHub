// Stage 2 evidence inventory: source-preserving candidate detection only.
// NO conversion of DRF glyphs to verified positions; NO chart or winner inference.
const pastLine=/^\s*\d{1,2}[^\s\d]{1,3}\d{2}=\s*\d+\s*[A-Za-z]/u;
const paceLine=/TimeformUS Pace:\s*Early\s+(\d+)\s+Late\s+(\d+)/i;
const lifeLine=/^\s*Life\s+(\d+)\s+/;
const headerLine=/^\s*(\d+)\s+([A-Za-z][A-Za-z ]+?)\s+(?:Md |Clm |Alw |OC|Stk|Mdn)/;
const likelyCallToken=/\b\d+(?:[¦§¨©ª«¬®ôöõÇÉ]+)?\b/u;
export function inventoryPPText(text,{sourceId,cardDate,track}={}){
 if(typeof text!=='string'||!text.trim())throw Error('Nonempty extracted PP text required');
 if(!sourceId||!cardDate||!track)throw Error('Source ID, card date and track required');
 const lines=text.split(/\r?\n/),candidates=[],pace=[],starts=[],headers=[];
 for(let i=0;i<lines.length;i++){
  const line=lines[i].trim();
  const p=line.match(paceLine),l=line.match(lifeLine),h=line.match(headerLine);
  if(p)pace.push({line:i+1,early:Number(p[1]),late:Number(p[2])});
  if(l)starts.push({line:i+1,starts:Number(l[1])});
  if(h)headers.push({line:i+1,raceNumber:Number(h[1]),raw:line});
  if(pastLine.test(line)){
   const fieldMatch=line.match(/\s(\d+)\s*\/\s*(\d+)\s/);
   candidates.push({line:i+1,raw:line,fieldSizeCandidate:fieldMatch?Number(fieldMatch[2]):null,hasFieldSizeToken:Boolean(fieldMatch),hasPossiblePositionTokens:likelyCallToken.test(line),verifiedCallPositions:false,verifiedBeatenLengths:false,verifiedFractionalTimes:false,reviewStatus:'NEEDS_COLUMN_MAPPING'});
  }
 }
 return {sourceId,cardDate,track,lines:lines.length,pastPerformanceLineCandidates:candidates.length,timeformPacePairs:pace.length,careerStartEntries:starts.length,raceHeaderCandidates:headers.length,firstTimeStarterEntries:starts.filter(x=>x.starts===0).length,callPositionVerified:0,chartPairsVerified:0,reviewStatus:'SOURCE_INVENTORY_ONLY',candidates,pace,starts,headers};
}
export function validateChartPairManifest(manifest){
 if(!Array.isArray(manifest))throw Error('Chart manifest must be an array');
 const ids=new Set();
 return manifest.map(row=>{
  if(!row||!row.raceId||!row.ppSourceId)throw Error('Race and PP source IDs required');
  if(ids.has(row.raceId))throw Error('Duplicate race '+row.raceId);
  ids.add(row.raceId);
  const status=row.officialChartId&&row.officialChartUrl&&row.runnerReconciliationVerified===true&&row.callMappingVerified===true&&row.actualChartReviewed===true?'READY_FOR_MANUAL_PAIR_REVIEW':'NOT_PAIRED';
  return {raceId:row.raceId,ppSourceId:row.ppSourceId,status,reason:status==='NOT_PAIRED'?'Official chart, full runner reconciliation and call mapping not yet verified':null};
 });
}
