// Adapts exactly the current Race Day models; no scoring formula is changed.
import {rankBrisnetModels} from './brisnet-models.js';
import {releaseRace} from './rankings-release.js';
import {passRaceDisplay} from './pass-race-display.js';
import {rankContenders} from './contender-rankings.js';
import {rankFinishers} from './finisher-inputs.js';
import {cardProvider} from './dual-pp-cards.js';
const eligible=h=>h.n&&h.odds!=='SCR'&&h.included_in_frozen_field!==false&&(!h.entry_status||h.entry_status==='REGULAR');
export function convertDisplayedModel(family,result,field,provider,{baselineDecision=null}={}){
 if(!result?.model_id||!Array.isArray(result.rankings))throw Error(family+' model unavailable');
 const status=family==='FINISHER'?(result.status==='HOLD'?'HOLD':provider==='BRISNET'||baselineDecision==='PASS'||result.status!=='COMPLETE_FIELD'?'PASS':'RATEABLE'):result.decision;
 if(!['RATEABLE','PASS','HOLD'].includes(status))throw Error(family+' decision unavailable');
 const rankings=result.rankings.map(h=>({program:String(h.n),horse:h.name,score:family==='V44C'?(h.v44c_unrounded_score??h.base_rating??h.score):h.score}));
 const eligible=new Map(field.map(h=>[String(h.program),h.horse]));
 const seen=new Set();
 for(const row of rankings){
  if(!eligible.has(row.program)||eligible.get(row.program)!==row.horse||seen.has(row.program)||!Number.isFinite(row.score))throw Error(family+' ranking differs from displayed eligible field or lacks verified score');
  seen.add(row.program);
 }
 if(status==='RATEABLE'&&rankings.length!==field.length)throw Error(family+' incomplete RATEABLE panel');
 const fullFieldRanked=status==='RATEABLE'&&rankings.length===field.length;
 return {family,modelId:result.model_id,decision:status,fullFieldRanked,rankings,reason:result.reason||null,provider};
}
// Separate rated-but-not-displayed runners from genuinely unrated runners.
// DRF PASS displays only the top four provisional rows even when more have scores.
const reasonText=value=>typeof value==='string'?value:value?.reason||value?.message||'Unspecified missing evidence';
const evidenceList=value=>Array.isArray(value)?value:value==null?[]:[value];
export function runnerRatingCoverage(race,field,models,provider,{baseline=null,native=null}={}){
 const byProgram=new Map((race.horses||[]).map(h=>[String(h.n),h]));
 const v44c=models.find(m=>m.family==='V44C');
 const displayed=new Set(v44c?.rankings.map(h=>h.program)||[]);
 const sourceRunners=new Map((provider==='DRF'?(baseline?.runners||[]):[]).map(h=>[String(h.n),h]));
 const nativeUnrated=new Map((native?.v44c?.unrated||[]).map(h=>[String(h.n),h]));
 const ratedNotDisplayed=[],unratedRunners=[];
 for(const h of field){
  if(displayed.has(h.program))continue;
  const original=byProgram.get(h.program)||{};
  const source=sourceRunners.get(h.program)||{};
  const hasVerifiedRating=provider==='DRF'&&typeof source.base_rating==='number'&&Number.isFinite(source.base_rating)&&!evidenceList(source.parser_blockers).length;
  if(hasVerifiedRating){
   ratedNotDisplayed.push({program:h.program,horse:h.horse,reason:'Rated runner omitted from top-four provisional display'});
   continue;
  }
  const nativeMissing=nativeUnrated.get(h.program)||{};
  const evidence=Object.keys(source).length?source:nativeMissing;
  const reasons=[...evidenceList(evidence.unrated_reason),...evidenceList(evidence.parser_blockers),...evidenceList(evidence.reasons),...evidenceList(original.parser_blockers)].map(reasonText).filter(Boolean);
  const starts=original.life_starts??original.lifeStarts??null;
  if(!reasons.length&&starts===0)reasons.push('First-time starter; no prior race performance');
  if(!reasons.length)reasons.push('No verified numerical rating; inspect source PP');
  unratedRunners.push({program:h.program,horse:h.horse,reasons:[...new Set(reasons)],firstTimeStarter:starts===0,classification:reasons.length===1&&reasons[0]==='No verified numerical rating; inspect source PP'?'UNDETERMINED':'SOURCE_EVIDENCE'});
 }
 return {ratedNotDisplayed,unratedRunners};
}
export function unratedRunnerEvidence(race,field,models,provider,context={}){
 return runnerRatingCoverage(race,field,models,provider,context).unratedRunners;
}
export function displayedProviderModels(card,race){
 const provider=cardProvider(card);
 const field=(race.horses||[]).filter(eligible).map(h=>({program:String(h.n),horse:h.name}));
 if(!field.length)throw Error('No eligible runners');
 if(provider==='BRISNET'){
  const native=rankBrisnetModels(race);
  if(!native?.v44c||!native?.contender)throw Error('Native Brisnet models unavailable');
  const finisher=rankFinishers(race);
  const models=[convertDisplayedModel('V44C',native.v44c,field,provider),convertDisplayedModel('FINISHER',finisher,field,provider,{baselineDecision:native.v44c.decision}),convertDisplayedModel('CONTENDER',native.contender,field,provider)];
  return {provider,field,models,...runnerRatingCoverage(race,field,models,provider,{native})};
 }
 const v44c=releaseRace(race);
 // Race Day intentionally displays provisional rated runners for DRF PASS races.
 // Preserve exactly those scored rows, without upgrading PASS to RATEABLE.
 const displayedV44c=v44c.decision==='PASS'?{...v44c,rankings:passRaceDisplay(v44c).ranked.map(h=>({...h,score:h.score}))}:v44c;
 const contender=rankContenders(race,v44c,{displayPass:v44c.decision==='PASS'});
 const finisher=rankFinishers(race);
 const models=[convertDisplayedModel('V44C',displayedV44c,field,provider),convertDisplayedModel('FINISHER',finisher,field,provider,{baselineDecision:v44c.decision}),convertDisplayedModel('CONTENDER',contender,field,provider)];
 return {provider,field,models,...runnerRatingCoverage(race,field,models,provider,{baseline:v44c})};
}
