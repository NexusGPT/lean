// The solver's counterexample to a failed equality lemma, replayed as a witness (design/w3a-counterexample.md,
// 2026-11-01, lane w3a-counterexample).
//
//   counterexample({ dir, unit, lemma, unitFn, parent, candidate, project, seconds }) ->
//     { status: 'witness', input, value, args, parent, candidate, where, replayed, model }
//                                                                               the replay in lane B differs: a WITNESS
//     { status: 'unconfirmed', input, reason, model }                           an input the model proposes that the replay does not separate
//     { status: 'none', reason }                                                no model: the solver gave none, or the lemma failed for a resource reason
//
// One extraction per unit: `dafny verify --extract-counterexample` on the theorem lane A already wrote, under the same
// resource limit (exec/dafny-args.mjs), the unit's own lemma only. Dafny prints the model's initial state as one Dafny
// conjunction (`assume 7919 == x && 3 == |s| && ...;`); a sequence the model holds only by its length (the solver had
// no reason to name its elements) is asked once more with the elements named: the same lemma, the first state assumed
// and one ghost read per element, so the second model is a model of the first one with every element a term. The
// conjunction is read into values of the lemma's parameter types (the types the model declares, read as
// conformance/dafny-text.mjs reads them; a heap reference rebuilt from the `// SHAPES` legend as conformance/heap.mjs
// rebuilds a cell) and then into JavaScript values as conformance/bridge.mjs maps them; a part the model leaves free
// takes its type's first value. The input is run on both sides as lane B runs a drawn input (exec/run.mjs: the
// sandbox, the fakes, the environment, the unit picked, observe), and judged as lane B judges: a difference that is
// only an undriven callback, only a module lean could not load, or only function text is no difference. Only a
// replayed difference is a WITNESS; the model alone never is (Dafny's own warning: a counterexample "may be
// inconsistent or invalid"). The input travels by value: the certificate carries it encoded (witness.value,
// encodeValue) beside its rendering (witness.args), and the replay decodes that value for each side, never a seed and
// an index, so a reader replays the WITNESS from the certificate alone (replayWitness).
import fs from 'node:fs';
import path from 'node:path';
import { spawnCollect } from '../exec/capped.mjs';
import { dafnyVerifyArgs, outOfResourceLines } from '../exec/dafny-args.mjs';
import { declarations, parseType, splitTop, legendOf } from '../conformance/dafny-text.mjs';
import { dn } from '../common.mjs';

// the longest sequence whose elements are named in the second extraction
export const CEX_ELEMENTS = 64;
// LEAN_BREAK=<mechanism,...> switches a named mechanism off, for the suite row that shows its pair goes red without it
// (tests/run.mjs `counterexample`): `cex-replay` takes the model's input as the WITNESS without running it,
// `cex-replay-by-index` replays lane B's draw at the replay's index instead of the model's value
const breaks = () => new Set(String(process.env.LEAN_BREAK ?? '').split(',').map((x) => x.trim()).filter(Boolean));

// ---------------------------------------------------------------------------------------------------------------
// reading Dafny's counterexample text

// the conjunction of the first state Dafny prints for the error at one of `lines` (1-based), else null
export function initialState(text, lines) {
  const want = new Set(lines);
  const blocks = String(text).split(/\n(?=\S[^\n]*\(\d+,\d+\): Error)/);
  for (const b of blocks) {
    const m = b.match(/\((\d+),\d+\): Error/); if (!m || !want.has(Number(m[1]))) continue;
    const s = b.match(/initial state:\s*\n\s*assume ([\s\S]*?);\s*\n/);
    if (s) return { line: Number(m[1]), conj: s[1].trim(), block: b };
  }
  return null;
}
// the conjunction of the state Dafny prints after the statement at `line` in one error's block, else null
export function stateAfter(block, line) {
  const s = String(block).match(new RegExp(`\\(${line},\\d+\\):\\s*\\n\\s*assume ([\\s\\S]*?);\\s*\\n`));
  return s ? s[1].trim() : null;
}

