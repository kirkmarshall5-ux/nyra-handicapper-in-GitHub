import test from 'node:test';
import assert from 'node:assert/strict';
import {activeRunner} from './active-field.js';
import {active} from './brisnet-models.js';
import {eligible} from './pre-race-provider-adapter.js';
import {paceEligible} from './projected-race-setup.js';
test('shared field handles conditional status, scratch precedence and separate coupled horses',()=>{const cases=[[{},true],[{entry_status:'REGULAR',included_in_frozen_field:false},false],[{entry_status:'AE'},false],[{entry_status:'AE',included_in_frozen_field:true},true],[{entry_status:'ALSO_ELIGIBLE',included_in_frozen_field:true},true],[{entry_status:'MTO'},false],[{entry_status:'MTO',included_in_frozen_field:true},false],[{entry_status:'AE',included_in_frozen_field:true,odds:'SCR'},false]];for(const [state,expected] of cases){const h={n:'1A',odds:'5/1',...state};for(const fn of [activeRunner,active,eligible,paceEligible])assert.equal(fn(h),expected);}assert.deepEqual([{n:'1',odds:'SCR'},{n:'1A',odds:'5/1'}].filter(activeRunner).map(h=>h.n),['1A']);});
