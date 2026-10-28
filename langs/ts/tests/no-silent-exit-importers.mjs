// a script that imports exec/run.mjs never ends silently. The late-error hooks record what escapes a unit while a unit
// run is in flight; outside a run an error is the importer's own: it is printed to stderr and the process exits 1.
// And pr.mjs runs to its table from a copy of lean without git history, naming its lean version 'unknown'.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const lean = path.resolve(here, '..'); // langs/ts
const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'lean-importers-')));
const node = (file, args = [], opts = {}) => { const r = spawnSync('node', [file, ...args], { encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' }, ...opts }); return { status: r.status, out: r.stdout ?? '', err: r.stderr ?? '' }; };
const script = (name, body) => { const f = path.join(tmp, name); fs.writeFileSync(f, body); return f; };
const runUrl = pathToFileURL(path.join(lean, 'exec/run.mjs')).href;

// 1. a top-level await that rejects outside any unit run
const tla = node(script('tla.mjs', `import ${JSON.stringify(runUrl)};\nawait Promise.reject(new Error('importer failed outside a run'));\n`));
assert.equal(tla.status, 1, `top-level rejection: exit ${tla.status}\n${tla.out}${tla.err}`);
assert.match(tla.err, /lean: uncaught exception outside a unit run: Error: importer failed outside a run/);

// 2. a floating rejection nobody handles, outside any unit run
const floating = node(script('floating.mjs', `import ${JSON.stringify(runUrl)};\nPromise.reject(new Error('floating rejection outside a run'));\n`));
assert.equal(floating.status, 1, `floating rejection: exit ${floating.status}\n${floating.out}${floating.err}`);
assert.match(floating.err, /lean: unhandled rejection outside a unit run: Error: floating rejection outside a run/);

// 3. inside a run, a unit's fire-and-forget rejection is still an observation (a late-error record), never a crash
const unit = 'export function fire(x: number): number { Promise.reject(new Error("late inside the unit")); return x + 1; }\n';
fs.writeFileSync(path.join(tmp, 'parent.ts'), unit); fs.writeFileSync(path.join(tmp, 'candidate.ts'), unit);
const inRun = node(path.join(lean, 'exec/run.mjs'), ['--parent', path.join(tmp, 'parent.ts'), '--candidate', path.join(tmp, 'candidate.ts'), '--unit', 'fire', '--n', '5', '--no-project', '--out', path.join(tmp, 'in-run.json')]);
assert.equal(inRun.status, 0, `in-run late error: exit ${inRun.status}\n${inRun.out}${inRun.err}`);
assert.equal(JSON.parse(fs.readFileSync(path.join(tmp, 'in-run.json'), 'utf8')).verdict, 'PASS-bounded');

// 4. pr.mjs from a copy of lean with no git history: the table is written, its lean version 'unknown'
const copy = path.join(tmp, 'lean-copy');
fs.mkdirSync(path.join(copy, 'langs'), { recursive: true });
fs.cpSync(lean, path.join(copy, 'langs/ts'), { recursive: true, filter: (f) => !f.startsWith(path.join(lean, 'tests')) });
fs.cpSync(path.resolve(lean, '../../spec'), path.join(copy, 'spec'), { recursive: true });
const repo = path.join(tmp, 'repo'); fs.mkdirSync(repo);
const git = (...args) => { const r = spawnSync('git', ['-C', repo, '-c', 'user.email=lean@example.invalid', '-c', 'user.name=lean', ...args], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); };
git('init', '-q'); fs.writeFileSync(path.join(repo, 'a.ts'), 'export const inc = (x: number): number => x + 1;\n'); git('add', 'a.ts'); git('commit', '-qm', 'base');
fs.writeFileSync(path.join(repo, 'a.ts'), 'export const inc = (x: number): number => 1 + x;\n'); git('commit', '-qam', 'head');
assert.notEqual(spawnSync('git', ['-C', path.join(copy, 'langs/ts'), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).status, 0, 'the copy must have no git history');
const out = path.join(tmp, 'report.md'), json = path.join(tmp, 'report.json');
const pr = node(path.join(copy, 'langs/ts/pr.mjs'), ['--repo', repo, '--base', 'HEAD~1', '--head', 'HEAD', '--fresh', '--n', '5', '--dafny-seconds', '20', '--cache-dir', path.join(tmp, 'cache'), '--runs-dir', path.join(tmp, 'runs'), '--out', out, '--json', json]);
assert.equal(pr.status, 0, `pr.mjs from a copy without git: exit ${pr.status}\n${pr.out}${pr.err}`);
assert.match(pr.out, /1 function\(s\) -> /);
const report = JSON.parse(fs.readFileSync(json, 'utf8'));
assert.match(report.leanVersion, /^unknown \(no git history for this copy of lean\); sources sha256 [0-9a-f]{64}$/);
assert.match(fs.readFileSync(out, 'utf8'), /Identity: [0-9a-f]+; lean unknown/);

fs.rmSync(tmp, { recursive: true, force: true });
console.log('no silent exit for importers: a rejection outside a run exits 1 with its message; a late error inside a run is recorded; pr.mjs without git reports lean unknown PASS');
