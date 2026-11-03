// Read-only DRF scoring evidence adapter. Does not persist, freeze, or alter production.
import {MODEL} from './contender-model.js';
import {contenderFeatures,rankContenders} from './contender-rankings.js';
import {finisherInputs,rankFinishers} from './finisher-inputs.js';
import {releaseRace} from './rankings-release.js';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const active=h=>h.odds!=='SCR'&&h.included_in_frozen_field!==false&&(!h.entry_status||h.entry_status==='REGULAR');
export function exportDrfLabRace(race,{actual=[]}={}){
 if(!race?.horses?.length||!race.date||!race.track||!race.race)throw Error('Complete race identity and parsed runners required');
 const field=race.horses.filter(active);
 if(field.length<2)throw Error('At least two active runners required');
 if(field.some(h=>h.ratings?.provider==='BRISNET'))throw Error('DRF research export cannot contain Brisnet runners');
 const release=releaseRace(race);
 if(release.decision!=='RATEABLE')throw Error('Research export requires a fully rateable DRF field; PASS/HOLD excluded');
 const ranked=rankContenders(race,release);
 if(ranked.decision!=='RATEABLE'||ranked.rankings.length!==field.length)throw Error('DRF Contender baseline incomplete');
 const fin=rankFinishers(race),inputs=finisherInputs(race);
 if(fin.rankings.length!==field.length||inputs.some(h=>h.blocker||!finite(h.recent_speed)))throw Error('DRF Finisher baseline incomplete');
 const features=field.map(h=>contenderFeatures(h,{...race,field}));
 const observedSlopes=features.map(f=>f.slope).filter(finite);
 const center=(v,a)=>!finite(v)||a.length<2||new Set(a).size<2?0:2*(a.filter(x=>x<v).length+.5*(a.filter(x=>x===v).length-1))/(a.length-1)-1;
 const byProgram=new Map(ranked.rankings.map(h=>[String(h.n),h]));
 const finByProgram=new Map(inputs.map(h=>[String(h.n),h]));
 const runners=field.map((h,i)=>{
  const score=byProgram.get(String(h.n));
  if(!score||!features[i]||features[i].raw.length!==MODEL.features.length)throw Error('Missing model evidence for '+h.name);
  const trend=.10*center(features[i].slope,observedSlopes);
  if(Math.abs(trend-score.matched_beyer_trend.score_adjustment)>1e-10)throw Error('Trend parity failed for '+h.name);
  const f=finByProgram.get(String(h.n));
  if(!f)throw Error('Finisher input missing for '+h.name);
  return {program:String(h.n),name:h.name,contender:{raw:[...features[i].raw],trend_adjustment:trend},finisher:{recent_speed:f.recent_speed,matched_speed:f.matched_speed,late_pace:f.late_pace}};
 });
 const baseline=ranked.rankings.map(h=>({program:String(h.n),score:h.score}));
 return {id:[race.track,race.date,'R'+race.race].join('-'),contender_coefficients:[...MODEL.contender.coefficients],contender_baseline:baseline,actual:[...actual],runners,metadata:{source:'DRF',classification:'RESEARCH_ONLY',contender_model:MODEL.model_id,finisher_model:fin.model_id,card_date:race.date,track:race.track,race:race.race}};
}
export function exportDrfLabDataset(races){if(!Array.isArray(races)||!races.length)throw Error('Race array required');return {schema:'drf-research-lab-v1',races:races.map(r=>exportDrfLabRace(r))};}
