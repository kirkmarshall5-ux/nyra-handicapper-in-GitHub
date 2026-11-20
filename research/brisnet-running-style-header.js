// Extract header evidence from a *single* Brisnet Premium Plus horse header line.
// Does not modify the production PDF importer. Caller must associate page/race
// and confirm horse identity; never match from running-line text.
const CODE=/\((E\/P|E|P|S|NA)(?:\s+([0-8]))?\)/g;
export function parseBrisnetRunningStyleHeader(line,{page=null,race=null}={}){
 if(typeof line!=='string'||!line.includes('Prime Power:'))return null;
 const prefix=line.split('Prime Power:')[0];
 const matches=[...prefix.matchAll(CODE)];
 if(matches.length!==1)return null;
 const m=matches[0];
 const name=prefix.slice(0,m.index).trim();
 if(!name||name.length>100)return null;
 const style=m[1]==='E/P'?'EP':m[1];
 const points=m[2]===undefined?null:Number(m[2]);
 if(style==='NA'&&points!==null||style!=='NA'&&points===null)return null;
 return {name,style,quirinPoints:points,page,race,provider:'BRISNET',
  status:'SOURCE_VERIFIED',sourceText:m[0]};
}
export function extractBrisnetHeaderEvidence(pageText,options={}){
 if(typeof pageText!=='string')return [];
 return pageText.split(/\r?\n/).map(line=>parseBrisnetRunningStyleHeader(line,options)).filter(Boolean);
}