// split a Dafny expression at a top-level separator, minding brackets, strings and characters
export function splitDafny(s, sep) {
  const out = []; let depth = 0, cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") { const j = endQuote(s, i); cur += s.slice(i, j + 1); i = j; continue; }
    if ('([{'.includes(c) || (c === '|' && depth >= 0 && openBar(s, i, cur))) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === '|' && cur.includes('|')) depth--;
    if (depth === 0 && s.startsWith(sep, i)) { out.push(cur.trim()); cur = ''; i += sep.length - 1; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
const openBar = (s, i, cur) => (cur.match(/\|/g) ?? []).length % 2 === 0; // |t| opens on its first bar, closes on the second
function endQuote(s, i) { const q = s[i]; for (let j = i + 1; j < s.length; j++) { if (s[j] === '\\') { j++; continue; } if (s[j] === q) return j; } return s.length - 1; }

// a Dafny value or term as a tree: {k:'int'|'real'|'bool'|'char'|'str'|'seq'|'set'|'map'|'ctor'|'term', ...}
export function parseValue(s) {
  s = s.trim();
  while (s.startsWith('(') && matching(s, 0) === s.length - 1 && !s.includes(',')) s = s.slice(1, -1).trim();
  if (/^-?\d+$/.test(s)) return { k: 'int', v: BigInt(s) };
  if (/^\(?-\s*\d+\)?$/.test(s)) return { k: 'int', v: BigInt(s.replace(/[()\s]/g, '')) };
  let m;
  if ((m = s.match(/^(-?)\s*(\d+)\.(\d+)(?:e(-?\d+))?$/))) return { k: 'real', ...decimal(m[1], m[2], m[3], m[4]) };
  if ((m = s.match(/^\(?(-?\s*\d+\.\d+)\s*\/\s*(\d+\.\d+)\)?$/))) { const a = parseValue(m[1]), b = parseValue(m[2]); return { k: 'real', num: a.num * b.den, den: a.den * b.num }; }
  if (s === 'true' || s === 'false') return { k: 'bool', v: s === 'true' };
  if (s.startsWith("'") && endQuote(s, 0) === s.length - 1) return { k: 'char', v: unescape(s.slice(1, -1)) };
  if (s.startsWith('"') && endQuote(s, 0) === s.length - 1) return { k: 'str', v: unescape(s.slice(1, -1)) };
  if (s.startsWith('[') && matching(s, 0) === s.length - 1) return { k: 'seq', items: splitDafny(s.slice(1, -1), ',').map(parseValue) };
  if (s.startsWith('{') && matching(s, 0) === s.length - 1) return { k: 'set', items: splitDafny(s.slice(1, -1), ',').map(parseValue) };
  if (s.startsWith('map[') && matching(s, 3) === s.length - 1) return { k: 'map', entries: splitDafny(s.slice(4, -1), ',').map((e) => { const [a, b] = splitDafny(e, ':='); return [parseValue(a), parseValue(b ?? '')]; }) };
  if ((m = s.match(/^([A-Za-z_][A-Za-z0-9_]*)(?:<[^()]*>)?\.([A-Za-z_][A-Za-z0-9_]*)(\(([\s\S]*)\))?$/)) && (!m[3] || matching(s, s.indexOf('(')) === s.length - 1) && /^[A-Z]/.test(m[1]) && !/^hw_$/.test(m[1])) return { k: 'ctor', type: m[1], ctor: m[2], args: m[4] !== undefined ? splitDafny(m[4], ',').map(parseValue) : [] };
  return { k: 'term', text: normTerm(s) };
}
function matching(s, i) { const open = s[i], close = { '(': ')', '[': ']', '{': '}' }[open]; let d = 0; for (let j = i; j < s.length; j++) { const c = s[j]; if (c === '"' || c === "'") { j = endQuote(s, j); continue; } if (c === open) d++; else if (c === close) { d--; if (d === 0) return j; } } return -1; }
function decimal(sign, int, frac, exp) { let num = BigInt(int + frac), den = 10n ** BigInt(frac.length); const e = Number(exp ?? 0); if (e > 0) num *= 10n ** BigInt(e); else if (e < 0) den *= 10n ** BigInt(-e); return { num: sign ? -num : num, den }; }
function unescape(t) {
  return t.replace(/\\U\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})|\\(.)/g, (_, U, u, x, c) => (U ? String.fromCodePoint(parseInt(U, 16)) : u ? String.fromCharCode(parseInt(u, 16)) : x ? String.fromCharCode(parseInt(x, 16)) : ({ n: '\n', r: '\r', t: '\t', 0: '\0' }[c] ?? c)));
}
const normTerm = (t) => t.replace(/\s+/g, '');

// the facts of a conjunction: term -> the value (or another term) the model gives it, and the constructor tests it holds
export function factsOf(conj) {
  const eq = new Map(), is = new Map();
  for (const c of splitDafny(conj, '&&')) {
    const parts = splitDafny(c, ' == ');
    if (parts.length === 2) {
      const [a, b] = parts.map(parseValue);
      if (a.k === 'term') eq.set(a.text, b); else if (b.k === 'term') eq.set(b.text, a);
      if (a.k === 'term' && b.k === 'term') eq.set(b.text, a);
      continue;
    }
    const t = c.match(/^(.*)\.([A-Za-z_][A-Za-z0-9_]*)\?$/);
    if (t) is.set(normTerm(t[1]), t[2]);
  }
  return { eq, is };
}

