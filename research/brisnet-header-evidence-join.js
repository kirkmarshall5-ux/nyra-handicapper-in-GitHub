// Research-only join of verified Brisnet header evidence to frozen runners.
// Fail closed on ambiguous identity or duplicated header records. Never assign
// running style by row position or use post-race outcomes for matching.
import {extractBrisnetHeaderEvidence} from './brisnet-running-style-header.js';
const key=x=>String(x??'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
export function joinBrisnetHeaderEvidence(race,pageRecords){
 if(!race||!Array.isArray(race.horses)||!Array.isArray(pageRecords))
  throw new Error('Frozen race and extracted PP pages required');
 const parsed=pageRecords.flatMap(p=>extractBrisnetHeaderEvidence(p.text,{page:p.page,race:p.race}));
 const raceNo=Number(race.number??race.race);
 const candidates=parsed.filter(p=>p.race===raceNo);
 const counts=new Map();
 for(const p of candidates){const k=key(p.name);counts.set(k,(counts.get(k)||0)+1);}
 const runnerCounts=new Map();
 for(const h of race.horses){const k=key(h.name);runnerCounts.set(k,(runnerCounts.get(k)||0)+1);}
 const matched=[],unmatched=[],ambiguous=[];
 for(const h of race.horses){
  const k=key(h.name),e=candidates.find(p=>key(p.name)===k);
  if(!k||counts.get(k)>1||runnerCounts.get(k)>1){ambiguous.push({program:String(h.n),name:h.name,reason:'AMBIGUOUS_NAME'});continue;}
  if(!e){unmatched.push({program:String(h.n),name:h.name,reason:'NO_MATCHING_HEADER'});continue;}
  matched.push({program:String(h.n),name:h.name,runStyle:e.style,quirinPoints:e.quirinPoints,
   source_context:{running_style:{provider:'BRISNET',status:'SOURCE_VERIFIED',value:e.style,
     quirinPoints:e.quirinPoints,page:e.page,race:e.race,sourceText:e.sourceText}}});
 }
 return {race:raceNo,matched,unmatched,ambiguous,coverage:race.horses.length?matched.length/race.horses.length:0,
  complete:matched.length===race.horses.length&&ambiguous.length===0,source:'BRISNET_PREMIUM_PLUS_HEADER',researchOnly:true};
}
