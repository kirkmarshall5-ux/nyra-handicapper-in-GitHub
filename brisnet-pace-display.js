// Source-aware display only. Never maps Brisnet values into Timeform inputs.
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const cat=d=>finite(d)?d>=8?'route':'sprint':null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const value=v=>finite(v)?String(v):'Unknown';
const eligible=h=>h.odds!=='SCR'&&h.included_in_frozen_field!==false&&(!h.entry_status||h.entry_status==='REGULAR');
const validLine=(l,r)=>l.source?.provider==='BRISNET'&&typeof l.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(l.date)&&Number.isFinite(Date.parse(l.date))&&new Date(l.date).toISOString().slice(0,10)===l.date&&l.date<r.date;
export function brisnetPaceDisplay(race){
 const category=cat(race.distance_furlongs),earlyKey=category==='route'?'e2':'e1',rows=[];
 for(const h of race.horses.filter(eligible)){
  if(h.ratings?.provider!=='BRISNET')continue;
  const fts=h.life_starts===0,experienced=Number.isInteger(h.life_starts)&&h.life_starts>0;
  const source=(h.ratings.lines||[]).slice(0,5),latest=experienced&&validLine(source[0]||{},race)?source[0]:null;
  const matched=experienced?source.filter(l=>validLine(l,race)&&(Date.parse(race.date)-Date.parse(l.date))/864e5<=365&&l.surface===race.surface&&finite(l.furlongs)&&category!==null&&cat(l.furlongs)===category&&Math.abs(l.furlongs-race.distance_furlongs)<=.5):[];
  const metrics={};for(const key of ['e1','e2','late']){const l=matched.find(l=>finite(l[key])&&l[key]>=0);metrics[key]=l?{value:l[key],date:l.date,page:l.source.page}:null;}
  const turn=matched.find(l=>finite(l.e1)&&l.e1>=0&&finite(l.e2)&&l.e2>=0);metrics.turn=turn?{value:turn.e2-turn.e1,date:turn.date,page:turn.source.page}:null;
  const rawStyle=h.ratings.run_style,style=experienced&&['E','E/P','P','S'].includes(rawStyle)?rawStyle:'Unknown';
  rows.push({n:h.n,name:h.name,fts,style,quirin:experienced&&finite(h.ratings.quirin_points)&&h.ratings.quirin_points>=0&&h.ratings.quirin_points<=8?h.ratings.quirin_points:null,matched:matched.length,metrics,early_key:earlyKey,early:metrics[earlyKey]?.value??null,late:metrics.late?.value??null,latest,latest_matches:latest?matched.includes(latest):false,status:fts?'First-time starter - Unknown':!experienced?'Career starts unverified':matched.length?'Comparable pace history available':'No matching pace line - historical figures are context only'});
 }
 const leaders={};for(const key of ['e1','e2','late','turn']){
  const observed=rows.filter(h=>h.metrics[key]).map(h=>({n:h.n,name:h.name,...h.metrics[key]})).sort((a,b)=>b.value-a.value||String(a.n).localeCompare(String(b.n),undefined,{numeric:true}));
  leaders[key]=observed.map(h=>({...h,rank:1+observed.filter(q=>q.value>h.value).length}));
  for(const h of rows){const entry=leaders[key].find(x=>String(x.n)===String(h.n));if(entry)h.metrics[key].rank=entry.rank;}
 }
 return {provider:'BRISNET',available:rows.length>0,category,early_key:earlyKey,rows,leaders,method:'Latest available figure separately for E1, E2 and LP among the latest five actual starts: within 365 days, same surface, same sprint/route category and within 0.5 furlong. Each cell carries its own date. No unmatched fallback. Turn = E2 minus E1 from the same historical race. Tied figures share rank. These are historical figure ranks, not predicted positions or winning probabilities.'};
}
const names={e1:'E1',e2:'E2',late:'LP',turn:'Turn index'};
const cell=m=>m?`<b>${m.value}</b><div class="tiny muted">${esc(m.date)} · p${m.page??'?'}</div>`:'Unknown';
export function brisnetPaceMapHtml(model,{compact=false}={}){
 const labels=model.category==='route'?{e1:'First call, usually 4f',e2:'Second call, usually 6f',late:'Second call to finish',turn:'E2 - E1, index points'}:{e1:'First call, usually 2f',e2:'Second call, usually 4f',late:'Second call to finish',turn:'E2 - E1, index points'};
 const counts=model.rows.filter(h=>h.early!==null).length;
 const lead='<div class="small muted">Brisnet source styles and comparable historical figures. '+counts+'/'+model.rows.length+' eligible runners have matched '+model.early_key.toUpperCase()+' evidence for the current native model rule.</div>';
 const ranks='<div style="overflow-x:auto"><table><thead><tr><th>Metric</th><th>Measures</th><th>Highest comparable figures</th></tr></thead><tbody>'+Object.keys(names).map(k=>'<tr><td>'+names[k]+'</td><td>'+labels[k]+'</td><td>'+(model.leaders[k].length?model.leaders[k].filter(h=>h.rank<=3).map(h=>`#${esc(h.n)} ${esc(h.name)}: ${h.value} (rank ${h.rank})`).join('<br>'):'Unknown - no comparable source figures')+'</td></tr>').join('')+'</tbody></table></div>';
 const lanes=['E','E/P','P','S'].map(s=>'<div class="pace-lane"><b>'+s+'</b><div class="lane">'+(model.rows.filter(h=>h.style===s).map(h=>`<div class="runner"><b>#${esc(h.n)}</b> ${esc(h.name)}<div class="tiny muted">Brisnet ${s} · early-speed points ${value(h.quirin)}${h.matched?'':' · no matching pace line'}</div></div>`).join('')||'<span class="muted">None listed</span>')+'</div></div>').join('');
 const unknown=model.rows.filter(h=>h.style==='Unknown');
 const summary='<div class="note small"><b>Comparable pace leaders</b><div>'+[model.early_key,'late'].map(k=>names[k]+': '+(model.leaders[k].filter(h=>h.rank<=3).map(h=>'#'+esc(h.n)+' '+esc(h.name)+' ('+h.value+')').join(' · ')||'Unknown')).join('<br>')+'</div></div>';
 return lead+(compact?summary:ranks)+'<h4>Printed Brisnet running styles</h4>' +lanes+(unknown.length?'<div class="note small"><b>Unknown style / first-time starters</b><div>'+unknown.map(h=>'#'+esc(h.n)+' '+esc(h.name)+' - '+esc(h.status)).join('<br>')+'</div></div>':'')+'<div class="tiny muted">E = early; E/P = early/presser; P = presser; S = closer. Early-speed points range 0-8 and are a different measure from E1/E2/LP. Styles are source descriptions, not guarantees of today\'s trip.</div>';
}
export function brisnetCallRanksHtml(model){
 return '<div class="note small">Ranks compare historical matched figures within this field. They do not predict fractional running positions or finishing order. No Brisnet-to-Timeform conversion is used.</div><div style="overflow-x:auto"><table><thead><tr><th>Horse</th><th>E1 rank / figure</th><th>E2 rank / figure</th><th>LP rank / figure</th><th>Turn rank / index</th></tr></thead><tbody>'+model.rows.map(h=>'<tr><td>#'+esc(h.n)+' '+esc(h.name)+'</td>'+['e1','e2','late','turn'].map(k=>'<td>'+(h.metrics[k]?'<b>'+h.metrics[k].rank+'</b> / '+cell(h.metrics[k]):'Unknown')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><div class="tiny muted">'+esc(model.method)+'</div>';
}
export function brisnetEvidenceHtml(model,{sourceOnly=false}={}){
 const scored='<h3 class="sectiontitle">Brisnet pace inputs used by the native models</h3><div class="small muted">Contender: '+model.early_key.toUpperCase()+' and LP. MIX1: '+model.early_key.toUpperCase()+' only (17 nominal weight points, missing components reweighted). V4.4c-Brisnet base: no pace weight. Only runners accepted by model source-validation gates contribute to scoring. Historical shape, turn index and early-speed points are review evidence; no extra score bonus is added.</div>';
 const inputs='<div style="overflow-x:auto"><table><thead><tr><th>Horse / matched starts</th><th>Early model input ('+model.early_key.toUpperCase()+')</th><th>Contender LP input</th></tr></thead><tbody>'+model.rows.map(h=>'<tr><td>#'+esc(h.n)+' '+esc(h.name)+'<div class="tiny muted">'+h.matched+' matches · '+esc(h.status)+'</div></td><td>'+cell(h.metrics[model.early_key])+'</td><td>'+cell(h.metrics.late)+'</td></tr>').join('')+'</tbody></table></div>';
 const context='<h4>Latest listed start - source context</h4><div class="small muted">Unmatched starts remain visible here and are excluded from the comparable pace ranks and pace scoring. LP covers a distance-dependent finishing segment. Brisnet Speed is separate from pace.</div><div style="overflow-x:auto"><table><thead><tr><th>Horse / date / surface / distance</th><th>E1</th><th>E2</th><th>LP</th><th>Brisnet Speed</th><th>Use in matched pace rule</th></tr></thead><tbody>'+model.rows.map(h=>{const l=h.latest;return '<tr><td>#'+esc(h.n)+' '+esc(h.name)+(l?'<div class="tiny muted">'+esc(l.date)+' · '+esc(l.surface)+' · '+value(l.furlongs)+'f · p'+l.source.page+'</div>':'<div class="tiny muted">'+esc(h.status)+'</div>')+'</td>'+['e1','e2','late','speed'].map(k=>'<td>'+value(l?.[k])+'</td>').join('')+'<td>'+(l?h.latest_matches?'Comparable':'Unmatched - context only':'Unknown')+'</td></tr>';}).join('')+'</tbody></table></div>';
 return sourceOnly?context:scored+inputs+context;
}
export function brisnetContextHtml(race,model){
 return model.rows.map(h=>{const l=h.latest,age=l?(Date.parse(race.date)-Date.parse(l.date))/864e5:null;return '<div class="card span4"><b>#'+esc(h.n)+' '+esc(h.name)+'</b><div class="small">Source style: '+esc(h.style)+' · early-speed points '+value(h.quirin)+'<br>Comparable starts: '+h.matched+'<br>Days since latest listed start: '+value(age)+'<br>Latest Speed: '+value(l?.speed)+'</div><div class="tiny muted">'+esc(h.status)+'. Workouts, trip adjustments and opposition remain unscored. Model methods are available in Knowledge Base.</div></div>';}).join('');
}

// Consolidated display only; the source selection, metric ranks and native models are unchanged.
export function brisnetComparisonHtml(model){
 return '<div class="small muted" style="margin-bottom:10px">Higher figures are faster; rank 1 is highest in this field. Historical comparisons, not predicted running positions. Contender early input: '+model.early_key.toUpperCase()+'; late input: LP. Each figure keeps its own source date.</div><table class="pace-comparison-table"><thead><tr><th>Horse / matched starts</th><th>Style</th><th>Early points</th><th>E1 rank / figure</th><th>E2 rank / figure</th><th>LP rank / figure</th><th>Turn rank / index</th></tr></thead><tbody>'+model.rows.map(h=>'<tr><td><b>#'+esc(h.n)+' '+esc(h.name)+'</b><div class="tiny muted">'+h.matched+' matches · '+esc(h.status)+'</div></td><td>'+esc(h.style)+'</td><td>'+value(h.quirin)+'</td>'+['e1','e2','late','turn'].map(k=>'<td>'+(h.metrics[k]?'<b>'+h.metrics[k].rank+'</b> / '+cell(h.metrics[k]):'Unknown')+'</td>').join('')+'</tr>').join('')+'</tbody></table><div class="tiny muted" style="margin-top:8px">Unknown means missing comparable evidence, not zero. Turn index and early-speed points add no extra model bonus.</div>';
}
