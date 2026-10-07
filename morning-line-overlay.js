const name=s=>String(s||'').replace(/\s*\([^)]*\)/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function applyMorningLines(race,candidate,{sourceUrl,observedAt}={}){
 if(candidate.race!==race.race||candidate.date!==race.date||candidate.track!==race.track)throw Error('Morning-line race identity mismatch');
 if(!sourceUrl||!Number.isFinite(Date.parse(observedAt)))throw Error('Morning-line source and timestamp required');
 const seen=new Set(),updates=[];
 for(const h of candidate.horses){const key=String(h.n);if(!/^[1-9]\d*[A-Z]?$/.test(key))throw Error('Invalid entry program number');const found=race.horses.find(x=>name(x.name)===name(h.name)&&(!x.n||String(x.n)===key));if(!found||seen.has(key))throw Error('Unknown or duplicate morning-line runner');seen.add(key);if(!/^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/.test(h.ml)||+h.ml.split('/')[1]<=0)throw Error('Missing or invalid morning line');updates.push([found.name,h.ml,key]);}
 if(!updates.length)throw Error('No morning lines found');const out=structuredClone(race);for(const [horse,ml,program]of updates){const h=out.horses.find(h=>h.name===horse);if(!h.n){h.n=program;h.program_source={sourceUrl,observedAt,status:'USER_PASTED_OFFICIAL_ENTRY_IDENTITY'};}h.ml=ml;h.morning_line_evidence={sourceUrl,observedAt,status:'USER_PASTED_ENTRY_REFERENCE_NOT_LIVE_QUOTE'};}return out;
}
