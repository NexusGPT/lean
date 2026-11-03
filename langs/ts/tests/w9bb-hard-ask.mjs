#!/usr/bin/env node
// The w9bb checks: the hard set's ASK and unlisted causes, one mechanism each (design/w9bb-hard-ask-census.md).
//   w9bb-source-nul  ci/ledger.mjs binaryBytes: a TypeScript file holding a raw NUL byte in a template literal (n8n's
//                    quickjs-bridge.ts) is text, its changed unit listed and run; a real binary stays binary, and so does
//                    a source file .gitattributes declares binary. Under the break the file is artifact:binary and no unit of it is listed (the hard set's `unit not listed`).
//
//   node tests/w9bb-hard-ask.mjs           each check green
//   node tests/w9bb-hard-ask.mjs --break   each check once with its mechanism switched off: every one must be red
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const brk = process.argv.includes('--break');
const envOf = (m) => { const env = { ...process.env }; if (m) env.LEAN_BREAK = m; else delete env.LEAN_BREAK; return env; };
const git = (cwd, args) => { const r = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }); if (r.status !== 0) throw new Error(`git ${args[0]}: exit ${r.status}: ${r.stderr}`); return r.stdout.trim(); };

// a repository with a base commit and a head commit that edits one function of a file holding raw NULs, and a binary
function nulRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'w9bb-nul-'));
  git(dir, ['init', '-q']); git(dir, ['config', 'user.email', 'w9bb@lean']); git(dir, ['config', 'user.name', 'w9bb']);
  const file = (cmp) => `export function key(name: string, locale: string): string {\n  return \`\${name}\0\${locale}\`;\n}\n\nexport function wrap(value: number): boolean {\n  return ${cmp};\n}\n`;
  fs.writeFileSync(path.join(dir, 'bridge.ts'), file('isNaN(value)'));
  fs.writeFileSync(path.join(dir, 'blob.bin'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 0xff, 0xfe]));
  fs.writeFileSync(path.join(dir, '.gitattributes'), 'declared.ts binary\n'); // the author's declaration stays binary
  fs.writeFileSync(path.join(dir, 'declared.ts'), file('isNaN(value)'));
  git(dir, ['add', '.']); git(dir, ['commit', '-q', '-m', 'base']);
  const base = git(dir, ['rev-parse', 'HEAD']);
  fs.writeFileSync(path.join(dir, 'bridge.ts'), file('Number.isNaN(value)'));
  fs.writeFileSync(path.join(dir, 'blob.bin'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 3, 4, 0xff, 0xfe]));
  fs.writeFileSync(path.join(dir, 'declared.ts'), file('Number.isNaN(value)'));
  git(dir, ['commit', '-q', '-am', 'head']);
  return { dir, base, head: git(dir, ['rev-parse', 'HEAD']) };
}

const checks = [
  ['w9bb-source-nul', 'a TypeScript file with a raw NUL in a template literal is text, its changed unit listed', (m) => {
    const { dir, base, head } = nulRepo();
    const out = path.join(dir, 'out.json');
    const r = spawnSync(process.execPath, [path.join(here, '..', 'pr.mjs'), '--repo', dir, '--base', base, '--head', head, '--no-project', '--n', '2', '--dafny-seconds', '1', '--runs-dir', path.join(dir, 'runs'), '--json', out], { encoding: 'utf8', env: envOf(m), maxBuffer: 1 << 26 });
    let rows = [];
    try { const j = JSON.parse(fs.readFileSync(out, 'utf8')); rows = j.lean_rows ?? j.rows ?? []; } catch (e) { return { ok: false, detail: `no result (exit ${r.status}): ${String(r.stderr).slice(-300)}` }; }
    const bridge = rows.filter((x) => x.file === 'bridge.ts'), blob = rows.filter((x) => x.file === 'blob.bin' || x.file === 'declared.ts');
    const ok = bridge.some((x) => x.unit === 'wrap' && !/^artifact/.test(String(x.coverage))) && !bridge.some((x) => x.coverage === 'artifact:binary') && new Set(blob.map((x) => x.file)).size === 2 && blob.every((x) => x.coverage === 'artifact:binary');
    fs.rmSync(dir, { recursive: true, force: true });
    return { ok, detail: `exit ${r.status}; bridge.ts: ${bridge.map((x) => `${x.unit} ${x.coverage} ${x.verdict}`).join(', ') || 'no row'}; blob.bin, declared.ts: ${blob.map((x) => `${x.file} ${x.coverage}`).join(', ') || 'no row'}` };
  }],
];

let red = 0;
for (const [mechanism, what, run] of checks) {
  const r = run(brk ? mechanism : null);
  const pass = brk ? !r.ok : r.ok;
  if (!pass) red++;
  console.log(`| ${mechanism} | ${what} | ${brk ? `LEAN_BREAK=${mechanism}: ` : ''}${r.detail} | ${pass ? (brk ? 'RED as it must be' : 'PASS') : 'FAIL'} |`);
}
console.log(`w9bb-hard-ask${brk ? ' --break' : ''}: ${checks.length} checks, ${red} failed`);
process.exit(red ? 1 : 0);
