// Research-only dual-source freeze foundation. No scoring or betting logic.
export const FREEZE_SCHEMA = 3;
export const FREEZE_STORAGE_KEY = 'nyraResearchProviderFreezesV3';
export function snapshotKey(s) {
  return [s.provider,s.cardId,s.track,s.date,s.race].map(v=>String(v??'')).join('|');
}
export function validateSnapshot(s, now=Date.now()) {
  const errors=[];
  if(!['BRISNET','DRF'].includes(s?.provider)) errors.push('Verified PP provider required.');
  if(!s?.cardId||!s?.track||!/^\d{4}-\d{2}-\d{2}$/.test(s?.date||'')||!Number.isInteger(Number(s?.race))||Number(s.race)<1)errors.push('Complete card and race identity required.');
  if(!s?.parserVersion||!s?.sourceName)errors.push('Parser version and source filename required.');
  if(s?.postTimeEvidence?.verification!=='USER_CONFIRMED_OFFICIAL_REFERENCE_NOT_INDEPENDENTLY_ANCHORED'||s?.postTimeEvidence?.scheduledPost!==s?.scheduledPost)errors.push('Verified official post-time evidence must match scheduled post.');
  if(typeof s?.postTimeEvidence?.sourceUrl!=='string'||!/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(s.postTimeEvidence.sourceUrl))errors.push('Official post-time reference URL required.');
  const post=Date.parse(s?.scheduledPost||'');
  if(!Number.isFinite(post)||!/Z|[+-]\d\d:\d\d$/.test(s?.scheduledPost||''))errors.push('Scheduled post needs an explicit timezone.');
  else if(now>=post)errors.push('Cannot freeze at or after scheduled post.');
  if(s?.fieldVerified!==true||s?.surfaceVerified!==true||!s?.surface)errors.push('Verify official field, scratches and surface.');
  if(!Array.isArray(s?.field)||!s.field.length)errors.push('Active field required.');
  const identities=new Set(),horseNames=new Set();
  for(const h of s?.field||[]){
    const program=String(h?.program??'').trim(),horse=String(h?.horse??'').trim();
    const normalizedHorse=horse.normalize('NFKC').replace(/\s+/g,' ').toLocaleLowerCase('en-US');
    if(!program||!horse||identities.has(program)||horseNames.has(normalizedHorse))errors.push('Invalid or duplicate active runner.');
    identities.add(program);
    horseNames.add(normalizedHorse);
  }
  if(!Array.isArray(s?.models)||s.models.length!==3||new Set(s.models.map(m=>m.family)).size!==3||!['V44C','CONTENDER','FINISHER'].every(f=>s.models.some(m=>m.family===f)))errors.push('All three provider model families required.');
  for(const m of s?.models||[]){
    if(!['V44C','CONTENDER','FINISHER'].includes(m?.family)||!m?.modelId||!['RATEABLE','PASS','HOLD'].includes(m?.decision)||!Array.isArray(m?.rankings)) {errors.push('Model output missing or unverified.');continue;}
    if(m.provider!==s.provider)errors.push('Model provider mismatch.');
    const seen=new Set();
    for(const h of m.rankings){
      if(!identities.has(String(h.program))||seen.has(String(h.program))||typeof h.score!=='number'||!Number.isFinite(h.score)||s.field.find(f=>String(f.program)===String(h.program))?.horse!==h.horse)errors.push('Model has ineligible, duplicate or unscored runner.');
      seen.add(String(h.program));
    }
    if(m.decision==='RATEABLE'&&seen.size!==identities.size)errors.push('RATEABLE model must cover complete active field.');
    if(m.fullFieldRanked!== (m.decision==='RATEABLE'&&seen.size===identities.size))errors.push('Full-field flag does not match evidence.');
  }
  if(s?.unratedRunners!==undefined||s?.ratedNotDisplayed!==undefined){
    if(!Array.isArray(s.unratedRunners)||!Array.isArray(s.ratedNotDisplayed??[]))errors.push('Runner rating coverage must be arrays.');
    else {
      const displayed=new Set((s.models||[]).find(m=>m.family==='V44C')?.rankings?.map(h=>String(h.program))||[]);
      const seen=new Set(displayed);
      for(const h of s.ratedNotDisplayed||[]){
        const program=String(h?.program??'');
        if(!identities.has(program)||seen.has(program)||s.field.find(f=>String(f.program)===program)?.horse!==h.horse)errors.push('Rated-not-displayed evidence conflicts with active or displayed runners.');
        if(typeof h?.reason!=='string'||!h.reason.trim())errors.push('Rated-not-displayed runner must include an explanation.');
        seen.add(program);
      }
      for(const h of s.unratedRunners){
        const program=String(h?.program??'');
        if(!identities.has(program)||seen.has(program)||s.field.find(f=>String(f.program)===program)?.horse!==h.horse)errors.push('Unrated evidence conflicts with active, rated or displayed runners.');
        if(!Array.isArray(h?.reasons)||!h.reasons.length||h.reasons.some(reason=>typeof reason!=='string'||!reason.trim()))errors.push('Unrated horse must include a readable evidence reason.');
        seen.add(program);
      }
      if(seen.size!==identities.size)errors.push('Every active runner must be displayed, rated-not-displayed, or unrated.');
    }
  }
  if(new Set((s?.models||[]).map(m=>m.family)).size!==(s?.models||[]).length)errors.push('Duplicate model family.');
  return [...new Set(errors)];
}
export function freezeResearchSnapshot({snapshot,existing=[],now=Date.now()}){
  const errors=validateSnapshot(snapshot,now);
  if(existing.some(x=>snapshotKey(x)===snapshotKey(snapshot)))errors.push('This provider/card/race is already frozen; no overwrite.');
  if(errors.length)return {record:null,errors};
  return {record:structuredClone({...snapshot,schemaVersion:FREEZE_SCHEMA,mode:'RESEARCH_ONLY',recordedAt:new Date(now).toISOString(),anchorStatus:'UNVERIFIED_LOCAL',bettingDecision:'PASS'}),errors:[]};
}
export async function sealResearchSnapshots(records) {
  if(!globalThis.crypto?.subtle)throw Error('SHA-256 unavailable.');
  const payload={schemaVersion:FREEZE_SCHEMA,mode:'RESEARCH_ONLY',records};
  const data=new TextEncoder().encode(JSON.stringify(payload));
  const digest=await globalThis.crypto.subtle.digest('SHA-256',data);
  return {...payload,digestSha256:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''),anchorStatus:'UNVERIFIED_LOCAL_EXPORT'};
}

