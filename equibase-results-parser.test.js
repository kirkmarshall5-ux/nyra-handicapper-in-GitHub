import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseEquibaseResults,matchEquibaseResults,chartDistance} from './equibase-results-parser.js';
import {evaluateHistoricalCard} from './historical-results.js';
const snapshot=JSON.parse(readFileSync(new URL('./fixtures/historical-results-synthetic.json',import.meta.url)));
function chart({base=2,pay=30,pair='1-2',extra='',track='Synthetic Test Track',date='August 31, 2024',coupled=false,place=true}={}){
 let y=780;const items=[];
 const row=cells=>{for(const [x,str,width=String(str).length*4]of cells)items.push({str:String(str),transform:[1,0,0,1,x,y],width});y-=12;};
 row([[10,track+' - '+date+' - Race 1']]);row([[10,'Distance: Six Furlongs On The Dirt']]);
 row([[10,'Last Raced'],[74,'Pgm Horse Name (Jockey)'],[249,'Wgt M/E'],[468,'Odds'],[494,'Comments']]);
 for(const [n,name,odds]of [['1','Demo Alpha','3.00'],['2','Demo Beta','2.00'],['3','Demo Gamma','4.00']])row([[80,n==='1'&&coupled?'1A':n],[96,name+' (Smith, John)'],[249,'123'],[475,odds],[494,'ran']]);
 row([[10,'Fractional Times: 22.00']]);row([[10,'Total WPS Pool: 10000']]);
 row([[8,'Pgm Horse'],[134,'Win',15],[162,'Place',21],[195,'Show',21],[228,'Wager Type'],[308,'Winning Numbers'],[411,'Payoff',24],[469,'Pool']]);
 row([[15,'1'],[30,'Demo Alpha'],[135,'8.00'],...(place?[[169,'4.00']]:[]),[203,'2.10'],[228,'$'+base.toFixed(2)+' Exacta'],[308,pair],[418,pay.toFixed(2),17],[465,'10,000']]);
 row([[15,'2'],[30,'Demo Beta'],[169,'3.00'],[203,'2.10']]);row([[15,'3'],[30,'Demo Gamma'],[203,'2.20']]);
 if(extra)row([[10,extra]]);
 row([[10,'Copyright 2024 Equibase Company LLC. All Rights Reserved.']]);
 return [{pageNumber:1,items}];
}
test('automatic chart settlement fills identities, full order, place and $2 exacta payouts',()=>{
 const parsed=parseEquibaseResults(chart(),{sourceRef:'test.pdf'});assert.deepEqual(parsed.pending,[]);
 const matched=matchEquibaseResults(snapshot,parsed,'WIN_PLACE_EXACTA');assert.deepEqual(matched.pending,[]);
 const o=matched.officials[1];assert.deepEqual(o.finish,['1','2','3']);assert.deepEqual(o.place2,{'1':4,'2':3});assert.equal(o.verification,'AUTOMATIC_EQUIBASE_CHART');
 const result=evaluateHistoricalCard(snapshot,matched.officials,'WIN_EXACTA');const pp=result.summary.find(m=>m.id==='primePower');assert.equal(pp.returned,23);assert.equal(pp.stake,4);assert.equal(pp.winning,2);assert.equal(pp.bets,3);
});
test('$1 and $2 exacta charts yield identical normalized $1 winning tickets',()=>{
 const settle=options=>evaluateHistoricalCard(snapshot,matchEquibaseResults(snapshot,parseEquibaseResults(chart(options)),'WIN_EXACTA').officials,'WIN_EXACTA').summary;
 assert.deepEqual(settle({base:1,pay:15}),settle({base:2,pay:30}));
});
test('missing payouts, conflicting exacta, coupled entries and dead heats remain pending',()=>{
 for(const option of [{place:false},{pair:'2-1'},{coupled:true},{extra:'Dead Heat: 1 and 2'}]){
  const p=parseEquibaseResults(chart(option));assert.equal(p.races.length,0);assert.equal(p.pending.length,1);
 }
});
test('wrong track/date cannot replace existing results and fields/conditions must match',()=>{
 for(const option of [{track:'Another Track'},{date:'September 1, 2024'}])assert.throws(()=>matchEquibaseResults(snapshot,parseEquibaseResults(chart(option)),'WIN_EXACTA'),/track\/date differs/);
 const changed=structuredClone(snapshot);changed.races[0].field[0].name='Other horse';
 assert.match(matchEquibaseResults(changed,parseEquibaseResults(chart()),'WIN_EXACTA').pending[0].reason,/starters differ/);
 changed.races[0].race.distance='7F';assert.match(matchEquibaseResults(changed,parseEquibaseResults(chart()),'WIN_EXACTA').pending[0].reason,/distance differs/);
});
test('bad denomination and duplicate charts are rejected; unreadable PDFs do not settle',()=>{
 const pages=chart();pages[0].items.find(i=>i.str==='3.00').str='1.00';assert.match(parseEquibaseResults(pages).pending[0].reason,/denomination/);
 assert.throws(()=>parseEquibaseResults([{items:[]}]),/No readable/);
 // Nonadjacent repeated identities are ambiguous rather than double-counted.
 const a=chart(),b=chart({date:'September 1, 2024'});assert.throws(()=>parseEquibaseResults([...a,...b,...a]),/Duplicate race/);
});
test('distance decoding handles chart words and frozen compact distances',()=>{
 for(const [s,n]of [['One And Three Sixteenth Miles',9.5],['One And Five Sixteenth Miles',10.5],['One And Three Eighth Miles',11],['Six And One Half Furlongs',6.5],['6 1/2F',6.5],['1M',8],['8.5F',8.5],['1½M',12]])assert.equal(chartDistance(s),n,s);
});
test('pending parser reason contributes no wagers or returns',()=>{
 const report=evaluateHistoricalCard(snapshot,{'1':{chartIssue:'Unreadable exacta payout',verified:false}},'WIN_EXACTA');assert.equal(report.rows.length,0);assert.equal(report.pending[0].reason,'Unreadable exacta payout');
});
test('an explicit disqualification reorders the official field before payout reconciliation',()=>{
 const pages=chart({pair:'2-3',extra:'Disqualification(s): #1 Demo Alpha from 1 to 3'});
 // Change only the payout-table identities/amount and the promoted winner odds.
 const items=pages[0].items,head=items.findIndex(i=>i.str==='Pgm Horse');
 for(const i of items.slice(head)){
  if(i.transform[4]===15&&i.str==='1')i.str='2';else if(i.transform[4]===15&&i.str==='2')i.str='3';else if(i.transform[4]===15&&i.str==='3')i.str='1';
  if(i.transform[4]===30)i.str=({'Demo Alpha':'Demo Beta','Demo Beta':'Demo Gamma','Demo Gamma':'Demo Alpha'})[i.str]||i.str;
  if(i.transform[4]===135)i.str='6.00';
 }
 const parsed=parseEquibaseResults(pages);assert.deepEqual(parsed.pending,[]);assert.deepEqual(parsed.races[0].finish,['2','3','1']);
});
