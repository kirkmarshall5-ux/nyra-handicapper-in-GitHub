import test from 'node:test';
import assert from 'node:assert/strict';
import {inventoryFinisherCandidates} from './finisher-frozen-card-inventory.js';
const model=(id,decision='RANKED')=>({id,decision,rankings:[{n:'3'},{n:'6'}]});
test('PASS race is not promoted into eligible research sample',()=>{
 const f={track:'Fixture',card_date:'2026-01-01',races:[{race:1,dashboard:{race:{surface:'Dirt',distance:'6F'},field:[{n:'3'},{n:'6'}],models:[model('brisResearch','PASS'),model('brisFinisher','PASS')]}}]};
 const x=inventoryFinisherCandidates(f);
 assert.equal(x.candidates,0);assert.equal(x.excluded,1);
 assert.deepEqual(x.rows[0].reasons,['MODEL_PASS_OR_HOLD']);
});
test('complete frozen ranking is a candidate but never an official result',()=>{
 const f={track:'Fixture',card_date:'2026-01-01',races:[{race:2,dashboard:{field:[{n:'3'},{n:'6'}],models:[model('brisResearch'),model('brisFinisher')]}}]};
 const x=inventoryFinisherCandidates(f);
 assert.equal(x.candidates,1);assert.equal(x.rows[0].officialResultsVerified,false);
});
