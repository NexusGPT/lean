// the bridge between a JavaScript value and a model value, read from the model's own declared types (dafny-text.mjs).
// Into the model: a value lane B drew, before any side ran on it. Out of the model: a comparison against lane B's
// rendering of Node's result (fake.mjs render), SameValue at every number. The bridge never guesses: a value the
// declared type cannot hold is outside the model's domain (OutOfDomain, counted with its reason), a type the bridge
// has no reading for is not bridged (NoBridge, counted with its reason).
import { BigNumber, canon, opaqueValue } from './model.mjs';
import { dn } from '../common.mjs';
import { render } from '../exec/fake.mjs';

export class NoBridge extends Error { constructor(why) { super(why); this.why = why; } }
export class OutOfDomain extends Error { constructor(why) { super(why); this.why = why; } }
export class Opaque extends Error { constructor(why) { super(why); this.why = why; } }

const OPEN_REST = 'open_rest_', OPEN_INDEX = 'open_index_';
const isPlain = (v) => v !== null && typeof v === 'object' && !v.__isFake && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null || Object.getPrototypeOf(v)?.constructor?.name === 'Object');
const keysOf = (o) => Object.keys(o);

// a finite double as the exact rational it is: num / 2^k
export function exactRational(n) {
  let den = 1n, x = n;
  while (!Number.isInteger(x)) { x *= 2; den *= 2n; }
  return [BigInt(x), den];
}
const big = (b) => new BigNumber(b.toString());
const toNumber = (b) => Number(b.toFixed()); // a BigNumber integer, rounded to the nearest double by Number's own parse

