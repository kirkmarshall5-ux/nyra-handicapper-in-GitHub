import assert from 'node:assert/strict';
const sorted = values => [...values].map(String).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
const normalizedName = name => String(name??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function compareImportedCardToFrozenRosters(card,reference,sourceIdentityManifest=null) {
  assert.ok(card && typeof card==='object' && card.races,'Parsed Brisnet card required');
  assert.equal(reference?.race_count,9,'Expected nine-race historical reference');
  assert.equal(reference?.races?.length,9,'Missing reference races');
  const races=reference.races.map(saved=>{
    const parsed=card.races[saved.race];
    const blockers=[];
    if(!parsed || !Array.isArray(parsed.horses)){
      return {race:saved.race,status:'MISSING_IMPORTED_RACE',blockers:['Race not imported'],parsed_programs:[],reference_programs:saved.saved_roster_programs};
    }
    const programs=parsed.horses.map(h=>String(h.n??'').trim());
    const names=parsed.horses.map(h=>String(h.name??'').trim());
    const unique=new Set(programs);
    if(programs.some(p=>!p)) blockers.push('Blank program number');
    if(unique.size!==programs.length) blockers.push('Duplicate imported program number');
    if(names.some(n=>!n)) blockers.push('Blank imported horse name');
    const expected=sorted(saved.saved_roster_programs);
    const actual=sorted(programs);
    const missing=expected.filter(p=>!unique.has(p));
    const extra=actual.filter(p=>!expected.includes(p));
    if(missing.length)blockers.push('Missing original PP programs: '+missing.join(','));
    if(extra.length)blockers.push('Unexpected imported PP programs: '+extra.join(','));
    if(actual.length!==expected.length)blockers.push('Imported roster count differs');
    if(saved.race===9 && sourceIdentityManifest){
      if(sourceIdentityManifest.race!==9 || !Array.isArray(sourceIdentityManifest.entries) || sourceIdentityManifest.entries.length!==14)
        blockers.push('Invalid original R9 PP horse-name identity manifest');
      else {
        const sourceByProgram=new Map(sourceIdentityManifest.entries.map(h=>[String(h.program),h]));
        for(const h of parsed.horses){
          const source=sourceByProgram.get(String(h.n));
          if(!source || !normalizedName(source.name) || normalizedName(h.name)!==normalizedName(source.name))
            blockers.push('R9 original PP horse-name mismatch #'+String(h.n));
          if(source && (String(h.entry_status||'').toUpperCase()==='AE')!==Boolean(source.source_ae))
            blockers.push('R9 original PP also-eligible flag mismatch #'+String(h.n));
        }
      }
    }
    const ae=parsed.horses.filter(h=>String(h.entry_status||'').toUpperCase()==='AE').map(h=>String(h.n));
    if(saved.race===9 && (ae.length!==2||sorted(ae).join(',')!=='13,14'))
      blockers.push('R9 original also-eligible identities #13/#14 not retained');
    return {race:saved.race,status:blockers.length?'SOURCE_ROSTER_MISMATCH':'SOURCE_ROSTER_PROGRAMS_MATCH',source_horses:expected.length,imported_horses:actual.length,parsed_programs:actual,reference_programs:expected,missing,extra,ae_programs:sorted(ae),blockers};
  });
  return {scope:'BEL-2026-10-25',status:races.every(r=>r.status==='SOURCE_ROSTER_PROGRAMS_MATCH')?'SOURCE_PROGRAM_REPLAY_PASSED_NOT_CERTIFIED':'SOURCE_PROGRAM_REPLAY_FAILED',races,original_pdf_verified:false,official_chart_verified:false,prospective_certified:false};
}
