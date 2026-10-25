import {test} from 'node:test';import assert from 'node:assert/strict';
import {meanLate} from '../scripts/late-pace-research.mjs';
import {strictPaceLines,policies} from '../scripts/evaluate-strict-late-pace.mjs';
test('late average uses most recent three observed values; missing is not zero',()=>{
 assert.equal(meanLate([{late:null},{late:90},{late:0},{late:60},{late:99}]),50);
 assert.equal(meanLate([{late:null},{late:NaN},{late:'80'}]),null);
 assert.equal(meanLate([{late:80}]),80);
});
test('strict pace never borrows wide speed, older slots, surfaces or route categories',()=>{
 const r={date:'2026-10-21',surface:'Dirt',distance_furlongs:7.5};
 const line=(furlongs=7.5,surface='Dirt',date='2026-10-01')=>({furlongs,surface,date,late:80});
 const valid=line(7),h={ratings:{lines:[valid,line(8),line(6.5),line(7.5,'Turf'),line(7.5,'Dirt','2025-10-20'),line()]}};
 assert.deepEqual(strictPaceLines(r,h),[valid]);
 assert.equal(strictPaceLines(r,{ratings:{lines:[line(7.5,'Dirt',r.date)]}}).length,0);
 assert.ok(policies.every(p=>p.pace===.5));
});
