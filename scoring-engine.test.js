import test from 'node:test';import assert from 'node:assert/strict';
import {evidenceProfile,evidenceWeightedRating,confidenceAdjustedTemperature,probabilityWeights,extractRunningLineFigures,beyerAnomalies,claimLayoffSignal,contextualFigureWeight,beyerTrajectory,relativeBeyerPosition,ratingEvidenceProfile,evidenceSignalAdjustment,contextualFigureSignal,paceFitAdjustment,reboundProtectionAdjustment,lightlyRacedUpsideAdjustment,experimentalV44Adjustment,provenAbilityAdjustment} from './scoring-engine.js';
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

test('foreign Timeform-only runner is evidence-bearing, not missing-data',()=>{const x=ratingEvidenceProfile({foreignForm:true,timeformRatings:[72,72]});assert.equal(x.status,'timeform-only');assert.equal(x.foreign,true);assert.equal(x.comparable,false)});
test('mixed import history preserves Beyer and Timeform as separate systems',()=>{const x=ratingEvidenceProfile({beyers:[76,75],timeformRatings:[72,72]});assert.equal(x.status,'mixed-rating-systems');assert.deepEqual(x.beyers,[76,75]);assert.deepEqual(x.timeform,[72,72]);assert.equal(x.comparable,false)});
test('ordinary Beyer horse remains directly comparable in Beyer field context',()=>{assert.equal(ratingEvidenceProfile({beyers:[91,85,82]}).status,'beyer')});

test('signal adjustment rewards improving trajectory without overpowering base rating',()=>{const x=evidenceSignalAdjustment({figs:[90,86,82,78,74]},[94,90,86,82,78,74]);assert.ok(x.adjustment>0);assert.ok(x.adjustment<=6)});
test('signal adjustment penalizes declining trajectory',()=>{const x=evidenceSignalAdjustment({figs:[74,78,82,86,90]},[94,90,86,82,78,74]);assert.ok(x.adjustment<0);assert.ok(x.adjustment>=-6)});
test('verified compromised latest outlier gets only a partial excuse',()=>{const x=evidenceSignalAdjustment({figs:[50,80,82,81],tripComments:['Bumped start badly','','','']},[50,70,80,82]);assert.ok(x.contributions.some(y=>y.signal==='latest-trip-excuse'));assert.ok(x.adjustment<=6)});
test('unexplained latest collapse is not forgiven',()=>{const x=evidenceSignalAdjustment({figs:[50,80,82,81],tripComments:['No response','','','']},[50,70,80,82]);assert.ok(x.contributions.some(y=>y.signal==='latest-unexplained-collapse'))});
test('field-relative contribution is tightly capped to avoid double-counting Beyer',()=>{const x=evidenceSignalAdjustment({figs:[100,98,96]},[60,65,70,75,80,100]);const r=x.contributions.find(y=>y.signal==='field-relative');assert.ok(r.adjustment<=2)});


test('contextual figure signal discounts non-comparable high figures without deleting them',()=>{
 const x=contextualFigureSignal([
  {figure:95,surface:'turf',distanceFurlongs:8},
  {figure:78,surface:'dirt',distanceFurlongs:8},
  {figure:80,surface:'dirt',distanceFurlongs:8}
 ],{surface:'dirt',distanceFurlongs:8});
 assert.equal(x.available,true);assert.ok(x.adjustment<0);assert.ok(x.adjustment>=-4);
});
test('contextual figure signal is neutral when running lines are comparable',()=>{
 const x=contextualFigureSignal([{figure:84,surface:'dirt',distanceFurlongs:7},{figure:80,surface:'dirt',distanceFurlongs:7},{figure:82,surface:'dirt',distanceFurlongs:7}],{surface:'dirt',distanceFurlongs:7});
 assert.equal(x.adjustment,0);
});
test('contextual figure signal fails closed without structured running lines',()=>{
 const x=contextualFigureSignal([{figure:90}],{surface:'dirt',distanceFurlongs:7});assert.equal(x.available,false);assert.equal(x.adjustment,0);
});


