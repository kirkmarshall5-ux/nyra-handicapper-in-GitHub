#!/usr/bin/env node
// Offline verification of operator-supplied artifacts. This tool never issues signatures.
// Run with an independently configured trust store (outside the evidence bundle).
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {inspectEvidenceProvenance} from '../evidence-provenance.js';
const usage='Usage: NYRA_TRUST_STORE=/secure/approved-issuers.json node scripts/verify-race-evidence.mjs record.json evidence.json replay.json official-chart.json externally-anchored-freeze.json';
const fail=(code,message)=>{console.error(JSON.stringify({status:'NOT_CERTIFIED',reasons:[code],message}));process.exitCode=2;};
const paths=process.argv.slice(2);
if(paths.length!==5){fail('INVALID_ARGUMENTS',usage);}
else if(!process.env.NYRA_TRUST_STORE){fail('TRUST_STORE_NOT_CONFIGURED','An independently maintained NYRA_TRUST_STORE is mandatory.');}
else {
 try{
  const storePath=resolve(process.env.NYRA_TRUST_STORE);
  if(paths.map(p=>resolve(p)).includes(storePath))throw Error('Trust store cannot be one of the evidence artifacts');
  const readJson=p=>JSON.parse(readFileSync(p,'utf8'));
  const [record,evidence]=paths.slice(0,2).map(readJson);
  const artifacts={originalPdfReplay:readFileSync(paths[2]),officialChart:readFileSync(paths[3]),independentFreeze:readFileSync(paths[4])};
  const trustStore=readJson(storePath);
  const result=inspectEvidenceProvenance(evidence,record,{artifacts,trustStore});
  const report={status:result.verified?'SIGNATURES_VERIFIED_NOT_CONTENT_CERTIFIED':'NOT_CERTIFIED',verified:result.verified,reasons:result.reasons,raceId:record.raceId??null,artifactId:record.predictionArtifactId??null};
  console.log(JSON.stringify(report,null,2));
  if(!result.verified)process.exitCode=1;
 }catch(e){fail('VERIFICATION_ERROR',String(e.message||e));}
}
