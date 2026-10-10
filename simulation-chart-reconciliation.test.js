import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileRaceSources} from './simulation-chart-reconciliation.js';
const race={raceId:'SAR-2024-08-31-R1',ppSourceId:'SAR--08-31-2024.pdf',track:'SAR',date:'2024-08-31',raceNumber:1,surface:'dirt',distance:'6.5F'};
const ppRunners=[{program:'1',name:'Horse A'},{program:'2',name:'Horse B'}];
const chart={chartId:'demo',sourceUrl:'https://example.org/chart',retrievedAt:'2026-10-10T12:00:00Z',track:'SAR',date:'2024-08-31',raceNumber:1,surface:'dirt',distance:'6.5F',manuallyVerified:true,callsManuallyVerified:true};
test('never treat missing chart as verified',()=>{const r=reconcileRaceSources({race,ppRunners});assert.equal(r.status,'AWAITING_OFFICIAL_CHART');assert.equal(r.runnerReconciliationVerified,false)});
test('requires manual verification even for matching synthetic runner names',()=>{const r=reconcileRaceSources({race,ppRunners,chartRunners:ppRunners,chart:{...chart,manuallyVerified:false}});assert.equal(r.status,'MANUAL_REVIEW_REQUIRED')});
test('rejects unmatched chart horse and name mismatches',()=>{
 const r=reconcileRaceSources({race,ppRunners,chartRunners:[{program:'1',name:'Horse A'},{program:'2',name:'Different'}],chart});
 assert.equal(r.runnerReconciliationVerified,false);assert.ok(r.flags.some(x=>x.includes('Name mismatch')));
 const x=reconcileRaceSources({race,ppRunners,chartRunners:[{program:'1',name:'Horse A'},{program:'3',name:'Horse C'}],chart});
 assert.equal(x.unmatched.length,2);
});
test('flags changed surface, nonstandard finish, and scratches',()=>{
 const r=reconcileRaceSources({race,ppRunners:[{program:'1',name:'Horse A',status:'scratched'},{program:'2',name:'Horse B'}],chartRunners:[{program:'1',name:'Horse A',status:'ran'},{program:'2',name:'Horse B',status:'dnf'}],chart:{...chart,surface:'turf'}});
 assert.equal(r.status,'MANUAL_REVIEW_REQUIRED');assert.equal(r.flags.length,3);
});
test('reconciles a completely verified synthetic field',()=>{
 const r=reconcileRaceSources({race,ppRunners,chartRunners:ppRunners,chart});
 assert.equal(r.status,'RUNNERS_RECONCILED');assert.equal(r.runnerReconciliationVerified,true);
});
