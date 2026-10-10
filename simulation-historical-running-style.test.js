import test from 'node:test';
import assert from 'node:assert/strict';
import {extractHistoricalCandidates,deriveReviewedRunningStyle,enrichRaceWithReviewedStyles} from './simulation-historical-running-style.js';
const line=(date,earlyPosition,fieldSize=9)=>({date,earlyPosition,fieldSize,sourceId:'DRF-pre-race.pdf',page:3,lineNumber:12,reviewedAgainstOriginalPP:true,reviewedBy:'manual-review'});
const date='2024-08-31';
test('PP candidate extraction does not claim verified call mapping',()=>{
 const x=extractHistoricalCandidates('20Û24= 7Sar fst 6f 22¨ :46¦ :58©1:12¦ 2 /9 2 1¦ 1ô 4¦ô 7¤ô',{sourceId:'DRF-pre-race.pdf',horseName:'Example'});
 assert.equal(x.length,1);assert.equal(x[0].requiresHumanReview,true);assert.equal(x[0].fieldSize,9);
});
test('two reviewed earlier lines yield an early style',()=>{
 const x=deriveReviewedRunningStyle({historicalCalls:[line('2024-07-01',1),line('2024-08-01',2)]},{raceDate:date});
 assert.equal(x.style,'E');assert.equal(x.usableLines,2);
});
test('two reviewed backmarker lines yield a closing style',()=>{
 const x=deriveReviewedRunningStyle({historicalCalls:[line('2024-07-01',8),line('2024-08-01',9)]},{raceDate:date});assert.equal(x.style,'S');
});
test('future or unreviewed lines cannot influence style',()=>{
 const x=deriveReviewedRunningStyle({historicalCalls:[line('2024-09-01',1),{...line('2024-08-01',1),reviewedAgainstOriginalPP:false}]},{raceDate:date});
 assert.equal(x.style,null);assert.equal(x.rejected.length,2);
});
test('one reviewed race is insufficient',()=>{
 assert.equal(deriveReviewedRunningStyle({historicalCalls:[line('2024-08-01',1)]},{raceDate:date}).style,null);
});
test('FTS and complete Timeform figures cannot be overwritten',()=>{
 const historicalCalls=[line('2024-07-01',1),line('2024-08-01',2)];
 const r=enrichRaceWithReviewedStyles({date,runners:[{program:'1',name:'One',careerStarts:2,historicalCalls},{program:'2',name:'FTS',careerStarts:0,historicalCalls},{program:'3',name:'Measured',careerStarts:2,tfEarly:100,tfLate:50,historicalCalls}]});
 assert.deepEqual(r.audit.map(x=>x.applied),[true,false,false]);assert.equal(r.race.runners[0].style,'E');assert.equal(r.race.runners[1].style,undefined);
});
