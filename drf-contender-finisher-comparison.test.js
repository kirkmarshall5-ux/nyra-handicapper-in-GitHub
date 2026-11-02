import test from 'node:test';
import assert from 'node:assert/strict';
import {compareDrfFrozenRace} from './scripts/drf-contender-finisher-comparison.mjs';
const card={source_format:'DRF',races:{1:{horses:[1,2,3,4,5].map(n=>({n:String(n),name:'HORSE '+n}))}}};
test('reports top choice, winner rank, and top-four coverage separately',()=>{
 const x=compareDrfFrozenRace({card,race:1,contender:['1','2','3','4'],finisher:['2','1','4','3'],finishOrder:['1','3','4','2']});
 assert.equal(x.contender.topChoiceWon,true);
 assert.equal(x.finisher.topChoiceWon,false);
 assert.equal(x.finisher.winnerRank,2);
 assert.equal(x.contender.topFourHits,4);
 assert.equal(x.finisher.topFourHits,4);
 assert.equal(x.contender.exactTopFourOrder,false);
});
test('rejects a Brisnet card',()=>assert.throws(()=>compareDrfFrozenRace({card:{...card,source_format:'BRISNET_PREMIUM_PLUS'},race:1,contender:[1,2,3,4],finisher:[1,2,3,4],finishOrder:[1,2,3,4]}),/DRF-only/));
test('rejects duplicate frozen rankings',()=>assert.throws(()=>compareDrfFrozenRace({card,race:1,contender:[1,1,3,4],finisher:[1,2,3,4],finishOrder:[1,2,3,4]}),/distinct/));
test('rejects unknown program IDs',()=>assert.throws(()=>compareDrfFrozenRace({card,race:1,contender:[1,2,3,99],finisher:[1,2,3,4],finishOrder:[1,2,3,4]}),/unknown DRF runner/));
