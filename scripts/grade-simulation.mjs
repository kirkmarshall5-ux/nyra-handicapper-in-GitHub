import {readFileSync} from 'node:fs';
import {gradeDataset} from './simulation-validator.js';
const [file,split='holdout']=process.argv.slice(2);
if(!file||!['holdout','development'].includes(split)){
 console.error('Usage: node scripts/grade-simulation.mjs <records.json> [holdout|development]');
 process.exitCode=2;
}else{
 try{
  const records=JSON.parse(readFileSync(file,'utf8'));
  console.log(JSON.stringify(gradeDataset(records,{split}),null,2));
 }catch(error){console.error('Validation failed:',error.message);process.exitCode=1}
}
