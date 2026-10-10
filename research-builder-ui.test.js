import test from 'node:test';import assert from 'node:assert/strict';
import {initResearchBuilder,renderResearchBuilder} from './research-builder-ui.js';
test('UI records source evidence, retains budget inputs, resets race checks, and reports storage failures',()=>{
 const saved=new Map(),ids=['researchCash','researchDaily','researchCap','researchFloor','researchOutstanding','researchDuplicate','researchHorse','researchPreview','researchCount','researchLog','researchOdds','researchSource','researchEvidence','researchQuoteTime','researchPostTime','researchObserved','researchField','researchSurface','researchStatus','researchRace','researchNow','researchRecord','researchFreeze','researchExport'];
 const elements=Object.fromEntries(ids.map(id=>[id,{value:'',checked:false,textContent:'',innerHTML:'',dataset:{}}]));
 Object.assign(elements.researchCash,{value:'300'});elements.researchDaily.value='0';elements.researchCap.value='30';elements.researchFloor.value='240';
 const oldDoc=globalThis.document,oldStorage=globalThis.localStorage,oldNow=Date.now;let fail=false;
 globalThis.document={getElementById:id=>elements[id]};globalThis.localStorage={getItem:key=>saved.get(key)||null,setItem:(key,v)=>{if(fail)throw Error('storage full');saved.set(key,v)}};Date.now=()=>Date.parse('2026-10-07T17:07:00Z');
 let c={card:{id:'card'},race:{date:'2026-10-07',track:'Belmont Park',race:1,horses:[{n:'3',name:'Runner'}]},rating:{decision:'RATEABLE',rankings:[{n:'3',name:'Runner',v44c_rank:1,v44c_unrounded_score:80}],pass_reasons:[]}};
 try{
  initResearchBuilder(()=>c);renderResearchBuilder();assert.match(elements.researchPreview.innerHTML,/Automated betting: PASS/);assert.match(elements.researchPreview.innerHTML,/298.00/);
  const fill=()=>{elements.researchOdds.value='5/2';elements.researchSource.value='synthetic-test-only';elements.researchEvidence.value='synthetic-test-only';elements.researchQuoteTime.value='2026-10-07T13:06:30-04:00';elements.researchPostTime.value='2026-10-07T13:10:00-04:00';elements.researchObserved.checked=true;elements.researchField.checked=true;elements.researchSurface.checked=true;};
  fill();elements.researchFreeze.onclick();assert.equal(JSON.parse(saved.get('nyraResearchFreezesV1')).length,1);assert.match(elements.researchStatus.textContent,/externally anchor/);
  elements.researchFreeze.onclick();assert.match(elements.researchStatus.textContent,/will not be overwritten/);
  fill();elements.researchRecord.onclick();let rows=JSON.parse(saved.get('nyraResearchQuoteLogV1'));assert.equal(rows.length,1);assert.equal(rows[0].decision,'PASS');assert.equal(rows[0].rawScore,80);assert.equal(elements.researchCash.value,'300');assert.equal(elements.researchDaily.value,'0');
  c={...c,race:{...c.race,race:2}};renderResearchBuilder();assert.equal(elements.researchOdds.value,'');assert.equal(elements.researchObserved.checked,false);assert.equal(elements.researchField.checked,false);
  fill();fail=true;elements.researchRecord.onclick();assert.match(elements.researchStatus.textContent,/could not be saved/);assert.equal(JSON.parse(saved.get('nyraResearchQuoteLogV1')).length,1);
 }finally{Date.now=oldNow;globalThis.document=oldDoc;globalThis.localStorage=oldStorage}
});
