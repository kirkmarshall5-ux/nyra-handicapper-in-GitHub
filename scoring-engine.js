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


export function claimLayoffSignal(h){
 const days=numeric(h.daysSinceLast),claimPrice=numeric(h.lastClaimPrice),todayPrice=numeric(h.todayClaimPrice);
 const claimed=!!h.claimedLastStart||claimPrice!==null;
 if(!claimed)return {applicable:false,label:"No recent claim",score:0};
 let score=0,reasons=[];
 if(days!==null&&days>=45){score+=1;reasons.push(String(days)+"-day reset after claim")}
 const works=Array.isArray(h.works)?h.works.length:0;
 if(days!==null&&days>=45&&works>=3){score+=1;reasons.push(String(works)+" recorded works during reset")}
 if(claimPrice!==null&&todayPrice!==null){
  const ratio=todayPrice/claimPrice;
  if(ratio>=1.2){score+=2;reasons.push("protected/raised above claim price")}
  else if(ratio<=0.75){score-=2;reasons.push("returned well below claim price")}
 }
 const stat=numeric(h.claimLayoffWinPct),sample=numeric(h.claimLayoffStarts);
 if(stat!==null&&sample!==null&&sample>=10){
  if(stat>=20){score+=1;reasons.push("trainer "+stat+"% with claim/layoff pattern ("+sample+" starts)")}
  else if(stat<=7){score-=1;reasons.push("trainer only "+stat+"% with claim/layoff pattern ("+sample+" starts)")}
 }
 const label=score>=3?"Positive claim intent":score<=-2?"Negative claim intent":"Mixed/neutral claim intent";
 return {applicable:true,label,score,reasons};
}


export function contextualFigureWeight(run,today={}){
 let weight=1,reasons=[];
 const rs=String(run.surface||"").toLowerCase(),ts=String(today.surface||"").toLowerCase();
 if(rs&&ts&&rs!==ts){weight*=0.35;reasons.push("different surface")}
 const rd=numeric(run.distanceFurlongs),td=numeric(today.distanceFurlongs);
 if(rd!==null&&td!==null&&Math.abs(rd-td)>=2){weight*=0.7;reasons.push("materially different distance")}
 if(run.compromisedTrip){weight*=0.45;reasons.push("compromised trip")}
 const days=numeric(run.daysAgo);
 if(days!==null&&days>365){weight*=0.7;reasons.push("older race")}
 return {weight:+weight.toFixed(3),reasons};
}


export function beyerTrajectory(figures,weights=[]){
 const figs=(figures||[]).map(numeric).filter(v=>v!==null);
 if(figs.length<3)return {trend:"insufficient",slope:0,change:0};
 const chronological=[...figs].reverse();
 const ws=weights.length===figs.length?[...weights].reverse():chronological.map(()=>1);
 let sw=0,sx=0,sy=0,sxx=0,sxy=0;
 chronological.forEach((y,x)=>{const w=Math.max(0,numeric(ws[x])??1);sw+=w;sx+=w*x;sy+=w*y;sxx+=w*x*x;sxy+=w*x*y});
 const den=sw*sxx-sx*sx;
 const slope=den?(sw*sxy-sx*sy)/den:0;
 const change=figs[0]-figs[figs.length-1];
 const trend=slope>=3?"improving":slope<=-3?"declining":Math.abs(slope)<1.5?"stable":"mixed";
 return {trend,slope:+slope.toFixed(2),change};
}

export function relativeBeyerPosition(horseFigures,fieldCurrentFigures){
 const own=(horseFigures||[]).map(numeric).filter(v=>v!==null);
 const field=(fieldCurrentFigures||[]).map(numeric).filter(v=>v!==null).sort((a,b)=>a-b);
 if(!own.length||!field.length)return {available:false};
 const current=own[0],mid=Math.floor(field.length/2),median=field.length%2?field[mid]:(field[mid-1]+field[mid])/2;
 const rank=1+field.filter(v=>v>current).length;
 return {available:true,current,fieldMedian:median,vsMedian:current-median,rank,fieldSize:field.length};
}


export function ratingEvidenceProfile(h){
 const beyers=(h.beyers||h.figs||[]).map(numeric).filter(v=>v!==null);
 const timeform=(h.timeformRatings||[]).map(numeric).filter(v=>v!==null);
 const foreign=!!h.foreignForm||timeform.length>0;
 if(beyers.length&&timeform.length)return {status:"mixed-rating-systems",beyers,timeform,foreign,comparable:false};
 if(beyers.length)return {status:"beyer",beyers,timeform:[],foreign,comparable:true};
 if(timeform.length)return {status:"timeform-only",beyers:[],timeform,foreign:true,comparable:false};
 return {status:"no-speed-rating",beyers:[],timeform:[],foreign,comparable:false};
}
