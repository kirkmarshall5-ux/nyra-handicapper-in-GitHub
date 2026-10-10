// Display-only, deterministic illustration. No odds, handicap ratings, or betting logic.
const styleEarly={E:90,EP:72,P:48,S:25};
const styleLate={E:35,EP:54,P:72,S:90};
const numberOrNull=x=>x!==''&&x!=null&&Number.isFinite(Number(x))?Number(x):null;
function lengthFurlongs(raw){
 const t=String(raw||'').toUpperCase().replace(/\s+/g,' ').trim();
 const mixed=t.match(/(\d+)\s+(\d+)\/(\d+)\s*M/);
 if(mixed)return (Number(mixed[1])+Number(mixed[2])/Number(mixed[3]))*8;
 const frac=t.match(/(\d+)\/(\d+)\s*M/);
 if(frac)return 8*Number(frac[1])/Number(frac[2]);
 const mile=t.match(/(\d+(?:\.\d+)?)\s*M(?:ILE|ILES)?\b/);
 if(mile)return Number(mile[1])*8;
 const furlong=t.match(/(\d+(?:\.\d+)?)\s*F(?:URLONGS?)?\b/);
 if(furlong)return Number(furlong[1]);
 const yards=t.match(/(\d+)\s*Y(?:ARDS?)?\b/);
 if(yards)return Number(yards[1])/220;
 return null;
}
export function raceCallMarkers(distance){
 const f=lengthFurlongs(distance);
 if(f==null||f<4)return null;
 const calls=[{label:'¼ mile',fraction:2},{label:'½ mile',fraction:4}];
 if(f>=8)calls.push({label:'¾ mile',fraction:6});
 // Stretch is a race-phase projection, not a verified track-specific pole location.
 calls.push({label:'Stretch',fraction:null},{label:'Finish',fraction:f});
 return calls;
}
function compareProgram(a,b){
 const an=Number.parseFloat(String(a.n)),bn=Number.parseFloat(String(b.n));
 if(Number.isFinite(an)&&Number.isFinite(bn)&&an!==bn)return an-bn;
 return String(a.n).localeCompare(String(b.n));
}
export function projectRaceSetup(race){
 const markers=raceCallMarkers(race.dist);
 if(!markers)return {available:false,reason:'Distance unavailable or unsupported for fractional projection.',markers:[],rows:[]};
 const eligible=(race.horses||[]).filter(h=>h.odds!=='SCR'&&h.included_in_frozen_field!==false&&h.entry_status!=='MTO'&&h.entry_status!=='AE');
 if(eligible.length<2)return {available:false,reason:'At least two confirmed runners are required.',markers,rows:[]};
 const profiles=eligible.map(h=>{
  const early=numberOrNull(h.tfEarly),late=numberOrNull(h.tfLate),style=String(h.style||'').toUpperCase();
  return {...h,early:early??styleEarly[style]??null,late:late??styleLate[style]??null,source:early!==null&&late!==null?'TimeformUS Early/Late':early!==null||late!==null?'Partial TimeformUS + style proxy':styleEarly[style]!=null?'Running-style proxy':'Missing pace evidence'};
 });
 if(profiles.some(h=>h.early===null||h.late===null))return {available:false,reason:'One or more runners lack usable early/late or style evidence. No complete projection shown.',markers,rows:[]};
 const positions=profiles.map(()=>[]);
 markers.forEach((call,ci)=>{
  const phase=call.label==='Finish'?1:call.label==='Stretch'?.82:Math.min(.7,(call.fraction/markers.at(-1).fraction)*.9);
  const scored=profiles.map((h,i)=>({i,h,value:(1-phase)*h.early+phase*h.late}));
  scored.sort((a,b)=>b.value-a.value||compareProgram(a.h,b.h));
  scored.forEach((x,rank)=>positions[x.i][ci]=rank+1);
 });
 return {available:true,markers,rows:profiles.map((h,i)=>({program:h.n,name:h.name,source:h.source,positions:positions[i]})).sort((a,b)=>compareProgram({n:a.program},{n:b.program})),method:'Illustrative ranks blend available TimeformUS Early/Late pace figures and/or provisional running-style labels. They are not predicted measured calls, winning probabilities or handicapping selections.'};
}
