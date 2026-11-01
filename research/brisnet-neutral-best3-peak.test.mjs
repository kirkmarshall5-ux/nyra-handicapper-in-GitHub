import test from 'node:test';import assert from 'node:assert/strict';
import {shadowRankings,CANDIDATE_ID} from './brisnet-neutral-best3-peak.mjs';
test('shadow removes only best-three and peak contributions, preserves inputs and uses native tie-break',()=>{
 const row=(n,name,score,a,b)=>({n,name,score,feature_contributions:[.1,.2,a,.3,.4,b],raw_features:[80,81,90,83,84,95],trend_adjustment:.1});
 const base={rankings:[row('1','Zulu',1,.2,.3),row('2','Alpha',.5,0,0)],unrated:[{n:'3',name:'Unrated'}],eligible_count:3};
 const before=structuredClone(base),out=shadowRankings(base);
 assert.deepEqual(base,before);assert.deepEqual(out.rankings.map(h=>h.n),['2','1']);
 assert.equal(out.model_id,CANDIDATE_ID);assert.equal(out.rankings[1].score,.5);
 assert.deepEqual(out.rankings[1].raw_features,base.rankings[0].raw_features);
 assert.deepEqual(out.unrated,base.unrated);assert.equal(out.eligible_count,3);assert.equal(out.bettingEnabled,false);
});
test('unverified contribution vectors cannot produce a shadow result',()=>assert.throws(()=>shadowRankings({rankings:[{score:1}]}),/Verified baseline/));
