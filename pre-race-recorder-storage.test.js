import test from 'node:test';
import assert from 'node:assert/strict';
import {readResearchFreezes,writeResearchFreezes} from './pre-race-recorder-storage.js';
test('reload retains original records and append refuses replacement, deletion and duplicates',()=>{
 const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const record={provider:'BRISNET',cardId:'card',track:'Finger Lakes',date:'2026-11-16',race:1,recordedAt:'original'};
 writeResearchFreezes([record]);assert.deepEqual(readResearchFreezes(),[record]);
 assert.throws(()=>writeResearchFreezes([{...record,recordedAt:'changed'}]),/overwritten/);
 assert.throws(()=>writeResearchFreezes([]),/removed/);
 assert.throws(()=>writeResearchFreezes([record,record]),/Duplicate/);
 writeResearchFreezes([record,{...record,race:2}]);assert.deepEqual(readResearchFreezes()[0],record);
 delete globalThis.localStorage;
});
