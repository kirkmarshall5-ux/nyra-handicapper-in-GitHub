export function oddsNumber(o){if(!o||o==="SCR")return null;if(/^\d+(\.\d+)?$/.test(String(o)))return +o;if(String(o).includes("/")){const [a,b]=String(o).split("/").map(Number);return b>0&&Number.isFinite(a)?a/b:null}return null}
export function priceEdge(available,fair){const a=oddsNumber(available),f=oddsNumber(fair);return a!==null&&f!==null?(a+1)/(f+1)-1:null}
export function requiredEdge(confidence){return confidence==="High"?.20:confidence==="Medium"?.30:Infinity}
export function winDecision(row){const edge=priceEdge(row.odds,row.fairOdds),need=requiredEdge(row.confidence);return {edge,required:need,play:Number.isFinite(edge)&&edge>=need&&Number.isFinite(row.rating)}}
export function exoticDecision(rows){
 const ranked=[...rows].filter(r=>Number.isFinite(r.rating)).sort((a,b)=>b.rating-a.rating);
 if(ranked.length<3)return {play:false,reason:"Not enough rated runners"};
 const [a,b]=ranked, gap=a.rating-b.rating, value=ranked.find(r=>r.id!==a.id&&winDecision(r).play);
 const play=a.confidence!=="Low"&&(gap>=5||!!value);
 return {play,key:a,backup:b,value,gap,reason:play?"A credible key or value runner exists":"Top ratings are too close or key confidence is low"};
}
export function multiRaceDecision(rows){
 const ranked=[...rows].filter(r=>Number.isFinite(r.rating)).sort((a,b)=>b.rating-a.rating);
 if(ranked.length<2)return {single:false,reason:"Insufficient ratings"};
 const gap=ranked[0].rating-ranked[1].rating;
 const single=ranked[0].confidence==="High"&&gap>=7;
 return {single,key:ranked[0],gap,reason:single?"High-confidence separation supports a single":"No high-confidence separation; spread selectively"};
}
