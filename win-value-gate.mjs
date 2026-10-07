// Offline research candidate. This file does not enable website recommendations.
export const RULES = Object.freeze({id:'V44C-win-value-candidate-v1',model:'V4.4c-restored-verified-rules-v1',stake:2,highEdge:0.20,mediumEdge:0.30,maxQuoteAgeSeconds:60,minSecondsBeforePost:60,dailyStakeCap:30,bankrollFloor:240,startingBankroll:300,liveApproved:false});
export function parseOdds(v){
 if(typeof v==='number')return Number.isFinite(v)&&v>=0?v:null;
 if(typeof v!=='string')return null;
 const s=v.trim(),m=s.match(/^(\d+(?:\.\d+)?)\s*[-/]\s*(\d+(?:\.\d+)?)$/);
 if(m){const a=+m[1],b=+m[2],o=a/b;return Number.isFinite(a)&&Number.isFinite(b)&&b>0&&Number.isFinite(o)?o:null;}
 const n=+s;return /^\d+(?:\.\d+)?$/.test(s)&&Number.isFinite(n)?n:null;
}
export function decideWin(x,{mode='live'}={}){
 const reasons=[],finite=v=>typeof v==='number'&&Number.isFinite(v);
 if(!['live','paper'].includes(mode))reasons.push('invalid-mode');
 if(mode==='live'&&!RULES.liveApproved)reasons.push('live-validation-pending');
 if(x.model!==RULES.model)reasons.push('model-not-locked-v44c');
 if(x.raceDecision!=='RATEABLE')reasons.push('race-not-rateable');
 if(x.rank!==1||!finite(x.rawScore))reasons.push('not-verified-top1');
 if(x.finalFieldVerified!==true||x.surfaceVerified!==true||x.selectionFrozen!==true)reasons.push('race-state-unverified');
 if(x.scratched!==false||x.cancelled!==false||x.unconfirmedConditional!==false)reasons.push('runner-not-confirmed');
 if(x.probabilityCalibrated!==true||typeof x.calibrationId!=='string'||!x.calibrationId.trim()||x.calibrationOutOfSample!==true)reasons.push('probability-calibration-unverified');
 if(x.confidenceVerified!==true||!['High','Medium'].includes(x.confidence))reasons.push('confidence-unverified-or-low');
 const p=x.winProbability,o=parseOdds(x.odds);
 if(!finite(p)||p<=0||p>=1)reasons.push('invalid-win-probability');
 if(o===null)reasons.push('invalid-odds');
 if(x.quoteSource!=='live-tote'||typeof x.quoteSourceId!=='string'||!x.quoteSourceId.trim())reasons.push('not-verifiable-live-quote');
 if(!finite(x.now)||!finite(x.quoteTime)||x.quoteTime>x.now||x.now-x.quoteTime>RULES.maxQuoteAgeSeconds*1000)reasons.push('stale-or-invalid-quote');
 if(!finite(x.postTime)||!finite(x.now)||x.postTime-x.now<RULES.minSecondsBeforePost*1000)reasons.push('too-close-to-post');
 if(!finite(x.bankroll)||x.bankroll-RULES.stake<RULES.bankrollFloor)reasons.push('bankroll-floor');
 if(!finite(x.dailyStaked)||x.dailyStaked<0||x.dailyStaked+RULES.stake>RULES.dailyStakeCap)reasons.push('daily-exposure-cap');
 if(x.outstandingBets!==0||x.alreadyBet!==false)reasons.push('unsettled-or-duplicate-bet');
 const required=x.confidence==='High'?RULES.highEdge:RULES.mediumEdge;
 const edge=finite(p)&&p>0&&p<1&&o!==null?p*(o+1)-1:null;
 if(edge===null||edge+1e-12<required)reasons.push('insufficient-price-edge');
 return {decision:reasons.length?'PASS':'PAPER_BET',stake:reasons.length?0:RULES.stake,edge,requiredEdge:required,reasons};
}
