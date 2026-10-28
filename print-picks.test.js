import test from 'node:test';import assert from 'node:assert/strict';
import {buildPicksSheet,paperWagers,picksPdf,createPicksPreview} from './print-picks.js';
const horse=n=>({n:String(n),name:'Horse '+n,ml:n+'/1',odds:'—',entry_status:'REGULAR'});
const race=()=>({track:'Belmont Park',date:'2026-10-28',race:1,dist:'6 Furlongs',surface:'Dirt',distance_furlongs:6,horses:[1,2,3,4].map(horse)});
const card=()=>({id:'example',track:'Belmont Park',date:'2026-10-28',source_format:'BRISNET_PREMIUM_PLUS',races:{1:race()}});
const ranked=(id,r)=>({model_id:'fixed-'+id,decision:'PASS',rankings:r.horses.filter(h=>h.odds!=='SCR')});
test('print uses matching providers and records missing DRF without substituting Brisnet',()=>{
 const c=card(),before=structuredClone(c);const s=buildPicksSheet({cards:{BRISNET:c},card:c},ranked);
 assert.deepEqual(c,before);assert.equal(s.bettingEnabled,false);
 assert.deepEqual(s.races[0].columns.map(x=>x.label),['Morning Line','Brisnet Contender','DRF Contender','DRF Finisher']);
 assert.deepEqual(s.races[0].columns[1].picks,['1','2','3','4']);assert.equal(s.races[0].columns[2].available,false);
});
test('fresh sheet reflects current scratch and removes it from wagers without mutating source',()=>{
 const c=card(),current=race();current.horses[0].odds='SCR';
 const s=buildPicksSheet({cards:{BRISNET:c},card:c,currentRace:current},ranked);
 assert.deepEqual(s.races[0].scratches,['1']);assert.deepEqual(s.races[0].columns[1].picks,['2','3','4']);
 assert.deepEqual(paperWagers(s.races[0].columns[1].picks),{win:'2',exacta:'2-3, 3-2',trifecta:'2-3-4 box'});assert.equal(c.races[1].horses[0].odds,'—');
});
test('unconfirmed AEs and mismatched dates do not become printed selections',()=>{
 const c=card();c.races[1].horses[3].entry_status='AE';c.races[1].horses[3].included_in_frozen_field=false;
 const drf={...structuredClone(c),source_format:'DRF',date:'2026-10-25'};
 const s=buildPicksSheet({cards:{BRISNET:c,DRF:drf},card:c},(id,r)=>({...ranked(id,r),rankings:r.horses.filter(h=>h.entry_status==='REGULAR')}));
 assert.deepEqual(s.races[0].conditional,['4']);assert.equal(s.races[0].columns[2].available,false);
 assert.deepEqual(s.races[0].columns[1].picks,['1','2','3']);
});
test('partial field paper combinations remain unavailable rather than padded',()=>{
 assert.equal(paperWagers(['2']).exacta,'Unavailable');assert.equal(paperWagers(['2','3']).trifecta,'Unavailable');
});
test('PDF is self contained, keeps notes escaped and paginates two races per page',()=>{
 const c=card(),s=buildPicksSheet({cards:{BRISNET:c},card:c,notes:{1:'Test (note) \\ end'}},ranked);s.races.push({...s.races[0],race:2},{...s.races[0],race:3});
 const pdf=new TextDecoder().decode(picksPdf(s));assert.match(pdf,/^%PDF-1.4/);assert.match(pdf,/\/Count 2/);assert.match(pdf,/Race Day Handicapper/);assert.match(pdf,/%%EOF/);assert.ok(!pdf.includes('javascript:'));assert.ok(pdf.includes('Test \\(note\\) \\\\ end'));
});
test('blocked popup produces actionable message and refresh never opens unsolicited windows',()=>{
 let calls=0;const p=createPicksPreview({getSheet:()=>({races:[]}),open:()=>{calls++;return null}});assert.equal(p.refresh(),false);assert.equal(calls,0);assert.throws(()=>p.show(),/Allow pop-ups/);assert.equal(calls,1);
});
