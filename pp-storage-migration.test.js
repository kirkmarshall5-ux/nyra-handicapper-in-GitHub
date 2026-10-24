import test from 'node:test';import assert from 'node:assert/strict';
import {readLegacyStorage,restoreStoredCard,migrateLegacyStorage,LEGACY_CARD,LEGACY_STATE} from './pp-storage-migration.js';
const card=(id,provider='DRF',stamp='2026-10-24T12:00:00Z')=>({id,source_format:provider==='DRF'?'DRF':'BRISNET_PREMIUM_PLUS',imported_at:stamp,races:{1:{horses:[]}}});
function storage(values={}){const map=new Map(Object.entries(values));return {getItem:k=>map.get(k)??null,removeItem:k=>map.delete(k),setItem:()=>{throw new DOMException('Quota exceeded','QuotaExceededError');}};}
test('migration works with localStorage writes prohibited and preserves all legacy contents in durable backup',async()=>{
 const c=card('today'),state={cards:{today:{notes:{1:'Keep my note'}}}},rawCard=JSON.stringify(c),rawState=JSON.stringify(state),s=storage({[LEGACY_CARD]:rawCard,[LEGACY_STATE]:rawState,unrelated:'keep'}),legacy=readLegacyStorage(s);let saved;
 await migrateLegacyStorage({storage:s,legacy,card:c,state,write:async(...args)=>{saved=structuredClone(args);}});
 assert.deepEqual(saved,[c,state,{cardText:rawCard,stateText:rawState}]);assert.equal(s.getItem(LEGACY_CARD),null);assert.equal(s.getItem(LEGACY_STATE),null);assert.equal(s.getItem('unrelated'),'keep');
});
test('failed durable write retains old card and notes without cleanup',async()=>{
 const s=storage({[LEGACY_CARD]:'card bytes',[LEGACY_STATE]:'note bytes'}),legacy=readLegacyStorage(s);
 await assert.rejects(migrateLegacyStorage({storage:s,legacy,card:card('new'),state:{},write:async()=>{throw Error('IndexedDB full');}}),/IndexedDB full/);
 assert.equal(s.getItem(LEGACY_CARD),'card bytes');assert.equal(s.getItem(LEGACY_STATE),'note bytes');
});
test('another tab changing a legacy value during migration cannot lose its newer value',async()=>{
 let text='before';const s={getItem:()=>text,removeItem:()=>{throw Error('must not remove newer value');}},legacy={backup:{cardText:'before',stateText:null}};
 await migrateLegacyStorage({storage:s,legacy,card:card('new'),state:{},write:async()=>{text='after';}});assert.equal(text,'after');
});
test('durable selected provider wins over stale legacy active-card copy',()=>{
 const d=card('DRF24'),b=card('BRIS24','BRISNET'),legacy={card:card('old'),selectedProvider:'DRF'};
 assert.deepEqual(restoreStoredCard({DRF:d,BRISNET:b},{selectedProvider:'BRISNET'},legacy,{}),b);
});
test('first migration retains matching legacy edits but never replaces a newer source import',()=>{
 const stored=card('today'),edited={...stored,note:'retained'};
 assert.equal(restoreStoredCard({DRF:stored},null,{card:edited},{}).note,'retained');
 assert.deepEqual(restoreStoredCard({DRF:stored},null,{card:card('old','DRF','2026-10-23T12:00:00Z'),selectedProvider:'DRF'},{}),stored);
});
test('blocked legacy reads and malformed JSON do not prevent durable card recovery',()=>{
 const l=readLegacyStorage({getItem:()=>{throw Error('unavailable');}});assert.equal(l.card,null);
 assert.equal(readLegacyStorage(storage({[LEGACY_CARD]:'not json'})).card,null);
 assert.equal(restoreStoredCard({BRISNET:card('Bris','BRISNET')},null,l,{}).id,'Bris');
});
