import {reconcileChartStarters} from './historical-chart-reconcile.js';
import {parseEquibaseResults,matchEquibaseResults} from './equibase-results-parser.js';
import {HISTORICAL_SCHEMA,STRATEGIES,historicalSnapshot,importHistoricalSnapshot,immutableHistoricalSnapshot,evaluateHistoricalCard} from './historical-results.js';
import {buildRaceDashboard} from './race-day-dashboard.js?v=20261115-beyer';
import {parsePPCard} from './pp-format-router.js?v=20261115-beyer';
import {restoredPage} from './release-card-parser.js?v=20261115-beyer';
import {cardProvider,matchingCard,pairedRace} from './dual-pp-cards.js';
import {correctRaceConditions} from './manual-race-conditions.js';
const STORE='nyraHistoricalResultsV1';
export const escapeHistorical=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e=escapeHistorical;
const money=n=>'$'+Number(n||0).toFixed(2);
const roi=n=>n===null?'—':(n>=0?'+':'')+n.toFixed(2)+'%';
const order=s=>String(s).trim().split(/[\s,>]+/).filter(Boolean);
export function historicalReportHtml(snapshot,evaluation,strategyId){
 const strategy=STRATEGIES[strategyId],summaries=evaluation.summary;
 const table=(heads,rows)=>'<div style="overflow:auto"><table><thead><tr>'+heads.map(h=>'<th>'+e(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(c=>'<td>'+e(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
 const overall=table(['Model','Eligible races','Winning bets / bets','Stake','Returned','Profit/loss','ROI','Winners','Winner top 4','Ordered top 2','Companion hit when #1 wins','Reverse top 2','Runner-up at #2','Runner-up top 2','Runner-up top 4','Exacta wager hits'],summaries.map(s=>[s.label,s.races,s.winning+'/'+s.bets,money(s.stake),money(s.returned),money(s.net),roi(s.roi),s.winners+'/'+s.races,s.winnerTopFour+'/'+s.races,s.orderedTopTwo+'/'+s.races,s.orderedTopTwo+'/'+s.winners+' ('+roi(s.companionWhenWinner)+')',s.reverseTopTwo+'/'+s.races,s.exactSecond+'/'+s.races,s.runnerUpTopTwo+'/'+s.races,s.runnerUpTopFour+'/'+s.races,s.exactaHits+'/'+s.races]));
 const recovery=table(['RR evidence group','Races','Stake','Return','ROI'],(evaluation.rrRecoverySummary||[]).map(s=>[s.status,s.races,money(s.stake),money(s.returned),roi(s.roi)]));
 const wagers=table(['Model','Wager','Winning / bets','Hit rate','Stake','Return','Net','ROI'],summaries.flatMap(s=>Object.entries(s.byWager).filter(([,w])=>w.bets).map(([type,w])=>[s.label,({win:'Win',place:'Place',exacta12:'Exacta 1–2',exacta21:'Exacta 2–1'})[type],w.winning+'/'+w.bets,roi(w.hitRate),money(w.stake),money(w.returned),money(w.net),roi(w.roi)])));
 const details=table(['Race','Model','Actual 1–2','Selected 1–2','Winner at #1','Actual runner-up rank','Top-two exacta coverage','Status / reason'],evaluation.rows.map(r=>[r.race,r.label,'#'+r.actualWinner+' → #'+r.actualSecond,'#'+r.chosenFirst+' → #'+r.chosenSecond,r.firstChoiceWinner?'Yes':'No',r.runnerUpRank??'Unranked',r.included?(r.exactaHit?'Yes':'No'):'—',r.included?'Included':(r.reason+' '+(r.eligibility.unrated||[]).map(h=>'#'+h.n+' '+h.name+': '+h.reasons.join('; ')).join(' '))]));
 const research=evaluation.research||[];
 const passReport=table(['Race','Eligible models','Excluded models and reasons','Pending result'],research.map(r=>[r.race,r.eligibleModels.join(', ')||'—',r.excludedModels.map(m=>m.label+': '+m.reason+(m.ftsUnranked?.length?' (unranked FTS #'+m.ftsUnranked.join(', #')+')':'')).join(' · ')||'—',r.pending||'—']));
 const ftsReport=table(['Race','FTS count','FTS research and outcome'],research.filter(r=>r.ftsCount===null||r.ftsCount>0).map(r=>[r.race,r.ftsCount??'Not recorded',r.fts===null?'Legacy snapshot: FTS evidence unavailable':r.fts.map(h=>'#'+h.n+' '+h.name+' — '+(h.finish===1?'Winner':h.finish===2?'Second':r.pending?'Pending':'Not top two')+' · '+JSON.stringify(h.research)).join(' · ')]));
 const misses=evaluation.rows.filter(r=>r.rrCompanionMiss);
 const companions=table(['Race','Actual runner-up','RR companion','Runner-up rank in each model'],misses.map(r=>[r.race,'#'+r.actualSecond,'#'+r.chosenSecond,evaluation.rows.filter(x=>x.race===r.race).map(x=>x.label+': '+(x.runnerUpRank??'unranked')).join(' · ')]));
 return '<h2>'+e(snapshot.track)+' · '+e(snapshot.date)+' — Historical Results</h2><p><b>Retrospective model test.</b> '+e(snapshot.notice)+' Snapshot: '+e(snapshot.capturedAt)+'.</p><p>'+e(strategy.label)+'. Each exacta direction costs $1. Official results are imported from Equibase charts after automatic identity, field and payout checks; any manual corrections are identified in the chart references. Counts use each model’s own eligible races; compare denominators before judging models. Validation pending alone does not exclude a complete field.</p><h3>Model results</h3>'+overall+'<h3>PASS and eligibility by model</h3>'+passReport+'<h3>First-time starter research (separate from ROI)</h3>'+ftsReport+'<h3>RR recovery cohorts</h3>'+recovery+'<h3>Returns by wager</h3>'+wagers+'<h3>Runner-up detail and exclusions</h3>'+details+'<h3>RR found the winner, missed the companion</h3>'+companions+(misses.length?'':'<p>No such cases among the results entered.</p>')+'<h3>Pending races — no stake or return counted</h3><ul>'+evaluation.pending.map(p=>'<li>Race '+e(p.race)+': '+e(p.reason)+'</li>').join('')+'</ul><h3>Recorded model versions</h3><p>'+e([...new Set(snapshot.races.flatMap(r=>r.models.map(m=>(m.label||m.id)+': '+(m.model_id||'not recorded'))))].join(' · '))+'</p><h3>Official chart references</h3><p>'+e([...new Set(evaluation.rows.map(r=>'Race '+r.race+': '+r.sourceRef+' · '+(r.resultVerification==='AUTOMATIC_EQUIBASE_CHART'?'automatically checked':'manually confirmed')+(r.resultRecordedAt?' · '+r.resultRecordedAt:'')))].join(' · '))+'</p><h3>PP sources</h3><p>'+e(JSON.stringify(snapshot.sources||[]))+'</p>';
}
async function pdfPages(file,progress){
 const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
 const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise,pages=[];
 try{
  for(let p=1;p<=pdf.numPages;p++){
   progress('Reading page '+p+' of '+pdf.numPages);
   const page=await pdf.getPage(p),content=await page.getTextContent({disableNormalization:true});
   await page.getOperatorList();
   const fonts=Object.fromEntries(Object.keys(content.styles).map(k=>[k,page.commonObjs.get(k)?.name||'']));
   pages.push({...restoredPage(content.items,p,fonts),items:content.items});
  }
 }finally{await pdf.destroy();}
 return pages;
}
export function historicalStarterSelection(cards,selected,number,programs){
 const anchor=cards[selected],race=anchor?.races?.[number],chosen=new Set(programs.map(String));
 if(!race||chosen.size!==programs.length||programs.some(p=>!race.horses.some(h=>String(h.n)===String(p))))throw Error('Actual starters must match unique PP program numbers.');
 const roster=race.horses.filter(h=>chosen.has(String(h.n)));
 if(roster.length!==chosen.size)throw Error('Duplicate PP starter identity.');
 const next=structuredClone(cards);
 for(const card of Object.values(next)){
  if(!matchingCard(anchor,card)||!card.races[number])continue;
  const verified=reconcileChartStarters(card.races[number].horses,roster);
  if(!verified.ok)throw Error('Historical source starter mismatch: '+verified.reason);
  for(const h of card.races[number].horses){
   const runs=chosen.has(String(h.n));
   h.included_in_frozen_field=runs;
   if(runs){if(h.entry_status&&h.entry_status!=='REGULAR')h.original_entry_status=h.original_entry_status||h.entry_status;if(h.odds==='SCR')h.odds=h.ml||'';h.entry_status='REGULAR';}
   else h.odds='SCR';
  }
 }
 return next;
}
function download(value,filename){
 const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function initHistoricalResults(root){
 let cards={},selected=null,snapshot=null,officials={},revisions=[],strategyId='WIN_PLACE_EXACTA',resultText='',sourceRef='',records=[],busy=false,storageReadable=true;
 let chartPending=[];
 const el=id=>root.querySelector('#'+id);
 const status=text=>{el('historicalStatus').textContent=text;};
 root.innerHTML='<div class="grid"><div class="card span12"><div class="kicker">Historical research</div><h2>Historical Results</h2><p>Run old PPs through the current models, preserve their rankings, then compare with official results. This workspace is separate from Race Day. Historical returns are retrospective paper tests.</p><div class="flex" style="flex-wrap:wrap;gap:10px"><button type="button" id="historicalNew">New test</button><label>Saved tests<select id="historicalSaved"><option value="">Choose a saved test</option></select></label><button type="button" id="historicalOpen">Open saved test</button><button type="button" id="historicalImport">Import freeze / backup JSON</button><input id="historicalJson" type="file" accept=".json,application/json" hidden></div><p id="historicalStatus" role="status" aria-live="polite"></p></div><div class="card span12" id="historicalPrep"><h3>1. Load historical PPs and reconcile the field</h3><p>Upload each matching source separately. After uploading a PP, upload the matching Equibase full-chart PDF. Verified official starters and conditions will automatically reconcile the field, save rankings, and calculate returns. Races with unreadable or nonstandard chart details remain pending. The PP files and Race Day session remain unchanged.</p><div class="flex" style="flex-wrap:wrap;gap:10px"><button type="button" id="historicalBrisnet">Upload Brisnet PP</button><button type="button" id="historicalDrf">Upload DRF PP</button><button type="button" id="historicalChartBefore">Upload matching Equibase results PDF</button><input id="historicalPpFile" type="file" accept=".pdf,application/pdf" hidden></div><p id="historicalCard"></p><div id="historicalFields"></div><label><input id="historicalFieldVerified" type="checkbox"> I checked starters, scratches and actual conditions for all races against the official card.</label><p><button type="button" class="primary" id="historicalCapture">Save retrospective rankings</button></p></div><div class="card span12" id="historicalSettlement" hidden><h3>2. Add official results</h3><p id="historicalIdentity"></p><p>Upload the Equibase full-chart results PDF to fill finish order and payouts for every matching race and calculate the recap automatically. No routine typing or confirmation is needed. Unreadable, mismatched or nonstandard races stay pending with the reason shown.</p><div class="flex" style="flex-wrap:wrap;gap:10px"><button type="button" id="historicalResultPdf">Import Equibase results PDF</button><input id="historicalResultFile" type="file" accept=".pdf,application/pdf" hidden><label>Race<select id="historicalRace"></select></label><label>Betting strategy<select id="historicalStrategy">'+Object.entries(STRATEGIES).map(([id,s])=>'<option value="'+id+'">'+e(s.label)+'</option>').join('')+'</select></label></div><details><summary>Imported chart text</summary><pre id="historicalPdfText" style="white-space:pre-wrap;max-height:400px;overflow:auto"></pre></details><details id="historicalCorrections"><summary>Optional: inspect or correct one race</summary><div id="historicalOfficialForm"></div><p><button type="button" id="historicalSettle">Save manual correction</button></p></details></div><div class="card span12" id="historicalOutput" hidden><h3>3. Compare and save</h3><div class="flex" style="flex-wrap:wrap;gap:10px"><button type="button" id="historicalBackup">Export test backup JSON</button><button type="button" id="historicalPdf">Print / Save PDF</button></div><p>Save a backup to Files. Browser storage is local to this device and can be cleared. Results corrections retain the earlier saved result in the backup.</p><div id="historicalReport"></div></div></div>';
 function refreshSaved(){
  el('historicalSaved').innerHTML='<option value="">Choose a saved test</option>'+records.map(r=>'<option value="'+e(r.id)+'">'+e(r.snapshot.track+' · '+r.snapshot.date+' · '+r.snapshot.capturedAt)+'</option>').join('');
 }
 try{records=JSON.parse(localStorage.getItem(STORE)||'[]');if(!Array.isArray(records))throw Error('Invalid saved records');refreshSaved();}
 catch(err){records=[];storageReadable=false;status('Saved tests could not be read: '+err.message+'. Use an exported backup.');}
 const session=()=>({schema:'nyra-historical-backup-v1',id:snapshot?.capturedAt+'|'+snapshot?.track+'|'+snapshot?.date,snapshot,officials,revisions,strategyId,resultSource:sourceRef,savedAt:new Date().toISOString()});
 function save(){
  if(!storageReadable){status('Saved history could not be read and will not be overwritten. Export this test backup to Files.');return false;}
  const next=session(),existing=records.find(r=>r.id===next.id);
  if(existing&&JSON.stringify(existing.snapshot)!==JSON.stringify(snapshot))throw Error('Snapshot identity already exists with different rankings. Start a new test; the saved snapshot was preserved.');
  const merged=[...records.filter(r=>r.id!==next.id),structuredClone(next)];
  try{localStorage.setItem(STORE,JSON.stringify(merged));records=merged;refreshSaved();return true;}
  catch(err){status('Test remains open, but device storage could not save it: '+err.message+'. Export the JSON backup now.');return false;}
 }
 function renderPrep(){
  el('historicalFields').innerHTML='';const card=cards[selected];
  if(!card){el('historicalCard').textContent='No historical PPs loaded.';return;}
  el('historicalCard').textContent=card.track+' · '+card.date+' · Sources: '+Object.keys(cards).join(', ');
  el('historicalFields').innerHTML=Object.values(card.races).map(r=>'<fieldset data-race="'+e(r.race)+'" style="margin:12px 0"><legend>Race '+e(r.race)+' · '+e(r.surface)+' · '+e(r.dist)+'</legend><label>Actual surface<select data-surface>'+['Dirt','Turf','Synth'].map(s=>'<option'+(s===r.surface?' selected':'')+'>'+s+'</option>').join('')+'</select></label> <label>Distance in furlongs (fill only to change)<input data-distance type="number" min="2" max="32" step="any" inputmode="decimal" value="'+e(r.distance_furlongs??'')+'"></label><div style="display:flex;flex-wrap:wrap;gap:12px;margin:10px 0">'+r.horses.map(h=>'<label><input type="checkbox" data-run="'+e(h.n)+'"'+(h.odds!=='SCR'&&h.included_in_frozen_field!==false&&(!h.entry_status||h.entry_status==='REGULAR')?' checked':'')+'> Runs #'+e(h.n)+' '+e(h.name)+(h.entry_status&&h.entry_status!=='REGULAR'?' ('+e(h.entry_status)+')':'')+'</label>').join('')+'</div></fieldset>').join('');
  el('historicalFieldVerified').checked=false;
 }
 function applyFields(){
  const next=structuredClone(cards),anchor=next[selected];
  for(const fs of el('historicalFields').querySelectorAll('fieldset')){
   const number=fs.dataset.race,r=anchor.races[number],surface=fs.querySelector('[data-surface]').value,distance=fs.querySelector('[data-distance]').value;
   const programs=[...fs.querySelectorAll('[data-run]:checked')].map(i=>i.dataset.run);
   const reconciled=historicalStarterSelection(next,selected,number,programs);
   for(const [p,card]of Object.entries(reconciled))next[p]=card;
   if(surface!==r.surface||distance!==''&&Number(distance)!==r.distance_furlongs){
    if(!distance)throw Error('Race '+number+': enter furlongs when changing surface.');
    const updated=correctRaceConditions(next,selected,number,{surface,furlongs:distance});
    for(const [p,card]of Object.entries(updated))next[p]=card;
   }
  }
  return next;
 }
 function renderReport(){
  if(!snapshot)return;
  el('historicalReport').innerHTML=historicalReportHtml(snapshot,evaluateHistoricalCard(snapshot,officials,strategyId),strategyId);
 }
 function renderOfficial(){
  const r=snapshot?.races.find(r=>String(r.race.number)===el('historicalRace').value);if(!r)return;
  const o=officials[String(r.race.number)];
  el('historicalOfficialForm').innerHTML='<p><b>'+e(r.race.track)+' · '+e(r.race.date)+' · Race '+e(r.race.number)+' · '+e(r.race.surface)+' · '+e(r.race.distance)+'</b></p><label>Official track name<input id="historicalOfficialTrack" value="'+e(o?.track||r.race.track)+'"></label><label>Official card date<input id="historicalOfficialDate" type="date" value="'+e(o?.date||r.race.date)+'"></label><label>Chart filename / source reference<input id="historicalSourceRef" value="'+e(o?.sourceRef||sourceRef)+'"></label><label>Official starter roster — one program | horse name per line<textarea id="historicalRoster" rows="6">'+e((o?.field||r.field).map(h=>h.n+' | '+h.name).join('\n'))+'</textarea></label><label>Complete official finishing order — program numbers, first to last<input id="historicalFinish" placeholder="Example: 3, 7, 2, 1, 4" value="'+e(o?.finish?.join(', ')||'')+'"></label><div style="display:flex;gap:12px;flex-wrap:wrap">'+[['historicalWin','Winner: $2 win payout',o?.win2],['historicalPlaceFirst','Winner: $2 place payout',o?.place2?.[o?.finish?.[0]]],['historicalPlaceSecond','Runner-up: $2 place payout',o?.place2?.[o?.finish?.[1]]],['historicalExactaPay','Official exacta payout',o?.exactaPay],['historicalExactaBase','Exacta payout denomination ($)',o?.exactaBase]].map(([id,label,value])=>'<label>'+label+'<input id="'+id+'" type="number" min="0.01" step="0.01" inputmode="decimal" value="'+e(value??'')+'"></label>').join('')+'</div><p><label><input id="historicalNonstandard" type="checkbox"'+(o?.nonstandard?' checked':'')+'> Dead heat, coupled entry, refund or other nonstandard settlement (hold for review)</label></p><label><input id="historicalOfficialVerified" type="checkbox"> I verified the official race identity, conditions, starters, finish order and payout denominations against the chart.</label>';
 }
 function openSnapshot(next,results={},history=[],strategy='WIN_PLACE_EXACTA'){
  snapshot=immutableHistoricalSnapshot(importHistoricalSnapshot(next));officials=structuredClone(results);revisions=structuredClone(history);strategyId=STRATEGIES[strategy]?strategy:'WIN_PLACE_EXACTA';
  el('historicalPrep').hidden=true;el('historicalSettlement').hidden=false;el('historicalOutput').hidden=false;
  el('historicalIdentity').textContent=snapshot.track+' · '+snapshot.date+' · Rankings saved '+snapshot.capturedAt+' · Retrospective';
  el('historicalRace').innerHTML=snapshot.races.map(r=>'<option value="'+e(r.race.number)+'">Race '+e(r.race.number)+'</option>').join('');
  el('historicalStrategy').value=strategyId;renderOfficial();renderReport();
 }
 async function busyRun(fn){
  if(busy)return;busy=true;root.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{await fn();}catch(err){status(err.message||String(err));}
  finally{busy=false;root.querySelectorAll('button').forEach(b=>b.disabled=false);}
 }
 el('historicalNew').onclick=()=>{
  cards={};selected=null;snapshot=null;officials={};revisions=[];resultText='';sourceRef='';chartPending=[];
  el('historicalPrep').hidden=false;el('historicalSettlement').hidden=true;el('historicalOutput').hidden=true;el('historicalPdfText').textContent='';renderPrep();status('New retrospective test. Previously saved tests are retained.');
 };
 for(const p of ['Brisnet','Drf'])el('historical'+p).onclick=()=>{el('historicalPpFile').dataset.provider=p==='Brisnet'?'BRISNET':'DRF';el('historicalPpFile').click();};
 el('historicalPpFile').onchange=event=>{
  const file=event.target.files[0],expected=event.target.dataset.provider;event.target.value='';if(!file)return;
  busyRun(async()=>{
   if(snapshot)throw Error('A historical snapshot is already open. Tap New test before importing another PP, so previously saved rankings and results cannot be overwritten.');
   const pages=await pdfPages(file,status),card=parsePPCard(pages,{sourceName:file.name}),provider=cardProvider(card);
   if(provider!==expected)throw Error('Use the matching '+provider+' upload button.');
   if(Object.values(cards).some(c=>!matchingCard(c,card)))throw Error('This source belongs to another track or date. Start a new test first.');
   card.source_sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join('');
   cards={...cards,[provider]:card};selected=cards.BRISNET?'BRISNET':'DRF';renderPrep();status('Historical PP loaded. Next: tap Upload matching Equibase results PDF. The chart will reconcile starters, surfaces and distances automatically before rankings and ROI are saved.');
  });
 };
 async function capturePrepared(automatic=false){
  if(!selected)throw Error('Upload a historical PP first.');
  if(!automatic&&!el('historicalFieldVerified').checked)throw Error('Review and confirm the historical field and conditions first.');
  const prepared=applyFields(),card=prepared[selected];
  const dashboards=Object.values(card.races).map(anchor=>buildRaceDashboard({anchor,sources:{BRISNET:pairedRace(prepared,'BRISNET',anchor),DRF:pairedRace(prepared,'DRF',anchor)}}));
  const next=historicalSnapshot({dashboards,sources:Object.entries(prepared).map(([provider,c])=>({provider,name:c.sourceName,sha256:c.source_sha256,parserVersion:c.parser_version}))});
  openSnapshot(next);if(save())status('Retrospective rankings saved. Add official results; these selections will not be recalculated from the results.');
 }
 el('historicalCapture').onclick=()=>busyRun(()=>capturePrepared());
 el('historicalResultPdf').onclick=()=>el('historicalResultFile').click();
 el('historicalChartBefore').onclick=()=>{if(!selected){status('Upload a historical Brisnet or DRF PP first.');return;}el('historicalResultFile').click();};
 el('historicalResultFile').onchange=event=>{
  const file=event.target.files[0];event.target.value='';if(!file)return;
  busyRun(async()=>{
   const pages=await pdfPages(file,status);
   resultText=pages.map((p,i)=>'PAGE '+(i+1)+'\n'+(p.lines||[]).map(l=>l.text||'').join('\n')).join('\n\n');
   if(!resultText.trim())throw Error('No readable chart text found. Use the original PDF and enter verified results manually.');
   const parsed=parseEquibaseResults(pages,{sourceRef:file.name});
   if(!snapshot){
    if(!selected)throw Error('Upload a historical PP before the Equibase chart.');
    if(parsed.identities.some(id=>id.date!==cards[selected].date||id.track.toLowerCase().replace(/[^a-z0-9]/g,'')!==cards[selected].track.toLowerCase().replace(/[^a-z0-9]/g,'')))throw Error('Equibase results track/date does not match the PP. Nothing was changed.');
    if(!parsed.identities.some(id=>Object.values(cards[selected].races).some(r=>Number(r.race)===id.race)))throw Error('Equibase chart contains no races on this PP card. No rankings were saved.');
    const ppRaces=Object.values(cards[selected].races).map(r=>Number(r.race));
    const missingChartRaces=ppRaces.filter(n=>!parsed.identities.some(id=>id.race===n));
    if(missingChartRaces.length)throw Error('Equibase PDF does not contain full charts for races '+missingChartRaces.join(', ')+'. Upload the complete matching chart before automatic rankings are saved.');
    chartPending=[];
    // Reconcile only races with independently parsed, complete official starter rosters.
    // Never infer scratches or override an unreadable race from incomplete chart text.
    for(const official of parsed.races){
     const fs=[...el('historicalFields').querySelectorAll('fieldset')].find(x=>Number(x.dataset.race)===official.race);
     if(!fs)continue;
     const choices=[...fs.querySelectorAll('[data-run]')];
     const ppField=choices.map(c=>({n:c.dataset.run,name:c.parentElement.textContent.replace(/^\s*Runs\s*#\d+\s*/, '').replace(/\s*\([A-Z]{2,3}\)\s*$/,'').trim()}));
     const checked=reconcileChartStarters(ppField,official.field);
     if(!checked.ok){chartPending.push({race:official.race,reason:checked.reason});continue;}
     const starters=new Set(checked.starters);
     for(const c of choices)c.checked=starters.has(c.dataset.run);
     fs.querySelector('[data-surface]').value=official.surface;
     fs.querySelector('[data-distance]').value=String(official.distanceFurlongs);
    }
    // The parser itself may flag an ambiguous race. Keep it pending, not silently settled.
    chartPending.push(...parsed.pending.map(p=>({race:p.race,reason:p.reason})));
    await capturePrepared(true);
   }
   const matched=matchEquibaseResults(snapshot,parsed,strategyId);
   const sourceSha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join('');
   const next={...officials},now=new Date().toISOString();
   for(const [number,official]of Object.entries(matched.officials)){
    if(chartPending.some(p=>String(p.race)===number))continue;
    if(next[number])revisions.push({race:Number(number),previous:structuredClone(next[number]),replacedAt:now});
    next[number]={...official,sourceSha256};
   }
   for(const issue of [...matched.pending.filter(p=>!chartPending.some(m=>m.race===p.race)),...chartPending]){
    const number=String(issue.race);
    if(next[number])revisions.push({race:issue.race,previous:structuredClone(next[number]),replacedAt:now});
    next[number]={verified:false,chartIssue:issue.reason,sourceRef:file.name,sourceSha256,recordedAt:now};
   }
   officials=next;sourceRef=file.name;chartPending=[];el('historicalPdfText').textContent=resultText;
   renderOfficial();renderReport();
   const saved=save();
   if(saved)status(Object.keys(next).filter(n=>next[n]?.verified===true).length+' races imported and checked automatically. '+Object.values(next).filter(o=>o.chartIssue).length+' races pending review. Verified results are included in ROI; saved rankings are retrospective and separate from Race Day. See the report for pending reasons.');
  });
 };
 el('historicalRace').onchange=renderOfficial;
 el('historicalStrategy').onchange=()=>{strategyId=el('historicalStrategy').value;renderReport();save();};
 el('historicalSettle').onclick=()=>busyRun(async()=>{
  const number=el('historicalRace').value,r=snapshot.races.find(r=>String(r.race.number)===number),finish=order(el('historicalFinish').value);
  const field=el('historicalRoster').value.trim().split('\n').map(line=>{const parts=line.split('|');if(parts.length!==2)throw Error('Use program | horse name on each roster line.');return {n:parts[0].trim(),name:parts[1].trim()};});
  const official={track:el('historicalOfficialTrack').value.trim(),date:el('historicalOfficialDate').value,race:Number(number),surface:r.race.surface,distance:r.race.distance,sourceRef:el('historicalSourceRef').value.trim(),field,finish,win2:Number(el('historicalWin').value),place2:{[finish[0]]:Number(el('historicalPlaceFirst').value),[finish[1]]:Number(el('historicalPlaceSecond').value)},exactaPay:Number(el('historicalExactaPay').value),exactaBase:Number(el('historicalExactaBase').value),verified:el('historicalOfficialVerified').checked,verification:'USER_CONFIRMED_CHART',nonstandard:el('historicalNonstandard').checked,recordedAt:new Date().toISOString()};
  const check=evaluateHistoricalCard({...snapshot,races:[r]},{[number]:official},strategyId);
  if(check.pending.length)throw Error(check.pending[0].reason);
  if(officials[number])revisions.push({race:number,previous:structuredClone(officials[number]),replacedAt:official.recordedAt});
  officials={...officials,[number]:official};renderReport();
  if(save())status('Race '+number+' official result saved. ROI includes only eligible model fields; unresolved races remain pending.');
 });
 el('historicalBackup').onclick=()=>download(session(),'Historical_Results_'+snapshot.date+'.json');
 el('historicalImport').onclick=()=>el('historicalJson').click();
 el('historicalJson').onchange=event=>{
  const file=event.target.files[0];event.target.value='';if(!file)return;
  busyRun(async()=>{
   const value=JSON.parse(await file.text()),backup=value.schema==='nyra-historical-backup-v1';
   const next=importHistoricalSnapshot(backup?value.snapshot:value);
   if(backup&&(!value.officials||typeof value.officials!=='object'||Array.isArray(value.officials)||!Array.isArray(value.revisions||[])))throw Error('Invalid research backup.');
   openSnapshot(next,backup?value.officials:{},backup?value.revisions||[]:[],backup?value.strategyId:'WIN_PLACE_EXACTA');
   sourceRef=backup?String(value.resultSource||''):'';renderOfficial();if(save())status('Saved rankings imported as retrospective evidence. Original JSON and Race Day records are unchanged.');
  });
 };
 el('historicalOpen').onclick=()=>{
  const saved=records.find(r=>r.id===el('historicalSaved').value);if(!saved){status('Choose a saved test first.');return;}
  try{sourceRef=String(saved.resultSource||'');openSnapshot(saved.snapshot,saved.officials,saved.revisions||[],saved.strategyId);status('Saved historical test opened.');}catch(err){status(err.message);}
 };
 el('historicalPdf').onclick=()=>{
  const win=window.open('','_blank');if(!win){status('Allow the report window to open, then use Print / Save PDF again.');return;}
  const evaluation=evaluateHistoricalCard(snapshot,officials,strategyId);
  win.document.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Historical Results '+e(snapshot.date)+'</title><style>body{font:13px system-ui;color:#111;margin:24px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #aaa;padding:5px;text-align:left}h3{margin-top:24px}p{overflow-wrap:anywhere}@media print{@page{size:landscape;margin:12mm}tr{break-inside:avoid}}</style></head><body>'+historicalReportHtml(snapshot,evaluation,strategyId)+'</body></html>');
  win.document.close();win.focus();setTimeout(()=>win.print(),300);
  status('Report opened. Use the iPad/iPhone print preview Share controls to save a PDF to Files.');
 };
 renderPrep();
}
