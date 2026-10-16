import {paceProfile} from './projected-race-setup.js';

// Presentation only. Trainer statistics and missing figures never establish FTS.
export function careerStarts(h){
 const value=h.life_starts??h.lifeStarts;
 if((typeof value!=='number'&&typeof value!=='string')||String(value).trim()==='')return null;
 const starts=Number(value);
 return Number.isInteger(starts)&&starts>=0?starts:null;
}
export function careerLabel(h){
 const starts=careerStarts(h);
 return starts===null?'Starts unknown':starts===0?'First-time starter':starts<=2?'Lightly raced':'Experienced';
}
export function visibleAngles(h){
 const starts=careerStarts(h);
 return (h.angles||[]).filter(a=>!/^\s*(?:first[- ]time starter|FTS|1stStart)\s*$/i.test(a.label||'')||starts===0).map(a=>({...a}));
}
export function displayPaceStyle(h){
 if(h.ratings?.provider==='BRISNET')return careerStarts(h)>0&&['E','E/P','P','S'].includes(h.ratings.run_style)?h.ratings.run_style:'Unknown';
 const profile=paceProfile(h);
 return profile.known?profile.style:'Unknown';
}
export function clearPaceEvidence(h){
 h.timeform_early=null;h.timeform_late=null;h.tfEarly='';h.tfLate='';h.style='UNKNOWN';
}
