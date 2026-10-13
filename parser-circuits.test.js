import test from 'node:test';import assert from 'node:assert/strict';
import {parseRestoredCard} from './release-card-parser.js';
import {raceConditions,conditionBlockers} from './race-conditions.js';
import {releaseRace} from './rankings-release.js';
const page=(track='Del Mar',code='Dmr',extra=[],starts=1,figure=70)=>({pageNumber:1,lines:['1',track,'6 Furlongs','Post time: 1:00 PT',...extra,'1','5-1','Measured Runner','Own: Stable',`Life ${starts} M 0 0 0`,'TimeformUS Pace: Early 80 Late 90',`1Ý26=1${code} fst 6f`,`${figure} 1/6`,'WORKS:','TRAINER: 1stStart(280 .17 $1.41)','Daily Racing Form',`${track} (8/22/2026)`,`${code}, race 1, page:1`].map(text=>({text,page:1,proofs:text===`${figure} 1/6`?[{figure,post:1,field_size:6,font:'Paddock-Bold',page:1}]:[]}))});
test('Del Mar identity, verified zero Beyer and experienced career record survive import',()=>{
 const c=parseRestoredCard([page('Del Mar','Dmr',[],4,0)]),h=c.races[1].horses[0];assert.equal(c.track,'Del Mar');assert.equal(c.date,'2026-08-22');assert.equal(h.life_starts,4);assert.deepEqual(h.beyer_figures,[0]);assert.equal(releaseRace(c.races[1]).decision,'RATEABLE');
});
test('PP-only scratches carry source identities and never become rated horses',()=>{
 const c=parseRestoredCard([page('Del Mar','Dmr',['Scratched - Ì5 Royal Lady and Ì7 Cotta Ride'])]);
 assert.deepEqual(c.races[1].predeclared_scratches.map(h=>[h.program,h.name]),[['5','Royal Lady'],['7','Cotta Ride']]);assert.equal(c.races[1].horses.length,1);
});
test('malformed and conflicting scratch lists refuse the card',()=>{
 for(const line of ['Scratched - Royal Lady','Scratched - Ì1 Measured Runner','Scratched - Ì5 One and Ì5 Two'])assert.throws(()=>parseRestoredCard([page('Del Mar','Dmr',[line])]),/scratch/i);
});
test('page track and card identity must agree',()=>{assert.throws(()=>parseRestoredCard([page('Gulfstream Park','Dmr')]),/track conflicts/)});
test('results charts and other providers without DRF footers cannot create a card',()=>{
 assert.throws(()=>parseRestoredCard([{pageNumber:1,lines:[{text:'DEL MAR - August 22, 2026 - Race 1',proofs:[]}]}]),/footer unverified/);
});
test('Arabian, Quarter Horse and hurdle races are explicitly blocked; ordinary dirt remains supported',()=>{
 for(const breed of ['ARABIAN','Quarter Horse','Hurdle']){const c=raceConditions(`1 MILE ${breed}. Purse $10,000`);assert.equal(c.unsupported,true);assert.equal(conditionBlockers(c)[0].reason,'unsupported-race-type')}
 assert.equal(raceConditions('1 MILE ALLOWANCE. Purse $10,000').unsupported,false);
});
test('unsupported breed blocks the full rating even if numerical figures are available',()=>{
 const r=parseRestoredCard([page()]).races[1];r.conditions=raceConditions('1 MILE ARABIAN.');r.parser_blockers=conditionBlockers(r.conditions);assert.equal(releaseRace(r).decision,'PASS');
});
