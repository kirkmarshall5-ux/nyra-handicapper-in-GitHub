import test from 'node:test';import assert from 'node:assert/strict';
import {buildPicksSheet,paperWagers,picksPdf,createPicksPreview} from './print-picks.js';
const horse=n=>({n:String(n),name:'Horse '+n,ml:n+'/1',odds:'—',entry_status:'REGULAR'});
const race=()=>({track:'Belmont Park',date:'2026-10-28',race:1,dist:'6 Furlongs',surface:'Dirt',distance_furlongs:6,horses:[1,2,3,4].map(horse)});
const card=()=>({id:'example',track:'Belmont Park',date:'2026-10-28',source_format:'BRISNET_PREMIUM_PLUS',races:{1:race()}});
const ranked=(id,r)=>({model_id:'fixed-'+id,decision:'PASS',rankings:r.horses.filter(h=>h.odds!=='SCR')});
test('print uses matching providers and records missing DRF without substituting Brisnet',()=>{
 const c=card(),before=structuredClone(c);const s=buildPicksSheet({cards:{BRISNET:c},card:c},ranked);
 assert.deepEqual(c,before);assert.equal(s.bettingEnabled,false);
 assert.deepEqual(s.races[0].columns.map(x=>x.label),['Prime Power','Brisnet-RR','Brisnet Finisher','Brisnet Contender','DRF Contender Late +50%','M/L']);
 assert.deepEqual(s.races[0].columns[1].picks,['1','2','3','4']);assert.equal(s.races[0].columns[4].available,false);
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
 assert.deepEqual(s.races[0].conditional,['4']);assert.equal(s.races[0].columns[4].available,false);
 assert.deepEqual(s.races[0].columns[1].picks,['1','2','3']);
});
test('partial field paper combinations remain unavailable rather than padded',()=>{
 assert.equal(paperWagers(['2']).exacta,'Unavailable');assert.equal(paperWagers(['2','3']).trifecta,'Unavailable');
});
test('PDF is self contained, keeps notes escaped and keeps the card on two pages',()=>{
 const c=card(),s=buildPicksSheet({cards:{BRISNET:c},card:c,notes:{1:'Test (note) \\ end'}},ranked);s.races.push({...s.races[0],race:2},{...s.races[0],race:3});
 const pdf=new TextDecoder().decode(picksPdf(s));assert.match(pdf,/^%PDF-1.4/);assert.match(pdf,/\/Count 2/);assert.match(pdf,/Race Day Handicapper/);assert.match(pdf,/%%EOF/);assert.ok(!pdf.includes('javascript:'));assert.ok(pdf.includes('Test \\(note\\) \\\\ end'));
});
test('blocked popup produces actionable message and refresh never opens unsolicited windows',()=>{
 let calls=0;const p=createPicksPreview({getSheet:()=>({races:[]}),open:()=>{calls++;return null}});assert.equal(p.refresh(),false);assert.equal(calls,0);assert.throws(()=>p.show(),/Allow pop-ups/);assert.equal(calls,1);
});
test('unnumbered DRF prints full horse names and name-based paper selections',()=>{
 const c={...card(),source_format:'DRF'};c.races[1].horses.forEach(h=>h.n='');
 const s=buildPicksSheet({cards:{DRF:c},card:c},ranked),col=s.races[0].columns[4];
 assert.equal(col.nameOnly,true);assert.deepEqual(col.picks,['Horse 1','Horse 2','Horse 3','Horse 4']);
 const pdf=new TextDecoder().decode(picksPdf(s));assert.doesNotMatch(pdf,/Name-only selections require verified program numbers/);assert.match(pdf,/Horse 1/);
});

test('print uses priced matching Brisnet when newest DRF has no morning lines',()=>{
 const bris=card();bris.imported_at='2026-11-01T11:00:00Z';
 const drf={...structuredClone(bris),id:'early-drf',source_format:'DRF',imported_at:'2026-11-01T12:00:00Z'};drf.races[1].horses.forEach(h=>{h.n='';h.ml='—';});
 const before=structuredClone(drf),s=buildPicksSheet({cards:{BRISNET:bris,DRF:drf},card:drf},ranked);
 assert.equal(s.races[0].columns[5].provider,'BRISNET');assert.deepEqual(s.races[0].columns[5].picks,['1','2','3','4']);assert.deepEqual(drf,before);
});

test('print grid limits each system to four ranks, includes Prime Power and FTS evidence, and removes wagers and finish-order blanks',()=>{
 const c=card();c.races[1].horses.push(horse(5));c.races[1].horses[4].life_starts=0;c.races[1].horses[4].source_context={workouts:[]};
 c.races[1].horses.forEach((h,i)=>h.ratings={provider:'BRISNET',prime_power:100+i,prime_power_display:(100+i).toFixed(1)+' ('+(5-i)+'th)'});
 const s=buildPicksSheet({cards:{BRISNET:c},card:c},ranked),r=s.races[0];
 assert.equal(r.columns[0].rankings[0].n,'5');assert.equal(r.fts[0].name,'Horse 5');
 assert.ok(r.columns.every(col=>col.rankings.length<=4));assert.ok(r.rows.every(h=>Object.values(h.ranks).every(x=>x===null||x<=4)));
 s.races=Array.from({length:12},(_,i)=>({...r,race:i+1}));const pdf=new TextDecoder().decode(picksPdf(s));
 assert.match(pdf,/\/Count 2/);assert.match(pdf,/RACE 12/);assert.match(pdf,/FIRST-TIME STARTERS/);assert.match(pdf,/Horse 5/);assert.match(pdf,/WORK -/);assert.match(pdf,/Notes:/);
 assert.doesNotMatch(pdf,/Finish Order|Exacta|Tri box|\$4 Win/);
});

test('notes retain their label and open space without a ruled line',()=>{const c=card(),sheet=buildPicksSheet({cards:{BRISNET:c},card:c},ranked);const pdf=new TextDecoder().decode(picksPdf(sheet));assert.match(pdf,/Notes:/);assert.doesNotMatch(pdf,/32 -?\d+(?:\.\d+)? m 552 -?\d+(?:\.\d+)? l S/);});
