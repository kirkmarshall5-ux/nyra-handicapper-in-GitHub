// Woodbine's unmarked Thoroughbred main course is Tapeta. An explicit turf
// designation always takes precedence over this track-specific main-course rule.
export const SURFACE_RULE_ID='BRISNET-WOODBINE-TAPETA-20261114';
export function brisnetRaceSurface(track,heading){
 const text=String(heading||'');
 if(/\([Tt]\)|\bTurf\b|\bGrass\b/i.test(text))return 'Turf';
 if(/All[- ]Weather|Synthetic|Tapeta|\(AW\)/i.test(text))return 'Synth';
 if(/\bDirt\b/i.test(text))return 'Dirt';
 return /^woodbine$/i.test(String(track||'').trim())?'Synth':'Dirt';
}
// Repair editable saved PP cards only. Frozen research records are never passed
// here, and explicit user or feed condition changes retain their authority.
export function repairWoodbineSurface(card){
 if(!card?.races||!/^woodbine$/i.test(String(card.track||'').trim()))return card;
 if(!/^BRISNET/.test(card.source_format||''))return card;
 const copy=structuredClone(card);
 for(const r of Object.values(copy.races)){
  if(r.surface!=='Dirt'||r.manual_conditions||r.equibase_snapshot||r.track_conditions)continue;
  const surface=brisnetRaceSurface(card.track,r.header);
  if(surface==='Dirt')continue;
  r.surface_correction={rule:SURFACE_RULE_ID,original_surface:r.surface,corrected_surface:surface};
  r.surface=surface;r.conditions={...(r.conditions||{}),surface};
 }
 return copy;
}
