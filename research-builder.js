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
 if(!horse||horse.odds==='SCR'||horse.included_in_frozen_field===false)errors.push('Select an active regular runner.');
 const parsed=parseOdds(odds),q=timestamp(quoteTime),post=timestamp(postTime);
 if(parsed===null)errors.push('Enter valid net odds, such as 5/2 or 2.5.');
 if(!sourceId?.trim())errors.push('Name the tote source.');
 if(!evidenceRef?.trim())errors.push('Add a screenshot, saved-page or other evidence reference.');
 if(observedLive!==true)errors.push('Confirm that the quote was copied from a live tote.');
 if(q===null||post===null)errors.push('Use full quote/post timestamps with Z or an explicit offset, such as -04:00.');
 if(!finite(now)||q!==null&&q>now)errors.push('Quote time cannot be in the future.');
 if(q!==null&&post!==null){const dateET=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(post));if(dateET!==race.date)errors.push('Post date must match the card date in New York time.');}
 if(errors.length)return {record:null,errors};
 const ranked=rating.rankings.find(h=>h.name===horse.name),timing=now-q<=RULES.maxQuoteAgeSeconds*1000&&post-now>=RULES.minSecondsBeforePost*1000;
 return {errors:[],record:{schemaVersion:1,builder:BUILDER_ID,ruleId:RULES.id,recordedAt:new Date(now).toISOString(),now,cardId:card.id,sourceName:card.sourceName||'',card_date:race.date,track:race.track,race:race.race,surface:race.surface||null,horse:horse.name,program:String(horse.n),model:RULES.model,rawScore:ranked?.v44c_unrounded_score??null,rank:ranked?.v44c_rank??null,raceDecision:rating.decision,selectionFrozen:!!ranked,rankingSnapshot:rating.rankings.map(h=>({horse:h.name,program:String(h.n),rawScore:h.v44c_unrounded_score,rank:h.v44c_rank})),racePassReasons:rating.pass_reasons,finalFieldVerified:finalFieldVerified===true,surfaceVerified:surfaceVerified===true,stateVerification:'USER_ATTESTED_NOT_INDEPENDENTLY_VERIFIED',odds:String(odds).trim(),netOdds:parsed,quoteSource:'live-tote',quoteSourceId:sourceId.trim(),evidenceRef:evidenceRef.trim(),quoteTime:new Date(q).toISOString(),quoteEpochMs:q,postTime:new Date(post).toISOString(),postEpochMs:post,quoteTimingEligible:timing,quoteEvidenceVerified:false,untouchedStatus:'NOT_VERIFIED',calibrationId:null,probabilityCalibrated:false,confidenceVerified:false,winProbability:null,decision:'PASS',pass_reasons:['live-validation-pending','probability-calibration-unverified','confidence-unverified','quote-evidence-requires-review',...(!timing?['quote-outside-candidate-timing-window']:[])],budget,automatedStake:0}};
}
