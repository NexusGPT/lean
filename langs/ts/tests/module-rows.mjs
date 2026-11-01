// The module rows (translate/library.json `receiver: module`, library-rows.mjs moduleRow; design/w2b-node-fakes.md):
// path.join on strings imported from node:path is one pure bodiless function for the lint and the translator, never a
// world transition, and its unit is no effectful unit; a call the rows do not admit (an argument that is not a string,
// path.resolve, which reads the working directory) stays a transition. --break: the same reading with a table without
// the module rows (LEAN_LIBRARY_TABLE): every pure assertion fails.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), ts = path.join(here, '..');
const BREAK = process.argv.includes('--break');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-modrows-'));
const env = { ...process.env };
if (BREAK) { const t = JSON.parse(fs.readFileSync(path.join(ts, 'translate/library.json'), 'utf8')); t.operations = t.operations.filter((o) => o.receiver !== 'module'); fs.writeFileSync(path.join(tmp, 'table.json'), JSON.stringify(t)); env.LEAN_LIBRARY_TABLE = path.join(tmp, 'table.json'); }
const pair = path.join(here, 'pairs/fake_path_row');
fs.copyFileSync(path.join(pair, 'node-path.d.ts'), path.join(tmp, 'node-path.d.ts'));
fs.copyFileSync(path.join(pair, 'tsconfig.json'), path.join(tmp, 'tsconfig.json'));
fs.writeFileSync(path.join(tmp, 'unit.ts'), `import path from 'node:path';
import { join } from 'node:path';
export function both(dir: string, name: string): string { return path.join(dir, name) + join(name, dir); }
export function inCallback(dirs: string[], name: string): string[] { return dirs.map((d) => path.join(d, name)); }
export function notString(dir: string, n: any): string { return path.join(dir, n); }
export function cwdRead(dir: string): string { return path.resolve(dir); }
`);
const tr = spawnSync(process.execPath, [path.join(ts, 'translate/translate.mjs'), path.join(tmp, 'unit.ts'), '--core', '--suffix', 'p', '--out', path.join(tmp, 'unit.dfy'), '--prelude', path.join(tmp, 'unit.pre.dfy'), '--project', path.join(tmp, 'tsconfig.json')], { encoding: 'utf8', env });
const lint = spawnSync(process.execPath, [path.join(ts, 'lint/lint.mjs'), path.join(tmp, 'unit.ts'), '--project', path.join(tmp, 'tsconfig.json'), '--json'], { encoding: 'utf8', env });
const dfy = fs.existsSync(path.join(tmp, 'unit.dfy')) ? fs.readFileSync(path.join(tmp, 'unit.dfy'), 'utf8') : '';
fs.rmSync(tmp, { recursive: true, force: true });
assert.equal(tr.status, 0, `translate: ${(tr.stderr || tr.stdout).trim().slice(-300)}`);
const body = (u) => { const m = dfy.match(new RegExp(`function ${u}_p\\(([^)]*)\\)[^{]*\\{([\\s\\S]*?)\\n\\}`)); return m ? { params: m[1], body: m[2] } : null; };
const report = [];
const pure = (u) => { const b = body(u); assert.ok(b, `${u} translated`); report.push(`${u}: ${b.params.startsWith('wld: World') ? 'transition' : 'pure'}`); return !b.params.startsWith('wld: World') && !/_World_/.test(b.body); };
assert.ok(pure('both'), 'a default and a named import of node:path: path.join on strings is a pure function');
assert.ok(pure('in_callback'), 'path.join inside an array callback: no transition, so a pure lambda');
assert.ok(!pure('not_string'), 'an argument that is not a string stays a transition');
assert.ok(!pure('cwd_read'), 'path.resolve reads the working directory: a transition');
const findings = (() => { try { return JSON.parse(lint.stdout); } catch { return null; } })();
const refusals = Array.isArray(findings) ? findings.filter((f) => /in_callback|inCallback/.test(JSON.stringify(f)) && f.severity !== 'advice') : null;
if (refusals) assert.equal(refusals.length, 0, `the lint admits the callback the translator reads: ${JSON.stringify(refusals).slice(0, 300)}`);
console.log(`module rows: ${report.join('; ')}${refusals ? '; lint: callback admitted' : ''}${BREAK ? ' (--break: the table without module rows)' : ''}`);
