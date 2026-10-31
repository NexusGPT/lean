// a side's Dafny model, compiled to JavaScript and loaded in this process. Every extern of the compilable copy (a part
// with no body) is answered by the run's mode, never by a body chosen here:
//   unary    the first extern application stops the run (OpaqueHit, its symbol and arguments): the input is not
//            executable on this model, and is counted so
//   product  an extern application is answered from one table shared by the parent's and the candidate's model, keyed
//            by the symbol and the canonical text of the arguments; the value is drawn by a seed from the declared
//            return type. Two models that agree under several seeds agree because they apply the same symbols to the
//            same arguments: the coupling the theorem assumes
import fs from 'node:fs';
import path from 'node:path';
import { spawnCollect } from '../tests/pool.mjs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { compilable, declarations, signature, jsName } from './dafny-text.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
export const BigNumber = require(path.join(here, 'vendor/bignumber.js/bignumber.cjs'));

export class OpaqueHit extends Error { constructor(symbol, args) { super(`opaque: ${symbol}`); this.symbol = symbol; this.args = args; } }

// compile one side: the main file and its prelude made compilable, `dafny translate js` with the runtime included
export async function compileSide({ dfy, prelude, units, dir, label }) {
  const main = fs.readFileSync(dfy, 'utf8'), pre = prelude && fs.existsSync(prelude) ? fs.readFileSync(prelude, 'utf8') : null;
  const c = compilable(main, pre, units);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${label}.dfy`);
  fs.writeFileSync(file, c.text);
  const r = await spawnCollect('dafny', ['translate', 'js', '--no-verify', '--include-runtime', '--allow-warnings', '--optimize-erasable-datatype-wrapper:false', file], { cwd: dir, maxBuffer: 1 << 26 }); // the suite's Dafny wall cap (tests/pool.mjs)
  const js = path.join(dir, `${label}.js`);
  if (r.status !== 0 || !fs.existsSync(js)) return { ok: false, error: ((r.stdout ?? '') + (r.stderr ?? '')).split('\n').filter((l) => /Error|error/.test(l)).slice(0, 3).join(' | ').slice(0, 400) || `dafny exit ${r.status}`, text: c.text };
  fs.writeFileSync(path.join(dir, `${label}.externs.json`), JSON.stringify(c.externs));
  return { ok: true, js, text: c.text, externs: c.externs };
}
// a side compiled before (by the pair's own process): the same files, read back
export function compiledSide({ dir, label }) {
  const js = path.join(dir, `${label}.js`), ex = path.join(dir, `${label}.externs.json`);
  if (!fs.existsSync(js) || !fs.existsSync(ex)) return null;
  return { ok: true, js, text: fs.readFileSync(path.join(dir, `${label}.dfy`), 'utf8'), externs: JSON.parse(fs.readFileSync(ex, 'utf8')) };
}

// load a compiled side; `handler(symbol, args, kind)` answers every extern function application
export function loadSide({ js, text, externs }) {
  const src = fs.readFileSync(js, 'utf8');
  const decls = declarations(text);
  const names = [...new Set([...src.matchAll(/\bLeanOpaque_([A-Za-z0-9_]+)\b/g)].map((m) => m[1]))];
  const kinds = new Map(externs.map((e) => [e.name, e.kind]));
  const state = { handler: null };
  const stubs = names.map((n) => {
    if (kinds.get(n) === 'type') { const s = opaqueValue(`type:${n}`); return { get Default() { return s; }, Rtd: () => ({ Default: s }) }; }
    return (...args) => { if (!state.handler) throw new OpaqueHit(n, args); return state.handler(n, args); };
  });
  const req = (m) => { if (m === 'bignumber.js') return BigNumber; throw new Error(`the model requires ${m}`); };
  const factory = new Function('require', ...names.map((n) => `LeanOpaque_${n}`), `${src}\n;return { _module, _dafny };`);
  const { _module: M, _dafny: D } = factory(req, ...stubs);
  const apply = (label, args, ret) => { if (!state.handler) throw new OpaqueHit(label, args); return state.handler(label, args, ret); }; // a part with no body handed in as a value (an input function)
  return {
    M, D, decls, text, state, apply,
    fn: (name) => M.__default?.[jsName(name)] ?? null,
    signature: (name) => signature(text, name),
    sigOfExtern: (name) => signature(text, name),
  };
}

// an opaque value: a value of a type the model has no body for (World's history, Any, Ext_), named by where it came
// from; two are equal when their names are (Dafny's areEqual calls equals)
export function opaqueValue(label) { return { __leanOpaque: label, equals(o) { return !!o && o.__leanOpaque === label; }, toString() { return `opaque(${label})`; } }; }

// the canonical text of a Dafny value, whatever realm built it: numbers exactly, sequences in order, sets and maps
// sorted, datatypes by constructor and fields, opaque values by name
export function canon(v) {
  if (v === null || v === undefined) return String(v);
  if (typeof v === 'boolean' || typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number') return `n${v}`;
  if (BigNumber.isBigNumber(v)) return v.toFixed();
  if (v.__leanOpaque) return `<${v.__leanOpaque}>`;
  if (v.num !== undefined && v.den !== undefined && BigNumber.isBigNumber(v.num)) return `${v.num.toFixed()}/${v.den.toFixed()}r`;
  if (v.constructor?.name === 'CodePoint') return `c${v.value}`;
  const cls = v.constructor?.name;
  if (Array.isArray(v)) {
    if (cls === 'Seq' && v.every((x) => x?.constructor?.name === 'CodePoint')) return JSON.stringify(v.map((c) => String.fromCodePoint(c.value)).join(''));
    if (cls === 'Map') return `map{${v.map(([k, x]) => `${canon(k)}:=${canon(x)}`).sort().join(',')}}`;
    if (cls === 'Set' || cls === 'MultiSet') return `${cls}{${v.map(canon).sort().join(',')}}`;
    return `${cls === 'Tuple' ? '(' : '['}${v.map(canon).join(',')}${cls === 'Tuple' ? ')' : ']'}`;
  }
  if (typeof v === 'function') return v.__leanLabel ?? `fn:${Function.prototype.toString.call(v).replace(/\s+/g, ' ')}`; // a function value is its code (a lambda of the model) or its name (an input function)
  if ('$tag' in v) return `${cls}#${v.$tag}(${Object.keys(v).filter((k) => k !== '$tag').map((k) => canon(v[k])).join(',')})`;
  return `{${Object.keys(v).sort().map((k) => `${k}:${canon(v[k])}`).join(',')}}`;
}
