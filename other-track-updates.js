// Separate adapter: does not extend or change the existing NYRA source/model paths.
export const OTHER_TRACK_SERVICE='https://nyra-odds-snapshot.beigebeech4.chatgpt.site/track-update';
const tracks={keeneland:{id:'keeneland',label:'Keeneland'},churchill:{id:'churchill',label:'Churchill Downs'},gulfstream:{id:'gulfstream',label:'Gulfstream Park'}};
export function otherTrackSource(track){
 const key=String(track||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const id=({kee:'keeneland',keeneland:'keeneland',cd:'churchill',churchill:'churchill',churchilldowns:'churchill',gp:'gulfstream',gulfstream:'gulfstream',gulfstreampark:'gulfstream'})[key];
 return id?{...tracks[id],supported:true}:{id:null,label:track||'Unknown track',supported:false};
}
const nameKey=s=>String(s||'').replace(/\s*\((?:GB|IRE|FR|GER|ARG|BRZ|CHI|AUS|NZ|JPN|CAN|USA|ITY|SAF)\)\s*$/i,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const easternDay=ms=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));
function validTime(value,now,maxAge,label){
 const time=typeof value==='string'?Date.parse(value):NaN;
 if(!Number.isFinite(time)||time>now+5000||now-time>maxAge)throw Error(label+' is missing, stale or in the future');
 return time;
}
export function applyOtherTrackSnapshot(race,snapshot,kind,now=Date.now()){
 const source=otherTrackSource(race.track);
 if(!source.supported||!['odds','scratches'].includes(kind))throw Error('Unsupported track or update type');
 if(!snapshot||snapshot.schemaVersion!==2||snapshot.kind!==kind||snapshot.track!==source.id||snapshot.date!==race.date||snapshot.race!==Number(race.race))throw Error('Track, date, race or update type does not match the loaded card');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(race.date)||race.date!==easternDay(now))throw Error('Updates require today’s card in Eastern time');
 validTime(snapshot.fetchedAt,now,60000,'Retrieval time');
 const observed=validTime(snapshot.observedAt,now,kind==='odds'?60000:600000,'Source observation time');
 if(easternDay(observed)!==race.date||snapshot.dateVerified!==true||snapshot.fieldComplete!==true)throw Error('Source date and complete field must be verified');
 if(!['OPEN','NOT_OPEN'].includes(snapshot.raceStatus)||kind==='odds'&&snapshot.raceStatus!=='OPEN')throw Error('Race is closed, final or has no open odds market');
 if(kind==='odds'&&snapshot.priceType!=='CURRENT_TOTE')throw Error('Only current tote odds can be imported; morning line, projected and final prices are rejected');
 let url;try{url=new URL(snapshot.sourceUrl);}catch{throw Error('Invalid source URL');}
 const hosts={keeneland:['www.keeneland.com','www.equibase.com','eqbwireless.equibase.com'],churchill:['www.churchilldowns.com','www.equibase.com','eqbwireless.equibase.com'],gulfstream:['www.gulfstreampark.com','www.equibase.com','eqbwireless.equibase.com']}[source.id];
 if(url.protocol!=='https:'||!hosts.includes(url.hostname)||url.username||url.password||url.port)throw Error('Unapproved source URL');
 if(!Array.isArray(snapshot.runners)||!Array.isArray(race.horses)||!race.horses.length||snapshot.runners.length!==race.horses.length)throw Error('Incomplete field; prior data retained');
 const seen=new Set(),local=new Map();
 for(const h of race.horses){const key=String(h.n);if(local.has(key)||!/^\d+[A-Z]?$/.test(key)||!nameKey(h.name))throw Error('Loaded field has duplicate or invalid runner identity');local.set(key,h);}
 // Validate every row before writing any changes, including zero-scratch responses.
 for(const row of snapshot.runners){
  const key=String(row.program),h=local.get(key);
  if(!h||seen.has(key)||nameKey(row.name)!==nameKey(h.name))throw Error('Runner number/name mismatch or duplicate: #'+key);
  seen.add(key);
  if(typeof row.scratched!=='boolean')throw Error('Explicit scratch status required for every runner');
  if(h.odds==='SCR'&&!row.scratched)throw Error('Previously scratched runner cannot be reactivated');
  if(kind==='odds'){
   if(row.scratched){if(h.odds!=='SCR')throw Error('New scratch detected; update scratches before odds');if(row.odds!=='SCR')throw Error('Scratch and price disagree');}
   else if(typeof row.odds!=='string'||!/^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/.test(row.odds)||Number(row.odds.split('/')[1])<=0)throw Error('Invalid current tote price for #'+key);
  }
 }
 const out=structuredClone(race),evidence={sourceUrl:url.href,observedAt:snapshot.observedAt,importedAt:snapshot.fetchedAt,status:'VERIFIED_SOURCE_SNAPSHOT',bettingEligible:false};
 for(const h of out.horses){const row=snapshot.runners.find(r=>String(r.program)===String(h.n));
  if(kind==='scratches'&&row.scratched&&h.odds!=='SCR'){h.odds='SCR';h.scratch_evidence={...evidence};}
  if(kind==='odds'&&!row.scratched){h.odds=row.odds;h.pre_race_evidence={...evidence,priceType:'CURRENT_TOTE'};}
 }
 if(kind==='odds')out.odds_snapshot={...evidence,track:source.id,kind,upstreamAgeSeconds:snapshot.upstreamAgeSeconds??null};
 else out.scratch_snapshot={...evidence,track:source.id,kind};
 return out;
}
export async function fetchOtherTrackUpdate(race,kind,{fetcher=globalThis.fetch,now=()=>Date.now(),service=OTHER_TRACK_SERVICE}={}){
 const source=otherTrackSource(race.track);
 if(!source.supported||!['odds','scratches'].includes(kind))throw Error('Choose a Keeneland, Churchill Downs or Gulfstream Park card');
 const frozen=structuredClone(race),url=new URL(service);
 url.search=new URLSearchParams({track:source.id,date:frozen.date,race:Number(frozen.race),kind});
 const response=await fetcher(url,{cache:'no-store',signal:AbortSignal.timeout(22000)});
 if(!response.ok){let detail;try{detail=(await response.json()).error;}catch{}throw Error(detail||'Track service unavailable (HTTP '+response.status+')');}
 if(!(response.headers.get('content-type')||'').includes('application/json'))throw Error('Track service did not return verified race data');
 const snapshot=await response.json();return {race:applyOtherTrackSnapshot(frozen,snapshot,kind,now()),snapshot};
}
// A single user action prepares both updates; nothing is persisted on partial failure.
export async function fetchOtherTrackCombinedUpdate(race,options={}){
 const scratches=await fetchOtherTrackUpdate(race,'scratches',options);
 const odds=await fetchOtherTrackUpdate(scratches.race,'odds',options);
 return {race:odds.race,scratches:scratches.snapshot,odds:odds.snapshot};
}
