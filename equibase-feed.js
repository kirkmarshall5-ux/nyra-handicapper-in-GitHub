// Equibase RSS carries chronological change batches, not a complete entry list.
export const EQUiBASE_RSS='https://www.equibase.com/static/latechanges/rss/BEL-USA.rss';
const rssDecode=s=>String(s).replace(/&#(?:x([\da-f]+)|(\d+));/gi,(_,h,d)=>String.fromCodePoint(parseInt(h||d,h?16:10))).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;|&rsquo;|&lsquo;/g,"'").replace(/&nbsp;/g,' ').replace(/&amp;/g,'&');
const tag=(s,n)=>{const m=s.match(new RegExp('<'+n+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+n+'>'));if(!m)throw Error('RSS missing '+n);return rssDecode(m[1].replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/,'$1'));};
export const easternDate=t=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
export function distanceFurlongs(text){
 const normalized=text.toLowerCase().replace(/-/g,' ').replace(/\s+/g,' ').trim(),m=normalized.match(/^(.+?)\s+(furlongs?|miles?)$/);if(!m)throw Error('Unrecognized Equibase distance: '+text);
 const values={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12};
 const number=s=>values[s]??(/^\d+(?:\.\d+)?$/.test(s)?Number(s):null);
 let parts=m[1].split(' and '),whole=number(parts[0]),v=whole;
 if(parts.length===2){const f=parts[1].match(/^(one|two|three|five|seven|\d+) (half|quarter|fourth|eighth|sixteenth)s?$/);if(!f)throw Error('Unrecognized distance fraction');v=whole+number(f[1])/({half:2,quarter:4,fourth:4,eighth:8,sixteenth:16}[f[2]]);}
 else if(parts.length!==1)throw Error('Unrecognized distance');
 if(whole===null||v===null||!Number.isFinite(v))throw Error('Unrecognized distance');
 v*=m[2].startsWith('mile')?8:1;if(v<2||v>32)throw Error('Distance outside supported range');return v;
}
export function parseEquibaseFeed(xml,{date,now=Date.now()}={}){
 if(typeof xml!=='string'||xml.length>1000000||/<!DOCTYPE|<!ENTITY/i.test(xml)||!/^\s*<\?xml[\s\S]*<rss\b/.test(xml)||!/<\/rss>\s*$/.test(xml))throw Error('Invalid Equibase RSS');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))throw Error('A card date is required');
 const head=xml.split('<item>')[0],title=tag(head,'title'),publishedAt=new Date(tag(head,'pubDate')).toISOString();
 if(title!=='Equibase BEL Changes & Scratches')throw Error('RSS track does not match Belmont');
 if(easternDate(publishedAt)!==date)throw Error('Equibase feed date does not match loaded card: '+easternDate(publishedAt));
 if(Date.parse(publishedAt)>now+60000)throw Error('RSS publication time is in the future');
 const events=[],notices=[];let batches=0;
 for(const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)){
  batches++;const body=match[1],postedAt=new Date(tag(body,'pubDate')).toISOString();
  if(easternDate(postedAt)!==date||Date.parse(postedAt)>Date.parse(publishedAt))throw Error('RSS event date/time conflicts with channel');
  const description=tag(body,'description');
  for(const raw of description.split(/<br\s*\/?\s*>/i)){
   const line=rssDecode(raw.replace(/<[^>]*>/g,'')).replace(/\s+/g,' ').trim();if(!line)continue;
   const m=line.match(/^Race\s+(\d+):\s*(.+)$/i);if(!m){notices.push(line);continue;}
   const event={race:Number(m[1]),postedAt,text:m[2]},t=m[2];let x;
   if((x=t.match(/^#\s*(\d+[A-Z]?)\s+(.+?)\s+Scratched(?:\s*-.*)?$/i)))Object.assign(event,{type:'scratch',program:x[1],name:x[2]});
   else if(/^#.*Scratch Reason\s*-/i.test(t))event.type='notice';
   else if((x=t.match(/^Course\s*-\s*.+?changed to\s+(.+)$/i))){const names={'all weather track':'Synth','synthetic':'Synth','dirt':'Dirt','main track':'Dirt','turf':'Turf','inner turf':'Turf'};event.type='surface';event.surface=names[x[1].toLowerCase()];if(!event.surface)throw Error('Unsupported course change: '+t);}
   else if((x=t.match(/^Distance\s*-\s*.+?changed to\s+(.+)$/i)))Object.assign(event,{type:'distance',furlongs:distanceFurlongs(x[1])});
   else if((x=t.match(/^Current (Dirt|Turf|All Weather) Track Condition\s*-.*changed to\s+(.+)$/i)))Object.assign(event,{type:'going',surface:{dirt:'Dirt',turf:'Turf','all weather':'Synth'}[x[1].toLowerCase()],going:x[2]});
   else if(/^(?:Race\s+)?Cancel(?:led|ed)\b/i.test(t))event.type='cancelled';
   else {if(/^(?:Course|Distance|Current .*Track Condition)\s*-/i.test(t)||/\bScratched\b/i.test(t))throw Error('Unrecognized critical change: '+t);event.type='notice';}
   events.push(event);
  }
 }
 if(!batches)throw Error('RSS contains no change batches');
 events.sort((a,b)=>Date.parse(a.postedAt)-Date.parse(b.postedAt));
 return {schemaVersion:1,track:'BEL',date,sourceUrl:EQUiBASE_RSS,publishedAt,events,notices};
}
