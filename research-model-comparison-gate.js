// Research-only validation of model comparisons. No wagering or scoring changes.
export const MODEL_COMPARISON_GATE='MODEL-COMPARISON-GATE-v1';
const unique=a=>Array.isArray(a)&&new Set(a).size===a.length;
export function validateModelComparison(records){
 if(!Array.isArray(records)||!records.length)return {status:'HOLD',reasons:['NO_RECORDS']};
 const reasons=[];
 const source=records[0]?.provider, race=records[0]?.raceKey;
 if(!source||!race)reasons.push('SOURCE_OR_RACE_MISSING');
 if(records.some(r=>r.provider!==source))reasons.push('MIXED_PROVIDER_FAMILIES');
 if(records.some(r=>r.raceKey!==race))reasons.push('MIXED_RACES');
 for(const r of records){
  if(!r.model||!r.snapshotId||!r.snapshotTime||!r.officialOffTime)reasons.push('SNAPSHOT_PROVENANCE_MISSING');
  else if(!Number.isFinite(Date.parse(r.snapshotTime))||!Number.isFinite(Date.parse(r.officialOffTime))||Date.parse(r.snapshotTime)>=Date.parse(r.officialOffTime))reasons.push('PRE_OFF_TIME_UNVERIFIED');
  if(r.snapshotVerified!==true)reasons.push('SNAPSHOT_NOT_INDEPENDENTLY_VERIFIED');
  if(r.finalFieldVerified!==true)reasons.push('FINAL_FIELD_UNVERIFIED');
  if(r.officialResultVerified!==true)reasons.push('OFFICIAL_RESULT_UNVERIFIED');
  if(!unique(r.rankedRunnerIds)||!unique(r.officialFinishIds)||!Array.isArray(r.rankedRunnerIds)||!Array.isArray(r.officialFinishIds))reasons.push('INVALID_RANKING_OR_RESULT');
  else if(r.rankedRunnerIds.length!==r.officialFinishIds.length||r.rankedRunnerIds.some(id=>!r.officialFinishIds.includes(id)))reasons.push('FIELD_OR_FINISH_MISMATCH');
  if(r.pass===true)reasons.push('PASS_RACE_EXCLUDED_FROM_ACTION_ONLY');
 }
 return {status:reasons.length?'HOLD':'ELIGIBLE_FOR_DESCRIPTIVE_GRADING',provider:source,raceKey:race,reasons:[...new Set(reasons)],models:records.map(r=>r.model),recordsReviewed:records.length,scoringChanged:false};
}
