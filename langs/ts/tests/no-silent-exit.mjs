// a run never ends without a verdict: a pair that drains the event loop before a verdict (a module that makes every
// promise chained through `then` never settle) and a pair whose inputs cannot be built (a harness error that used to
// escape into the late-error hooks and end the run with status 0 and no output) each end in an ASK, on stdout and in
// --out, with a non-zero exit
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-no-silent-exit-'));
const fx = (name, side) => path.join(here, 'fixtures/no-silent-exit', name, `${side}.ts`);
const lean = (tool, name, unit, extra) => {
  const out = path.join(tmp, `${path.basename(tool, '.mjs')}-${name}.json`);
  const r = spawnSync('node', [path.join(here, '..', tool), '--parent', fx(name, 'parent'), '--candidate', fx(name, 'candidate'), '--unit', unit, '--n', '3', '--out', out, ...extra], { encoding: 'utf8' });
  return { status: r.status, text: (r.stdout ?? '') + (r.stderr ?? ''), json: fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null };
};
const drained = 'harness: the run ended before a verdict; pending: lane B (input 0)';

const run = lean('exec/run.mjs', 'hang', 'settle', ['--no-project', '--ms', '200']);
assert.equal(run.status, 2, run.text); assert.ok(run.text.includes(`ASK: ${drained}`), run.text);
assert.equal(run.json?.verdict, 'ASK'); assert.ok(run.json.reason.startsWith(drained), run.json.reason);

const chk = lean('check.mjs', 'hang', 'settle', ['--no-project']);
assert.equal(chk.status, 2, chk.text); assert.equal(chk.json?.verdict, 'ASK');
assert.equal(chk.json.certificate.lanes.B.verdict, 'ASK:harness'); assert.ok(chk.json.reason.startsWith(drained), chk.json.reason);

const deep = lean('exec/run.mjs', 'deep', 'readSettings', []);
assert.equal(deep.status, 2, deep.text); assert.equal(deep.json?.verdict, 'ASK');
assert.match(deep.json.reason, /^input 0: budget: a fake path longer than 400 characters/);

fs.rmSync(tmp, { recursive: true, force: true });
console.log('no silent exit: a drained run and an escaped harness error each end in ASK with exit 2 PASS');
