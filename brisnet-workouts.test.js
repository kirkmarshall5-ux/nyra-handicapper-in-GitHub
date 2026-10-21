import test from 'node:test';import assert from 'node:assert/strict';
import {parseBrisnetWorkouts as parse} from './brisnet-workouts.js';
const row=text=>({text,pageNumber:2,y:150});
test('dates, fifths, bullet, training track, turf annotation and rank remain source evidence',()=>{
 const r=parse([row('×16Oct Bel tr.t 4f ft :48¨ Bg 1/20 03Oct Sar tr.t ˜ (d) 5f fm 1:01« B 4/10')],'2026-10-21');
 assert.equal(r.workouts.length,2);assert.equal(r.workouts[0].seconds,48.2);assert.equal(r.workouts[1].seconds,61.8);assert.equal(r.workouts[1].track_text,'Sar tr.t ˜ (d)');assert.equal(r.workouts[0].source.page,2);assert.equal(r.workouts[0].bullet,true);assert.equal(r.scoring_enabled,false);
});
test('explicit years and year rollover retained; calendar mistakes, invalid ranks and future dates held',()=>{
 const r=parse([row("02Jan Bel 3f ft :37 B 2/8 12Dec'25 Bel 4f ft :50© B 1/10")],'2026-01-05');assert.deepEqual(r.workouts.map(x=>x.date),['2026-01-02','2025-12-12']);assert.equal(r.workouts[1].date_year_source,'PRINTED_YEAR');
 for(const text of ["30Feb Bel 4f ft :48 B 1/10","22Oct'26 Bel 4f ft :48 B 1/10",'10Oct Bel 4f ft :48 B 12/10','10Oct Bel 4f ft :65 B 1/10']){const x=parse([row(text)],'2026-10-21');assert.equal(x.workouts.length,0);assert.equal(x.unresolved.length,1);assert.equal(x.workout_status,'PARTIAL_SOURCE_EXTRACTION');}
});
test('unrecognized records are retained, not silently discarded or borrowed from another horse',()=>{
 const text='10Oct Bel 4f ft :48 B 2/10 03Oct Bel unsupported';const r=parse([row(text)],'2026-10-21');assert.equal(r.workouts.length,1);assert.equal(r.unresolved.length,1);assert.equal(r.unresolved[0].text,'03Oct Bel unsupported');assert.equal(parse([],'2026-10-21').workout_status,'NO_PRINTED_WORKOUTS');
});
