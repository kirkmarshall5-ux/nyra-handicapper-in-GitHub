// Independently verifiable evidence: bind trusted issuer signatures to exact artifacts.
// Public keys must be configured by the verifier operator, never supplied by the race record.
// A signature proves endorsement by the configured key, NOT the factual truth of a chart.
import {createPublicKey,verify as verifySignature,createHash} from 'node:crypto';
const digest=x=>createHash('sha256').update(x).digest('hex');
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
const utc=x=>typeof x==='string'&&/(?:Z|[+-]\d\d:\d\d)$/.test(x)&&Number.isFinite(Date.parse(x));
const stable=x=>JSON.stringify(x,Object.keys(x).sort()); // evidence payloads below are flat
export function verifyTrustedAttestations({record,evidence,artifacts,trustStore}={}){
 const reasons=[];
 if(!record||!evidence||!artifacts||!trustStore||typeof trustStore!=='object')return {verified:false,reasons:['VERIFICATION_INPUTS_MISSING']};
 if(evidence.testOnlySynthetic===true)return {verified:false,reasons:['SYNTHETIC_EVIDENCE_NOT_CERTIFIABLE']};
 const requirements=[
  ['originalPdfReplay','pdf-replay',record.raceId,'replayArtifactSha256'],
  ['officialChart','official-chart',record.raceId,'chartArtifactSha256'],
  ['independentFreeze','external-freeze-anchor',record.raceId,'snapshotSha256']
 ];
 const p=evidence.provenance||{};
 for(const [key,kind,raceId,hashField] of requirements){
  const claim=p[key],att=evidence.attestations?.[key],artifact=artifacts[key];
  if(!claim||!att||!artifact){reasons.push(key.toUpperCase()+'_ATTESTATION_MISSING');continue}
  if(!sha(claim[hashField])||!Buffer.isBuffer(artifact)&&!(artifact instanceof Uint8Array)||digest(artifact)!==claim[hashField].toLowerCase()){reasons.push(key.toUpperCase()+'_ARTIFACT_HASH_MISMATCH');continue}
  const signer=trustStore[att.keyId];
  if(!signer||signer.kind!==kind||typeof signer.publicKeyPem!=='string'){reasons.push(key.toUpperCase()+'_UNTRUSTED_SIGNER');continue}
  if(att.algorithm!=='ed25519'||!utc(att.signedAt)||typeof att.signatureBase64!=='string'){reasons.push(key.toUpperCase()+'_INVALID_SIGNATURE_METADATA');continue}
  if(att.raceId!==raceId||att.kind!==kind||att.artifactSha256!==claim[hashField]||att.predictionArtifactId!==record.predictionArtifactId){reasons.push(key.toUpperCase()+'_ATTESTATION_IDENTITY_MISMATCH');continue}
  if(key==='independentFreeze'){
   if(!utc(claim.anchoredAt)||Date.parse(claim.anchoredAt)<Date.parse(record.predictionFrozenAt)||Date.parse(claim.anchoredAt)>=Date.parse(record.chartPublishedAt)||att.signedAt!==claim.anchoredAt){reasons.push('FREEZE_ANCHOR_TIME_INVALID');continue}
  }
  const payload={schema:'nyra-trusted-attestation-v1',keyId:att.keyId,kind:att.kind,raceId:att.raceId,predictionArtifactId:att.predictionArtifactId,artifactSha256:att.artifactSha256,signedAt:att.signedAt};
  try{
   const sig=Buffer.from(att.signatureBase64,'base64');
   if(sig.length!==64||!verifySignature(null,Buffer.from(stable(payload)),createPublicKey(signer.publicKeyPem),sig))reasons.push(key.toUpperCase()+'_SIGNATURE_INVALID');
  }catch{reasons.push(key.toUpperCase()+'_SIGNATURE_INVALID')}
 }
 return {verified:reasons.length===0,reasons};
}
