import {quoteCapture,previewBudget,money,preRaceFreeze,sealedResearchExport} from './research-builder.js?v=20261009-integrity1';
const key='nyraResearchQuoteLogV1',settingsKey='nyraResearchBudgetV1',freezeKey='nyraResearchFreezesV1';
let context,lastRace='',records=[],freezes=[];
const el=id=>document.getElementById(id),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function budget(){return previewBudget({cash:money(el('researchCash').value),dailyStaked:money(el('researchDaily').value),cap:money(el('researchCap').value),floor:money(el('researchFloor').value),outstandingBets:el('researchOutstanding').checked?1:0,alreadyBet:el('researchDuplicate').checked})}
function updatePreview(){
 const {rating}=context(),b=budget(),selected=rating.rankings.find(h=>String(h.n)===el('researchHorse').value),state=rating.decision==='RATEABLE'&&selected?.v44c_rank===1;
 el('researchPreview').innerHTML=`<b>Automated betting: PASS — validation pending</b><div class="small">${selected?escape(selected.name):'No rated selection'} · $2 win-ticket cost preview only.</div><div class="small">${b.allowed?'Budget check passes':escape(b.reasons.join('; '))} · cash after a hypothetical $2 stake: ${b.cashAfterPreview===null?'unknown':'$'+b.cashAfterPreview.toFixed(2)}.</div><div class="tiny muted">${state?'Locked #1 identified.':'Candidate rule requires a rateable race and its locked #1.'} ${b.policyOverride?'Edited limits are research overrides; they do not alter the frozen rule.':''} No bet is placed or recommended. Cash and daily stakes are manually supplied; this preview does not debit them.</div>`;
}
function renderLog(){
 el('researchCount').textContent=`${records.length} recorded quotes and ${freezes.length} frozen pre-race snapshots on this device. Local records are NOT independently timestamped. Export and externally anchor the SHA-256 digest before post time.`;
 el('researchLog').innerHTML=records.slice(-8).reverse().map(r=>`<div class="note small">${escape(r.card_date)} · ${escape(r.track)} R${escape(r.race)} · #${escape(r.program)} ${escape(r.horse)} · ${escape(r.odds)}<div class="tiny muted">Observed ${escape(r.quoteTime)} · ${escape(r.quoteSourceId)} · ${r.quoteTimingEligible?'Within timing window':'Outside timing window'} · PASS</div></div>`).join('');
}
export function renderResearchBuilder(){
 if(!context)return;const {card,race,rating}=context(),identity=`${card.id}|${race.race}`;
 if(identity!==lastRace){
  lastRace=identity;for(const id of ['researchOdds','researchSource','researchEvidence','researchQuoteTime','researchPostTime'])el(id).value='';for(const id of ['researchObserved','researchField','researchSurface','researchDuplicate'])el(id).checked=false;
  el('researchStatus').textContent='';
 }
 const previous=el('researchHorse').value,active=race.horses.filter(h=>h.n&&h.odds!=='SCR'&&h.included_in_frozen_field!==false);
 el('researchHorse').innerHTML=active.map(h=>`<option value="${escape(h.n)}">#${escape(h.n)} ${escape(h.name)}</option>`).join('');
 if(active.some(h=>String(h.n)===previous)&&identity===el('researchHorse').dataset.race)el('researchHorse').value=previous;
 else if(rating.rankings[0])el('researchHorse').value=String(rating.rankings[0].n);
 el('researchHorse').dataset.race=identity;
 el('researchRace').textContent=`${race.date} · ${race.track} R${race.race} · ${rating.decision}. Capture quotes for every active runner when possible; only #1 belongs to the frozen win-rule candidate.`;
 updatePreview();renderLog();
}
export function initResearchBuilder(getContext){
 context=getContext;
 try{const saved=JSON.parse(localStorage.getItem(key)||'[]');records=Array.isArray(saved)?saved.filter(r=>r?.builder==='V44C-research-builder-v1'):[]}catch{records=[]}
 try{const saved=JSON.parse(localStorage.getItem(freezeKey)||'[]');freezes=Array.isArray(saved)?saved.filter(r=>r?.builder==='V44C-research-builder-v1'):[]}catch{freezes=[]}
 try{const saved=JSON.parse(localStorage.getItem(settingsKey)||'{}');for(const [id,v]of Object.entries(saved))if(['researchCash','researchDaily','researchCap','researchFloor'].includes(id))el(id).value=v}catch{}
 for(const id of ['researchHorse','researchCash','researchDaily','researchCap','researchFloor','researchOutstanding','researchDuplicate'])el(id).onchange=()=>{updatePreview();try{localStorage.setItem(settingsKey,JSON.stringify(Object.fromEntries(['researchCash','researchDaily','researchCap','researchFloor'].map(id=>[id,el(id).value]))))}catch{el('researchStatus').textContent='Settings could not be saved on this device.'}};
 el('researchNow').onclick=()=>{el('researchQuoteTime').value=new Date().toISOString()};
 el('researchRecord').onclick=()=>{
  const c=context(),result=quoteCapture({...c,horseNumber:el('researchHorse').value,odds:el('researchOdds').value,sourceId:el('researchSource').value,evidenceRef:el('researchEvidence').value,quoteTime:el('researchQuoteTime').value,postTime:el('researchPostTime').value,now:Date.now(),observedLive:el('researchObserved').checked,finalFieldVerified:el('researchField').checked,surfaceVerified:el('researchSurface').checked,budget:budget()});
  if(result.errors.length){el('researchStatus').textContent=result.errors.join(' ');return}
  const next=[...records,result.record];try{localStorage.setItem(key,JSON.stringify(next));records=next;el('researchStatus').textContent='Observation saved. Automated decision remains PASS. Export and retain the referenced source evidence.';renderLog();updatePreview()}catch{el('researchStatus').textContent='Observation could not be saved. Export existing records and free device storage before retrying.'}
 };
 el('researchFreeze').onclick=()=>{
  const c=context(),result=preRaceFreeze({...c,postTime:el('researchPostTime').value,now:Date.now(),finalFieldVerified:el('researchField').checked,surfaceVerified:el('researchSurface').checked});
  if(result.errors.length){el('researchStatus').textContent=result.errors.join(' ');return}
  if(freezes.some(f=>f.cardId===result.freeze.cardId&&String(f.race)===String(result.freeze.race))){el('researchStatus').textContent='Race already frozen on this device. Existing snapshot will not be overwritten.';return}
  const next=[...freezes,result.freeze];try{localStorage.setItem(freezeKey,JSON.stringify(next));freezes=next;el('researchStatus').textContent='Pre-race snapshot frozen locally. Export and externally anchor the SHA-256 digest BEFORE post time; local time alone is not proof.';renderLog()}catch{el('researchStatus').textContent='Freeze could not be saved. Check available device storage.'}
 };
 el('researchExport').onclick=async()=>{
  el('researchStatus').textContent='Preparing SHA-256 research export...';
  try{
   const exportedAt=new Date().toISOString(),sealed=await sealedResearchExport({records,freezes,exportedAt});
   const blob=new Blob([JSON.stringify(sealed,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='V44C_RESEARCH_EVIDENCE_'+exportedAt.slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   el('researchStatus').textContent='Exported local SHA-256 digest: '+sealed.recordsDigestSha256+'. Commit the exact digest to GitHub BEFORE scheduled post; GitHub server timestamp and retained source evidence require independent review. No evidence is certified by this export.';
  }catch(e){el('researchStatus').textContent='Export failed; no integrity seal created: '+String(e?.message||e)}
 };
}
