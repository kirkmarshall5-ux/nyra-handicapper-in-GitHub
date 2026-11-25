import {MODEL} from './contender-model.js';
const MONTHS={'â':1,'á':2,'à':3,'ß':4,'Ü':5,'Þ':6,'Û':7,'Ý':8,'æ':9,'å':10,'ä':11,'ã':12};
const FR={'Â':1/16,'±':1/8,'²':1/4,'°':1/8,'ô':1/2,'¶':3/16,'ó':5/16};
const clean=s=>String(s||'').replace(/\s/g,'');
const median=a=>{const b=[...a].sort((x,y)=>x-y);return b.length%2?b[(b.length-1)/2]:(b[b.length/2-1]+b[b.length/2])/2};
function priorDate(token,today){const m=String(token||'').match(/^(\d{1,2})(.)(\d{2})=/);if(!m||!MONTHS[m[2]])return null;const d=new Date(Date.UTC(2000+ +m[3],MONTHS[m[2]]-1,+m[1]));return d.getUTCDate()===+m[1]&&d.getUTCMonth()+1===MONTHS[m[2]]&&d.toISOString().slice(0,10)<today?d:null;}
function distance(token,unit){const m=String(token).match(/^(\d+)([Â±²°ô¶ó])?$/);return m?(+m[1]+(FR[m[2]]||0))*(/^mile/i.test(unit)?8:1):null;}
function todayDistance(header){const line=String(header||'').split('\n').find(l=>/\b(?:MILES?|Furlongs)\b/i.test(l)&&!/^\s*(if|alternate)/i.test(l))||'';const m=line.match(/\b(\d+[Â±²°ô¶ó]?)\s+(MILES?|Furlongs)/i);return m?distance(m[1],m[2]):null;}
// Extra source evidence is isolated from every existing V4.4c input.
export function extractContenderEvidence(header,text,proofs){
 const pp=text.split('WORKS:')[0].split('TRAINER:')[0],dates=[...pp.matchAll(/\b\d{1,2}[^\s\d=]{1,4}\d{2}=\s*\d+\s*[A-Za-z.]+/g)];
 const lines=dates.map((d,i)=>({running_date_track:d[0],source_line:pp.slice(d.index,dates[i+1]?.index??pp.length).replace(/\s+/g,' ')}));
 const evidence=proofs.map(e=>{const rows=lines.filter(l=>clean(l.running_date_track)===clean(e.running_date_track));return {...e,source_line:rows.length===1?rows[0].source_line:e.source_line};});
 const boxes={};for(const k of ['D.Fst','Turf','Synth','Dst']){const m=header.match(new RegExp('\\b'+k.replace('.','\\.')+'([êÑúü]?)(?:\\(\\d+\\))?\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)'));if(m)boxes[k]={starts:+m[2],wins:+m[3],seconds:+m[4],thirds:+m[5],source_text:m[0]};}
 const records={};for(const [kind,rx] of [['jockey',/([A-Z][A-Z .'-]{1,35})\s*\((\d+)\s+(\d+)\s+\d+\s+\d+\s+\.\d+\)\s*20\d{2}:\s*\((\d+)\s+(\d+)\s+\.\d+\)/],['trainer',/Tr:\s*([^()]+?)\s*\((\d+)\s+(\d+)\s+\d+\s+\d+\s+\.\d+\)\s*20\d{2}:\s*\((\d+)\s+(\d+)\s+\.\d+\)/]]){const m=header.match(rx);if(m)records[kind]={local:{starts:+m[2],wins:+m[3],status:'SOURCE_COUNTS_VERIFIED'},annual:{starts:+m[4],wins:+m[5],status:'SOURCE_COUNTS_VERIFIED'}};}
 return {version:1,beyer_evidence:evidence,switch_evidence:{running_lines:lines,boxes},connection_records:records,source_context:{workout_source_text:text.includes('WORKS:')?text.split('WORKS:')[1].split('TRAINER:')[0]:''}};
}
function validBox(b){return !!b&&Number.isInteger(b.starts)&&b.starts>=3&&['wins','seconds','thirds'].every(k=>Number.isInteger(b[k])&&b[k]>=0)&&b.wins+b.seconds+b.thirds<=b.starts;}
function record(h,kind){let r=h.connection_records?.[kind];if(!r)r={local:h.source_context?.[kind]};for(const scope of ['annual','local']){const c=r?.[scope];if(c?.status==='SOURCE_COUNTS_VERIFIED'&&Number.isInteger(c.starts)&&c.starts>=25&&Number.isInteger(c.wins)&&c.wins>=0&&c.wins<=c.starts)return 100*(c.wins+2)/(c.starts+20);}return null;}
function workoutRows(raw,today){const out=[],rx=/([âáàßÜÞÛÝæåäã])(\d{1,2})\s+([A-Za-z.]+(?:\s+tr\.t)?)\s+([3-8])f\s+(?:fst|fm|gd|sly|my)\s+(?:\d:|:)[\d¦¨©ª«¬®¥§ôõö.]+\s+[BH](?:g)?\s+(\d+)\/(\d+)/g;for(const m of String(raw||'').matchAll(rx)){let d=new Date(Date.UTC(+today.slice(0,4),MONTHS[m[1]]-1,+m[2]));if(d.getUTCDate()!==+m[2]||d.getUTCMonth()+1!==MONTHS[m[1]])continue;if(d.toISOString().slice(0,10)>today)d.setUTCFullYear(d.getUTCFullYear()-1);const rank=+m[5],total=+m[6];if(rank>=1&&rank<=total)out.push({age:(Date.parse(today)-+d)/86400000,rank,total});}return out;}
export function contenderFeatures(original,r){
 const h=original.contender_evidence?{...original,...original.contender_evidence}:original;
 const today=r.date,surface=r.conditions?.surface||r.surface,dist=todayDistance(r.header),f=h.beyer_figures||[],proof=h.beyer_evidence||[],lines=h.switch_evidence?.running_lines||[],n=Math.min(5,h.life_starts||0);
 const complete=n>0&&lines.length>=n&&proof.length>=n&&f.length>=n&&lines.slice(0,n).every((l,i)=>clean(l.running_date_track)===clean(proof[i].running_date_track)&&proof[i].figure===f[i]);
 const profiles=[];for(const e of proof.slice(0,5)){const d=priorDate(e.running_date_track,today),m=String(e.source_line||'').match(/=\s*\d+\s*[A-Za-z.]+\s+(?:fst|fm|gd|sly|my|yl|sf|hy|wf)\s+([\dÂ±²°ô¶ó]+)(f)?\s*([êÑúü]?)/);if(d&&m)profiles.push({age:(Date.parse(today)-+d)/86400000,surface:/[êÑ]/.test(m[3])?'Turf':/[úü]/.test(m[3])?'Synth':'Dirt',distance:distance(m[1],m[2]?'f':'mile'),figure:e.figure});}
 const matched=profiles.filter(p=>p.surface===surface&&p.age<=365),md=matched.filter(p=>dist!==null&&p.distance!==null&&Math.abs(p.distance-dist)<=.5);
 const avg=a=>a.length?a.reduce((s,p)=>s+p.figure*2**(-p.age/90),0)/a.reduce((s,p)=>s+2**(-p.age/90),0):null;
 const weights=[.50,.25,.15,.07,.03],latest=f.length?f[0]:null,recent=f.length&&complete?f.slice(0,5).reduce((s,v,i)=>s+v*weights[i],0)/weights.slice(0,Math.min(5,f.length)).reduce((a,b)=>a+b,0):latest;
 const b=h.switch_evidence?.boxes||{},sb=b[surface==='Turf'?'Turf':surface==='Dirt'?'D.Fst':'Synth'];let db=b.Dst;
 const matches=!!db&&(surface==='Turf'?/[êÑ]/.test(db.source_text):surface==='Synth'?/[úü]/.test(db.source_text):!/[êÑúü]/.test(db.source_text));
 const s=validBox(sb)?sb:null,d=matches&&validBox(db)?db:null,place=d||s;
 const early=h.timeform_early??null,late=h.timeform_late??null,allEarly=r.field.map(q=>q.timeform_early).filter(v=>v!=null),pressure=Math.max(0,allEarly.filter(v=>v>=95).length-1)/Math.max(1,allEarly.length-1);
 const works=workoutRows(h.source_context?.workout_source_text,today),recentWorks=works.filter(w=>w.age<=30),last=proof.length&&lines.length&&clean(lines[0].running_date_track)===clean(proof[0].running_date_track)?priorDate(proof[0].running_date_track,today):null;
 const trips=(h.trip_context||[]).filter(t=>t.status==='SOURCE_COMMENT_ROW_VERIFIED'),trip=trips.find(t=>proof.length&&clean(t.date_track)===clean(proof[0].running_date_track));
 const opp=(h.prior_opposition_records||[]).filter(v=>v.prior_date<today&&v.status==='PRE_RACE_FIELD_PROXY_PRIOR_DATE_VERIFIED').map(v=>v.rival_median_latest_beyer);
 const raw=[latest,recent,f.length?Math.max(...f.slice(0,3)):null,avg(matched),avg(md),matched.filter(p=>p.age<=90).length?Math.max(...matched.filter(p=>p.age<=90).map(p=>p.figure)):null,early,late,early!=null&&late!=null?(late-early)*pressure:null,s?(s.wins+1)/(s.starts+10):null,d?(d.wins+1)/(d.starts+10):null,place?(place.seconds+.5*place.thirds+1)/(place.starts+5):null,record(h,'jockey'),record(h,'trainer'),last?Math.min(365,(Date.parse(today)-+last)/86400000):null,works.length?recentWorks.length:null,recentWorks.length?Math.max(...recentWorks.map(w=>1-(w.rank-1)/Math.max(1,w.total-1))):null,trip?Number(!!trip.flags?.length):null,opp.length?median(opp):null];
 let slope=null;if(complete&&md.length>=3){const y=md.map(p=>p.figure).reverse(),xmean=(y.length-1)/2,ymean=y.reduce((a,b)=>a+b,0)/y.length;slope=y.reduce((s,v,i)=>s+(i-xmean)*(v-ymean),0)/y.reduce((s,_,i)=>s+(i-xmean)**2,0);}
 return {raw,slope,complete,comparable_starts:md.length};
}
function percentile(v,observed){if(v===null||observed.length<=1||new Set(observed).size===1)return 0;return 2*(observed.filter(q=>q<v).length+.5*(observed.filter(q=>q===v).length-1))/(observed.length-1)-1;}
export function rankContenders(race,baseline,{displayPass=false}={}){
 if(baseline.decision==='PASS'&&!displayPass)return {decision:'PASS',rankings:[],reason:'Full-field evidence incomplete',model_id:MODEL.model_id};
 const rated=new Set((baseline.runners||[]).filter(h=>Number.isFinite(h.base_rating)&&!h.unrated_reason&&!(h.parser_blockers||[]).length).map(h=>h.name));
 const field=race.horses.filter(h=>h.odds!=='SCR'&&(!h.entry_status||h.entry_status==='REGULAR')&&(!displayPass||rated.has(h.name)));
 if(!field.length)return {decision:baseline.decision,rankings:[],provisional:displayPass,reason:'No horses have enough verified evidence for a numerical rating.',model_id:MODEL.model_id};
 if(!field.every(h=>h.contender_evidence||h.switch_evidence))return {decision:'HOLD',rankings:[],reason:'Re-upload the source PP to populate Contender evidence.',model_id:MODEL.model_id};
 const r={...race,field},es=field.map(h=>contenderFeatures(h,r)),observed=MODEL.features.map((_,j)=>es.map(e=>e.raw[j]).filter(v=>v!==null)),slopes=es.map(e=>e.slope).filter(v=>v!==null);
 const rankings=field.map((h,i)=>{const base=es[i].raw.reduce((s,v,j)=>s+percentile(v,observed[j])*MODEL.contender.coefficients[j],0),adj=.10*percentile(es[i].slope,slopes);return {n:h.n,name:h.name,score:base+adj,base_contender_score:base,matched_beyer_trend:{score_adjustment:adj,status:es[i].slope!==null?'VERIFIED':'UNKNOWN'}};}).sort((a,b)=>b.score-a.score||(a.name<b.name?-1:a.name>b.name?1:0));
 return {decision:displayPass?'PASS':'RATEABLE',rankings,provisional:displayPass,model_id:MODEL.model_id};
}
