import test from 'node:test';
import assert from 'node:assert/strict';
import {joinBrisnetHeaderEvidence} from './brisnet-header-evidence-join.js';
const page1="Cast a Coin (P 3) B. g. 4 Prime Power: 109.7\nGold Templar (E/P 3) B. g. 6 Prime Power: 105.0\nBanker's Jet (E 7) B. g. 3 Prime Power: 111.0";
const page2="Vino's Valentine (E/P 5) B. c. 4 Prime Power: 114.8\nFric and Frac (E/P 4) Gr. g. 4 Prime Power: 113.0\nGuilty (E 7) B. g. 4 Prime Power: 115.0";
// Program IDs below are fixture identifiers, not verified race-card program assignments.
const race={number:1,horses:[{n:'1',name:'Cast a Coin'},{n:'2',name:'Gold Templar'},{n:'3',name:"Banker's Jet"},{n:'4',name:"Vino's Valentine"},{n:'5',name:'Fric and Frac'},{n:'6',name:'Guilty'}]};
test('six real Finger Lakes Nov 9 race 1 PP headers join by name and race',()=>{
 const r=joinBrisnetHeaderEvidence(race,[{page:1,race:1,text:page1},{page:2,race:1,text:page2}]);
 assert.equal(r.matched.length,6);assert.equal(r.coverage,1);assert.equal(r.complete,true);
 assert.equal(r.matched[3].runStyle,'EP');assert.equal(r.matched[3].quirinPoints,5);
 assert.equal(r.matched[5].source_context.running_style.page,2);
});
test('wrong race or missing header does not silently match',()=>{
 const r=joinBrisnetHeaderEvidence(race,[{page:1,race:2,text:page1}]);
 assert.equal(r.matched.length,0);assert.equal(r.unmatched.length,6);
});
test('duplicate horse header is ambiguous, never selected by row order',()=>{
 const r=joinBrisnetHeaderEvidence({number:1,horses:[race.horses[0]]},[{page:1,race:1,text:page1+'\n'+page1}]);
 assert.equal(r.complete,false);assert.equal(r.ambiguous[0].reason,'AMBIGUOUS_NAME');
});
