// Source-specific review, not a replacement for Timeform-based production scoring.
export function brisnetPaceEvidence(race){
 const eligible=race.horses.filter(h=>h.odds!=='SCR'&&h.included_in_frozen_field!==false&&(!h.entry_status||h.entry_status==='REGULAR'));
 const rows=eligible.map(h=>{
  const source=h.ratings;if(source?.provider!=='BRISNET')return null;
  const comparable=(source.lines||[]).slice(0,5).filter(l=>l.date<race.date&&(Date.parse(race.date)-Date.parse(l.date))/86400000<=365&&l.surface===race.surface&&l.furlongs!==null&&Math.abs(l.furlongs-race.distance_furlongs)<=.5);
  const latest=comparable[0]||null,fts=h.life_starts===0;
  return {program:h.n,name:h.name,style:fts||source.run_style==='NA'?'Unknown':source.run_style,quirin:fts?null:source.quirin_points,matched:comparable.length,date:fts?null:latest?.date||null,e1:fts?null:latest?.e1??null,e2:fts?null:latest?.e2??null,late:fts?null:latest?.late??null,turn:fts?null:latest?.turn_time??null,shape1:fts?null:latest?.shape1??null,shape2:fts?null:latest?.shape2??null,speed:fts?null:latest?.speed??null,prime_power:source.prime_power,source_page:latest?.source.page||h.source_evidence?.page,status:fts?'FTS - Unknown':latest?'Latest matched line; missing cells remain Unknown':'No matched pace line'};
 }).filter(Boolean);
 return {available:rows.length>0,rows,pars:race.brisnet_pars,method:'Brisnet only: latest eligible line among the first five, within 365 days, same surface and within 0.5 furlong. No fallback to an unmatched race. E1/E2 measure different calls in sprints and routes; do not combine them across categories. These are observed source figures, not projected finishing positions or model scores.'};
}
