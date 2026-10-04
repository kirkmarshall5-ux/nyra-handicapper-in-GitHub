import test from 'node:test';import assert from 'node:assert/strict';
import {evidenceProfile,evidenceWeightedRating,confidenceAdjustedTemperature,probabilityWeights,extractRunningLineFigures,beyerAnomalies,claimLayoffSignal,contextualFigureWeight,beyerTrajectory,relativeBeyerPosition} from './scoring-engine.js';
test('missing descriptive workout/pedigree text does not invent a numeric rating',()=>{assert.equal(evidenceWeightedRating([{value:null,weight:24},{value:null,weight:18}]),null)});
test('unknown career starts are labeled unknown and forced to low confidence',()=>{const e=evidenceProfile({lifeStarts:null,last:88,best:92,figs:[88,86,84],trainerAngles:'Dirt stats'});assert.equal(e.experience,'Starts unknown');assert.equal(e.confidence,'Low')});
test('first-time starter can reach medium but never high without race evidence',()=>{const e=evidenceProfile({lifeStarts:0,workText:'5f work',pedigree:'Sire / Dam',trainerAngles:'1st starter'});assert.equal(e.experience,'First-time starter');assert.equal(e.confidence,'Medium')});
test('first-time starter with only one support category stays low',()=>{assert.equal(evidenceProfile({lifeStarts:0,workText:'5f work'}).confidence,'Low')});
test('lightly raced runner is capped at medium',()=>{const e=evidenceProfile({lifeStarts:2,last:78,figs:[78,72],workText:'work',pedigree:'Sire / Dam',trainerAngles:'context'});assert.equal(e.experience,'Lightly raced');assert.equal(e.confidence,'Medium')});
test('established horse needs multiple direct figures for high confidence',()=>{assert.equal(evidenceProfile({lifeStarts:8,last:88,best:92,figs:[88,86,84]}).confidence,'High');assert.equal(evidenceProfile({lifeStarts:8,last:88,best:92,figs:[88]}).confidence,'Medium')});
test('lower confidence flattens fair-odds probability differences',()=>{const hi=probabilityWeights([{id:'a',rating:90,confidence:'High'},{id:'b',rating:70,confidence:'High'}]);const lo=probabilityWeights([{id:'a',rating:90,confidence:'Low'},{id:'b',rating:70,confidence:'Low'}]);assert.ok((hi[0].p-hi[1].p)>(lo[0].p-lo[1].p))});

test('Beyer extraction preserves low figures and DRF joined post layout',()=>{
 const s='3æ26=7Del myø 1 S 24 :47 1:37 3ÎçOC 50k/N3L 34 5 /5 finish 18æ26=8Bel fst 6ôf 22 :45 1:16 3ÎAlw 55000sN1X 7810/12 finish 30Û26=9Sar slyø 5ôf ï 22 :45 1:03 3ÎClm 40000N2L 87 2 /7 finish';
 assert.deepEqual(extractRunningLineFigures(s),[34,78,87]);
});

test('extreme low Beyer with troubled trip is flagged but preserved',()=>{const a=beyerAnomalies([14,62,66,64],['stumbled badly start','','','']);assert.equal(a[0].figure,14);assert.equal(a[0].classification,'extreme-low-compromised')});
test('extreme low Beyer without excuse remains an unexplained negative',()=>{const a=beyerAnomalies([18,70,72,68],['no response','','','']);assert.equal(a[0].classification,'extreme-low-unexplained')});
test('ordinary variation is not mislabeled as an extreme trip anomaly',()=>{assert.deepEqual(beyerAnomalies([72,78,69,75],['4w','','','']),[])});

test('claim layoff can identify protected positive intent without guessing',()=>{const x=claimLayoffSignal({claimedLastStart:true,daysSinceLast:70,lastClaimPrice:25000,todayClaimPrice:35000,works:[1,2,3,4],claimLayoffWinPct:24,claimLayoffStarts:25});assert.equal(x.label,'Positive claim intent');assert.ok(x.reasons.some(r=>r.includes('protected/raised')))});
test('claim layoff flags steep class drop as negative intent evidence',()=>{const x=claimLayoffSignal({claimedLastStart:true,daysSinceLast:90,lastClaimPrice:40000,todayClaimPrice:20000,works:[1]});assert.equal(x.label,'Mixed/neutral claim intent');assert.ok(x.score<0)});
test('claim layoff ignores trainer percentage when sample is too small',()=>{const x=claimLayoffSignal({claimedLastStart:true,daysSinceLast:60,lastClaimPrice:25000,todayClaimPrice:25000,works:[1,2,3],claimLayoffWinPct:50,claimLayoffStarts:2});assert.ok(!x.reasons.some(r=>r.includes('trainer 50%')))});

test('off-surface Beyer is preserved but heavily discounted for today',()=>{const x=contextualFigureWeight({surface:'turf',distanceFurlongs:6},{surface:'dirt',distanceFurlongs:6});assert.equal(x.weight,.35);assert.ok(x.reasons.includes('different surface'))});
test('compromised trip reduces relevance without deleting the Beyer',()=>{const x=contextualFigureWeight({surface:'turf',distanceFurlongs:8,compromisedTrip:true},{surface:'turf',distanceFurlongs:8});assert.equal(x.weight,.45);assert.ok(x.reasons.includes('compromised trip'))});
test('comparable clean recent race retains full Beyer weight',()=>{assert.equal(contextualFigureWeight({surface:'dirt',distanceFurlongs:7,daysAgo:30},{surface:'dirt',distanceFurlongs:7}).weight,1)});

test('Beyer trajectory distinguishes steady improvement from decline',()=>{assert.equal(beyerTrajectory([88,82,75,68,62]).trend,'improving');assert.equal(beyerTrajectory([73,79,86,92,96]).trend,'declining')});
test('stable Beyer sequence is not forced into a trend',()=>{assert.equal(beyerTrajectory([82,81,83,82,80]).trend,'stable')});
test('current Beyer is evaluated relative to todays field',()=>{const x=relativeBeyerPosition([83,78,73,68],[94,83,80,78,74,70]);assert.equal(x.vsMedian,4);assert.equal(x.rank,2)});
