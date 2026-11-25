import {activeRunner} from './active-field.js';
import {rankBrisnetResearch} from './brisnet-research.js';
import {scoreTapetaO,TAPETA_O_ID} from './rr-tapeta-o.js';
// Conservative adapter: require the printed synthetic marker in the historical
// distance token, not just a normalized surface or a track-level assumption.
export function explicitSyntheticLine(line,raceDate){
 const text=line?.source?.text||'';
 const prefix=text.match(/^\s*\d{1,2}[A-Za-z]{3}\d{2}\s*\S+\s+([^\s]*Ì[^\s]*|Ì\s*[^\s]+)\s+(?:ft|gd|sy|my|wf|sl)\b/i);
 if(!prefix||line.source.provider!=='BRISNET'||line.surface!=='Synth'||!/^\d{4}-\d{2}-\d{2}$/.test(line.date||'')||!Number.isFinite(Date.parse(line.date))||line.date>=raceDate)return null;
 if(!['e1','e2','late','speed'].every(k=>Number.isFinite(line[k])&&line[k]>=0))return null;
 // Only independently unambiguous distance tokens are eligible for matching.
 if(line.condition_evidence&&(line.condition_evidence.status!=='SOURCE_TOKEN_VERIFIED'||line.condition_evidence.marker!=='Ì'))return null;
 const token=prefix[1].replace(/Ì/g,'').trim();
 const m=token.match(/^([4-9])([½¼¾]?)(?:f)?$/);
 const miles={'1m':8,'1ˆ':8.5,'1„':9};
 const furlongs=m?+m[1]+({'½':.5,'¼':.25,'¾':.75}[m[2]]||0):miles[token]??null;
 return {...line,furlongs,explicitSynthetic:true};
}
export function rankRRTapeta(race,base){
 if(race?.surface!=='Synth'||race.ratings_provider!=='BRISNET')return null;
 base=base??rankBrisnetResearch(race);
 if(!base)return null;
 const field=(race.horses||[]).filter(activeRunner);
 const pass=reason=>({...base,model_id:TAPETA_O_ID,decision:'PASS',available:false,reason,rankings:[],runners:[],researchOnly:true});
 if(base.decision!=='RATEABLE'||field.length<2||!Number.isFinite(race.distance_furlongs)||race.distance_furlongs<=0||!Number.isFinite(Date.parse(race.date)))return pass('Complete rateable RR field and dated synthetic conditions required');
 const byProgram=new Map(field.map(h=>[String(h.n),h]));
 if(byProgram.size!==field.length||base.rankings.length!==field.length||new Set(base.rankings.map(h=>String(h.n))).size!==field.length||base.rankings.some(h=>!byProgram.has(String(h.n))||!Number.isFinite(h.score)))return pass('RR and active field do not match');
 const runners=base.rankings.map(h=>({...h,syntheticLines:(byProgram.get(String(h.n)).ratings?.lines||[]).map(l=>explicitSyntheticLine(l,race.date)).filter(Boolean)}));
 const scored=scoreTapetaO({distance:race.distance_furlongs,runners});
 const rankings=scored.rankings.map(({syntheticLines,...h})=>({...h,v44c_rank:h.rank}));
 return {...base,...scored,rankings,runners:rankings,method:'Tapeta O research: explicit synthetic evidence; neutral missing inputs; RR base unchanged.',syntheticCoverage:runners.filter(h=>h.syntheticLines.length).length};
}
