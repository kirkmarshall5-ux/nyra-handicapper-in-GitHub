import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateFinisherDisagreements} from './finisher-pace-disagreement-backtest.js';
const horses=[
 {program:'1',runStyle:'E',quirinPoints:8,finisherScore:95},
 {program:'2',runStyle:'E',quirinPoints:0,finisherScore:50},
 {program:'3',runStyle:'EP',quirinPoints:0,finisherScore:80},
 {program:'4',runStyle:'P',quirinPoints:0,finisherScore:80}
];
const race={id:'fixture',horses,rrFirstProgram:'1',decision:'RANKED',
 frozenBeforeResults:true,resultVerified:true,officialFirst:'1',officialSecond:'4',
 exactaPayoutForOneDollar:20,exactaPayoutVerified:true};
test('disagreement only: style picks P and Quirin picks EP; exacta ROI paired',()=>{
 const x=evaluateFinisherDisagreements([race]);
 assert.equal(x.disagreementRaces,1);
 assert.equal(x.rows[0].styleCompanion,'4');
 assert.equal(x.rows[0].quirinCompanion,'3');
 assert.equal(x.styleSecondHits,1);assert.equal(x.quirinSecondHits,0);
 assert.equal(x.styleExactaROI,9);assert.equal(x.quirinExactaROI,-1);
});
test('unverified outcomes and PASS are excluded',()=>{
 const x=evaluateFinisherDisagreements([{...race,resultVerified:false},{...race,id:'pass',decision:'PASS'}]);
 assert.equal(x.disagreementRaces,0);assert.equal(x.excluded.length,2);
});
test('missing payout never creates ROI observation',()=>{
 const x=evaluateFinisherDisagreements([{...race,exactaPayoutVerified:false}]);
 assert.equal(x.disagreementRaces,1);assert.equal(x.payoutVerifiedRaces,0);
 assert.equal(x.styleExactaROI,null);
});
