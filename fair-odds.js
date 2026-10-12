// Prespecified research mappings, not fitted or calibrated win probabilities.
// The score scales are explicit assumptions; do not use for live value decisions.
export const LINE_MODELS=Object.freeze({
 v44c:Object.freeze({id:'V44C-research-softmax-v1',scoreKey:'v44c_unrounded_score',temperature:10}),
 contender:Object.freeze({id:'CONTENDER-research-softmax-v1',scoreKey:'score',temperature:1})
});
export function fairOddsFromProbability(p){
 return typeof p==='number'&&Number.isFinite(p)&&p>0&&p<=1?(1-p)/p:null;
}
export const runnerKey=h=>JSON.stringify([String(h.n??''),String(h.name??'')]);
export function estimatedWinLine(race,result,model){
 const config=LINE_MODELS[model],hold=reason=>({status:'UNAVAILABLE',reason,entries:[],calibrated:false,bettingEnabled:false});
 if(!config)return hold('Unknown probability model');
 if(result?.decision!=='RATEABLE'||result.provisional)return hold('Complete rated field required');
 if((race.parser_blockers||[]).length)return hold('Source verification pending');
 const field=(race.horses||[]).filter(h=>h.odds!=='SCR'&&(!h.entry_status||h.entry_status==='REGULAR'));
 const rows=result.rankings||[],keys=field.map(runnerKey),rankKeys=rows.map(runnerKey);
 if(field.length<2||rows.length!==field.length||new Set(keys).size!==keys.length||new Set(rankKeys).size!==rows.length||keys.some(k=>!rankKeys.includes(k)))return hold('Complete unique field required');
 const scores=rows.map(h=>h[config.scoreKey]);
 if(scores.some(v=>typeof v!=='number'||!Number.isFinite(v)))return hold('Missing model scores');
 // Stable softmax over ALL eligible runners, never just the displayed Top 4.
 const max=Math.max(...scores),weights=scores.map(s=>Math.exp((s-max)/config.temperature)),total=weights.reduce((a,b)=>a+b,0);
 if(weights.some(w=>w<=0||!Number.isFinite(w))||!Number.isFinite(total))return hold('Score range requires review');
 return {status:'ESTIMATED',model_id:config.id,temperature:config.temperature,calibrated:false,bettingEnabled:false,entries:rows.map((h,i)=>{const probability=weights[i]/total;return {n:h.n,name:h.name,probability,winPercent:100*probability,fairOdds:fairOddsFromProbability(probability)};})};
}
export function winLineFields(line,horse){
 const e=line.entries.find(h=>runnerKey(h)===runnerKey(horse));
 if(!e)return '<td>—</td><td>—</td>';
 const odds=e.fairOdds<.01?'&lt;0.01':e.fairOdds>999?e.fairOdds.toExponential(2):e.fairOdds.toFixed(2);
 const percent=e.winPercent<.1?'&lt;0.1':e.winPercent>99.9?'&gt;99.9':e.winPercent.toFixed(1);
 return `<td>${odds}/1</td><td>${percent}%</td>`;
}
export function winLineNote(line){
 return line.status==='ESTIMATED'?'<div class="tiny muted" style="margin-top:8px">True Chance is an estimate · full-field line · calibration pending · no wager recommendation.</div>':'<div class="tiny muted" style="margin-top:8px">Fair Odds / True Chance unavailable: '+line.reason+'.</div>';
}
