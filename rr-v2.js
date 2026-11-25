// RR-V2: conservative ordering overlay; never changes RR scores.
import {rankBrisnetResearch} from './brisnet-research.js';
export const RR_V2_ID='BRISNET-RR-V2-20261124';
const finite=Number.isFinite;
function e2(r,h){
 const d=r.distance_furlongs;
 const lines=(h?.ratings?.lines||[]).filter(l=>{
 const age=(Date.parse(r.date)-Date.parse(l.date))/86400000;
 return age>0&&age<=120&&l.surface===r.surface&&finite(d)&&finite(l.furlongs)&&Math.abs(l.furlongs-d)<=1&&(l.furlongs>=8)===(d>=8)&&['e1','e2','late'].every(k=>finite(l[k])&&l[k]>=0);
 }).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
 return lines.length?lines.reduce((s,l)=>s+l.e2,0)/lines.length:null;
}
export function rankRRV2(race,base=rankBrisnetResearch(race)){
 if(!base)return null;
 const order=base.rankings.map(h=>({...h}));
 const originalTopFour=order.slice(0,4);
 const horses=new Map((race.horses||[]).map(h=>[String(h.n),h]));
 const pp=h=>horses.get(String(h.n))?.ratings?.prime_power;
 const decisions=[];
 const finish=()=>{
 const rankings=order.map((h,i)=>({...h,rr_rank:h.rank,rank:i+1,v44c_rank:i+1}));
 return {...base,model_id:RR_V2_ID,rankings,runners:rankings,override_decisions:decisions,method:'RR ordering overlay with Prime Power, recent and matched Speed, LP and second-slot E2 validation.'};
 };
 if(base.decision!=='RATEABLE'||order.length<2||!order.every(h=>finite(pp(h)))){
 decisions.push({accepted:false,reason:'Incomplete RR field or Prime Power evidence'});return finish();
 }
 const power=[...order].sort((a,b)=>pp(b)-pp(a));
 for(const slot of [0,1]){
 const old=order[slot],c=power.find(h=>slot===0||h.n!==order[0].n);
 const x=c.raw_features,y=old.raw_features;
 const checks={different:c.n!==old.n,topFour:originalTopFour.includes(c),primePower:pp(c)-pp(old)>=(slot===0?10:3),score:finite(old.score)&&finite(c.score)&&old.score-c.score<=.25,recent:finite(x?.[1])&&finite(y?.[1])&&x[1]>=y[1]-5,matched:finite(x?.[4])&&finite(y?.[4])&&x[4]>=y[4],late:finite(x?.[7])&&finite(y?.[7])&&x[7]>=y[7]};
 if(slot===1){const a=e2(race,horses.get(String(c.n))),b=e2(race,horses.get(String(old.n)));checks.e2=finite(a)&&finite(b)&&a>=b;}
 const accepted=Object.values(checks).every(Boolean);
 decisions.push({slot:slot+1,original:old.n,challenger:c.n,accepted,checks});
 if(accepted){order.splice(order.indexOf(c),1);order.splice(slot,0,c);}
 }
 return finish();
}
