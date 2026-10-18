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
export function parsePPCard(pages,options){
 const format=detectPPFormat(pages),card=format==='DRF'?parseRestoredCard(pages,options):format==='BRISNET_PREMIUM_PLUS'?parsePremiumCard(pages,options):parseBrisnetCard(pages,options);
 return {...card,source_format:format,format_router_version:FORMAT_ROUTER_ID};
}
