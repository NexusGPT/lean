// The bridge fake: what lane B hands for a global the host application sets and lean's sandbox does not (a desktop
// app's preload bridge, `window.api`, `window.electron`). Owner's decision (2026-10-31, board row 664561c3): lean's fake
// for an unset global answers calls and calls back, behind an allow list and a deny list kept here. The contract is
// design/bridge-fake.md:
//
// - a member read of the global object (`window.X`, `globalThis.X`, `global.X`) that the sandbox does not hold is a
//   bridge fake when X is on the allow list, or on neither list and declared by no default lib (a lib-declared name,
//   `navigator`, `localStorage`, is a host name the sandbox leaves absent, design/lib-globals.md); whether the host set
//   it is drawn per input (bridgePresent), so its absence is met too;
// - a property read of a bridge fake is a bridge fake (never a drawn null or empty answer);
// - a call answers a thenable that resolves, after the current turn, to the bridge fake at the call's path; it never
//   throws and never rejects;
// - a function handed to it as an argument is called once, after the turn, with one bridge fake argument;
// - a bridge fake renders as its path (`{ $fake: path }`) in every outcome, the thenable as the value it resolves to.
//
// Both sides of a pair receive the same fakes in the same order (paths and call counters per environment, the same
// turn), so a difference between them is the app's. Each call and each fired callback is counted on the environment
// (env.bridge), and the render row reports them (bound.render.bridge).
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ts } from '../common.mjs';
import { render } from './fake.mjs';

// names never handed a bridge fake although no lib declares them: hooks a browser extension sets, absent in an app's
// own mount, so `window.__REDUX_DEVTOOLS_EXTENSION__ && ...` takes the branch the app takes without the extension
export const BRIDGE_DENY = new Set(['__REDUX_DEVTOOLS_EXTENSION__', '__REDUX_DEVTOOLS_EXTENSION_COMPOSE__', '__REACT_DEVTOOLS_GLOBAL_HOOK__', '__VUE_DEVTOOLS_GLOBAL_HOOK__']);
// names handed a bridge fake although a lib declares them: none today; a host name an app's host replaces would go here
export const BRIDGE_ALLOW = new Set([]);

// every global value name a default lib file of the TypeScript lean runs declares (`declare var|let|const|function|
// class|namespace|enum`), read once per process: the DOM's `location`, `onclick`, `addEventListener` among them
let libNames = null;
export function libGlobalNames() {
  if (libNames) return libNames;
  libNames = new Set();
  const dir = path.dirname(ts.sys.getExecutingFilePath());
  for (const f of fs.readdirSync(dir)) {
    if (!/^lib\..*\.d\.ts$/.test(f)) continue;
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of text.matchAll(/^declare\s+(?:var|let|const|function|abstract\s+class|class|namespace|enum)\s+([A-Za-z_$][\w$]*)/gm)) libNames.add(m[1]);
  }
  return libNames;
}
export const isBridgeName = (name) => typeof name === 'string' && /^[A-Za-z_$][\w$]*$/.test(name) && (BRIDGE_ALLOW.has(name) || (!BRIDGE_DENY.has(name) && !libGlobalNames().has(name)));

// whether the host set the name on this input: a fact of the world (design/lib-globals.md), drawn by the seed and the name,
// the same on both sides of one input; set on about three inputs in four, so a mount that rests on it runs, and absent
// on the others, so the app's own absent branch (`window.api?.x`, `if (!window.api) return`) runs too
export const BRIDGE_PRESENT = 0.75;
export const bridgePresent = (env, name) => createHash('sha256').update(`${env.seed}:bridge:${name}`).digest().readUInt32BE(0) / 4294967296 < BRIDGE_PRESENT;
// the global object the unit's code sees by name (`window`, `globalThis`, `global`): the sandbox's own object, with a
// bridge fake for a bridge name it does not hold and the input sets; a write lands on the object, after which the name is
// the app's value
export function bridgeGlobal(env, g) {
  const named = (t, prop) => !(prop in t) && isBridgeName(prop) && bridgePresent(env, prop);
  return new Proxy(g, {
    get(t, prop, receiver) { if (named(t, prop)) return bridgeFake(env, `global:${prop}`); return Reflect.get(t, prop, receiver); },
    has(t, prop) { return prop in t || named(t, prop); },
  });
}

