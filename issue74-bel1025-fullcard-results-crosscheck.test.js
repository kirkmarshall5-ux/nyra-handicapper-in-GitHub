import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const card = load('./audits/belmont-2026-10-25-fullcard-public-results-crosscheck.json');
const r9 = load('./audits/belmont-2026-10-25-r9-nyra-results-crosscheck.json');
const sorted = xs => [...xs].sort((a,b)=>Number(a)-Number(b));

test('all nine published results reconcile one-to-one with saved source rosters', () => {
  assert.equal(card.races.length,9);
  assert.deepEqual(card.races.map(r=>r.race),[1,2,3,4,5,6,7,8,9]);
  for(const race of card.races){
    const roster=race.saved_roster_programs,finish=race.finish_order_programs;
    assert.equal(new Set(roster).size,roster.length,'duplicate roster program R'+race.race);
    assert.equal(new Set(finish).size,finish.length,'duplicate finisher R'+race.race);
    assert.ok(finish.every(p=>roster.includes(p)),'result absent from source roster R'+race.race);
    assert.deepEqual(sorted(race.published_nonstarters),sorted(roster.filter(p=>!finish.includes(p))));
    assert.ok(race.missing_published_starters_from_dashboard.every(p=>finish.includes(p)));
    assert.ok(race.published_starters_unranked_by_brisnet.every(p=>finish.includes(p)));
    assert.equal(race.saved_brisnet_decision,'PASS');
    assert.equal(race.prospective_gradeable,false);
  }
});

test('R9 agrees with separately published NYRA source and remains incomplete',()=>{
  const race=card.races[8];
  assert.deepEqual(race.finish_order_programs,r9.official_field.finish_order_programs);
  assert.deepEqual(sorted(race.published_nonstarters),sorted(r9.official_field.scratched_programs));
  assert.deepEqual(race.missing_published_starters_from_dashboard,['13']);
  assert.deepEqual(race.published_starters_unranked_by_brisnet,['13']);
});

test('R2 and R4 explicitly preserve unranked starters without certifying',()=>{
  assert.deepEqual(card.races[1].published_starters_unranked_by_brisnet,['4','6','7','9']);
  assert.deepEqual(card.races[3].published_starters_unranked_by_brisnet,['1']);
  assert.equal(card.private_freeze.clock_source,'browser-device-unverified');
  assert.match(card.status,/NOT_OFFICIAL_CHART_CERTIFIED/);
});
