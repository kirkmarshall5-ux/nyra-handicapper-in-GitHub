// Browser-only, positioned-text Equibase chart intake. No model inputs are changed.
import {decodeDistanceToken} from './finisher-drf-distance.js';
import {evaluateHistoricalCard} from './historical-results.js';
export const CHART_PARSER_VERSION='equibase-positioned-results-v1';
const horseKey=s=>norm(String(s).replace(/\s*\([A-Za-z]{2,3}\)\s*$/,''));
const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]/g,'');
const fail=s=>{throw Error(s)};
const text=r=>r.items.map(i=>i.str).join(' ').replace(/\s+/g,' ').trim();
export function chartRows(pages){
 return pages.flatMap((page,index)=>{
  const rows=[];
  for(const i of page.items||[]){
   if(!i.str?.trim())continue;
   const y=i.transform[5],x=i.transform[4];
   let row=rows.find(r=>Math.abs(r.y-y)<2);
   if(!row){row={y,items:[],page:page.pageNumber||index+1};rows.push(row);}
   row.items.push({str:i.str,x,width:i.width||0});
  }
  return rows.sort((a,b)=>b.y-a.y).map(r=>({...r,items:r.items.sort((a,b)=>a.x-b.x)}));
 });
}
const slice=(r,a,b)=>r.items.filter(i=>i.x>=a&&i.x<b).map(i=>i.str).join(' ').trim();
const anchor=(r,re)=>r.items.find(i=>re.test(i.str.trim()))?.x;
function requiredAnchor(r,re){const x=anchor(r,re);if(x===undefined)fail('Chart table column unreadable: '+re);return x;}
function amount(s){if(!/^\d[\d,]*\.\d{2}$/.test(s))fail('Missing or ambiguous chart payout: '+s);const n=Number(s.replaceAll(',',''));if(!(n>0))fail('Nonpositive payout requires review');return n;}
export function chartDistance(s){
 s=String(s).replace(/\bSixteen\b/gi,'16').replace(/\bFifteen\b/gi,'15').replace(/\bFourteen\b/gi,'14').replace(/\bThirteen\b/gi,'13').replace(/\bTwelve\b/gi,'12').replace(/\bEleven\b/gi,'11').replace(/\bTen\b/gi,'10').replace(/\bNine\b/gi,'9').replace(/\bEight\b/gi,'8').replace(/\bSeven\b/gi,'7').replace(/\bSix\b/gi,'6').replace(/\bFive\b/gi,'5').replace(/\bFour\b/gi,'4').replace(/\bThree\b/gi,'3').replace(/\bTwo\b/gi,'2').replace(/\bOne\b/gi,'1');
 s=s.replace(/And\s+1\s+Fourth\b/gi,'1/4').replace(/And\s+3\s+Fourths\b/gi,'3/4');
 s=s.replace(/And\s+1\s+Half/gi,'1/2').replace(/And\s+1\s+Quarter/gi,'1/4').replace(/And\s+3\s+Quarters/gi,'3/4').replace(/And\s+1\s+Sixteenth/gi,'1/16').replace(/And\s+3\s+Sixteenths?/gi,'3/16').replace(/And\s+5\s+Sixteenths?/gi,'5/16').replace(/And\s+7\s+Sixteenths?/gi,'7/16').replace(/And\s+1\s+Eighths?/gi,'1/8').replace(/And\s+3\s+Eighths?/gi,'3/8').replace(/And\s+5\s+Eighths?/gi,'5/8').replace(/And\s+7\s+Eighths?/gi,'7/8');
 const m=s.trim().match(/^(\d+(?:\.\d+)?(?:\s+\d+\/\d+|\s*[¼½¾⅛⅜⅝⅞Â°±²´³¶ô])?)\s*(Furlongs?|Miles?|F|M)\b/i);
 return m?decodeDistanceToken(m[1],/^m/i.test(m[2])?'mile':'f'):null;
}
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
function identity(row){
 const m=text(row).match(/^(.+?)\s*-\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\s*-\s*Race\s+(\d+)\b/i);
 if(!m)return null;
 const month=months.findIndex(v=>v.toLowerCase()===m[2].toLowerCase())+1;if(!month)return null;
 return {track:m[1],date:m[4]+'-'+String(month).padStart(2,'0')+'-'+m[3].padStart(2,'0'),race:+m[5]};
}
function parseRace(rows,id,sourceRef){
 const all=rows.map(text).join('\n');
 if(!/Copyright.*Equibase Company/i.test(all))fail('Equibase chart footer not found');
 if(/Dead\s*Heat|Deadheat|\bRefund\b|\bNo Contest\b|\bCancelled\b|\bCanceled\b/i.test(all))fail('Dead heat, refund or cancelled/nonstandard race requires review');
 const heading=rows.findIndex(r=>/Last Raced/.test(text(r))&&/Horse Name/.test(text(r)));
 const end=rows.findIndex((r,i)=>i>heading&&/Fractional Times:|Final Time:/.test(text(r)));
 if(heading<0||end<0)fail('Complete official starter table not found');
 const h=rows[heading],pgm=requiredAnchor(h,/^Pgm\b/),wgt=requiredAnchor(h,/^Wgt\b/),odds=requiredAnchor(h,/^Odds$/),comments=requiredAnchor(h,/^Comments$/);
 const field=[],oddsByProgram={};
 for(const r of rows.slice(heading+1,end)){
  const cell=slice(r,pgm-1,wgt-1);
  if(!cell.includes('('))continue;
  const entry=cell.match(/^(\d+[A-Z]?)\s+(.+)$/);
  if(!entry)fail('Ambiguous starter program: '+cell);
  const n=entry[1],raw=entry[2];
  const match=raw.match(/^(?:DQ-)?(.+?)\s*\([^()]*,[^()]*\)\s*$/);
  if(!match)fail('Unreadable horse/jockey identity for #'+n);
  field.push({n,name:match[1].trim()});
  oddsByProgram[n]=slice(r,odds-1,comments-1).replace('*','');
 }
 if(field.length<2||new Set(field.map(h=>h.n)).size!==field.length)fail('Incomplete or duplicated starter table');
 if(field.some(h=>/[A-Z]$/.test(h.n))){const error=Error('Coupled starter field extracted; official wagering-interest and payout verification required');error.starterField=field.map(h=>({...h}));throw error;}
 for(const dq of all.matchAll(/Disqualification\(s\):\s*#(\d+)\s+.+?\s+from\s+(\d+)\s+to\s+(\d+)/g)){
  const at=field.findIndex(h=>h.n===dq[1]),to=+dq[3];
  if(at!==+dq[2]-1||to<1||to>field.length)fail('Ambiguous disqualification order');
  field.splice(to-1,0,field.splice(at,1)[0]);
 }
 if(/Disqualification\(s\):/.test(all)&&![...all.matchAll(/Disqualification\(s\):\s*#(\d+)\s+.+?\s+from\s+(\d+)\s+to\s+(\d+)/g)].length)fail('Unreadable disqualification notice');
 const payHead=rows.findIndex((r,i)=>i>end&&/Pgm Horse/.test(text(r))&&/\bWin\b/.test(text(r))&&/Wager Type/.test(text(r)));
 if(payHead<0)fail('Official payout table not found');
 const ph=rows[payHead],winX=requiredAnchor(ph,/^Win$/),placeX=requiredAnchor(ph,/^Place$/),wagerX=requiredAnchor(ph,/^Wager Type$/),numbersX=requiredAnchor(ph,/^Winning Numbers$/),payoffX=requiredAnchor(ph,/^Payoff$/);
 // Use right edges: monetary values are right-aligned to their column headers.
 const edge=re=>{const i=ph.items.find(i=>re.test(i.str.trim()));return i.x+i.width;};
 const winEnd=edge(/^Win$/)+1,placeEnd=edge(/^Place$/)+1;
 const payRows=[];let exacta=null;
 for(const r of rows.slice(payHead+1)){
  if(/Past Performance Running Line Preview|Trainers:|Footnotes/.test(text(r)))break;
  const n=(slice(r,0,winX-12).match(/^(\d+)\s+/)||[])[1];
  if(n){
   const win=slice(r,winX-12,winEnd),place=slice(r,winEnd,placeEnd);
   payRows.push({n,name:slice(r,0,winX-12).replace(/^\d+\s+/,''),win:win?amount(win):null,place:place?amount(place):null});
  }
  const wager=slice(r,wagerX-1,numbersX-1);
  if(/Exacta/i.test(wager)){
   if(exacta)fail('Multiple exacta payouts require review');
   const base=wager.match(/^\$(\d+(?:\.\d{2})?)\s+Exacta$/i),pair=slice(r,numbersX-1,payoffX-1).match(/^(\d+)-(\d+)$/);
   if(!base||!pair)fail('Exacta denomination or winning pair unreadable');
   exacta={base:Number(base[1]),pair:pair.slice(1),pay:amount(r.items.filter(i=>i.x>=payoffX-30&&i.x+i.width<=edge(/^Payoff$/)+1).map(i=>i.str).join(' ').trim())};
  }
 }
 if(!exacta||exacta.base<=0||exacta.pair.join('-')!==field.slice(0,2).map(h=>h.n).join('-'))fail('Exacta winning pair conflicts with official finishing order');
 if(payRows.length<2||payRows[0].n!==field[0].n||payRows[1].n!==field[1].n||horseKey(payRows[0].name)!==horseKey(field[0].name)||horseKey(payRows[1].name)!==horseKey(field[1].name)||!payRows[0].win||!payRows[0].place||!payRows[1].place||payRows.slice(1).some(r=>r.win))fail('Win/place table conflicts with official order or is incomplete');
 const oddsValue=Number(oddsByProgram[field[0].n]);
 if(!/^\d+(?:\.\d+)?$/.test(oddsByProgram[field[0].n]||'')||Math.abs(payRows[0].win-2*(1+oddsValue))>0.031)fail('Standard $2 WPS denomination could not be verified against winner odds');
 const distanceLine=rows.find(r=>/^Distance:/.test(text(r)));
 if(!distanceLine)fail('Actual race distance and surface missing');
 const conditions=text(distanceLine).split(/ - Originally| Current Track Record:/i)[0].replace(/^Distance:\s*/,'');
 const distanceFurlongs=chartDistance(conditions),surface=/All Weather|Synthetic|Tapeta/i.test(conditions)?'Synth':/On The (?:Inner |Outer )?Turf/i.test(conditions)?'Turf':/On The Dirt/i.test(conditions)?'Dirt':null;
 if(distanceFurlongs===null||!surface||/\bAbout\b/i.test(conditions))fail('Actual distance/surface could not be read exactly');
 return {...id,field,finish:field.map(h=>h.n),surface,distanceFurlongs,conditions,win2:payRows[0].win,place2:Object.fromEntries(payRows.slice(0,2).map(h=>[h.n,h.place])),exactaPay:exacta.pay,exactaBase:exacta.base,verified:true,verification:'AUTOMATIC_EQUIBASE_CHART',parserVersion:CHART_PARSER_VERSION,sourceRef,sourcePages:[...new Set(rows.map(r=>r.page))],scratches:(all.match(/Scratched Horse\(s\):\s*([^\n]+)/)||[])[1]||'',recordedAt:new Date().toISOString()};
}
export function parseEquibaseResults(pages,{sourceRef='Equibase results PDF'}={}){
 const rows=chartRows(pages),groups=[];let current=null;
 for(const r of rows){const id=identity(r);if(id){if(current&&id.race===current.id.race&&id.date===current.id.date&&norm(id.track)===norm(current.id.track)){current.rows.push(r);continue;}current={id,rows:[r]};groups.push(current);}else if(current)current.rows.push(r);}
 if(!groups.length)fail('No readable Equibase race headings found. Upload the original text-based full chart PDF.');
 const races=[],pending=[],seen=new Set();
 for(const g of groups){const key=norm(g.id.track)+'|'+g.id.date+'|'+g.id.race;if(seen.has(key))fail('Duplicate race charts found; use one official chart per race');seen.add(key);try{races.push(parseRace(g.rows,g.id,sourceRef));}catch(e){pending.push({...g.id,reason:e.message,...(e.starterField?{starterField:e.starterField}: {})});}}
 return {races,pending,identities:groups.map(g=>g.id),parserVersion:CHART_PARSER_VERSION,sourceRef};
}
export function matchEquibaseResults(snapshot,parsed,strategyId){
 if(parsed.identities.some(id=>id.date!==snapshot.date||norm(id.track)!==norm(snapshot.track)))fail('Results PDF track/date differs from these saved rankings. Existing results were preserved.');
 const officials={},pending=[];
 for(const r of snapshot.races){
  const number=String(r.race.number),o=parsed.races.find(o=>o.race===Number(number)),issue=parsed.pending.find(o=>o.race===Number(number));
  if(!o){if(issue)pending.push({race:Number(number),reason:issue.reason});continue;}
  const expectedDistance=chartDistance(r.race.distance);
  if(expectedDistance===null||Math.abs(expectedDistance-o.distanceFurlongs)>0.001){pending.push({race:+number,reason:'Chart distance differs from saved rankings. Reconcile conditions in a new historical snapshot.'});continue;}
  const official={...o,track:snapshot.track,distance:r.race.distance};
  const check=evaluateHistoricalCard({...snapshot,races:[r]},{[number]:official},strategyId);
  if(check.pending.length)pending.push(...check.pending);else officials[number]=official;
 }
 return {officials,pending};
}
