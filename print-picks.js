// Paper comparison only. Reuses the displayed model functions without changing scores.
import {buildRaceDashboard} from './race-day-dashboard.js?v=20261028-dashboard2';
import {pairedRace,cardProvider} from './dual-pp-cards.js';
import {decodeTodayDistance} from './finisher-drf-distance.js';

export function buildPicksSheet({cards,card,currentRace=null,notes={},now=new Date().toISOString()},ranker){
 if(!card?.id||!card?.date||!card?.track||!Object.keys(card.races||{}).length)throw Error('Load a dated PP card before printing.');
 const provider=cardProvider(card),sources={...cards,[provider]:structuredClone(card)};
 if(currentRace&&Number.isInteger(Number(currentRace.race)))sources[provider].races[currentRace.race]=structuredClone(currentRace);
 const races=Object.keys(card.races).sort((a,b)=>Number(a)-Number(b)).map(key=>{
  const anchor=sources[provider].races[key];
  const paired=Object.fromEntries(['BRISNET','DRF'].map(p=>[p,pairedRace(sources,p,anchor)]));
  const available=['DRF','BRISNET'].filter(p=>paired[p].race).sort((a,b)=>(Date.parse(sources[b]?.imported_at)||0)-(Date.parse(sources[a]?.imported_at)||0)||(a===provider?-1:b===provider?1:0));
  const dashboard=buildRaceDashboard({anchor,sources:paired,morningLineProvider:available[0]||provider},ranker);
  const columns=[dashboard.morning_line,...dashboard.models].map(m=>({label:m.label,provider:m.provider|| (m.id==='brisContender'?'BRISNET':'DRF'),modelId:m.model_id||null,available:m.available,decision:m.decision||'REFERENCE',ranked:m.ranked,eligible:m.eligible,picks:m.rankings.slice(0,4).map(h=>String(h.n)),reason:m.available?null:m.reason}));
  const scratches=[...new Set([...(anchor.horses||[]).filter(h=>h.odds==='SCR').map(h=>String(h.n)),...(anchor.predeclared_scratches||[]).map(h=>String(h.program))])];
  const conditional=(anchor.horses||[]).filter(h=>h.odds!=='SCR'&&['AE','ALSO_ELIGIBLE','MTO'].includes(h.entry_status)&&h.included_in_frozen_field!==true).map(h=>String(h.n));
  const dist=Number.isFinite(anchor.distance_furlongs)?anchor.distance_furlongs:decodeTodayDistance(anchor.conditions?.primaryDistanceLine||anchor.header||anchor.dist).furlongs;
  return {race:anchor.race,surface:anchor.surface,distance:Number.isFinite(dist)?dist+' furlongs':'Distance unverified',post:anchor.post||null,columns,scratches,conditional,notes:String(notes[key]||'')};
 });
 return {track:card.track,date:card.date,generatedAt:now,sourceProvider:provider,races,bettingEnabled:false};
}

export function paperWagers(picks){
 return {win:picks[0]||'Unavailable',exacta:picks.length>=2?`${picks[0]}-${picks[1]}, ${picks[1]}-${picks[0]}`:'Unavailable',trifecta:picks.length>=3?picks.slice(0,3).join('-')+' box':'Unavailable'};
}
const ascii=s=>String(s??'').normalize('NFKD').replace(/[‘’]/g,"'").replace(/[–—]/g,'-').replace(/[^\x20-\x7e]/g,'?');
const escape=s=>ascii(s).replace(/([\\()])/g,'\\$1');
function wrap(s,max){const out=[];for(let line of ascii(s).split('\n')){while(line.length>max){let cut=line.lastIndexOf(' ',max);if(cut<1)cut=max;out.push(line.slice(0,cut));line=line.slice(cut).trimStart();}out.push(line);}return out;}

