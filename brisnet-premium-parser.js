// Separate modern Premium Plus adapter. Brisnet figures never become Beyer/Timeform.
import {reconstructPage,fingerprintPages} from './card-loader.js';
import {brisnetDistance} from './brisnet-card-parser.js?v=20261018-distance4';
import {premiumHistoryConditions} from './brisnet-premium-conditions.js';
export const PREMIUM_PARSER_ID='BRISNET-PREMIUM-PLUS-positioned-v2';
const clean=x=>String(x??'').replace(/\s+/g,' ').trim();
const months={January:1,February:2,March:3,April:4,May:5,June:6,July:7,August:8,September:9,October:10,November:11,December:12};
const short={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Jly:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
function iso(y,m,d){const v=new Date(Date.UTC(y,m-1,d));if(v.getUTCFullYear()!==y||v.getUTCMonth()!==m-1||v.getUTCDate()!==d)throw Error('Invalid Premium Plus calendar date');return v.toISOString().slice(0,10);}
function dateHeading(s){const m=s.match(/\b([A-Z][a-z]+)\s+(\d{1,2}),\s*(20\d{2})\b/);if(!m||!months[m[1]])throw Error('Premium Plus heading date unverified');return iso(+m[3],months[m[1]],+m[2]);}
function pastDate(s,today){const m=s.match(/^(\d{2})([A-Za-z]{3})(\d{2})([A-Za-z]+)/);if(!m||!short[m[2]])return null;const d=iso(+m[3]>=70?1900+ +m[3]:2000+ +m[3],short[m[2]],+m[1]);if(d>=today)throw Error('Premium Plus running line is not before card date');return {date:d,track:m[4]};}
function numeric(s){s=clean(s).replace(/\/$/,'');return /^[+-]?\d+$/.test(s)?+s:null;}
function connection(text,kind){
 const rx=kind==='trainer'?/Trnr:\s*(.*?)\s*\((\d+)\s+(\d+)-(\d+)-(\d+)\s+(\d+)%\)\s*(?:(20\d{2})\s*:\s*\((\d+)\/\s*(\d+)\s+(\d+)%\))?/:/^([A-Z][A-Z ,.'’-]+)\s*\((\d+)\s+(\d+)-(\d+)-(\d+)\s+(\d+)%\)\s*(?:(20\d{2})\s*:\s*\((\d+)\/\s*(\d+)\s+(\d+)%\))?/m;
 const m=text.match(rx);if(!m)return null;const starts=+m[2],wins=+m[3],seconds=+m[4],thirds=+m[5];if(wins+seconds+thirds>starts)throw Error('Premium Plus connection counts conflict');
 const annual=m[7]?{year:+m[7],wins:+m[8],starts:+m[9],printed_win:+m[10],status:'SOURCE_COUNTS_VERIFIED'}:null;
 if(annual&&annual.wins>annual.starts)throw Error('Premium Plus annual counts conflict');
 return {name:clean(m[1]),starts,wins,seconds,thirds,win:starts?100*wins/starts:null,scope:'PP local record',status:'SOURCE_COUNTS_VERIFIED',annual};
}
function parsePace(row,heading,today){
 const d=pastDate(row.text,today);if(!d)return null;
 const labels=Object.fromEntries(heading.items.map(i=>[clean(i.str),i.x]));
 if(!['E1','E2/','LP','1c','2c'].every(k=>Number.isFinite(labels[k])))throw Error('Premium Plus pace heading incomplete');
 const spd=heading.items.find(i=>/^SPD(?:\s|$)/.test(i.str));if(!spd)throw Error('Premium Plus SPD anchor missing');
 const anchors=[labels.E1,labels['E2/'],labels.LP,labels['1c'],labels['2c'],spd.x];
 if(!anchors.every((x,i)=>i===0||x>anchors[i-1]))throw Error('Premium Plus pace columns conflict');
 // Premium Plus numbers are right-aligned. PDF.js may combine adjacent
 // columns into one text item (e.g. "103 105/"). Split only whitespace tokens,
 // retaining estimated ink positions; require each end to match a column.
 const gap=anchors[5]-anchors[4];
 const ends=[anchors[0]+6,anchors[1]+7.43,anchors[2]+6.11,anchors[3]+5.17,anchors[4]+6.44,spd.x+10.34];
 const keys=['e1','e2','late','shape1','shape2','speed'];const values={};const cells={};
 const buckets=keys.map(()=>[]);
 for(const item of row.items){
  if(item.x<ends[0]-20||item.x>ends[5]+2)continue;
  const pieces=[...item.str.matchAll(/\S+/g)];
  for(const match of pieces){
   const end=item.x+item.width*(match.index+match[0].length)/item.str.length;
   if(end>ends[5]+2)continue;
   const distances=ends.map(x=>Math.abs(x-end)),n=distances.indexOf(Math.min(...distances));
   if(distances[n]<=2)buckets[n].push({str:match[0],x:item.x,end});
   else if(/^[+-]?\d+\/?$/.test(match[0]))throw Error('Premium Plus numeric column position unresolved on page '+row.pageNumber);
  }
 }
 for(let n=0;n<keys.length;n++){
  const items=buckets[n],text=items.map(i=>i.str).join(' ');
  const value=items.length===1?numeric(text):null;
  if(value!==null&&n<3&&value<0)throw Error('Premium Plus negative pace figure');
  values[keys[n]]=value;cells[keys[n]]={text,x:items[0]?.x??null,status:value===null?'MISSING_OR_AMBIGUOUS':'POSITIONED_NUMBER_VERIFIED'};
 }
 // Some PDF text items begin in the date column and also contain distance/going.
 // Selecting by item start-x discarded those complete, readable condition tokens.
 const conditions=premiumHistoryConditions(row.text);
 const pp=row.items.find(i=>i.x>ends[5]&&i.x<ends[5]+gap&&/^\d+$/.test(i.str));
 return {...d,...values,...conditions,turn_time:values.e1!==null&&values.e2!==null?values.e2-values.e1:null,race_rating:null,class_rating:null,past_post:pp?+pp.str:null,status:values.e2!==null&&values.late!==null?'PACE_SOURCE_SEQUENCE_VERIFIED':'RATING_COLUMNS_UNRESOLVED',source:{provider:'BRISNET',page:row.pageNumber,y:row.y,text:row.text,cells}};
}
export function parsePremiumCard(input,{sourceName='Brisnet Premium Plus PDF'}={}){
 const pages=input.map(p=>{const r=reconstructPage(p.items,p.pageNumber,.65);const widths=new Map(p.items.map(q=>[clean(q.str)+'|'+q.transform[4].toFixed(2)+'|'+q.transform[5].toFixed(2),q.width]));for(const row of r.lines)for(const i of row.items)i.width=widths.get(i.str+'|'+i.x.toFixed(2)+'|'+i.y.toFixed(2))||0;return r;});
 const races={},excluded=[],issues=[];let track=null,date=null;
 for(const page of pages){
  const text=page.lines.map(l=>l.text).join('\n');
  const head=page.lines.find(l=>/Premium Plus PP'?s/i.test(l.text)&&/\bRace\s+\d+/.test(l.text));
  if(!head){if(/INDEX OF HORSES/.test(text)&&track&&!/\bLife:/.test(text)){excluded.push({page:page.pageNumber,reason:'Index and historical Scratch Watch; not current scratches'});continue;}throw Error('Premium Plus race heading missing on page '+page.pageNumber);}
  const ti=head.items.findIndex(i=>/Premium Plus PP'?s/i.test(i.str)),name=clean(head.items[ti+1]?.str),day=dateHeading(head.text),rn=+head.text.match(/\bRace\s+(\d+)/)[1];
  if(!/^[A-Za-z][A-Za-z .'-]+$/.test(name))throw Error('Premium Plus track heading unverified');
  if(track&&(name!==track||day!==date))throw Error('Mixed Premium Plus track/date');track=name;date=day;
  const distance=brisnetDistance(head.text);if(!distance)throw Error('Premium Plus primary distance unverified');
  const surface=/\([Tt]\)|\bTurf\b/.test(head.text)?'Turf':/All Weather|Synthetic|Tapeta/i.test(head.text)?'Synth':'Dirt';
  const r=races[rn]??={race:rn,track,date,header:head.text,dist:distance.display,distance_furlongs:distance.furlongs,surface,cls:head.items.slice(ti+2).map(i=>i.str).join(' '),conditions:{surface,primaryDistanceLine:distance.display,unsupported:false},post:'Unverified',oddsMode:'Morning line (pre-race)',horses:[],parser_blockers:['BRISNET_SOURCE_MODEL_VALIDATION_PENDING'],source_format:'BRISNET_PREMIUM_PLUS',ratings_provider:'BRISNET',source_pages:[],brisnet_pars:null};
  if(r.distance_furlongs!==distance.furlongs||r.surface!==surface)throw Error('Conflicting Premium Plus race conditions');r.source_pages.push(page.pageNumber);
  const post=page.lines.find(l=>/Post Time:/.test(l.text));if(post)r.post=post.text.replace(/^.*Post Time:\s*/,'')+' (printed zones; verify local time)';
  const par=page.lines.find(l=>/PARS:/.test(l.text));
  if(par){const m=par.text.match(/PARS:\s*(\d+)\s+(\d+)\/\s*(\d+)\s+(\d+)/);if(!m)throw Error('Premium Plus pars ambiguous');r.brisnet_pars={e1:+m[1],e2:+m[2],late:+m[3],speed:+m[4],source_page:page.pageNumber};}
  const starts=page.items.filter(i=>/^.+\((E\/P|E|P|S|NA)\s+[0-8]\)$/.test(clean(i.str))).sort((a,b)=>b.transform[5]-a.transform[5]);
  const lives=page.items.filter(i=>/\bLife:/.test(i.str));if(starts.length!==lives.length)throw Error('Premium Plus runner headers/career records do not reconcile');
  if(!starts.length)throw Error('Premium Plus race page has no verified runners');
  for(let n=0;n<starts.length;n++){
   const start=starts[n],y=start.transform[5],bottom=starts[n+1]?starts[n+1].transform[5]+5:20;
   const lines=page.lines.filter(l=>l.y<=y+4&&l.y>bottom),items=lines.flatMap(l=>l.items),block=lines.map(l=>l.text).join('\n');
   const nm=clean(start.str).match(/^(.*?)\s*\((E\/P|E|P|S|NA)\s+([0-8])\)$/);
   if(!nm[1]||nm[1].length>80||! /^[\p{L}\p{N}’' .()&-]+$/u.test(nm[1]))throw Error('Premium Plus unsafe horse identity');
   const programs=items.filter(i=>i.x<start.transform[4]-15&&Math.abs(i.y-(y-5))<1.2&&/^\d+[A-Z]?$/.test(i.str));
   if(programs.length!==1)throw Error('Premium Plus program number ambiguous for '+nm[1]);const program=programs[0].str;
   if(r.horses.some(h=>h.n===program||h.name===nm[1]))throw Error('Duplicate Premium Plus runner');
   const life=block.match(/Life:\s*(\d+)\s+(\d+)\s*-\s*(\d+)\s*-\s*(\d+)/);if(!life||+life[2]+ +life[3]+ +life[4]>+life[1])throw Error('Premium Plus career record unverified');
   const ml=items.filter(i=>i.x<start.transform[4]-15&&i.y<y-9&&i.y>y-18&&/^\d+(?:\/\d+|\.\d+)?$/.test(i.str));if(ml.length!==1)throw Error('Premium Plus morning line unverified');
   const headings=lines.filter(l=>/DATE TRK/.test(l.text)&&/E1\s+E2\/\s+LP/.test(l.text)&&/\bSPD\b/.test(l.text));
   const historical=lines.filter(l=>/^\d{2}[A-Za-z]{3}\d{2}[A-Za-z]+/.test(l.text));if(historical.length&&headings.length!==1)throw Error('Premium Plus running-line column heading unverified');
   const history=historical.map(l=>parsePace(l,headings[0],date));
   if(+life[1]===0&&history.length)throw Error('Premium Plus FTS/running-line contradiction');
   if(+life[1]>0&&!history.length)issues.push('#'+program+' '+nm[1]+': experienced runner without extracted running lines');
   const unresolved=history.filter(l=>l.status==='RATING_COLUMNS_UNRESOLVED');if(unresolved.length)issues.push('#'+program+' '+nm[1]+': '+unresolved.length+' rows have missing pace; Unknown retained');
   const unknownConditions=history.filter(l=>l.condition_evidence.status==='UNRESOLVED');if(unknownConditions.length)issues.push('#'+program+' '+nm[1]+': '+unknownConditions.length+' historical conditions unresolved; excluded from matching');
   const jockey=connection(block,'jockey'),trainer=connection(block,'trainer'),sire=block.match(/Sire\s*:\s*(.+)/),dam=block.match(/Dam:\s*(.+)/),power=block.match(/Prime Power:\s*(\d+\.\d+)/);
   // Conditional entry markers must be in the runner heading region, never historical notes.
   const headerRegion=lines.filter(l=>l.y>y-40).map(l=>l.text).join(' '),conditional=headerRegion.match(/\b(?:Also[- ]Eligible|AE|Main Track Only|MTO)\b/i),entry=conditional?/MTO|Main Track Only/i.test(conditional[0])?'MTO':'AE':'REGULAR';
   const works=lines.filter(l=>/^(?:×)?\d{2}[A-Za-z]{3}\s/.test(l.text)).map(l=>l.text).join('\n');
   r.horses.push({n:program,name:nm[1],ml:ml[0].str,odds:'—',entry_status:entry,included_in_frozen_field:entry==='REGULAR',life_starts:+life[1],lifeStarts:+life[1],j:jockey?.name||'',t:trainer?.name||'',style:'UNKNOWN',beyer_figures:[],figs:[],last:null,best:null,timeform_early:null,timeform_late:null,tfEarly:null,tfLate:null,jockey_win:jockey?.win??null,trainer_win:trainer?.win??null,trainer_context_score:null,parser_blockers:['BRISNET_SPEED_NOT_BEYER'],angles:[],source_context:{version:1,jockey,trainer,sire:sire?.[1]||'',dam:dam?.[1]||'',pedigree_text:[sire?.[1],dam?.[1]].filter(Boolean).join(' / '),workout_text:'',unverified_workout_page_text:works,workout_status:'EXTRACTION_PENDING',source_page:page.pageNumber},ratings:{provider:'BRISNET',run_style:+life[1]===0?'NA':nm[2],quirin_points:+life[1]===0?null:+nm[3],prime_power:power?+power[1]:null,lines:history},source_evidence:{page:page.pageNumber,header_text:clean(start.str),life_text:life[0],program_x:programs[0].x,name_y:y}});
  }
 }
 if(!Object.keys(races).length)throw Error('No Premium Plus races found');
 for(const r of Object.values(races))r.horses.sort((a,b)=>parseInt(a.n)-parseInt(b.n)||a.n.localeCompare(b.n));
 return {id:PREMIUM_PARSER_ID+':'+track+':'+date+':'+fingerprintPages(pages),schemaVersion:2,track,date,races,sourceName,parser_version:PREMIUM_PARSER_ID,source_format:'BRISNET_PREMIUM_PLUS',odds_source:'MORNING_LINE_ONLY',excluded_appendix_pages:excluded,validation_issues:issues,warnings:['Brisnet Premium Plus figures are source evidence; not Beyers or Timeform. Original models remain PASS until provider-specific scoring is validated.','Verify today\'s scratches separately; historical Scratch Watch never scratches a runner.','Workouts and trainer angles remain unscored source text; their structured extraction is not certified.',...(issues.length?[issues.length+' missing-evidence notes; review pace coverage.']:[])]};
}
