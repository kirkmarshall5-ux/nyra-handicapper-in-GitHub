// Certification readiness is independent of ranking/scoring and must fail closed.
// This report records only verified evidence, never converts missing evidence into a pass.
import {assessRaceGradeability} from './race-gradeability-evidence.js';
import {inspectEvidenceProvenance} from './evidence-provenance.js';
export function assessCertificationReadiness({raceId,field,rankedPrograms,record,evidence,verificationContext,productionPdfReplayPassed=false,officialFinishIndependentlyMatched=false,postTimeIndependentlyVerified=false}={}){
 const blockers=[];
 if(!raceId||record?.raceId!==raceId||evidence?.raceId!==raceId)blockers.push('RACE_IDENTITY_UNVERIFIED');
 const gate=assessRaceGradeability({field,rankedPrograms,originalPdfReplayVerified:productionPdfReplayPassed,officialChartFinishVerified:officialFinishIndependentlyMatched,independentFreezeTimeVerified:postTimeIndependentlyVerified});
 blockers.push(...gate.reasons);
 if(!record||!evidence)blockers.push('RECORD_OR_EVIDENCE_MISSING');
 else {
  if(evidence.testOnlySynthetic===true)blockers.push('SYNTHETIC_EVIDENCE_NOT_CERTIFIABLE');
  if(evidence.predictionArtifactId!==record.predictionArtifactId)blockers.push('PREDICTION_ARTIFACT_MISMATCH');
  if(!Array.isArray(evidence.rankedPrograms)||evidence.rankedPrograms.map(String).join('|')!==(rankedPrograms||[]).map(String).join('|'))blockers.push('RANKING_FIELD_MISMATCH');
  const provenance=inspectEvidenceProvenance(evidence,record,verificationContext);
  blockers.push(...provenance.reasons);
 }
 return {schema:'nyra-certification-readiness-v1',raceId:raceId||null,status:blockers.length?'NOT_CERTIFIED':'EVIDENCE_VERIFIED_REVIEW_REQUIRED',certified:false,blockers:[...new Set(blockers)],starterCount:gate.starterCount??null,rankedCount:gate.rankedCount??null,missingStarters:gate.missingStarters??[],note:'Evidence verification does not itself certify model accuracy, ROI, or independence of signing authorities.'};
}
