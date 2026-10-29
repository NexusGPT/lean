#!/usr/bin/env node
// The conformance step's running rule (select.mjs), on a scratch git repository holding two pairs and a baseline file:
//   LEAN_PAIRS given        -> those pairs;
//   LEAN_CONFORMANCE=full   -> every pair;
//   neither                 -> the pairs whose files changed since the last commit of the baseline file (committed,
//                              uncommitted and untracked changes), none when no pair changed;
//   LEAN_CONFORMANCE=<else> -> an error, never a silent rule.
// Prints one line per case and `SELECT TOTAL: N of M PASS`; exits 1 on a failed case.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { conformanceSelection } from './select.mjs';

const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-conformance-select-'));
const git = (...args) => { const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' }); if (r.status !== 0) throw new Error(`git ${args.join(' ')}: exit ${r.status}: ${r.stderr}`); return r.stdout; };
const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(repo, rel)), { recursive: true }); fs.writeFileSync(path.join(repo, rel), text); };
const pairsDir = path.join(repo, 'langs/ts/tests/pairs'), knownFile = path.join(repo, 'langs/ts/conformance/known-findings.json');
git('init', '-q'); git('config', 'user.email', 'select-test@example.invalid'); git('config', 'user.name', 'select test'); git('config', 'commit.gpgsign', 'false');
for (const p of ['alpha', 'beta', 'gamma']) { put(`langs/ts/tests/pairs/${p}/expect.json`, '{}\n'); put(`langs/ts/tests/pairs/${p}/parent.ts`, `export const ${p} = 1;\n`); }
put('langs/ts/conformance/known-findings.json', '{"findings":[]}\n');
git('add', '-A'); git('commit', '-q', '-m', 'baseline');
const sel = (env) => conformanceSelection({ env, root: repo, pairsDir, knownFile });

const cases = [];
const check = (name, f) => { let ok = false, detail; try { [ok, detail] = f(); } catch (e) { detail = `threw: ${e.message}`; } cases.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${detail}`); };
const show = (s) => `${s.mode} ${JSON.stringify(s.pairs)} (${s.why})`;

check('nothing changed since the baseline: no pair runs', () => { const s = sel({}); return [s.mode === 'changed' && Array.isArray(s.pairs) && s.pairs.length === 0, show(s)]; });
put('langs/ts/tests/pairs/alpha/candidate.ts', 'export const alpha = 2;\n'); git('add', '-A'); git('commit', '-q', '-m', 'alpha changes');
put('langs/ts/tests/pairs/beta/parent.ts', 'export const beta = 3;\n'); // uncommitted
put('langs/ts/tests/pairs/delta/expect.json', '{}\n'); // untracked new pair
check('a changed pair runs, an unchanged one is skipped', () => { const s = sel({}); return [s.mode === 'changed' && JSON.stringify(s.pairs) === '["alpha","beta","delta"]', show(s)]; });
check('the baseline commit resets the set', () => { git('add', '-A'); git('commit', '-q', '-m', 'beta, delta'); put('langs/ts/conformance/known-findings.json', '{"findings":[],"about":"rebaselined"}\n'); git('add', '-A'); git('commit', '-q', '-m', 'rebaseline'); const s = sel({}); return [s.mode === 'changed' && JSON.stringify(s.pairs) === '[]', show(s)]; });
check('a deleted pair is not run', () => { fs.rmSync(path.join(pairsDir, 'gamma'), { recursive: true }); const s = sel({}); return [s.mode === 'changed' && JSON.stringify(s.pairs) === '[]', show(s)]; });
check('LEAN_PAIRS names the set', () => { const s = sel({ LEAN_PAIRS: 'beta, alpha' }); return [s.mode === 'named' && JSON.stringify(s.pairs) === '["beta","alpha"]', show(s)]; });
check('LEAN_CONFORMANCE=full runs every pair', () => { const s = sel({ LEAN_CONFORMANCE: 'full' }); return [s.mode === 'full' && s.pairs === null, show(s)]; });
check('LEAN_CONFORMANCE with another value is an error', () => { try { const s = sel({ LEAN_CONFORMANCE: 'ful' }); return [false, `no error: ${show(s)}`]; } catch (e) { return [/LEAN_CONFORMANCE/.test(e.message), `error: ${e.message}`]; } });
check('outside a git repository: every pair, and why', () => { const s = conformanceSelection({ env: {}, root: os.tmpdir(), pairsDir: path.join(os.tmpdir(), 'none'), knownFile: path.join(os.tmpdir(), 'none.json') }); return [s.mode === 'all' && s.pairs === null && /git/.test(s.why), show(s)]; });

fs.rmSync(repo, { recursive: true, force: true });
const pass = cases.filter(Boolean).length;
console.log(`SELECT TOTAL: ${pass} of ${cases.length} PASS`);
process.exit(pass === cases.length ? 0 : 1);
