import test from 'node:test';
import assert from 'node:assert/strict';
import {applyOtherTrackSnapshot,fetchOtherTrackUpdate,fetchOtherTrackCombinedUpdate,otherTrackSource} from './other-track-updates.js';
import {prepareOtherTrackUpdate,prepareCombinedOtherTrackUpdate} from './other-track-update-plan.js';
const now=Date.parse('2026-10-25T15:00:00Z');
const race=(track='Keeneland')=>({track,date:'2026-10-25',race:1,surface:'Turf',horses:[{n:1,name:'One (IRE)',odds:'5/1',ml:'8/1',ratings:{speed:90}},{n:2,name:'Two',odds:'3/1',ml:'6/1',ratings:{speed:80}}]});
function snapshot(kind='odds',track='keeneland'){
 return {schemaVersion:2,kind,track,date:'2026-10-25',race:1,dateVerified:true,fieldComplete:true,raceStatus:'OPEN',priceType:'CURRENT_TOTE',sourceUrl:'https://www.equibase.com/static/entry/KEE102526USA-EQB.html',fetchedAt:new Date(now).toISOString(),observedAt:new Date(now-10000).toISOString(),runners:[{program:'1',name:'One',odds:'2/1',scratched:false},{program:'2',name:'Two',odds:'4/1',scratched:false}]};
}
test('track aliases cover all three requested tracks, not NYRA or unrelated tracks',()=>{
 for(const [names,id] of [[['KEE','Keeneland'],'keeneland'],[['CD','Churchill Downs','Churchill'],'churchill'],[['GP','Gulfstream Park'],'gulfstream']])for(const n of names)assert.equal(otherTrackSource(n).id,id);
 assert.equal(otherTrackSource('Belmont Park').supported,false);assert.equal(otherTrackSource('unknown').supported,false);
});
for(const track of ['Keeneland','Churchill Downs','Gulfstream Park'])test(track+' odds preserve PP inputs, morning line and original object',()=>{
 const r=race(track),before=structuredClone(r),s=snapshot('odds',otherTrackSource(track).id),out=applyOtherTrackSnapshot(r,s,'odds',now);
 assert.equal(out.horses[0].odds,'2/1');assert.deepEqual(out.horses[0].ratings,r.horses[0].ratings);assert.equal(out.horses[0].ml,'8/1');assert.deepEqual(r,before);assert.equal(out.odds_snapshot.bettingEligible,false);
});
test('scratch-only changes scratches, never imports odds or alters figures',()=>{
 const r=race(),s=snapshot('scratches');s.runners[1].scratched=true;s.runners[0].odds='999/1';
 const out=applyOtherTrackSnapshot(r,s,'scratches',now);
 assert.equal(out.horses[0].odds,'5/1');assert.equal(out.horses[1].odds,'SCR');assert.equal(out.horses[1].ratings.speed,80);assert.equal(out.odds_snapshot,undefined);assert.equal(r.horses[1].odds,'3/1');
});
test('zero scratch response is valid but never reactivates an existing scratch',()=>{
 assert.equal(applyOtherTrackSnapshot(race(),snapshot('scratches'),'scratches',now).horses[0].odds,'5/1');
 const r=race();r.horses[0].odds='SCR';assert.throws(()=>applyOtherTrackSnapshot(r,snapshot('scratches'),'scratches',now),/reactivated/);
});
test('new scratches cannot be smuggled into the odds-only action',()=>{
 const s=snapshot();s.runners[1].scratched=true;s.runners[1].odds='SCR';assert.throws(()=>applyOtherTrackSnapshot(race(),s,'odds',now),/update scratches/);
 const r=race();r.horses[1].odds='SCR';assert.equal(applyOtherTrackSnapshot(r,s,'odds',now).horses[1].odds,'SCR');
});
const invalidCases=[
 ['wrong track',s=>s.track='churchill'],['wrong date',s=>s.date='2026-10-24'],['wrong race',s=>s.race=2],['wrong kind',s=>s.kind='scratches'],
 ['missing field row',s=>s.runners.pop()],['duplicate program',s=>s.runners[1].program='1'],['mismatched name',s=>s.runners[1].name='Someone Else'],
 ['stale retrieval',s=>s.fetchedAt='2026-10-25T14:58:00Z'],['old upstream observation',s=>s.observedAt='2026-10-25T14:58:00Z'],['unverified date',s=>s.dateVerified=false],
 ['partial field',s=>s.fieldComplete=false],['morning line',s=>s.priceType='MORNING_LINE'],['projected odds',s=>s.priceType='PROJECTED'],['final odds',s=>s.priceType='FINAL'],
 ['closed market',s=>s.raceStatus='FINAL'],['future clock',s=>s.observedAt='2026-10-25T15:10:00Z'],['missing clock',s=>delete s.observedAt],
 ['invalid odds',s=>s.runners[0].odds='2/0'],['invalid scratch status',s=>s.runners[0].scratched='false'],['unapproved source',s=>s.sourceUrl='https://example.com/'],
 ['cross-track official source',s=>s.sourceUrl='https://www.gulfstreampark.com/'],['HTTP source',s=>s.sourceUrl='http://www.equibase.com/']
];
for(const [name,change] of invalidCases)test('reject '+name+' without altering prior race',()=>{const r=race(),before=structuredClone(r),s=snapshot();change(s);assert.throws(()=>applyOtherTrackSnapshot(r,s,'odds',now));assert.deepEqual(r,before);});
test('reject yesterday card and accept Eastern calendar across midnight UTC',()=>{
 const r=race();r.date='2026-10-24';const s=snapshot();s.date=r.date;s.observedAt='2026-10-25T00:00:00Z';s.fetchedAt=s.observedAt;
 assert.equal(applyOtherTrackSnapshot(r,s,'odds',Date.parse(s.fetchedAt)).date,'2026-10-24');
 assert.throws(()=>applyOtherTrackSnapshot(r,s,'odds',now));
});
test('fetch chooses active track and update kind, uses no-store and rejects non-JSON',async()=>{
 let captured;await fetchOtherTrackUpdate(race('GP'),'odds',{now:()=>now,fetcher:async(url,opts)=>{captured={url,opts};return new Response(JSON.stringify(snapshot('odds','gulfstream')),{headers:{'content-type':'application/json'}});}});
 assert.equal(captured.url.searchParams.get('track'),'gulfstream');assert.equal(captured.opts.cache,'no-store');assert.equal(captured.url.searchParams.get('kind'),'odds');
 await assert.rejects(fetchOtherTrackUpdate(race(),'odds',{fetcher:async()=>new Response('<html>blocked</html>')}),/verified race data/);
});
test('upstream failure and timeout preserve input and explain unavailability',async()=>{
 const r=race(),before=structuredClone(r);
 await assert.rejects(fetchOtherTrackUpdate(r,'odds',{fetcher:async()=>new Response(JSON.stringify({error:'No verified tote source is connected'}),{status:503})}),/No verified tote source/);
 await assert.rejects(fetchOtherTrackUpdate(r,'odds',{fetcher:async()=>{throw Error('timeout');}}),/timeout/);assert.deepEqual(r,before);
});
test('both matching PP sources prepare independently and mismatch aborts the entire plan',()=>{
 const r=race('GP'),drf={id:'drf',track:'GP',date:r.date,source_format:'DRF',races:{1:r}},br={id:'bris',track:'Gulfstream Park',date:r.date,source_format:'BRISNET',races:{1:{...race('Gulfstream Park'),ratings_provider:'BRISNET'}}};
 const cards={DRF:drf,BRISNET:br},before=structuredClone(cards),s=snapshot('odds','gulfstream');
 const plan=prepareOtherTrackUpdate(drf,cards,r,s,'odds',now);assert.equal(plan.cards.DRF.races[1].horses[0].odds,'2/1');assert.equal(plan.cards.BRISNET.races[1].horses[0].odds,'2/1');assert.deepEqual(cards,before);
 br.races[1].horses[0].name='Different';assert.throws(()=>prepareOtherTrackUpdate(drf,cards,r,s,'odds',now),/mismatch/);assert.equal(drf.races[1].horses[0].odds,'5/1');
});
test('one action combines new scratches and current odds for both PP sources',async()=>{
 const r=race(),before=structuredClone(r),calls=[];
 const fetcher=async url=>{
  const kind=url.searchParams.get('kind');calls.push(kind);const s=snapshot(kind);s.runners[1].scratched=true;s.runners[1].odds='SCR';
  return new Response(JSON.stringify(s),{headers:{'content-type':'application/json'}});
 };
 const result=await fetchOtherTrackCombinedUpdate(r,{fetcher,now:()=>now});
 assert.deepEqual(calls,['scratches','odds']);assert.equal(result.race.horses[0].odds,'2/1');assert.equal(result.race.horses[1].odds,'SCR');assert.deepEqual(r,before);
 const drf={id:'drf',track:r.track,date:r.date,source_format:'DRF',races:{1:r}},bris={...structuredClone(drf),id:'bris',source_format:'BRISNET'};
 const plan=prepareCombinedOtherTrackUpdate(drf,{DRF:drf,BRISNET:bris},r,result,now);
 for(const c of Object.values(plan.cards)){assert.equal(c.races[1].horses[0].odds,'2/1');assert.equal(c.races[1].horses[1].odds,'SCR');assert.ok(c.races[1].scratch_snapshot);assert.ok(c.races[1].odds_snapshot);}
 assert.deepEqual(drf.races[1],before);
});
test('combined action retains all original data when the odds leg fails',async()=>{
 const r=race(),before=structuredClone(r);
 await assert.rejects(fetchOtherTrackCombinedUpdate(r,{now:()=>now,fetcher:async url=>{
  if(url.searchParams.get('kind')==='odds')throw Error('tote feed failed');
  const s=snapshot('scratches');s.runners[1].scratched=true;
  return new Response(JSON.stringify(s),{headers:{'content-type':'application/json'}});
 }}),/tote feed failed/);assert.deepEqual(r,before);
});
