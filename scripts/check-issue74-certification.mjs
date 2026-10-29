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
  const races=ledger.races.map(race=>{
    if(!Number.isInteger(race.race)||race.race<1||race.race>9||seen.has(race.race))
      throw Error('Duplicate or invalid race number');
    seen.add(race.race);
    const blockers=[...globalBlockers];
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
