// Research-only lone-speed evidence. No live model changes.
// Quirin gaps and E1/E2 figures must be verified from the same pre-result PP.
// Race-level pace summary may be used only when runner identities are unambiguous.
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export function loneSpeedSignal(horses,{minQuirinGap=2,minPaceGap=3}={}){
 if(!Array.isArray(horses))throw new Error('Expected field');
 const active=horses.filter(h=>!h.scratched&&h.active!==false);
 const e=active.filter(h=>h.runStyle==='E');
 const missing=active.filter(h=>!['E','EP','P','S'].includes(h.runStyle)||
   !Number.isInteger(h.quirinPoints)||h.quirinPoints<0||h.quirinPoints>8);
 if(e.length!==1)return {qualifies:false,reason:e.length?'MULTIPLE_E':'NO_E',candidate:null,unknown:missing.length};
 const horse=e[0];
 const rivals=active.filter(h=>h!==horse);
 if(missing.length||!Number.isInteger(horse.quirinPoints)||rivals.some(h=>!Number.isInteger(h.quirinPoints)))
   return {qualifies:false,reason:'INCOMPLETE_STYLE_OR_QUIRIN',candidate:String(horse.program),unknown:missing.length};
 const runnerUp=Math.max(...rivals.map(h=>h.quirinPoints));
 const quirinGap=horse.quirinPoints-runnerUp;
 if(!finite(horse.e1)||!finite(horse.e2)||rivals.some(h=>!finite(h.e1)||!finite(h.e2)))
   return {qualifies:false,reason:'E1_E2_NOT_VERIFIED',candidate:String(horse.program),quirinGap,unknown:0};
 const e1Gap=horse.e1-Math.max(...rivals.map(h=>h.e1));
 const e2Gap=horse.e2-Math.max(...rivals.map(h=>h.e2));
 const qualifies=horse.quirinPoints>=7&&quirinGap>=minQuirinGap&&e1Gap>=minPaceGap&&e2Gap>=minPaceGap;
 return {qualifies,reason:qualifies?'LONE_SPEED_CANDIDATE':'GAPS_NOT_MET',candidate:String(horse.program),
  quirinGap,e1Gap,e2Gap,strongPaceSeparation:e1Gap>=5&&e2Gap>=5,unknown:0,researchOnly:true};
}
