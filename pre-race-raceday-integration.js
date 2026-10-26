// Integration boundary for current Race Day. Research only; never changes rankings or wagers.
import {displayedProviderModels} from './pre-race-provider-adapter.js';
import {verifyPostTimeEvidence} from './pre-race-post-time.js';
import {freezeResearchSnapshot} from './pre-race-provider-freeze.js';

export function prepareRaceDayResearchFreeze({card,race,postTimeEvidence,existing=[],now=Date.now(),fieldVerified=false,surfaceVerified=false}={}) {
  const errors=[];
  if(!card||!race||!Array.isArray(race.horses))return {record:null,errors:['Loaded provider card and race required.']};
  const check=verifyPostTimeEvidence(postTimeEvidence,{now,raceDate:race.date,track:race.track,raceNumber:race.race});
  if(check.errors?.length)return {record:null,errors:check.errors};
  if(!/^[0-9a-f]{64}$/i.test(card.source_sha256||''))return {record:null,errors:['Original provider PDF SHA-256 required; do not freeze an unverified source.']};
  if(!fieldVerified||!surfaceVerified)return {record:null,errors:['Official field, scratches and surface must be verified.']};
  let adapted;
  try {adapted=displayedProviderModels(card,race);}
  catch(e){return {record:null,errors:['Model evidence unavailable: '+e.message]};}
  const snapshot={
    provider:adapted.provider,cardId:card.id,track:race.track,date:race.date,race:race.race,
    parserVersion:card.parser_version,sourceName:card.sourceName,
    sourceSha256:card.source_sha256||null,
    scheduledPost:postTimeEvidence.scheduledPost,
    postTimeEvidence:{...postTimeEvidence,verification:'USER_CONFIRMED_OFFICIAL_REFERENCE_NOT_INDEPENDENTLY_ANCHORED'},
    fieldVerified:true,surfaceVerified:true,surface:race.surface,
    field:adapted.field,models:adapted.models,unratedRunners:adapted.unratedRunners,
    fieldSnapshot:race.horses.map(h=>({program:String(h.n??''),horse:h.name,odds:h.odds??null,entryStatus:h.entry_status??'REGULAR',fieldStatusEvidence:h.field_status_evidence??null}))
  };
  return freezeResearchSnapshot({snapshot,existing,now});
}
