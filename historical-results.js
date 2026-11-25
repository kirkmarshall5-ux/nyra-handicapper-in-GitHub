import {paperEligibility} from './paper-results.js';
export const HISTORICAL_SCHEMA='nyra-historical-results-v1';
export const STRATEGIES=Object.freeze({
 WIN_EXACTA:{label:'$2 win + $2 total exacta box',win:2,place:0,exacta:1},
 WIN_PLACE_EXACTA:{label:'$2 win/place + $2 total exacta box',win:2,place:2,exacta:1},
 WIN_PLACE:{label:'$2 win/place',win:2,place:2,exacta:0}
});
const copy=x=>structuredClone(x);
const p=h=>String(h?.n??h?.program??'').trim();
const name=h=>String(h?.name??h?.horse??'').replace(/\s*\([A-Za-z]{2,3}\)\s*$/,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const cents=x=>Math.round(x*100)/100;
const fail=s=>{throw Error(s)};
function validateField(field){
 if(!Array.isArray(field)||field.length<2||field.some(h=>!/^\d+$/.test(p(h))||!name(h))||new Set(field.map(p)).size!==field.length||new Set(field.map(name)).size!==field.length)fail('A complete field with unique uncoupled program numbers and names is required.');
}
export function dashboardModels(d){
 const field=d.field||[],models=copy(d.models||[]);
 const values=field.map((h,i)=>{
  const raw=d.prime_power?.[name(h)];
  const m=typeof raw==='number'?String(raw):String(raw??'');
  const match=m.match(/^\s*(\d+(?:\.\d+)?)(?:\s|$|\()/);
  return {...h,value:match?Number(match[1]):null,index:i};
 });
 const valid=values.filter(h=>h.value!==null);
 const pp={id:'primePower',label:'Prime Power',decision:'REFERENCE',available:valid.length===field.length,reason:valid.length===field.length?null:'Prime Power missing for active starter(s)',model_id:'BRISNET-PRIME-POWER-source',unrated:values.filter(h=>h.value===null).map(h=>({n:p(h),name:h.name,reasons:['Printed Prime Power unavailable']})),rankings:valid.sort((a,b)=>b.value-a.value||a.index-b.index).map((h,i)=>({n:p(h),name:h.name,rank:i+1,score:h.value}))};
 const ml=d.morning_line?{...copy(d.morning_line),decision:'REFERENCE',model_id:'MORNING-LINE-source'}:null;
 return [pp,...['brisResearch','brisRRV2','brisContender','drfContender'].map(id=>models.find(m=>m.id===id)).filter(Boolean),...models.filter(m=>m.id!=='brisFinisher'&&!['brisResearch','brisRRV2','brisContender','drfContender'].includes(m.id)),...(ml?[ml]:[])];
}
export function historicalSnapshot({dashboards,sources=[],capturedAt=new Date().toISOString()}){
 if(!Array.isArray(dashboards)||!dashboards.length||!Number.isFinite(Date.parse(capturedAt)))fail('Dated card snapshots are required.');
 const first=dashboards[0].race,seen=new Set();
 if(!first?.track||!/^\d{4}-\d{2}-\d{2}$/.test(first.date||''))fail('Track and card date are required.');
 const races=dashboards.map(d=>{
  if(d.demonstration||d.race?.track!==first.track||d.race?.date!==first.date||!Number.isInteger(Number(d.race.number))||Number(d.race.number)<1||seen.has(Number(d.race.number)))fail('Mixed, duplicate or demonstration races cannot be combined.');
  seen.add(Number(d.race.number));validateField(d.field);
  return {race:copy(d.race),field:copy(d.field),models:dashboardModels(d),fts_research:d.fts_research===undefined?null:copy(d.fts_research),cancelled:!!d.race.cancelled};
 });
 return {schema:HISTORICAL_SCHEMA,kind:'RETROSPECTIVE',capturedAt,track:first.track,date:first.date,sources:copy(sources),races,notice:'Historical replay using the recorded model versions. Not verified pre-race profitability.'};
}
export function importHistoricalSnapshot(value){
 if(value?.schema==='nyra-local-research-freeze-v1'){
  const out=historicalSnapshot({dashboards:(value.races||[]).map(r=>r.dashboard),capturedAt:value.captured_at_utc,sources:[{name:value.card_id||'Imported full-card freeze',capturedAt:value.captured_at_utc,originalSchema:value.schema}]});
  out.notice='Imported saved selections; capture time retained. Pre-race timing is not certified. Treated as retrospective.';
  return out;
 }
 if(value?.schema!==HISTORICAL_SCHEMA||value.kind!=='RETROSPECTIVE'||!Array.isArray(value.races)||!value.races.length)fail('Use a Historical Results backup or a Freeze All Models JSON.');
 const out=copy(value),seen=new Set();
 if(!out.track||!/^\d{4}-\d{2}-\d{2}$/.test(out.date||'')||!Number.isFinite(Date.parse(out.capturedAt)))fail('Invalid snapshot identity or capture time.');
 for(const r of out.races){
  validateField(r.field);
  if(r.race?.date!==out.date||r.race?.track!==out.track||!Number.isInteger(Number(r.race.number))||Number(r.race.number)<1||seen.has(Number(r.race.number))||!Array.isArray(r.models))fail('Invalid or duplicate race identity.');
  seen.add(Number(r.race.number));
  const ids=new Set();
  for(const m of r.models){if(!m.id||ids.has(m.id)||!Array.isArray(m.rankings))fail('Invalid or duplicate model.');ids.add(m.id);}
 }
 return out;
}
function verifyOfficial(r,official,strategy){
 if(official?.chartIssue)fail(official.chartIssue);
 if(!official?.verified||!String(official.sourceRef||'').trim())fail('Confirm the official chart and retain its filename or source reference.');
 if(official.nonstandard)fail('Dead heat, coupled entry or nonstandard payout requires manual adjudication; excluded from automatic ROI.');
 if(official.track!==r.race.track||official.date!==r.race.date||Number(official.race)!==Number(r.race.number))fail('Official chart track, date or race does not match this snapshot.');
 if(official.surface!==r.race.surface||String(official.distance)!==String(r.race.distance))fail('Surface or distance differs. Create a corrected retrospective snapshot before settlement.');
 validateField(official.field);
 const absent=r.field.filter(h=>!official.field.some(x=>p(x)===p(h)&&name(x)===name(h)));
 const added=official.field.filter(h=>!r.field.some(x=>p(x)===p(h)&&name(x)===name(h)));
 if(absent.length||added.length)fail('Official starters differ from the snapshot. '+(absent.length?'Absent or changed in chart: '+absent.map(h=>'#'+p(h)+' '+h.name).join(', ')+'. ':'')+(added.length?'Additional or changed chart starters: '+added.map(h=>'#'+p(h)+' '+h.name).join(', ')+'. ':'')+'Reconcile scratches before saving rankings.');
 const finish=official.finish?.map(String);
 if(!Array.isArray(finish)||finish.length!==r.field.length||new Set(finish).size!==finish.length||finish.some(n=>!r.field.some(h=>p(h)===n)))fail('Enter the complete official finishing order, with every starter exactly once.');
 for(const k of [...(strategy.win?['win2']:[]),...(strategy.exacta?['exactaPay','exactaBase']:[])])if(typeof official[k]!=='number'||!Number.isFinite(official[k])||official[k]<=0)fail('Verified positive payouts and denomination for the selected wagers are required.');
 if(strategy.place)for(const n of finish.slice(0,2))if(typeof official.place2?.[n]!=='number'||!Number.isFinite(official.place2[n])||official.place2[n]<=0)fail('Both official $2 place payouts are required for this strategy.');
 return finish;
}
export function evaluateHistoricalRace(r,official,strategyId='WIN_EXACTA'){
 const strategy=STRATEGIES[strategyId];if(!strategy)fail('Unknown betting strategy.');
 const finish=verifyOfficial(r,official,strategy),[winner,second]=finish;
 return r.models.map(m=>{
  const eligibility=paperEligibility(m,r.field,r.race),rows=m.rankings||[],a=p(rows[0]),b=p(rows[1]);
  const winnerRank=rows.findIndex(h=>p(h)===winner)+1||null;
  const runnerUpRank=rows.findIndex(h=>p(h)===second)+1||null;
  const base={model:m.id,label:m.label||m.id,modelVersion:m.model_id||null,recovery_status:m.recovery_status||null,recovery_reasons:m.recovery_reasons||[],race:r.race.number,winnerRank,winnerTopFour:winnerRank!==null&&winnerRank<=4,orderedTopTwo:a===winner&&b===second,reverseTopTwo:b===winner&&a===second,runnerUpRank,firstChoiceWinner:a===winner,exactSecond:runnerUpRank===2,topTwoRunnerUp:runnerUpRank!==null&&runnerUpRank<=2,topFourRunnerUp:runnerUpRank!==null&&runnerUpRank<=4,rrCompanionMiss:m.id==='brisResearch'&&a===winner&&b!==second,actualWinner:winner,actualSecond:second,chosenFirst:a,chosenSecond:b,sourceRef:official.sourceRef,resultVerification:official.verification,resultRecordedAt:official.recordedAt||null,eligibility};
  if(r.cancelled||!eligibility.included)return {...base,included:false,reason:r.cancelled?'Race cancelled':eligibility.reasons.join('; '),stake:0,returned:0,wagers:[]};
  const wagers=[];
  if(strategy.win)wagers.push({type:'win',cost:strategy.win,hit:a===winner,returned:a===winner?official.win2*strategy.win/2:0});
  if(strategy.place)wagers.push({type:'place',cost:strategy.place,hit:finish.slice(0,2).includes(a),returned:finish.slice(0,2).includes(a)?official.place2[a]*strategy.place/2:0});
  if(strategy.exacta){
   wagers.push({type:'exacta12',cost:strategy.exacta,hit:a===winner&&b===second,returned:a===winner&&b===second?official.exactaPay*strategy.exacta/official.exactaBase:0});
   wagers.push({type:'exacta21',cost:strategy.exacta,hit:b===winner&&a===second,returned:b===winner&&a===second?official.exactaPay*strategy.exacta/official.exactaBase:0});
  }
  for(const w of wagers)w.returned=cents(w.returned);
  const stake=cents(wagers.reduce((s,w)=>s+w.cost,0)),returned=cents(wagers.reduce((s,w)=>s+w.returned,0));
  return {...base,included:true,stake,returned,net:cents(returned-stake),roi:100*(returned/stake-1),exactaHit:!!strategy.exacta&&((a===winner&&b===second)||(b===winner&&a===second)),wagers};
 });
}
function totals(wagers){
 const stake=cents(wagers.reduce((s,w)=>s+w.cost,0)),returned=cents(wagers.reduce((s,w)=>s+w.returned,0));
 return {winning:wagers.filter(w=>w.hit).length,bets:wagers.length,hitRate:wagers.length?100*wagers.filter(w=>w.hit).length/wagers.length:null,stake,returned,net:cents(returned-stake),roi:stake?100*(returned/stake-1):null};
}
export function summarizeHistorical(rows){
 const ids=[...new Set(rows.map(r=>r.model))];
 return ids.map(id=>{
  const all=rows.filter(r=>r.model===id),included=all.filter(r=>r.included),wagers=included.flatMap(r=>r.wagers);
  return {id,label:all[0].label,races:included.length,excluded:all.length-included.length,...totals(wagers),winners:included.filter(r=>r.firstChoiceWinner).length,winnerTopFour:included.filter(r=>r.winnerTopFour).length,orderedTopTwo:included.filter(r=>r.orderedTopTwo).length,companionWhenWinner:included.some(r=>r.firstChoiceWinner)?100*included.filter(r=>r.orderedTopTwo).length/included.filter(r=>r.firstChoiceWinner).length:null,reverseTopTwo:included.filter(r=>r.reverseTopTwo).length,exactSecond:included.filter(r=>r.exactSecond).length,runnerUpTopTwo:included.filter(r=>r.topTwoRunnerUp).length,runnerUpTopFour:included.filter(r=>r.topFourRunnerUp).length,exactaHits:included.filter(r=>r.exactaHit).length,byWager:Object.fromEntries(['win','place','exacta12','exacta21'].map(type=>[type,totals(wagers.filter(w=>w.type===type))]))};
 });
}
export function evaluateHistoricalCard(snapshot,officials,strategyId){
 const rows=[],pending=[];
 for(const r of snapshot.races){
  const o=officials[String(r.race.number)];
  if(!o){pending.push({race:r.race.number,reason:'Official result not yet entered'});continue;}
  try{rows.push(...evaluateHistoricalRace(r,o,strategyId));}catch(e){pending.push({race:r.race.number,reason:e.message});}
 }
 return {rows,pending,summary:summarizeHistorical(rows),rrRecoverySummary:summarizeRRRecovery(rows),research:summarizeHistoricalResearch(snapshot,rows,pending)};
}

export function summarizeRRRecovery(rows){
 const rr=rows.filter(r=>r.model==='brisResearch'&&r.included);
 return ['STANDARD','RECOVERED','UNKNOWN'].map(status=>{const group=rr.filter(r=>(['STANDARD','RECOVERED'].includes(r.recovery_status)?r.recovery_status:'UNKNOWN')===status);return {status,races:group.length,...totals(group.flatMap(r=>r.wagers)),winners:group.filter(r=>r.firstChoiceWinner).length,exactaHits:group.filter(r=>r.exactaHit).length};});
}

export function summarizeHistoricalResearch(snapshot,rows,pending){
 return snapshot.races.map(r=>{const results=rows.filter(x=>Number(x.race)===Number(r.race.number)),issue=pending.find(x=>Number(x.race)===Number(r.race.number)),fts=r.fts_research??null,starters=fts===null?null:r.field.filter(h=>Object.prototype.hasOwnProperty.call(fts,name(h))),first=results[0];return {race:r.race.number,pending:issue?.reason??null,eligibleModels:results.filter(x=>x.included).map(x=>x.label),excludedModels:results.filter(x=>!x.included).map(x=>({label:x.label,reason:x.reason,ftsUnranked:starters===null?null:x.eligibility.unrated.filter(h=>starters.some(s=>p(s)===p(h))).map(h=>p(h))})),ftsCount:starters?.length??null,fts:starters?.map(h=>({n:p(h),name:h.name,research:fts[name(h)],finish:first?(p(h)===first.actualWinner?1:p(h)===first.actualSecond?2:null):null}))??null};});
}
