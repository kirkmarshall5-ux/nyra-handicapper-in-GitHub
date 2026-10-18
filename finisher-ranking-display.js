import {rankFinishers} from './finisher-inputs.js';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function finisherRankingHtml(race,{baselineDecision=null}={}){
 const result=rankFinishers(race),native=result.rankings.some(h=>h.source==='BRISNET')||(race.horses||[]).some(h=>h.ratings?.provider==='BRISNET');
 const pass=result.status!=='COMPLETE_FIELD'||baselineDecision==='PASS'||native;
 const title=pass?'Finisher: PASS — no wager':'Finisher · finishing-order ranking';
 const status=pass?'Provisional ranked runners; missing evidence or source validation may prevent a complete-field forecast.':'Complete field ranked. Scores compare this field; they are not win probabilities.';
 const rows=result.rankings.slice(0,4).map((h,i)=>`<tr><td><b>${i+1}. #${escape(h.n)} ${escape(h.name)}</b></td><td>${h.score.toFixed(2)}</td></tr>`).join('');
 const table=rows?'<table class="finisher-table"><thead><tr><th scope="col">Horse</th><th scope="col">Score</th></tr></thead><tbody>'+rows+'</tbody></table>':'<div class="tiny muted">No horses have enough verified recent-speed evidence for a numerical ranking.</div>';
 const unknown=result.unrated.length?'<div class="tiny muted" style="margin-top:10px"><b>Limited or missing information</b></div>'+result.unrated.map(h=>`<div class="tiny muted">#${escape(h.n)} ${escape(h.name)} — ${escape(h.reason)}</div>`).join(''):'';
 const source=native?'Brisnet native Speed / LP. Late pace uses matching history.':'DRF Beyer / TimeformUS Late. Matching speed uses verified distance decoding.';
 return `<b>${title}</b><div class="tiny muted" style="margin:5px 0">${status} Ranked ${result.rankings.length}/${result.eligible_count} eligible runners.</div>${table}${unknown}<div class="tiny muted" style="margin-top:10px">60% recent speed · 25% matched speed · 15% Late. ${source} Fair odds and win percentages are unavailable for Finisher.</div>`;
}