// the sequences the model holds by their length alone: `|t| == n` with some element t[i] unnamed
export function unnamedSequences(facts, max = CEX_ELEMENTS) {
  const out = [];
  for (const [t, v] of facts.eq) {
    const m = t.match(/^\|(.*)\|$/); if (!m || v.k !== 'int') continue;
    const n = Number(v.v); if (n <= 0 || n > max) continue;
    if (facts.eq.has(m[1]) && ['str', 'seq'].includes(facts.eq.get(m[1]).k)) continue;
    if (Array.from({ length: n }, (_, i) => `${m[1]}[${i}]`).some((x) => !facts.eq.has(x))) out.push({ term: m[1], n });
  }
  return out;
}

// the lemma once more, the first model's state assumed and every element of an unnamed sequence read by a ghost
// variable: the second model is a model of the first state with those elements terms of it
export function probeTheorem(text, lemma, conj, seqs) {
  const lines = text.split('\n');
  const at = lines.findIndex((l) => l.startsWith(`{ // PROOF ${lemma}`));
  if (at < 0) return null;
  const reads = seqs.flatMap(({ term, n }, j) => Array.from({ length: n }, (_, i) => `  ghost var cex_${j}_${i} := ${term}[${i}];`));
  const probe = [`  assume {:axiom} ${conj};`, ...reads];
  return { text: [...lines.slice(0, at + 1), ...probe, ...lines.slice(at + 1)].join('\n'), at: at + 1, inserted: probe.length };
}

// ---------------------------------------------------------------------------------------------------------------
// the model's values, by the lemma's parameter types

export function lemmaParams(text, lemma) {
  const m = text.match(new RegExp(`^lemma (?:\\{[^}]*\\}\\s+)*${lemma}(?:<[^>]*>)?\\((.*)\\)\\s*$`, 'm'));
  if (!m) return null;
  return m[1].trim() === '' ? [] : splitTop(m[1]).map((p) => { const i = p.indexOf(':'); return { name: p.slice(0, i).replace(/^ghost\s+/, '').trim(), type: parseType(p.slice(i + 1)) }; });
}

export class NotBridged extends Error { constructor(why) { super(why); this.why = why; } }

// a reader of the model's values: facts and declarations in, `value(term, type)` a model value out
export function modelReader(text, facts) {
  const decls = declarations(text);
  const resolve = (t, env = {}) => {
    if (t.k === 'name' && env[t.name] && !t.args.length) return resolve(env[t.name]);
    if (t.k === 'name' && t.name === 'BigInt') return t;
    if (t.k === 'name' && decls.synonyms.has(t.name)) { const s = decls.synonyms.get(t.name); const e = {}; s.tparams.forEach((p, i) => { e[p] = t.args[i]; }); return resolve(s.type, e); }
    if (t.k === 'name' && t.args.length) return { ...t, args: t.args.map((a) => resolve(a, env)) };
    if (t.k === 'tuple') return { ...t, items: t.items.map((a) => resolve(a, env)) };
    return t;
  };
  const lookup = (term, seen = new Set()) => { let v = facts.eq.get(term); while (v && v.k === 'term' && !seen.has(v.text)) { seen.add(v.text); v = facts.eq.get(v.text) ?? (seen.size > 32 ? null : v); if (v && v.k === 'term' && !facts.eq.has(v.text)) return v; } return v ?? null; };
  // the value of `term` of type t; `given` a value the model already printed for it (a constructor argument)
  function value(term, t0, given = undefined) {
    const t = resolve(t0);
    let v = given !== undefined ? given : term ? lookup(term) : null;
    if (v && v.k === 'term') { const sub = v.text; v = lookup(sub); if (!v || v.k === 'term') return value(sub, t, null); }
    if (t.k === 'tuple') { if (!t.items.length) return { k: 'unit' }; return { k: 'tuple', items: t.items.map((x, i) => value(term ? `${term}.${i}` : null, x, v && v.k === 'ctor' ? v.args[i] : undefined)) }; }
    if (t.k !== 'name') throw new NotBridged(`type ${t.text}`);
    switch (t.name) {
      case 'int': case 'nat': case 'BigInt': case 'Ref': return { k: 'int', v: v?.k === 'int' ? v.v : 0n, big: t.name === 'BigInt' };
      case 'real': return v?.k === 'real' ? v : v?.k === 'int' ? { k: 'real', num: v.v, den: 1n } : { k: 'real', num: 0n, den: 1n };
      case 'bool': return { k: 'bool', v: v?.k === 'bool' ? v.v : false };
      case 'char': return { k: 'char', v: v?.k === 'char' ? v.v : 'a' };
      case 'string': case 'seq': {
        const el = t.name === 'string' ? { k: 'name', name: 'char', args: [], text: 'char' } : t.args[0];
        if (v?.k === 'str') return { k: 'seq', items: [...v.v].map((c) => ({ k: 'char', v: c })), str: t.name === 'string' || el.name === 'char' };
        if (v?.k === 'seq') return { k: 'seq', items: v.items.map((x, i) => value(term ? `${term}[${i}]` : null, el, x)), str: el.name === 'char' };
        const n = term ? Number(lookup(`|${term}|`)?.v ?? 0) : 0;
        return { k: 'seq', items: Array.from({ length: n }, (_, i) => value(`${term}[${i}]`, el)), str: el.name === 'char' };
      }
      case 'set': return { k: 'set', items: v?.k === 'set' ? v.items.map((x) => value(null, t.args[0], x)) : [] };
      case 'map': return { k: 'map', entries: v?.k === 'map' ? v.entries.map(([a, b]) => [value(null, t.args[0], a), value(null, t.args[1], b)]) : [] };
    }
    if (decls.opaque.has(t.name)) throw new NotBridged(`a value of the opaque type ${t.name}`);
    const d = decls.datatypes.get(t.name);
    if (!d) throw new NotBridged(`type ${t.name}`);
    const env = {}; d.tparams.forEach((p, i) => { env[p] = t.args[i]; });
    let ci = v?.k === 'ctor' ? d.ctors.findIndex((c) => c.name === v.ctor) : -1;
    if (ci < 0 && term && facts.is.has(term)) ci = d.ctors.findIndex((c) => c.name === facts.is.get(term));
    if (ci < 0) ci = 0; // a free value: the first constructor
    const c = d.ctors[ci];
    return { k: 'ctor', type: d.name, ctor: c.name, index: ci, fields: c.fields.map((f, i) => ({ name: f.name, value: value(term ? `${term}.${f.name}` : null, resolve(f.type, env), v?.k === 'ctor' && v.ctor === c.name ? v.args[i] : undefined) })) };
  }
  return { value, resolve, decls, lookup };
}

