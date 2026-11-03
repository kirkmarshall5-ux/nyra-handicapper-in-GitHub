// Source-card context for display only. None of these fields enters V4.4c or J1.
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const months={'â':1,'á':2,'à':3,'ß':4,'Ü':5,'Þ':6,'Û':7,'Ý':8,'æ':9,'å':10,'ä':11,'ã':12};
export function ppContext(header,text){
 const local=(kind)=>{
  const part=kind==='jockey'?header.split('Tr:')[0]:header.split('Tr:')[1]||'';
  const rx=kind==='jockey'?/\b([A-Z][A-Z .'-]{1,35})\s*\((\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(0?\.\d+|1\.0+)\)\s*20\d{2}:/g:/^\s*([^()]{2,55}?)\s*\((\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(0?\.\d+|1\.0+)\)\s*20\d{2}:/g;
  const rows=[...part.matchAll(rx)];if(rows.length!==1)return null;
  const m=rows[0],s=+m[2],w=+m[3],p=+m[4],sh=+m[5];
  if(w+p+sh>s||Math.abs((s?w/s:0)-+m[6])>.01001)return null;
  return {name:clean(m[1]),starts:s,wins:w,seconds:p,thirds:sh,win:s?100*w/s:null,top:s?100*(w+p+sh)/s:null,scope:'PP local record',source:clean(m[0]),status:'SOURCE_COUNTS_VERIFIED'};
 };
 const sire=header.match(/\bSire:\s*(.*?)(?=\s+Dam:)/)?.[1]||'',dam=header.match(/\bDam:\s*(.*?)(?=\s+Br:|\s+Tr:)/)?.[1]||'';
 const works=text.includes('WORKS:')?clean(text.split('WORKS:')[1].split('TRAINER:')[0]):'';
 return {version:1,jockey:local('jockey'),trainer:local('trainer'),sire:clean(sire),dam:clean(dam),pedigree_text:[sire&&'Sire: '+clean(sire),dam&&'Dam: '+clean(dam)].filter(Boolean).join(' · '),workout_source_text:works,workout_text:works};
}
export function datedWorkoutText(text,cardDate){
 // DRF supplies month/day, not year. Mark the inferred year explicitly.
 const today=new Date(cardDate+'T00:00:00Z');if(!Number.isFinite(+today))return text;
 return String(text||'').replace(/([âáàßÜÞÛÝæåäã])(\d{1,2})\s*(?=[A-Za-z])/g,(token,g,day)=>{
  let year=today.getUTCFullYear(),m=months[g],d=+day,dt=new Date(Date.UTC(year,m-1,d));
  if(dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)return token;
  if(dt>today)year--;
  return `${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')} [year inferred] `;
 });
}
export function fieldConnections(horses,kind){
 const rows=new Map(),conflicts=new Set();
 for(const h of horses.filter(h=>h.odds!=='SCR'&&h.included_in_frozen_field!==false)){
  const r=h.source_context?.[kind];if(!r)continue;
  const key=r.name.toLowerCase().replace(/[^a-z0-9]/g,'');
  const old=rows.get(key);if(old&&['starts','wins','seconds','thirds'].some(k=>old[k]!==r[k]))conflicts.add(key);
  rows.set(key,r);
 }
 return [...rows].filter(([k])=>!conflicts.has(k)).map(([,r])=>r).sort((a,b)=>(b.win??-1)-(a.win??-1)||b.starts-a.starts||a.name.localeCompare(b.name));
}
