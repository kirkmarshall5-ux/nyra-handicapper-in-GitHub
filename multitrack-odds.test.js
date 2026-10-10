import test from 'node:test';
import assert from 'node:assert/strict';
import {oddsSourceForTrack,parseManualOdds,applyManualOdds} from './multitrack-odds.js';
const now=Date.parse('2026-10-10T14:00:00Z'),observedAt='2026-10-10T13:59:00Z';
const race={track:'Keeneland',date:'2026-10-10',race:3,horses:[{n:'1',name:'Fast Runner',odds:'—',ml:'3/1'},{n:'2',name:'Second Chance',odds:'SCR',ml:'5/1'}]};
const rows=[{program:'1',name:'Fast Runner',odds:'5/2'},{program:'2',name:'Second Chance',odds:'SCR'}];
test('source registry never routes unknown or non-NYRA tracks to Belmont',()=>{
 assert.equal(oddsSourceForTrack('Keeneland').mode,'manual');
 assert.equal(oddsSourceForTrack('KEE').id,'keeneland');
 assert.equal(oddsSourceForTrack('Churchill Downs').id,'churchill');
 assert.equal(oddsSourceForTrack('CD').mode,'manual');
 assert.equal(oddsSourceForTrack('Belmont Park').venue,'belmont');
 assert.equal(oddsSourceForTrack('Gulfstream Park').mode,'unsupported');
});
test('parse manual field and apply only exact complete identities',()=>{
 assert.deepEqual(parseManualOdds('1, Fast Runner, 5/2\n2, Second Chance, SCR'),rows);
 const updated=applyManualOdds(race,rows,{sourceUrl:oddsSourceForTrack('KEE').url,observedAt,now});
 assert.equal(updated.horses[0].odds,'5/2');
 assert.equal(updated.horses[0].ml,'3/1');
 assert.equal(updated.horses[0].pre_race_evidence.bettingEligible,false);
 assert.equal(updated.horses[1].odds,'SCR');
 assert.equal(race.horses[0].odds,'—');
});
test('reject mismatched, incomplete, stale, or scratch-altering inputs atomically',()=>{
 const opts={sourceUrl:oddsSourceForTrack('KEE').url,observedAt,now};
 for(const altered of [rows.slice(0,1),[{...rows[0],name:'Different'},rows[1]],[rows[0],{...rows[1],odds:'4/1'}],[{...rows[0],odds:'SCR'},rows[1]],[{...rows[0],odds:'3/0'},rows[1]]])assert.throws(()=>applyManualOdds(race,altered,opts));
 assert.throws(()=>applyManualOdds(race,rows,{...opts,observedAt:'2026-10-10T13:30:00Z'}));
 assert.throws(()=>applyManualOdds(race,rows,{...opts,sourceUrl:'https://example.com'}));
 assert.equal(race.horses[0].odds,'—');
});
test('Churchill is supported for manual source and never misreported as live',()=>{
 const cd={...race,track:'Churchill Downs'};
 const out=applyManualOdds(cd,rows,{sourceUrl:oddsSourceForTrack('CD').url,observedAt,now});
 assert.equal(out.odds_snapshot.sourceId,'churchill');
 assert.equal(out.odds_snapshot.method,'manual');
 assert.equal(out.odds_snapshot.bettingEligible,false);
});
