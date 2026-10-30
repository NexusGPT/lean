#!/usr/bin/env node
// bin/lean is the one entry point: `lean check | lint | pr | census` runs the script of that name with its arguments
// and returns its exit code. The README quickstart, read from the README itself (its first `node langs/ts/check.mjs`
// line, its jq projection and the line it prints), run as `bin/lean check` gives the line the README shows; an unknown
// command and no command exit 2, --help exits 0, the lint's exit 1 on findings comes through. Exit 1 on a difference.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const lean = path.join(root, 'bin/lean');
const run = (args) => spawnSync(lean, args, { cwd: root, encoding: 'utf8' });
let bad = 0;
const row = (name, ok, detail) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${detail}`); if (!ok) bad++; };

const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const [, block, shown] = readme.match(/```bash\n([\s\S]*?)```\s*```\n(.*)\n```/) ?? [];
const command = (block ?? '').split('\n').find((l) => l.startsWith('node langs/ts/check.mjs '));
const jq = (block ?? '').split('\n').find((l) => l.startsWith('jq -c '));
if (!command || !jq || !shown) { console.error('FAIL the README quickstart: no check.mjs line, jq line or shown output found'); process.exit(1); }
// the projection the README's jq prints: `.witness | {key: .path, ...}`, each value a path of fields and [index]
const fields = [...jq.match(/\{(.*)\}/)[1].matchAll(/(\w+)(?::\s*(\.[\w.[\]]+))?/g)].map(([, k, p]) => [k, p ?? `.${k}`]);
const at = (v, p) => p.split(/\.|\[(\d+)\]/).filter(Boolean).reduce((x, k) => x?.[k], v);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-bin-'));
const out = path.join(tmp, 'ledger.json');
const args = command.replace(/^node langs\/ts\/check\.mjs /, '').split(/\s+/).filter(Boolean);
const outAt = args.indexOf('--out'); if (outAt >= 0) args[outAt + 1] = out; else args.push('--out', out);
const r = run(['check', ...args]);
let got = null;
try { const w = JSON.parse(fs.readFileSync(out, 'utf8')).witness; got = JSON.stringify(Object.fromEntries(fields.map(([k, p]) => [k, at(w, p)]))); } catch (e) { got = `no certificate: ${e.message}`; }
row('lean check, the README quickstart', r.status === 0 && got === shown.trim(), `exit ${r.status}; ${got}${got === shown.trim() ? '' : ` against the README's ${shown.trim()}`}${r.status === 0 ? '' : `; ${r.stderr.trim().slice(-200)}`}`);
fs.rmSync(tmp, { recursive: true, force: true });

const none = run([]), unknown = run(['nope']), help = run(['--help']);
row('no command', none.status === 2 && /^usage: lean /.test(none.stderr), `exit ${none.status}`);
row('unknown command', unknown.status === 2 && /unknown command "nope"/.test(unknown.stderr), `exit ${unknown.status}`);
row('--help', help.status === 0 && /^usage: lean /.test(help.stdout), `exit ${help.status}`);
const census = run(['census', '--help']);
row('lean census --help', census.status === 0 && /^usage: node census\.mjs/.test(census.stdout), `exit ${census.status}`);
const lint = run(['lint', 'docs/examples/limits/quote.ts', '--any-type']);
row('lean lint exit on findings', lint.status === 1 && /any-type/.test(lint.stdout), `exit ${lint.status}`);
const pr = run(['pr']);
row('lean pr usage', pr.status === 2 && /^usage: pr\.mjs/.test(pr.stderr), `exit ${pr.status}`);
if (bad) process.exit(1);
console.log('bin-lean: lean check reproduces the README quickstart; lint, pr and census dispatched with their exit codes');