// ---------------------------------------------------------------------------------------------------------------
// model values into JavaScript: the inverse of conformance/bridge.mjs `into` and the rebuild of conformance/heap.mjs

const PRIMS = new Set(['int', 'real', 'string', 'bool']);
const optOf = (k) => { const m = k.match(/^O([un])_(int|real|string|bool)$/); return m ? { absent: m[1], inner: m[2] } : null; };
// the absence a None stands for, from the TypeScript type (as conformance/pair.mjs absenceIn): undefined unless only null is named
const absenceIn = (tsType, optional = false) => { if (typeof tsType !== 'string') return 'undefined'; const n = /\bnull\b/.test(tsType), u = optional || /\bundefined\b|\bvoid\b|\?\s*:/.test(tsType); return n && !u ? 'null' : 'undefined'; };

export function jsOf(x, { spec = null, none = 'undefined' } = {}) {
  switch (x.k) {
    case 'unit': return undefined;
    case 'int': { if (x.big) return x.v; const n = Number(x.v); return BigInt(n) === x.v ? n : x.v; }
    case 'real': return Number(x.num) / Number(x.den);
    case 'bool': return x.v;
    case 'char': return x.v;
    case 'seq': return x.str ? x.items.map((c) => c.v).join('') : x.items.map((e) => jsOf(e, { spec: spec?.of ?? null }));
    case 'tuple': return x.items.map((e, i) => jsOf(e, { spec: spec?.items?.[i] ?? null }));
    case 'set': return new Set(x.items.map((e) => jsOf(e)));
    case 'map': return new Map(x.entries.map(([a, b]) => [jsOf(a), jsOf(b)]));
    case 'ctor': return ctorJs(x, spec, none);
  }
  throw new NotBridged(`a model value ${x.k}`);
}
function ctorJs(x, spec, none) {
  const f = x.fields;
  switch (x.type) {
    case 'Option': return x.ctor === 'None' ? (none === 'null' ? null : undefined) : jsOf(f[0].value, { spec });
    case 'Nullish': return x.ctor === 'Null' || x.index === 0 ? null : x.index === 1 ? undefined : jsOf(f[0].value, { spec });
    case 'Absent': return x.index === 0 ? null : undefined;
    case 'Unit': return undefined;
  }
  if (f.length && !/^item\d+$/.test(f[0].name) && x.type !== 'Obj') { // a record: its declared fields under their TypeScript keys
    const keys = spec?.kind === 'record' ? Object.keys(spec.fields ?? {}) : [];
    const keyOf = (name) => keys.find((k) => dn(k) === name) ?? name.replace(/_$/, '');
    const o = {};
    for (const fl of f) {
      if (fl.name === 'open_rest_' || fl.name === 'open_index_') continue;
      const k = keyOf(fl.name), fs_ = spec?.fields?.[k]?.spec ?? null;
      if (fl.value.k === 'ctor' && fl.value.type === 'Pres') { if (fl.value.index === 0) continue; o[k] = fl.value.index === 1 ? undefined : jsOf(fl.value.fields[0].value, { spec: fs_ }); continue; }
      if (fl.value.k === 'ctor' && fl.value.type === 'Option' && fl.value.ctor === 'None' && spec?.fields?.[k]?.optional) continue; // a missing optional field and one holding undefined are one value
      o[k] = jsOf(fl.value, { spec: fs_, none: spec?.fields?.[k]?.optional ? 'undefined' : none });
    }
    return o;
  }
  if (f.length === 1) return jsOf(f[0].value, { spec }); // a sum by runtime discriminator: its one field
  throw new NotBridged(`no JavaScript reading of the datatype ${x.type}`);
}

