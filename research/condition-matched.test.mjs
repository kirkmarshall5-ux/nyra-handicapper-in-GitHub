import test from 'node:test';import assert from 'node:assert/strict';
import {distanceFurlongs,pastCondition,mapHorse,conditionRace} from './condition-matched.js';
const e=(figure,condition)=>({figure,source_line:`1Ý26= 1Sar ${condition} 23 :48 1:12`});
test('DRF fractions and surfaces are mapped conservatively',()=>{
 for(const [s,n] of [['7 Furlongs',7],['6ô Furlongs',6.5],['1 MILE',8],['1Â MILES',8.5],['1° MILES',9]])assert.equal(distanceFurlongs(s),n);
 assert.equal(distanceFurlongs('Keeneland TurfMile'),null);assert.equal(distanceFurlongs('1± MILES'),9.5);assert.equal(distanceFurlongs('1¶ MILES'),null);
 assert.equal(pastCondition(e(74,'fm 1Â Ñ')).surface,'Turf');assert.equal(pastCondition(e(70,'fst 1 ú')).surface,'Synthetic');assert.equal(pastCondition(e(70,'myø 1 ï')).surface,'Dirt');
});
test('turf improvement cannot become a dirt-route bonus; preserve latest-three window',()=>{
 const h={name:'Test',life_starts:5,beyer_figures:[74,67,62,80],beyer_evidence:[e(74,'fm 1Â Ñ'),e(67,'fm 1 ê'),e(62,'fst 7f 23'),e(80,'fst 1 23')]};
 const m=mapHorse(h,{surface:'Dirt',furlongs:8,route:true});assert.deepEqual(m.selected.map(r=>r.figure),[62]);assert.ok(m.flags.includes('SAME_SURFACE_DISTANCE_FALLBACK'));
 const out=conditionRace({dist:'1 MILE',surface:'Dirt',horses:[h]});assert.equal(out.decision,'RATEABLE');assert.ok(!out.rankings[0].v44c_signals.some(([k])=>k==='lightly-raced-upside'));
});
test('unproven route is flagged, not a claim about missing lifetime history',()=>{
 const h={beyer_figures:[65],beyer_evidence:[e(65,'fst 7f 23')]};assert.ok(mapHorse(h,{surface:'Dirt',furlongs:8,route:true}).flags.includes('NO_DOCUMENTED_DIRT_ROUTE_IN_AVAILABLE_HISTORY'));
});
test('missing, misaligned and unsupported evidence cause PASS',()=>{
 for(const h of [{name:'A',beyer_figures:[70],beyer_evidence:[]},{name:'A',beyer_figures:[70],beyer_evidence:[e(71,'fst 1 23')]},{name:'A',beyer_figures:[70],beyer_evidence:[e(70,'fm 1¶ ê')]}])assert.equal(conditionRace({dist:'1 MILE',surface:'Dirt',horses:[h]}).decision,'PASS');
});
test('zero figures remain usable, one or two figures are not invented',()=>{
 for(const figs of [[0],[65,70]]){const h={name:'A',life_starts:figs.length,beyer_figures:figs,beyer_evidence:figs.map(f=>e(f,'fst 1 23'))};const out=conditionRace({dist:'1 MILE',surface:'Dirt',horses:[h]});assert.equal(out.decision,'RATEABLE');assert.deepEqual(out.rankings[0].beyer_figures,figs);}
});
