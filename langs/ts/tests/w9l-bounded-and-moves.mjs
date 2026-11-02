// Lane w9l-bounded-and-moves (design/w9l-bounded-and-moves.md): the world search and the moves git does not pair.
// 1. The value sites of the changed lines: a call's arguments, an initialiser, a return; a condition inside a value the
//    reading holds is not read twice; a function expression is left alone.
// 2. searchWorld on a synthetic world: an infected draw climbs, the latest answer first after a throw, until the sides
//    differ; a move one climb kept is tried first on the next; with no infected draw a leaf change infects first.
// 3. The pairs world_masked and world_masked_infect through exec/run.mjs: PASS-bounded under LEAN_BREAK=w9l-bounds, WITNESS
//    without it with the witness's input `source: world`, replayed; two runs byte-equal.
// 3b. type_tests hasKey: PASS-bounded with the world search on (a change must keep the draw's declared type).
// 4. A move git's rename detection does not pair (the moved function also lost a block): ci/ledger.mjs pairs the
//    added and the deleted file by their functions' names, pr.mjs compares the unit with its parent (WITNESS), a tie or
//    a lone shared name in a bigger file pairs nothing.
// --break: LEAN_BREAK=w9l-bounds,w9l-moves,w9l-typed for every part: parts 3, 3b and 4 fail.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ts } from '../common.mjs';
import { valueSites, changedLines, searchWorld } from '../exec/search.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), lean = path.join(here, '..');
const BREAK = process.argv.includes('--break');
if (BREAK) process.env.LEAN_BREAK = [process.env.LEAN_BREAK, 'w9l-bounds', 'w9l-moves', 'w9l-typed'].filter(Boolean).join(',');
const { buildChangeManifest, pairMoves } = await import('../ci/ledger.mjs'); // after LEAN_BREAK is set (read at each use)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'w9l-'));
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };

// 1. the value sites
{
  const parent = 'export function f(c: any, t: string, n: string) {\n  const k = n;\n  c.add(k, n);\n  return k;\n}\n';
  const candidate = 'export function f(c: any, t: string, n: string) {\n  const k = t === "x" ? null : n;\n  c.add(k, (() => n)());\n  return k;\n}\n';
  const ch = changedLines(parent, candidate);
  const sf = ts.createSourceFile('c.ts', candidate, ts.ScriptTarget.Latest, true);
  const texts = valueSites(sf, 'f', ch.candidate).map((s) => { const [pos, end] = s.key.split(':').map(Number); return candidate.slice(pos, end).trim(); });
  ok(texts.includes('t === "x" ? null : n') && texts.includes('k') && texts.includes('(() => n)()'), `the initialiser and the arguments of the changed lines (${JSON.stringify(texts)})`);
  ok(!texts.includes('t === "x"'), 'a condition inside an initialiser the reading holds is not read again');
  ok(!texts.some((t) => t === '() => n' || t === '(() => n)'), 'a function expression is no value site (a wrapper would change its inferred name)');
  ok(!texts.includes('k;') && valueSites(sf, 'f', new Set([4])).length === 1, 'only the changed lines: line 4 alone holds one site, the return');
}

// 2. searchWorld on a synthetic world: the difference shows only when a = handle, a.b = absent (both answered after the infected value)
{
  const world = (w) => new Map(w);
  const runOf = (infectedFor) => async (recipe, w) => {
    const m = world(w), infected = infectedFor(recipe);
    const answered = [{ path: 'a', kind: m.get('a') ?? 'null' }];
    if (answered[0].kind !== 'fake') return { status: 'equal', answered, ran: 2, threw: true, infected, at: 0 };
    answered.push({ path: 'a.b', kind: m.get('a.b') ?? 'fake' });
    if (answered[1].kind !== 'undefined') return { status: 'equal', answered, ran: 4, threw: false, infected, at: 0 };
    return { status: infected ? 'diff' : 'equal', answered, ran: 9, threw: false, infected, at: 0 };
  };
  const starts = [0, 1, 2].map((i) => ({ recipe: { from: i, changes: [] }, answered: [{ path: 'a', kind: 'null' }], ran: 2, threw: true, infected: i === 1, at: 0 }));
  const go = (s, infectedFor) => searchWorld({ seed: 1, starts: s, run: runOf(infectedFor), changes: async () => [{ at: [0], op: 'set', value: 'x', tier: 0 }], maxInputs: 30, maxMs: 60_000 });
  const r = await go(starts, (recipe) => recipe.from === 1);
  ok(r.stop === 'divergence' && r.recipe.from === 1 && JSON.stringify(r.world) === JSON.stringify([['a', 'fake'], ['a.b', 'undefined']]), `the infected draw climbs: a handle where the run threw, then absent where a guard passed (${r.stop}, ${JSON.stringify(r.world)}, tried ${r.tried})`);
  ok(r.tried === 3 && r.infectedByDraws === 1, `three tries: a = absent (no further), a = handle (kept), a.b = absent (the difference) (${r.tried})`);
  const again = await go(starts, (recipe) => recipe.from === 1);
  ok(JSON.stringify(again) === JSON.stringify(r), 'the same starts, the same search');
  const none = starts.map((s) => ({ ...s, infected: false }));
  const byChange = await go(none, (recipe) => recipe.changes.length > 0);
  ok(byChange.stop === 'divergence' && byChange.infectedByChange === 1 && byChange.recipe.changes.length === 1, `no draw infects: a leaf change to a literal of a changed condition infects first, then the climb (${byChange.stop}, ${JSON.stringify(byChange.recipe)})`);
  const never = await go(none, () => false);
  ok(never.stop === 'no input infects', `no change infects: the search stops (${never.stop}, tried ${never.tried} of 30, at most half on the infection)`);
  ok(never.tried <= 15, 'the infection takes at most half the budget');
}

