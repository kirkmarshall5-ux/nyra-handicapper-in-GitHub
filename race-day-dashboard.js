// Read-only organization of existing forecasts. No new rating or betting rule.
import {matchingCard} from './dual-pp-cards.js?v=20261018-dual1';
import {releaseRace} from './rankings-release.js?v=20261008-qa1';
import {rankContenders} from './contender-rankings.js?v=20261011-passdisplay1';
import {rankBrisnetModels} from './brisnet-models.js?v=20261023-distance1';
import {rankFinishers} from './finisher-inputs.js';
import {decodeTodayDistance} from './finisher-drf-distance.js?v=20261018-5316';

const active=h=>h.odds!=='SCR'&&h.included_in_frozen_field!==false&&(!h.entry_status||h.entry_status==='REGULAR');
const program=h=>String(h.n??'').trim().toUpperCase();
// Country suffixes and punctuation can differ between PP publishers. Word order cannot.
const name=h=>String(h.name??'').replace(/\s*\([A-Za-z]{2,3}\)\s*$/,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const key=h=>JSON.stringify([program(h),name(h)]);
const field=r=>(r?.horses||[]).filter(active);
const distance=r=>Number.isFinite(r?.distance_furlongs)?r.distance_furlongs:decodeTodayDistance(r?.conditions?.primaryDistanceLine||r?.header||r?.dist).furlongs;
const compare=(a,b)=>program(a).localeCompare(program(b),undefined,{numeric:true});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={brisContender:'Brisnet Contender',drfContender:'DRF Contender',drfFinisher:'DRF Finisher',morningLine:'Morning Line'};
const modelIds=['brisContender','drfContender','drfFinisher'];
export function morningLineNumber(value){
 const s=String(value??'').trim();
 if(/^\d+(?:\.\d+)?$/.test(s))return Number(s);
 const m=s.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
 return m&&Number(m[2])>0?Number(m[1])/Number(m[2]):Infinity;
}
function identityIssue(r){
 const rows=field(r);
 return !rows.length||rows.some(h=>!program(h)||!name(h))||new Set(rows.map(key)).size!==rows.length||new Set(rows.map(program)).size!==rows.length;
}
function sourceIssue(anchor,source){
 if(!source?.race)return source?.reason||'Matching PP not loaded';
 const r=source.race;
 if(!matchingCard(anchor,r)||Number(anchor.race)!==Number(r.race))return 'Race identity differs; excluded';
 if(identityIssue(anchor)||identityIssue(r))return 'Runner identities need verification; excluded';
 const aDistance=distance(anchor),bDistance=distance(r);
 if(anchor.surface!==r.surface||aDistance!=null&&bDistance!=null&&aDistance!==bDistance)return 'Race conditions differ; excluded';
 const a=field(anchor).map(key).sort(),b=field(r).map(key).sort();
 if(JSON.stringify(a)!==JSON.stringify(b))return 'Entrants or scratches differ; excluded';
 return null;
}
function forecast(id,r){
 if(id==='brisContender')return rankBrisnetModels(r)?.contender||{rankings:[],decision:'HOLD',reason:'Brisnet source unavailable'};
 if(id==='drfFinisher'){
  const result=rankFinishers(r),base=releaseRace(r);
  return {...result,decision:result.status==='COMPLETE_FIELD'&&base.decision!=='PASS'?'RESEARCH':'PASS'};
 }
 const base=releaseRace(r);
 return rankContenders(r,base,{displayPass:base.decision==='PASS'});
}
function summarize(id,r,result,reason){
 const allowed=new Set(field(r).map(key)),rows=result?.rankings||[];
 if(!reason&&(new Set(rows.map(key)).size!==rows.length||rows.some(h=>!allowed.has(key(h)))))reason='Forecast contains duplicate or unmatched runners; excluded';
 const rankings=reason?[]:rows.map((h,i)=>({rank:i+1,n:program(h),name:h.name,score:h.score??null}));
 return {id,label:labels[id],available:!reason,reason:reason||result?.reason||null,model_id:result?.model_id||null,decision:reason?'UNAVAILABLE':result?.decision||'HOLD',status:result?.status||result?.ranking_status||null,ranked:rankings.length,eligible:field(r).length,complete:!reason&&rankings.length===field(r).length&&rankings.length>0,rankings};
}
export function paperPlan(rankings,eligible=rankings){
 const h=rankings.slice(0,3),ticket=(label,cost,pairs)=>({label,cost,combinations:pairs});
 // Coupled interests require entry-level settlement rules, not horse-level boxes.
 if(eligible.some(x=>!/^\d+$/.test(String(x.n))))return {available:false,reason:'Coupled or nonnumeric programs require an entry-level ticket check',tickets:[],total_cost:0};
 const tickets=[];
 if(h[0])tickets.push(ticket('$2 win + $2 place on rank 1',4,[[h[0].n]]));
 if(h[1]){
  tickets.push(ticket('$2 place on rank 2',2,[[h[1].n]]));
  tickets.push(ticket('$1 exacta · top two box',2,[[h[0].n,h[1].n],[h[1].n,h[0].n]]));
 }
 if(h[2])tickets.push(ticket('$1 exacta · top three box',6,h.flatMap(a=>h.filter(b=>b!==a).map(b=>[a.n,b.n]))));
 return {available:!!h.length,reason:h.length<3?'Fewer than three ranked runners; unavailable tickets omitted':null,tickets,total_cost:tickets.reduce((s,t)=>s+t.cost,0)};
}
export function buildRaceDashboard({anchor,sources,morningLineProvider='DRF'},ranker=forecast){
 const checks=Object.fromEntries(['BRISNET','DRF'].map(p=>[p,sourceIssue(anchor,sources[p])]));
 const models=modelIds.map(id=>{const p=id==='brisContender'?'BRISNET':'DRF',r=sources[p]?.race;
  return summarize(id,r,checks[p]?null:ranker(id,r),checks[p]);
 });
 const mlRace=sources[morningLineProvider]?.race,mlReason=checks[morningLineProvider]||null;
 // Stable source order resolves equal morning lines, matching the existing ML panel.
 const mlRows=mlReason?[]:field(mlRace).filter(h=>Number.isFinite(morningLineNumber(h.ml))).sort((a,b)=>morningLineNumber(a.ml)-morningLineNumber(b.ml)).map((h,i)=>({rank:i+1,n:program(h),name:h.name,ml:h.ml}));
 const ml={id:'morningLine',label:labels.morningLine,provider:morningLineProvider,available:!mlReason,reason:mlReason,ranked:mlRows.length,eligible:field(mlRace).length,rankings:mlRows,complete:!mlReason&&mlRows.length===field(mlRace).length};
 const maps=Object.fromEntries([...models,ml].map(m=>[m.id,new Map(m.rankings.map(h=>[key(h),h.rank]))]));
 const shortlist=field(anchor).map(h=>({n:program(h),name:h.name,ranks:Object.fromEntries(Object.entries(maps).map(([id,map])=>[id,map.get(key(h))??null]))})).map(h=>({...h,top_four_models:modelIds.filter(id=>h.ranks[id]!=null&&h.ranks[id]<=4).length})).filter(h=>h.top_four_models>0||h.ranks.morningLine!=null&&h.ranks.morningLine<=4).sort((a,b)=>b.top_four_models-a.top_four_models||compare(a,b));
 const selected=new Set(shortlist.map(key));
 const remaining=field(anchor).filter(h=>!selected.has(key(h))).map(h=>({n:program(h),name:h.name,ranks:Object.fromEntries(Object.entries(maps).map(([id,map])=>[id,map.get(key(h))??null])),top_four_models:0})).filter(h=>modelIds.some(id=>h.ranks[id]!=null)).sort(compare);
 return {schema:'nyra-race-dashboard-v1',race:{track:anchor.track,date:anchor.date,number:anchor.race,surface:anchor.surface,distance:anchor.dist},field:field(anchor).map(h=>({n:program(h),name:h.name})),models,morning_line:ml,shortlist,remaining,issues:[...new Set(Object.values(checks).filter(Boolean))],paper_plans:Object.fromEntries([...models,ml].map(m=>[m.id,{decision:m.decision||'REFERENCE',...paperPlan(m.rankings,field(anchor))}])),betting_enabled:false};
}
export function dashboardHtml(d,selected='drfContender'){
 const row=h=>`<tr><th scope="row">#${esc(h.n)} ${esc(h.name)}</th>${[...modelIds,'morningLine'].map(id=>`<td>${h.ranks[id]??'—'}</td>`).join('')}<td>${h.top_four_models}/3</td></tr>`;
 const table=rows=>`<div class="dashboard-scroll" tabindex="0" role="region" aria-label="Model ranking comparison"><table class="dashboard-table"><thead><tr><th scope="col">Horse</th><th scope="col">Brisnet<br>Contender</th><th scope="col">DRF<br>Contender</th><th scope="col">DRF<br>Finisher</th><th scope="col">M/L<br>rank</th><th scope="col">Models<br>top 4</th></tr></thead><tbody>${rows.map(row).join('')}</tbody></table></div>`;
 const source=[...d.models,d.morning_line].find(m=>m.id===selected)||d.models[1],plan=d.paper_plans[source.id];
 const selection=source.rankings.slice(0,3).map(h=>`#${esc(h.n)}`).join(' → ')||'No ranked selections';
 return `<div class="dashboard-heading"><div><div class="kicker">Race day dashboard</div><h3 class="sectiontitle">Shared selections &amp; order</h3></div><span class="badge">${d.field.length} eligible runners</span></div>
 ${d.demonstration?'<p class="small muted">Demonstration card · upload current PPs before use.</p>':''}
 <div class="dashboard-readiness">${d.models.map(m=>`<div><b>${esc(m.label)}</b><span>${m.available?`${m.ranked}/${m.eligible} ranked · ${m.complete?'full field':'incomplete field'} · ${esc(m.decision)}`:esc(m.reason)}</span></div>`).join('')}</div>
 ${d.issues.length?`<p class="small bad" role="status">${d.issues.map(esc).join(' · ')}</p>`:''}
 <p class="tiny muted">Numbers are each system’s rank. “—” means unranked or unavailable. Top-four agreement is descriptive; the two DRF models share inputs. No combined rating.</p>
 ${d.shortlist.length?table(d.shortlist.slice(0,6)):'<p class="small muted">Load verified PPs to compare selections.</p>'}
 ${d.shortlist.length>6?`<details class="dashboard-more"><summary>Show ${d.shortlist.length-6} more selections</summary>${table(d.shortlist.slice(6))}</details>`:''}
 ${(d.remaining||[]).length?`<details class="dashboard-remaining"><summary>Remaining ranked horses (${d.remaining.length})</summary>${table(d.remaining)}</details>`:''}
 <details class="dashboard-paper"><summary>Paper betting plan · your four test strategies</summary><div class="dashboard-plan-controls"><label for="dashboardPaperSource">Use rankings from</label><select id="dashboardPaperSource">${[...d.models,d.morning_line].map(m=>`<option value="${m.id}" ${m.id===source.id?'selected':''}>${esc(m.label)}</option>`).join('')}</select><span class="small">${selection}</span></div>
 <p class="tiny muted">${esc(source.decision||'Morning-line reference')} · Cost illustration only. Existing PASS rules remain in force. These overlapping strategies are tracked separately; total is the cost if all are played.</p>
 ${plan.available?`<div class="dashboard-tickets">${plan.tickets.map(t=>`<div><span>${esc(t.label)}</span><b>$${t.cost}</b></div>`).join('')}<div><strong>All available tests</strong><strong>$${plan.total_cost}</strong></div></div>`:'<p class="small muted">No paper tickets available.</p>'}${plan.reason?`<p class="tiny muted">${esc(plan.reason)}</p>`:''}</details>
 <p class="tiny muted dashboard-footer">Morning line: ${esc(d.morning_line.provider)} · ${d.morning_line.ranked}/${d.morning_line.eligible} priced. Confirm scratches and surface before freezing. Local exports use an unverified browser clock.</p><div class="dashboard-plan-controls"><button type="button" class="secondary" id="dashboardFreeze">Freeze full card</button><span id="dashboardSnapshotStatus" class="tiny muted" role="status"></span></div>`;
}
