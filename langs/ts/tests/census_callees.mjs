#!/usr/bin/env node
// census.mjs --callees counts, per unit, the calls whose target lies outside the file, and classes a refused unit as
// blocked only by unmodelled calls when every refusal it carries names a call outside the file that translate/library.json
// has no row for (callees.mjs, design/w2a-callee-census.md). The fixture fixtures/census-callees/repo has a known table:
//   reads      two optional calls of the imported readFileSync, both refused (optional-chain): counted ONCE under
//              `node:fs readFileSync`, its two calls counted as calls
//   statement  calls fs.readFileSync inside a statement refused for its form (unsupported-syntax): the refusal judges the
//              larger value, it names no call; a caller, never blocked by the callee
//   exists     calls fs.existsSync and enters: a caller only
//   pushes     an optional call of Array.prototype.push: the library table has its row, so it is no unmodelled callee
//   sameFile   an optional call of a function of the file: no outside callee
//   both       refusals naming readFileSync and JSON.stringify: among both, only by neither
//   project    an optional call of an imported function of the project: `src/util.ts helper`, origin project
//   outer      its callback refused on readFileSync; outer is covered by its callback's stop and its own refusal names it
// --break runs the two mechanisms removed, each must turn the table red: a refusal attributed to every call its values
// contain (statement then counts under readFileSync), and an empty library table (pushes then counts under push).
// Run: node langs/ts/tests/census_callees.mjs [--break]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { census } from '../census.mjs';
import { attributeByContainment, useLibraryOps, LIBRARY_OPS, calleeTable } from '../callees.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(here, 'fixtures', 'census-callees');
const BREAK = process.argv.includes('--break');
let fail = 0;
const say = (ok, what, saw) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${saw !== undefined ? ': ' + saw : ''}`); if (!ok) fail++; };

// the census skips paths under tests or fixtures: it reads a copy outside them, the Node declarations in its node_modules
function run() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-census-callees-'));
  try {
    fs.cpSync(path.join(fixture, 'repo'), repo, { recursive: true });
    fs.cpSync(path.join(fixture, 'types-node'), path.join(repo, 'node_modules', '@types', 'node'), { recursive: true });
    return census(repo, { callees: true });
  } finally { fs.rmSync(repo, { recursive: true, force: true }); }
}
function check(label) {
  const res = run(), rec = res.records.find((r) => r.file === path.join('src', 'read.ts'));
  const t = res.calleeTable, row = (k) => t.rows.find((r) => r.key === k) ?? { onlyBy: 0, among: 0, callers: 0, calls: 0, rank: null };
  const blocked = Object.keys(rec?.calleeBlocked ?? {}).sort();
  const rf = row('node:fs readFileSync');
  say(rf.onlyBy === 3 && rf.among === 4, `${label}: node:fs readFileSync blocks reads, outer and its callback alone, and both beside JSON.stringify`, `only ${rf.onlyBy}, among ${rf.among}`);
  say(rf.callers === 4 && rf.calls === 5, `${label}: node:fs readFileSync has 4 calling units and 5 calls (reads counted once, its two calls twice)`, `${rf.callers} callers, ${rf.calls} calls`);
  say(JSON.stringify(rec?.calleeBlocked?.reads?.keys) === '["node:fs readFileSync"]', `${label}: reads is blocked only by node:fs readFileSync`, JSON.stringify(rec?.calleeBlocked?.reads));
  say(!blocked.includes('statement'), `${label}: statement, refused for its form, is not blocked by the call it contains`, blocked.join(','));
  say(!blocked.includes('pushes') && !t.rows.some((r) => r.key === 'global Array.prototype.push' && r.among), `${label}: pushes names a call the library table models`, blocked.join(','));
  say(!blocked.includes('sameFile'), `${label}: sameFile names a call of its own file`, blocked.join(','));
  say(row('node:fs existsSync').callers === 1 && row('node:fs existsSync').among === 0, `${label}: node:fs existsSync is called by exists, blocks nobody`, JSON.stringify(row('node:fs existsSync')));
  const js = row('global JSON.stringify'), pr = row('src/util.ts helper');
  say(js.onlyBy === 0 && js.among === 1 && js.origin === 'ecmascript', `${label}: global JSON.stringify is among the callees of both, alone of none`, `only ${js.onlyBy}, among ${js.among}, ${js.origin}`);
  say(pr.onlyBy === 1 && pr.origin === 'project', `${label}: project is blocked only by src/util.ts helper (origin project)`, `only ${pr.onlyBy}, ${pr.origin}`);
  say(JSON.stringify(blocked) === JSON.stringify(['both', 'outer', 'outer/ps.map()#0', 'project', 'reads']), `${label}: the callee-only units are exactly both, outer, its callback, project, reads`, blocked.join(','));
  say(t.calleeOnly === 5 && t.multiCallee === 1, `${label}: 5 callee-only units, 1 of them naming two callees`, `${t.calleeOnly}, ${t.multiCallee}`);
  say(rf.rank === 1 && rf.cumulative === 3 && pr.rank === 2 && pr.cumulative === 4 && js.cumulative === 5, `${label}: ranked readFileSync, helper, ..., cumulative 3, 4, 5`, `${rf.rank}/${rf.cumulative} ${pr.rank}/${pr.cumulative} ${js.rank}/${js.cumulative}`);
  // the table over many runs is the sum of the runs: two copies count every unit twice
  const two = calleeTable([res, res]), r2 = two.rows.find((r) => r.key === 'node:fs readFileSync');
  say(two.calleeOnly === 10 && r2?.onlyBy === 6 && r2?.callers === 8, `${label}: the table over two runs sums them`, `${two.calleeOnly}, ${r2?.onlyBy}, ${r2?.callers}`);
  // the world view keeps the callees of the listed origins; its cumulative count still requires every key of a unit
  const world = calleeTable([res], { includeOrigins: ['ecmascript', 'web', 'node', 'package'] });
  say(!world.rows.some((r) => r.origin === 'project') && world.top20 === 4, `${label}: the world view drops project callees and lets in the 4 units needing no project callee`, `${world.top20}`);
}
if (!BREAK) check('mechanism');
else {
  attributeByContainment(true); check('break: containment'); attributeByContainment(false);
  useLibraryOps([]); check('break: no library table'); useLibraryOps(LIBRARY_OPS);
}
console.log(`census-callees: ${fail ? fail + ' failed' : 'all hold'}`);
process.exit(fail ? 1 : 0);
