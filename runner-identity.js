// Identity for field updates only; never assign a missing program from row order.
export const runnerName=s=>String(s??'').replace(/\s*\([A-Za-z]{2,3}\)\s*$/,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export const runnerProgram=s=>String(s??'').trim().toUpperCase();
export function matchUpdateRunner(horses,identity){
 const program=runnerProgram(identity.program),name=runnerName(identity.name);
 if(!name&&!program)throw Error('Runner identity is missing');
 const candidates=horses.filter(h=>name?runnerName(h.name)===name:runnerProgram(h.n)===program);
 if(candidates.length!==1)throw Error('Runner identity is missing or ambiguous: '+(identity.name||program));
 const h=candidates[0],actual=runnerProgram(h.n);
 if(program&&actual&&program!==actual)throw Error('Runner program/name identity differs: '+identity.name);
 if(actual&&horses.filter(x=>runnerProgram(x.n)===actual).length!==1)throw Error('Duplicate runner program: '+actual);
 return h;
}
