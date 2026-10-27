import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {verifyTrustedAttestations} from './trusted-evidence-verifier.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
const payload=o=>JSON.stringify(o,Object.keys(o).sort());
test('trusted signed artifact evidence succeeds; tampering, untrusted signers and missing artifact fail',()=>{
 const raceId='TEST-R1',predictionArtifactId='sha256:test',keys={};
 for(const kind of ['pdf-replay','official-chart','external-freeze-anchor'])keys[kind]=generateKeyPairSync('ed25519');
 const record={raceId,predictionArtifactId,predictionFrozenAt:'2026-10-25T12:00:00Z',scheduledPost:'2026-10-25T16:00:00Z',chartPublishedAt:'2026-10-25T17:00:00Z'};
 const artifacts={originalPdfReplay:Buffer.from('original replay'),officialChart:Buffer.from('official chart'),independentFreeze:Buffer.from('anchored snapshot')};
 const kinds={originalPdfReplay:'pdf-replay',officialChart:'official-chart',independentFreeze:'external-freeze-anchor'};
 const hashes={originalPdfReplay:'replayArtifactSha256',officialChart:'chartArtifactSha256',independentFreeze:'snapshotSha256'};
 const provenance={},attestations={},trustStore={};
 for(const [key,kind] of Object.entries(kinds)){
  const keyId='trusted-'+kind,artifactSha256=hash(artifacts[key]),signedAt='2026-10-25T12:01:00Z';
  provenance[key]={[hashes[key]]:artifactSha256,...(key==='independentFreeze'?{anchoredAt:signedAt}:{})};
  const data={schema:'nyra-trusted-attestation-v1',keyId,kind,raceId,predictionArtifactId,artifactSha256,signedAt};
  attestations[key]={...data,algorithm:'ed25519',signatureBase64:sign(null,Buffer.from(payload(data)),keys[kind].privateKey).toString('base64')};
  trustStore[keyId]={kind,publicKeyPem:keys[kind].publicKey.export({type:'spki',format:'pem'})};
 }
 const evidence={provenance,attestations};
 assert.equal(verifyTrustedAttestations({record,evidence,artifacts,trustStore}).verified,true);
 assert.ok(verifyTrustedAttestations({record:{...record,scheduledPost:'2026-10-25T12:00:30Z'},evidence,artifacts,trustStore}).reasons.includes('FREEZE_ANCHOR_TIME_INVALID'));
 assert.ok(verifyTrustedAttestations({record,evidence,artifacts:{...artifacts,officialChart:Buffer.from('changed')},trustStore}).reasons.includes('OFFICIALCHART_ARTIFACT_HASH_MISMATCH'));
 assert.ok(verifyTrustedAttestations({record,evidence,artifacts,trustStore:{}}).reasons.includes('ORIGINALPDFREPLAY_UNTRUSTED_SIGNER'));
 const forged=structuredClone(evidence);forged.attestations.independentFreeze.signatureBase64=Buffer.alloc(64).toString('base64');
 assert.ok(verifyTrustedAttestations({record,evidence:forged,artifacts,trustStore}).reasons.includes('INDEPENDENTFREEZE_SIGNATURE_INVALID'));
 assert.equal(verifyTrustedAttestations({record,evidence:{...evidence,testOnlySynthetic:true},artifacts,trustStore}).verified,false);
});
