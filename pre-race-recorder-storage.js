// Isolated research freeze storage; never mutates PP card/session storage.
import {FREEZE_STORAGE_KEY,snapshotKey} from './pre-race-provider-freeze.js';
export function readResearchFreezes(){
 const records=JSON.parse(localStorage.getItem(FREEZE_STORAGE_KEY)||'[]');
 if(!Array.isArray(records))throw Error('Invalid stored recorder history.');
 return records;
}
export function writeResearchFreezes(records){
 if(!Array.isArray(records))throw Error('Invalid recorder history.');
 const existing=readResearchFreezes();
 for(const original of existing){const next=records.find(r=>snapshotKey(r)===snapshotKey(original));if(!next||JSON.stringify(next)!==JSON.stringify(original))throw Error('Existing frozen records cannot be removed or overwritten.');}
 if(new Set(records.map(snapshotKey)).size!==records.length)throw Error('Duplicate frozen race.');
 localStorage.setItem(FREEZE_STORAGE_KEY,JSON.stringify(records));
}
