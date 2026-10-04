export function numeric(v){return v!==""&&v!=null&&Number.isFinite(+v)?+v:null}
export function evidenceProfile(h){
 const starts=numeric(h.lifeStarts),hasLast=numeric(h.last)!==null,hasBest=numeric(h.best)!==null;
 const hasRace=hasLast||hasBest||((h.figs||[]).length>0);
 const workMeasured=numeric(h.workRating)!==null,pedigreeMeasured=numeric(h.pedigreeRating)!==null;
 const trainerMeasured=numeric(h.trainerContextRating)!==null;
 const works=workMeasured||((h.works||[]).length>0)||!!h.workText;
 const pedigree=pedigreeMeasured||!!(h.sire||h.dam||h.damsire||h.pedigree);
 const trainer=trainerMeasured||!!h.trainerAngles;
 let available=0,possible=0;
 const add=(present,weight)=>{possible+=weight;if(present)available+=weight};
 if(starts===0){add(works,4);add(pedigree,3);add(trainer,4);add(numeric(h.form)!==null,1);add(numeric(h.cls)!==null,1)}
 else if(starts!==null&&starts<=2){add(hasRace,5);add(works,2);add(pedigree,1);add(trainer,2);add(numeric(h.form)!==null,1);add(numeric(h.cls)!==null,1)}
 else {add(hasLast,5);add(hasBest,2);add(numeric(h.form)!==null,1);add(numeric(h.cls)!==null,1);add(numeric(h.jockeyRating)!==null,0.5);add(numeric(h.trainerRating)!==null,0.5)}
 const coverage=possible?available/possible:0;
 return {starts,hasRace,works,pedigree,trainer,coverage,confidence:coverage>=.72?"High":coverage>=.42?"Medium":"Low"};
}
export function evidenceWeightedRating(parts){
 const usable=parts.filter(p=>Number.isFinite(p.value)&&p.weight>0);
 if(!usable.length)return null;
 const wt=usable.reduce((a,p)=>a+p.weight,0);
 return Math.round(usable.reduce((a,p)=>a+p.value*p.weight,0)/wt);
}
export function confidenceAdjustedTemperature(confidence){return confidence==="High"?14:confidence==="Medium"?17:22}
export function probabilityWeights(rows){
 if(!rows.length)return [];
 const raw=rows.map(r=>({id:r.id,v:Math.exp((r.rating-75)/confidenceAdjustedTemperature(r.confidence))}));
 const sum=raw.reduce((a,x)=>a+x.v,0)||1;
 return raw.map(x=>({id:x.id,p:x.v/sum}));
}
