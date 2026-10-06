import {websiteRace} from './scoring-engine.js?v=20261006-j1preview1';
export const J1_MODEL_ID='V44C-J1-current-year-jockey-research-v1';
// Source PP only. Never use standings or trainer-header suffixes as jockey data.
export function parseAnnualJockey(header,expectedYear){
 const head=header.split('Tr:',1)[0];
 const matches=[...head.matchAll(/\b([A-Z][A-Z .'\-]{1,35})\s*\(([^)]*)\)\s*(20\d{2}):\s*\((\d+)\s+(\d+)\s+((?:0?\.\d+|1\.0+))\)/g)];
 if(matches.length!==1)return {status:'MISSING_OR_AMBIGUOUS_CURRENT_YEAR_HEADER'};
 const m=matches[0],year=+m[3],n=+m[4],w=+m[5],printed=+m[6];
 if(year!==expectedYear||w>n||printed<0||printed>1||(n&&Math.abs(w/n-printed)>.01001))return {status:'INVALID_HEADER'};
 return {status:'SOURCE_COUNTS_VERIFIED',jockey:m[1].trim(),year,year_starts:n,year_wins:w,source_header:m[0]};
}
export function annualJockeyInput(h,year){
 const r=h.jockey_annual;
 if(!r||r.status!=='SOURCE_COUNTS_VERIFIED'||r.year!==year||!Number.isInteger(r.year_starts)||!Number.isInteger(r.year_wins)||r.year_starts<=0||r.year_wins<0||r.year_wins>r.year_starts||(h.j&&h.j!==r.jockey))return {...h,j1_fallback:true};
 return {...h,jockey_win:100*r.year_wins/r.year_starts,j1_fallback:false};
}
export function researchRace(race){
 const year=Number(race.date?.slice(0,4)),horses=race.horses.map(h=>annualJockeyInput(h,year));
 const eligible=horses.filter(h=>h.odds!=='SCR'&&(!h.entry_status||h.entry_status==='REGULAR'));
 return {...websiteRace({...race,horses}),model_id:J1_MODEL_ID,research_only:true,annual_coverage:eligible.filter(h=>!h.j1_fallback).length,eligible_count:eligible.length,fallbacks:eligible.filter(h=>h.j1_fallback).map(h=>h.name)};
}
