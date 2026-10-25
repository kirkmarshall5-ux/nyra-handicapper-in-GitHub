// Research helper: caller supplies already filtered, newest-first pace lines.
export function meanLate(lines){
 const values=lines.filter(l=>typeof l.late==='number'&&Number.isFinite(l.late)).slice(0,3).map(l=>l.late);
 return values.length?values.reduce((s,v)=>s+v,0)/values.length:null;
}
