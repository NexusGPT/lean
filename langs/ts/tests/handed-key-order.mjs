// The key order of a record handed to an outside call (translate.mjs orderedArg, design/handed-key-order.md): where the
// reading cannot name the order of a record the unit builds and hands, the translator refuses the unit (key-order),
// never reading two orders as one value; a literal, a const local a literal initialises and an object the unit did not
// build are read. Each unit is translated alone (--fn). --break: the same units under LEAN_BREAK=handed-key-order (the
// order beside the argument off): every refusal row fails, since each unit then translates.
//   node langs/ts/tests/handed-key-order.mjs [--break]        one summary line, exit 0 when every row holds
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), ts = path.join(here, '..');
const BREAK = process.argv.includes('--break');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-keyorder-'));
const env = { ...process.env, ...(BREAK ? { LEAN_BREAK: 'handed-key-order' } : {}) };
fs.writeFileSync(path.join(tmp, 'unit.ts'), `export type Pt = { a: number; b: string };
export type Opt = { a: number; c?: number };
function mk(x: number, y: string): Pt { return { a: x, b: y }; }
class Made { a = 1; b = 'b'; }
class Cond { a?: number; b = 1; constructor(f: boolean) { if (f) this.a = 1; } }
export function pushed(x: number, y: string): string { const out: Pt[] = []; out.push({ a: x, b: y }); return JSON.stringify(out); }
export function sameFileResult(x: number, y: string): string { return JSON.stringify(mk(x, y)); }
export function condSpread(c: boolean, x: number, y: string): string { return JSON.stringify({ a: x, ...(c ? { b: y } : {}) }); }
export function condSpreadOnField(o: { on: boolean }, x: number, y: string): string { return JSON.stringify({ a: x, ...(o.on ? { b: y } : {}) }); }
export function keyAdded(p: Opt): string { p.c = 1; return JSON.stringify(p); }
export function storedInParam(ps: Pt[], x: number, y: string): string { ps.push({ a: x, b: y }); return JSON.stringify(ps); }
export function madeByClass(): string { return JSON.stringify(new Made()); }
export function condClass(f: boolean): string { return JSON.stringify(new Cond(f)); }
export function ownSpread(p: Pt, x: number): string { return JSON.stringify({ ...p, c: x }); }
export function aliasedLocal(x: number, y: string): string { const r = { a: x, b: y }; const s = r; return JSON.stringify(s); }
export function literal(x: number, y: string): string { return JSON.stringify({ b: y, a: x }); }
export function constLocal(x: number, y: string): string { const r = { a: x, b: y }; r.a = 2; return JSON.stringify(r); }
export function param(p: Pt): string { return JSON.stringify(p); }
export function paramUntouched(p: Opt, q: Pt): string { q.a = 1; return JSON.stringify(p); }
`);
const refused = ['pushed', 'sameFileResult', 'condSpreadOnField', 'keyAdded', 'storedInParam', 'condClass', 'aliasedLocal'];
const read = ['literal', 'constLocal', 'madeByClass', 'ownSpread', 'condSpread', 'param', 'paramUntouched'];
let bad = 0, rows = 0;
const row = (ok, text) => { rows++; if (!ok) bad++; console.log(`| ${ok ? 'PASS' : 'FAIL'} | ${text}`); };
for (const fn of [...refused, ...read]) {
  const r = spawnSync(process.execPath, [path.join(ts, 'translate/translate.mjs'), path.join(tmp, 'unit.ts'), '--fn', fn, '--core', '--no-project', '--suffix', 'p', '--out', path.join(tmp, `${fn}.dfy`), '--prelude', path.join(tmp, `${fn}.pre.dfy`)], { encoding: 'utf8', env });
  const text = (r.stdout + r.stderr).trim();
  const keyOrder = r.status !== 0 && /key-order: a record handed to an outside call/.test(text);
  if (refused.includes(fn)) row(keyOrder, `${fn}: refused (key-order) -- exit ${r.status}: ${text.split('\n').pop().slice(0, 200)}`);
  else {
    const dfy = r.status === 0 ? fs.readFileSync(path.join(tmp, `${fn}.dfy`), 'utf8') : '';
    const ordered = /ext_key_order_/.test(dfy);
    const wantOrdered = ['literal', 'constLocal', 'madeByClass', 'ownSpread', 'condSpread'].includes(fn); // a built tree is handed with its order; an own object as itself
    row(r.status === 0 && (BREAK || ordered === wantOrdered), `${fn}: read${wantOrdered ? ', with its key order' : ', as itself'} -- exit ${r.status}${r.status === 0 ? `, key order ${ordered ? 'beside it' : 'none'}` : `: ${text.split('\n').pop().slice(0, 200)}`}`);
  }
}
console.log(`| HANDED KEY ORDER${BREAK ? ' --break' : ''} | ${rows} rows | ${bad === 0 ? 'ALL PASS' : `${bad} FAILED`} |`);
process.exit(bad === 0 ? 0 : 1);