export function makeBridge(model) {
  const { M, D, decls } = model;
  // the absence a None stands for: Option<T> reads a single-absence union, T | null or T | undefined; the unit's TypeScript
  // signature (// SIG) says which, and a signature naming both or neither leaves either
  const state = { none: 'either' };
  const rest = new Map(); // MoreFrom src -> the undeclared keys and values of the object it was read from (rendered)
  const restIds = new Map();
  const dt = (name) => decls.datatypes.get(name);
  const cls = (name) => M[name.replace(/_/g, '__')];
  const ctorFns = (name) => { const C = cls(name); if (!C) return []; return Object.getOwnPropertyNames(C).filter((k) => k.startsWith('create_') && typeof C[k] === 'function').map((k) => C[k]); };
  const make = (name, ctorIndex, fields) => { const f = ctorFns(name)[ctorIndex]; if (!f) throw new NoBridge(`no constructor ${ctorIndex} of ${name}`); return f(...fields); };
  const fieldsOf = (x) => Object.keys(x).filter((k) => k !== '$tag').map((k) => x[k]); // in constructor order (create_ assigns them so)

  // a type with its synonyms and type parameters resolved
  function resolve(t, env = {}) {
    if (t.k === 'name' && env[t.name] && !t.args.length) return resolve(env[t.name], {});
    if (t.k === 'name' && decls.synonyms.has(t.name)) { const s = decls.synonyms.get(t.name); const e = {}; s.tparams.forEach((p, i) => { e[p] = t.args[i]; }); return resolve(s.type, e); }
    if (t.k === 'name' && t.args.length) return { ...t, args: t.args.map((a) => resolve(a, env)) };
    if (t.k === 'tuple') return { ...t, items: t.items.map((a) => resolve(a, env)) };
    return t;
  }
  const argEnv = (d, t) => { const e = {}; d.tparams.forEach((p, i) => { e[p] = t.args[i]; }); return e; };
  const ftype = (f, env) => resolve(f.type, env);

  // ----- into the model -----
  function into(v, t0) {
    const t = resolve(t0);
    if (t.k === 'tuple') {
      if (!t.items.length) { if (v !== undefined) throw new OutOfDomain('a value where the model reads ()'); return D.Tuple.of(); }
      if (!Array.isArray(v) || v.length !== t.items.length) throw new OutOfDomain(`not a tuple of ${t.items.length}`);
      return D.Tuple.of(...v.map((x, i) => into(x, t.items[i])));
    }
    if (t.k === 'arrow') { if (typeof v !== 'function') throw new OutOfDomain(`a ${typeOfJs(v)} where the model reads a function`); const label = `input function ${JSON.stringify(render(v))}`; return (...args) => model.apply(label, args, t.to); } // an input function's body is not the model's: applying it is applying a part with no body
    if (t.k !== 'name') throw new NoBridge(`type ${t.text}`);
    // a value of a type the model has no body for (Ext_, Any) is a term to it: named by the input as lane B renders it,
    // so the same input is the same term on both sides; the model can only pass it on or apply a bodiless part to it
    if (decls.opaque.has(t.name)) { const r = render(v); return Object.assign(opaqueValue(`input ${JSON.stringify(r)}`), { rendered: r }); }
    if (v && typeof v === 'object' && v.__isFake) throw new NoBridge('an opaque input (a fake of lane B)');
    if (t.name === 'Fn' && dt('Fn')) { if (typeof v !== 'function') throw new OutOfDomain(`a ${typeOfJs(v)} where the model reads a function`); return make('Fn', 0, [D.Seq.UnicodeFromString(`input function ${JSON.stringify(render(v))}`), D.Seq.of()]); } // a function value is its code and its captures, compared only: an input function is named by lane B's rendering of it
    if (typeof v === 'function') throw new NoBridge('a function value where the model reads a data type');
    if (t.name === 'Error' && dt('Error') && v instanceof Error === false && Object.prototype.toString.call(v) === '[object Error]') v = Object.assign(Object.create(null), { message: v.message, name: v.name }, v); // an error from another realm
    switch (t.name) {
      case 'int': case 'nat': {
        if (typeof v === 'bigint') return big(v);
        if (typeof v !== 'number') throw new OutOfDomain(`a ${typeOfJs(v)} where the model reads int`);
        if (Number.isNaN(v) || !Number.isFinite(v)) throw new OutOfDomain('NaN or an infinity, outside the finite number model');
        if (!Number.isInteger(v)) throw new OutOfDomain('a fraction where the model reads number as int');
        if (t.name === 'nat' && v < 0) throw new OutOfDomain('a negative number where the model reads nat');
        return big(BigInt(v)); // -0 is the model's one zero
      }
      case 'real': {
        if (typeof v !== 'number') throw new OutOfDomain(`a ${typeOfJs(v)} where the model reads real`);
        if (Number.isNaN(v) || !Number.isFinite(v)) throw new OutOfDomain('NaN or an infinity, outside the finite number model');
        const [n, d] = exactRational(v); return new D.BigRational(big(n), big(d));
      }
      case 'bool': if (typeof v !== 'boolean') throw new OutOfDomain(`a ${typeOfJs(v)} where the model reads bool`); return v;
      case 'string': {
        if (typeof v !== 'string') throw new OutOfDomain(`a ${typeOfJs(v)} where the model reads string`);
        if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(v)) throw new OutOfDomain('a lone surrogate: a Dafny string holds code points');
        return D.Seq.UnicodeFromString(v);
      }
      case 'char': if (typeof v !== 'string' || [...v].length !== 1) throw new OutOfDomain('not one character'); return new D.CodePoint(v.codePointAt(0));
      case 'seq': if (!Array.isArray(v)) throw new OutOfDomain(`a ${typeOfJs(v)} where the model reads a sequence`); return D.Seq.of(...Array.from(v, (x) => into(x, t.args[0])));
      case 'set': { const xs = v instanceof Set ? [...v] : null; if (!xs) throw new OutOfDomain('not a Set'); return D.Set.fromElements(...xs.map((x) => into(x, t.args[0]))); }
      case 'map': { let m = D.Map.Empty; for (const [k, x] of entriesOf(v)) m = m.update(into(k, t.args[0]), into(x, t.args[1])); return m; }
      case 'Option': return v === undefined || v === null ? make('Option', 0, []) : make('Option', 1, [into(v, t.args[0])]); // a single-absence union: None is its one absence, null or undefined as the type declares
      case 'Nullish': return v === null ? make('Nullish', 0, []) : v === undefined ? make('Nullish', 1, []) : make('Nullish', 2, [into(v, t.args[0])]);
      case 'Absent': if (v === null) return make('Absent', 0, []); if (v === undefined) return make('Absent', 1, []); throw new OutOfDomain('a value where the model reads null or undefined');
      case 'Unit': if (v !== undefined) throw new OutOfDomain('a value where the model reads Unit'); return make('Unit', 0, []);
      case 'OMap': { const es = entriesOf(v); return make('OMap', 0, [D.Seq.of(...es.map(([k]) => into(k, t.args[0]))), es.reduce((m, [k, x]) => m.update(into(k, t.args[0]), into(x, t.args[1])), D.Map.Empty)]); }
      case 'OSet': { const xs = v instanceof Set ? [...v] : null; if (!xs) throw new OutOfDomain('not a Set'); return make('OSet', 0, [D.Seq.of(...xs.map((x) => into(x, t.args[0])))]); }
    }
    if (decls.opaque.has(t.name)) throw new NoBridge(`an opaque type (${t.name})`);
    const d = dt(t.name);
    if (!d) throw new NoBridge(`type ${t.name}`);
    return intoDatatype(v, d, t);
  }
  function entriesOf(v) {
    if (v instanceof Map) return [...v.entries()];
    if (isPlain(v)) return Object.entries(v);
    throw new OutOfDomain(`a ${typeOfJs(v)} where the model reads a dictionary`);
  }
  function intoDatatype(v, d, t) {
    const env = argEnv(d, t);
    if (d.name === 'Error' && v !== null && typeof v === 'object' && (v instanceof Error || Object.prototype.toString.call(v) === '[object Error]')) { // an error: its message and name (own or from its class), its own keys beside them
      const own = Object.fromEntries(Object.keys(v).map((k) => [k, v[k]]));
      v = { ...own, message: v.message, name: v.name, ...(v.cause !== undefined ? { cause: v.cause } : {}), ...(typeof v.stack === 'string' ? { stack: v.stack } : {}) };
    }
    // a record: one constructor of named fields (the open slots last)
    if (d.ctors.length === 1 && d.ctors[0].fields.length && !/^item\d+$/.test(d.ctors[0].fields[0].name)) {
      if (!isPlain(v)) throw new OutOfDomain(`a ${typeOfJs(v)} where the model reads the record ${d.name}`);
      const byField = new Map(keysOf(v).map((k) => [dn(k), k]));
      const used = new Set(); const vals = [];
      const declared = d.ctors[0].fields.filter((f) => f.name !== OPEN_REST && f.name !== OPEN_INDEX);
      for (const f of declared) {
        const k = byField.get(f.name); const ft = ftype(f, env);
        if (k !== undefined) used.add(k);
        if (ft.k === 'name' && ft.name === 'Pres') { vals.push(k === undefined ? make('Pres', 0, []) : v[k] === undefined ? make('Pres', 1, []) : make('Pres', 2, [into(v[k], ft.args[0])])); continue; }
        vals.push(into(k === undefined ? undefined : v[k], ft));
      }
      const undeclared = keysOf(v).filter((k) => !used.has(k));
      const ix = d.ctors[0].fields.find((f) => f.name === OPEN_INDEX);
      if (ix) vals.push(into(Object.fromEntries(undeclared.map((k) => [k, v[k]])), ftype(ix, env)));
      if (d.ctors[0].fields.some((f) => f.name === OPEN_REST)) {
        if (ix || !undeclared.length) vals.push(make('More', 0, []));
        else { // the keys the type does not name: one name per set (design/open-datatype.md), equality only
          const key = JSON.stringify(undeclared.map((k) => [k, canonJs(v[k])]));
          if (!restIds.has(key)) { restIds.set(key, restIds.size + 1); rest.set(restIds.size, Object.fromEntries(undeclared.map((k) => [k, render(v[k])]))); }
          vals.push(make('More', 1, [big(BigInt(restIds.get(key)))]));
        }
      }
      return make(d.name, 0, vals);
    }
    // a sum by runtime discriminator: one field per constructor; exactly one constructor must hold the value
    if (d.ctors.every((c) => c.fields.length === 1)) {
      const fits = [];
      d.ctors.forEach((c, i) => { try { fits.push([i, into(v, ftype(c.fields[0], env))]); } catch (e) { if (!(e instanceof OutOfDomain)) throw e; } });
      if (fits.length !== 1) throw (fits.length ? new NoBridge(`${d.name}: ${fits.length} constructors hold the value`) : new OutOfDomain(`no constructor of ${d.name} holds the value`));
      return make(d.name, fits[0][0], [fits[0][1]]);
    }
    throw new NoBridge(`no input reading for datatype ${d.name}`);
  }

  // ----- out of the model: does the model value x of type t agree with Node's rendering r -----
  // returns null when it agrees, else the first difference; throws Opaque when the value holds a part the model has
  // no body for (it cannot be compared)
  function agree(x, t0, r, at = 'result') {
    const t = resolve(t0);
    const no = (why) => `${at}: ${why}`;
    if (x && x.__leanOpaque) { if (x.rendered !== undefined) return JSON.stringify(x.rendered) === JSON.stringify(r) ? null : no(`model passes on the input ${show(x.rendered)}, Node ${show(r)}`); throw new Opaque(`${at} is an opaque value (${x.__leanOpaque})`); }
    if (t.k === 'tuple') {
      if (!t.items.length) return isUndef(r) ? null : no(`model () against ${show(r)}`);
      if (!Array.isArray(r) || r.length !== t.items.length) return no(`model tuple against ${show(r)}`);
      for (let i = 0; i < t.items.length; i++) { const d = agree(x[i], t.items[i], r[i], `${at}[${i}]`); if (d) return d; }
      return null;
    }
    if (t.k !== 'name') throw new Opaque(`${at}: type ${t.text}`);
    switch (t.name) {
      case 'int': case 'nat': {
        if (typeof r !== 'number') return no(`model ${x.toFixed()} against ${show(r)}`); // -0, NaN and the infinities render as objects: never SameValue an int
        return Number.isInteger(r) && BigInt(r) === BigInt(x.toFixed()) ? null : no(`model ${x.toFixed()} against ${show(r)}`);
      }
      case 'real': { const n = Number(x.num.dividedBy(x.den).toPrecision(40)); return Object.is(n, r) ? null : no(`model ${x.num.toFixed()}/${x.den.toFixed()} (${n}) against ${show(r)}`); }
      case 'bool': return x === r ? null : no(`model ${x} against ${show(r)}`);
      case 'string': { const s = x.toVerbatimString(false); return s === r ? null : no(`model ${JSON.stringify(s)} against ${show(r)}`); }
      case 'char': { const s = String.fromCodePoint(x.value); return s === r ? null : no(`model ${JSON.stringify(s)} against ${show(r)}`); }
      case 'seq': {
        if (!Array.isArray(r)) return no(`model sequence of ${x.length} against ${show(r)}`);
        if (r.length !== x.length) return no(`model sequence of ${x.length} against ${r.length} elements`);
        for (let i = 0; i < x.length; i++) { const d = agree(x[i], t.args[0], r[i], `${at}[${i}]`); if (d) return d; }
        return null;
      }
      case 'set': return unordered([...x].map((e) => [e]), r?.$set?.map((e) => [e]), [t.args[0]], at, 'set');
      case 'map': return unordered([...x].map(([k, v]) => [k, v]), r?.$map ?? (isRecordRendering(r) ? Object.entries(r) : null), [t.args[0], t.args[1]], at, 'map');
      case 'OMap': { // ordered keys: a JS Map keeps them in its rendering; a plain object's rendering sorts them, so only the entries compare
        const keys = fieldsOf(x)[0], m = fieldsOf(x)[1];
        const es = [...keys].map((k) => [k, m.get(k)]);
        if (r && r.$map) { if (r.$map.length !== es.length) return no(`model ${es.length} entries against ${r.$map.length}`); for (let i = 0; i < es.length; i++) { const d = agree(es[i][0], t.args[0], r.$map[i][0], `${at}.key[${i}]`) ?? agree(es[i][1], t.args[1], r.$map[i][1], `${at}.value[${i}]`); if (d) return d; } return null; }
        return unordered(es, isRecordRendering(r) ? Object.entries(r) : null, [t.args[0], t.args[1]], at, 'dictionary');
      }
      case 'OSet': { const items = fieldsOf(x)[0]; if (!r || !r.$set) return no(`model set against ${show(r)}`); if (r.$set.length !== items.length) return no(`model set of ${items.length} against ${r.$set.length}`); for (let i = 0; i < items.length; i++) { const d = agree(items[i], t.args[0], r.$set[i], `${at}{${i}}`); if (d) return d; } return null; }
      case 'Option': return x.$tag === 0 ? ((state.none !== 'null' && isUndef(r)) || (state.none !== 'undefined' && r === null) ? null : no(`model None (${state.none === 'either' ? 'null or undefined' : state.none}) against ${show(r)}`)) : agree(fieldsOf(x)[0], t.args[0], r, at);
      case 'Nullish': return x.$tag === 0 ? (r === null ? null : no(`model null against ${show(r)}`)) : x.$tag === 1 ? (isUndef(r) ? null : no(`model undefined against ${show(r)}`)) : agree(fieldsOf(x)[0], t.args[0], r, at);
      case 'Absent': return x.$tag === 0 ? (r === null ? null : no(`model null against ${show(r)}`)) : (isUndef(r) ? null : no(`model undefined against ${show(r)}`));
      case 'Unit': return isUndef(r) ? null : no(`model Unit against ${show(r)}`);
    }
    if (decls.opaque.has(t.name)) throw new Opaque(`${at} has the opaque type ${t.name}`);
    const d = dt(t.name);
    if (!d) throw new Opaque(`${at}: type ${t.name}`);
    const env = argEnv(d, t);
    const c = d.ctors[x.$tag]; const vals = fieldsOf(x);
    if (d.name === 'Error' && r && typeof r === 'object' && '$error' in r) { // lane B renders an error by its class and message
      const fi = (n) => c.fields.findIndex((f) => f.name === n);
      const dm = agree(vals[fi('message')], ftype(c.fields[fi('message')], env), r.message, `${at}.message`); if (dm) return dm;
      return agree(vals[fi('name')], ftype(c.fields[fi('name')], env), r.$error, `${at}.name`);
    }
    if (d.ctors.length === 1 && c.fields.length && !/^item\d+$/.test(c.fields[0].name)) { // a record
      if (!isRecordRendering(r)) return no(`model record ${d.name} against ${show(r)}`);
      const rk = new Map(Object.keys(r).map((k) => [dn(k), k])); const used = new Set();
      for (let i = 0; i < c.fields.length; i++) {
        const f = c.fields[i]; if (f.name === OPEN_REST || f.name === OPEN_INDEX) continue;
        const ft = ftype(f, env); const k = rk.get(f.name); if (k !== undefined) used.add(k);
        if (ft.k === 'name' && ft.name === 'Pres') { const p = vals[i]; if (p.$tag === 0) { if (k !== undefined) return no(`${f.name}: model missing, Node has the key`); continue; } if (k === undefined) return no(`${f.name}: model present, Node has no key`); if (p.$tag === 1) { if (!isUndef(r[k])) return no(`${f.name}: model undefined against ${show(r[k])}`); continue; } const dd = agree(fieldsOf(p)[0], ft.args[0], r[k], `${at}.${f.name}`); if (dd) return dd; continue; }
        if (ft.k === 'name' && ft.name === 'Option' && vals[i].$tag === 0 && k === undefined) continue; // a missing optional field and one holding undefined are one value, None
        if (k === undefined) return no(`${f.name}: Node has no key`);
        const dd = agree(vals[i], ft, r[k], `${at}.${f.name}`); if (dd) return dd;
      }
      const extra = Object.keys(r).filter((k) => !used.has(k));
      const ixi = c.fields.findIndex((f) => f.name === OPEN_INDEX);
      if (ixi >= 0) { const ixr = Object.fromEntries(extra.map((k) => [k, r[k]])); return agree(vals[ixi], ftype(c.fields[ixi], env), ixr, `${at}.${OPEN_INDEX}`); }
      const ri = c.fields.findIndex((f) => f.name === OPEN_REST);
      const more = ri >= 0 ? vals[ri] : null;
      if (!more || more.$tag === 0) return extra.length ? no(`model has no undeclared key, Node has ${extra.join(', ')}`) : null;
      const src = Number(fieldsOf(more)[0].toFixed()); const held = rest.get(src);
      if (!held) throw new Opaque(`${at}: a rest the bridge did not read (MoreFrom(${src}))`);
      const want = JSON.stringify(Object.keys(held).sort().map((k) => [k, held[k]])), got = JSON.stringify(extra.sort().map((k) => [k, r[k]]));
      return want === got ? null : no(`model rest ${want.slice(0, 80)} against ${got.slice(0, 80)}`); // the rest is the keys and values it was read from
    }
    if (d.ctors.every((cc) => cc.fields.length === 1)) return agree(vals[0], ftype(c.fields[0], env), r, at); // a sum: its one field
    throw new Opaque(`${at}: no output reading for datatype ${d.name}`);
  }
  function unordered(xs, rs, types, at, what) {
    if (!rs) return `${at}: model ${what} against another value`;
    if (rs.length !== xs.length) return `${at}: model ${what} of ${xs.length} against ${rs.length}`;
    const left = [...rs];
    for (const e of xs) { const j = left.findIndex((re) => e.every((part, i) => { try { return !agree(part, types[i], re[i], at); } catch (err) { if (err instanceof Opaque) return false; throw err; } })); if (j < 0) return `${at}: model ${what} entry ${canon(e[0])} has no match`; left.splice(j, 1); }
    return null;
  }
  return { into, agree, resolve, rest, state };
}

const isUndef = (r) => r && typeof r === 'object' && r.$undefined === true;
const isRecordRendering = (r) => r !== null && typeof r === 'object' && !Array.isArray(r) && !Object.keys(r).some((k) => k.startsWith('$'));
const typeOfJs = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : v instanceof Map ? 'Map' : v instanceof Set ? 'Set' : typeof v);
export const show = (r) => JSON.stringify(r)?.slice(0, 120) ?? String(r);
function canonJs(v) { try { return JSON.stringify(v, (k, x) => (typeof x === 'bigint' ? `${x}n` : x === undefined ? '$undefined' : Number.isNaN(x) ? '$nan' : x)); } catch { return String(v); } }
