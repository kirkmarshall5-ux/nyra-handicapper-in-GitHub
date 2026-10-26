// Pure evidence gate. This is deliberately independent of model scoring.
export const RACE_GRADEABILITY_GATE_ID='race-gradeability-evidence-v1';
export function assessRaceGradeability({field,rankedPrograms,originalPdfReplayVerified=false,officialChartFinishVerified=false,independentFreezeTimeVerified=false}={}){
 const reasons=[];
 if(!field||!Array.isArray(field.entries))return {gradeable:false,reasons:['MISSING_FIELD_MANIFEST'],missingStarters:[]};
 const starters=field.entries.filter(e=>e.status==='STARTER').map(e=>String(e.program));
 const ranked=Array.isArray(rankedPrograms)?rankedPrograms.map(String):[];
 const missingStarters=starters.filter(p=>!ranked.includes(p));
 const extraRanked=ranked.filter(p=>!starters.includes(p));
 if(missingStarters.length)reasons.push('MISSING_OFFICIAL_STARTER_IN_RANKED_FIELD');
 if(extraRanked.length)reasons.push('NONSTARTER_IN_RANKED_FIELD');
 if(new Set(ranked).size!==ranked.length)reasons.push('DUPLICATE_RANKED_PROGRAM');
 if(!originalPdfReplayVerified)reasons.push('ORIGINAL_PDF_REPLAY_UNVERIFIED');
 if(!officialChartFinishVerified)reasons.push('OFFICIAL_CHART_FINISH_UNVERIFIED');
 if(!independentFreezeTimeVerified)reasons.push('INDEPENDENT_FREEZE_TIME_UNVERIFIED');
 return {gradeable:reasons.length===0,reasons,missingStarters,extraRanked,starterCount:starters.length,rankedCount:ranked.length};
}