// Verifies export integrity only. A valid digest does not establish a trusted pre-race timestamp.
export async function verifyResearchExport(exported){
 const errors=[];
 if(exported?.schemaVersion!==FREEZE_SCHEMA||exported?.mode!=='RESEARCH_ONLY'||!Array.isArray(exported?.records))errors.push('Invalid research export schema.');
 if(exported?.anchorStatus!=='UNVERIFIED_LOCAL_EXPORT')errors.push('Unsupported export anchor status.');
 if(!/^[0-9a-f]{64}$/.test(exported?.digestSha256||''))errors.push('Missing or invalid SHA-256 digest.');
 if(errors.length)return {valid:false,errors,independentlyTimestamped:false};
 const sealed=await sealResearchSnapshots(exported.records);
 if(sealed.digestSha256!==exported.digestSha256)errors.push('Research export digest mismatch: content may have changed.');
 const keys=new Set();
 for(const record of exported.records){
  const freezeErrors=validateSnapshot(record,Date.parse(record?.recordedAt||''));
  if(freezeErrors.length)errors.push(...freezeErrors.map(e=>'Invalid frozen snapshot: '+e));
  if(record?.schemaVersion!==FREEZE_SCHEMA||record?.mode!=='RESEARCH_ONLY'||record?.anchorStatus!=='UNVERIFIED_LOCAL'||record?.bettingDecision!=='PASS')errors.push('Invalid research-only record metadata.');
  const key=snapshotKey(record);
  if(keys.has(key))errors.push('Duplicate frozen race in export.');
  keys.add(key);
  if(!Number.isFinite(Date.parse(record?.recordedAt||''))||!(Date.parse(record.recordedAt)<Date.parse(record.scheduledPost)))errors.push('Freeze timestamp is missing or not before scheduled post.');
 }
 return {valid:errors.length===0,errors:[...new Set(errors)],independentlyTimestamped:false};
}
