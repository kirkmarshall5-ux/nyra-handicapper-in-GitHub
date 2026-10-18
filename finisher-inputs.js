import {FINISHER_SPEC,rankFinisherFeatures} from './finisher-model.js';
import {contenderFeatures} from './contender-rankings.js';
import {releaseRace} from './rankings-release.js';
import {correctedMatchedSpeed} from './finisher-drf-distance.js?v=20261018-5316';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const active=h=>h.odds!=='SCR'&&h.included_in_frozen_field!==false&&(!h.entry_status||h.entry_status==='REGULAR');
const dateOK=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
const category=d=>finite(d)?d>=8?'route':'sprint':null;
export function finisherInputs(race){
 const field=(race.horses||[]).filter(active),providers=new Set(field.map(h=>h.ratings?.provider==='BRISNET'?'BRISNET':'DRF'));
 const hold=reason=>field.map(h=>({n:h.n,name:h.name,blocker:reason}));
 if(!dateOK(race.date))return hold('Card date unverified');
 if(providers.size>1)return hold('Mixed figure providers in one field are unsupported');
 if(race.conditions?.unsupported||/hurdle|steeplechase|quarter horse|arabian/i.test([race.cls,race.header].join(' ')))return hold('Unsupported race type');
 if(providers.has('BRISNET')){
  if(!['Dirt','Turf','Synth'].includes(race.surface))return hold('Race surface unverified');
  if((race.parser_blockers||[]).some(b=>(typeof b==='string'?b:b.reason)!=='BRISNET_SOURCE_MODEL_VALIDATION_PENDING'))return hold('Card source verification pending');
  return field.map(h=>{
   const base={n:h.n,name:h.name,source:'BRISNET'};
   if((h.parser_blockers||[]).some(b=>(typeof b==='string'?b:b.reason)!=='BRISNET_SPEED_NOT_BEYER'))return {...base,blocker:'Runner source verification pending'};
   if(!Number.isInteger(h.life_starts)||h.life_starts<0)return {...base,blocker:'Career starts unverified'};
   if(h.life_starts===0)return {...base,blocker:'First-time starter: no measured race speed'};
   const all=h.ratings.lines||[],rows=all.slice(0,FINISHER_SPEC.recent_window);
   if(all.length>h.life_starts)return {...base,blocker:'Running lines exceed verified career starts'};
   if(rows.some((l,i)=>!dateOK(l.date)||l.date>=race.date||i>0&&l.date>=rows[i-1].date||l.source?.provider!=='BRISNET'||!l.source?.text||['speed','e1','e2','late'].some(k=>l[k]!=null&&!finite(l[k]))))return {...base,blocker:'Used historical source sequence or numbers unverified'};
   if(!finite(rows[0]?.speed))return {...base,blocker:'Latest start has no verified Speed'};
   // Keep actual-start positions; missing figures do not pull an older start forward.
   const available=rows.map((l,i)=>({l,w:FINISHER_SPEC.recent_weights[i]})).filter(x=>finite(x.l.speed));
   const recent_speed=available.reduce((s,x)=>s+x.l.speed*x.w,0)/available.reduce((s,x)=>s+x.w,0);
   const matched=rows.filter(l=>{const age=(Date.parse(race.date)-Date.parse(l.date))/86400000;return age<=FINISHER_SPEC.history_days&&l.surface===race.surface&&category(l.furlongs)===category(race.distance_furlongs)&&category(l.furlongs)!==null&&finite(race.distance_furlongs)&&Math.abs(l.furlongs-race.distance_furlongs)<=FINISHER_SPEC.distance_tolerance_furlongs;});
   const speeds=matched.filter(l=>finite(l.speed)),weight=l=>2**(-((Date.parse(race.date)-Date.parse(l.date))/86400000)/FINISHER_SPEC.matched_decay_half_life_days);
   return {...base,recent_speed,matched_speed:speeds.length?speeds.reduce((s,l)=>s+l.speed*weight(l),0)/speeds.reduce((s,l)=>s+weight(l),0):null,late_pace:matched.find(l=>finite(l.late))?.late??null};
  });
 }
 const baseline=releaseRace(race),verified=new Set((baseline.runners||[]).filter(h=>finite(h.base_rating)&&!h.unrated_reason&&!(h.parser_blockers||[]).length).map(h=>h.name));
 if((race.parser_blockers||[]).length)return hold('Card source verification pending');
 return field.map(h=>{
  const base={n:h.n,name:h.name,source:'DRF'};
  if(!verified.has(h.name))return {...base,blocker:'Recent speed / career evidence unverified or first-time starter'};
  const e=contenderFeatures(h,{...race,field});
  const source=h.contender_evidence?{...h,...h.contender_evidence}:h;
  const matched=correctedMatchedSpeed({header:race.header,surface:race.conditions?.surface||race.surface,date:race.date,proofs:source.beyer_evidence||[]});
  return {...base,recent_speed:e.raw[1],matched_speed:matched.value,late_pace:e.raw[7]};
 });
}
export function rankFinishers(race){return rankFinisherFeatures(finisherInputs(race));}
