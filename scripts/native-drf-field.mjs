import {runnerName,runnerProgram,matchUpdateRunner} from '../runner-identity.js';
import {activeRunner} from '../active-field.js';
export function reconcileNativeField(race,official){
 if(official?.verified!==true||!Array.isArray(official.starters)||official.starters.length<2)throw Error('Verified official starter identities required');
 const copy=structuredClone(race),horses=copy.horses;
 const selected=new Set(),programs=new Set(),names=new Set();
 for(const s of official.starters){
 const p=runnerProgram(s.program),n=runnerName(s.name);
 if(!/^\d+$/.test(p)||!n||programs.has(p)||names.has(n))throw Error('Invalid or duplicate official identity');
 const h=matchUpdateRunner(horses,s);
 if(runnerProgram(h.n)!==p||selected.has(h))throw Error('Unverified program identity');
 if(h.entry_status&&!['REGULAR','AE','ALSO_ELIGIBLE'].includes(h.entry_status))throw Error('Unsupported starter entry status');
 selected.add(h);programs.add(p);names.add(n);
 }
 for(const h of horses){
 h.included_in_frozen_field=selected.has(h);
 if(selected.has(h)){if(h.odds==='SCR')h.odds=h.ml??'—';}
 else h.odds='SCR';
 }
 const active=horses.filter(activeRunner);
 if(active.length!==selected.size||active.some(h=>!selected.has(h)))throw Error('Active field reconciliation failed');
 return copy;
}