// a heap reference rebuilt from the model's cells by the `// SHAPES` legend (conformance/heap.mjs rebuild, the same
// reading: a record's fields in the legend's order, an array its elements, a dictionary its keys and values)
function heapJs(reader, legend, hwTerm, ref, key, memo = new Map()) {
  if (memo.has(ref)) return memo.get(ref);
  const s = legend.get(key); if (!s || s.kind === 'unknown') throw new NotBridged(`heap shape ${key}`);
  const obj = reader.decls.datatypes.get('Obj'); const ci = obj ? obj.ctors.findIndex((c) => c.name === key) : -1;
  if (ci < 0) throw new NotBridged(`no heap constructor ${key}`);
  const cellTerm = `${hwTerm}.heap[${ref}]`;
  const printed = reader.lookup(cellTerm);
  const cell = reader.value(cellTerm, { k: 'name', name: 'Obj', args: [], text: 'Obj' }, printed && printed.k === 'ctor' && printed.ctor === key ? printed : { k: 'ctor', type: 'Obj', ctor: key, args: [] });
  const parts = cell.fields.map((x) => x.value);
  const el = (x, k) => { if (PRIMS.has(k)) return jsOf(x); const op = optOf(k); if (op) return x.k === 'ctor' && x.index === 0 ? (op.absent === 'u' ? undefined : null) : jsOf(x.fields[0].value); return heapJs(reader, legend, hwTerm, Number(x.v), k, memo); };
  let v;
  if (s.kind === 'arr') { v = []; memo.set(ref, v); for (const x of parts[0].items) v.push(el(x, s.elem)); }
  else if (s.kind === 'set') { v = new Set(); memo.set(ref, v); for (const x of parts[0].items) v.add(el(x, s.elem)); }
  else if (s.kind === 'dict') { v = {}; memo.set(ref, v); const vals = new Map(parts[1].entries.map(([a, b]) => [jsOf(a), b])); for (const k of parts[0].items.map((x) => jsOf(x))) v[k] = vals.has(k) ? el(vals.get(k), s.v) : undefined; }
  else if (s.kind === 'map') { v = new Map(); memo.set(ref, v); const vals = parts[1].entries; for (const k of parts[0].items) { const hit = vals.find(([a]) => JSON.stringify(a) === JSON.stringify(k)); v.set(el(k, s.k), hit ? el(hit[1], s.v) : undefined); } }
  else if (s.kind === 'date') { v = new Date(Number(jsOf(parts[0]))); memo.set(ref, v); }
  else if (s.tuple) { v = []; memo.set(ref, v); s.fields.forEach((f, i) => v.push(el(parts[i], f.key))); }
  else { v = {}; memo.set(ref, v); s.fields.forEach((f, i) => { const x = parts[i], op = optOf(f.key); if (op && op.absent === 'u') { if (x.index === 1) v[f.name] = undefined; else if (x.index === 2) v[f.name] = jsOf(x.fields[0].value); return; } v[f.name] = el(x, f.key); }); }
  return v;
}

