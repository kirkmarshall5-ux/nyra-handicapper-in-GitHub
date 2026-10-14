// Brisnet Ultimate positioned-text adapter. Provider values never become Beyer/Timeform.
import {fingerprintPages,reconstructPage} from './card-loader.js';
export const BRISNET_PARSER_ID='BRISNET-ULTIMATE-positioned-v1';
const clean=x=>String(x??'').replace(/\s+/g,' ').trim();
const months={January:1,February:2,March:3,April:4,May:5,June:6,July:7,August:8,September:9,October:10,November:11,December:12};
const shortMonths={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jly:7,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
const digits={'§':'0','¨':'1','©':'2','ª':'3','«':'4','¬':'5','­':'6','®':'7','¯':'8','°':'9'};
const decode=s=>String(s).replace(/[§¨©ª«¬­®¯°]/g,c=>digits[c]);
const num=s=>{const t=decode(clean(s)).replace(/\s+/g,'');return /^[+-]?\d+$/.test(t)?Number(t):null};
function iso(year,month,day){const d=new Date(Date.UTC(year,month-1,day));if(d.getUTCFullYear()!==year||d.getUTCMonth()+1!==month||d.getUTCDate()!==day)throw Error('Invalid Brisnet source date');return d.toISOString().slice(0,10);}
function dateFromHeading(s){const m=s.match(/\b([A-Z][a-z]+)\s+(\d{1,2}),\s*(20\d{2}|19\d{2})\b/);if(!m||!months[m[1]])throw Error('Brisnet card date unverified');return iso(+m[3],months[m[1]],+m[2]);}
function historicalDate(token,today){const m=token.match(/^(\d{2})([A-Za-z]{3})(\d{2})([A-Za-z]+)/);if(!m||!shortMonths[m[2]])return null;const y=+m[3],year=y>=70?1900+y:2000+y;return {date:iso(year,shortMonths[m[2]],+m[1]),track:m[4]};}
export function brisnetDistance(text){const m=clean(text).match(/\b(\d+(?:[½¼¾ˆ„]|\s+\d+\/\d+|\.\d+)?)\s*(Furlongs?|Miles?)\b/i);if(!m)return null;const t=m[1],base=parseFloat(t),fractions={'½':.5,'¼':.25,'¾':.75,'ˆ':.0625,'„':.125};let n=base;const f=t.match(/(\d+)\/(\d+)/);if(f)n=base+(+f[1]/+f[2]);else for(const [k,v] of Object.entries(fractions))if(t.endsWith(k))n+=v;const miles=/^mile/i.test(m[2]);return {furlongs:n*(miles?8:1),display:(t.replace('„',' 1/8').replace('ˆ',' 1/16').replace('½',' 1/2').replace('¼',' 1/4').replace('¾',' 3/4'))+(miles?'M':'F')};}
function historyDistance(text){const m=text.match(/([\d½¼¾ˆ„]+)(f|m)?\s*(ft|fm|gd|sy|my|yl|sf|hy)\b/);if(!m)return {furlongs:null,surface:null};const token=m[1],base=parseFloat(token),n=base+(token.endsWith('½')?.5:token.endsWith('¼')?.25:token.endsWith('¾')?.75:token.endsWith('ˆ')?.0625:token.endsWith('„')?.125:0);const furlongs=m[2]==='f'||base>=4?n:n*8;return {furlongs,surface:/[˜~]/.test(text)||/\bfm\b|\byl\b|\bsf\b|\bhy\b/.test(text)?'Turf':/Ì|AW|All Weather/.test(text)?'Synth':'Dirt'};}
function rowRating(line,today,columns){
 const date=historicalDate(line.text,today);if(!date)return null;if(date.date>=today)throw Error('Brisnet historical running line is not before the card date');
 // Ratings are anchored to the printed CR, E1, E2/LP, 1c, 2c and SPD sequence.
 const m=line.text.match(/([§¨©ª«¬­®¯°]{2,3}|\d{3})\s*(-?\d+|-)\s+(-?\d+|-)\s*\/\s*(-?\d+|-)\b/),short=!m?line.text.match(/([§¨©ª«¬­®¯°]{2,3}|\d{3})\s+(-?\d+|-)\s*\/\s*(-?\d+|-)\b/):null;
 const d=historyDistance(line.text),rr=line.text.match(/\s([§¨©ª«¬­®¯°]{3}|\d{3})\s+(?:[A-Za-z]|[‘™])/);
 const cell=(key,next)=>{if(!columns)return null;const shape=/^[12]c$/.test(key),left=columns[key]-(shape?5.3:2.1),right=columns[next]-(key==='1c'?5.3:2.1);const items=(line.rawItems||line.items).filter(i=>clean(i.str)&&i.x>=left&&i.x<right).sort((a,b)=>a.x-b.x);if(items.some(i=>i.x+(i.width||0)>right+.3))return null;if(shape){const body=items.filter(i=>/[§¨©ª«¬­®¯°\d]/.test(i.str)),sign=items.find(i=>/^[+-]$/.test(clean(i.str)));if(!body.length)return null;const end=Math.max(...body.map(i=>i.x+(i.width||0)));if(Math.abs(end-(columns[key]+4.9))>.8)return null;if(sign&&body[0].x-(sign.x+(sign.width||0))>1)return null;}return items.length?num(items.map(i=>i.str).join('')):null;};
 const speed=cell('SPD','PP'),shape1=cell('1c','2c'),shape2=cell('2c','SPD'),e1=m?num(m[2]):null,e2=m?num(m[3]):short?num(short[2]):null,late=m?num(m[4]):short?num(short[3]):null;
 // A missing encoded digit (notably this old PDF's digit six) is never filled in.
 const cr=m?.[1]??short?.[1];const class_rating=cr&&decode(cr).length===3?num(cr):null;
 return {...date,...d,e1,e2,late,shape1,shape2,speed,race_rating:columns&&rr?num(rr[1]):null,class_rating,turn_time:e1!==null&&e2!==null?e2-e1:null,status:e2!==null&&late!==null?'PACE_SOURCE_SEQUENCE_VERIFIED':'RATING_COLUMNS_UNRESOLVED',source:{provider:'BRISNET',page:line.pageNumber,y:line.y,text:line.text}};
}
function connection(text,kind){const rx=kind==='trainer'?/Trnr:\s*(.*?)\s*\((\d+)\s+(\d+)-(\d+)-(\d+)\s+(\d+)%\)/:/^([A-Z][A-Z .'-]+)\s*\((\d+)\s+(\d+)-(\d+)-(\d+)\s+(\d+)%\)/m;const m=text.match(rx);if(!m)return null;const starts=+m[2],wins=+m[3],seconds=+m[4],thirds=+m[5];if(wins+seconds+thirds>starts)throw Error('Brisnet connection counts invalid');return {name:clean(m[1]),starts,wins,seconds,thirds,win:starts?100*wins/starts:null,scope:'PP local record',status:'SOURCE_COUNTS_VERIFIED'};}
export function parseBrisnetCard(input,{sourceName='Brisnet PDF'}={}){
 const pages=input.map(p=>{const r=reconstructPage(p.items,p.pageNumber,2);for(const l of r.lines)for(const i of l.items)i.width=p.items[i.index]?.width||0;return r;}),races={},excluded=[],issues=[];let track=null,date=null;
 for(const page of pages){
  const all=page.lines.map(l=>l.text).join('\n'),header=page.lines.find(l=>/Ultimate PP'?s/i.test(l.text)&&/\bRace\s+\d+\b/.test(l.text));
  if(!header){if(/INDEX OF HORSES/.test(all)&&track&&!/\bLife:/.test(all)){excluded.push({page:page.pageNumber,reason:'Brisnet index / historical scratch watch'});continue;}throw Error('Brisnet race heading missing on page '+page.pageNumber+'. Image-only and unrecognized layouts require a reviewed adapter.');}
  const tokens=header.items.filter(a=>clean(a.str)),titleIndex=tokens.findIndex(a=>/Ultimate PP'?s/i.test(a.str)),trackItem=tokens[titleIndex+1];if(titleIndex<0||!trackItem||!/^[A-Za-z][A-Za-z .'-]+$/.test(clean(trackItem.str)))throw Error('Brisnet track heading unverified on page '+page.pageNumber);
  const thisTrack=clean(trackItem.str),thisDate=dateFromHeading(header.text),rn=+header.text.match(/\bRace\s+(\d+)\b/)[1];
  if(track&&(track!==thisTrack||date!==thisDate))throw Error('Mixed Brisnet tracks/dates must be uploaded separately');track=thisTrack;date=thisDate;
  const distance=brisnetDistance(header.text);if(!distance)throw Error('Brisnet primary distance unverified');
  const surface=/\(T\)|Turf|Grass/i.test(header.text)?'Turf':/All Weather|Synthetic/i.test(header.text)?'Synth':'Dirt';
  const r=races[rn]??={race:rn,track,date,header:header.text,dist:distance.display,distance_furlongs:distance.furlongs,surface,cls:header.text.split(thisTrack)[1]?.split(/Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday/)[0].trim()||'',conditions:{surface,primaryDistanceLine:distance.display,unsupported:false},post:'Unverified',oddsMode:'Morning line (pre-race)',horses:[],parser_blockers:['BRISNET_SOURCE_MODEL_VALIDATION_PENDING'],source_format:'BRISNET_ULTIMATE',ratings_provider:'BRISNET',source_pages:[],brisnet_pars:null};
  if(r.dist!==distance.display||r.surface!==surface)throw Error('Conflicting Brisnet race conditions');r.source_pages.push(page.pageNumber);
  const ppLine=page.lines.find(l=>/Post Time:/.test(l.text));if(ppLine)r.post=ppLine.text.replace(/^.*?Post Time:\s*/,'')+' (printed zones; verify local time)';
  const parLine=page.lines.find(l=>l.y>700&&/\d+\s+\d+\s*\/\s*\d+\s+\d+/.test(l.text));
  if(parLine){const m=parLine.text.match(/(\d+)\s+(\d+)\s*\/\s*(\d+)\s+(\d+)\s*$/);if(m)r.brisnet_pars={e1:+m[1],e2:+m[2],late:+m[3],speed:+m[4],source_page:page.pageNumber};}
  const starts=page.items.filter(a=>/^.+\((?:E\/P|E|P|S|NA)\s+[0-8]\)\s*$/.test(clean(a.str))).sort((a,b)=>b.transform[5]-a.transform[5]);
  const lifeCount=page.items.filter(a=>/\bLife:/.test(a.str||'')).length;if(lifeCount!==starts.length)throw Error('Brisnet runner headers / career records do not reconcile on page '+page.pageNumber);
  for(let i=0;i<starts.length;i++){
   const a=starts[i],y=a.transform[5],bottom=starts[i+1]?starts[i+1].transform[5]+12:40;
   const items=page.items.filter(b=>b.str&&b.transform[5]<=y+10&&b.transform[5]>bottom),lines=page.lines.filter(l=>l.y<=y+10&&l.y>bottom),text=lines.map(l=>l.text).join('\n');
   const nm=clean(a.str).match(/^(.*?)\s*\((E\/P|E|P|S|NA)\s+([0-8])\)$/),programs=items.filter(b=>b.transform[4]<a.transform[4]-10&&Math.abs(b.transform[5]-(y-5.5))<3&&/^\d+[A-Z]?$/.test(clean(b.str)));
   if(!nm[1]||nm[1].length>80||! /^[\p{L}\p{N}’' .()&-]+$/u.test(nm[1]))throw Error('Brisnet horse identity contains unsupported characters');
   if(programs.length!==1)throw Error('Brisnet program number ambiguous for '+nm[1]);const program=clean(programs[0].str);
   if(r.horses.some(h=>h.n===program||h.name===nm[1]))throw Error('Duplicate Brisnet runner '+program+' '+nm[1]);
   const life=text.match(/Life:\s*(\d+)\s+(\d+)\s*-\s*(\d+)\s*-\s*(\d+)/);if(!life)throw Error('Career starts unverified for '+nm[1]);
   if(+life[2]+ +life[3]+ +life[4]>+life[1])throw Error('Career record invalid for '+nm[1]);
   const ml=items.filter(b=>b.transform[4]<a.transform[4]-10&&b.transform[5]<y-8&&b.transform[5]>y-20&&/^\d+(?:\/\d+|\.\d+)?$/.test(clean(b.str)));if(ml.length!==1)throw Error('Morning line unverified for '+nm[1]);
   const heading=lines.find(l=>/DATE TRK/.test(l.text)&&/E1\s+E2\//.test(l.text)&&/\bSPD\b/.test(l.text));const columns=heading?Object.fromEntries(heading.items.filter(it=>['1c','2c','SPD','PP'].includes(clean(it.str))).map(it=>[clean(it.str),it.x])):null;
   const history=lines.filter(l=>/^\d{2}[A-Za-z]{3}\d{2}[A-Za-z]+/.test(l.text)).map(l=>{const anchor=l.items.find(it=>/^\d{2}[A-Za-z]{3}\d{2}[A-Za-z]+/.test(it.str));const baseline=anchor?.y??l.y;const rawItems=items.filter(it=>Math.abs(it.transform[5]-baseline)<2).map(it=>({...it,x:it.transform[4]}));return rowRating({...l,rawItems},date,columns);}).filter(Boolean);
   if(+life[1]===0&&history.length)throw Error('FTS / running-line contradiction for '+nm[1]);
   if(+life[1]>0&&!history.length)issues.push('#'+program+' '+nm[1]+': no dated running lines extracted');
   const headings=lines.filter(l=>/DATE TRK/.test(l.text)&&/E1\s+E2\//.test(l.text)&&/\bSPD\b/.test(l.text)),nonPace=lines.filter(l=>/DATE TRK/.test(l.text)&&/Wind/.test(l.text)&&/Winner/.test(l.text)&&/Horse/.test(l.text)&&/\bSPD\b/.test(l.text));if(history.length&&headings.length!==1&&nonPace.length!==1)throw Error('Brisnet rating column heading unverified for '+nm[1]);
   const unresolved=history.filter(x=>x.status==='RATING_COLUMNS_UNRESOLVED');if(unresolved.length)issues.push('#'+program+' '+nm[1]+': '+unresolved.length+' unresolved pace rows retained without pace values');
   const headerText=items.map(b=>clean(b.str)).join('\n');const j=connection(headerText,'jockey'),t=connection(headerText,'trainer'),sire=headerText.match(/Sire:\s*(.*?)\s*(?:Dam:|\n)/),dam=headerText.match(/Dam:\s*(.*?)\s*(?:Brdr:|\n)/),power=headerText.match(/Prime Power:\s*(\d+\.\d+)/);
   const workoutCeiling=history.length?Math.min(...history.map(l=>l.source.y))-2:y-65;const workouts=lines.filter(l=>l.y<workoutCeiling).filter(l=>/^\d{2}[A-Za-z]{3}\s|^×\d{2}[A-Za-z]{3}/.test(l.text)).map(l=>l.text).join('\n');
   const conditional=text.match(/\b(?:Also[- ]Eligible|AE|Main Track Only|MTO)\b/i);const entry=conditional?/MTO|Main Track Only/i.test(conditional[0])?'MTO':'AE':'REGULAR';
   r.horses.push({n:program,name:nm[1],ml:clean(ml[0].str),odds:'—',entry_status:entry,included_in_frozen_field:entry==='REGULAR',life_starts:+life[1],lifeStarts:+life[1],j:j?.name||'',t:t?.name||'',style:'UNKNOWN',beyer_figures:[],figs:[],last:null,best:null,timeform_early:null,timeform_late:null,tfEarly:null,tfLate:null,jockey_win:j?.win??null,trainer_win:t?.win??null,trainer_context_score:null,parser_blockers:['BRISNET_SPEED_NOT_BEYER'],angles:[],source_context:{version:1,jockey:j,trainer:t,sire:sire?.[1]||'',dam:dam?.[1]||'',pedigree_text:[sire?.[1],dam?.[1]].filter(Boolean).join(' / '),workout_text:workouts,workout_status:'SOURCE_TEXT_NOT_VALIDATED',source_page:page.pageNumber},ratings:{provider:'BRISNET',run_style:+life[1]===0?'NA':nm[2],quirin_points:+nm[3],prime_power:power?+power[1]:null,lines:history},source_evidence:{page:page.pageNumber,header_text:clean(a.str),life_text:life[0],program_x:programs[0].transform[4],name_y:y}});
  }
 }
 if(!Object.keys(races).length)throw Error('No Brisnet races found');
 for(const r of Object.values(races)){if(!r.horses.length)throw Error('Brisnet race '+r.race+' has no identified runners');r.horses.sort((a,b)=>parseInt(a.n)-parseInt(b.n)||a.n.localeCompare(b.n));}
 return {id:BRISNET_PARSER_ID+':'+track+':'+date+':'+fingerprintPages(pages),schemaVersion:2,track,date,races,sourceName,parser_version:BRISNET_PARSER_ID,source_format:'BRISNET_ULTIMATE',odds_source:'MORNING_LINE_ONLY',excluded_appendix_pages:excluded,validation_issues:issues,warnings:['Brisnet figures are separate source evidence. V4.4c and Contender require verified Beyers; Brisnet-only uploads remain PASS until a separately validated model is available.','Scratches and final starters must be verified; historical Scratch Watch is not today’s scratch list.',...(issues.length?[issues.length+' source extraction issues: inspect the Brisnet evidence panel.']:[])]};
}
