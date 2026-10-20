// Pure, research-only audit. This module never changes a runner or a model decision.
export function comparePrintedHistory(source,imported){
 const same=(a,b)=>String(a||'').toLowerCase().replace(/[^a-z0-9]/g,'')===String(b||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 if(!same(source.horse,imported?.horse))return {classification:'IDENTITY_MISMATCH',missingDates:[],matchedDates:[]};
 if(!Number.isInteger(source.life_starts)||source.life_starts<0)return {classification:'SOURCE_CAREER_STARTS_UNVERIFIED',missingDates:[],matchedDates:[]};
 const printed=[...new Set(source.dates||[])],actual=[...new Set(imported?.dates||[])];
 const missingDates=printed.filter(d=>!actual.includes(d)),matchedDates=printed.filter(d=>actual.includes(d));
 const classification=source.life_starts===0?'GENUINE_FIRST_TIME_STARTER':!printed.length?'SOURCE_LINES_NOT_TRANSCRIBED':!actual.length?'IMPORTED_HISTORY_EMPTY':missingDates.length?'PARTIAL_IMPORT_DATE_MISMATCH':'DATED_HISTORY_PRESENT';
 return {classification,missingDates,matchedDates,printedCount:printed.length,importedCount:actual.length,limitations:'Dates alone do not certify surface, distance, Speed, E1, E2 or LP'};
}
