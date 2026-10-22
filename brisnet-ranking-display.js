import {modelEvidenceHtml} from './model-evidence-display.js?v=20261018-evidence1';
import {BRISNET_METHODS} from './brisnet-models.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={v44c:'V4.4c-Brisnet base',contender:'Contender-Brisnet',mix1:'MIX1-Brisnet'};
export function brisnetRankingHtml(result,model,race=null){
 const rows=result.rankings||[],fmt=x=>x.toFixed(model==='contender'?3:1);
 const tr=(h,i)=>`<tr><td><b>${i+1}. #${esc(h.n)} ${esc(h.name)}</b></td><td>${fmt(h.score)}</td><td>—</td><td>—</td></tr>`;
 const table=(a,offset=0)=>`<table class="candidate-table"><thead><tr><th>Horse</th><th>Rating</th><th>Fair Odds</th><th>Win %</th></tr></thead><tbody>${a.map((h,i)=>tr(h,i+offset)).join('')}</tbody></table>`;
 const unrated=(result.unrated||[]).map(h=>`<div class="tiny muted">#${esc(h.n)} ${esc(h.name)} — ${h.reasons.map(esc).join('; ')}</div>`).join('');
 const evidence=race?modelEvidenceHtml(race,result,{model}):'';
 return (model==='contender'?'':evidence)+`<b>${names[model]} · experimental</b><div class="tiny muted" style="margin:6px 0">Ranked ${result.rated_count}/${result.eligible_count} eligible runners. ${result.unrated.length?'Partial field: unrated horses may be competitive.':'Native Brisnet research ranking.'} PASS — no wager.</div>`+(rows.length?table(rows.slice(0,4)):'<div class="tiny muted">No runners have enough verified Speed history for a numerical ranking.</div>')+(rows.length>4?`<details class="tiny muted remaining-ranked" style="margin-top:8px"><summary>Remaining Ranked Horses</summary>${table(rows.slice(4),4)}</details>`:'')+(!race&&unrated?`<div class="tiny muted" style="margin-top:10px"><b>Unrated — missing information</b></div>${unrated}`:'')+(model==='contender'?evidence:'')+'<div class="tiny muted" style="margin-top:8px">Fair Odds / True Chance unavailable: Brisnet probability conversion has not been validated.</div>';
}
export function updateBrisnetMethods(target,model,enabled){
 const card=target.closest('.card'),details=card?.querySelector(':scope > details')||document.querySelector('[data-model-method="'+target.id+'"]');if(!details)return;
 if(!details.dataset.originalMethod)details.dataset.originalMethod=details.innerHTML;
 details.innerHTML=enabled?`<summary>How ${names[model]} ranks</summary><p>${esc(BRISNET_METHODS[model])}</p><p>${esc(BRISNET_METHODS.pace)}</p>`:details.dataset.originalMethod;
 const tag=card.querySelector(':scope > div.tiny.muted');
 if(tag){if(!tag.dataset.originalLabel)tag.dataset.originalLabel=tag.textContent;tag.textContent=enabled?'Experimental · Brisnet version':tag.dataset.originalLabel;}
}
