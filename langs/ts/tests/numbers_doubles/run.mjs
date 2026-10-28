#!/usr/bin/env node
// numbers_doubles: the doubles reading measured on Z3 before lane A uses it (lane doubles, step 0).
//   node run.mjs [--seconds 60] [--out table.md] [--only a,b]
// Each case of cases.json is a parent and a candidate expression over number parameters, an expected verdict
// (equal | differs) and the SMT-LIB QF_FP reading of both sides over prelude.smt2. The query asks Z3 for an input where
// the two results differ by SMT `=` (JavaScript SameValue). unsat = equal; sat = a counterexample, decoded from its
// bits and REPLAYED in Node: replay differs = a witness, replay agrees = an encoding finding (or, when the case reads
// a function uninterpreted, a spurious model of that function). `known` inputs (null is NaN) are replayed too: each
// must differ in Node, so a "differs" case is a real difference before Z3 is asked. The seams step compares the
// prelude's %, Math.round, Math.min/max and ToInt32/ToUint32 with Node on edge doubles in one Z3 call.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const seconds = Number(opt('--seconds', 60));
const only = opt('--only', null)?.split(',');
const prelude = fs.readFileSync(path.join(here, 'prelude.smt2'), 'utf8');
const cases = JSON.parse(fs.readFileSync(path.join(here, 'cases.json'), 'utf8')).filter((c) => !only || only.includes(c.name));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-doubles-'));

