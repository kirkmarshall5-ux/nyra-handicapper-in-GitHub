// Research-only Prime Power disagreement diagnostic.
// Keep score scales separate; never blend raw Prime Power points with model scores.
const num=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
export function primePowerGapDiagnostic({modelRankings,primeRankings,nearTieThreshold=0.05}={}){
 const model=Array.isArray(modelRankings)?modelRankings:[],prime=Array.isArray(primeRankings)?primeRankings:[];
 if(!Number.isFinite(nearTieThreshold)||nearTieThreshold<0||nearTieThreshold>1)throw Error('nearTieThreshold must be between 0 and 1');
 const m=model.map((x,i)=>({id:String(x.program??x.n??''),score:num(x.score),rank:i+1}));
 const p=prime.map((x,i)=>({id:String(x.program??x.n??''),score:num(x.primePower??x.score),rank:i+1}));
 const gap=(arr)=>{
  if(arr.length<2||arr.some(x=>!x.id||x.score===null))return {status:'MISSING_SCORES',absolute:null,normalized:null,nearTie:null};
  const vals=arr.map(x=>x.score),span=Math.max(...vals)-Math.min(...vals);
  if(span<=0)return {status:'ALL_EQUAL',absolute:0,normalized:0,nearTie:true};
  const absolute=Math.abs(arr[0].score-arr[1].score);
  return {status:'COMPARABLE_WITHIN_OWN_SCALE',absolute,normalized:absolute/span,nearTie:absolute/span<=nearTieThreshold};
 };
 const mg=gap(m),pg=gap(p);
 const pById=new Map(p.map(x=>[x.id,x]));
 const modelTop=m.slice(0,2).map(x=>x.id),primeTop=p.slice(0,2).map(x=>x.id);
 const outsidePrime=primeTop.filter(id=>!modelTop.includes(id));
 return {research_only:true,scoring_applied:false,nearTieThreshold,modelGap:mg,primePowerGap:pg,
  modelTopTwo:modelTop,primePowerTopTwo:primeTop,
  topTwoSetAgrees:modelTop.length===2&&primeTop.length===2&&modelTop.every(id=>primeTop.includes(id)),
  topTwoOrderAgrees:modelTop.length===2&&primeTop.length===2&&modelTop.every((id,i)=>primeTop[i]===id),
  primePowerOutsideModelTopTwo:outsidePrime,
  modelRunnerUpPrimeRank:pById.get(modelTop[1])?.rank??null,
  reviewPriority:mg.nearTie===true&&outsidePrime.length?'NEAR_TIE_WITH_OUTSIDE_CHALLENGER':
   mg.nearTie===true?'MODEL_NEAR_TIE':outsidePrime.length?'OUTSIDE_CHALLENGER':'NO_TOP_TWO_CHALLENGER',
  caution:'Normalized gap uses each ranking\'s own within-field range; thresholds require retrospective calibration. No betting action.'};
}
