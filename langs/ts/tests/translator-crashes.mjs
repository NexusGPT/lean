// Regression checks for translator node-shape invariants; run directly or through run.mjs.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { lowerFile } from '../lower.mjs';
import { translate } from '../translate/translate.mjs';
import { readingOfRefusal } from '../readings.mjs';

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
for (const name of ['shadowed-builtins.ts', 'generic-shadowed-builtins.ts']) {
  const row = lowerFile(fixture(`translator-crash-fixtures/${name}`), null, { project: false });
  if (name === 'shadowed-builtins.ts') for (const cls of ['Set', 'ReadonlySet', 'Map', 'ReadonlyMap']) {
    const refusal = row.units.find((u) => u.unit === `${cls}.constructor`).refusal;
    assert.equal(refusal?.id, 'types', `${cls}.constructor: ${JSON.stringify(refusal)}`);
    assert.match(refusal.reason, /builtin-type:/);
  }
  for (const unit of ['setValue', 'readonlySetValue', 'mapValue', 'readonlyMapValue']) {
    assert.throws(() => translate(fixture(`translator-crash-fixtures/${name}`), null,
      { core: true, heap: false, project: false, only: [unit] }),
    (e) => e.constructor.name === 'Unsupported' && readingOfRefusal(e.message) === 'types' && /builtin-type:/.test(e.message),
    `${name}: ${unit} must have a named type refusal`);
  }
  assert.ok(row.units.every((u) => u.refusal?.rule !== 'translator-crash'), `${name}: no unit may crash`);
}
const library = lowerFile(fixture('translator-crash-fixtures/library-builtins.ts'), null, { project: false });
assert.ok(library.units.every((u) => !u.refusal), JSON.stringify(library.units.map((u) => [u.unit, u.refusal])));
console.log('translator-crashes: ambient sibling admitted; selected bodiless declaration refused by name');
console.log('translator-crashes: native type identity checked; shadowed builtins refused; library aliases admitted');
