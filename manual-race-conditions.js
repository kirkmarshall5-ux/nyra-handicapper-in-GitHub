import {matchingCard} from './dual-pp-cards.js';
export function correctRaceConditions(cards,selected,raceNumber,{surface,furlongs},observedAt=new Date().toISOString()){
 if(!['Dirt','Turf','Synth'].includes(surface))throw Error('Choose Dirt, Turf or Synthetic.');
 const distance=Number(furlongs);if(!Number.isFinite(distance)||distance<2||distance>32||String(furlongs).trim()==='')throw Error('Enter a distance between 2 and 32 furlongs.');
 const anchor=cards[selected],race=anchor?.races?.[raceNumber];if(!race)throw Error('Load a card and select a race first.');
 const updated=structuredClone(cards);
 for(const card of Object.values(updated)){
  const r=card.races?.[raceNumber];if(!r||!matchingCard(anchor,card)||Number(r.race)!==Number(race.race))continue;
  const original=r.manual_conditions?.original||{surface:r.surface,distance_furlongs:r.distance_furlongs??null,dist:r.dist??null,header:r.header??null,conditions:structuredClone(r.conditions||{})};
  r.surface=surface;r.distance_furlongs=distance;r.dist=distance+'F';
  const line=distance+' Furlongs';r.conditions={...(r.conditions||{}),surface,primaryDistanceLine:line,distance_furlongs:distance};
  r.header=line+'\n'+(original.header||'');
  r.manual_conditions={source:'USER_MANUAL_OVERRIDE',observed_at:observedAt,surface,distance_furlongs:distance,original};
 }
 return updated;
}
