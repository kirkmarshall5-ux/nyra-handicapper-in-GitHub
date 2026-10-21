// Research-only full-field grading. Caller must first pass validateModelComparison.
import {validateModelComparison} from './research-model-comparison-gate.js';
export function gradeVerifiedRace(records){
 const gate=validateModelComparison(records);
 if(gate.status!=='ELIGIBLE_FOR_DESCRIPTIVE_GRADING')return {status:'HOLD',gate,results:[]};
 const results=records.map(r=>{
  const order=r.rankedRunnerIds,finish=r.officialFinishIds;
  const winner=finish[0],top4=order.slice(0,4),actual4=finish.slice(0,4);
  const rankError=finish.reduce((sum,id,actual)=>sum+Math.abs(order.indexOf(id)-actual),0)/finish.length;
  return {model:r.model,snapshotId:r.snapshotId,firstChoiceWon:order[0]===winner,winnerInTopFour:top4.includes(winner),orderedFirstTwo:order.length>=2&&finish.length>=2&&order[0]===finish[0]&&order[1]===finish[1],topFourSetCorrect:top4.length===4&&actual4.length===4&&top4.every(id=>actual4.includes(id)),topFourExactOrder:top4.length===4&&actual4.length===4&&top4.every((id,i)=>id===actual4[i]),meanAbsoluteRankError:rankError,pass:r.pass===true,financialGrading:'NOT_PERFORMED'};
 });
 return {status:'GRADED_DESCRIPTIVE_ONLY',provider:gate.provider,raceKey:gate.raceKey,results,gate,bettingChanged:false};
}
