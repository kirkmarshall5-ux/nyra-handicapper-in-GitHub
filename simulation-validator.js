// Research-only race-flow validation. Never modifies V4.4c rankings, PASS or wagers.
// Each record must be a frozen pre-race prediction paired with an independent official chart.
const isISO=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&/^\d{4}-\d\d-\d\dT/.test(x);
const uniq=a=>new Set(a).size===a.length;
const integer=x=>Number.isInteger(x)&&x>0;
const validPositionMap=(map,calls,field)=>map&&typeof map==='object'&&calls.every(c=>integer(map[c])&&map[c]<=field);
const fail=m=>{throw Error(m)};
export function validateRaceRecord(r){
 if(!r||typeof r!=='object')fail('Record required');
 for(const k of ['raceId','track','date','surface','distance','modelVersion','predictionFrozenAt','officialChartId','chartPublishedAt'])if(typeof r[k]!=='string'||!r[k].trim())fail('Missing '+k);
 if(!isISO(r.predictionFrozenAt)||!isISO(r.chartPublishedAt)||Date.parse(r.predictionFrozenAt)>=Date.parse(r.chartPublishedAt))fail('Prediction must be frozen before chart publication');
 if(!Array.isArray(r.calls)||r.calls.length<2||!uniq(r.calls)||r.calls.at(-1)!=='finish')fail('Calls must be unique and end in finish');
 if(!Array.isArray(r.runners)||r.runners.length<2)fail('Complete field requires at least two runners');
 const programs=r.runners.map(x=>String(x.program));
 if(!uniq(programs))fail('Duplicate runner program');
 const n=r.runners.length;
 const predicted=r.runners.map(x=>x.predicted),actual=r.runners.map(x=>x.actual);
 for(const x of r.runners){
  if(!x.name||!x.program||!validPositionMap(x.predicted,r.calls,n)||!validPositionMap(x.actual,r.calls,n))fail('Missing or invalid complete call positions for '+x.program);
  if(x.winProbability!==undefined&&(!Number.isFinite(x.winProbability)||x.winProbability<0||x.winProbability>1))fail('Invalid win probability');
 }
 for(const call of r.calls){
  const p=predicted.map(x=>x[call]).sort((a,b)=>a-b),a=actual.map(x=>x[call]).sort((a,b)=>a-b);
  if(p.some((x,i)=>x!==i+1)||a.some((x,i)=>x!==i+1))fail('Positions must be a full unique ranking at '+call);
 }
 const probabilities=r.runners.map(x=>x.winProbability);
 if(probabilities.some(x=>x!==undefined)){
  if(probabilities.some(x=>x===undefined)||Math.abs(probabilities.reduce((a,b)=>a+b,0)-1)>0.0001)fail('Win probabilities must cover full field and sum to 1');
 }
 if(r.chartSourceUrl!==undefined&&!/^https:\/\//.test(r.chartSourceUrl))fail('Chart source must be HTTPS');
 if(r.predictionArtifactId===undefined||!String(r.predictionArtifactId).trim())fail('Frozen prediction artifact ID required');
 if(r.datasetSplit!=='development'&&r.datasetSplit!=='holdout')fail('Explicit dataset split required');
 return true;
}
const round=x=>Math.round(x*10000)/10000;
export function gradeRace(r){
 validateRaceRecord(r);
 const n=r.runners.length,perCall={};
 for(const call of r.calls){
  const errors=r.runners.map(x=>Math.abs(x.predicted[call]-x.actual[call]));
  const leader=r.runners.find(x=>x.predicted[call]===1).program;
  const actualLeader=r.runners.find(x=>x.actual[call]===1).program;
  perCall[call]={positionAbsoluteErrorSum:errors.reduce((a,b)=>a+b,0),positions:n,meanAbsoluteError:round(errors.reduce((a,b)=>a+b,0)/n),leaderCorrect:leader===actualLeader};
 }
 const predictedTop3=new Set(r.runners.filter(x=>x.predicted.finish<=Math.min(3,n)).map(x=>String(x.program)));
 const actualTop3=r.runners.filter(x=>x.actual.finish<=Math.min(3,n));
 const top3Hits=actualTop3.filter(x=>predictedTop3.has(String(x.program))).length;
 const predictedWinner=r.runners.find(x=>x.predicted.finish===1),winner=r.runners.find(x=>x.actual.finish===1);
 const hasProb=r.runners.every(x=>x.winProbability!==undefined);
 const brier=hasProb?r.runners.reduce((a,x)=>a+(x.winProbability-(x.actual.finish===1?1:0))**2,0)/n:null;
 const logLoss=hasProb?-Math.log(Math.max(winner.winProbability,1e-12)):null;
 return {raceId:r.raceId,datasetSplit:r.datasetSplit,fieldSize:n,modelVersion:r.modelVersion,perCall,finishTop3Hits:top3Hits,finishTop3Count:actualTop3.length,finishWinnerCorrect:predictedWinner.program===winner.program,winBrier:hasProb?round(brier):null,winLogLoss:hasProb?round(logLoss):null};
}
export function gradeDataset(records,{split='holdout'}={}){
 if(!Array.isArray(records))fail('Records array required');
 const ids=new Set(),artifacts=new Set(),graded=[];
 for(const r of records){
  validateRaceRecord(r);
  if(ids.has(r.raceId))fail('Duplicate raceId '+r.raceId);
  ids.add(r.raceId);
  if(artifacts.has(r.predictionArtifactId))fail('Prediction artifact reused '+r.predictionArtifactId);
  artifacts.add(r.predictionArtifactId);
  if(r.datasetSplit===split)graded.push(gradeRace(r));
 }
 const calls=[...new Set(graded.flatMap(r=>Object.keys(r.perCall)))],perCall={};
 for(const call of calls){
  const rows=graded.map(r=>r.perCall[call]).filter(Boolean);
  const total=rows.reduce((a,r)=>a+r.positionAbsoluteErrorSum,0),positions=rows.reduce((a,r)=>a+r.positions,0);
  perCall[call]={races:rows.length,positionMAE:positions?round(total/positions):null,leaderAccuracy:rows.length?round(rows.filter(r=>r.leaderCorrect).length/rows.length):null};
 }
 const p=graded.filter(x=>x.winBrier!==null);
 return {status:graded.length?'RESEARCH_UNVALIDATED':'NO_VALIDATION_DATA',datasetSplit:split,races:graded.length,perCall,top3Recall:graded.length?round(graded.reduce((a,x)=>a+x.finishTop3Hits,0)/graded.reduce((a,x)=>a+x.finishTop3Count,0)):null,top1Accuracy:graded.length?round(graded.filter(x=>x.finishWinnerCorrect).length/graded.length):null,probabilityRaces:p.length,winBrier:p.length?round(p.reduce((a,x)=>a+x.winBrier,0)/p.length):null,winLogLoss:p.length?round(p.reduce((a,x)=>a+x.winLogLoss,0)/p.length):null,warning:'Descriptive research metrics only. Independent prospective sample size, calibration, and comparison with baselines are not established.'};
}