// a double as an SMT-LIB FloatingPoint literal, bit for bit
export function fpLiteral(x) {
  const b = new DataView(new ArrayBuffer(8)); b.setFloat64(0, x);
  const bits = b.getBigUint64(0).toString(2).padStart(64, '0');
  return `(fp #b${bits[0]} #b${bits.slice(1, 12)} #b${bits.slice(12)})`;
}
// an SMT-LIB FloatingPoint value as Z3 prints it, back to a double
export function fpValue(text) {
  const t = text.trim();
  const special = t.match(/^\(_ (NaN|\+zero|-zero|\+oo|-oo) 11 53\)$/);
  if (special) return { NaN: NaN, '+zero': 0, '-zero': -0, '+oo': Infinity, '-oo': -Infinity }[special[1]];
  const m = t.match(/^\(fp (#[bx][0-9a-fA-F]+) (#[bx][0-9a-fA-F]+) (#[bx][0-9a-fA-F]+)\)$/);
  if (!m) throw new Error(`not a binary64 value: ${t}`);
  const bin = (s, w) => (s[1] === 'b' ? s.slice(2) : BigInt('0x' + s.slice(2)).toString(2)).padStart(w, '0');
  const bits = bin(m[1], 1) + bin(m[2], 11) + bin(m[3], 52);
  if (bits.length !== 64) throw new Error(`not 64 bits: ${t}`);
  const b = new DataView(new ArrayBuffer(8)); b.setBigUint64(0, BigInt('0b' + bits)); return b.getFloat64(0);
}
const show = (x) => (Object.is(x, -0) ? '-0' : typeof x === 'number' ? String(x) : JSON.stringify(x));
export function z3(query, secs, name) {
  const file = path.join(tmp, `${name}.smt2`); fs.writeFileSync(file, query);
  const t0 = process.hrtime.bigint();
  const r = spawnSync('z3', [`-T:${secs}`, file], { encoding: 'utf8', timeout: (secs + 10) * 1000, maxBuffer: 1 << 26 });
  const s = Number(process.hrtime.bigint() - t0) / 1e9;
  const out = (r.stdout ?? '') + (r.stderr ?? '');
  const first = out.trim().split('\n')[0] ?? '';
  const answer = /^(unsat|sat|unknown|timeout)$/.test(first) ? (first === 'timeout' ? 'unknown' : first) : r.error?.code === 'ETIMEDOUT' ? 'unknown' : 'error';
  return { answer, seconds: s, out };
}
// the value of each named term in a get-value answer: `((a (fp ...)) (b (_ NaN 11 53)))`
export function modelValues(out, names) {
  const res = {};
  for (const n of names) {
    const esc = n.replace(/[|.$]/g, (c) => '\\' + c);
    const m = out.match(new RegExp(`\\(${esc} (\\(fp [^)]*\\)|\\(_ [^)]*\\))\\)`));
    if (!m) throw new Error(`no model value for ${n}`);
    res[n] = fpValue(m[1]);
  }
  return res;
}

const rows = [];
// ---- seams: the prelude's encodings against Node on edge doubles ----
{
  const edge = [NaN, 0, -0, Infinity, -Infinity, 0.5, -0.5, 0.49999999999999994, -0.49999999999999994, 1.5, -1.5, 2.5, -2.5, -3.5, 1, -1,
    4, -4, 2, 7.25, -7.25, 1e-300, -5e-324, 5e-324, 2 ** 31, -(2 ** 31), 2 ** 31 - 1, 2 ** 32, 2 ** 32 + 5, -(2 ** 32) - 5, 4294967295.5, 2 ** 53, 2 ** 53 - 1,
    -(2 ** 53), 1e20, -1e20, 2 ** 84, 2 ** 84 + 2 ** 32 * 3, 2 ** 83 + 2 ** 31, -(2 ** 83) - 2 ** 31, 1.7976931348623157e308, -1.7976931348623157e308, 0.1, 3, 1e9 + 0.5, 6.02e23];
  const pairsOf = edge.flatMap((a) => edge.map((b) => [a, b]));
  const unary = { 'js.round': Math.round, 'js.int32': (x) => x | 0, 'js.uint32': (x) => x >>> 0 };
  const binary = { 'js.rem': (a, b) => a % b, 'js.min': Math.min, 'js.max': Math.max };
  const terms = [], want = [];
  for (const [f, g] of Object.entries(unary)) for (const a of edge) { terms.push(`(${f} ${fpLiteral(a)})`); want.push([`${f}(${show(a)})`, g(a)]); }
  for (const [f, g] of Object.entries(binary)) for (const [a, b] of pairsOf) { terms.push(`(${f} ${fpLiteral(a)} ${fpLiteral(b)})`); want.push([`${f}(${show(a)}, ${show(b)})`, g(a, b)]); }
  const names = terms.map((_, i) => `t${i}`);
  const q = `${prelude}\n${terms.map((t, i) => `(define-fun t${i} () D ${t})`).join('\n')}\n(check-sat)\n(get-value (${names.join(' ')}))\n`;
  const r = z3(q, 120, 'seams');
  let bad = [];
  try { const v = modelValues(r.out, names); bad = want.filter(([, w], i) => !Object.is(v[names[i]], w)).map(([l, w], i) => `${l}: Node ${show(w)}, SMT ${show(v[names[want.findIndex((x) => x[0] === l)]])}`); } catch (e) { bad = [String(e.message)]; }
  rows.push({ name: 'seams', parent: '%, Math.round, Math.min/max, ToInt32, ToUint32', candidate: `Node, ${want.length} edge evaluations`, expect: 'agree', got: bad.length ? 'DISAGREE' : 'agree', ok: r.answer === 'sat' && bad.length === 0, seconds: r.seconds, cex: bad.slice(0, 6).join('; ') });
}

// ---- cases ----
const replay = (c, args) => {
  const f = (e) => new Function(...c.params, `return (${e});`);
  return { parent: f(c.parent)(...args), candidate: f(c.candidate)(...args) };
};
for (const c of cases) {
  const knownBad = (c.known ?? []).map((k) => k.map((v) => (v === null ? NaN : v))).filter((args) => { const r = replay(c, args); return Object.is(r.parent, r.candidate); });
  const sort = (t) => (/^\((fp\.(eq|lt|leq|gt|geq|is\w+)|not|and|or|=)\b/.test(t.trim()) ? 'Bool' : 'D');
  const ufs = (c.uninterpreted ?? []).map((u) => `(declare-fun |${u}| (D) D)`).join('\n');
  const q = `${prelude}\n${ufs}\n${c.params.map((p) => `(declare-const ${p} D)`).join('\n')}\n(define-fun old () ${sort(c.smt[0])} ${c.smt[0]})\n(define-fun new () ${sort(c.smt[1])} ${c.smt[1]})\n(assert (not (= old new)))\n(check-sat)\n(get-value (${c.params.join(' ')}))\n`;
  const r = z3(q, seconds, c.name);
  let got = r.answer === 'unsat' ? 'equal' : r.answer, cex = '';
  if (r.answer === 'sat') {
    const v = modelValues(r.out, c.params), args = c.params.map((p) => v[p]), rr = replay(c, args);
    const differs = !Object.is(rr.parent, rr.candidate);
    got = differs ? 'differs' : c.uninterpreted ? 'unknown (uninterpreted: spurious model)' : 'ENCODING FINDING';
    cex = `${c.params.map((p, i) => `${p}=${show(args[i])}`).join(', ')} -> ${show(rr.parent)} vs ${show(rr.candidate)}`;
  }
  if (knownBad.length) got = `KNOWN INPUT AGREES: ${knownBad.map((a) => a.map(show).join(',')).join('; ')}`;
  rows.push({ name: c.name, parent: c.parent, candidate: c.candidate, expect: c.expect, got, ok: got === c.expect, seconds: r.seconds, cex });
}

const secs = rows.filter((r) => r.name !== 'seams').map((r) => r.seconds).sort((a, b) => a - b);
const q = (p) => secs[Math.min(secs.length - 1, Math.floor(p * secs.length))];
const median = secs.length % 2 ? secs[(secs.length - 1) / 2] : (secs[secs.length / 2 - 1] + secs[secs.length / 2]) / 2;
const differCases = rows.filter((r) => r.expect === 'differs'), differTimeouts = differCases.filter((r) => /unknown/.test(r.got)).length;
const lines = ['| case | parent | candidate | expected | Z3 verdict | counterexample (replayed in Node) | seconds |', '|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.name} | \`${r.parent}\` | \`${r.candidate}\` | ${r.expect} | ${r.got}${r.ok ? '' : ' (MISMATCH)'} | ${r.cex.replace(/\|/g, '\\|')} | ${r.seconds.toFixed(2)} |`),
  '', `Z3: ${spawnSync('z3', ['--version'], { encoding: 'utf8' }).stdout.trim()}; timeout ${seconds} s per query; ${secs.length} case queries: median ${median.toFixed(2)} s, p90 ${q(0.9).toFixed(2)} s, max ${secs[secs.length - 1].toFixed(2)} s; differ-cases timed out: ${differTimeouts} of ${differCases.length}.`,
  `Stop rule (brief step 0): median over 10 s or most differ-cases timing out. ${median > 10 || differTimeouts * 2 > differCases.length ? 'STOP.' : 'Not met: continue.'}`,
  `${rows.filter((r) => r.ok).length} of ${rows.length} rows as expected.`];
const text = lines.join('\n');
console.log(text);
if (opt('--out', null)) fs.writeFileSync(opt('--out'), text + '\n');
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(rows.every((r) => r.ok) ? 0 : 1);
