import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {parseAnnualJockey,annualJockeyInput,researchRace} from './jockey-research.js';import {websiteRace} from './scoring-engine.js';
test('Source jockey bounded before trainer suffix; year/count/printed-rate verified',()=>{
 const h="PRAT F (12 3 2 1 .25) 2026: (100 24 .24) Tr: FOO J K (2 1 0 0 .50) 2026: (100 20 .20)";
 assert.equal(parseAnnualJockey(h,2026).jockey,'PRAT F');assert.equal(parseAnnualJockey(h,2025).status,'INVALID_HEADER');
 assert.equal(parseAnnualJockey(h.replace('100 24 .24','2 3 .24'),2026).status,'INVALID_HEADER');assert.equal(parseAnnualJockey(h.replace('100 24 .24','100 24 .50'),2026).status,'INVALID_HEADER');
});
test('Unavailable, wrong rider, zero starts fallback; verified zero wins used',()=>{
 const original={j:'PRAT F',jockey_win:20,trainer_win:12,jockey_annual:{status:'SOURCE_COUNTS_VERIFIED',jockey:'PRAT F',year:2026,year_starts:100,year_wins:0}};
 const out=annualJockeyInput(original,2026);assert.equal(out.jockey_win,0);assert.equal(out.trainer_win,12);assert.equal(original.jockey_win,20);
 assert.equal(annualJockeyInput(original,2025).jockey_win,20);
 assert.equal(annualJockeyInput({...original,jockey_annual:{...original.jockey_annual,jockey:'OTHER'}},2026).j1_fallback,true);
 assert.equal(annualJockeyInput({...original,jockey_annual:{...original.jockey_annual,year_starts:0}},2026).jockey_win,20);
 assert.equal(annualJockeyInput({jockey_win:null},2026).jockey_win,null);
});
test('Research retains whole-race PASS and conditional/scratch exclusions',()=>{
 const h={name:'Measured',life_starts:6,beyer_figures:[70],jockey_win:20};const race={date:'2026-07-16',horses:[h,{name:'FTS',life_starts:0,beyer_figures:[]}]};
 assert.equal(researchRace(race).decision,'PASS');assert.equal(researchRace({...race,horses:[h,{...race.horses[1],entry_status:'MTO'}]}).decision,'RATEABLE');
});
test('139 historical races / 1218 source jockey counts, full J1 rankings and scores match Python',()=>{
 const cases=JSON.parse(fs.readFileSync(new URL('./fixtures/j1-historical-parity.json',import.meta.url)));let n=0;
 for(const c of cases){const race={date:c.date,horses:c.horses.map(h=>{const a=parseAnnualJockey(h.annual_header,2026);assert.equal(a.status,'SOURCE_COUNTS_VERIFIED');assert.deepEqual([a.year_starts,a.year_wins],h.annual_expected);n++;return {...h,jockey_annual:a}})};
 const before=JSON.stringify(race),base=websiteRace(race),j1=researchRace(race);assert.equal(base.rankings[0].name,c.baseline_selection);assert.deepEqual(j1.rankings.slice(0,4).map(h=>h.name),c.candidate_top4);assert.equal(j1.fallbacks.length,0);
 for(const h of j1.rankings){assert.ok(Math.abs(h.v44c_unrounded_score-c.scores[h.name])<1e-9);assert.deepEqual(h.v44c_signals,base.rankings.find(x=>x.name===h.name).v44c_signals)}assert.equal(JSON.stringify(race),before);
 }assert.equal(cases.length,139);assert.equal(n,1218);
});
