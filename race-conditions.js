// One source of truth for scheduled conditions; alternate wording is context only.
export const CONDITIONS_VERSION='primary-conditions-v1';
// DRF's PDF font uses these characters for fractional distances.
export function displayDistance(distance=''){
 const fractions={'ô':'1/2','Â':'1/16','±':'3/16','²':'1/4','´':'3/8','ö':'3/4','ø':'7/8'};
 return String(distance).replace(/(\d)([ôÂ±²´öø])/g,(_,whole,f)=>whole+' '+fractions[f]);
}
export function raceConditions(header=''){
 const distanceLine=String(header).split('\n').find(l=>/\b(?:MILES?|FURLONGS?|YARDS?)\b/i.test(l)&&!/^\s*(?:if|alternate)\b/i.test(l))||'';
 const primary=distanceLine.split(/\b(?:if|alternate)\b/i)[0];
 const unsupported=/\b(?:Hurdles?|Steeplechase|Quarter Horse)\b|National Fences/i.test(header)||(/\bYARDS?\b/i.test(primary)&&!/\b(?:MILES?|FURLONGS?)\b/i.test(primary));
 return {version:CONDITIONS_VERSION,distanceLine,primaryDistanceLine:primary.trim(),unsupported,verified:Boolean(primary.trim()),surface:primary.trim()?/Turf|[êë]/i.test(primary)?'Turf':/Tapeta|All Weather|Synthetic/i.test(primary)?'Synth':'Dirt':null,alternateSurface:/\b(?:if|alternate)\b[\s\S]*(?:Tapeta|All Weather|Synthetic)/i.test(header)?'Synth':null};
}
export function conditionBlockers(conditions){return !conditions.verified?[{reason:'primary-race-conditions-unverified'}]:conditions.unsupported?[{reason:'unsupported-race-type'}]:[];}
