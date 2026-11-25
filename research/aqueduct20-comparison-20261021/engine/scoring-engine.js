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

// Locked restored V4.4c. All scoring inputs come from this horse's own PP.
export const MODEL_ID='V4.4c-restored-verified-rules-v1';
export function pythonRound(v,digits=0){const f=10**digits,x=v*f,lo=Math.floor(x),frac=x-lo;return (frac===.5?(lo%2===0?lo:lo+1):Math.round(x))/f}
const median=a=>{const s=[...a].sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};
export function baseRating(h){
 const starts=h.life_starts,figs=h.beyer_figures||[];
 if(starts==null)return {base:null,reason:'career-starts-unverified'};
 if(starts===0)return {base:null,reason:'FTS-unrated'};
 if(!figs.length)return {base:null,reason:'no-beyer-evidence'};
 if(figs.some(x=>typeof x!=='number'||!Number.isFinite(x)||x<0||x>120))return {base:null,reason:'invalid-beyer-evidence'};
 const parts=[[Math.min(110,figs[0]),40],[Math.min(110,Math.max(...figs.slice(0,3))),22]].filter(([v])=>v>0);
 for(const [k,w] of [['jockey_win',7],['trainer_win',8]])if(h[k]!=null)parts.push([Math.min(100,h[k]*3),w]);
 if(starts<=2&&h.trainer_context_score!=null)parts.push([h.trainer_context_score,12]);
 if(!parts.length)return {base:null,reason:'no-measured-rating-evidence'};
 return {base:parts.reduce((s,[v,w])=>s+v*w,0)/parts.reduce((s,[,w])=>s+w,0),reason:null};
}
export function trajectory(figs){if(figs.length<3)return 'insufficient';const y=[...figs].reverse(),n=y.length,sx=n*(n-1)/2,sy=y.reduce((a,b)=>a+b,0),sxx=y.reduce((s,_,x)=>s+x*x,0),sxy=y.reduce((s,v,x)=>s+x*v,0),slope=(n*sxy-sx*sy)/(n*sxx-sx*sx);return slope>=3?'improving':slope<=-3?'declining':Math.abs(slope)<1.5?'stable':'mixed'}
export function rebound(h){const figs=h.beyer_figures||[];if(figs.length<3)return 0;const prior=figs.slice(1,5),gap=median(prior)-figs[0],stable=prior.length>=2&&Math.max(...prior)-Math.min(...prior)<=15;return stable&&gap>=20?2:stable&&gap>=15?1:0}
export function adjustment(h,field,preserved=null){
 const figs=h.beyer_figures||[],current=field.filter(x=>x.beyer_figures?.length).map(x=>x.beyer_figures[0]);let signals=[],protect=rebound(h);
 if(preserved===null){if(figs.length>=3&&median(figs.slice(1))-figs[0]>=25&&!protect)signals.push(['latest-unexplained-collapse',-1]);if(protect)signals.push(['rebound-protection',protect]);if(h.life_starts!=null&&h.life_starts>0&&h.life_starts<=5&&figs.length>=2){const upside=Number(trajectory(figs)==='improving')+Number(current.length>0&&Math.max(...figs)>=median(current)+5);if(upside)signals.push(['lightly-raced-upside',Math.min(2,upside)])}}
 else{signals=preserved.map(x=>[...x]);protect=signals.some(([s,v])=>s==='rebound-protection'&&v>0)}
 let relative=figs.length&&current.length?Math.max(-2,Math.min(2,(figs[0]-median(current))/10)):0;relative=Math.abs(relative)>=.5?pythonRound(relative,2):0;if(protect&&relative<0)relative=0;if(relative)signals.unshift(['field-relative',relative]);
 const rivals=field.filter(x=>x!==h&&x.timeform_early!=null).map(x=>x.timeform_early),own=h.timeform_early;
 if(own!=null&&rivals.length){const advantage=own-Math.max(...rivals),near=rivals.filter(x=>x>=own-5).length,pace=advantage>=20?3:advantage>=10?2:advantage>=5?1:own>=95&&near>=2?-1:0;if(pace)signals.push(['pace-fit',pace])}
 const order={'field-relative':0,'latest-unexplained-collapse':1,'pace-fit':2,'rebound-protection':3,'lightly-raced-upside':4};signals.sort((a,b)=>order[a[0]]-order[b[0]]);return {value:Math.max(-6,Math.min(6,signals.reduce((s,[,v])=>s+v,0))),signals};
}
export function rateRace(field,{raceBlockers=[],legacyDisplayRanking=false}={}){
 const blockers=[...raceBlockers],runners=field.map(h=>({...h}));
 for(const h of runners){const b=baseRating(h);h.base_rating=b.base;h.unrated_reason=b.reason;if(b.reason)blockers.push({horse:h.name,reason:b.reason});for(const reason of h.parser_blockers||[])blockers.push({horse:h.name,reason})}
 if(!runners.length)blockers.push({reason:'no-unconditional-entrants'});
 if(blockers.length)return {decision:'PASS',pass_reasons:blockers,rankings:[],runners};
 for(const h of runners){const a=adjustment(h,runners);h.v44c_adjustment=a.value;h.v44c_signals=a.signals;h.v44c_unrounded_score=h.base_rating+a.value;h.v44c_display_score=pythonRound(h.v44c_unrounded_score)}
 const key=legacyDisplayRanking?'v44c_display_score':'v44c_unrounded_score';const rankings=[...runners].sort((a,b)=>b[key]-a[key]||(a.name<b.name?-1:a.name>b.name?1:0));rankings.forEach((h,i)=>h.v44c_rank=i+1);return {decision:'RATEABLE',pass_reasons:[],rankings,runners};
}
export function websiteRace(race){
 const field=race.horses.filter(h=>h.odds!=='SCR'&&(!h.entry_status||h.entry_status==='REGULAR'));
 return rateRace(field.map(h=>({...h,life_starts:h.life_starts??h.lifeStarts??null,beyer_figures:h.beyer_figures??h.figs??[],timeform_early:h.timeform_early??numeric(h.tfEarly),jockey_win:h.jockey_win??null,trainer_win:h.trainer_win??null,trainer_context_score:h.trainer_context_score??null})),{raceBlockers:race.parser_blockers||[]});
}
