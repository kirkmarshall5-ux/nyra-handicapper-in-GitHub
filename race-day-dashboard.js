import {rankRRV2} from './rr-v2.js';
import {paperEligibility,paperTickets} from './paper-results.js';
import {modelEvidence} from './model-evidence-display.js?v=20261115-beyer';
import {ftsResearch} from './fts-research.js?v=20261118-fts-month';
// Shared rankings and paper settlement for matching race cards.
import {matchingCard} from './dual-pp-cards.js?v=20261018-dual1';
import {releaseRace} from './rankings-release.js?v=20261115-beyer';
import {rankContenders} from './contender-rankings.js?v=20261115-beyer';
import {rankBrisnetModels} from './brisnet-models.js?v=20261113-status';
import {rankBrisnetResearch} from './brisnet-research.js?v=20261113-status';
import {rankFinishers} from './finisher-inputs.js?v=20261115-beyer';
import {decodeTodayDistance} from './finisher-drf-distance.js?v=20261018-5316';

const active=h=>h.odds!=='SCR'&&h.included_in_frozen_field!==false&&(!h.entry_status||h.entry_status==='REGULAR');
const program=h=>String(h.n??'').trim().toUpperCase();
// Country suffixes and punctuation can differ between PP publishers. Word order cannot.
const name=h=>String(h.name??'').replace(/\s*\([A-Za-z]{2,3}\)\s*$/,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const key=h=>name(h);
const field=r=>(r?.horses||[]).filter(active);
const distance=r=>Number.isFinite(r?.distance_furlongs)?r.distance_furlongs:decodeTodayDistance(r?.conditions?.primaryDistanceLine||r?.header||r?.dist).furlongs;
const compare=(a,b)=>program(a).localeCompare(program(b),undefined,{numeric:true});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={brisContender:'Brisnet Contender',brisResearch:'Brisnet-RR',drfContender:'DRF Contender',brisRRV2:'RR-V2',morningLine:'Morning Line'};
const modelIds=['brisContender','brisResearch','drfContender','brisRRV2'];
const gridModelIds=['brisResearch','brisRRV2','brisContender','drfContender'];
const providerFor=id=>id.startsWith('bris')?'BRISNET':'DRF';
export function morningLineNumber(value){
 const s=String(value??'').trim();
 if(/^\d+(?:\.\d+)?$/.test(s))return Number(s);
 const m=s.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
 return m&&Number(m[2])>0?Number(m[1])/Number(m[2]):Infinity;
}
function identityIssue(r){
 const rows=field(r);
 return !rows.length||rows.some(h=>!name(h))||new Set(rows.map(key)).size!==rows.length||new Set(rows.filter(h=>program(h)).map(program)).size!==rows.filter(h=>program(h)).length;
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
 if(field(anchor).some(h=>{const other=field(r).find(x=>key(x)===key(h));return program(h)&&program(other)&&program(h)!==program(other);}))return 'Entrants or scratches differ; excluded';
 return null;
}
// Choose a single matching PP that actually contains morning-line quotes.
// Newer unpriced early editions must not hide a priced matching card.
export function selectMorningLineProvider({anchor,sources,preferredProvider='DRF',importedAt={}}){
 const candidates=['DRF','BRISNET'].filter(p=>!sourceIssue(anchor,sources[p])&&field(sources[p].race).some(h=>Number.isFinite(morningLineNumber(h.ml))));
 const stamp=p=>Date.parse(importedAt[p])||0;
 candidates.sort((a,b)=>stamp(b)-stamp(a)||(a===preferredProvider?-1:b===preferredProvider?1:0));
 return candidates[0]||preferredProvider;
}
export function morningLineForRunner(source,h){
 const matches=(source?.horses||[]).filter(x=>key(x)===key(h));
 if(matches.length!==1)return null;
 const found=matches[0];
 if(program(found)&&program(h)&&program(found)!==program(h))return null;
 return Number.isFinite(morningLineNumber(found.ml))?found.ml:null;
}
function forecast(id,r){
 if(id==='brisContender')return rankBrisnetModels(r)?.contender||{rankings:[],decision:'HOLD',reason:'Brisnet source unavailable'};
 if(id==='brisResearch')return rankBrisnetResearch(r)||{rankings:[],decision:'HOLD',reason:'Brisnet source unavailable'};
 if(id==='brisRRV2')return rankRRV2(r)||{rankings:[],decision:'HOLD',reason:'Brisnet source unavailable'};
 const base=releaseRace(r);
 return {...rankContenders(r,base,{displayPass:base.decision==='PASS'}),runners:base.runners};
}
function drfBlend(r){
 const horses=field(r),race={...r,horses};
 const fullControl=releaseRace(race),finisher=rankFinishers(race);
 const finisherNames=new Set(finisher.rankings.map(key));
 const common=horses.filter(h=>finisherNames.has(key(h)));
 const partial=common.length!==horses.length||fullControl.decision!=='RATEABLE';
 const control=partial&&common.length?releaseRace({...race,horses:common}):fullControl;
 if(control.decision!=='RATEABLE'||!common.length){
  return {decision:'PASS',reason:'No shared ratings from V4.4c and Finisher',rankings:[]};
 }
 const topFour=rankings=>new Map(rankings.slice(0,4).map((h,i)=>[key(h),{horse:h,points:4-i}]));
 const v=topFour(control.rankings),f=topFour(finisher.rankings);
 return {
  decision:partial?'PASS':'RESEARCH',
  reason:partial?`Provisional rankings for ${common.length} of ${horses.length} active runners`:null,
  rankings:[...new Set([...v.keys(),...f.keys()])].map(id=>{
   const controlPoints=v.get(id)?.points??0,finisherPoints=f.get(id)?.points??0;
   return {horse:(v.get(id)||f.get(id)).horse,score:2*controlPoints+finisherPoints,controlPoints};
  }).sort((a,b)=>b.score-a.score||b.controlPoints-a.controlPoints)
   .slice(0,4).map(({horse,score},i)=>({rank:i+1,n:program(horse),name:horse.name,score}))
 };
}
function summarize(id,r,result,reason){
 const allowed=new Set(field(r).map(key)),rows=result?.rankings||[];
 if(!reason&&(new Set(rows.map(key)).size!==rows.length||rows.some(h=>!allowed.has(key(h))||field(r).some(x=>key(x)===key(h)&&program(x)&&program(h)&&program(x)!==program(h)))))reason='Forecast contains duplicate or unmatched runners; excluded';
 const rankings=reason?[]:rows.map((h,i)=>({rank:i+1,n:program(h),name:h.name,score:h.score??null}));
 return {id,label:labels[id],provider:providerFor(id),available:!reason,reason:reason||result?.reason||null,model_id:result?.model_id||null,validation_status:result?.validation_status||(result?.research_only?'PENDING':null),decision:reason?'UNAVAILABLE':result?.decision||'HOLD',status:result?.status||result?.ranking_status||null,recovery_status:result?.recovery_status||null,recovery_reasons:result?.recovery_reasons||[],ranked:rankings.length,eligible:field(r).length,complete:!reason&&rankings.length===field(r).length&&rankings.length>0,unrated:reason?[]:modelEvidence(r,result).unranked.map(h=>({n:program(h),name:h.name,reasons:h.reasons})),rankings};
}
export function paperPlan(rankings,eligible=rankings,model={decision:'RATEABLE'}){
 const eligibility=paperEligibility({...model,rankings},eligible);
 return {available:eligibility.included,eligibility,reason:eligibility.reasons.join('; ')||null,tickets:eligibility.included?paperTickets(rankings):[],total_cost:eligibility.included?4:0};
}
export function buildRaceDashboard({anchor,sources,morningLineProvider='DRF',officialStarterRoster=null,officialStarterSource=null},ranker=forecast){
 morningLineProvider=selectMorningLineProvider({anchor,sources,preferredProvider:morningLineProvider});
 const starterAudit={status:'NOT_PROVIDED',source:officialStarterSource||null,missing:[],inactiveInPP:[],absentFromPP:[],unexpected:[],identityMismatch:[]};
 if(officialStarterRoster!==null){
  if(!Array.isArray(officialStarterRoster)||!officialStarterRoster.length||typeof officialStarterSource!=='string'||!officialStarterSource.startsWith('https://'))starterAudit.status='UNVERIFIED_ROSTER';
  else {
   const actual=field(anchor),byProgram=new Map(actual.map(h=>[program(h),h]));
   const official=new Map();let invalid=false;
   for(const h of officialStarterRoster){const p=String(h?.program??'').trim().toUpperCase(),n=name({name:h?.horse});if(!p||!n||official.has(p)){invalid=true;continue;}official.set(p,n);const active=byProgram.get(p);if(!active){starterAudit.missing.push(p);if((anchor?.horses||[]).some(h=>program(h)===p))starterAudit.inactiveInPP.push(p);else starterAudit.absentFromPP.push(p);}else if(name(active)!==n)starterAudit.identityMismatch.push(p);}
   for(const h of actual)if(!official.has(program(h)))starterAudit.unexpected.push(program(h));
   starterAudit.status=invalid?'UNVERIFIED_ROSTER':starterAudit.missing.length||starterAudit.unexpected.length||starterAudit.identityMismatch.length?'MISMATCH':'MATCHES_SUPPLIED_ROSTER';
  }
 }
 const checks=Object.fromEntries(['BRISNET','DRF'].map(p=>[p,sourceIssue(anchor,sources[p])]));
 const models=modelIds.map(id=>{const p=providerFor(id),r=sources[p]?.race;
  return summarize(id,r,checks[p]?null:ranker(id,r),checks[p]);
 });
 const mlRace=sources[morningLineProvider]?.race,mlReason=checks[morningLineProvider]||null;
 // Stable source order resolves equal morning lines, matching the existing ML panel.
 const mlRows=mlReason?[]:field(mlRace).filter(h=>Number.isFinite(morningLineNumber(h.ml))).sort((a,b)=>morningLineNumber(a.ml)-morningLineNumber(b.ml)).map((h,i)=>({rank:i+1,n:program(h),name:h.name,ml:h.ml}));
 const ml={id:'morningLine',label:labels.morningLine,provider:morningLineProvider,available:!mlReason,reason:mlReason,ranked:mlRows.length,eligible:field(mlRace).length,rankings:mlRows,complete:!mlReason&&mlRows.length===field(mlRace).length};
 const primePower=checks.BRISNET?{}:Object.fromEntries(field(sources.BRISNET.race).map(h=>[key(h),h.ratings?.prime_power_display||(Number.isFinite(h.ratings?.prime_power)?h.ratings.prime_power.toFixed(1):null)]));
 const fts=Object.fromEntries(field(anchor).flatMap(h=>{
  const other=!checks.BRISNET?field(sources.BRISNET?.race).find(q=>key(q)===key(h)):null;
  const life=h.life_starts??h.lifeStarts;
  if(life!==0&&!(life==null&&(other?.life_starts??other?.lifeStarts)===0))return [];
  const evidence=other&&(other.life_starts??other.lifeStarts)===0?other:h;
  return [[key(h),ftsResearch({...evidence,life_starts:0},anchor)]];
 }));
 const blend=checks.DRF?null:drfBlend(sources.DRF.race);
 const maps=Object.fromEntries([...models,ml].map(m=>[m.id,new Map(m.rankings.map(h=>[key(h),h.rank]))]));
 const resolvedProgram=h=>{
  if(program(h))return program(h);
  const matches=[...models,ml].flatMap(m=>m.rankings.filter(x=>key(x)===key(h)&&program(x)).map(program));
  return new Set(matches).size===1?matches[0]:'';
 };
 const shortlist=field(anchor).map(h=>({n:resolvedProgram(h),name:h.name,ranks:Object.fromEntries(Object.entries(maps).map(([id,map])=>[id,map.get(key(h))??null]))})).map(h=>({...h,top_four_models:modelIds.filter(id=>h.ranks[id]!=null&&h.ranks[id]<=4).length})).filter(h=>h.top_four_models>0||h.ranks.morningLine!=null&&h.ranks.morningLine<=4).sort((a,b)=>b.top_four_models-a.top_four_models||compare(a,b));
 const selected=new Set(shortlist.map(key));
 const remaining=field(anchor).filter(h=>!selected.has(key(h))).map(h=>({n:resolvedProgram(h),name:h.name,ranks:Object.fromEntries(Object.entries(maps).map(([id,map])=>[id,map.get(key(h))??null])),top_four_models:0})).filter(h=>modelIds.some(id=>h.ranks[id]!=null)).sort(compare);
 const visible=new Set([...shortlist,...remaining].map(key));
 const unranked=field(anchor).filter(h=>!visible.has(key(h))).map(h=>({n:program(h),name:h.name,ranks:Object.fromEntries(Object.entries(maps).map(([id,map])=>[id,map.get(key(h))??null])),top_four_models:0})).sort(compare);
 return {drf_blend:blend,fts_research:fts,has_fts:Object.keys(fts).length>0,prime_power:primePower,schema:'nyra-race-dashboard-v1',race:{track:anchor.track,date:anchor.date,number:anchor.race,surface:anchor.surface,distance:anchor.dist},field:field(anchor).map(h=>({n:program(h),name:h.name})),models,morning_line:ml,shortlist,remaining,unranked,starter_audit:starterAudit,issues:[...new Set(Object.values(checks).filter(Boolean))],paper_plans:Object.fromEntries([...models,ml].map(m=>[m.id,{decision:m.decision||'REFERENCE',...paperPlan(m.rankings,field(anchor),['MISMATCH','UNVERIFIED_ROSTER'].includes(starterAudit.status)?{...m,available:false,reason:'Official starter roster mismatch or unverified roster; review the named starter audit.'}:m)}])),betting_enabled:false};
}
export function dashboardHtml(d,selected='brisResearch'){
 const ftsCell=h=>{
  const f=d.fts_research?.[key(h)];if(!f)return '—';
  const ped=f.pedigree?f.pedigree.score.toFixed(1)+f.pedigree.flag:f.pedigree_status==='TAPETA_UNVALIDATED'?'— (Tapeta untested)':f.pedigree_status==='REUPLOAD_REQUIRED'?'— (re-upload Brisnet PP)':'—';
  const t=f.trainer,w=f.workouts;
  const trainer=t?`${t.category}: ${t.win_pct}% / ${t.starts}`:'Trainer debut: unavailable';
  const work=w.percentile===null?'WORK —':`WORK ${Math.round(w.percentile)}/100 (${w.compared} ${w.compared===1?'work':'works'})`;
  const recency=w.latest_days===null?'Recent works unavailable':`${w.count30} in 30d · latest ${w.latest_days}d ago`;
  return `<div class="fts-research-cell"><b>${f.birth_month?`(${esc(f.birth_month)}) `:''}PED ${esc(ped)}</b><span>${esc(trainer)}</span><span>${esc(work)} · ${esc(recency)}</span></div>`;
 };
 const visibleModelIds=d.drf_blend?[...gridModelIds,'drfBlend']:gridModelIds;
 const blendRanks=new Map((d.drf_blend?.rankings??[]).map(h=>[key(h),h.rank]));
 const row=h=>`<tr><th scope="row">${h.n?'#'+esc(h.n)+' ':''}${esc(h.name)}</th><td>${esc(d.prime_power?.[key(h)]||'—')}</td>${[...visibleModelIds,'morningLine'].map(id=>`<td${id==='brisResearch'?' class="model-rr"':''}>${(id==='drfBlend'?blendRanks.get(key(h)):h.ranks[id])??'—'}</td>`).join('')}${d.has_fts?`<td>${ftsCell(h)}</td>`:''}</tr>`;
 const table=rows=>`<div class="dashboard-scroll" tabindex="0" role="region" aria-label="Model ranking comparison"><table class="dashboard-table"><thead><tr><th scope="col">Horse</th><th scope="col">Prime Power</th><th scope="col" class="model-rr">Brisnet-RR</th><th scope="col">RR-V2</th><th scope="col">Brisnet<br>Contender</th><th scope="col">DRF Contender<br>Late +50%</th>${d.drf_blend?'<th scope="col" title="DRF-only challenger. Twice the points for V4.4c, with a secondary ranking contributing to the top-four order.">DRF V4.4c<br>Blend</th>':''}<th scope="col">M/L<br>rank</th>${d.has_fts?'<th scope="col">FTS<br>Research</th>':''}</tr></thead><tbody>${rows.map(row).join('')}</tbody></table></div>`;
 return `<div class="dashboard-heading"><div><div class="kicker">Race day dashboard</div><h3 class="sectiontitle">Shared selections &amp; order</h3></div><span class="badge">${d.field.length} eligible runners</span></div>
 ${d.demonstration?'<p class="small muted">Demonstration card · upload current PPs before use.</p>':''}
 <div class="dashboard-readiness">${gridModelIds.map(id=>d.models.find(m=>m.id===id)).filter(Boolean).map(m=>`<div${m.id==='brisResearch'?' class="model-rr-summary"':''}><b>${esc(m.label)}</b><span>${m.available?`${m.ranked}/${m.eligible} ranked · ${m.complete?'full field':'incomplete field'} · ${esc(m.decision)}`:esc(m.reason)}</span>${m.recovery_status==='RECOVERED'?`<small>RATEABLE — Recovered: ${m.recovery_reasons.map(h=>esc('#'+h.n+' '+h.name+': '+h.reasons.join('; '))).join(' · ')}</small>`:''}${m.validation_status==='PENDING'?'<small class="muted">Validation pending</small>':''}${m.unrated?.length?`<details class="tiny muted"><summary>PASS/HOLD: ${m.unrated.length} unranked starter${m.unrated.length===1?'':'s'}</summary><ul>${m.unrated.map(h=>`<li>#${esc(h.n)} ${esc(h.name)}: ${h.reasons.map(esc).join('; ')}</li>`).join('')}</ul></details>`:''}</div>`).join('')}</div>
 ${d.drf_blend?.decision==='PASS'?`<p class="tiny muted">DRF Blend PASS · ${esc(d.drf_blend.reason)}</p>`:''}
 ${d.issues.length?`<p class="small bad" role="status">${d.issues.map(esc).join(' · ')}</p>`:''}
 ${d.starter_audit?.status==='MISMATCH'?`<p class="small bad" role="status">Official starter roster mismatch: missing ${esc(d.starter_audit.missing.join(', ')||'none')}; unexpected ${esc(d.starter_audit.unexpected.join(', ')||'none')}; identity mismatch ${esc(d.starter_audit.identityMismatch.join(', ')||'none')}. Structured freeze validation rejects this supplied-roster mismatch; the separate local Freeze All Models action is not certified.</p>`:d.starter_audit?.status==='MATCHES_SUPPLIED_ROSTER'?'<p class="tiny muted">Active field matches supplied starter roster; source and timing remain independently unverified.</p>':d.starter_audit?.status==='UNVERIFIED_ROSTER'?'<p class="small bad">Supplied starter roster is invalid or lacks an HTTPS source reference.</p>':''}
 <p class="tiny muted">Horse rows are ordered by Brisnet RR rank; RR-unranked runners follow in program-number order. Other model rankings remain independent.</p>
 <p class="tiny muted">Prime Power shows the number and rank printed in the Brisnet PP; printed ranks stay unchanged after scratches. RATEABLE means the field has ranking evidence; model validation and pre-race freeze verification are separate. Other numbers are each system’s rank. “—” means unranked or unavailable. ${d.has_fts?'FTS Research shows pedigree, trainer debut stats and recent workout percentile; it does not change model ranks. ?/* flag small pedigree samples.':''}</p>
 ${[...d.shortlist,...(d.remaining||[]),...(d.unranked||[])].length?table([...d.shortlist,...(d.remaining||[]),...(d.unranked||[])].sort((a,b)=>(a.ranks.brisResearch??Infinity)-(b.ranks.brisResearch??Infinity)||compare(a,b))):'<p class="small muted">Load verified PPs to compare selections.</p>'}
 <p class="tiny muted dashboard-footer">Morning line: ${esc(d.morning_line.provider)} · ${d.morning_line.ranked}/${d.morning_line.eligible} priced.</p><div class="dashboard-plan-controls"><button type="button" class="secondary" id="dashboardFreeze">Freeze full card</button><span id="dashboardSnapshotStatus" class="tiny muted" role="status"></span></div>`;
}
