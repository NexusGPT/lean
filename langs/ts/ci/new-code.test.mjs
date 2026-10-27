#!/usr/bin/env node
// the checks of new-code.mjs and of the editor rule it turns on, without ESLint: ESLint is not vendored, so the rule
// object is driven the way ESLint drives it (create, then Program) with a context that records every report. A scratch
// repository with a boundary tag holds an old file, an edited old file, a new file and an untracked file.
//
//   node langs/ts/ci/new-code.test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import lean from '../eslint/index.mjs';
import { changedFiles, leanOnNewCode } from './new-code.mjs';

let passed = 0; const failed = [];
const ok = (cond, name) => { if (cond) passed++; else failed.push(name); };
const scratchRoot = fs.existsSync('/tmp/claude-501') ? '/tmp/claude-501' : os.tmpdir();
const tmp = fs.mkdtempSync(path.join(scratchRoot, 'ci-new-code-test-'));
const git = (args) => { const r = spawnSync('git', ['-C', tmp, ...args], { encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@localhost', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@localhost', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' } }); if (r.status !== 0) throw new Error(r.stderr); return r.stdout; };
const write = (f, s) => { fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true }); fs.writeFileSync(path.join(tmp, f), s); };

// the rule run as ESLint runs it: create(context) then the Program visitor; reports are collected
function runRule(file, options) {
  const text = fs.readFileSync(file, 'utf8'); const lines = text.split('\n');
  const reports = [];
  const context = {
    filename: file, options,
    sourceCode: { getIndexFromLoc: ({ line, column }) => lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0) + column },
    report: (r) => reports.push(r),
  };
  lean.rules.provable.create(context).Program();
  return reports;
}

try {
  const BAD = 'export function f(x: number): number {\n  var y = x + 1;\n  return y;\n}\n';
  const GOOD = 'export function g(x: number): number {\n  return x + 1;\n}\n';
  git(['init', '-q', '-b', 'main']);
  write('src/old.ts', BAD); write('src/kept.ts', BAD); write('README.md', 'x\n');
  git(['add', '-A']); git(['commit', '-q', '-m', 'before']); git(['tag', 'lean-start']);
  write('src/old.ts', BAD + GOOD.replace('function g', 'function h')); write('src/new.ts', BAD); write('docs/notes.md', 'y\n');
  git(['add', '-A']); git(['commit', '-q', '-m', 'after']);
  write('src/draft.tsx', GOOD); // untracked, not ignored

  const changed = changedFiles({ repo: tmp, since: 'lean-start' });
  ok(JSON.stringify(changed) === JSON.stringify(['src/draft.tsx', 'src/new.ts', 'src/old.ts']), `changed since the tag: ${changed}`);
  const added = changedFiles({ repo: path.join(tmp, 'src'), since: 'lean-start', added: true });
  ok(JSON.stringify(added) === JSON.stringify(['src/draft.tsx', 'src/new.ts']), `added since the tag, from a subfolder: ${added}`);
  ok((() => { try { changedFiles({ repo: tmp }); return false; } catch { return true; } })(), 'a boundary is required');

  const [entry] = leanOnNewCode(lean, { files: changed });
  ok(entry.files.length === 3 && entry.plugins.lean === lean && entry.rules['lean/provable'] === 'error', 'one entry, the rule on as error for those files');
  ok(Object.keys(lean.configs.recommended.rules).includes('lean/provable') && typeof lean.rules.provable.create === 'function', 'the rule id is the plugin\'s own');
  ok(leanOnNewCode(lean, { files: [] }).length === 0, 'no new files: no entry');
  ok(JSON.stringify(leanOnNewCode(lean, { files: ['a.ts'], level: 'warn', project: false })[0].rules['lean/provable']) === '["warn",{"project":false}]', 'level and project reach the rule');
  ok((() => { try { leanOnNewCode({}, { files: ['a.ts'] }); return false; } catch { return true; } })(), 'a wrong plugin is refused');
  ok(path.matchesGlob('src/new.ts', entry.files[1]) && !entry.files.some((g) => path.matchesGlob('src/kept.ts', g)), 'the untouched file is outside the entry');

  // the rule itself on the new file and on a clean one
  const bad = runRule(path.join(tmp, 'src/new.ts'), [{ project: false }]);
  ok(bad.length === 1 && /lean cannot prove this \(var\)/.test(bad[0].message) && bad[0].loc.start.line === 2, `the rule reports var at line 2: ${JSON.stringify(bad.map((r) => r.message))}`);
  ok(bad[0].suggest?.length === 1 && bad[0].suggest[0].desc === 'let instead of var', 'a suggestion is offered');
  ok(runRule(path.join(tmp, 'src/draft.tsx'), [{ project: false }]).length === 0, 'a clean file has no report');
} catch (e) {
  failed.push(`threw: ${e.message}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
for (const f of failed) console.log(`FAIL ${f}`);
console.log(`new-code.test: ${passed} of ${passed + failed.length} checks pass`);
process.exitCode = failed.length ? 1 : 0;
