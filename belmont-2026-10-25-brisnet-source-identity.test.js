import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load = p => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const b = load('./audits/belmont-2026-10-25-r9-brisnet-source-identity.json');
const d = load('./audits/belmont-2026-10-25-r9-drf-freeze-identity.json');
const f = load('./audits/belmont-2026-10-25-r9-field.json');
test('Brisnet and DRF match official entry identities', () => {
 assert.equal(b.entries.length, 14);
 assert.deepEqual(b.entries.map(x => [x.program,x.name]), d.original_drf_pdf.race9_program_name_pairs.map(x => [x.program,x.name]));
 assert.deepEqual(b.entries.map(x => [x.program,x.name]), f.entries.map(x => [x.program,x.name]));
});
test('Brisnet AE labels are separate from final scratches', () => {
 assert.deepEqual(b.entries.filter(x => x.source_ae).map(x => x.program), ['13','14']);
 assert.deepEqual(f.entries.filter(x => x.status === 'SCRATCHED').map(x => x.program), ['1','14']);
 assert.equal(f.entries.find(x => x.program === '13').status, 'STARTER');
 assert.equal(f.prospective_gradeable, false);
});
