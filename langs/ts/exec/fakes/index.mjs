// Behavioural fakes for Node core (design/w2b-node-fakes.md). The recording proxy (exec/fake.mjs) stands for every
// module the unit imports; for a module listed here it asks this registry, on every get, call, construct, set, has and
// delete, whether the member it reached has a model. A member with a model answers from the model's state (an in-memory
// file tree, the real pure function, the seeded generator, the virtual clock); the proxy still records the operation
// on the trace exactly as before, so the trace stays the oracle and the fake adds the value flow. A member without a
// model keeps the recording proxy's answer.
//
// The rule that keeps it sound: a model's answer is a function of the seed and of the operations recorded on the trace
// before it (their paths and rendered arguments), nothing else (no host file system, no host cwd, no wall clock, no host
// randomness). Two sides whose traces agree up to a request get the same answer to it.
//
// LEAN_FAKES=record turns every model off: each specifier keeps the recording proxy alone (the measurement of the gap
// this closes, and the --break of the fake tests).
import { fsModel } from './fs.mjs';
import { pathModel } from './path.mjs';
import { urlModel } from './url.mjs';
import { cryptoModel } from './crypto.mjs';
import { timersModel, timersPromisesModel } from './timers.mjs';
import { processModel } from './process.mjs';
import { consoleModel } from './console.mjs';
import { bufferModel } from './buffer.mjs';
import { osModel } from './os.mjs';

// a specifier, with or without `node:`, to its model and the member chain it opens at
const MODULES = {
  fs: [fsModel, ''], 'fs/promises': [fsModel, 'promises.'],
  path: [pathModel, ''], 'path/posix': [pathModel, ''],
  url: [urlModel, ''],
  crypto: [cryptoModel, ''],
  timers: [timersModel, ''], 'timers/promises': [timersPromisesModel, ''],
  process: [processModel, ''],
  console: [consoleModel, ''],
  buffer: [bufferModel, ''],
  os: [osModel, ''],
};
export const MODELLED = Object.keys(MODULES);
const SPEC = new RegExp(`^module:(?:node:)?(${MODELLED.slice().sort((a, b) => b.length - a.length).map((m) => m.replace('/', '\\/')).join('|')})(?=\\.|$)(.*)$`);

export const fakesOff = () => process.env.LEAN_FAKES === 'record';

// the member a fake path names on a modelled module: `module:node:fs.default.readFileSync` -> fs, `readFileSync`;
// null for a path of another module, a result of a call (`...()#1`), or a symbol-ish member
export function memberOf(path) {
  const m = SPEC.exec(path); if (!m) return null;
  const viaDefault = /^\.default(?=\.|$)/.test(m[2]);
  let rest = m[2].replace(/^\.default(?=\.|$)/, ''); // an interop default is the module itself
  if (rest.startsWith('.')) rest = rest.slice(1);
  if (rest.includes('(') || rest.includes('#') || rest.includes('[')) return null;
  const [model, prefix] = MODULES[m[1]];
  return { model, member: prefix + rest, viaDefault };
}

// the model entry for a fake path on this environment, or null. Entries: { value: () => v } a field the model holds;
// { call(args, self, k, path), construct?(args), pure } a function (pure: it never faults); { object: true } a namespace
// whose members the model holds (fs.promises, process.env); { set(v), has(), delete() } on a field it stores
export function modelAt(env, path) {
  if (fakesOff()) return null;
  const memo = (env.fakeModels ??= { byPath: new Map(), state: new Map() });
  if (memo.byPath.has(path)) return memo.byPath.get(path);
  const at = memberOf(path);
  let entry = null;
  if (at) {
    let inst = memo.state.get(at.model);
    if (!inst) { inst = at.model(env); memo.state.set(at.model, inst); }
    // the module itself: reached through its interop default it is a namespace, quiet when the whole module is (a pure
    // module's object is no request); reached by its own path it is the recording fake as before
    entry = at.member === '' ? (at.viaDefault && inst.quietModule ? { object: true, quiet: true } : null) : inst.entry(at.member) ?? null;
  }
  memo.byPath.set(path, entry);
  return entry;
}

// the modules of one environment that answered through a model (for the record and the result)
export function modelledModules(env) { return [...(env.fakeModels?.state.values() ?? [])].map((m) => m.name); }