test('V4.4 pace fit rewards a clear lone-speed advantage but not a pace scrum',()=>{
 const lone={tfEarly:118,odds:'5/2'},field=[lone,{tfEarly:96,odds:'3/1'},{tfEarly:88,odds:'6/1'}];
 assert.equal(paceFitAdjustment(lone,field).adjustment,3);
 const pressed={tfEarly:101,odds:'5/2'},scrum=[pressed,{tfEarly:100,odds:'3/1'},{tfEarly:98,odds:'4/1'},{tfEarly:70,odds:'8/1'}];
 assert.equal(paceFitAdjustment(pressed,scrum).adjustment,-1);
});

test('V4.4 rebound protection limits damage from one anomalous latest figure',()=>{
 const x=reboundProtectionAdjustment({figs:[50,82,80,84]});
 assert.ok(x.adjustment>0);assert.equal(x.latest,50);assert.ok(x.priorMedian>=80);
});

test('V4.4 rebound protection does not rescue a true declining pattern',()=>{
 const x=reboundProtectionAdjustment({figs:[60,70,80,90]});
 assert.equal(x.adjustment,0);
});

test('V4.4 lightly raced upside is small and evidence based',()=>{
 const x=lightlyRacedUpsideAdjustment({lifeStarts:4,figs:[82,76,70]},[90,84,78,74,70]);
 assert.ok(x.adjustment>=1&&x.adjustment<=2);
});

test('V4.4 combined experimental adjustment remains capped at plus/minus six',()=>{
 const h={lifeStarts:4,figs:[50,90,86,82],tfEarly:120,odds:'5/2',tripComments:['No response','','','']};
 const field=[h,{figs:[70],tfEarly:90,odds:'4/1'},{figs:[72],tfEarly:80,odds:'6/1'}];
 const x=experimentalV44Adjustment(h,field);
 assert.ok(x.adjustment<=6&&x.adjustment>=-6);
});


test('V4.4d proven ability requires peak edge plus corroboration',()=>{
 const h={figs:[95,90,84],odds:'4/1'},field=[h,{figs:[88,86,82],odds:'3/1'},{figs:[84,82,80],odds:'5/1'},{figs:[82,80,78],odds:'8/1'}];
 const x=provenAbilityAdjustment(h,field);assert.equal(x.adjustment,2);assert.ok(x.peak>=x.peakMedian+5);
});
test('V4.4d isolated peak receives no proven-ability bonus',()=>{
 const h={figs:[95,80,70],odds:'4/1'},field=[h,{figs:[88,86,70],odds:'3/1'},{figs:[86,84,70],odds:'5/1'},{figs:[84,83,70],odds:'8/1'}];
 assert.equal(provenAbilityAdjustment(h,field).adjustment,0);
});
test('V4.4d modest corroboration earns only plus one',()=>{
 const h={figs:[95,87,70],odds:'4/1'},field=[h,{figs:[88,84,70],odds:'3/1'},{figs:[86,84,70],odds:'5/1'},{figs:[84,83,70],odds:'8/1'}];
 assert.equal(provenAbilityAdjustment(h,field).adjustment,1);
});
test('V4.4d proven ability still respects combined plus six cap',()=>{
 const h={lifeStarts:4,figs:[100,95,90],tfEarly:125,odds:'2/1'};const field=[h,{figs:[80,78,76],tfEarly:90,odds:'4/1'},{figs:[78,76,74],tfEarly:85,odds:'6/1'}];
 const x=experimentalV44Adjustment(h,field);assert.ok(x.contributions.some(y=>y.signal==='proven-ability'));assert.equal(x.adjustment,6);
});
test('V4.4d scratched rivals do not set proven-ability field medians',()=>{
 const h={figs:[96,90,84],odds:'4/1'},field=[h,{figs:[82,80,78],odds:'3/1'},{figs:[120,118,115],odds:'SCR'}];
 assert.ok(provenAbilityAdjustment(h,field).adjustment>0);
});
