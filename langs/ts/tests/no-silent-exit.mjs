// a run never ends without a verdict. A pair that drains the event loop before a verdict (a module that makes every
// promise chained through `then` never settle) and a pair whose inputs outgrow the fake path budget (a harness error
// that used to escape into the late-error hooks and end the run with status 0 and no output) each end in an ASK, on
// stdout and in --out, with exit 2. A wide record (a long heap shape key) and records nested past the heap enumerator's
// depth, both silent exits before, get a verdict. A same-package helper reached through the project's `@/` alias is
// loaded for real: the candidate that inlines it is PASS-bounded, not a WITNESS against a fake
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-no-silent-exit-'));
const fx = (name, side) => path.join(here, 'fixtures/no-silent-exit', name, name === 'alias' ? 'src' : '', `${side}.ts`);
const lean = (tool, name, unit, extra) => {
  const out = path.join(tmp, `${path.basename(tool, '.mjs')}-${name}.json`);
  const r = spawnSync('node', [path.join(here, '..', tool), '--parent', fx(name, 'parent'), '--candidate', fx(name, 'candidate'), '--unit', unit, ...extra, '--n', '3', '--out', out], { encoding: 'utf8' });
  return { status: r.status, text: (r.stdout ?? '') + (r.stderr ?? ''), json: fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null };
};
const drained = 'harness: the run ended before a verdict; pending: lane B (input 0)';

const run = lean('exec/run.mjs', 'hang', 'settle', ['--no-project', '--ms', '200']);
assert.equal(run.status, 2, run.text); assert.ok(run.text.includes(`ASK: ${drained}`), run.text);
assert.equal(run.json?.verdict, 'ASK'); assert.ok(run.json.reason.startsWith(drained), run.json.reason);

const chk = lean('check.mjs', 'hang', 'settle', ['--no-project']);
assert.equal(chk.status, 2, chk.text); assert.equal(chk.json?.verdict, 'ASK');
assert.equal(chk.json.certificate.lanes.B.verdict, 'ASK:harness'); assert.ok(chk.json.reason.startsWith(drained), chk.json.reason);

const budget = lean('exec/run.mjs', 'budget', 'readSettings', []);
assert.equal(budget.status, 2, budget.text); assert.equal(budget.json?.verdict, 'ASK');
assert.match(budget.json.reason, /^input \d+: budget: a fake path longer than 400 characters/);

for (const [name, unit] of [['wide', 'firstSetting'], ['nested', 'firstIsSet'], ['alias', 'scaled']]) {
  const r = lean('exec/run.mjs', name, unit, ['--n', '20']);
  assert.equal(r.status, 0, r.text); assert.equal(r.json?.verdict, 'PASS-bounded', `${name}: ${r.json?.verdict} ${r.json?.reason ?? ''}`);
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log('no silent exit: a drained run and a budget stop end in ASK with exit 2; a wide record, a deep nesting and an aliased helper get PASS-bounded PASS');
