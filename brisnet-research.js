// Separate research profile; the original Brisnet engine and coefficients are untouched.
import {rankBrisnetModels} from './brisnet-models.js';
import {MODEL} from './contender-model.js';
export const BRISNET_RESEARCH_ID='BRISNET-BEST063400-LATE25-EARLY75-20261104';
export const BRISNET_RESEARCH_PROFILE=Object.freeze({best_recent:MODEL.contender.coefficients[1]+MODEL.contender.coefficients[2],late_multiplier:.25,early_multiplier:.75,trend_multiplier:0});
export function rankBrisnetResearch(race){
 const base=rankBrisnetModels(race)?.contender;
 if(!base)return null;
 const factors=MODEL.features.map((_,j)=>j<=5?(j===2?BRISNET_RESEARCH_PROFILE.best_recent/MODEL.contender.coefficients[2]:0):j===6?.75:j===7?.25:1);
 const rankings=base.rankings.map(h=>{const parts=h.feature_contributions.map((v,j)=>v*factors[j]);return {...h,feature_contributions:parts,trend_adjustment:0,score:parts.reduce((a,b)=>a+b,0)};}).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).map((h,i)=>({...h,rank:i+1,v44c_rank:i+1,v44c_unrounded_score:h.score,v44c_display_score:Math.round(h.score*10)/10}));
 return {...base,model_id:BRISNET_RESEARCH_ID,profile:BRISNET_RESEARCH_PROFILE,rankings,runners:rankings,method:'Research: best Speed in latest three actual starts at 0.6340027300148168; Late at 25% and Early at 75% of original coefficients. Other speed terms and matched speed trend neutral. Original connections, layoff, source and field gates retained.'};
}
