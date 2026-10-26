import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const direct=load('./audits/belmont-2026-10-25-r9-original-pdf-ae-inspection.json');
const manifest=load('./audits/belmont-2026-10-25-r9-brisnet-source-identity.json');
test('original PDF AE text matches the locked source manifest',()=>{
 assert.equal(direct.source_sha256,manifest.source.sha256);
 assert.equal(direct.source_pages,manifest.source.pages);
 assert.deepEqual(direct.confirmed_ae.map(h=>[h.program,h.name]),manifest.entries.filter(h=>h.source_ae).map(h=>[h.program,h.name]));
 assert.ok(direct.confirmed_ae.every(h=>h.ae_marker===true));
});
test('direct PDF extraction is not falsely labeled a production importer replay',()=>{
 assert.equal(direct.production_importer_executed,false);
 assert.match(direct.extraction_method,/not production pdfjs-dist parser/);
});
