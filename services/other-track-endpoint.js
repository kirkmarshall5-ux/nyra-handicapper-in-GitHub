// Staged service route. No upstream is certified yet; production returns 503.
// This module never falls back to morning-line/final odds or an undated page.
const tracks=new Set(['keeneland','churchill','gulfstream']);
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'https://kirkmarshall5-ux.github.io','Access-Control-Allow-Methods':'GET, OPTIONS','Cache-Control':'no-store','Vary':'Origin'}});
export async function handleOtherTrackRequest(request,{connectors={},now=()=>Date.now()}={}){
 if(request.method==='OPTIONS')return json({});
 if(request.method!=='GET')return json({error:'Read-only service'},405);
 const url=new URL(request.url),track=url.searchParams.get('track'),date=url.searchParams.get('date'),race=url.searchParams.get('race'),kind=url.searchParams.get('kind');
 if(url.pathname!=='/track-update')return json({error:'Unknown route'},404);
 if(!tracks.has(track)||!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!/^([1-9]|1\d|20)$/.test(race||'')||!['odds','scratches'].includes(kind)||[...url.searchParams.keys()].some(k=>!['track','date','race','kind'].includes(k)))return json({error:'Invalid track update request'},400);
 const connector=connectors[track]?.[kind];
 if(!connector)return json({error:'No verified '+kind+' source is connected for '+track+'. Prior card data must be retained.'},503);
 try{
  const result=await connector({track,date,race:Number(race),kind,now:now()});
  // Client validator is shared for exact identity, source timestamps and field completeness.
  if(result?.schemaVersion!==2||result.track!==track||result.date!==date||result.race!==Number(race)||result.kind!==kind||result.dateVerified!==true||result.fieldComplete!==true)throw Error('Upstream source has no verified race identity and complete field');
  return json(result);
 }catch{return json({error:'Verified track update unavailable. Prior card data must be retained.'},502);}
}
