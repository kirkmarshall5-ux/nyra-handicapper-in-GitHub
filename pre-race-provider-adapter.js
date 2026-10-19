// Adapts exactly the current Race Day models; no scoring formula is changed.
import {rankBrisnetModels} from './brisnet-models.js';
import {releaseRace} from './rankings-release.js';
import {rankContenders} from './contender-rankings.js';
import {rankFinishers} from './finisher-inputs.js';
import {cardProvider} from './dual-pp-cards.js';
const eligible=h=>h.n&&h.odds!=='SCR'&&h.included_in_frozen_field!==false&&(!h.entry_status||h.entry_status==='REGULAR');
function convert(family,result,field,provider){
 if(!result?.model_id||!Array.isArray(result.rankings))throw Error(family+' model unavailable');
 const status=family==='FINISHER'?(result.status==='COMPLETE_FIELD'?'RATEABLE':result.status==='HOLD'?'HOLD':'PASS'):result.decision;
 if(!['RATEABLE','PASS','HOLD'].includes(status))throw Error(family+' decision unavailable');
 const rankings=result.rankings.map(h=>({program:String(h.n),horse:h.name,score:family==='V44C'?(h.v44c_unrounded_score??h.base_rating??h.score):h.score}));
 const fullFieldRanked=status==='RATEABLE'&&rankings.length===field.length;
 return {family,modelId:result.model_id,decision:status,fullFieldRanked,rankings,reason:result.reason||null,provider};
}
export function displayedProviderModels(card,race){
 const provider=cardProvider(card);
 const field=(race.horses||[]).filter(eligible).map(h=>({program:String(h.n),horse:h.name}));
 if(!field.length)throw Error('No eligible runners');
 if(provider==='BRISNET'){
  const native=rankBrisnetModels(race);
  if(!native?.v44c||!native?.contender)throw Error('Native Brisnet models unavailable');
  const finisher=rankFinishers(race);
  return {provider,field,models:[convert('V44C',native.v44c,field,provider),convert('FINISHER',finisher,field,provider),convert('CONTENDER',native.contender,field,provider)]};
 }
 const v44c=releaseRace(race);
 const contender=rankContenders(race,v44c,{displayPass:v44c.decision==='PASS'});
 const finisher=rankFinishers(race);
 return {provider,field,models:[convert('V44C',v44c,field,provider),convert('FINISHER',finisher,field,provider),convert('CONTENDER',contender,field,provider)]};
}
