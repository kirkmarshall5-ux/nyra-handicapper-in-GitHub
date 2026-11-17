import test from 'node:test';
import assert from 'node:assert/strict';
import {fromVerifiedBrisnetEvidence} from './finisher-pace-brisnet-adapter.js';
const race={horses:[
 {n:'1',odds:'2',source_context:{running_style:{provider:'BRISNET',status:'SOURCE_VERIFIED',value:'E'}}},
 {n:'2',odds:'3',source_context:{running_style:{provider:'BRISNET',status:'SOURCE_VERIFIED',value:'E'}}},
 {n:'3',odds:'4',source_context:{running_style:{provider:'BRISNET',status:'SOURCE_VERIFIED',value:'P'}}}
]};
test('verified source styles can influence companion',()=>{
 const r=fromVerifiedBrisnetEvidence(race,'1',new Map([['1',90],['2',82],['3',81]]));
 assert.equal(r.companion.program,'3');
 assert.equal(r.sourceCoverage.verifiedRunStyles,3);
});
test('unverified source styles are neutral, never guessed',()=>{
 const unverified={horses:race.horses.map(h=>({...h,source_context:{running_style:{provider:'BRISNET',status:'PENDING',value:h.source_context.running_style.value}}}))};
 const r=fromVerifiedBrisnetEvidence(unverified,'1',new Map([['1',90],['2',82],['3',81]]));
 assert.equal(r.companion.program,'2');
 assert.equal(r.scenario.confidence,0);
 assert.match(r.warning,/NO VERIFIED/);
});
