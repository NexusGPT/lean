// The branch-guided input search (exec/search.mjs, design/w3c-search-inputs.md, lane w3c-search-inputs).
// 1. The diff's lines map to the unit's conditions: the arm that holds a changed line is a target, the statements after
//    an if whose then-arm always leaves are its F arm, a changed condition targets both outcomes.
// 2. The search keeps an input that reaches a new target branch and continues from it: a difference two leaf changes
//    away (each opening one branch) is found; the leaf values include the unit's literals and the safe-integer boundaries.
// 3. The pairs search_nested_literals and search_boundary: PASS-bounded without the search; with it, check.mjs answers
//    WITNESS and the certificate's witness input names `source: search`; two runs with the search are byte-equal.
// --break: the mechanism removed (LEAN_SEARCH_BREAK=values,keep: no literal or boundary values, no kept input): parts 2
// and 3 fail.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ts } from '../common.mjs';
import { branchTable, unitBranches, changedLines, changesOf, searchInputs, applyRecipe, SAFE_EDGES } from '../exec/search.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), lean = path.join(here, '..');
const BREAK = process.argv.includes('--break');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'search-inputs-'));
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };

// 1. targets from the diff
{
  const parent = 'export function f(a: string, b: string): number {\n  if (a === "x") {\n    if (b === "y") {\n      return 1;\n    }\n  }\n  if (a === "z") return 3;\n  return 0;\n}\n';
  const candidate = parent.replace('return 1;', 'return 2;').replace('return 0;', 'return -1;');
  const ch = changedLines(parent, candidate);
  ok(JSON.stringify([...ch.candidate].sort()) === '[4,8]' && JSON.stringify([...ch.parent].sort()) === '[4,8]', `changed lines 4 and 8 on both sides (${[...ch.candidate]})`);
  const sf = ts.createSourceFile('c.ts', candidate, ts.ScriptTarget.Latest, true);
  const table = branchTable(sf), { targets, literals } = unitBranches(sf, 'f', table, ch.candidate);
  const named = targets.map((t) => `${table[Number(t.slice(0, -1))].text}:${t.slice(-1)}`).sort();
  ok(JSON.stringify(named) === JSON.stringify(['a === "x":T', 'a === "z":F', 'b === "y":T']), `the arms holding a changed line, and the F arm after an exiting if (${named})`);
  ok(literals.strings.includes('x') && literals.strings.includes('y') && literals.numbers.includes(-1), 'the literals of the unit text, a negated number with its sign');
  const both = changedLines(parent, parent.replace('a === "z"', 'a !== "z"'));
  const t2 = unitBranches(ts.createSourceFile('c.ts', parent.replace('a === "z"', 'a !== "z"'), ts.ScriptTarget.Latest, true), 'f', branchTable(ts.createSourceFile('c.ts', parent.replace('a === "z"', 'a !== "z"'), ts.ScriptTarget.Latest, true)), both.candidate).targets;
  ok(t2.length === 2 && t2.some((t) => t.endsWith('T')) && t2.some((t) => t.endsWith('F')), `a changed condition targets both outcomes (${t2})`);
}

