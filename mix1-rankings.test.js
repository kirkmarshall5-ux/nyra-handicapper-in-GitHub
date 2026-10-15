import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rankMix1,MIX1_WEIGHTS,mix1Profile,mix1Distance} from './mix1-rankings.js';
import {releaseRace} from './rankings-release.js';
import {rankContenders} from './contender-rankings.js';
const horse=(n,figures=[80,70,60],extra={})=>({n:String(n),name:'Runner '+n,life_starts:10,beyer_figures:figures,timeform_early:90,timeform_late:80,jockey_win:20,trainer_win:20,entry_status:'REGULAR',parser_blockers:[],beyer_evidence:figures.map((figure,i)=>({figure,running_date_track:`${10-i}æ26= 1Bel`,source_line:`${10-i}æ26= 1Bel fst 6f ${figure} 1 /8`,font:'Paddock-Bold',post:1,field_size:8})),switch_evidence:{running_lines:[],boxes:{}},...extra});
const race=horses=>({date:'2026-10-15',surface:'Dirt',conditions:{primaryDistanceLine:'6 Furlongs',surface:'Dirt'},header:'6 Furlongs',horses,parser_blockers:[]});
test('retained recent-two and older3–5 components, original models and inputs preserved',()=>{
 const r=race([horse(1,[90,70,50,95,60]),horse(2,[80,80,60,60,60]),horse(3,[60,60,50,50,50])]);
 const before=structuredClone(r),baseline=releaseRace(r),contender=rankContenders(r,baseline),a=rankMix1(r,baseline);
 assert.equal(a.decision,'RATEABLE');assert.deepEqual(MIX1_WEIGHTS,{recent:37,older:12,jockey:7,trainer:17,early:17,surfaceDistance:10});
 const h=a.rankings.find(h=>h.n==='1');assert.equal(h.raw_features.recent,80);assert.equal(h.raw_features.older,95);assert.equal(h.raw_features.surfaceDistance,70);
 assert.equal(h.available_weight,100);assert.equal(h.effective_weights.recent,.37);assert.equal(h.effective_weights.older,.12);
 assert.deepEqual(r,before);assert.deepEqual(releaseRace(r),baseline);assert.deepEqual(rankContenders(r,baseline),contender);assert.deepEqual(rankMix1(r,baseline),a);
 assert.equal(a.probabilityCalibrated,false);assert.equal(a.bettingEnabled,false);
});
test('missing source components redistribute weights, verified zero remains measured',()=>{
 const r=race([horse(1,[0],{jockey_win:null,trainer_win:null,timeform_early:null}),horse(2)]),h=rankMix1(r).rankings.find(h=>h.n==='1');
 assert.equal(h.raw_features.recent,0);assert.equal(h.raw_features.older,null);assert.equal(h.raw_features.surfaceDistance,null);assert.equal(h.available_weight,37);assert.equal(h.effective_weights.recent,1);assert.equal(h.score,0);
});
test('point adjustment excludes pace, maps six points linearly to15%, and caps',()=>{
 const r=race([horse(1),horse(2),horse(3)]),base=releaseRace(r);
 base.runners[0].v44c_signals=[['pace-fit',3],['rebound-protection',2],['field-relative',1]];
 base.runners[1].v44c_signals=[['field-relative',-20]];
 base.runners[2].v44c_signals=[['field-relative',20]];
 const rows=rankMix1(r,base).rankings;
 assert.equal(rows.find(h=>h.n==='1').multiplier,1.075);assert.equal(rows.find(h=>h.n==='2').multiplier,.85);assert.equal(rows.find(h=>h.n==='3').multiplier,1.15);
});
test('whole-field ties use50percentiles; a sole observed optional value scores50',()=>{
 const r=race([horse(1),horse(2)]);
 r.horses[1]=horse(2,[80,70,60],{jockey_win:null});
 const rows=rankMix1(r).rankings;assert.equal(rows.find(h=>h.n==='1').component_scores.jockey,50);
 const ties=rankMix1(race([horse(2),horse(1)]));assert.deepEqual(ties.rankings.map(h=>h.n),['1','2']);
});
test('PASS, FTS, stale evidence, scratch and conditional guards remain in force',()=>{
 const r=race([horse(1),horse(2),horse(3)]);r.horses[0].life_starts=0;
 assert.equal(rankMix1(r).decision,'PASS');assert.deepEqual(rankMix1(r).rankings,[]);
 const stale=race([horse(1),horse(2)]);delete stale.horses[0].beyer_evidence;assert.equal(rankMix1(stale).decision,'HOLD');
 const field=race([horse(1),horse(2,[80],{odds:'SCR'}),horse(3,[80],{entry_status:'AE'}),horse(4,[80],{entry_status:'MTO'})]);assert.deepEqual(rankMix1(field).rankings.map(h=>h.n),['1']);
 const bris=race([horse(1)]);bris.parser_blockers=['BRISNET_SOURCE_MODEL_VALIDATION_PENDING'];assert.equal(rankMix1(bris).decision,'PASS');
});
test('surface/distance parser keeps exact frozen horizon and fractions',()=>{
 assert.equal(mix1Distance({...race([]),conditions:{primaryDistanceLine:'1Â MILES'}}),8.5);
 assert.equal(mix1Distance({...race([]),conditions:{primaryDistanceLine:'6 Furlongs',unsupported:true}}),null);
 const p={figure:0,running_date_track:'15å25= 1Bel',source_line:'15å25= 1Bel fm 1Â ê 0 1 /8'};
 assert.deepEqual(mix1Profile(p,'2026-10-15'),{date:'2025-10-15',figure:0,distance:8.5,surface:'Turf'});
 assert.equal(mix1Profile(p,'2026-10-16'),null);assert.equal(mix1Profile(p,'2025-10-15'),null);
 assert.equal(mix1Profile({...p,running_date_track:'31á26= 1Bel'},'2026-10-15'),null);
});
test('Race Day includes MIX1 beside controls and shows experimental win-line estimates',()=>{
 const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
 const start=html.indexOf('Top 4 Win Candidates-V4.4c'),end=html.indexOf('Top 3 morning-line favorites');
 const panels=html.slice(start,end);assert.match(panels,/Top 4 Win Candidates-Contender/);assert.match(panels,/Top 4 Win Candidates-MIX1/);assert.match(panels,/id="mix1Candidates"/);
 assert.match(html,/const mix1=rankMix1\(race,r\)/);assert.ok(html.includes("estimatedWinLine(race,mix1,'mix1')"));assert.ok(html.includes('winLineFields(mix1Line,h)'));assert.ok(html.includes('winLineNote(mix1Line)'));assert.match(html,/Best Value: PASS — probability validation pending/);
});