// the arguments of the unit's call from the model: the lemma's parameters in order (as conformance/pair.mjs prepare
// reads them), the world parameters skipped, a reference read through the heap, every other value through jsOf
export function argsFromModel(text, lemma, facts, unitFn, spec) {
  const params = lemmaParams(text, lemma);
  if (!params) throw new NotBridged(`no lemma ${lemma}`);
  const reader = modelReader(text, facts);
  const legend = legendOf(text);
  const hyp = (text.match(new RegExp(`^// HYP ${unitFn}: (.+)$`, 'm')) ?? [])[1] ?? '';
  const shapeOf = new Map([...hyp.matchAll(/\bIs([A-Za-z0-9_]+)\(hw_, ([A-Za-z_][A-Za-z0-9_]*)\)/g)].map((m) => [m[2], m[1]]));
  let tsSig = null; try { tsSig = JSON.parse((text.match(new RegExp(`^// SIG ${unitFn}: (.+)$`, 'm')) ?? [])[1] ?? 'null'); } catch { tsSig = null; }
  const make = () => {
    const args = []; let k = 0;
    for (const p of params) {
      const t = reader.resolve(p.type);
      if (t.k === 'name' && (t.name === 'HWorld' || t.name === 'World')) continue;
      if (p.name === 'self' || p.name === 'this_') throw new NotBridged('a receiver the model reads (the replay builds the receiver as lane B does)');
      if (p.name === 'fuel' || p.name === 'slots') throw new NotBridged(`the model parameter ${p.name}`);
      if (p.type.text === 'Ref') { const key = shapeOf.get(p.name); if (!key) throw new NotBridged(`the reference ${p.name} has no shape in the hypothesis`); args.push(heapJs(reader, legend, 'hw_', Number(reader.value(p.name, t).v), key)); k++; continue; }
      args.push(jsOf(reader.value(p.name, t), { spec: spec?.params?.[k]?.spec ?? null, none: absenceIn(tsSig?.params?.[k]?.type, tsSig?.params?.[k]?.optional) })); k++;
    }
    return args;
  };
  return make;
}

// ---------------------------------------------------------------------------------------------------------------
// the replay: lane B's run of one input on both sides (exec/run.mjs mountSides, observeBoth, the comparison)

export async function replayInput({ parent, candidate, unit, project, value, seed = 1, ms = 2000, byIndex = false }) {
  const R = await import('../exec/run.mjs');
  const { Environment, renderDrawn, undecidedDrives, restsOnFunctionText } = await import('../exec/fake.mjs');
  const { enterWorld } = await import('../exec/fake.mjs');
  const plan = R.inputPlan(parent, candidate, unit, { project, seed, values: null });
  const i = 30; // the environment of input 30, past the draw lane B ran (n = 30)
  const sides = {};
  for (const [name, file] of [['parent', parent], ['candidate', candidate]]) {
    const env = new Environment(seed * 7919 + i); env.shapes = plan.spec;
    const exportsObj = R.sandbox(env, R.findRoot(file)).load(file);
    const u = R.pickUnit(exportsObj, plan.spec, env);
    if (!u) return { harness: env.callbackRefusal ?? `${name}: unit ${unit} not exported` };
    await new Promise((r) => setImmediate(r));
    env.trace.length = 0; env.pending.length = 0; env.calls.clear();
    let inputs;
    if (byIndex) inputs = plan.draw(i, env); // the break: the seeded draw at the index, not the model's value
    else { inputs = decodeValue(value); enterWorld(env, plan.spec, i, inputs); } // a fresh copy per side: a call that writes its arguments writes its own
    sides[name] = { env, unit: u, state: exportsObj.__lean_state, inputs, drawn: renderDrawn(inputs) };
  }
  const oP = await R.observe(sides.parent, plan.spec, sides.parent.inputs, ms);
  const oC = await R.observe(sides.candidate, plan.spec, sides.candidate.inputs, ms);
  const base = { args: sides.parent.drawn, parent: oP, candidate: oC };
  if (oP.harness || oC.harness) return { ...base, differs: false, why: `the replay stopped: ${oP.harness ? 'parent ' + oP.harness : 'candidate ' + oC.harness}` };
  if (JSON.stringify(oP) === JSON.stringify(oC)) return { ...base, differs: false, why: 'both sides observe the same on this input' };
  if (undecidedDrives(oP, oC)) return { ...base, differs: false, why: 'the sides differ only in a callback lean could not drive' };
  const via = R.unloadableOnly(oP, oC, sides); if (via) return { ...base, differs: false, why: `the sides differ only in requests to ${via.module}, a module lean could not load` };
  if (restsOnFunctionText(oP, oC)) return { ...base, differs: false, why: 'the sides differ only in function text' };
  return { ...base, differs: true, where: R.firstDifference(oP, oC) };
}