// 3. the pairs
const node = (args, extra = {}) => { const r = spawnSync('node', args, { encoding: 'utf8', env: { ...process.env, ...extra }, maxBuffer: 1 << 26 }); if (r.status !== 0) throw new Error(`${args.join(' ')}: exit ${r.status}: ${(r.stderr || '').slice(-400)}`); return r; };
for (const pair of ['world_masked', 'world_masked_infect']) {
  const d = path.join(here, 'pairs', pair), files = ['--parent', path.join(d, 'parent.ts'), '--candidate', path.join(d, 'candidate.ts'), '--unit', 'register', '--n', '30', '--seed', '1', '--no-search'];
  const out = (k) => path.join(tmp, `${pair}_${k}.json`);
  node([path.join(lean, 'exec/run.mjs'), ...files, '--out', out('off')], { LEAN_BREAK: [process.env.LEAN_BREAK, 'w9l-bounds'].filter(Boolean).join(',') });
  const off = JSON.parse(fs.readFileSync(out('off'), 'utf8'));
  ok(off.verdict === 'PASS-bounded' && !off.bound?.world, `${pair}: PASS-bounded without the world search (${off.verdict})`);
  for (const k of ['on1', 'on2']) node([path.join(lean, 'exec/run.mjs'), ...files, '--out', out(k)]);
  const on = JSON.parse(fs.readFileSync(out('on1'), 'utf8')), w = on.witnesses?.[0];
  ok(on.verdict === 'WITNESS' && w?.input?.source === 'world' && w?.where?.source === 'world' && w.replayed === true, `${pair}: WITNESS from the world search, replayed (${on.verdict}, ${JSON.stringify(w?.input ?? null)}; ${JSON.stringify(on.bound?.world ?? null).slice(0, 300)})`);
  ok(Array.isArray(w?.input?.world) && w.input.world.length > 0 && w.record?.search?.source === 'world', `${pair}: the witness and its record name the world answers it set (${JSON.stringify(w?.input?.world)})`);
  ok(fs.readFileSync(out('on1'), 'utf8') === fs.readFileSync(out('on2'), 'utf8'), `${pair}: two runs byte-equal`);
}

// the sweep's find: a change keeps the draw's type. type_tests hasKey is equal under its union (kind "a" holds left);
// a tag set to "a" on a draw of kind "b" (which holds right only) is no input of the type and shows no difference
{
  const d = path.join(here, 'pairs', 'type_tests'), out = path.join(tmp, 'hasKey.json');
  node([path.join(lean, 'exec/run.mjs'), '--parent', path.join(d, 'parent.ts'), '--candidate', path.join(d, 'candidate.ts'), '--unit', 'hasKey', '--n', '30', '--seed', '1', '--no-project', '--no-search', '--out', out]);
  const r = JSON.parse(fs.readFileSync(out, 'utf8'));
  ok(r.verdict === 'PASS-bounded', `type_tests hasKey: no witness from a change that leaves the declared type (${r.verdict}, ${JSON.stringify(r.witnesses?.[0]?.input ?? null)})`);
}

