import {adjustment,pythonRound} from './scoring-engine.js';
// Display-only diagnostic: do NOT turn PASS races into RATEABLE races or modify frozen rankings.
export function passRaceDisplay(rating){
 if(rating.decision!=='PASS')return null;
 const runners=rating.runners||[];
 const ranked=runners.filter(h=>typeof h.base_rating==='number'&&Number.isFinite(h.base_rating)&&!(h.parser_blockers||[]).length).map(h=>{
  const a=adjustment(h,runners);
  const score=h.base_rating+a.value;
  return {n:h.n,name:h.name,score,displayScore:pythonRound(score),signals:a.signals};
 }).sort((a,b)=>b.score-a.score||(a.name<b.name?-1:a.name>b.name?1:0)).slice(0,4);
 const unrated=runners.filter(h=>h.unrated_reason||(h.parser_blockers||[]).length).map(h=>({n:h.n,name:h.name,reasons:[...(h.unrated_reason?[h.unrated_reason]:[]),...(h.parser_blockers||[])]}));
 const general=(rating.pass_reasons||[]).filter(x=>!x.horse).map(x=>x.reason);
 return {ranked,unrated,general};
}
