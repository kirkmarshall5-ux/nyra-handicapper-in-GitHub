// Research-only inventory: report missing evidence without fabricating grades.
import {gradeVerifiedDrfRace} from './drf-research-evidence-gate.mjs';
export function inventoryDrfRaces(records){
 if(!Array.isArray(records))throw Error('Expected array of DRF race records');
 const keys=new Set();
 return records.map((record,index)=>{
  const key=[record?.card?.track,record?.card?.date,record?.race].join('|');
  if(keys.has(key))return {index,key,status:'BLOCKED',reason:'Duplicate track/date/race'};
  keys.add(key);
  try{
   const grade=gradeVerifiedDrfRace(record);
   return {index,key,status:'GRADEABLE',grade};
  }catch(error){
   return {index,key,status:'BLOCKED',reason:error.message};
  }
 });
}
