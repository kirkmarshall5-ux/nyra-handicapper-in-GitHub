import {rateResearchRace} from './data-corrected-research.js';
export const RELEASE_ID='V44C-data-integrity-rankings-20261007-v1';
export function releaseRace(race){
 const field=race.horses.filter(h=>h.odds!=='SCR'&&(!h.entry_status||h.entry_status==='REGULAR')).map(h=>({...h,life_starts:h.life_starts??h.lifeStarts??null,beyer_figures:h.beyer_figures??h.figs??[],timeform_early:h.timeform_early??null,timeform_late:h.timeform_late??null}));
 return {...rateResearchRace(field,{raceBlockers:race.parser_blockers||[]}),model_id:RELEASE_ID,research_only:false,ranking_release:true,probabilityCalibrated:false,bettingEnabled:false};
}
