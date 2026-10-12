import test from 'node:test';import assert from 'node:assert/strict';import {parseRestoredCard} from './release-card-parser.js';
for(const [code,track] of [['FG','Fair Grounds'],['GP','Gulfstream Park'],['RP','Remington Park']])test('Current release parses '+track+' identity with measured evidence',()=>{
 const texts=['1',track,'6 Furlongs','Post time: 1:00 ET','1','5-1','Measured Runner','Own: Verified Stable','Life 1 M 0 0 0','TimeformUS Pace: Early 80 Late 90','1ã25=1'+code+' fst 6f','70 1/6','WORKS:','Daily Racing Form',track+' (12/20/2025)',code+', race 1, page:1'];
 const lines=texts.map(text=>({text,page:1,proofs:text==='70 1/6'?[{figure:70,post:1,field_size:6,font:'Paddock-Bold',page:1}]:[]}));
 const c=parseRestoredCard([{pageNumber:1,lines}]);assert.equal(c.track,track);assert.equal(c.date,'2025-12-20');assert.equal(c.races[1].horses[0].name,'Measured Runner');assert.deepEqual(c.races[1].horses[0].beyer_figures,[70]);assert.equal(c.races[1].horses[0].life_starts,1);
});