// 4. moves
{
  const A = (name, oid = 'a1') => ({ status: 'A', oldMode: '000000', newMode: '100644', oldOid: '0', newOid: oid, oldName: name, newName: name });
  const D = (name, oid = 'd1') => ({ status: 'D', oldMode: '100644', newMode: '000000', oldOid: oid, newOid: '0', oldName: name, newName: name });
  const names = { a1: ['useDebounce'], d1: ['useDebounce', 'other'], a2: ['helper', 'x', 'y', 'z', 'w'], d2: ['helper', 'p', 'q', 'r', 's'], a3: ['f'], d3: ['f'], d4: ['f'] };
  const named = (oid) => new Set(names[oid] ?? []);
  const paired = pairMoves([A('src/hooks/useDebounce.ts'), D('src/utils/debounce.jsx')], named);
  ok(paired.length === 1 && paired[0].status === 'R' && paired[0].oldName === 'src/utils/debounce.jsx' && paired[0].newName === 'src/hooks/useDebounce.ts' && paired[0].pairedBy === 'units', `an added and a deleted file holding the same function pair as a move (${JSON.stringify(paired.map((r) => [r.status, r.oldName, r.newName]))})`);
  ok(pairMoves([A('a.ts', 'a2'), D('b.ts', 'd2')], named).length === 2, 'one shared name in five is no move');
  ok(pairMoves([A('a.ts', 'a3'), D('b.ts', 'd3'), D('c.ts', 'd4')], named).length === 3, 'a tie pairs nothing');
  // a repository: the function moves and loses its timer, git's similarity falls under its 50 % bar
  const repo = path.join(tmp, 'repo');
  const git = (...args) => { const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_AUTHOR_NAME: 'w9l', GIT_AUTHOR_EMAIL: 'w9l@test', GIT_COMMITTER_NAME: 'w9l', GIT_COMMITTER_EMAIL: 'w9l@test' } }); if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`); return r.stdout; };
  fs.mkdirSync(path.join(repo, 'src/utils'), { recursive: true });
  git('init', '-q', '-b', 'main');
  const before = 'export function debounced(value: number, delay: number, timer: any, out: number[]): number {\n  const handle = timer.set(() => {\n    out.push(value);\n  }, delay);\n  if (delay > 1000) {\n    timer.clear(handle);\n    out.push(-1);\n  }\n  return value;\n}\n';
  fs.writeFileSync(path.join(repo, 'src/utils/debounce.ts'), before);
  git('add', '-A'); git('commit', '-q', '-m', 'base');
  fs.rmSync(path.join(repo, 'src/utils/debounce.ts'));
  fs.mkdirSync(path.join(repo, 'src/hooks'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src/hooks/debounced.ts'), 'export function debounced(value: number, delay: number, timer: any, out: number[]): number {\n  \n  return value;\n}\n');
  git('add', '-A'); git('commit', '-q', '-m', 'move');
  ok(/^A\tsrc\/hooks\/debounced\.ts$/m.test(git('diff', '--name-status', '-M', 'HEAD~1', 'HEAD')), 'git itself does not pair the move');
  const m = buildChangeManifest({ repo, base: 'HEAD~1', head: 'HEAD' });
  const moved = m.files.find((f) => f.newPath === 'src/hooks/debounced.ts');
  ok(moved?.kind === 'rename/move' && moved.oldPath === 'src/utils/debounce.ts' && moved.pairedBy === 'units' && m.files.length === 1, `the ledger pairs the move by the function's name (${JSON.stringify(m.files.map((f) => [f.kind, f.oldPath, f.newPath]))})`);
  ok(moved.hunks.length >= 1 && moved.hunks.every((h) => h.old.start >= 1), 'its hunks are the two texts\' diff');
  const json = path.join(tmp, 'pr.json');
  node([path.join(lean, 'pr.mjs'), '--repo', repo, '--base', 'HEAD~1', '--head', 'HEAD', '--n', '30', '--no-project', '--fresh', '--cache-dir', path.join(tmp, 'cache'), '--runs-dir', path.join(tmp, 'runs'), '--json', json]);
  const row = JSON.parse(fs.readFileSync(json, 'utf8')).rows.find((r) => r.unit === 'debounced');
  ok(row?.verdict === 'WITNESS' && row.file === 'src/hooks/debounced.ts', `pr.mjs compares the moved unit with its parent: WITNESS (${row?.verdict}, ${row?.reason ?? ''})`);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`w9l-bounded-and-moves: ${checks} checks pass${BREAK ? ' (--break: expected to fail)' : ''}`);
