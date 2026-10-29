// Regression checks for translator node-shape invariants; run directly or through run.mjs.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { lowerFile } from '../lower.mjs';
import { translate } from '../translate/translate.mjs';

const fixture = (name) => fileURLToPath(new URL(name, import.meta.url));
const ambient = fixture('pairs/new_unit/ambient.ts');
const record = lowerFile(ambient, null, { project: false });
assert.equal(record.units.find((u) => u.unit === 'ambientSafe').refusal, null,
  'an unrelated ambient declaration must not refuse an executable unit');
assert.equal(record.units.find((u) => u.unit === 'notRuntime').refusal.rule, 'unsupported-syntax');
assert.throws(() => translate(ambient, null, { core: true, heap: true, project: false, only: ['notRuntime'] }),
  (e) => e.constructor.name === 'Unsupported' && /function without a body/.test(e.message),
  'selecting a bodiless declaration must reach the named gate refusal');
assert.ok(record.units.every((u) => u.refusal?.rule !== 'translator-crash'));
console.log('translator-crashes: ambient sibling admitted; selected bodiless declaration refused by name');
