export function parseNyraText(text,{track="belmont",date="",race=1}={}){
 let lines=text.split(/\n+/).map(x=>x.trim()).filter(Boolean); let out={track:({saratoga:"Saratoga",aqueduct:"Aqueduct",belmont:"Belmont Park"}[track]||"Belmont Park"),date:date,race:+race,horses:[]};
 let joined=" "+lines.join(" ")+" "; const headings=lines.filter(l=>/^Race\s+\d+(?:\s+\d+\s+MTP)?$/.test(l));if(headings.length===1)out.race=+headings[0].match(/\d+/)[0];
 let raceMatch=joined.match(/Race\s+(\d+).*?\$(\d[\d,]*)\s+([A-Za-z ]+?)(?=\s+\d| \d\/|\s+\dF|\s+\dM)/i); if(raceMatch){if(!headings.length)out.race=+raceMatch[1];out.cls="$"+raceMatch[2]+" "+raceMatch[3].trim()}
 let dist=joined.match(/\b(\d+(?:\s+\d\/\d)?F|\d+(?:\s+\d\/\d)?M)\b/i); if(dist)out.dist=dist[1];
 let surf=joined.match(/\b(Dirt|Turf|Tapeta)\b/i); if(surf)out.surface=surf[1];
 let post=joined.match(/(\d{1,2}:\d{2}\s*[ap](?:m)?)/i); if(post)out.post=post[1].toUpperCase();
 // Heuristic blocks: horse name line, then "Jockey • Trainer", then program number and odds in following lines.
 for(let i=0;i<lines.length;i++){
   if(lines[i].includes("•") && i>0){
      const [j,t]=lines[i].split("•").map(x=>x.trim()); const name=lines[i-1].replace(/^[\d\s-]+/,"").trim();
      let n=null, odds="", ml="";
      for(let k=i+1;k<Math.min(lines.length,i+8);k++){if(lines[k+1]?.includes("•"))break;if(n===null && /^\d{1,2}$/.test(lines[k]))n=+lines[k]; if(/^(SCR|\d+\/\d+)$/.test(lines[k])){if(lines[k].startsWith("ML"))ml=lines[k].replace("ML","").trim();else if(!odds)odds=lines[k]} if(/^ML\s+\d+\/\d+/.test(lines[k]))ml=lines[k].replace(/^ML\s+/,"")}
      if(name && n)out.horses.push({n,name,j,t,odds:odds||"—",ml:ml||"—",style:"P"});
   }
 }
 return out.horses.length?out:null;
}
