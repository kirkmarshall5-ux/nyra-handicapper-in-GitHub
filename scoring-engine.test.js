import test from 'node:test';import assert from 'node:assert/strict';
import {evidenceProfile,evidenceWeightedRating,confidenceAdjustedTemperature,probabilityWeights} from './scoring-engine.js';
test('missing descriptive workout/pedigree text does not invent a numeric rating',()=>{assert.equal(evidenceWeightedRating([{value:null,weight:24},{value:null,weight:18}]),null)});
test('first-time starter confidence reflects actual evidence coverage',()=>{assert.equal(evidenceProfile({lifeStarts:0,workText:'5f work',pedigree:'Sire / Dam',trainerAngles:'1st starter'}).confidence,'High');assert.equal(evidenceProfile({lifeStarts:0,workText:'5f work'}).confidence,'Low')});
test('established horse with figures and form earns stronger confidence',()=>{assert.equal(evidenceProfile({lifeStarts:8,last:88,best:92,form:80,cls:75}).confidence,'High')});
test('lower confidence flattens fair-odds probability differences',()=>{const hi=probabilityWeights([{id:'a',rating:90,confidence:'High'},{id:'b',rating:70,confidence:'High'}]);const lo=probabilityWeights([{id:'a',rating:90,confidence:'Low'},{id:'b',rating:70,confidence:'Low'}]);assert.ok((hi[0].p-hi[1].p)>(lo[0].p-lo[1].p))});
