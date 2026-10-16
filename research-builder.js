import {RULES,parseOdds} from './win-value-gate.mjs?v=20261007-builder1';
export const BUILDER_ID='V44C-research-builder-v1';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
export function money(v){const s=String(v??'').trim();return /^\d+(?:\.\d{1,2})?$/.test(s)&&Number.isSafeInteger(Math.round(+s*100))?+s:null}
export function timestamp(v){
 if(typeof v!=='string')return null;
 const m=v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/);if(!m)return null;
 const date=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));
 if(date.getUTCFullYear()!==+m[1]||date.getUTCMonth()+1!==+m[2]||date.getUTCDate()!==+m[3]||+m[4]>23||+m[5]>59||+(m[6]||0)>59)return null;
 return Number.isFinite(Date.parse(v))?Date.parse(v):null;
}
function frozenModelSnapshot(result,kind,activeField){
 const rankings=result.rankings.map((h,i)=>({
  program:String(h.n),horse:h.name,rank:i+1,
  rawScore:kind==='V44C'?(h.v44c_unrounded_score??null):(h.score??null),
  scoreSource:kind==='V44C'?'v44c_unrounded_score':'score'
 }));
 return {modelId:result.model_id,decision:result.decision,
  reason:result.reason||null,passReasons:structuredClone(result.pass_reasons||[]),
  provisional:result.provisional===true,rankedFieldCount:rankings.length,
  activeFieldCount:activeField.length,
  fullFieldRanked:result.decision==='RATEABLE'&&rankings.length===activeField.length,
  rankings};
}
export function preRaceFreeze({card,race,rating,contenderRating,mix1Rating,postTime,now,finalFieldVerified,surfaceVerified}){
 const post=timestamp(postTime),errors=[];
 if(post===null)errors.push('Enter a scheduled post time with an explicit time zone.');
 if(!finite(now)||post!==null&&now>=post)errors.push('Freeze must occur before the recorded post time.');
 if(finalFieldVerified!==true||surfaceVerified!==true)errors.push('Verify the current field, scratches and surface before freezing.');
 if(post!==null){const dateET=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(post));if(dateET!==race.date)errors.push('Post date must match the card date in New York time.');}
 if(!card?.id||!race?.date||!race?.track||!race?.race||!Array.isArray(race.horses))errors.push('Race identity and rankings must be loaded.');
 const models=[['V44C',rating],['CONTENDER',contenderRating],['MIX1',mix1Rating]];
 for(const [name,result] of models)if(!result?.model_id||!['RATEABLE','PASS','HOLD'].includes(result.decision)||!Array.isArray(result.rankings))errors.push(name+' model output unavailable; do not freeze an incomplete three-model snapshot.');
 if(errors.length)return {freeze:null,errors};
 const activeField=race.horses.filter(h=>h.n&&h.odds!=='SCR'&&h.included_in_frozen_field!==false&&(!h.entry_status||h.entry_status==='REGULAR')).map(h=>({program:String(h.n),horse:h.name}));
 const identities=new Set(activeField.map(h=>h.program+'|'+h.horse));
 if(!activeField.length||identities.size!==activeField.length||new Set(activeField.map(h=>h.program)).size!==activeField.length)errors.push('Active field must contain unique runner identities and program numbers.');
 for(const [name,result] of models){
  const seen=new Set();
  for(const h of result.rankings){
   const key=String(h.n)+'|'+h.name;
   if(!identities.has(key)||seen.has(key)||!finite(name==='V44C'?h.v44c_unrounded_score:h.score)){
    errors.push(name+' has duplicate, unverified, ineligible or nonnumeric ranking entries.');break;
   }
   seen.add(key);
  }
  if(result.decision==='RATEABLE'&&result.rankings.length!==activeField.length)errors.push(name+' RATEABLE ranking does not cover the verified full field.');
 }
 if(errors.length)return {freeze:null,errors};
 const snapshots=Object.fromEntries(models.map(([name,result])=>[name,frozenModelSnapshot(result,name,activeField)]));
 return {errors:[],freeze:{schemaVersion:2,builder:BUILDER_ID,cardId:card.id,sourceName:card.sourceName||null,parserVersion:card.parser_version||null,card_date:race.date,track:race.track,race:race.race,model:rating.model_id||RULES.model,recordedAt:new Date(now).toISOString(),recordedEpochMs:now,scheduledPost:new Date(post).toISOString(),postEpochMs:post,surface:race.surface||null,raceDecision:rating.decision,passReasons:structuredClone(rating.pass_reasons||[]),activeField,fieldSnapshot:race.horses.filter(h=>h.n).map(h=>({program:String(h.n),horse:h.name,odds:h.odds??null,entryStatus:h.entry_status||'REGULAR',includedInFrozenField:h.included_in_frozen_field!==false,scratched:h.odds==='SCR'})),rankingSnapshot:snapshots.V44C.rankings.map(h=>({horse:h.horse,program:h.program,rawScore:h.rawScore,rank:h.rank})),models:snapshots,finalFieldVerified:true,surfaceVerified:true,untouchedStatus:'NOT_INDEPENDENTLY_VERIFIED',externalAnchor:null,automatedStake:0,decision:'PASS'}};
}

