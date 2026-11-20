// Replay original Equibase chart bytes through the browser's parser without modifying models.
// Usage: node scripts/check-equibase-results.mjs /path/to/chart.pdf [...]
import {readFile} from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {parseEquibaseResults} from '../equibase-results-parser.js';
if(!process.argv[2])throw Error('Supply original text-based Equibase chart PDFs.');
for(const path of process.argv.slice(2)){
 const pdf=await getDocument({data:new Uint8Array(await readFile(path)),useSystemFonts:true}).promise,pages=[];
 try{
  for(let n=1;n<=pdf.numPages;n++)pages.push({pageNumber:n,items:(await(await pdf.getPage(n)).getTextContent()).items});
  const parsed=parseEquibaseResults(pages,{sourceRef:path});
  console.log(JSON.stringify({source:path,parserVersion:parsed.parserVersion,races:parsed.races.map(r=>({race:r.race,finish:r.finish,field:r.field,surface:r.surface,distance:r.distanceFurlongs,win2:r.win2,place2:r.place2,exactaBase:r.exactaBase,exactaPay:r.exactaPay})),pending:parsed.pending},null,2));
 }finally{await pdf.destroy();}
}
