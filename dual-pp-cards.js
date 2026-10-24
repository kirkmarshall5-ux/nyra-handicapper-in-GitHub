// Separate source slots; PP numbers and model inputs never cross providers.
export const PROVIDERS=['BRISNET','DRF'];
export function cardProvider(card){return /^BRISNET/.test(card?.source_format||'')||Object.values(card?.races||{}).some(r=>r.ratings_provider==='BRISNET'||r.horses?.some(h=>h.ratings?.provider==='BRISNET'))?'BRISNET':'DRF';}
const aliases={bel:'belmontpark',baq:'belmontatthebiga',aqu:'aqueduct',sar:'saratoga',kee:'keeneland',cd:'churchilldowns',dmr:'delmar',fl:'fingerlakes'};
const track=s=>{const n=String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');return aliases[n]||n;};
export function matchingCard(a,b){return !!a?.date&&a.date===b?.date&&!!track(a.track)&&track(a.track)===track(b.track);}
export function pairedRace(cards,provider,anchor){
 const card=cards[provider];if(!card)return {race:null,reason:`Upload the ${provider==='BRISNET'?'Brisnet':'DRF'} PP to fill this row.`};
 if(cardProvider(card)!==provider)return {race:null,reason:'Saved PP provider does not match this row. Upload the correct source.'};
 if(!matchingCard(card,anchor))return {race:null,reason:`Saved ${card.track} · ${card.date} does not match the selected ${anchor.track} · ${anchor.date}. Select its source or upload a matching card.`};
 const r=card.races?.[anchor.race];if(!r)return {race:null,reason:`Race ${anchor.race} is not available in this PP. No different race has been substituted.`};
 if(!matchingCard({...card,...r},anchor)||Number(r.race)!==Number(anchor.race))return {race:null,reason:'Race identity requires verification.'};
 return {race:structuredClone(r),reason:null};
}
export function putProviderCard(cards,card,expected=cardProvider(card)){
 if(!PROVIDERS.includes(expected)||cardProvider(card)!==expected)throw Error(`This PDF is ${cardProvider(card)}, not ${expected}. Use its matching upload button.`);
 return {...cards,[expected]:structuredClone(card)};
}
// IndexedDB avoids duplicating two large PP cards inside localStorage's small quota.
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('nyra-provider-pps-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('cards');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('Card storage is blocked by another tab.'));});}
export async function readProviderCards(){const db=await openDB();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('cards','readonly'),store=tx.objectStore('cards'),out={};for(const p of PROVIDERS){const req=store.get(p);req.onsuccess=()=>{if(req.result)out[p]=req.result;};}tx.oncomplete=()=>resolve(out);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
let pendingWrite=Promise.resolve();
function orderedWrite(operation){const next=pendingWrite.then(operation);pendingWrite=next.catch(()=>{});return next;}
export function writeProviderCard(provider,card){putProviderCard({},card,provider);const snapshot=structuredClone(card);return orderedWrite(async()=>{const db=await openDB();try{await new Promise((resolve,reject)=>{const tx=db.transaction('cards','readwrite');tx.objectStore('cards').put(snapshot,provider);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}});}
export async function readProviderSession(){const db=await openDB();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('cards','readonly'),req=tx.objectStore('cards').get('__session__');tx.oncomplete=()=>resolve(req.result||null);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
// Card, notes/settings and selected source commit together. No full-card localStorage copy.
export function writeProviderSession(card,state,legacyBackup=null){
 const provider=cardProvider(card);putProviderCard({},card,provider);
 const snapshot=structuredClone({card,state,legacyBackup});
 return orderedWrite(async()=>{const db=await openDB();try{await new Promise((resolve,reject)=>{
  const tx=db.transaction('cards','readwrite'),store=tx.objectStore('cards');
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  try{
   store.put(snapshot.card,provider);store.put({state:snapshot.state,selectedProvider:provider,saved_at:new Date().toISOString()},'__session__');
   if(snapshot.legacyBackup)store.put(snapshot.legacyBackup,'__legacy_local_storage_backup__');
  }catch(e){tx.abort();reject(e);}
 });}finally{db.close();}});
}