export async function sealedResearchExport({records,freezes,exportedAt}){
 const payload={schemaVersion:2,mode:'RESEARCH_ONLY',records,freezes};
 if(!globalThis.crypto?.subtle)throw new Error('SHA-256 unavailable; export not sealed.');
 const bytes=new TextEncoder().encode(JSON.stringify(payload));
 const digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);
 const recordsDigestSha256=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 return {...payload,exportedAt,recordsDigestSha256,digestScope:'SHA-256 of UTF-8 JSON.stringify({schemaVersion:2,mode,records,freezes})',anchorStatus:'UNVERIFIED_LOCAL_EXPORT'};
}

export function previewBudget({cash,dailyStaked,outstandingBets,alreadyBet,cap=RULES.dailyStakeCap,floor=RULES.bankrollFloor}){
 const reasons=[];for(const [key,v]of Object.entries({cash,dailyStaked,cap,floor}))if(!finite(v)||v<0)reasons.push('invalid-'+key);
 if(!Number.isInteger(outstandingBets)||outstandingBets!==0)reasons.push('outstanding-bet');
 if(alreadyBet!==false)reasons.push('duplicate-or-unconfirmed-bet');
 const after=finite(cash)?Math.round((cash-RULES.stake)*100)/100:null;
 if(finite(after)&&finite(floor)&&after<floor)reasons.push('cash-reserve');
 if(finite(dailyStaked)&&finite(cap)&&dailyStaked+RULES.stake>cap)reasons.push('daily-stake-limit');
 return {allowed:reasons.length===0,reasons,ticketCost:RULES.stake,cashAfterPreview:after,policyOverride:cap!==RULES.dailyStakeCap||floor!==RULES.bankrollFloor};
}
export function quoteCapture({card,race,rating,horseNumber,odds,sourceId,evidenceRef,quoteTime,postTime,now,observedLive,finalFieldVerified,surfaceVerified,budget}){
 const errors=[],horse=race.horses.find(h=>String(h.n)===String(horseNumber));
 if(!horse?.n)errors.push('Verified entry program number is required; import official entries first.');
 if(!horse||horse.odds==='SCR'||horse.included_in_frozen_field===false)errors.push('Select an active regular runner.');
 const parsed=parseOdds(odds),q=timestamp(quoteTime),post=timestamp(postTime);
 if(parsed===null)errors.push('Enter valid net odds, such as 5/2 or 2.5.');
 if(!sourceId?.trim())errors.push('Name the tote source.');
 if(!evidenceRef?.trim())errors.push('Add a screenshot, saved-page or other evidence reference.');
 if(observedLive!==true)errors.push('Confirm that the quote was copied from a live tote.');
 if(q===null||post===null)errors.push('Use full quote/post timestamps with Z or an explicit offset, such as -04:00.');
 if(!finite(now)||q!==null&&q>now)errors.push('Quote time cannot be in the future.');
 if(q!==null&&post!==null&&q>=post)errors.push('Quote must be observed before the recorded post time.');
 if(post!==null&&finite(now)&&now>=post)errors.push('Research observations must be recorded before the scheduled post time.');
 if(q!==null&&post!==null){const dateET=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(post));if(dateET!==race.date)errors.push('Post date must match the card date in New York time.');}
 if(errors.length)return {record:null,errors};
 const ranked=rating.rankings.find(h=>h.name===horse.name),timing=now-q<=RULES.maxQuoteAgeSeconds*1000&&post-now>=RULES.minSecondsBeforePost*1000;
 return {errors:[],record:{schemaVersion:1,builder:BUILDER_ID,ruleId:RULES.id,recordedAt:new Date(now).toISOString(),now,cardId:card.id,sourceName:card.sourceName||'',card_date:race.date,track:race.track,race:race.race,surface:race.surface||null,horse:horse.name,program:String(horse.n),model:rating.model_id||RULES.model,rawScore:ranked?.v44c_unrounded_score??null,rank:ranked?.v44c_rank??null,raceDecision:rating.decision,selectionFrozen:!!ranked,gateStatus:horse.actual_post_status||"UNVERIFIED",actualPost:horse.actual_post_status==="SOURCE_VERIFIED"?horse.actual_post:null,rankingSnapshot:rating.rankings.map(h=>({horse:h.name,program:String(h.n),rawScore:h.v44c_unrounded_score,rank:h.v44c_rank})),racePassReasons:rating.pass_reasons,finalFieldVerified:finalFieldVerified===true,surfaceVerified:surfaceVerified===true,stateVerification:'USER_ATTESTED_NOT_INDEPENDENTLY_VERIFIED',odds:String(odds).trim(),netOdds:parsed,quoteSource:'live-tote',quoteSourceId:sourceId.trim(),evidenceRef:evidenceRef.trim(),quoteTime:new Date(q).toISOString(),quoteEpochMs:q,postTime:new Date(post).toISOString(),postEpochMs:post,quoteTimingEligible:timing,quoteEvidenceVerified:false,untouchedStatus:'NOT_VERIFIED',calibrationId:null,probabilityCalibrated:false,confidenceVerified:false,winProbability:null,decision:'PASS',pass_reasons:['live-validation-pending','probability-calibration-unverified','confidence-unverified','quote-evidence-requires-review',...(!timing?['quote-outside-candidate-timing-window']:[])],budget,automatedStake:0}};
}
