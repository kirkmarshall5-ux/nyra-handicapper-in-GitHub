import {restoredPage as originalPage,parseRestoredCard as originalParse} from './data-corrected-parser.js?v=20261013-circuits2';
import {RELEASE_ID} from './rankings-release.js';
export const PARSER_ID='V44C-data-integrity-circuits-parser-v5-appendices';
export function restoredPage(items,pageNumber,fonts={}){
 const page=originalPage(items,pageNumber,fonts),rows=[];let row=[];const flush=()=>{if(row.length){rows.push(row);row=[]}};
 for(const a of items){if(a.str){if(row.length&&Math.abs(a.transform[5]-row.at(-1).transform[5])>3)flush();row.push(a)}if(a.hasEOL)flush()}flush();
 if(rows.length!==page.lines.length)return page;
 page.lines.forEach((line,i)=>{const r=rows[i];if(line.proofs.length!==1)return;const p=line.proofs[0];const anchor=r.find(a=>String(a.str).trim()===String(p.figure)&&/Bold/i.test(fonts[a.fontName]||a.fontName||'')),post=r.find(a=>new RegExp('^\\s*'+p.post+'\\s*/\\s*'+p.field_size+'(?:\\s|$)').test(a.str)),candidates=r.filter(a=>a.transform[4]>=245&&a.transform[4]<257&&/^\s*\d{1,2}(?:[^\d]|$)/.test(a.str));if(!anchor||!post||candidates.length!==1||anchor.transform[4]<205||anchor.transform[4]>220||post.transform[4]<220||post.transform[4]>225)return;
 const a=candidates[0],m=a.str.trim().match(/^(\d{1,2})(?:[^\d]|$)/),position=m?+m[1]:null;if(!position||position>p.field_size)return;p.running_call_proxy={position,field_size:p.field_size,token:a.str.split(/\s/)[0],page:pageNumber,x:a.transform[4],status:'PDF_COLUMN_POSITION_PROXY'};});return page;
}
export function selectPPPages(pages){
 const kept=[],excluded=[];let appendix=false;
 for(const page of pages){
  const text=page.lines.map(l=>l.text).join('\n');
  const footer=/(Sar|Aqu|Bel|BAQ|Med|CD|Kee|FL|FG|GP|RP|Dmr|SA|Tam|KD),\s*race\s+\d+,\s*page:/i.test(text);
  if(footer){if(appendix)throw new Error('Race PP found after analyst appendix on page '+page.pageNumber);kept.push(page);continue;}
  const clean=text.replace(/\s+/g,' ').trim();
  const analysis=/^ANALYSIS by [A-Za-z .'-]+ BEST BET:/i.test(clean)&&/First Race/.test(clean)&&/Second Race/.test(clean);
  const selections=/^SELECTIONS\b/.test(clean)&&/CONSENSUS/.test(clean)&&/Consensus Totals Based on/.test(clean);
  const hasRunner=/\bOwn:|\bLife\s+\d+|\bWORKS:|\bTRAINER:/.test(text);
  if(kept.length&&(analysis||selections)&&!hasRunner){appendix=true;excluded.push({page:page.pageNumber,kind:analysis?'analyst-analysis':'analyst-selections'});continue;}
  throw new Error('Race footer unverified on page '+page.pageNumber+'. Use the original text-based DRF PDF with race footers intact; edited, cropped or image-only pages cannot be verified.');
 }
 return {pages:kept,excluded};
}
export function parseRestoredCard(pages,options){
 const selection=selectPPPages(pages),c=originalParse(selection.pages,options);
 return {...c,id:`${RELEASE_ID}:${c.track}:${c.date}`,model_id:RELEASE_ID,parser_version:PARSER_ID,odds_source:'MORNING_LINE_ONLY',excluded_appendix_pages:selection.excluded,warnings:[...c.warnings,...(selection.excluded.length?['Verified trailing analyst appendices excluded from model inputs.']:[]),'Morning lines are reference prices; live quotes and current scratches require verification.']};
}
