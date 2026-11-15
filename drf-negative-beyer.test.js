import test from 'node:test';import assert from 'node:assert/strict';
import {restoredPage,parseRestoredCard} from './release-card-parser.js';
import {releaseRace} from './rankings-release.js';
import {rankContenders} from './contender-rankings.js';
import {rankFinishers} from './finisher-inputs.js';
import {modelEvidence} from './model-evidence-display.js';
const item=(str,fontName,x)=>({str,fontName,transform:[1,0,0,1,x,20]});
function card(figure){
 const texts=['1','Saratoga OC','SIX FURLONGS.','1','5 - 1','Measured Horse','Own: Stable','Life 1 M 0 0 $0','TimeformUS Pace: Early 60 Late 43','1Û26=1Sar fst 6f '+figure+' 1/5','WORKS:','Daily Racing Form','Saratoga (7/17/2026)','Sar, race 1, page:1'];
 const token=String(figure).replace('−','-');const proofs=token==='-'?[]:[{figure:+token,post:1,field_size:5,font:'Paddock-Bold',page:1}];
 return parseRestoredCard([{pageNumber:1,lines:texts.map(text=>({text,page:1,proofs:text.startsWith('1Û26')?proofs:[]}))}]);
}
test('font and post anchors retain numeric negatives and zero; dash stays unavailable',()=>{
 for(const [token,want] of [['-12',-12],['−12',-12],['0',0]]){
  const p=restoredPage([item(token,'bold',212),{...item('1/5 3','regular',222),hasEOL:true}],1,{bold:'Paddock-Bold'});
  assert.equal(p.lines[0].proofs[0].figure,want);
 }
 for(const [token,font] of [['-','bold'],['-12','regular']])assert.equal(restoredPage([item(token,font,212),{...item('1/5 3','regular',222),hasEOL:true}],1,{bold:'Paddock-Bold'}).lines[0].proofs.length,0);
});
test('verified negative remains numerical through all deployed DRF models',()=>{
 for(const f of [-12,0]){
  const r=card(f).races[1];assert.deepEqual(r.horses[0].beyer_figures,[f]);
  assert.equal(releaseRace(r).decision,'RATEABLE');assert.equal(releaseRace(r).rankings[0].base_rating,f);
  assert.equal(rankContenders(r,releaseRace(r)).rankings.length,1);assert.equal(rankFinishers(r).rankings.length,1);
 }
});
test('dash-only prior starter stays PASS with pace and descriptive missing-Beyer label',()=>{
 const r=card('-').races[1],h=r.horses[0],base=releaseRace(r);
 assert.equal(h.life_starts,1);assert.equal(h.timeform_early,60);assert.equal(h.timeform_late,43);assert.deepEqual(h.beyer_figures,[]);
 assert.equal(h.beyer_source_status,'PRIOR_START_NUMERICAL_BEYER_UNAVAILABLE');assert.equal(base.decision,'PASS');
 assert.deepEqual(modelEvidence(r,base).unranked[0].reasons,['Prior start verified; numerical Beyer unavailable']);
});
