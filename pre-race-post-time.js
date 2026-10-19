// Explicit post-time evidence; no inference from a display label or browser timezone.
export function verifyPostTimeEvidence(evidence,{now=Date.now(),raceDate,track,raceNumber}={}){
 const errors=[];
 const timestamp=evidence?.scheduledPost;
 if(typeof timestamp!=='string'||!/T\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:\d\d)$/.test(timestamp)||!Number.isFinite(Date.parse(timestamp)))errors.push('Enter a full scheduled post timestamp with timezone offset.');
 if(!['NYRA_OFFICIAL','TRACK_OFFICIAL','MANUAL_OFFICIAL_REFERENCE'].includes(evidence?.sourceType))errors.push('Official post-time source type required.');
 let url;
 try{url=new URL(evidence?.sourceUrl);}catch{}
 if(!url||url.protocol!=='https:'||!url.hostname)errors.push('HTTPS link to official schedule evidence required.');
 if(evidence?.sourceType==='NYRA_OFFICIAL'&&url&&!/(^|\.)nyra\.com$/i.test(url.hostname))errors.push('NYRA source must link to nyra.com.');
 if(!evidence?.verifiedByUser)errors.push('Confirm source, race, date and timezone against official schedule.');
 if(!evidence?.observedAt||!Number.isFinite(Date.parse(evidence.observedAt))||Date.parse(evidence.observedAt)>now)errors.push('Evidence observation timestamp required.');
 if(raceDate&&typeof timestamp==='string'&&timestamp.slice(0,10)!==raceDate)errors.push('Scheduled post local date differs from race date.');
 if(!track||!Number.isInteger(Number(raceNumber))||Number(raceNumber)<1)errors.push('Race identity required.');
 if(Number.isFinite(Date.parse(timestamp))&&now>=Date.parse(timestamp))errors.push('Scheduled post has passed.');
 return {verified:errors.length===0,errors,scheduledPost:errors.length?null:timestamp,postTimeEvidence:errors.length?null:{...evidence,verification:'USER_CONFIRMED_OFFICIAL_REFERENCE_NOT_INDEPENDENTLY_ANCHORED'}};
}
