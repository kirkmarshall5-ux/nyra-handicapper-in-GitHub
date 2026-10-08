import {raceConditions,conditionBlockers} from './race-conditions.js';
import {ppContext,datedWorkoutText} from './pp-context.js?v=20261007-context1';
import {parseAnnualJockey} from './jockey-research.js?v=20261006-j1preview1';
import {pythonRound} from './scoring-engine.js';
import {MODEL_ID} from './data-corrected-research.js';
// Preserve the PDF text stream and explicit font boundaries. Sorting a multi-column
// PP into whole-page visual rows would mix unrelated runners' evidence.
export function restoredPage(items,pageNumber,fontNames={}){
 const lines=[];let row=[];
 const flush=()=>{if(row.length){let text='',proofs=[];for(let i=0;i<row.length;i++){const a=row[i],next=row.slice(i+1).find(x=>x.str.trim());text+=a.str;const post=next?.str.match(/^\s*(\d{1,2})\s*\/\s*(\d{1,2})(?=\s|$)/);if(/^\d{1,3}$/.test(a.str.trim())&&/Bold/i.test(fontNames[a.fontName]||a.fontName||'')&&post&&+post[1]>=1&&+post[1]<=+post[2]&&+post[2]<=30){proofs.push({figure:+a.str,post:+post[1],field_size:+post[2],font:fontNames[a.fontName]||a.fontName,page:pageNumber});text+=' '}}
 lines.push({text,page:pageNumber,proofs});row=[]}};
 for(const a of items){if(a.str){if(row.length&&Math.abs(a.transform[5]-row.at(-1).transform[5])>3)flush();row.push(a)}if(a.hasEOL)flush()}flush();return {pageNumber,lines};
}
const runDate=/\b\d{1,2}[^\s\d=]{1,4}\d{2}=\s*\d+\s*[A-Za-z.]+/g;
const clean=s=>s.replace(/\s+/g,' ').trim();
function horseEvidence(lines,roster){
 const text=lines.map(l=>l.text).join('\n'),flat=clean(text),end=text.indexOf('WORKS:'),pp=end>=0?text.slice(0,end):text.split('TRAINER:')[0],dates=[...pp.matchAll(runDate)],head=clean(pp.slice(0,dates[0]?.index??pp.length)),blockers=[],figs=[],evidence=[];let offset=0;const proofs=[];
 for(const l of lines){for(const p of l.proofs)proofs.push({...p,offset,source_line:l.text});offset+=l.text.length+1}const consumed=new Set();
 for(let i=0;i<dates.length;i++){const a=dates[i].index,b=dates[i+1]?.index??pp.length,ps=proofs.map((p,j)=>({p,j})).filter(({p})=>p.offset>=a&&p.offset<b);if(ps.length>1){blockers.push('multiple-beyer-columns-in-one-running-line');continue}if(ps.length){const {p,j}=ps[0];consumed.add(j);if(!Number.isFinite(p.figure)||p.figure<0){blockers.push('invalid-beyer-evidence');continue}figs.push(p.figure);evidence.push({...p,running_date_track:dates[i][0]})}}
 if(proofs.some((p,j)=>p.offset<pp.length&&!consumed.has(j)))blockers.push('beyer-column-without-verified-running-date');
 const life=[...head.matchAll(/\bLife\s+(\d+)\b/g)],starts=life.length===1?+life[0][1]:null;if(starts===null)blockers.push('career-record-not-uniquely-anchored');
 const tf=head.match(/TimeformUS\s+Pace:\s*Early\s+(\d+)\s+Late\s+(\d+)/),j=head.match(/\b([A-Z][A-Z .'-]{1,35})\s*\((\d+)\s+(\d+)\s+\d+\s+\d+\s+\.\d+\)\s*20\d{2}:/),t=head.match(/\bTr:\s*([^()]{2,55}?)\s*\((\d+)\s+(\d+)\s+\d+\s+\d+\s+\.\d+\)\s*20\d{2}:/);
 const trainerAngles=flat.includes('TRAINER:')?flat.split('TRAINER:')[1]:'',rates=[...trainerAngles.matchAll(/\(\d+\s+\.?(\d{2})\s+\$[\d.]+\)/g)].map(x=>+x[1]).filter(x=>x<=60),context=rates.length?Math.min(100,Math.max(25,pythonRound(rates.reduce((a,b)=>a+b,0)/rates.length*3))):null;
 return {...roster,source_context:ppContext(head,text),jockey_annual_header:head.split('Tr:',1)[0],life_starts:starts,lifeStarts:starts,beyer_figures:figs.slice(0,5),figs:figs.slice(0,5),beyer_evidence:evidence.slice(0,5),available_beyer_rows:figs.length,timeform_early:tf?+tf[1]:null,timeform_late:tf?+tf[2]:null,tfEarly:tf?+tf[1]:'',tfLate:tf?+tf[2]:'',j:j?.[1].trim()||'',t:t?.[1].trim()||'',jockey_local_counts:j?{starts:+j[2],wins:+j[3]}:null,trainer_local_counts:t?{starts:+t[2],wins:+t[3]}:null,jockey_win:j&&+j[2]>0?100*+j[3]/+j[2]:null,trainer_win:t&&+t[2]>0?100*+t[3]/+t[2]:null,trainer_context_score:context,trainerAngles,parser_blockers:[...new Set(blockers)].sort(),last:figs[0]??'',best:figs.length?Math.max(...figs.slice(0,3)):'',style:tf?(+tf[1]>=105?'E':+tf[1]>=90?'EP':+tf[2]>=85?'S':'P'):'P',odds:'—',ml:roster.ml||'—'};
}
export function parseRestoredCard(pages,{sourceName='document'}={}){
 const races={},all=pages.flatMap(p=>p.lines),raceLines={};
 for(const p of pages){const footer=p.lines.map(l=>l.text).join('\n').match(/(Sar|Aqu|Bel|BAQ|Med|CD|Kee|FL), race (\d+), page:/i);if(!footer)throw new Error('Race footer unverified on page '+p.pageNumber);(raceLines[+footer[2]]??=[]).push(...p.lines)}
 for(const [rn,ls] of Object.entries(raceLines)){
  const anchors=[];let status='REGULAR';
  for(let i=0;i<ls.length;i++){const s=ls[i].text;if(/^\s*Entered For Main Track Only\s*$/i.test(s))status='MTO';else if(/^\s*Also[- ]Eligible:?\s*$/i.test(s))status='AE';if(/^Own:/.test(s)){const name=ls[i-1]?.text.trim().replace(/\s*\([^)]*\)$/,'');if(!name)throw new Error('Owner identity missing');let start=i-1,n='',ml='';const prior=ls.slice(Math.max(0,i-4),i-1).map(l=>l.text.trim());const program=prior.findIndex(s=>/^\d{1,2}[ABX]?$/.test(s));if(program>=0){n=prior[program];start=Math.max(0,i-4)+program;const odds=prior.slice(program+1).find(s=>/^\d+\s*(?:-\s*\d+|\/\s*\d+)$/.test(s));if(odds)ml=odds.replace(/\s+/g,'').replace('-','/')}anchors.push({start,own:i,name,status,n,ml})}}
  if(!anchors.length)throw new Error('No owner-anchored runners in race '+rn);
  const before=ls.slice(0,anchors[0].start).map(l=>l.text).join('\n'),headers=[...before.matchAll(new RegExp('(?:^|\\n)'+rn+'\\s*\\n(?:Saratoga|Aqueduct|Belmont Park|Belmont at the Big A|Meadowlands|Churchill Downs|Keeneland|Finger Lakes)\\b[^\\n]*\\n','g'))],header=headers.length?before.slice(headers.at(-1).index):before,blockers=[];
  if(!headers.length)blockers.push({reason:'race-heading-unverified'});const conditions=raceConditions(header);blockers.push(...conditionBlockers(conditions));
  const horses=anchors.map((a,i)=>horseEvidence(ls.slice(a.start,anchors[i+1]?.start??ls.length),{name:a.name,n:a.n,ml:a.ml,entry_status:a.status,included_in_frozen_field:a.status==='REGULAR'}));
  if(new Set(horses.map(h=>h.name)).size!==horses.length)throw new Error('Duplicate horse identity in race '+rn);
  races[rn]={race:+rn,horses,parser_blockers:blockers,surface:conditions.surface,conditions,header,cls:clean(header.split('\n').slice(0,5).join(' ')),oddsMode:'Unknown',dist:header.match(/\n([^\n]*?(?:Furlongs?|MILES?|Miles?))/)?.[1]?.trim()||'',post:header.match(/Post time:\s*([^\n]*?)(?= Wagers:|$|\n)/)?.[1]?.trim()||''};
 }
 const text=all.map(l=>l.text).join('\n'),footers=[...text.matchAll(/Daily Racing Form\s+(Saratoga|Aqueduct|Belmont Park|Belmont at the Big A|Meadowlands|Churchill Downs|Keeneland|Finger Lakes)\s*\(\s*(\d{1,2})\/\s*(\d{1,2})\/\s*(20\d{2})\s*\)/g)];
 if(!footers.length)throw new Error('Current card date/track footer unverified');
 const identities=new Set(footers.map(m=>`${m[1]}|${m[4]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`));if(identities.size!==1)throw new Error('Conflicting card dates/tracks across PDF pages');const [track,date]=[...identities][0].split('|');
 const [year,month,day]=date.split('-').map(Number),verifiedDate=new Date(Date.UTC(year,month-1,day));if(verifiedDate.getUTCFullYear()!==year||verifiedDate.getUTCMonth()+1!==month||verifiedDate.getUTCDate()!==day)throw new Error('Invalid card date');
 for(const r of Object.values(races)){r.date=date;r.track=track;for(const h of r.horses){h.jockey_annual=parseAnnualJockey(h.jockey_annual_header,year);h.source_context.workout_text=datedWorkoutText(h.source_context.workout_text,date);delete h.jockey_annual_header}}
 return {id:`data-corrected:${track}:${date}`,schemaVersion:3,model_id:MODEL_ID,track,date,races,sourceName,warnings:[],parser_version:'V44C-data-corrected-font-verified-v1'};
}
