import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareRaceDayResearchFreeze} from './pre-race-raceday-integration.js';

test('current Race Day recorder fails closed without loaded card and race',()=>{
 const result=prepareRaceDayResearchFreeze({});
 assert.equal(result.record,null);
 assert.match(result.errors.join(' '),/Loaded provider card/);
});
test('current Race Day recorder rejects missing official post-time evidence before ranking',()=>{
 const card={id:'sample',sourceName:'source.pdf',parser_version:'test'};
 const race={date:'2026-10-26',track:'Belmont Park',race:1,horses:[{n:'1',name:'Example'}]};
 const result=prepareRaceDayResearchFreeze({card,race,fieldVerified:true,surfaceVerified:true,now:Date.parse('2026-10-26T14:00:00Z')});
 assert.equal(result.record,null);
 assert.match(result.errors.join(' '),/scheduled post timestamp|Official post-time/i);
});
test('current Race Day recorder rejects unverified official field before model execution',()=>{
 const card={id:'sample',sourceName:'source.pdf',parser_version:'test'};
 const race={date:'2026-10-26',track:'Belmont Park',race:1,horses:[{n:'1',name:'Example'}]};
 const now=Date.parse('2026-10-26T14:00:00Z');
 const postTimeEvidence={scheduledPost:'2026-10-26T16:00:00Z',sourceType:'NYRA_OFFICIAL',sourceUrl:'https://www.nyra.com/',verifiedByUser:true,observedAt:'2026-10-26T13:00:00Z'};
 const result=prepareRaceDayResearchFreeze({card,race,postTimeEvidence,now,fieldVerified:false,surfaceVerified:true});
 assert.equal(result.record,null);
 assert.match(result.errors.join(' '),/field, scratches and surface/);
});