const counts = (env) => (env.bridge ??= { calls: new Set(), callbacks: new Set() });
// the bridge fake at `path`: one object per path per environment
export function bridgeFake(env, path) {
  const cache = (env.bridgeCache ??= new Map());
  if (cache.has(path)) return cache.get(path);
  const target = function bridgeTarget() {};
  const p = new Proxy(target, {
    get(t, prop) {
      if (prop === '__isFake') return true;
      if (prop === '__fakePath') return path;
      if (prop === '__isBridge') return true;
      if (prop === 'then') return undefined; // the settled value is never thenable: awaiting it yields it
      if (prop === Symbol.toPrimitive || prop === 'valueOf' || prop === 'toString') return () => path; // its text is its path
      if (prop === Symbol.iterator) return function* () {}; // no real values: it iterates as an empty list
      if (prop === 'constructor') return Object;
      if (typeof prop === 'symbol') return undefined;
      env.record('get', `${path}.${prop}`);
      return bridgeFake(env, `${path}.${prop}`);
    },
    set(t, prop, value) { env.record('set', `${path}.${String(prop)}`, [render(value)]); return true; },
    has(t, prop) { env.record('has', `${path}.${String(prop)}`); return true; },
    deleteProperty(t, prop) { env.record('delete', `${path}.${String(prop)}`); return true; },
    apply(t, thisArg, args) {
      env.record('call', path, args.map((x) => render(x)));
      const k = (env.calls.get(path) ?? 0) + 1; env.calls.set(path, k);
      const at = `${path}()#${k}`; counts(env).calls.add(at);
      args.forEach((a, i) => {
        if (typeof a !== 'function' || a.__isFake || /^class\s/.test(Function.prototype.toString.call(a))) return;
        const cb = `${at}#cb${i}`;
        Promise.resolve().then(() => { // after the turn, once, with one fake argument
          counts(env).callbacks.add(cb);
          try { const r = a(bridgeFake(env, `${cb}.arg0`)); if (r && typeof r.then === 'function') r.then(undefined, () => {}); }
          catch (e) { env.record('callback-throw', cb, [String(e && e.message)]); }
        });
      });
      return thenable(env, at);
    },
    construct(t, args) { env.record('new', path, args.map((x) => render(x))); const k = (env.calls.get(path) ?? 0) + 1; env.calls.set(path, k); counts(env).calls.add(`new ${path}#${k}`); return bridgeFake(env, `new ${path}#${k}`); },
    getPrototypeOf() { return Function.prototype; },
    ownKeys(t) { env.record('keys', path); return Reflect.ownKeys(t); },
  });
  cache.set(path, p);
  return p;
}
// a call's answer: the bridge fake at the call's path, thenable; `then` resolves it after the current turn (held by the
// race explorer's scheduler when one runs), `catch` and `finally` are a promise's
function thenable(env, at) {
  const settled = bridgeFake(env, at);
  let promise = null;
  const later = () => { if (!promise) { const p = Promise.resolve().then(() => settled); promise = env.scheduler ? env.scheduler.hold(p, at) : p; } return promise; };
  return new Proxy(settled, {
    get(t, prop, receiver) {
      if (prop === 'then') return (onF, onR) => later().then(onF, onR);
      if (prop === 'catch') return (onR) => later().catch(onR);
      if (prop === 'finally') return (f) => later().finally(f);
      return Reflect.get(t, prop, receiver);
    },
  });
}
// the render row's counts: the bridge calls answered and the callbacks fired on this environment, by path
export const bridgeCounts = (env) => ({ calls: [...(env.bridge?.calls ?? [])], callbacks: [...(env.bridge?.callbacks ?? [])] });
