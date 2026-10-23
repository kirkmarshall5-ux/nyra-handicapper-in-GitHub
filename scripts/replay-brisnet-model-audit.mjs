// Usage: node scripts/replay-brisnet-model-audit.mjs /path/to/BRISNET_MODEL_INPUT_AUDIT.json
// Read-only: replays all production model heads from the user-exported saved card.
// Historical export may predate current code. Differences are reported, not silently accepted.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {brisnetRaceModelAudit} from '../brisnet-model-audit.js';
import {rankBrisnetModels} from '../brisnet-models.js';
import {rankFinisherFeatures} from '../finisher-model.js';
import {finisherInputs} from '../finisher-inputs.js';
const file=process.argv[2];
if(!file){console.error('Usage: node scripts/replay-brisnet-model-audit.mjs <saved-model-input-audit.json>');process.exit(2);}
const data=JSON.parse(readFileSync(file,'utf8'));
if(!Array.isArray(data.races)||!data.races.length||!data.source_sha256)throw Error('Expected exported Brisnet model-input audit with source hash and races');
const asRace=a=>({race:a.race,date:a.date,surface:a.surface,distance_furlongs:a.distance_furlongs,conditions:a.conditions,parser_blockers:a.parser_blockers,ratings_provider:'BRISNET',horses:a.runners.map(h=>({
 n:String(h.program),name:h.name,odds:h.odds,entry_status:h.entry_status,
 included_in_frozen_field:h.included_in_frozen_field,life_starts:h.life_starts,
 parser_blockers:h.parser_blockers,source_context:h.source_context,
 ratings:{provider:'BRISNET',lines:h.history.map(l=>({date:l.date,surface:l.surface,furlongs:l.furlongs,speed:l.speed,e1:l.e1,e2:l.e2,late:l.late,source:{provider:'BRISNET',page:l.source_page,text:l.source_text}}))}
 }))});
const report={schema:'nyra-brisnet-full-card-live-module-replay-v1',source_sha256:data.source_sha256,card_id:data.card_id,source_exported_at_utc:data.exported_at_utc,
 notice:'Read-only post-hoc model replay; not an independent pre-race freeze, official starter check, ROI or betting authorization',
 races:[],failures:[]};
for(const saved of data.races){
 const race=asRace(saved),before=JSON.stringify(race),audit=brisnetRaceModelAudit(race),direct=rankBrisnetModels(race);
 const outputs={...direct,finisher:{...rankFinisherFeatures(finisherInputs(race)),decision:'PASS'}};
 const entry={race:saved.race,models:{},source_unchanged:before===JSON.stringify(race)};
 if(!entry.source_unchanged)report.failures.push('Race '+saved.race+': source mutated');
 for(const id of ['v44c','contender','mix1','finisher']){
  const model=audit.models[id],current=outputs[id],prior=saved.models?.[id];
  const actual=model.rankings.map(h=>({program:String(h.program),name:h.name,rank:h.rank,score:h.score}));
  const directRanks=current.rankings.map(h=>({program:String(h.n),name:h.name,rank:h.rank,score:h.score}));
  const live_parity=JSON.stringify(actual)===JSON.stringify(directRanks);
  const priorRanks=(prior?.rankings||[]).map(h=>({program:String(h.program??h.n),name:h.name,rank:h.rank,score:h.score}));
  const priorMap=new Map(priorRanks.map(h=>[h.program,h]));
  const differences=actual.filter(h=>{const p=priorMap.get(h.program);return !p||p.rank!==h.rank||Math.abs(p.score-h.score)>1e-9;});
  const safeguards=model.bettingEnabled===false&&model.probabilityCalibrated===false&&model.decision==='PASS';
  if(!live_parity||!safeguards)report.failures.push('Race '+saved.race+' '+id+': live parity or safeguard failure');
  entry.models[id]={model_id:model.model_id,live_parity,safeguards,ranked:actual.length,prior_ranked:priorRanks.length,changed_horses:differences.length,first_choice:actual[0]?.program??null,prior_first_choice:priorRanks[0]?.program??null,rankings:actual};
 }
 report.races.push(entry);
}
report.summary={races:report.races.length,model_races:report.races.length*4,failures:report.failures.length,pass:report.failures.length===0};
process.stdout.write(JSON.stringify(report,null,2)+'\n');
if(report.failures.length)process.exitCode=1;
