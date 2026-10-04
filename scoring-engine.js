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


// Extract Beyer figures from DRF running lines without depending on surface
// abbreviations. PDF.js sometimes joins the Beyer and post position (e.g.
// "7810/12" = Beyer 78, post 10 of 12), so handle both layouts explicitly.
export function extractRunningLineFigures(text){
 const src=String(text||"").replace(/\s+/g," ").trim();
 const starts=[...src.matchAll(/\b\d{1,2}\S{0,4}\d{2}=\d+[A-Za-z]+/g)].map(m=>m.index);
 const out=[];
 for(let i=0;i<starts.length;i++){
  const seg=src.slice(starts[i],starts[i+1]??src.length).split(/\bWORKS:/i)[0];
  let m=seg.match(/(?:^|\s)(\d{1,3})\s+(\d{1,2})\s*\/\s*(\d{1,2})(?=\s|$)/);
  let fig=null;
  if(m){fig=+m[1]}
  else{
   const joined=seg.match(/(?:^|\s)(\d{3,5})\s*\/\s*(\d{1,2})(?=\s|$)/);
   if(joined){
    const digits=joined[1],field=+joined[2],candidates=[];
    for(const postDigits of [2,1]){
     if(digits.length<=postDigits)continue;
     const f=+digits.slice(0,-postDigits),post=+digits.slice(-postDigits);
     if(f>=0&&f<=120&&post>=1&&post<=field)candidates.push({f,postDigits});
    }
    if(candidates.length)fig=candidates[0].f;
   }
  }
  if(fig!==null&&fig>=0&&fig<=120)out.push(fig);
 }
 return out;
}


const COMPROMISED_TRIP_RE=/\b(stumbl\w*|bump\w*\s+(?:st|start|brk|break)|bad\s+(?:start|break)|broke\s+(?:slow|poor)|off\s+slow|slow\s+start|checked|steadied|clipped\s+heels|lost\s+rider|eased|pulled\s+up|stopped|dwelt|pinched\s+back|blocked|shuffled\s+back)\b/i;

export function beyerAnomalies(figures,tripComments=[]){
 const figs=(figures||[]).map(numeric).filter(v=>v!==null);
 if(figs.length<3)return [];
 return figs.map((fig,i)=>{
  const peers=figs.filter((_,j)=>j!==i).sort((a,b)=>a-b);
  const median=peers[Math.floor(peers.length/2)];
  const drop=median-fig;
  const comment=String(tripComments[i]||"");
  const compromised=COMPROMISED_TRIP_RE.test(comment);
  return {index:i,figure:fig,peerMedian:median,drop,comment,compromised,
   classification:drop>=25?(compromised?"extreme-low-compromised":"extreme-low-unexplained"):drop>=15?"low-outlier":"normal"};
 }).filter(x=>x.classification!=="normal");
}
