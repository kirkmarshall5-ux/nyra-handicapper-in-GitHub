#!/usr/bin/env node
// Research-only: validate a newly parsed DRF export against an original frozen snapshot.
// Usage: node scripts/verify-drf-replay.mjs fresh-export.json original-freeze.json [report.json]
import {readFileSync,writeFileSync} from 'node:fs';
import {compareDrfReplayWithFreeze} from '../drf-research-freeze-parity.js';
const [exportPath,freezePath,reportPath]=process.argv.slice(2);
if(!exportPath||!freezePath){console.error('Usage: node scripts/verify-drf-replay.mjs fresh-export.json original-freeze.json [report.json]');process.exitCode=2;}
else {
 let report;
 try{
  const dataset=JSON.parse(readFileSync(exportPath,'utf8'));
  const freeze=JSON.parse(readFileSync(freezePath,'utf8'));
  const excluded=(dataset.excluded||[]).map(x=>String(x.race));
  if(dataset.source_name&&freeze.races?.some(r=>r.dashboard?.source_cards?.DRF?.source_name!==dataset.source_name))throw Error('Original DRF source filename differs from fresh replay');
  const result=compareDrfReplayWithFreeze(dataset,freeze);
  const completeFrozen=freeze.races.filter(r=>['drfContender','drfFinisher'].every(id=>{const m=r.dashboard?.models?.find(x=>x.id===id);return m?.complete===true&&m.decision!=='PASS'&&m.rankings?.length===r.dashboard?.field?.length}));
  const completeIds=new Set(completeFrozen.map(r=>String(r.race)));
  const replayIds=new Set(dataset.races.map(r=>String(r.metadata?.race)));
  if(completeIds.size!==replayIds.size||[...completeIds].some(id=>!replayIds.has(id)))throw Error('Replay does not cover every complete frozen race; expected '+[...completeIds].join(','));
  if(excluded.some(id=>completeIds.has(id)))throw Error('Complete frozen race improperly excluded');
  report={...result,source_name:dataset.source_name||null,excluded,expected_complete_races:[...completeIds],certification:'SCORE_REPLAY_ONLY_NOT_TIMESTAMP_CERTIFIED'};
  console.log(JSON.stringify(report,null,2));
 }catch(err){report={status:'BLOCKED',error:String(err?.message||err),certification:'NOT_CERTIFIED'};console.error(JSON.stringify(report,null,2));process.exitCode=1;}
 if(reportPath)writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
}
