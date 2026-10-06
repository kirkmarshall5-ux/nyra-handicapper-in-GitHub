import test from 'node:test';
import assert from 'node:assert/strict';
import {runnerEligibleForScoring,eligibleField,experimentalV44Adjustment} from './scoring-engine.js';

test('MTO excluded when turf stays turf',()=>{
 const mto={name:'Dirt Horse',entryStatus:'MTO',odds:'4/1'};
 assert.equal(runnerEligibleForScoring(mto,{surface:'Turf'}),false);
 assert.equal(eligibleField([{name:'Turf Horse',entryStatus:'REGULAR',odds:'3/1'},mto],{surface:'Turf'}).length,1);
});
test('MTO eligible when race moves to dirt',()=>{
 const mto={entryStatus:'MTO',odds:'4/1'};
 assert.equal(runnerEligibleForScoring(mto,{surface:'Turf',effectiveSurface:'Dirt'}),true);
});
test('AE excluded until explicitly drawn in',()=>{
 const ae={entryStatus:'AE',odds:'8/1'};
 assert.equal(runnerEligibleForScoring(ae,{surface:'Turf'}),false);
 ae.aeDrawnIn=true;
 assert.equal(runnerEligibleForScoring(ae,{surface:'Turf'}),true);
});
test('ordinary scratch excluded regardless of status',()=>{
 assert.equal(runnerEligibleForScoring({entryStatus:'REGULAR',odds:'SCR'},{surface:'Dirt'}),false);
});
test('MTO cannot distort turf pace field',()=>{
 const h={figs:[82,80,78],tfEarly:100,odds:'3/1',entryStatus:'REGULAR'};
 const regular={figs:[80,78,76],tfEarly:95,odds:'4/1',entryStatus:'REGULAR'};
 const mto={figs:[120,118,115],tfEarly:130,odds:'5/2',entryStatus:'MTO'};
 const turf=experimentalV44Adjustment(h,[h,regular,mto],{surface:'Turf'});
 const dirt=experimentalV44Adjustment(h,[h,regular,mto],{surface:'Turf',effectiveSurface:'Dirt'});
 assert.notDeepEqual(turf.pace,dirt.pace);
});
