// Paper evaluation only. Model validation labels never determine race eligibility.
export const PAPER_POLICY=Object.freeze({id:'WIN2-EXACTA1-BOTH-v1',win:2,forward:1,reverse:1,total:4});
const program=h=>String(h?.n??h?.program??'').trim();
const horse=h=>String(h?.name??h?.horse??'').replace(/\s*\([A-Za-z]{2,3}\)\s*$/,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const reason=x=>typeof x==='string'?x:x?.reason||'Required source evidence unavailable';
export function paperEligibility(model,field){
 const rankings=model.rankings||[],ranked=new Map(rankings.map(h=>[program(h),h]));
 const exclusions=(model.unrated||[]).map(h=>({n:program(h),name:h.name,reasons:(h.reasons||[h.reason||'Required numerical ranking unavailable']).map(reason)}));
 for(const h of field)if(!ranked.has(program(h))&&!exclusions.some(x=>program(x)===program(h)))exclusions.push({n:program(h),name:h.name,reasons:[model.reason||'Required numerical ranking unavailable; inspect source PP.']});
 const reasons=[];
 if(model.available===false)reasons.push(model.reason||'Matching source unavailable');
 if(!['RATEABLE','REFERENCE'].includes(model.decision))reasons.push(model.reason||'Race remains '+(model.decision||'HOLD'));
 if(field.length<2)reasons.push('At least two active starters required for the win/exacta test');
 if(rankings.length!==field.length||ranked.size!==rankings.length||new Set(field.map(program)).size!==field.length||field.some(h=>!horse(h))||field.some(h=>!ranked.has(program(h))||horse(ranked.get(program(h)))!==horse(h)))reasons.push('Complete verified ranked field required');
 if(field.some(h=>!/^\d+$/.test(program(h))))reasons.push('Coupled or unverified program numbers require entry-level settlement');
 if(exclusions.length)reasons.push('Active runners lack required ranking evidence');
 return {included:!reasons.length,reasons:[...new Set(reasons)],unrated:exclusions,policy:PAPER_POLICY.id};
}
export function paperTickets(rankings){
 const [a,b]=rankings;
 return [{label:'$2 win on rank 1',cost:2,combinations:[[program(a)]]},{label:'$1 exacta 1–2',cost:1,combinations:[[program(a),program(b)]]},{label:'$1 exacta 2–1',cost:1,combinations:[[program(b),program(a)]]}];
}
export function settlePaperResult({model,field,official}){
 const eligibility=paperEligibility(model,field);
 if(!eligibility.included)return {model:model.id,included:false,eligibility,stake:0,returned:0,net:0,roi:null,wagers:[]};
 // Official starter identities, finish order and payout units must be supplied together.
 if(!official?.verified||!Array.isArray(official.field)||official.field.length!==field.length||field.some(h=>!official.field.some(x=>program(x)===program(h)&&horse(x)===horse(h))))throw Error('Verified official starter field required');
 if(!Array.isArray(official.finish)||official.finish.length!==field.length||new Set(official.finish.map(String)).size!==field.length||official.finish.some(p=>!field.some(h=>program(h)===String(p))))throw Error('Complete official finish order required');
 for(const value of [official.win2,official.exactaPay,official.exactaBase])if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw Error('Verified payouts and exacta base required');
 if(!official.exactaBase)throw Error('Exacta payout base must be positive');
 const [a,b]=model.rankings.map(program),[first,second]=official.finish.map(String);
 const wagers=paperTickets(model.rankings).map((ticket,i)=>({...ticket,returned:i===0?(a===first?official.win2:0):i===1?(a===first&&b===second?official.exactaPay/official.exactaBase:0):(b===first&&a===second?official.exactaPay/official.exactaBase:0)}));
 const returned=Math.round(wagers.reduce((s,w)=>s+w.returned,0)*100)/100;
 return {model:model.id,included:true,eligibility,stake:4,returned,net:Math.round((returned-4)*100)/100,roi:100*(returned/4-1),wagers};
}
export function summarizePaperResults(results){
 const included=results.filter(r=>r.included),stake=included.reduce((s,r)=>s+r.stake,0),returned=Math.round(included.reduce((s,r)=>s+r.returned,0)*100)/100;
 return {races:included.length,excluded:results.length-included.length,stake,returned,net:Math.round((returned-stake)*100)/100,roi:stake?100*(returned/stake-1):null};
}
