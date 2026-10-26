import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {parsePPCard,detectPPFormat} from '../pp-format-router.js';
import {correctRaceField} from '../race-field-corrections.js';
import {eligible} from '../pre-race-provider-adapter.js';
import {active as brisnetActive} from '../brisnet-models.js';
const pdf=process.argv[2];
if(!pdf){console.error('Usage: node scripts/replay-bel1025-brisnet.mjs /path/to/bel1025p.pdf');process.exit(2)}
const raw=fs.readFileSync(pdf),sha=crypto.createHash('sha256').update(raw).digest('hex');
const expected=JSON.parse(fs.readFileSync(new URL('../audits/belmont-2026-10-25-r9-brisnet-source-identity.json',import.meta.url)));
assert.equal(sha,expected.source.sha256,'Original PDF SHA-256 mismatch');
const doc=await getDocument({data:new Uint8Array(raw),disableFontFace:true}).promise;
const pages=[];
for(let n=1;n<=doc.numPages;n++){const page=await doc.getPage(n);await page.getOperatorList();const tc=await page.getTextContent({disableNormalization:true});pages.push({pageNumber:n,items:tc.items})}
assert.equal(doc.numPages,expected.source.pages);
assert.equal(detectPPFormat(pages),'BRISNET_PREMIUM_PLUS');
const card=parsePPCard(pages,{sourceName:'bel1025p.pdf'});
const race=card.races?.[9];assert.ok(race,'Race 9 not imported');
const official=JSON.parse(fs.readFileSync(new URL('../audits/belmont-2026-10-25-r9-field.json',import.meta.url)));
const identities=race.horses.map(h=>({program:String(h.n),name:h.name,entry_status:h.entry_status}));
const pairs=identities.map(h=>[h.program,h.name]);
assert.deepEqual(pairs,expected.entries.map(h=>[h.program,h.name]),'Imported horse identities differ from original source manifest');
assert.deepEqual(identities.filter(h=>h.entry_status==='AE').map(h=>h.program),['13','14']);
const initialEligible=race.horses.filter(h=>h.included_in_frozen_field!==false);
assert.equal(initialEligible.length,12,'Expected 12 regular pre-correction entries');
// Apply only independently confirmed field actions, not inferred from a post-race result.
const original=structuredClone(card);
// Historical actions are reconstructed from separately verified field evidence.
// Use the replay execution time, not a fabricated 2026-10-25 pre-race observation.
const replayObservedAt=new Date().toISOString();
let cards={BRISNET:card};
for(const [program,action] of [['13','running'],['1','scratch'],['14','scratch']]){
 cards=correctRaceField(cards,'BRISNET',9,program,action,replayObservedAt);
}
const final=cards.BRISNET.races[9].horses;
const starters=official.entries.filter(x=>x.status==='STARTER').map(x=>x.program);
const scratches=official.entries.filter(x=>x.status==='SCRATCHED').map(x=>x.program);
assert.deepEqual(final.filter(eligible).map(h=>String(h.n)),starters,'Final adapter field mismatch');
assert.deepEqual(final.filter(brisnetActive).map(h=>String(h.n)),starters,'Final Brisnet model field mismatch');
assert.deepEqual(final.filter(h=>h.odds==='SCR').map(h=>String(h.n)),scratches,'Official scratch mismatch');
assert.deepEqual(final.map(h=>h.ratings),race.horses.map(h=>h.ratings),'Ratings changed during field correction');
assert.deepEqual(card,original,'Source card mutated during field correction');
const report={replay_observed_at_utc:replayObservedAt,field_correction_evidence:'RETROSPECTIVE_REPLAY_OF_VERIFIED_FINAL_FIELD',source_sha256:sha,format:'BRISNET_PREMIUM_PLUS',pages:doc.numPages,initial_entries:identities,initial_eligible_programs:initialEligible.map(h=>String(h.n)),final_starter_programs:starters,final_scratch_programs:scratches,source_horse_count:race.horses.length,final_eligible_count:starters.length,status:'ORIGINAL_PDF_IMPORT_AND_FIELD_CORRECTION_VERIFIED',note:'Only when this command is executed successfully on the original PDF. Historical freeze remains non-prospective; no predictions or ROI certified.'};
console.log(JSON.stringify(report,null,2));
await doc.destroy();
