const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function v44PaceHtml(result){
 const meta='<b>V4.4c-Pace · experimental</b><div class="tiny muted" style="margin:6px 0">Brisnet main candidate · PASS — no wager.</div>';
 if(result.status!=='RESEARCH_RANKED')return meta+'<b>HOLD — inputs incomplete or unsupported</b><div class="tiny muted">'+esc(result.reason)+'</div>';
 const table=(rows,offset=0)=>'<table class="candidate-table"><thead><tr><th>Horse</th><th>Rating</th></tr></thead><tbody>'+rows.map((h,i)=>`<tr><td><b>${i+offset+1}. #${esc(h.n)} ${esc(h.name)}</b></td><td>${Number(h.score).toFixed(1)}</td></tr>`).join('')+'</tbody></table>';
 return meta+'<div class="tiny muted">'+esc(result.context.group)+' · '+result.rankings.length+' fully rated runners</div>'+table(result.rankings.slice(0,4))+(result.rankings.length>4?'<details class="tiny muted" style="margin-top:8px"><summary>Remaining ranked runners</summary>'+table(result.rankings.slice(4),4)+'</details>':'')+'<div class="tiny muted" style="margin-top:8px">Fair Odds / True Chance unavailable: probability conversion has not been validated.</div>';
}
