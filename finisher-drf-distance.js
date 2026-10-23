// Verified DRF distance decoding for Finisher only; V4.4c and Contender inputs are unchanged.
export const DISTANCE_INPUT_ID='DRF-distance-input-v1.1-20261018-5316';
export const FRACTIONS=Object.freeze({'Â':1/16,'°':1/8,'±':3/16,'²':1/4,'´':3/8,'³':5/16,'¶':1/2,'ô':1/2,'¼':1/4,'½':1/2,'¾':3/4,'⅛':1/8,'⅜':3/8,'⅝':5/8,'⅞':7/8});
const MONTHS={'â':1,'á':2,'à':3,'ß':4,'Ü':5,'Þ':6,'Û':7,'Ý':8,'æ':9,'å':10,'ä':11,'ã':12};
const TOK='\\d+(?:\\.\\d+)?(?:\\s+[1-9]\\d*\\/[1-9]\\d*|\\s*[Â°±²´³¶ô¼½¾⅛⅜⅝⅞])?';
export function decodeDistanceToken(token,unit){
 let n=null;const s=String(token).trim(),fraction=s.match(/^(\d+)\s+([1-9]\d*)\/([1-9]\d*)$/),glyph=s.match(/^(\d+)\s*([Â°±²´³¶ô¼½¾⅛⅜⅝⅞])$/);
 if(fraction){if(+fraction[2]>=+fraction[3])return null;n=+fraction[1]+ +fraction[2]/+fraction[3];}
 else if(glyph)n=+glyph[1]+FRACTIONS[glyph[2]];
 else if(/^\d+(?:\.\d+)?$/.test(s))n=+s;
 if(!(n>0)||!Number.isFinite(n))return null;
 return /^miles?$/i.test(unit)?n*8:/^(?:f|furlongs?)$/i.test(unit)?n:null;
}
export function decodeTodayDistance(header){
 const line=String(header||'').split('\n').find(l=>/\b(?:MILES?|Furlongs)\b/i.test(l)&&!/^\s*(if|alternate)/i.test(l))||'';
 const m=line.match(new RegExp('(?:^|\\s)('+TOK+')\\s+(MILES?|Furlongs)\\b','i'));
 return {line,token:m?.[1]??null,unit:m?.[2]??null,furlongs:m?decodeDistanceToken(m[1],m[2]):null};
}
function priorDate(token,today){const m=String(token||'').match(/^(\d{1,2})(.)(\d{2})=/);if(!m||!MONTHS[m[2]])return null;const d=new Date(Date.UTC(2000+ +m[3],MONTHS[m[2]]-1,+m[1]));return d.getUTCDate()===+m[1]&&d.getUTCMonth()+1===MONTHS[m[2]]&&d.toISOString().slice(0,10)<today?d.toISOString().slice(0,10):null;}
export function decodeHistoryDistance(proof,today){
 // Preserve the old going/surface anchor: this experiment fixes distances only.
 const m=String(proof.source_line||'').match(new RegExp('=\\s*\\d+\\s*[A-Za-z.]+\\s+(?:fst|fm|gd|sly|my|yl|sf|hy|wf)\\s+('+TOK+')(f)?\\s*([êÑúü]?)'));
 const date=priorDate(proof.running_date_track,today);if(!m||!date||typeof proof.figure!=='number'||!Number.isFinite(proof.figure))return null;
 return {date,age:(Date.parse(today)-Date.parse(date))/86400000,surface:/[êÑ]/.test(m[3])?'Turf':/[úü]/.test(m[3])?'Synth':'Dirt',token:m[1],unit:m[2]?'f':'mile',furlongs:decodeDistanceToken(m[1],m[2]?'f':'mile'),figure:proof.figure,source_line:proof.source_line};
}
export function correctedMatchedSpeed({header,surface,date,proofs,verifiedDistance=null}){
 const decoded=decodeTodayDistance(header),distance=verifiedDistance??decoded.furlongs;
 const rows=proofs.slice(0,5).map(p=>decodeHistoryDistance(p,date)),matched=rows.filter(p=>p&&p.age<=365&&p.surface===surface&&distance!==null&&p.furlongs!==null&&Math.abs(p.furlongs-distance)<=1);
 const weight=p=>2**(-p.age/90),value=matched.length?matched.reduce((s,p)=>s+p.figure*weight(p),0)/matched.reduce((s,p)=>s+weight(p),0):null;
 return {input_version:DISTANCE_INPUT_ID,decoded_today:decoded,used_distance:distance,verified_distance_override:verifiedDistance!==null,rows,matched,value};
}
