import test from 'node:test';import assert from 'node:assert/strict';
import {ppContext,datedWorkoutText,fieldConnections} from './pp-context.js';
const header="FRANCO M (48 10 6 4 .21) 2026: (1085 235 .22) Sire: Kitten's Joy (El Prado*Ire) $50,000 Dam:Endless Fancy (Ghostzapper) Br: Farm Tr: Clement Miguel(20 4 3 3 .20) 2026:(401 71 .18) Life 10";
test('local records and pedigree use the individual PP header, not annual or trainer-angle rates',()=>{
 const c=ppContext(header,'WORKS: æ25Bel4f fst :49© B 5/10 TRAINER: Turf(539 .19 $1.81)');
 assert.equal(c.jockey.name,'FRANCO M');assert.equal(c.jockey.starts,48);assert.equal(c.jockey.wins,10);assert.equal(c.trainer.starts,20);assert.equal(c.trainer.win,20);
 assert.equal(c.sire,"Kitten's Joy (El Prado*Ire) $50,000");assert.equal(c.dam,'Endless Fancy (Ghostzapper)');assert.equal(c.workout_text,'æ25Bel4f fst :49© B 5/10');
 assert.equal(ppContext(header.replace('48 10 6 4 .21','48 10 6 4 .50'),'').jockey,null);
 assert.equal(ppContext(header.replace('20 4 3 3 .20','2 4 3 3 .20'),'').trainer,null);
});
test('workout dates expose inferred year and roll December back for a January card',()=>{
 assert.equal(datedWorkoutText('ã28Bel4f fst :49 B 1/10','2026-01-07'),'2025-12-28 [year inferred] Bel4f fst :49 B 1/10');
 assert.equal(datedWorkoutText('æ25Bel4f fst :49 B 5/10','2026-10-07'),'2026-09-25 [year inferred] Bel4f fst :49 B 5/10');
});
test('field records deduplicate snapshots without adding starts; conflicts and excluded runners are omitted',()=>{
 const c=ppContext(header,''),h={source_context:c};
 assert.equal(fieldConnections([h,h],'jockey')[0].starts,48);
 assert.equal(fieldConnections([h,{source_context:{jockey:{...c.jockey,starts:49}}}],'jockey').length,0);
 assert.equal(fieldConnections([{...h,odds:'SCR'},{...h,included_in_frozen_field:false}],'jockey').length,0);
});
