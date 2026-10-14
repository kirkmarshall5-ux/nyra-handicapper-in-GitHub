import {displayDistance} from './race-conditions.js';
// Display-only, deterministic illustration. No odds, handicap ratings, or betting logic.
const numberOrNull=x=>((typeof x==='number'||typeof x==='string')&&String(x).trim()!==''&&Number.isFinite(Number(x))&&Number(x)>=0)?Number(x):null;
export function paceEligible(h){return h.odds!=='SCR'&&h.included_in_frozen_field!==false&&(!h.entry_status||h.entry_status==='REGULAR')}
export function paceProfile(h){
 const starts=h.life_starts??h.lifeStarts;
 if(starts===0||starts==='0')return {known:false,style:'UNKNOWN',early:null,late:null,source:'FTS — pace unknown'};
 const early=numberOrNull(h.tfEarly)??numberOrNull(h.timeform_early),late=numberOrNull(h.tfLate)??numberOrNull(h.timeform_late);
 if(early===null||late===null)return {known:false,style:'UNKNOWN',early:null,late:null,source:'Missing pace evidence — unknown'};
 const style=['E','EP','P','S'].includes(h.style)?h.style:early>=105?'E':early>=90?'EP':late>=85?'S':'P';
 return {known:true,style,early,late,source:'TimeformUS Early/Late'};
}
function lengthFurlongs(raw){
 const t=displayDistance(String(raw).replace(/(\d)°/g,'$1 1/8')).toUpperCase().replace(/\s+/g,' ').trim();
 const mixed=t.match(/(\d+)\s+(\d+)\/(\d+)\s*M/);
 if(mixed)return (Number(mixed[1])+Number(mixed[2])/Number(mixed[3]))*8;
 const frac=t.match(/(\d+)\/(\d+)\s*M/);
 if(frac)return 8*Number(frac[1])/Number(frac[2]);
 const mile=t.match(/(\d+(?:\.\d+)?)\s*M(?:ILE|ILES)?\b/);
 if(mile)return Number(mile[1])*8;
 const mixedFurlong=t.match(/(\d+)\s+(\d+)\/(\d+)\s*F(?:URLONGS?)?\b/);
 if(mixedFurlong)return Number(mixedFurlong[1])+Number(mixedFurlong[2])/Number(mixedFurlong[3]);
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
 if(/hurdle|steeplechase/i.test(String(race.cls||'')+' '+String(race.surface||'')))return {available:false,reason:'Hurdle and steeplechase races are excluded from this illustration.',markers:[],rows:[]};
 if(!markers)return {available:false,reason:'Distance unavailable or unsupported for fractional projection.',markers:[],rows:[]};
 const eligible=(race.horses||[]).filter(paceEligible);
 if(eligible.length<2)return {available:false,reason:'At least two confirmed runners are required.',markers,rows:[]};
 const profiles=eligible.map(h=>({...h,...paceProfile(h)}));
 const incomplete=profiles.some(h=>!h.known);
 const positions=profiles.map(()=>markers.map(()=>null));
 markers.forEach((call,ci)=>{
  const phase=call.label==='Finish'?1:call.label==='Stretch'?.82:Math.min(.7,(call.fraction/markers.at(-1).fraction)*.9);
  const scored=profiles.map((h,i)=>({i,h,value:h.known?(1-phase)*h.early+phase*h.late:null})).filter(x=>x.h.known);
  scored.sort((a,b)=>b.value-a.value||compareProgram(a.h,b.h));
  scored.forEach((x,rank)=>positions[x.i][ci]=rank+1);
 });
 return {available:true,incomplete,knownPaceCount:profiles.filter(h=>h.known).length,missingPaceReason:profiles.every(h=>!h.known)?'No usable TimeformUS Early/Late pace figures in this race. Numerical pace projections are unavailable; first-time starters remain Unknown. Upload a matching source with those pace figures to enable this illustration.':null,markers,rows:profiles.map((h,i)=>({program:h.n,name:h.name,source:h.source,positions:positions[i]})).sort((a,b)=>compareProgram({n:a.program},{n:b.program})),method:(incomplete?'Incomplete illustration: positions rank only runners with known pace figures; unknown runners could change the race flow. ':'')+'Illustrative ranks blend TimeformUS Early/Late pace figures. FTS and runners missing either figure remain Unknown at every call. These are not predicted measured calls, winning probabilities or handicapping selections.'};
}