// a reader's replay of a counterexample WITNESS from its certificate alone: the value it carries run on both sides
// again, fresh sandboxes; the WITNESS stands when the replay differs and observes what the certificate says each side
// observed. Anything else (no value, no recorded observations, a replay that agrees or observes otherwise) is refused
export async function replayWitness({ parent, candidate, unit, project = false, witness }) {
  if (witness?.source !== 'counterexample') return { ok: false, why: 'not a counterexample witness' };
  if (!Array.isArray(witness.value)) return { ok: false, why: 'the witness carries no input value' };
  if (witness.replayed !== true || !witness.parent || !witness.candidate) return { ok: false, why: 'the witness was not replayed: it records no observation of either side' };
  const rp = await replayInput({ parent, candidate, unit, project, value: witness.value });
  if (!rp.differs) return { ok: false, why: `the replay of the carried value agrees: ${rp.why ?? rp.harness}` };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (!same(rp.args, witness.args)) return { ok: false, why: 'the carried value renders otherwise than the witness args' };
  if (!same(rp.parent, witness.parent) || !same(rp.candidate, witness.candidate)) return { ok: false, why: 'the replay observes otherwise than the certificate records' };
  return { ok: true, where: rp.where };
}

// the input by value, as the certificate carries it (witness.value) and the replay reads it: JSON with the values JSON
// has no word for tagged (undefined, a bigint, a number JSON loses, a Map, a Set, a Date) and an object seen twice
// (a heap the model shares or closes into a cycle) written once with an id and then referred to
export function encodeValue(args) {
  const ids = new Map(), seen = new Set(), twice = new Set();
  const walk = (v) => { if (!v || typeof v !== 'object') return; if (seen.has(v)) { twice.add(v); return; } seen.add(v); if (v instanceof Map) for (const [a, b] of v) { walk(a); walk(b); } else if (v instanceof Set) for (const a of v) walk(a); else if (!(v instanceof Date)) for (const k of Object.keys(v)) walk(v[k]); };
  walk(args);
  const enc = (v) => {
    if (v === undefined) return { $u: 1 };
    if (typeof v === 'bigint') return { $bigint: String(v) };
    if (typeof v === 'number') return Number.isFinite(v) && !Object.is(v, -0) ? v : { $num: Object.is(v, -0) ? '-0' : String(v) };
    if (v === null || typeof v !== 'object') return v;
    if (ids.has(v)) return { $ref: ids.get(v) };
    const id = twice.has(v) ? ids.size : null; if (id !== null) ids.set(v, id);
    const tag = id !== null ? { $id: id } : {};
    if (v instanceof Date) return { ...tag, $date: v.getTime() };
    if (v instanceof Map) return { ...tag, $map: [...v].map(([a, b]) => [enc(a), enc(b)]) };
    if (v instanceof Set) return { ...tag, $set: [...v].map(enc) };
    if (Array.isArray(v)) return { ...tag, $arr: v.map(enc) };
    return { ...tag, $obj: Object.keys(v).map((k) => [k, enc(v[k])]) };
  };
  return args.map(enc);
}
export function decodeValue(enc) {
  const ids = new Map();
  const dec = (x) => {
    if (x === null || typeof x !== 'object') return x;
    if ('$u' in x) return undefined;
    if ('$bigint' in x) return BigInt(x.$bigint);
    if ('$num' in x) return x.$num === '-0' ? -0 : Number(x.$num);
    if ('$ref' in x) return ids.get(x.$ref);
    const keep = (o) => { if (x.$id !== undefined) ids.set(x.$id, o); return o; };
    if ('$date' in x) return keep(new Date(x.$date));
    if ('$map' in x) { const m = keep(new Map()); for (const [a, b] of x.$map) m.set(dec(a), dec(b)); return m; }
    if ('$set' in x) { const s = keep(new Set()); for (const a of x.$set) s.add(dec(a)); return s; }
    if ('$arr' in x) { const a = keep([]); for (const e of x.$arr) a.push(dec(e)); return a; }
    const o = keep({}); for (const [k, v] of x.$obj ?? []) o[k] = dec(v); return o;
  };
  return enc.map(dec);
}

// ---------------------------------------------------------------------------------------------------------------
// the step check.mjs runs on a failed lemma

const dafnyOnce = async (file, lemma, dir, seconds) => {
  const r = await spawnCollect('dafny', ['verify', ...dafnyVerifyArgs({ seconds }), '--extract-counterexample', '--filter-symbol', lemma, file], { maxBuffer: 1 << 26, dir });
  return { text: (r.stdout || '') + (r.stderr || ''), capped: r.error?.code === 'ETIMEDOUT' };
};
const spanOf = (lines, lemma) => { const a = lines.findIndex((l) => new RegExp(`^lemma (?:\\{[^}]*\\}\\s+)*${lemma}(?:<[^>]*>)?\\(`).test(l)); const b = lines.findIndex((l, j) => j > a && l.startsWith(`} // END ${lemma}`)); return a < 0 || b < 0 ? null : [a + 1, b + 1]; };
const rangeOf = ([a, b]) => Array.from({ length: b - a + 1 }, (_, j) => a + j);

