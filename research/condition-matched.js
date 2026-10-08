import {rateResearchRace} from '../data-corrected-research.js';
import {adjustment,pythonRound} from '../scoring-engine.js';
export const MODEL_ID='V44C-condition-matched-research-v1';
export function distanceFurlongs(raw){
 const s=String(raw||'').trim().replace(/^About\s+/i,'').replace(/^Í/,'');
 if(/^1¬¥(?:\s|$)/.test(s))return 8+70/220;
 const m=s.match(/^(\d+)([ôÂ°±²´]?)(?:\s*(?:f|Furlongs?|MILES?)\b)?/i);
 if(!m)return null;
 const suffix={ '':0,'ô':.5,'Â':1/16,'°':1/8,'±':3/16,'²':1/4,'´':3/8 }[m[2]];
 if(!/^(\d+)([ôÂ°±²´]?)(?:\s*(?:f|Furlongs?|MILES?)\b)?(?:\s|$)/i.test(s))return null;
 const n=Number(m[1])+suffix;
 return /(?:f|Furlong)/i.test(s)?n:n*8;
}
export function pastCondition(e){
 const m=String(e?.source_line||'').match(/=\s*\d+\s*[A-Za-z.]+?\s*(fst|fm|gd|my|sly|sy|sf|hy|yl|sft|wf)(?:ø)?\s+Í?(\d+(?:[ôÂ°±²´]|¬¥)?(?:f)?)\s+([^\s]+)/);
 if(!m)return null;
 const furlongs=distanceFurlongs(m[2]); if(furlongs==null)return null;
 const surface=/[êÑ]/.test(m[3])?'Turf':/ú/.test(m[3])?'Synthetic':/^(fm|sf|hy|yl|sft)$/.test(m[1])?null:'Dirt';
 return surface?{surface,furlongs,route:furlongs>=8}:null;
}
export function mapHorse(h,target){
 const evidence=h.beyer_evidence||[],figs=h.beyer_figures||h.figs||[],flags=[];
 const rows=evidence.map((e,i)=>({index:i,figure:e.figure,...pastCondition(e)}));
 if(evidence.length<Math.min(3,figs.length)||evidence.some((e,i)=>e.figure!==figs[i]))return {flags:['FIGURE_CONDITION_ALIGNMENT_UNVERIFIED'],blocked:true};
 const window=rows.slice(0,3);
 if(window.some(r=>!r.surface))return {flags:['PAST_CONDITION_UNVERIFIED'],blocked:true};
 const same=window.filter(r=>r.surface===target.surface);
 const relevant=same.filter(r=>r.route===target.route&&Math.abs(r.furlongs-target.furlongs)<=1);
 const selected=relevant.length?relevant:same;
 if(target.surface==='Dirt'&&target.route&&!rows.some(r=>r.surface==='Dirt'&&r.route))flags.push('NO_DOCUMENTED_DIRT_ROUTE_IN_AVAILABLE_HISTORY');
 if(!relevant.length)flags.push('NO_RELEVANT_FIGURE_IN_LATEST_THREE');
 if(!selected.length)return {flags:[...flags,'NO_SAME_SURFACE_FIGURE_IN_LATEST_THREE'],blocked:true};
 if(!relevant.length)flags.push('SAME_SURFACE_DISTANCE_FALLBACK');
 if(window.some(r=>r.surface!==target.surface))flags.push('MIXED_SURFACE_RECENT_HISTORY');
 return {flags,blocked:false,selected,horse:{...h,life_starts:h.life_starts??h.lifeStarts,beyer_figures:selected.map(r=>r.figure),beyer_evidence:selected.map(r=>evidence[r.index])}};
}
export function conditionRace(race){
 const furlongs=distanceFurlongs(race.dist),surface=race.surface;
 if(furlongs==null||!['Dirt','Turf','Synthetic'].includes(surface))return {model_id:MODEL_ID,decision:'PASS',rankings:[],flags:['TARGET_CONDITION_UNVERIFIED'],bettingEnabled:false};
 const target={surface,furlongs,route:furlongs>=8},field=race.horses.filter(h=>h.odds!=='SCR'&&(!h.entry_status||h.entry_status==='REGULAR'));
 const maps=field.map(h=>({name:h.name,...mapHorse(h,target)}));
 if(maps.some(m=>m.blocked))return {model_id:MODEL_ID,decision:'PASS',rankings:[],mapping:maps,target,bettingEnabled:false};
 const out=rateResearchRace(maps.map(m=>m.horse),{raceBlockers:race.parser_blockers||[]});
 if(out.decision==='RATEABLE'){
  // Recompute bonuses from condition-selected histories; never infer improvement from mixed surfaces.
  for(const h of out.runners){const m=maps.find(m=>m.name===h.name),a=adjustment(h,out.runners);
   if(m.flags.includes('SAME_SURFACE_DISTANCE_FALLBACK'))a.signals=a.signals.filter(([key])=>key!=='lightly-raced-upside');
   h.v44c_signals=a.signals;h.v44c_adjustment=Math.max(-6,Math.min(6,a.signals.reduce((s,[,v])=>s+v,0)));
   h.v44c_unrounded_score=h.base_rating+h.v44c_adjustment;h.v44c_display_score=pythonRound(h.v44c_unrounded_score);h.condition_flags=m.flags;
  }
  out.rankings=[...out.runners].sort((a,b)=>b.v44c_unrounded_score-a.v44c_unrounded_score||a.name.localeCompare(b.name));out.rankings.forEach((h,i)=>h.v44c_rank=i+1);
 }
 return {...out,model_id:MODEL_ID,research_only:true,target,mapping:maps,bettingEnabled:false,probabilityCalibrated:false};
}
