import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');

test('Race Day notes follow active card and race, including card replacement',()=>{
  const fn=html.match(/function syncRaceNotes\(\)\{[^\n]+\}/)?.[0];
  assert.ok(fn,'notes synchronization helper must exist');
  assert.match(html,/function renderAll\(\)\{syncRaceNotes\(\);/,'every render must synchronize notes');
  const context={
    raceNotes:{value:''},
    state:{cards:{A:{notes:{1:'A first',2:'A second'}},B:{notes:{1:'B first'}}}},
    activeCard:{id:'A'},
    race:{race:2}
  };
  vm.runInNewContext(fn+'; syncRaceNotes();',context);
  assert.equal(context.raceNotes.value,'A second');
  context.activeCard.id='B';
  context.race.race=1;
  vm.runInNewContext('syncRaceNotes();',context);
  assert.equal(context.raceNotes.value,'B first');
  context.race.race=2;
  vm.runInNewContext('syncRaceNotes();',context);
  assert.equal(context.raceNotes.value,'','new card must not show old notes');
});

test('candidate win lines are visibly experimental and not betting approval',()=>{
  assert.match(html,/function candidateTable\(rows\).*Experimental, uncalibrated estimates — no betting authorization/);
  assert.match(html,/Est\. Fair Odds<\/th>/);
  assert.match(html,/Est\. Win %<\/th>/);
  assert.doesNotMatch(html,/True Chance<\/th>/);
  assert.match(html,/BETTING: PASS — validation pending/);
  assert.match(html,/Best Value: PASS — probability validation pending/);
});
