// Decode only the anchored historical condition prefix, not later fractions/comments.
// Glyphs are specific to the verified Premium Plus text layer; no provider conversion.
export const PREMIUM_CONDITIONS_ID='BRISNET-PREMIUM-CONDITIONS-v3';
export function premiumHistoryConditions(text){
 const unknown=reason=>({furlongs:null,surface:null,going:null,condition_evidence:{status:'UNRESOLVED',reason}});
 const prefix=String(text||'').match(/^\d{2}[A-Za-z]{3}\d{2}[A-Za-z]+[^\s]*\s+(.+)$/);
 if(!prefix)return unknown('Historical date/track prefix unverified');
 const m=prefix[1].match(/^([à•šæÌ˜~]?)\s*(\*?)(\d+(?:[½¼¾ˆ„‰‚…ÑÐ]|\.\d+)?)(f|m)?\s+(ft|fm|gd|sy|my|yl|sf|hy|wf|sl)\b/);
 if(!m)return unknown('Historical distance/surface token unsupported');
 const [raw,marker,about,token,unit,going]=m,base=parseFloat(token),glyph=token.at(-1),fractions={'½':.5,'¼':.25,'¾':.75,'ˆ':1/16,'„':1/8,'‰':3/16,'‚':1/4,'…':3/8};
 if(!Number.isFinite(base)||base<=0||['Ñ','Ð'].includes(glyph)&&(unit||base!==1))return unknown('Invalid or unsupported historical distance');
 const yards=glyph==='Ñ'?70:glyph==='Ð'?40:null;
 const furlongs=yards!==null?8+yards/220:(base+(fractions[glyph]||0))*(unit==='f'||base>=4?1:8);
 const courses={'à':['Turf','MAIN_TURF'],'•':['Turf','INNER_TURF'],'˜':['Turf','TURF'],'~':['Turf','TURF'],'Ì':['Synth','ALL_WEATHER'],'æ':['Synth','OFF_TURF_ALL_WEATHER'],'š':['Dirt','OFF_TURF_DIRT']};
 const inferred=/^(fm|yl|sf|hy)$/.test(going)?['Turf','TURF_FROM_GOING']:['Dirt','MAIN_DIRT'];
 const [surface,course]=courses[marker]||inferred;
 if((surface==='Dirt'||surface==='Synth')&&/^(fm|yl|sf|hy)$/.test(going))return unknown('Surface marker and going conflict');
 return {furlongs,surface,going,condition_evidence:{status:'SOURCE_TOKEN_VERIFIED',parser:PREMIUM_CONDITIONS_ID,raw,marker:marker||null,course,approximate:!!about,distance_token:token,distance_unit:unit||null,yards_extension:yards}};
}
