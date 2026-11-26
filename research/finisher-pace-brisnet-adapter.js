// Adapter boundary for the research prototype. Do not infer running style from speed.
// The current native Brisnet model/Finisher inputs do not expose a verified
// E/EP/P/S field; this adapter refuses to invent one.
import {rankPaceCompanions} from './finisher-pace-compatibility.js';
export function fromVerifiedBrisnetEvidence(race, rrFirstProgram, finisherScores) {
 if (!race || !Array.isArray(race.horses) || !(finisherScores instanceof Map))
   throw new Error('Brisnet race and verified Finisher score map required');
 const horses=race.horses.map(h=>{
  const program=String(h.n??'');
  const evidence=h.source_context?.running_style;
  const verified=evidence?.status==='SOURCE_VERIFIED' && evidence?.provider==='BRISNET';
  const style=verified?evidence.value:null;
  return {program,runStyle:style,finisherScore:finisherScores.get(program),
   scratched:h.odds==='SCR'||h.included_in_frozen_field===false||
    (h.entry_status&&h.entry_status!=='REGULAR')};
 });
 const result=rankPaceCompanions(horses,rrFirstProgram);
 return {...result,sourceCoverage:{verifiedRunStyles:horses.filter(h=>['E','EP','P','S'].includes(h.runStyle)&&!h.scratched).length,
  activeRunners:horses.filter(h=>!h.scratched).length},
  warning:result.scenario.confidence===0?'NO VERIFIED RUNNING STYLES: adjustment neutral; no pace advantage claimed':null};
}
