import {cardProvider} from './dual-pp-cards.js';
export const LEGACY_CARD='nyraV44cReleaseActiveCard',LEGACY_STATE='nyraV44cReleaseState';
export function readLegacyStorage(storage){
 const get=key=>{try{return storage.getItem(key);}catch{return null;}},parse=text=>{try{return JSON.parse(text);}catch{return null;}};
 const cardText=get(LEGACY_CARD),stateText=get(LEGACY_STATE);
 return {card:parse(cardText),state:parse(stateText),selectedProvider:get('nyraPPSelectedProvider'),backup:cardText!==null||stateText!==null?{cardText,stateText}:null};
}
export function restoreStoredCard(cards,session,legacy,sample){
 const selected=session?.selectedProvider||legacy.selectedProvider;
 if(session&&cards[selected])return structuredClone(cards[selected]);
 const old=legacy.card,stored=old&&cards[cardProvider(old)];
 // Preserve edits from a matching legacy card; never replace a newer import with an old cache.
 if(old?.races&&(!stored||old.id===stored.id&&(Date.parse(old.imported_at)||0)>=(Date.parse(stored.imported_at)||0)))return structuredClone(old);
 return structuredClone(cards[selected]||cards.BRISNET||cards.DRF||old||sample);
}
export async function migrateLegacyStorage({storage,legacy,card,state,write}){
 if(!legacy.backup)return;
 // A rejected transaction must leave every legacy value intact for recovery.
 await write(card,state,legacy.backup);
 for(const [key,value] of [[LEGACY_CARD,legacy.backup.cardText],[LEGACY_STATE,legacy.backup.stateText]]){
  try{if(value!==null&&storage.getItem(key)===value)storage.removeItem(key);}catch{/* Durable backup already committed; cleanup may be retried. */}
 }
}
