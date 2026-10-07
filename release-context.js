const months={'â':1,'á':2,'à':3,'ß':4,'Ü':5,'Þ':6,'Û':7,'Ý':8,'æ':9,'å':10,'ä':11,'ã':12};
export function figureContext(p,today){
 const m=(p.running_date_track||'').match(/^(\d{1,2})(.)(\d{2})=/);if(!m||!months[m[2]])return null;const d=new Date(Date.UTC(2000+ +m[3],months[m[2]]-1,+m[1]));if(d.getUTCMonth()+1!==months[m[2]]||d.getUTCDate()!==+m[1]||d.toISOString().slice(0,10)>=today)return null;
 const tail=(p.source_line||'').split(p.running_date_track)[1]||'',q=tail.trim().match(/^(fst|fm|gd|sly|my|yl|sf|hy)(?:ø)?\s+Í?(\d[^\s]*)/);if(!q)return null;
 const anchor=tail.search(new RegExp('\\b'+p.figure+'\\s+'+p.post+'\\s*/\\s*'+p.field_size+'\\b')),head=anchor>=0?tail.slice(0,anchor):'';if(!head)return null;const surface=/[úü]/.test(head)?'Synthetic':/[êÑ]/.test(head)||['fm','yl','sf','hy'].includes(q[1])?'Turf':['fst','gd','sly','my'].includes(q[1])?'Dirt':null;
 const category=/f/.test(q[2])?(parseInt(q[2],10)>=8?'route':'sprint'):/^[1234]/.test(q[2])?'route':null;
 const finishers=[...(p.source_line||'').matchAll(/[A-Za-z’'*.\-]+\d{2,3}[¦¨©ª«¬®¥§°±²³´µ¶·¸¹º¼½¾ôõöøÇÉóñ]+/g)];const last=finishers.at(-1),trip=finishers.length>=3?(p.source_line||'').slice(last.index+last[0].length).trim():null;
 return {date:d.toISOString().slice(0,10),surface,category,condition:q[1],distance_token:q[2],figure:p.figure,source_line:p.source_line,trip_text:trip,trip_status:trip?'PARSED_SOURCE_TEXT_IMPACT_UNVERIFIED':'UNKNOWN',figure_correction:null};
}
export function positionalStyle(h,today){
 const calls=(h.beyer_evidence||[]).filter(p=>figureContext(p,today)&&p.running_call_proxy?.status==='PDF_COLUMN_POSITION_PROXY').map(p=>({...p.running_call_proxy,date:figureContext(p,today).date}));const f=calls.filter(c=>c.position<=2).length;const v=calls.map(c=>c.position/c.field_size).sort((a,b)=>a-b),med=v.length?(v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2):null;
 return {style:calls.length<2?'UNKNOWN':f>=2?'FRONT_OR_PRESSER':med>=.6?'OFF_PACE':'MIDPACK',calls,status:'POSITION_PROXY_NOT_VALIDATED_STYLE',basis:'Second displayed call; distance into race varies',score_changed:false};
}
export function runnerContext(h,race){
 const figures=(h.beyer_evidence||[]).slice(0,3).map(p=>figureContext(p,race.date)).filter(Boolean),style=positionalStyle(h,race.date),latest=figures[0],days=latest?Math.round((Date.parse(race.date)-Date.parse(latest.date))/86400000):null;
 const text=race.dist||race.header||'',fur=text.match(/(\d+)[^\s]*\s+FURLONGS?/i),category=/\bMILES?\b/i.test(text)?'route':fur?(+fur[1]>=8?'route':'sprint'):null;
 return {style,figures,matching:figures.filter(f=>f.surface===race.surface&&category&&f.category===category).length,category,days_since_latest_figure:days,actual_layoff:null,gate:Number.isInteger(h.actual_post)&&h.actual_post_status==='SOURCE_VERIFIED'?h.actual_post:null,workouts:h.source_context?.workout_text||null,pedigree:h.source_context?.pedigree_text||null,prior_opposition:null,score_changed:false};
}
