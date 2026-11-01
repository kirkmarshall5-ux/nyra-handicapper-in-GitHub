import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {parsePPCard} from '../pp-format-router.js';
import {rankBrisnetModels} from '../brisnet-models.js';
import {shadowRankings,CANDIDATE_ID} from './brisnet-neutral-best3-peak.mjs';
if(!process.argv[2]||!process.argv[3])throw Error('Usage: node research/evaluate-neutral-best3-peak.mjs PRIVATE_SOURCE_DIRECTORY OUTPUT_JSON');
const root=process.argv[2].replace(/\/$/,'')+'/';
const results={
 Belmont:{1:[[7,1,3,6],13.32,24.17,118.49,[]],2:[[1,4,8,5],10.08,86.79,295.46,[]],3:[[4,2,8,1],8.86,83.93,176.60,[]],4:[[3,8,4,5],9.02,26.54,67,[]],5:[[8,1,3,6],5.46,17.17,32.57,[]],6:[[4,7,1,9],13.86,89.11,225.58,[]],7:[[2,4,9,10],6.86,31.77,122.28,[8]],8:[[3,10,5,7],3.72,8.56,22.73,[1,4,6,9,11]],9:[[1,4,7,5],3.70,44.08,61.22,[6,8]],10:[[3,2,1,4],3.82,9.39,39.07,[7]],11:[[11,9,7,5],10.54,34.12,158.42,[]]},
 Keeneland:{1:[[5,2,4,7],4.88,11.81,36.40,[1,10]],2:[[9,6,8,4],6.28,15.40,23.44,[5]],3:[[10,1,6,11],20.08,37.48,234.80,[3,4,5]],4:[[2,5,11,12],4.14,25.85,81.36,[3,13]],5:[[3,10,13,5],6.36,37.27,352.53,[15,16,17,18]],6:[[1,10,3,8],4.02,16.19,50.67,[9]]}
};
const perm=a=>a.flatMap(x=>a.filter(y=>y!==x).flatMap(y=>a.filter(z=>z!==x&&z!==y).map(z=>[x,y,z])));
function evaluate(m,result){
 const p=m.rankings.map(h=>Number(h.n)),[a,w,e,t,s]=result;
 const tickets=p.length?[['win',[p[0]],4]]:[];
 if(p.length>=2)tickets.push(['exacta',p.slice(0,2),2],['exacta',p.slice(0,2).reverse(),2]);
 if(p.length>=3)tickets.push(...perm(p.slice(0,3)).map(ns=>['trifecta',ns,.5]));
 let risk=0,returned=0,refund=0;const hits=[],byType={win:{risk:0,returned:0},exacta:{risk:0,returned:0},trifecta:{risk:0,returned:0}};
 for(const [type,ns,cost] of tickets){if(ns.some(n=>s.includes(n))){refund+=cost;continue;}risk+=cost;byType[type].risk+=cost;
 const n=ns.length,pay=ns.join('|')===a.slice(0,n).join('|')?(n===1?w*2:n===2?e*2:t):0;
 returned+=pay;byType[type].returned+=pay;if(pay)hits.push({type,pay});
 }
 return {picks:p.slice(0,4),winner:p[0]===a[0],exact:a.map((n,i)=>p[i]===n),coverage:a.map(n=>p.slice(0,4).includes(n)),all4:a.every(n=>p.slice(0,4).includes(n)),risk,returned,refund,hits,byType};
}
const report={candidate:CANDIDATE_ID,classification:'RETROSPECTIVE_KNOWN_OUTCOMES_NOT_HOLDOUT',production_changed:false,weights_redistributed:false,field_policy:'frozen eligible fields; no scratch promotion; refunds for affected combinations',sources:{},rows:[]};
for(const [track,pdfname,freeze] of [['Belmont','bel1031p.pdf','NYRA_FREEZE_2026-10-31_2026-10-31T15-07-31-818Z.json'],['Keeneland','kee1031p.pdf','NYRA_FREEZE_2026-10-31_2026-10-31T15-14-29-229Z.json']]){
 const bytes=fs.readFileSync(root+pdfname),fb=fs.readFileSync(root+freeze),f=JSON.parse(fb);
 report.sources[track]={pdf_sha256:crypto.createHash('sha256').update(bytes).digest('hex'),freeze_sha256:crypto.createHash('sha256').update(fb).digest('hex'),freeze_time:f.captured_at_utc,result_source:track==='Belmont'?'BEL103126USA.pdf official chart':'uploaded IMG_0193.jpeg through IMG_0198.jpeg screenshots, R1-R6 only'};
 const doc=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true,disableFontFace:true}).promise,pages=[];
 for(let n=1;n<=doc.numPages;n++){const pg=await doc.getPage(n),c=await pg.getTextContent({disableNormalization:true});pages.push({pageNumber:n,items:c.items});}
 const card=parsePPCard(pages);
 for(const fr of f.races){if(!results[track][fr.race])continue;const r=structuredClone(card.races[fr.race]),field=new Set(fr.dashboard.field.map(h=>String(h.n)));
 for(const h of r.horses)if(!field.has(String(h.n)))h.odds='SCR';
 const base=rankBrisnetModels(r).contender,frozen=fr.dashboard.models.find(m=>m.id==='brisContender');
 assert.deepEqual(base.rankings.map(h=>String(h.n)),frozen.rankings.map(h=>String(h.n)),track+' R'+fr.race+' frozen rank parity');
 for(const h of base.rankings){const fh=frozen.rankings.find(x=>String(x.n)===String(h.n));assert.ok(Math.abs(h.score-fh.score)<1e-10,'frozen score parity');}
 const before=JSON.stringify(r),candidate=shadowRankings(base);assert.equal(JSON.stringify(r),before);
 report.rows.push({track,date:f.card_date,race:fr.race,complete:frozen.complete,ranked:frozen.ranked,eligible:frozen.eligible,actual:results[track][fr.race][0],baseline:evaluate(base,results[track][fr.race]),candidate:evaluate(candidate,results[track][fr.race])});
 }
}
fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2));console.log('reproduced',report.rows.length,'frozen rankings and scores');
