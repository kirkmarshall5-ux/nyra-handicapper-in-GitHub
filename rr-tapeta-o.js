// Research-only foundation; not wired into live dashboards.
export const TAPETA_O_ID='BRISNET-RR-TAPETA-O-1.0';
const finite=Number.isFinite;
const keys=['e1','e2','late','speed'];
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
// Caller must supply explicitly verified synthetic lines, not inferred off-turf lines.
export function scoreTapetaO({distance, runners}){
 if(!finite(distance)||distance<=0||!Array.isArray(runners)||runners.length<2||runners.some(h=>!finite(h.score)||!h.n)||new Set(runners.map(h=>String(h.n))).size!==runners.length)throw Error('Complete RR field and distance required');
 const sprint=distance<8;
 const rows=runners.map(h=>{
  const lines=(h.syntheticLines||[]).filter(l=>l.explicitSynthetic===true&&keys.every(k=>finite(l[k])&&l[k]>=0)&&typeof l.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(l.date)).sort((a,b)=>b.date.localeCompare(a.date));
  const recent=lines.slice(0,3);
  const matched=lines.filter(l=>finite(l.furlongs)&&Math.abs(l.furlongs-distance)<=1&&(l.furlongs<8)===sprint).slice(0,3);
  const companion=matched.length?matched:recent;
  return {...h,features:{pace:recent.length?mean(recent.map(l=>l[sprint?'e1':'e2'])):null,speed:companion.length?mean(companion.map(l=>l.speed)):null,late:companion.length?mean(companion.map(l=>l.late)):null},evidence:{recent:recent.length,matched:matched.length,fallback:!matched.length&&!!recent.length}};
 });
 const z=(h,k)=>{
  const v=rows.map(x=>x.features[k]).filter(finite);
  if(!finite(h.features[k])||v.length<2)return 0;
  const m=mean(v),sd=Math.sqrt(mean(v.map(x=>(x-m)**2)));
  return sd?(h.features[k]-m)/sd:0;
 };
 const scored=rows.map(h=>({...h,winnerScore:h.score+.5*z(h,'pace'),companionScore:h.score+(sprint?.5*z(h,'speed'):.25*(z(h,'speed')+z(h,'late')))}));
 const winner=[...scored].sort((a,b)=>b.winnerScore-a.winnerScore)[0];
 const rest=scored.filter(h=>h!==winner).sort((a,b)=>b.companionScore-a.companionScore);
 return {model_id:TAPETA_O_ID,rankings:[winner,...rest].map((h,i)=>({...h,rank:i+1,rrScore:h.score})),researchOnly:true};
}
