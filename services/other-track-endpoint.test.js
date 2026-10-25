import test from 'node:test';
import assert from 'node:assert/strict';
import {handleOtherTrackRequest} from './other-track-endpoint.js';
const url='https://service.example/track-update?track=keeneland&date=2026-10-25&race=1&kind=odds';
test('all six unconnected track/actions return explicit no-store JSON 503, never a fabricated snapshot',async()=>{
 for(const track of ['keeneland','churchill','gulfstream'])for(const kind of ['odds','scratches']){
  const u=new URL(url);u.searchParams.set('track',track);u.searchParams.set('kind',kind);const r=await handleOtherTrackRequest(new Request(u));
  assert.equal(r.status,503);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('access-control-allow-origin'),'https://kirkmarshall5-ux.github.io');assert.match((await r.json()).error,/No verified/);
 }
});
test('reject arbitrary upstream URLs and writes before invoking a connector',async()=>{
 let called=false;const opts={connectors:{keeneland:{odds:()=>{called=true;}}}};
 assert.equal((await handleOtherTrackRequest(new Request(url+'&source=https://example.com/'),opts)).status,400);
 assert.equal((await handleOtherTrackRequest(new Request(url,{method:'POST'}),opts)).status,405);assert.equal(called,false);
});
test('connector failures or mismatched identities return 502 without a partial snapshot',async()=>{
 for(const odds of [()=>{throw Error('blocked upstream');},()=>({track:'gulfstream'})]){
  const r=await handleOtherTrackRequest(new Request(url),{connectors:{keeneland:{odds}}});assert.equal(r.status,502);assert.equal((await r.json()).runners,undefined);
 }
});
