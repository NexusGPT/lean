#!/usr/bin/env node
// census.mjs --callees counts, per unit, the calls whose target lies outside the file, and classes a refused unit as
// blocked only by unmodelled calls when every refusal it carries names a call outside the file that translate/library.json
// has no row for (callees.mjs, design/w2a-callee-census.md). The fixture fixtures/census-callees/repo has a known table
// (rebuilt on the merged opacity lanes, lane w8e, 2026-11-01: those lanes read the optional calls it refused before):
//   reads      two calls of the imported readFileSync, each handed an object, then a push to the second: refused
//              (read-after-call) naming the first call; counted ONCE under `node:fs readFileSync`, its two calls as calls.
//              The first is handed `ds[slot()]`: the call of slot inside the value handed is no call the refusal names
//   statement  calls fs.readFileSync inside a `var` declaration (refused for its form): the refusal names no value, no call
//   exists     calls fs.existsSync and enters: a caller only
//   pushes     an optional call of Array.prototype.push: the library table has its row, so it is no unmodelled callee
//   sameFile   an optional call of a function of the file: no outside callee
//   both       refused after `api.save(v)` (a method of an any value, `(untyped) save`); its callback refused on an
//              optional call of readFileSync: the callback's chain names both (among both, only by neither)
//   project    refused after `helper(d, f)`, an imported function of the project handed a function value (no callee fact
//              covers it, callee-facts.mjs): `src/util.ts helper`, origin project
//   projectFact  the same call handed no function value: the callee fact may cover it (pending lane B's record), so the
//              lowering admits it and it is a caller only
//   outer      its callback refused after readFileSync(d); outer holds the refusal, its callback is covered by outer's stop
// --break runs the two mechanisms removed, each must turn the table red: a refusal attributed to every call its values
// contain (reads then counts under slot too), and an empty library table (pushes then counts under push).
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
  say(rf.onlyBy === 3 && rf.among === 4, `${label}: node:fs readFileSync blocks reads, outer and its callback alone, and both's callback beside (untyped) save`, `only ${rf.onlyBy}, among ${rf.among}`);
  say(rf.callers === 4 && rf.calls === 5, `${label}: node:fs readFileSync has 4 calling units and 5 calls (reads counted once, its two calls twice)`, `${rf.callers} callers, ${rf.calls} calls`);
  say(JSON.stringify(rec?.calleeBlocked?.reads?.keys) === '["node:fs readFileSync"]', `${label}: reads is blocked only by node:fs readFileSync`, JSON.stringify(rec?.calleeBlocked?.reads));
  say(!blocked.includes('statement'), `${label}: statement, refused for its form, is not blocked by the call it contains`, blocked.join(','));
  say(!blocked.includes('pushes') && !t.rows.some((r) => r.key === 'global Array.prototype.push' && r.among), `${label}: pushes names a call the library table models`, blocked.join(','));
  say(!blocked.includes('sameFile'), `${label}: sameFile names a call of its own file`, blocked.join(','));
  say(row('node:fs existsSync').callers === 1 && row('node:fs existsSync').among === 0, `${label}: node:fs existsSync is called by exists, blocks nobody`, JSON.stringify(row('node:fs existsSync')));
  const sv = row('(untyped) save'), pr = row('src/util.ts helper');
  say(sv.onlyBy === 1 && sv.among === 2 && sv.origin === 'untyped', `${label}: (untyped) save blocks both alone and its callback beside readFileSync`, `only ${sv.onlyBy}, among ${sv.among}, ${sv.origin}`);
  say(pr.onlyBy === 1 && pr.origin === 'project' && pr.callers === 2, `${label}: project is blocked only by src/util.ts helper (origin project); projectFact calls it too`, `only ${pr.onlyBy}, ${pr.origin}, ${pr.callers} callers`);
  say(!blocked.includes('projectFact'), `${label}: projectFact, under the callee fact pending lane B's record, is admitted`, blocked.join(','));
  say(JSON.stringify(blocked) === JSON.stringify(['both', 'both/ps.map()#0', 'outer', 'outer/ds.map()#0', 'project', 'reads']), `${label}: the callee-only units are exactly both, its callback, outer, its callback, project, reads`, blocked.join(','));
  say(t.calleeOnly === 6 && t.multiCallee === 1, `${label}: 6 callee-only units, 1 of them naming two callees`, `${t.calleeOnly}, ${t.multiCallee}`);
  say(rf.rank === 1 && rf.cumulative === 3 && sv.rank === 2 && sv.cumulative === 5 && pr.rank === 3 && pr.cumulative === 6, `${label}: ranked readFileSync, save, helper, cumulative 3, 5, 6`, `${rf.rank}/${rf.cumulative} ${sv.rank}/${sv.cumulative} ${pr.rank}/${pr.cumulative}`);
  // the table over many runs is the sum of the runs: two copies count every unit twice
  const two = calleeTable([res, res]), r2 = two.rows.find((r) => r.key === 'node:fs readFileSync');
  say(two.calleeOnly === 12 && r2?.onlyBy === 6 && r2?.callers === 8, `${label}: the table over two runs sums them`, `${two.calleeOnly}, ${r2?.onlyBy}, ${r2?.callers}`);
  // the world view keeps the callees of the listed origins; its cumulative count still requires every key of a unit
  const world = calleeTable([res], { includeOrigins: ['ecmascript', 'web', 'node', 'package'] });
  say(!world.rows.some((r) => r.origin === 'project') && world.top20 === 3, `${label}: the world view drops project and untyped callees and lets in the 3 units needing only node:fs readFileSync`, `${world.top20}`);
}
if (!BREAK) check('mechanism');
else {
  attributeByContainment(true); check('break: containment'); attributeByContainment(false);
  useLibraryOps([]); check('break: no library table'); useLibraryOps(LIBRARY_OPS);
}
console.log(`census-callees: ${fail ? fail + ' failed' : 'all hold'}`);
process.exit(fail ? 1 : 0);
