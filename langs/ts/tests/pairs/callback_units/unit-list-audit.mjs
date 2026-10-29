// Audit saved census identities only: no repository scan and no census lock needed.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { parseUnitList, formatUnitList } from '../../../common.mjs';
const dir = path.resolve('langs/ts/design/callback-units-evidence/after');
const completed = JSON.parse(fs.readFileSync(path.join(dir, 'commands.json'))).filter(r => r.exit === 0);
const counts = { roots: completed.length, units: 0, rawListFailures: 0, multilineNames: 0, encodedNames: 0, roundTripFailures: 0 };
for (const r of completed) {
  const result = JSON.parse(fs.readFileSync(path.join(dir, `${r.cohort}-${r.name}.json`)));
  for (const f of result.records) for (const u of f.units ?? []) {
    counts.units++;
    const names = ['a', u.name, 'b'];
    if (JSON.stringify(parseUnitList(names.join(','))) !== JSON.stringify(names)) counts.rawListFailures++;
    if (/[\r\n\u2028\u2029]/.test(u.name)) counts.multilineNames++;
    if (formatUnitList([u.name]) !== u.name) counts.encodedNames++;
    const emitted = formatUnitList(names);
    if (/[\r\n\u2028\u2029]/.test(emitted) || JSON.stringify(parseUnitList(emitted)) !== JSON.stringify(names)) counts.roundTripFailures++;
  }
}
fs.writeFileSync(path.resolve(dir, '../unit-list-corpus.json'), JSON.stringify(counts, null, 2) + '\n');
console.log(JSON.stringify(counts));
assert.equal(counts.roundTripFailures, 0);
