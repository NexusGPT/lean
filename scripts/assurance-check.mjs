#!/usr/bin/env node
// The assurance case's own check: every line of docs/ASSURANCE.md names the check that enforces it, written
// `check: <name>`. This script reads the document, finds each named check and runs it, and exits 1 when one is missing
// or red (or when the document names none).
//
//   node scripts/assurance-check.mjs [--doc <file>]
//
// A name is either a node:test name in langs/ts/tests/assurance/*.test.mjs, or a row of the suite (langs/ts/tests/run.mjs)
// written `<kind> <name>` whose command is a standalone script: the row is found in the suite's own text (its add(...)
// call and its script path) and that script is run alone, as the suite runs it. The suite itself is never run here.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const docFile = argv.includes('--doc') ? path.resolve(argv[argv.indexOf('--doc') + 1]) : path.join(root, 'docs/ASSURANCE.md');
const testsDir = path.join(root, 'langs/ts/tests/assurance');
const suiteFile = path.join(root, 'langs/ts/tests/run.mjs');

// the suite rows that run a standalone script: the row's add(...) prefix (or the same arguments to scriptRow(...), which
// adds the row itself) and the script, both as the suite writes them
const SUITE_ROWS = {
  'runtime clock-read': { add: "add('runtime', 'clock-read'", script: 'langs/ts/tests/clock-read.mjs', cited: "'clock-read.mjs'" },
  'runtime no-silent-exit': { add: "add('runtime', 'no-silent-exit'", script: 'langs/ts/tests/no-silent-exit.mjs', cited: "'no-silent-exit.mjs'" },
  'runtime certificate-timing': { add: "add('runtime', 'certificate-timing'", script: 'langs/ts/tests/certificate-timing.mjs', cited: "'certificate-timing.mjs'" },
  'repo pr intake': { add: "add('repo', 'pr intake'", script: 'langs/ts/tests/fixtures/pr-intake/test.mjs', cited: "'fixtures/pr-intake/test.mjs'" },
};

const doc = fs.readFileSync(docFile, 'utf8');
const named = [...new Set([...doc.matchAll(/`check: ([^`]+)`/g)].map((m) => m[1].trim()))];

// node:test names, read from the files' own text: test('<name>', ...)
const unescape = (s) => s.replace(/\\(.)/g, '$1');
const nodeTests = new Map();
for (const f of fs.existsSync(testsDir) ? fs.readdirSync(testsDir).filter((x) => x.endsWith('.test.mjs')).sort() : []) {
  const text = fs.readFileSync(path.join(testsDir, f), 'utf8');
  for (const m of text.matchAll(/\btest\(\s*'((?:[^'\\]|\\.)*)'/g)) nodeTests.set(unescape(m[1]), path.join(testsDir, f));
}
const suiteText = fs.existsSync(suiteFile) ? fs.readFileSync(suiteFile, 'utf8') : '';

const rows = [];
const byFile = new Map();
for (const name of named) {
  if (nodeTests.has(name)) { const f = nodeTests.get(name); if (!byFile.has(f)) byFile.set(f, []); byFile.get(f).push(name); rows.push({ name, kind: 'node:test', file: f }); continue; }
  const s = SUITE_ROWS[name];
  if (s && [s.add, s.add.replace(/^add\(/, 'scriptRow(')].some((x) => suiteText.includes(x)) && suiteText.includes(s.cited) && fs.existsSync(path.join(root, s.script))) { rows.push({ name, kind: 'suite row', script: s.script }); continue; }
  rows.push({ name, kind: 'missing', ok: false, detail: s ? 'the suite no longer holds this row or its script' : 'no node:test and no suite row of this name' });
}

// each node:test file runs once; a name is green only when the TAP stream says `ok` for it
for (const [file, names] of byFile) {
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', file], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
  const tap = (r.stdout ?? '') + (r.stderr ?? '');
  const result = new Map();
  for (const m of tap.matchAll(/^\s*(not ok|ok) \d+ - (.*)$/gm)) result.set(m[2].replace(/\\#/g, '#').replace(/\\\\/g, '\\').trim(), m[1] === 'ok');
  for (const row of rows.filter((x) => x.file === file)) {
    const got = result.get(row.name);
    row.ok = got === true;
    row.detail = got === undefined ? `not reported by ${path.relative(root, file)} (exit ${r.status})` : got ? path.relative(root, file) : `failed in ${path.relative(root, file)}`;
  }
}
for (const row of rows.filter((x) => x.kind === 'suite row')) {
  const r = spawnSync(process.execPath, [path.join(root, row.script)], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
  const last = ((r.stdout ?? '') + (r.stderr ?? '')).trim().split('\n').pop() ?? '';
  row.ok = r.status === 0;
  row.detail = `${row.script}: ${last.slice(0, 140)}`;
}

const width = Math.max(5, ...rows.map((r) => r.name.length));
console.log(`| ${'check'.padEnd(width)} | kind      | res  | detail`);
for (const r of rows) console.log(`| ${r.name.padEnd(width)} | ${r.kind.padEnd(9)} | ${r.ok ? 'PASS' : 'FAIL'} | ${r.detail}`);
const failed = rows.filter((r) => !r.ok).length;
console.log(`| TOTAL | ${rows.length} named checks | ${rows.length === 0 ? 'NONE NAMED' : failed === 0 ? 'ALL PASS' : `${failed} FAILED`} |`);
process.exit(rows.length > 0 && failed === 0 ? 0 : 1);
