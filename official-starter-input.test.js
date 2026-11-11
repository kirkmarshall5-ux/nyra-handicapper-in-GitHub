import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOfficialStarterRoster} from './official-starter-input.js';
test('official starter roster requires explicit program and horse identity',()=>{
 assert.equal(parseOfficialStarterRoster(''),null);
 assert.deepEqual(parseOfficialStarterRoster('1 | First Horse\n12 | Safety Off'),[{program:'1',horse:'First Horse'},{program:'12',horse:'Safety Off'}]);
 assert.throws(()=>parseOfficialStarterRoster('12 Safety Off'),/PROGRAM/);
 assert.throws(()=>parseOfficialStarterRoster('1 | A\n1 | B'),/Duplicate/);
});
