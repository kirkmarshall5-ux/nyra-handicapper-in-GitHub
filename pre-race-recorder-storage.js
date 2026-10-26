// Isolated research freeze storage; never mutates PP card/session storage.
import {FREEZE_STORAGE_KEY} from './pre-race-provider-freeze.js';
export function readResearchFreezes(){
 const records=JSON.parse(localStorage.getItem(FREEZE_STORAGE_KEY)||'[]');
 if(!Array.isArray(records))throw Error('Invalid stored recorder history.');
 return records;
}
export function writeResearchFreezes(records){
 if(!Array.isArray(records))throw Error('Invalid recorder history.');
 localStorage.setItem(FREEZE_STORAGE_KEY,JSON.stringify(records));
}
