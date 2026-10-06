import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCard} from './card-loader.js';

const line=(y,text,x=10)=>({y,text,items:[{x,y,str:text}]});
const page={pageNumber:1,lines:[
 line(760,'1 Belmont Park Clm25000'),
 line(750,'1 Mile (Turf). CLAIMING. Purse $50,000'),
 line(740,'Post time: 1:00 ET'),
 line(700,'1'),line(690,'2-1'),line(680,'Regular One',45),line(670,'Own: A Stable',45),
 line(600,'Also Eligible:'),
 line(590,'11'),line(580,'6-1'),line(570,'AE One',45),line(560,'Own: B Stable',45),
 line(500,'12'),line(490,'8-1'),line(480,'AE Two',45),line(470,'Own: C Stable',45),
 line(410,'Entered For Main Track Only'),
 line(400,'13'),line(390,'4-1'),line(380,'MTO One',45),line(370,'Own: D Stable',45),
 line(310,'14'),line(300,'5-1'),line(290,'MTO Two',45),line(280,'Own: E Stable',45)
]};
test('conditional heading applies to every following runner until next heading',()=>{
 const card=parseCard([page]);
 const byName=Object.fromEntries(card.races[1].horses.map(h=>[h.name,h.entryStatus]));
 assert.equal(byName['Regular One'],'REGULAR');
 assert.equal(byName['AE One'],'AE');
 assert.equal(byName['AE Two'],'AE');
 assert.equal(byName['MTO One'],'MTO');
 assert.equal(byName['MTO Two'],'MTO');
});
