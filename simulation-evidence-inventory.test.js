import test from 'node:test';
import assert from 'node:assert/strict';
import {inventoryPPText,validateChartPairManifest} from './simulation-evidence-inventory.js';
const pp=[
'2 Belmont Park Clm 25000',
'TimeformUS Pace: Early 99 Late 74',
'Life 37 8 7 7 $634,041 100',
'19æ26= 3Bel fm 7f ê S 22¨ :45¦1:08§1:20¦ 3ÎOC 80k/N2X 75 3 /7 2 2Ç 2Ç 3¨ 4¤ô Carmouche K',
'Life 0 M 0 0 $0 -',
'7æ26= 7Sar fst 6f 22§ :46 :57©1:10¦ Md Sp Wt 115k 46 3 /12 6 3¦ 4¦ô 5¬ô 7¦¬'
].join('\n');
test('inventory detects source lines but never claims verified positions or charts',()=>{
 const x=inventoryPPText(pp,{sourceId:'BEL--10-10-2026 2.pdf',cardDate:'2026-10-10',track:'BEL'});
 assert.equal(x.pastPerformanceLineCandidates,2);
 assert.equal(x.timeformPacePairs,1);
 assert.equal(x.firstTimeStarterEntries,1);
 assert.equal(x.chartPairsVerified,0);
 assert.ok(x.candidates.every(c=>c.verifiedCallPositions===false));
 assert.equal(x.candidates[0].fieldSizeCandidate,7);
});
test('reject missing source provenance and unpaired official charts',()=>{
 assert.throws(()=>inventoryPPText(pp,{}));
 const x=validateChartPairManifest([{raceId:'BEL-2026-10-10-R1',ppSourceId:'BEL.pdf',officialChartUrl:null}]);
 assert.equal(x[0].status,'NOT_PAIRED');
 assert.throws(()=>validateChartPairManifest([{raceId:'A',ppSourceId:'p'},{raceId:'A',ppSourceId:'p'}]));
});


test('Stage 2 gate: a chart URL alone is not sufficient to certify a race pair',()=>{
 const row={raceId:'SAR-2024-08-31-R1',ppSourceId:'SAR--08-31-2024.pdf',officialChartId:'chart-1',officialChartUrl:'https://example.org/chart'};
 assert.equal(validateChartPairManifest([row])[0].status,'NOT_PAIRED');
 assert.equal(validateChartPairManifest([{...row,runnerReconciliationVerified:true,callMappingVerified:true,actualChartReviewed:true}])[0].status,'READY_FOR_MANUAL_PAIR_REVIEW');
});
