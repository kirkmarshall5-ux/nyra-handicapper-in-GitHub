import {rankBrisnetModels} from './brisnet-models.js';
import {rankBrisnetPace,PACE_PROFILES} from './brisnet-pace-candidate.js';
export const VERSION='V44C-PACE-BRISNET-v1';
export const VARIANTS=Object.freeze(['CONTROL','PACE','LP_TIER_B','STYLE_PRESSURE','TURN','COMBINED']);
export const PROFILES=PACE_PROFILES;
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const active=h=>h.odds!=='SCR'&&h.included_in_frozen_field!==false&&(!h.entry_status||h.entry_status==='REGULAR');
const pct=(v,a)=>a.length<2||new Set(a).size===1?50:100*(a.filter(x=>x<v).length+.5*(a.filter(x=>x===v).length-1))/(a.length-1);
const sort=rows=>rows.sort((a,b)=>b.score-a.score||b.base_score-a.base_score||a.name.localeCompare(b.name));
function latestLP(h,r,width){return (h.ratings?.lines||[]).slice(0,5).find(l=>l.source?.provider==='BRISNET'&&!!l.source.text&&finite(l.late)&&l.late>=0&&l.date<r.date&&(Date.parse(r.date)-Date.parse(l.date))/864e5<=365&&l.surface===r.surface&&finite(l.furlongs)&&(l.furlongs>=8)===(r.distance_furlongs>=8)&&Math.abs(l.furlongs-r.distance_furlongs)<=width);}
export function rankV44Pace(race,{variant='PACE'}={}){
 if(!VARIANTS.includes(variant))throw Error('Unknown V4.4c-Pace arm');
 const meta={model_id:VERSION+':'+variant,variant,display_name:'V4.4c-Pace',decision:'PASS',research_only:true,bettingEnabled:false,probabilityCalibrated:false,probabilities:null,status:'HOLD',rankings:[]};
 const hold=(reason,extra={})=>({...meta,reason,...extra});
 const foundation=rankBrisnetPace(race,{variant:'CONDITION'});
 if(foundation.status==='HOLD')return hold(foundation.reason,{context:foundation.context});
 race={...race,surface:foundation.context.surface,distance_furlongs:foundation.context.furlongs};
 const parent=rankBrisnetModels(race)?.v44c,field=race.horses.filter(active);
 if(!parent||parent.unrated.length||parent.rankings.length!==field.length||field.length<2)return hold('Complete source-validated native field required; FTS/partial fields remain held',{context:foundation.context});
 if(variant==='CONTROL')return {...meta,status:'RESEARCH_RANKED',rankings:structuredClone(parent.rankings),context:foundation.context,control_model_id:parent.model_id,reason:'Exact unchanged native V4.4c-Brisnet scores/order'};
 let rows=structuredClone(foundation.rankings),selections={};
 if(variant==='LP_TIER_B'){
  for(const h of field){const line=latestLP(h,race,.5)||latestLP(h,race,1);selections[String(h.n)]=line?{value:line.late,date:line.date,page:line.source.page,furlongs:line.furlongs,tier:Math.abs(line.furlongs-race.distance_furlongs)<=.5?'A':'B'}:null;}
  if(rows.some(h=>!selections[h.n]))return hold('Tier A/1f Tier B LP missing in complete field',{selections});
  const observed=rows.map(h=>selections[h.n].value);
  rows=rows.map(h=>{const lp=selections[h.n];h.raw_pace.late=lp.value;h.pace_percentiles.late=pct(lp.value,observed);h.evidence.late={...lp,rank:1+observed.filter(v=>v>lp.value).length};h.pace_score=Object.entries(foundation.profile).reduce((s,[k,w])=>s+w*h.pace_percentiles[k],0);h.score=.75*h.base_percentile+.25*h.pace_score;return h;});
 }
 if(rows.some(h=>['e1','e2','late'].some(k=>!finite(h.raw_pace[k]))))return hold('Complete matched E1/E2/LP required; no neutral imputation in this comparison',{context:foundation.context});
 const useTurn=variant==='TURN'||variant==='COMBINED',usePressure=variant==='STYLE_PRESSURE'||variant==='COMBINED';
 if(useTurn&&rows.some(h=>!finite(h.raw_pace.turn)))return hold('Verified same-line turn index required for every runner');
 if(useTurn)rows=rows.map(h=>{h.pace_score=.9*h.pace_score+.1*h.pace_percentiles.turn;h.score=.75*h.base_percentile+.25*h.pace_score;return h;});
 let pressure={status:'NOT_USED',triggered:false,competitive_E_programs:[]};
 if(usePressure){
  if(foundation.context.surface!=='Dirt')return hold('Style/pressure scoring initially specified for Dirt only; turf pressure remains a separate hypothesis');
  if(rows.some(h=>!['E','E/P','P','S'].includes(h.source_style)))return hold('Complete printed styles required for pressure scoring');
  const key=foundation.context.category==='route'?'e2':'e1',highest=Math.max(...rows.map(h=>h.raw_pace[key]));
  const e=rows.filter(h=>h.source_style==='E'&&h.raw_pace[key]>=highest-5),triggered=e.length>=2;
  pressure={status:'RESEARCH_RULE',triggered,call:key,competitive_E_programs:e.map(h=>h.n),maximum_adjustment:5,rule:'At least two printed E runners within five points of field-highest matched early call; non-trigger does not establish no pressure'};
  rows=rows.map(h=>{const delta=triggered?5*(h.pace_percentiles.late/50-1):0;return {...h,score:h.score+delta,pressure_adjustment:delta};});
 }
 rows=sort(rows);rows.forEach((h,i)=>h.rank=i+1);
 return {...meta,status:'RESEARCH_RANKED',rankings:rows,context:foundation.context,control_model_id:parent.model_id,blend:{base:.75,pace:.25},profile:foundation.profile,turn_share_of_pace:useTurn?.1:0,turn_share_of_final:useTurn?.025:0,pressure,selections:variant==='LP_TIER_B'?selections:null,lineage:'PACE is mathematically identical to BRIS-PACE-CONTEXT-v1 CONDITION on the same complete source; it is not independent new evidence.',reason:'Untrained research weights. All nonpace inputs fixed. Styles operate only through pressure; S style alone has no bonus. Score is not a probability.'};
}
