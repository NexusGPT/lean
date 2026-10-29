import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import * as common from '../../../common.mjs';
test('unit artifact names round-trip punctuation without creating directories', () => {
  const unit = "outer/app.get('/a')#1";
  const encoded = common.artifactName(unit);
  assert.equal(decodeURIComponent(encoded), unit);
  assert.equal(path.basename(encoded), encoded);
  assert.equal(common.artifactName('ops.add'), 'ops.add');
  assert.equal(common.artifactName('plain'), 'plain');
  assert.notEqual(common.artifactName('a/b'), common.artifactName('a%2Fb'));
  const dir = path.resolve('.lean/cache/callback-units/artifacts'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `b_${encoded}.json`), JSON.stringify({ unit }));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, `b_${common.artifactName(unit)}.json`))), { unit });
});
test('every existing pair unit still finds the artifact it wrote', () => {
  const pairs = new URL('../', import.meta.url).pathname, names = new Set(); let pairsRead = 0;
  for (const name of fs.readdirSync(pairs)) {
    const file = path.join(pairs, name, 'expect.json'); if (!fs.existsSync(file)) continue;
    const exp = JSON.parse(fs.readFileSync(file)); pairsRead++;
    for (const key of ['b', 'states', 'programs', 'envPrograms', 'deep', 'schedules', 'races', 'patch', 'check', 'through', 'library'])
      for (const unit of Object.keys(exp[key] ?? {})) names.add(unit);
  }
  const dir = path.resolve('.lean/cache/callback-units/artifacts'); fs.mkdirSync(dir, { recursive: true });
  const encoded = new Map();
  for (const unit of names) {
    const name = common.artifactName(unit); assert.equal(encoded.has(name), false); encoded.set(name, unit);
    const file = path.join(dir, `b_${name}.json`); fs.writeFileSync(file, JSON.stringify({ unit }));
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, `b_${common.artifactName(unit)}.json`))).unit, unit);
  }
  console.log(JSON.stringify({ pairsRead, distinctUnits: names.size }));
});
