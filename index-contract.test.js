import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
test('browser module script remains syntactically valid',async()=>{const html=await readFile('index.html','utf8');const m=html.match(/<script type="module">([\s\S]*?)<\/script>/);assert.ok(m);const body=m[1].replace(/^import .*;$/gm,'');assert.doesNotThrow(()=>new Function(body));});
test('credibility gates and NYRA merge are wired into the UI',async()=>{const html=await readFile('index.html','utf8');assert.match(html,/DATA CHECK FAILED — ratings withheld/);assert.match(html,/function mergeNyraRace/);assert.match(html,/requested race number remains authoritative/);assert.match(html,/ppHorseBlock/);});
test('rating engine does not force field min-max scores and honors UI weights',async()=>{const html=await readFile('index.html','utf8');const score=html.slice(html.indexOf('function score(h){'),html.indexOf('function confidenceBadge'));assert.doesNotMatch(score,/45\+50\*/);assert.match(score,/weight:weights\.fig/);assert.match(score,/weight:weights\.trainer/);assert.match(score,/first-time starter/i);});

// Whole-field probability safety: incomplete active fields must never be
// renormalized into misleading fair odds or wager recommendations.
assert.match(html, /field\.some\(x=>!Number\.isFinite\(x\.rating\)\)/, "fair odds must require every active runner to be rated");
assert.match(html, /NO BET — INCOMPLETE HANDICAP/, "bet builder must hard-stop on an incomplete rated field");