export async function counterexample({ dir, unit, lemma, unitFn, parent, candidate, project = false, seconds = 0 }) {
  const t0 = performance.now();
  const theorem = path.join(dir, 'theorem.dfy');
  const text = fs.readFileSync(theorem, 'utf8'), lines = text.split('\n');
  const span = spanOf(lines, lemma);
  if (!span) return { status: 'none', reason: `no lemma ${lemma} in the theorem` };
  const record = { lemma, extractions: 0 };
  const done = (x) => ({ ...x, model: { ...record, seconds: Number(((performance.now() - t0) / 1000).toFixed(2)) } });
  // the first extraction: the theorem as lane A ran it
  const first = await dafnyOnce(theorem, lemma, dir, seconds); record.extractions++;
  if (first.capped) return done({ status: 'none', reason: 'no counterexample: the extraction passed its wall cap' });
  const out = outOfResourceLines(first.text).filter((L) => span[0] <= L && L <= span[1]);
  let st = initialState(first.text, rangeOf(span));
  if (!st) return done({ status: 'none', reason: out.length ? 'no counterexample: the lemma ran out of its resource limit, the solver holds no model' : 'no counterexample: the solver printed no model for the lemma' });
  record.state = st.conj.length > 2000 ? `${st.conj.slice(0, 2000)}...` : st.conj;
  let facts = factsOf(st.conj);
  // the second, only when a sequence is held by its length alone
  const seqs = unnamedSequences(facts);
  if (seqs.length) {
    const probe = probeTheorem(text, lemma, st.conj, seqs);
    if (probe) {
      const pf = path.join(dir, 'theorem.cex.dfy'); fs.writeFileSync(pf, probe.text);
      const second = await dafnyOnce(pf, lemma, dir, seconds); record.extractions++;
      const shifted = rangeOf(span).map((L) => (L > probe.at ? L + probe.inserted : L)).filter((L) => L <= probe.at || L > probe.at + probe.inserted); // the lemma's own lines, not the probe's
      const st2 = second.capped ? null : initialState(second.text, shifted);
      // the elements are read where the model has evaluated them: the state after the last ghost read, each `cex_j_i`
      // the value of `term[i]` there (the initial state's own `term[i]` facts are Dafny's rendering of the sequence
      // before any read, which it does not keep consistent with the reads: measured, element 0 of a heap field's string)
      const after = st2 ? stateAfter(st2.block, probe.at + probe.inserted) : null;
      if (st2) {
        st = st2; facts = factsOf(after ?? st2.conj);
        if (after) seqs.forEach(({ term, n }, j) => { for (let i = 0; i < n; i++) { const v = facts.eq.get(`cex_${j}_${i}`); if (v && v.k !== 'term') facts.eq.set(`${term}[${i}]`, v); } });
        const shown = after ?? st2.conj; record.state = shown.length > 2000 ? `${shown.slice(0, 2000)}...` : shown; record.named = seqs.map((x) => `${x.term}: ${x.n}`);
      }
      else record.named = 'the second extraction gave no model; the elements are free';
    }
  }
  // the model's input, as JavaScript values of the unit's parameters
  const R = await import('../exec/run.mjs');
  let value, input;
  try {
    const plan = R.inputPlan(parent, candidate, unit, { project, seed: 1, values: null });
    value = encodeValue(argsFromModel(text, lemma, facts, unitFn, plan.spec)());
    input = (await import('../exec/fake.mjs')).renderDrawn(decodeValue(value));
  } catch (e) { return done({ status: 'unconfirmed', input: null, reason: `the model's input is not bridged: ${e instanceof NotBridged ? e.why : String(e.message).slice(0, 200)}` }); }
  const off = breaks();
  if (off.has('cex-replay')) return done({ status: 'witness', input, value, args: input, where: null, replayed: false }); // the break: the model's word taken for the difference
  let rp;
  try { rp = await replayInput({ parent, candidate, unit, project, value, byIndex: off.has('cex-replay-by-index') }); } catch (e) { return done({ status: 'unconfirmed', input, reason: `the replay did not run: ${String(e && e.message).slice(0, 200)}` }); }
  if (rp.harness) return done({ status: 'unconfirmed', input, reason: `the replay did not run: ${rp.harness}` });
  if (!rp.differs) return done({ status: 'unconfirmed', input, reason: `the replay agrees: ${rp.why}` });
  return done({ status: 'witness', input, value, args: rp.args, parent: rp.parent, candidate: rp.candidate, where: rp.where ?? null, replayed: true });
}
