// Structured source evidence only. Workouts do not enter any ranking formula.
export const WORKOUT_PARSER_ID='BRISNET-WORKOUTS-v1';
const months={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Jly:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
const fifths={'¨':.2,'©':.4,'ª':.6,'«':.8};
const dateStart=/(?:×)?\d{2}(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Jly|Aug|Sep|Oct|Nov|Dec)(?:['’]\d{2})?(?=\s)/g;
function dateValue(day,month,year){
 const d=new Date(Date.UTC(year,month-1,day));
 return d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day?d.toISOString().slice(0,10):null;
}
export function parseBrisnetWorkouts(rows,today){
 const workouts=[],unresolved=[];let prior=today;
 for(const row of rows){
  const text=String(row.text||'').trim(),starts=[...text.matchAll(dateStart)];
  if(!starts.length){if(text)unresolved.push({text,page:row.pageNumber,y:row.y,reason:'Workout date prefix unverified'});continue;}
  if(starts[0].index!==0)unresolved.push({text:text.slice(0,starts[0].index),page:row.pageNumber,y:row.y,reason:'Unparsed workout prefix'});
  for(let i=0;i<starts.length;i++){
   const raw=text.slice(starts[i].index,starts[i+1]?.index??text.length).trim();
   const m=raw.match(/^(×)?(\d{2})([A-Za-z]{3})(?:['’](\d{2}))?\s+(.+?)\s+(\d+(?:\.\d+|[½¼¾])?)(f|m)\s+(ft|fm|gd|sy|my|yl|sf|hy|wf|sl)\s+((?:\d+:|:)\d{2}(?:\.\d+|[¨©ª«])?)\s+(\S+)\s+(\d+)\/(\d+)$/);
   const source={parser:WORKOUT_PARSER_ID,page:row.pageNumber,y:row.y,text:raw};
   const unknown=reason=>unresolved.push({...source,reason});
   if(!m){unknown('Workout fields unsupported or incomplete');continue;}
   const [,bullet,day,mon,yr,track,dist,unit,going,time,method,rank,total]=m;
   if(!months[mon]||!/^20\d{2}-\d{2}-\d{2}$/.test(today)||!/^B(?:g)?$|^H(?:g)?$/.test(method)){unknown('Workout date or method unverified');continue;}
   let year=yr?2000+ +yr:+today.slice(0,4),date=dateValue(+day,months[mon],year);
   if(!yr&&date&&date>prior)date=dateValue(+day,months[mon],--year);
   if(!date||date>today||date>prior||+rank<1||+total<+rank){unknown('Workout date order or rank conflicts');continue;}
   const tm=time.match(/^(\d*):(\d{2})(?:\.(\d+)|([¨©ª«]))?$/),seconds=tm?60*(+tm[1]||0)+ +tm[2]+(tm[3]?Number('0.'+tm[3]):fifths[tm[4]]||0):null;
   const fraction={'½':.5,'¼':.25,'¾':.75}[dist.at(-1)]||0,furlongs=(parseFloat(dist)+fraction)*(unit==='m'?8:1);
   if(seconds===null||seconds<=0||+tm[2]>=60||furlongs<=0){unknown('Workout distance or time invalid');continue;}
   workouts.push({date,date_year_source:yr?'PRINTED_YEAR':'INFERRED_FROM_CARD_AND_DESCENDING_DATES',track_text:track,furlongs,going,time_text:time,seconds,method,rank:+rank,total:+total,bullet:!!bullet,status:'SOURCE_FIELDS_PARSED',source});prior=date;
  }
 }
 return {workouts,unresolved,workout_status:unresolved.length?'PARTIAL_SOURCE_EXTRACTION':workouts.length?'SOURCE_FIELDS_PARSED':'NO_PRINTED_WORKOUTS',scoring_enabled:false};
}
