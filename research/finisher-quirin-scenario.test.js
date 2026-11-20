import test from 'node:test';
import assert from 'node:assert/strict';
import {quirinPaceScenario} from './finisher-quirin-scenario.js';
test('two high Quirin speed horses are pressure, not guaranteed collapse',()=>{
 const r=quirinPaceScenario([{runStyle:'E',quirinPoints:8},{runStyle:'E',quirinPoints:7},{runStyle:'S',quirinPoints:1}]);
 assert.equal(r.scenario,'FAST');assert.equal(r.extremeThreats,2);
});
test('lone E8 classified slow and scratches excluded',()=>{
 const r=quirinPaceScenario([{runStyle:'E',quirinPoints:8},{runStyle:'E',quirinPoints:8,scratched:true},{runStyle:'P',quirinPoints:3}]);
 assert.equal(r.scenario,'SLOW');assert.equal(r.earlyThreats,1);
});
test('missing Quirin evidence lowers confidence',()=>{
 const r=quirinPaceScenario([{runStyle:'E',quirinPoints:8},{runStyle:'NA',quirinPoints:null}]);
 assert.equal(r.confidence,0.5);assert.equal(r.unknown,1);
});