// Small vector PDF: no CDN, server upload, or PDF-generation dependency.
export function picksPdf(sheet){
 const pages=[];
 for(let start=0;start<sheet.races.length;start+=2){
  const commands=[];
  const text=(x,y,s,size=10,bold=false)=>commands.push(`BT /${bold?'F2':'F1'} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escape(s)}) Tj ET`);
  const line=(x,y,x2,y2)=>commands.push(`0.65 G 0.4 w ${x} ${y} m ${x2} ${y2} l S 0 G`);
  text(205,750,'Race Day Handicapper',18,true);
  text(36,727,sheet.track,13,true);text(425,727,sheet.date,12,true);
  const stamp=new Date(sheet.generatedAt).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit'});
  text(36,709,'Updated '+stamp+' ET - verify official scratches and surface',8);
  sheet.races.slice(start,start+2).forEach((r,index)=>{
   const y=680-index*303,xs=[36,132,243,354,465],labels=['Race #','Morning Line','Brisnet Contender','DRF Contender','DRF Finisher'];
   labels.forEach((v,i)=>text(xs[i],y,v,i===0?11:9,true));line(36,y-7,576,y-7);
   text(36,y-28,String(r.race),14,true);
   r.columns.forEach((c,i)=>{const x=xs[i+1],w=paperWagers(c.picks);text(x,y-28,c.available?(c.picks.join('-')||'Unrated'):'Unavailable',13,true);text(x,y-44,c.available?`${c.ranked}/${c.eligible} ranked - ${c.decision}`:'Check PP / field status',7);
    text(x,y-86,w.win,10);wrap(w.exacta,20).slice(0,2).forEach((v,j)=>text(x,y-111-j*11,v,9));text(x,y-146,w.trifecta,9);
   });
   text(36,y-62,[r.distance,r.surface].filter(Boolean).join(' - '),8);
   text(36,y-86,'$4 Win',10);text(36,y-111,'$2 Exacta box',9);text(36,y-146,'$0.50 Tri box',9);
   text(36,y-170,'Exacta: $2 each way ($4). Trifecta: 6 x $0.50 ($3). Paper tests; verify wager availability.',7);
   text(36,y-187,'Scratched: '+(r.scratches.join(', ')||'none marked')+'   Conditional / not confirmed: '+(r.conditional.join(', ')||'none'),8);
   text(36,y-211,'Finish Order:');line(110,y-213,575,y-213);
   text(36,y-235,'Notes:');wrap(r.notes,91).slice(0,2).forEach((v,j)=>text(76,y-235-j*13,v,9));line(76,y-238,575,y-238);line(36,y-255,575,y-255);
  });
  text(36,44,'Paper comparison only. PASS / incomplete fields are not betting recommendations.',8);
  text(36,31,'Reprint after changes. A downloaded or printed PDF is a static snapshot, not a verified freeze.',7);
  text(531,31,`${Math.floor(start/2)+1} / ${Math.ceil(sheet.races.length/2)}`,8);
  pages.push(commands.join('\n'));
 }
 const objects=[null,'<< /Type /Catalog /Pages 2 0 R >>',null,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'];
 const kids=[];
 for(const content of pages){const id=objects.length;kids.push(`${id} 0 R`);objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${id+1} 0 R >>`);objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);}
 objects[2]=`<< /Type /Pages /Count ${pages.length} /Kids [${kids.join(' ')}] >>`;
 let pdf='%PDF-1.4\n',offsets=[0];for(let i=1;i<objects.length;i++){offsets.push(pdf.length);pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}
 const offset=pdf.length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
 return new TextEncoder().encode(pdf);
}

export function createPicksPreview({getSheet,open=()=>window.open('','_blank')}={}){
 let preview=null,url=null,signature=null;
 const refresh=()=>{
  if(!preview||preview.closed){preview=null;return false;}
  const sheet=getSheet(),key=JSON.stringify({...sheet,generatedAt:null});if(key===signature)return true;
  const next=URL.createObjectURL(new Blob([picksPdf(sheet)],{type:'application/pdf'}));
  try{preview.location.replace(next);}catch(e){URL.revokeObjectURL(next);throw e;}
  const old=url;url=next;signature=key;if(old)setTimeout(()=>URL.revokeObjectURL(old),60000);return true;
 };
 return {show(){getSheet();if(!preview||preview.closed){preview=open();signature=null;}if(!preview)throw Error('Allow pop-ups for this site, then press Print Picks again.');refresh();return true;},refresh};
}
