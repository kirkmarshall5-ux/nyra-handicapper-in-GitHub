// Native Brisnet research adapters. These do not modify or impersonate the
// locked Beyer/Timeform engines and never authorize probabilities or bets.
import {MODEL} from './contender-model.js';
export const BRISNET_MODEL_VERSION='20261021-input-v2';
export const BRISNET_MODEL_IDS=Object.freeze({v44c:'V44C-BRISNET-BASE-'+BRISNET_MODEL_VERSION,contender:'CONTENDER-BRISNET-'+BRISNET_MODEL_VERSION,mix1:'MIX1-BRISNET-'+BRISNET_MODEL_VERSION});
export const BRISNET_METHODS=Object.freeze({
 v44c:'V4.4c-Brisnet base · experimental: latest Brisnet Speed 40 weight points, best Speed among the latest three starts 22, verified jockey rate 7 and trainer rate 8. Local records require 25 starts; otherwise verified annual records require 25 starts. Connection percentages ×3, capped at 100. Missing components reweighted. Original Beyer-context adjustments and trainer angles are not applied.',
 contender:'Contender-Brisnet · experimental: retained Contender coefficients on field-relative native Speed, recent-five Speed, surface/distance Speed, matched Brisnet early/late pace, reliable connection records and layoff. Matched Speed trend uses at least three comparable starts. Unavailable career splits, pressure fit, workouts, trips and opposition are neutral; this is not the validated DRF model.',
 mix1:'MIX1-Brisnet · experimental: latest-two Brisnet Speed average 37%, best Speed from starts 3–5 12%, jockey 7%, trainer 17%, matched early pace 17%, matched surface/distance Speed 10%. Each input uses within-field percentiles; missing inputs reweighted. Original Beyer-context multiplier is not applied.',
 pace:'Pace: latest available E1 for sprints or E2 for routes, and LP separately, from the latest five actual starts within 365 days, same surface, same sprint/route category and within 0.5 furlong. No unmatched fallback. First-time starters remain unrated.'
});
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const avg=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const maximum=a=>a.length?Math.max(...a):null;
const category=d=>finite(d)?d>=8?'route':'sprint':null;
const active=h=>h.odds!=='SCR'&&h.included_in_frozen_field!==false&&(!h.entry_status||h.entry_status==='REGULAR');
export function isBrisnetRace(r){return r?.ratings_provider==='BRISNET'||/^BRISNET_/.test(r?.source_format||'')||!!r?.horses?.length&&r.horses.every(h=>h.ratings?.provider==='BRISNET');}
function validDate(d){return typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;}
function percent(v,a){if(!finite(v))return null;if(a.length<=1||new Set(a).size===1)return 50;return 100*(a.filter(x=>x<v).length+.5*(a.filter(x=>x===v).length-1))/(a.length-1);}
function centered(v,a){const p=percent(v,a);return p===null?0:p/50-1;}
export function brisnetConnectionRecord(h,kind){
 const c=h.source_context?.[kind];
 for(const [scope,r] of [['local',c],['annual',c?.annual]]){
  if(r?.status==='SOURCE_COUNTS_VERIFIED'&&Number.isInteger(r.starts)&&Number.isInteger(r.wins)&&r.starts>=25&&r.wins>=0&&r.wins<=r.starts)return {scope,starts:r.starts,wins:r.wins,year:r.year??null,value:Math.min(100,300*r.wins/r.starts)};
 }
 return {scope:null,starts:null,wins:null,value:null,reason:'No verified local or annual record with at least 25 starts'};
}
function connection(h,kind,reliable=false){
 if(!reliable)return brisnetConnectionRecord(h,kind).value;
 const c=h.source_context?.[kind];
 for(const r of reliable?[c?.annual,c]:[c]){
  if(r?.status!=='SOURCE_COUNTS_VERIFIED'||!Number.isInteger(r.starts)||!Number.isInteger(r.wins)||r.starts<1||r.wins<0||r.wins>r.starts||reliable&&r.starts<25)continue;
  return reliable?100*(r.wins+2)/(r.starts+20):Math.min(100,300*r.wins/r.starts);
 }
 return null;
}
function weighted(rows,weights){const valid=rows.map((l,i)=>({l,w:weights[i]})).filter(x=>finite(x.l.speed));if(!valid.length)return null;return valid.reduce((s,x)=>s+x.l.speed*x.w,0)/valid.reduce((s,x)=>s+x.w,0);}
function decayed(rows){if(!rows.length)return null;const ws=rows.map(l=>2**(-l.age/90));return rows.reduce((s,l,i)=>s+l.speed*ws[i],0)/ws.reduce((a,b)=>a+b,0);}
function features(h,r){
 if((h.parser_blockers||[]).some(b=>(typeof b==='string'?b:b.reason)!=='BRISNET_SPEED_NOT_BEYER'))return {reason:'Runner source verification pending'};
 if(h.ratings?.provider!=='BRISNET')return {reason:'Brisnet source identity unavailable'};
 if(!Number.isInteger(h.life_starts)||h.life_starts<0)return {reason:'Career starts unverified'};
 if(h.life_starts===0)return {reason:'First-time starter: no measured Speed or pace history'};
 const source=h.ratings.lines||[];
 if(source.length>h.life_starts)return {reason:'Running lines exceed verified career starts'};
 // Identify the exact rejected running line without relaxing source-validation gates.
 for(let i=0;i<source.length;i++){
  const l=source[i],tag='Historical line '+(i+1)+' ('+(l.date||'date unknown')+')';
  if(!validDate(l.date)||l.date>=r.date)return {reason:tag+': date invalid or not before card date'};
  if(i>0&&l.date>=source[i-1].date)return {reason:tag+': running lines not in descending date order'};
  if(l.source?.provider!=='BRISNET'||!l.source?.text)return {reason:tag+': Brisnet provenance missing'};
  for(const k of ['speed','e1','e2','late'])if(l[k]!=null&&(!finite(l[k])||l[k]<0))return {reason:tag+': invalid '+k+' rating ('+String(l[k])+'); inspect PDF column mapping'};
 }
 const rows=source.slice(0,5).map(l=>({...l,age:(Date.parse(r.date)-Date.parse(l.date))/86400000}));
 // Keep actual-start positions: missing Speed never shifts the recent/older windows.
 const figs=rows.map(l=>l.speed),latest=finite(figs[0])?figs[0]:null;
 if(latest===null)return {reason:'Latest start has no verified Brisnet Speed'};
 const surface=rows.filter(l=>l.age<=365&&l.surface===r.surface);
 const matched=surface.filter(l=>category(l.furlongs)===category(r.distance_furlongs)&&category(l.furlongs)!==null&&finite(r.distance_furlongs)&&Math.abs(l.furlongs-r.distance_furlongs)<=.5);
 const speedMatched=matched.filter(l=>finite(l.speed));
 const paceKey=category(r.distance_furlongs)==='route'?'e2':'e1';
 const earlyLine=matched.find(l=>finite(l[paceKey])),lateLine=matched.find(l=>finite(l.late));
 const early=earlyLine?.[paceKey]??null,late=lateLine?.late??null;
 const recent=figs.slice(0,2).filter(finite),older=figs.slice(2,5).filter(finite);
 const comparable=rows.filter(l=>category(l.furlongs)===category(r.distance_furlongs)&&l.surface===r.surface&&l.age<=365&&finite(l.furlongs)&&finite(r.distance_furlongs)&&Math.abs(l.furlongs-r.distance_furlongs)<=.5&&finite(l.speed));
 let slope=null;if(comparable.length>=3){const y=comparable.map(l=>l.speed).reverse(),xm=(y.length-1)/2,ym=avg(y);slope=y.reduce((s,v,i)=>s+(i-xm)*(v-ym),0)/y.reduce((s,_,i)=>s+(i-xm)**2,0);}
 const jockey=connection(h,'jockey'),trainer=connection(h,'trainer');
 const raw=[latest,weighted(rows,[.50,.25,.15,.07,.03]),maximum(figs.slice(0,3).filter(finite)),decayed(surface.filter(l=>finite(l.speed))),decayed(speedMatched),maximum(surface.filter(l=>l.age<=90&&finite(l.speed)).map(l=>l.speed)),early,late,null,null,null,null,connection(h,'jockey',true),connection(h,'trainer',true),Math.min(365,rows[0].age),null,null,null,null];
 return {h,raw,slope,base:{latest,best3:maximum(figs.slice(0,3).filter(finite)),jockey,trainer},mix:{recent:avg(recent),older:maximum(older),jockey,trainer,early,surfaceDistance:speedMatched.length>=2?avg(speedMatched.slice(0,3).map(l=>l.speed)):null},evidence:{provider:'BRISNET',connections:{jockey:brisnetConnectionRecord(h,'jockey'),trainer:brisnetConnectionRecord(h,'trainer')},latest_speed:latest,latest_date:rows[0].date,pace_call:paceKey.toUpperCase(),early,late,early_date:earlyLine?.date??null,late_date:lateLine?.date??null,comparable_starts:comparable.length,speed_history:figs,source_pages:[...new Set(rows.map(l=>l.source.page))]}};
}
function weightedParts(raw,weights,scaled=false,observed={}){
 const values=Object.fromEntries(Object.entries(raw).filter(([,v])=>finite(v)).map(([k,v])=>[k,scaled?percent(v,observed[k]):v]));
 const total=Object.keys(values).reduce((s,k)=>s+weights[k],0);
 return {score:Object.entries(values).reduce((s,[k,v])=>s+v*weights[k],0)/total,raw_features:raw,component_scores:values,available_weight:total,effective_weights:Object.fromEntries(Object.keys(values).map(k=>[k,weights[k]/total]))};
}
export function rankBrisnetModels(race){
 if(!isBrisnetRace(race))return null;
 const field=(race.horses||[]).filter(active),seen=new Set(),programs=new Set();let error=!validDate(race.date)?'Card date unverified':null;
 for(const h of field){if(!h.n||!h.name||seen.has(h.name)||programs.has(String(h.n)))error='Runner identities must be unique';seen.add(h.name);programs.add(String(h.n));}
 if(race.conditions?.unsupported||/hurdle|steeplechase/i.test([race.cls,race.surface,race.header].join(' ')))error='Unsupported race type';
 if((race.parser_blockers||[]).some(b=>(typeof b==='string'?b:b.reason)!=='BRISNET_SOURCE_MODEL_VALIDATION_PENDING'))error='Card source verification pending; review or re-upload source';
 const candidates=error?[]:field.map(h=>features(h,race));
 const good=candidates.filter(x=>!x.reason),unrated=field.flatMap((h,i)=>error||candidates[i]?.reason?[{n:h.n,name:h.name,reasons:[error||candidates[i].reason]}]:[]);
 const baseWeights={latest:40,best3:22,jockey:7,trainer:8},mixWeights={recent:37,older:12,jockey:7,trainer:17,early:17,surfaceDistance:10};
 const obs=MODEL.features.map((_,j)=>good.map(f=>f.raw[j]).filter(finite)),slopes=good.map(f=>f.slope).filter(finite),mixObs=Object.fromEntries(Object.keys(mixWeights).map(k=>[k,good.map(f=>f.mix[k]).filter(finite)]));
 const finish=(model,rows)=>{
  rows.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));rows.forEach((h,i)=>{h.rank=i+1;h.v44c_rank=i+1;h.v44c_unrounded_score=h.score;h.v44c_display_score=Math.round(h.score*10)/10;h.v44c_signals=[];});
  return {model_id:BRISNET_MODEL_IDS[model],provider:'BRISNET',research_only:true,provisional:true,decision:'PASS',ranking_status:rows.length?(unrated.length?'PARTIAL_RESEARCH_RANKING':'RESEARCH_RANKING'):'UNRATED',rankings:rows,runners:rows,unrated,eligible_count:field.length,rated_count:rows.length,complete_inputs:model==='mix1'?rows.filter(h=>h.available_weight===100).length:null,pass_reasons:[{reason:'Brisnet experimental scoring: validation pending; no wager'}],reason:'Experimental native Brisnet ranking; first-time starters and runners without verified Speed remain unranked.',probabilityCalibrated:false,bettingEnabled:false,method:BRISNET_METHODS[model]};
 };
 const row=f=>({n:f.h.n,name:f.h.name,evidence:f.evidence});
 return {
  v44c:finish('v44c',good.map(f=>({...row(f),...weightedParts(f.base,baseWeights)}))),
  contender:finish('contender',good.map(f=>{const contributions=f.raw.map((v,j)=>centered(v,obs[j])*MODEL.contender.coefficients[j]),trend=.1*centered(f.slope,slopes);return {...row(f),score:contributions.reduce((a,b)=>a+b,0)+trend,raw_features:f.raw,feature_contributions:contributions,trend_adjustment:trend};})),
  mix1:finish('mix1',good.map(f=>({...row(f),...weightedParts(f.mix,mixWeights,true,mixObs)})))
 };
}
