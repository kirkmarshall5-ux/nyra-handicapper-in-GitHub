import {verifyTrustedAttestations} from './trusted-evidence-verifier.js';
// Source-evidence contract. Metadata is not authentication; caller flags never certify races.
// Explicit test-only fixtures can exercise calculations but must never be treated as real evidence.
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
const https=x=>typeof x==='string'&&/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(x);
const time=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&/(?:Z|[+-]\d\d:\d\d)$/.test(x);
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
export function inspectEvidenceProvenance(evidence,record,verificationContext){
 const reasons=[];
 if(!evidence||typeof evidence!=='object')return {verified:false,reasons:['EVIDENCE_PROVENANCE_MISSING']};
 if(evidence.testOnlySynthetic===true)return {verified:false,reasons:['SYNTHETIC_EVIDENCE_NOT_CERTIFIABLE']};
 const p=evidence.provenance;
 if(!p||typeof p!=='object')return {verified:false,reasons:['EVIDENCE_PROVENANCE_MISSING']};
 const pdf=p.originalPdfReplay,chart=p.officialChart,freeze=p.independentFreeze;
 if(!pdf||!sha(pdf.sourceSha256)||!nonempty(pdf.parserVersion)||!nonempty(pdf.replayArtifactId)||!sha(pdf.replayArtifactSha256)||pdf.raceId!==record?.raceId||pdf.verified!==true)reasons.push('PDF_REPLAY_PROVENANCE_INCOMPLETE');
 if(!chart||!https(chart.sourceUrl)||!nonempty(chart.chartId)||chart.chartId!==record?.officialChartId||!time(chart.retrievedAt)||!sha(chart.chartArtifactSha256)||chart.raceId!==record?.raceId||chart.verified!==true)reasons.push('OFFICIAL_CHART_PROVENANCE_INCOMPLETE');
 if(!freeze||!nonempty(freeze.externalAnchorId)||!https(freeze.externalAnchorUrl)||!time(freeze.anchoredAt)||!sha(freeze.snapshotSha256)||freeze.predictionArtifactId!==record?.predictionArtifactId||freeze.raceId!==record?.raceId||freeze.verified!==true)reasons.push('INDEPENDENT_FREEZE_PROVENANCE_INCOMPLETE');
 if(time(freeze?.anchoredAt)&&time(record?.predictionFrozenAt)&&Date.parse(freeze.anchoredAt)<Date.parse(record.predictionFrozenAt))reasons.push('FREEZE_ANCHOR_BEFORE_PREDICTION');
 if(time(freeze?.anchoredAt)&&time(record?.chartPublishedAt)&&Date.parse(freeze.anchoredAt)>=Date.parse(record.chartPublishedAt))reasons.push('FREEZE_ANCHOR_NOT_BEFORE_CHART');
 // A valid-looking digest or HTTPS URL does not prove that a third party authenticated it.
 // Until an independent trusted verifier is integrated, refuse certification by default.
 if(!verificationContext)reasons.push('TRUSTED_EXTERNAL_VERIFIER_NOT_CONFIGURED');
 else {
  const att=verifyTrustedAttestations({record,evidence,...verificationContext});
  reasons.push(...att.reasons);
 }
 return {verified:reasons.length===0,reasons};
}
