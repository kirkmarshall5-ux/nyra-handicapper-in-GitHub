// Research-only historical condition comparison. Never changes locked model scores.
export const HISTORY_CONTEXT_ID='BRISNET-HISTORY-CONTEXT-v1';
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export function compareHistoricalLine(line,today){
 const reasons=[];
 if(!line||!today)return {status:'HOLD',reasons:['MISSING_LINE_OR_TODAY']};
 const ev=line.condition_evidence;
 if(ev?.status!=='SOURCE_TOKEN_VERIFIED'||!finite(line.furlongs)||!line.surface)
  return {status:'HOLD',reasons:['HISTORICAL_CONDITIONS_UNVERIFIED']};
 if(!finite(today.furlongs)||!['Dirt','Turf','Synth'].includes(today.surface))
  return {status:'HOLD',reasons:['TODAY_CONDITIONS_UNVERIFIED']};
 const surfaceMatch=line.surface===today.surface;
 const distanceDelta=Math.abs(line.furlongs-today.furlongs);
 const routeNow=today.furlongs>=8,routeThen=line.furlongs>=8;
 if(!surfaceMatch)reasons.push('DIFFERENT_SURFACE');
 if(routeNow!==routeThen)reasons.push('SPRINT_ROUTE_CHANGE');
 if(distanceDelta>1.5)reasons.push('DISTANCE_GAP_OVER_1_5F');
 if(ev.approximate)reasons.push('APPROXIMATE_HISTORICAL_DISTANCE');
 const figures={speed:finite(line.speed)?line.speed:null,e1:finite(line.e1)?line.e1:null,e2:finite(line.e2)?line.e2:null,late:finite(line.late)?line.late:null};
 const missing=Object.entries(figures).filter(([,v])=>v===null).map(([k])=>k);
 if(missing.length)reasons.push('INCOMPLETE_FIGURES:'+missing.join(','));
 const comparable=surfaceMatch&&routeNow===routeThen&&distanceDelta<=1.5&&!ev.approximate;
 return {status:comparable?'CONDITIONS_COMPARABLE':'CONDITIONS_DIFFER',surfaceMatch,distanceDeltaFurlongs:distanceDelta,sprintRouteMatch:routeNow===routeThen,figures,missingFigures:missing,reasons,interpretation:'DESCRIPTIVE_ONLY_NOT_PREDICTIVE'};
}
export function summarizeHistoricalContext(lines,today){
 if(!Array.isArray(lines))return {status:'HOLD',reason:'HISTORY_NOT_ARRAY'};
 const comparisons=lines.map(l=>compareHistoricalLine(l,today));
 return {status:comparisons.some(c=>c.status==='HOLD')?'PARTIAL_EVIDENCE':'RESEARCH_ONLY',totalLines:lines.length,comparableLines:comparisons.filter(c=>c.status==='CONDITIONS_COMPARABLE').length,comparisons};
}
