export function numeric(v){return v!==""&&v!=null&&Number.isFinite(+v)?+v:null}

function numericFigures(h){
 const values=[...(Array.isArray(h.figs)?h.figs:[]),h.last,h.best].map(numeric).filter(v=>v!==null);
 return [...new Set(values)];
}

export function evidenceProfile(h){
 const starts=numeric(h.lifeStarts),figs=numericFigures(h),hasLast=numeric(h.last)!==null,hasBest=numeric(h.best)!==null;
 const hasRace=figs.length>0;
 const workMeasured=numeric(h.workRating)!==null,pedigreeMeasured=numeric(h.pedigreeRating)!==null;
 const trainerMeasured=numeric(h.trainerContextRating)!==null;
 const works=workMeasured||((h.works||[]).length>0)||!!h.workText;
 const pedigree=pedigreeMeasured||!!(h.sire||h.dam||h.damsire||h.pedigree);
 const trainer=trainerMeasured||!!h.trainerAngles;
 const jockeyKnown=numeric(h.jockeyRating)!==null||numeric(h.jWin)!==null;
 const trainerKnown=numeric(h.trainerRating)!==null||numeric(h.tWin)!==null;
 let experience="Starts unknown",confidence="Low",coverage=0;

 if(starts===null){
  const available=[hasRace,works,pedigree,trainer,jockeyKnown,trainerKnown].filter(Boolean).length;
  coverage=available/6;
  confidence="Low"; // unknown career history is a data-quality limitation, never silently "Experienced"
 }else if(starts===0){
  experience="First-time starter";
  const support=[works,pedigree,trainer].filter(Boolean).length;
  coverage=support/3;
  // Debut runners never receive High confidence: there is no direct race evidence.
  confidence=support===3?"Medium":"Low";
 }else if(starts<=2){
  experience="Lightly raced";
  const support=[hasRace,works,pedigree,trainer].filter(Boolean).length;
  coverage=support/4;
  // Sparse race history caps confidence at Medium.
  confidence=hasRace&&support>=3?"Medium":"Low";
 }else{
  experience="Experienced";
  const direct=Math.min(figs.length,3);
  const support=[hasLast,hasBest,jockeyKnown,trainerKnown].filter(Boolean).length;
  coverage=(direct*2+support)/10;
  // Established runners earn High only from multiple direct race figures,
  // not merely because "last" and "best" happen to be populated.
  confidence=hasLast&&hasBest&&figs.length>=3?"High":hasLast&&hasRace?"Medium":"Low";
 }
 return {starts,experience,figCount:figs.length,hasRace,works,pedigree,trainer,coverage,confidence};
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
