import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

export const RACE_EVIDENCE = Object.freeze([
  'official_chart_url',
  'official_chart_id',
  'official_chart_manually_reviewed',
  'official_post_time_verified',
  'official_surface_distance_verified',
  'official_scratch_ae_mto_verified',
  'official_finish_and_corrections_verified',
  'pp_to_official_starter_identity_verified',
  'pre_race_full_field_rankings_verified',
  'pass_action_record_verified',
  'pre_race_anchor_verified'
]);
// Historical source identity and publisher's off-minute observations are immutable
// for this pilot. The index reports minute precision, not exact seconds.
const ORIGINAL_FREEZE_UTC='2026-10-25T19:04:47.198Z';
const ORIGINAL_FREEZE_SHA256='2c4aa2c183a44377ee1b6895541a184fde8da5169e6a3a32cb582d8baddffbf6';
const PUBLISHED_OFF_MINUTES_UTC=Object.freeze([
 '2026-10-25T17:12:00Z','2026-10-25T17:45:00Z','2026-10-25T18:18:00Z',
 '2026-10-25T18:51:00Z','2026-10-25T19:25:00Z','2026-10-25T20:00:00Z',
 '2026-10-25T20:40:00Z','2026-10-25T21:15:00Z','2026-10-25T21:53:00Z'
]);
export function auditIssue74(ledger) {
  if(ledger?.issue!==74 || !Array.isArray(ledger.races) || ledger.races.length!==9)
    throw Error('Expected Issue #74 nine-race pilot ledger');
  const seen=new Set();
  const globalBlockers=[];
  if(ledger.chart_source?.review_status!=='ALL_CHARTS_MANUALLY_VERIFIED')
    globalBlockers.push('Official chart content not manually verified for full card');
  if(ledger.source_pdf?.production_pdfjs_replay_executed!==true)
    globalBlockers.push('Original Brisnet PDF production pdfjs replay not executed');
  if(ledger.freeze?.independent_before_post_anchor_verified!==true)
    globalBlockers.push('No independent before-post timestamp anchor for historical freeze');
  if(ledger.freeze?.sha256!==ORIGINAL_FREEZE_SHA256)
    globalBlockers.push('Historical source freeze SHA-256 changed or missing');
  if(ledger.freeze?.browser_recorded_at_utc!==ORIGINAL_FREEZE_UTC)
    globalBlockers.push('Historical source freeze capture time changed or missing');
  const races=ledger.races.map(race=>{
    if(!Number.isInteger(race.race)||race.race<1||race.race>9||seen.has(race.race))
      throw Error('Duplicate or invalid race number');
    seen.add(race.race);
    const blockers=[...globalBlockers];
    const originalFreezeMs=Date.parse(ORIGINAL_FREEZE_UTC);
    const publishedOffMinuteMs=Date.parse(PUBLISHED_OFF_MINUTES_UTC[race.race-1]);
    // When the freeze follows the start of the published off minute, it cannot
    // be prospective. Never let manually edited booleans, URLs or discrepancy
    // lists override this immutable source/time relationship.
    if(originalFreezeMs>=publishedOffMinuteMs)
      blockers.push('Original October 25 freeze occurred after the published off minute: permanently non-prospective');
    if(race.equibase_published_off_time_local!==
      ['2026-10-25 13:12 EDT','2026-10-25 13:45 EDT','2026-10-25 14:18 EDT',
       '2026-10-25 14:51 EDT','2026-10-25 15:25 EDT','2026-10-25 16:00 EDT',
       '2026-10-25 16:40 EDT','2026-10-25 17:15 EDT','2026-10-25 17:53 EDT'][race.race-1])
      blockers.push('Publisher off-minute observation modified or missing');
    for(const field of RACE_EVIDENCE){
      const value=race[field];
      if((field==='official_chart_url'||field==='official_chart_id') ? !(typeof value==='string'&&value.trim()) : value!==true)
        blockers.push('Missing '+field);
    }
    const anchor=race.pre_race_anchor_observed_at_utc;
    const post=race.official_post_at_utc;
    const independentEvidence=race.independent_anchor_evidence_uri;
    if(!anchor||!post||!Number.isFinite(Date.parse(anchor))||!Number.isFinite(Date.parse(post))||Date.parse(anchor)>=Date.parse(post))
      blockers.push('Independent anchor is not proven earlier than official off time');
    if(typeof independentEvidence!=='string'||!independentEvidence.startsWith('https://'))
      blockers.push('Independent timestamp evidence URL missing');
    if(race.original_decision!=='PASS'&&race.original_decision!=='RATEABLE')
      blockers.push('Original PASS/ACTION decision missing');
    if((race.known_discrepancies||[]).length)
      blockers.push(...race.known_discrepancies);
    // An asserted certified flag cannot override independent evidence requirements.
    if(race.prospective_gradeable===true&&blockers.length)
      blockers.push('Contradictory prospective_gradeable claim');
    return {race:race.race,original_decision:race.original_decision,evidence_complete:blockers.length===0,certified:false,blockers};
  });
  const evidence_ready_count=races.filter(r=>r.evidence_complete).length;
  // Structural booleans and URLs are user-supplied assertions, NOT verified signatures,
  // trusted chart digests, or independently authenticated pre-post timestamp receipts.
  // Never elevate this inventory to prospective certification without a separate verifier.
  return {issue:74,scope:'BEL-2026-10-25',total:9,evidence_ready_count,
    certified:0,blocked:9,certification_status:evidence_ready_count===9?'AWAITING_INDEPENDENT_VERIFICATION':'CERTIFICATION_BLOCKED',races};
}
const isCli=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(isCli){
  const path=process.argv[2]||new URL('../audits/issue74-bel1025-certification-ledger.json',import.meta.url);
  const report=auditIssue74(JSON.parse(fs.readFileSync(path,'utf8')));
  console.log(JSON.stringify(report,null,2));
  if(report.blocked)process.exitCode=1;
}
