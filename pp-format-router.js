import {parseRestoredCard,PARSER_ID} from './release-card-parser.js';
import {parseBrisnetCard,BRISNET_PARSER_ID} from './brisnet-card-parser.js?v=20261018-distance4';
import {parsePremiumCard,PREMIUM_PARSER_ID} from './brisnet-premium-parser.js?v=20261018-premium4';
export const FORMAT_ROUTER_ID='PP-FORMAT-ROUTER-v2';
export const SUPPORTED_PARSERS=Object.freeze([PARSER_ID,BRISNET_PARSER_ID,PREMIUM_PARSER_ID]);
export function detectPPFormat(pages){
 const text=pages.map(p=>p.items?p.items.map(i=>i.str||'').join(' '):(p.lines||[]).map(l=>l.text||'').join('\n')).join('\n');
 const bris=/Ultimate PP'?s/i.test(text)&&/BRISNET|Bloodstock Research|brisnet\.com/i.test(text);
 const premium=/Premium Plus PP'?s/i.test(text)&&/BRISNET|Bloodstock Research|brisnet\.com/i.test(text);
 const drf=/(?:Sar|Aqu|Bel|BAQ|Med|CD|Kee|FL|FG|GP|RP|Dmr|SA|Tam|KD),\s*race\s+\d+,\s*page:/i.test(text);
 if((bris&&premium)||((bris||premium)&&drf))throw Error('Mixed PP providers detected. Upload each source separately.');
 if(premium)return 'BRISNET_PREMIUM_PLUS';if(bris)return 'BRISNET_ULTIMATE';if(drf)return 'DRF';
 throw Error('PP format not recognized. Use a supported text-based DRF, Brisnet Ultimate or Premium Plus PDF. Other layouts and scanned PDFs need a source review and a tested adapter; the active card is preserved.');
}
// Fail closed with race-specific evidence instead of an untraceable generic identity error.
// No runner is added, renumbered, discarded or silently deduplicated here.
export function inspectRunnerIdentities(card){
 const issues=[];
 for(const [key,race] of Object.entries(card?.races||{})){
  const seenNumbers=new Set(),seenNames=new Set();
  for(const [index,horse] of (race?.horses||[]).entries()){
   const number=String(horse?.n??'').trim().toUpperCase();
   const name=String(horse?.name??'').trim().toLowerCase().replace(/\s+/g,' ');
   if(!number||!name)issues.push({race:key,index:index+1,reason:'MISSING_RUNNER_IDENTITY',number,name});
   if(number&&seenNumbers.has(number))issues.push({race:key,index:index+1,reason:'DUPLICATE_PROGRAM',number,name});
   if(name&&seenNames.has(name))issues.push({race:key,index:index+1,reason:'DUPLICATE_HORSE_NAME',number,name});
   seenNumbers.add(number);seenNames.add(name);
  }
 }
 return issues;
}
export function parsePPCard(pages,options){
 const format=detectPPFormat(pages),card=format==='DRF'?parseRestoredCard(pages,options):format==='BRISNET_PREMIUM_PLUS'?parsePremiumCard(pages,options):parseBrisnetCard(pages,options);
 const identityIssues=inspectRunnerIdentities(card);
 if(identityIssues.length){const first=identityIssues[0];throw Error('Runner identity verification failed: race '+first.race+', runner '+first.index+', '+first.reason+', program '+JSON.stringify(first.number)+', horse '+JSON.stringify(first.name)+'. Source card preserved.');}
 return {...card,source_format:format,format_router_version:FORMAT_ROUTER_ID};
}
