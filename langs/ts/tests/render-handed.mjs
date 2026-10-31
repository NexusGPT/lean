// The purity check and the world's writes to handed objects (exec/run.mjs observeWindow, exec/fake.mjs handedMark).
// A render that hands an object to the world sees the world's write (writeHanded); the check's second render starts
// from the state the first started from, so a pure component reads pure. The fixture is R8's BoardRow (apps-ui
// src/blocks/board/BoardRow.tsx, the census copy) and its four mutants, all REFUSE render-impure on the parent from
// lean 59c02366e: the parent against itself must not be refused, each mutant must be a WITNESS.
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Environment } from '../exec/fake.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, 'fixtures/render-handed-boardrow');
const runMjs = path.join(here, '../exec/run.mjs');

// the journal: undone in reverse while a field holds the world's value, replayed while it holds the value before it
const env = new Environment(3);
const card = { title: 'a', count: 1, on: true }, kept = { title: 'k' };
const outer = env.handedMark();
env.writeHanded('w', [card, kept], card);
const log = env.handedTake(outer);
assert.equal(env.handedLog, null);
assert.deepEqual(card, { title: 'a~', count: 2, on: false });
card.count = 7; // the unit's own write after the world's: never undone
env.handedUndo(log);
assert.deepEqual(card, { title: 'a', count: 7, on: true });
env.handedRedo(log);
assert.deepEqual(card, { title: 'a~', count: 7, on: false });
const before = { title: 'b' }; env.writeHanded('w', [before], before); assert.equal(env.handedLog, null); // no mark: nothing journaled

const verdict = (candidate) => {
  const r = spawnSync('node', [runMjs, '--parent', path.join(dir, 'parent.tsx'), '--candidate', path.join(dir, candidate), '--unit', 'BoardRow', '--no-project', '--n', '20', '--ms', '2000'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  try { const o = JSON.parse(r.stdout); return `${o.verdict}${o.verdict === 'REFUSE' ? ` ${o.kind}` : ''}`; } catch { return `no verdict (exit ${r.status}): ${(r.stderr || r.stdout).slice(0, 200)}`; }
};
const got = {};
for (const m of ['parent', 'drop-dep', 'key-index', 'flip-conditional', 'change-text']) got[m] = verdict(`${m}.tsx`);
assert.match(got.parent, /^PASS-(bounded|decided)$/, `BoardRow against itself: ${got.parent}`);
for (const m of ['drop-dep', 'key-index', 'flip-conditional', 'change-text']) assert.equal(got[m], 'WITNESS', `BoardRow ${m}: ${got[m]}`);
console.log(`render-handed: journal undo/redo; BoardRow ${Object.entries(got).map(([m, v]) => `${m} ${v}`).join(', ')}`);
