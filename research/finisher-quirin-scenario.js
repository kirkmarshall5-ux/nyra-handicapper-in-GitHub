// Research-only Quirin pressure classification. Keeps the existing Finisher
// scoring and style-fit adjustment unchanged for a controlled A/B comparison.
// Thresholds are hypotheses requiring historical calibration.
const validStyle=s=>['E','EP','P','S'].includes(s);
export function quirinPaceScenario(horses){
 if(!Array.isArray(horses))throw new Error('Expected frozen horses');
 const active=horses.filter(h=>!h.scratched&&h.active!==false);
 const verified=active.filter(h=>validStyle(h.runStyle)&&Number.isInteger(h.quirinPoints)&&h.quirinPoints>=0&&h.quirinPoints<=8);
 const threats=verified.filter(h=>(h.runStyle==='E'||h.runStyle==='EP')&&h.quirinPoints>=5);
 const extreme=threats.filter(h=>h.quirinPoints>=7);
 const pressure=threats.reduce((s,h)=>s+(h.quirinPoints-4)/4,0);
 const scenario=threats.length>=2&&pressure>=1.5?'FAST':threats.length<=1?'SLOW':'MODERATE';
 return {scenario,pressure,earlyThreats:threats.length,extremeThreats:extreme.length,
  confidence:active.length?verified.length/active.length:0,unknown:active.length-verified.length,
  evidence:'BRISNET_HEADER_STYLE_AND_QUIRIN',researchOnly:true};
}
