// User-supplied official starter evidence. Never infer a roster from model rankings.
export function parseOfficialStarterRoster(text){
 const raw=String(text??'').trim();
 if(!raw)return null;
 const rows=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const roster=rows.map((line,i)=>{
  const m=line.match(/^([0-9]+[A-Za-z]?)\s*\|\s*(.+)$/);
  if(!m)throw Error('Official starter row '+(i+1)+' must use PROGRAM | HORSE NAME.');
  return {program:m[1].toUpperCase(),horse:m[2].trim()};
 });
 if(new Set(roster.map(h=>h.program)).size!==roster.length)throw Error('Duplicate official starter program.');
 return roster;
}