// 2. the keep: a difference behind two nested branches, the outer opened by one leaf change, the inner by the next
{
  const spec = { kind: 'record', fields: { a: { spec: { kind: 'string' } }, b: { spec: { kind: 'string' } }, n: { spec: { kind: 'number' } } } };
  const params = [{ name: 'q', spec }];
  const lits = { strings: ['x', 'y'], numbers: [] };
  const draws = [{ a: 'p', b: 'q', n: 3 }, { a: '', b: 'x', n: 0 }];
  const inputOf = (recipe) => { const inputs = [structuredClone(draws[recipe.from])]; return applyRecipe(inputs, recipe) ? inputs : null; };
  const hitsOf = (q) => new Set([q.a === 'x' ? 'C:0T' : 'C:0F', ...(q.a === 'x' ? [q.b === 'y' ? 'C:1T' : 'C:1F'] : [])]);
  const run = async (recipe) => { const inputs = inputOf(recipe); if (!inputs) return { status: 'skip' }; const q = inputs[0]; return { status: q.a === 'x' && q.b === 'y' ? 'diff' : 'equal', hits: hitsOf(q) }; };
  const changes = async (recipe) => changesOf(inputOf(recipe), params, {}, lits, { aware: !BREAK });
  const search = (seed) => searchInputs({ seed, targets: ['C:0T', 'C:1T'], start: draws.map((q, input) => ({ input, hits: hitsOf(q) })), run, changes, maxInputs: 60, maxMs: 60_000, keep: !BREAK });
  const r = await search(1);
  ok(r.stop === 'divergence', `found two changes away, the first opening the branch the second needs (stop: ${r.stop}, tried ${r.tried}, kept ${r.kept})`);
  ok(r.kept === 1 && r.recipe.changes.length === 2, `one kept input, the witness two changes from its draw (${JSON.stringify(r.recipe?.changes)})`);
  const again = await search(1);
  ok(JSON.stringify(again.recipe) === JSON.stringify(r.recipe) && again.tried === r.tried, 'the same seed, the same search');
  ok(SAFE_EDGES.includes(Number.MAX_SAFE_INTEGER + 1) && SAFE_EDGES.includes(Number.MIN_SAFE_INTEGER - 1), 'the boundaries include the values just off the safe integers');
}

// 3. the pairs, through exec/run.mjs and check.mjs
const env = (on) => ({ ...process.env, LEAN_SEARCH: on ? '1' : '0', ...(BREAK ? { LEAN_SEARCH_BREAK: 'values,keep' } : {}) });
const node = (args, on) => { const r = spawnSync('node', args, { encoding: 'utf8', env: env(on), maxBuffer: 1 << 26 }); if (r.status !== 0 && r.status !== 1 && r.status !== 2) throw new Error(`${args.join(' ')}: exit ${r.status}: ${(r.stderr || '').slice(-400)}`); return r; };
for (const [pair, unit] of [['search_nested_literals', 'route'], ['search_boundary', 'refKey']]) {
  const d = path.join(here, 'pairs', pair), files = ['--parent', path.join(d, 'parent.ts'), '--candidate', path.join(d, 'candidate.ts'), '--unit', unit, '--n', '30', '--no-project'];
  const out = (k) => path.join(tmp, `${pair}_${k}.json`);
  node([path.join(lean, 'exec/run.mjs'), ...files, '--no-search', '--out', out('off')], false);
  const off = JSON.parse(fs.readFileSync(out('off'), 'utf8'));
  ok(off.verdict === 'PASS-bounded' && !off.bound?.search, `${pair}: PASS-bounded without the search (${off.verdict})`);
  node([path.join(lean, 'check.mjs'), ...files, '--dafny-seconds', '30', '--out', out('check')], true);
  const chk = JSON.parse(fs.readFileSync(out('check'), 'utf8'));
  const w = chk.certificate?.lanes?.B?.witnesses?.[0];
  ok(chk.verdict === 'WITNESS' && w?.input?.source === 'search' && w?.where?.source === 'search', `${pair}: check.mjs WITNESS, the certificate's witness from the search (${chk.verdict}, ${JSON.stringify(w?.input ?? null)}; search ${JSON.stringify(chk.certificate?.lanes?.B?.bound?.search ?? null).slice(0, 300)})`);
  for (const k of ['on1', 'on2']) node([path.join(lean, 'exec/run.mjs'), ...files, '--search', '--out', out(k)], true);
  ok(fs.readFileSync(out('on1'), 'utf8') === fs.readFileSync(out('on2'), 'utf8'), `${pair}: two runs with the search byte-equal`);
  const on = JSON.parse(fs.readFileSync(out('on1'), 'utf8'));
  ok(on.witnesses?.[0]?.replayed === true && on.bound.search.reached >= on.bound.search.reachedByDraws, `${pair}: the witness replayed; branches of the diff reached ${on.bound.search.reachedByDraws} by the draws, ${on.bound.search.reached} of ${on.bound.search.targets} after`);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`search-inputs: ${checks} checks pass${BREAK ? ' (--break: expected to fail)' : ''}`);
