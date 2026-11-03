// The library fakes of lane B (design/w2d-library-rows.md): an import specifier of an ecosystem library answered by a
// behavioural module instead of the recording proxy. Two kinds:
//   vendored  the package's own code (vendor/<package>, version and file hashes in its manifest), loaded into the side's
//             sandbox (load.mjs) or bound to its globals (lodash.mjs): the pure functions are the package's, its world
//             contact is lean's world (the seeded clock, the seeded generator, the virtual timers, the environment's
//             modules), so the fake cannot disagree with the package it stands for;
//             axios is vendored too, with lean's adapter as its default adapter (axios.mjs): the request it builds is
//             the world's, recorded and answered from the world's table;
//   model     a small stateful model of an effectful package (express): every request it makes of
//             the world is recorded on the trace as the recording proxy records it, and the model adds the value flow
//             (a response's status, a chained `res`, a choice among the items a prompt offered).
// `libraryFake(env, specifier)` is the module, or null: null keeps the recording proxy (env.fake(`module:<spec>`)). A
// member a model does not model is the recording proxy's member, recorded as before. LEAN_LIBRARY_FAKES=0, or the
// one --break convention LEAN_BREAK=library-fakes (amendment A6), turns every library fake off (the measurement
// without them, and each test's --break).
import { requireVendored, manifestOf } from './load.mjs';
import { declaredRange, compatible } from './range.mjs';
import { broken } from '../../../break.mjs'; // the one --break convention (A6; names in tests/break.mjs)
import { lodashFor } from './lodash.mjs';
import { uuidModule } from './uuid.mjs';
import { axiosModule } from './axios.mjs';
import { expressModule, expressTypeFake } from './express.mjs';

export const libraryFakesOn = () => process.env.LEAN_LIBRARY_FAKES !== '0' && !broken('library-fakes');
const esModule = (members, dflt) => new Proxy(members, { get: (t, p) => (p === '__esModule' ? true : p === 'default' ? dflt : Reflect.get(t, p)) });
const lodashMember = (env, name) => { const _ = lodashFor(env); return typeof _[name] === 'function' ? _[name] : null; };
// `lodash.isequal` (a per-method package) names its member in lower case
const lodashByLower = (env, lower) => { const _ = lodashFor(env); const k = Object.keys(_).find((x) => x.toLowerCase() === lower && typeof _[x] === 'function'); return k ? _[k] : null; };
const vendoredSub = (env, pkg, sub) => { const m = manifestOf(pkg); const rel = m?.subpaths?.[sub]; return rel ? requireVendored(env, pkg, rel) : null; };

// [test, module]: the first row whose test matches the specifier answers it
const ROWS = [
  { pkg: 'lodash', kind: 'vendored', test: (s) => s === 'lodash', make: (env) => lodashFor(env) },
  { pkg: 'lodash', kind: 'vendored', test: (s) => s === 'lodash-es', make: (env) => { const _ = lodashFor(env); return esModule(_, _); } },
  { pkg: 'lodash', kind: 'vendored', test: (s) => /^lodash(-es)?\/[A-Za-z]+$/.test(s), make: (env, s) => { const f = lodashMember(env, s.split('/')[1]); return f && (s.startsWith('lodash-es/') ? esModule({}, f) : f); } },
  { pkg: 'lodash', kind: 'vendored', test: (s) => /^lodash\.[a-z]+$/.test(s), make: (env, s) => lodashByLower(env, s.slice('lodash.'.length)) },
  { pkg: 'zod', kind: 'vendored', test: (s) => s === 'zod', make: (env) => requireVendored(env, 'zod', manifestOf('zod').main) },
  { pkg: 'zod', kind: 'vendored', test: (s) => s.startsWith('zod/'), make: (env, s) => vendoredSub(env, 'zod', s) },
  { pkg: 'dayjs', kind: 'vendored', test: (s) => s === 'dayjs', make: (env) => requireVendored(env, 'dayjs', manifestOf('dayjs').main) },
  { pkg: 'dayjs', kind: 'vendored', test: (s) => s.startsWith('dayjs/'), make: (env, s) => vendoredSub(env, 'dayjs', s) },
  { pkg: 'luxon', kind: 'vendored', test: (s) => s === 'luxon', make: (env) => requireVendored(env, 'luxon', manifestOf('luxon').main) },
  { pkg: 'date-fns', kind: 'vendored', test: (s) => s === 'date-fns', make: (env) => dateFns(env) },
  { pkg: 'date-fns', kind: 'vendored', test: (s) => s.startsWith('date-fns/'), make: (env, s) => vendoredSub(env, 'date-fns', s) },
  { pkg: 'uuid', kind: 'model', test: (s) => s === 'uuid', make: (env) => uuidModule(env) },
  { pkg: 'axios', kind: 'vendored', test: (s) => s === 'axios', make: (env) => axiosModule(env) },
  { pkg: 'express', kind: 'model', test: (s) => s === 'express', make: (env) => expressModule(env) },
  // vscode is not a row (w2f, the lead's decision C): its model (vscode.mjs) has no oracle on this machine, no extension
  // host to record its vectors from, and a fake with no oracle would certify itself. Its import stays the recording
  // proxy until its vectors are recorded from a real extension host; then the row `{ pkg: 'vscode', kind: 'model',
  // test: (s) => s === 'vscode', make: (env) => vscodeModule(env) }` comes back with them.
];
export const LIBRARY_FAKE_ROWS = ROWS.map(({ pkg, kind }) => ({ pkg, kind }));

// date-fns: the vendored functions one by one (its main entry requires every function and every locale); a member
// that is not vendored is the recording proxy's
// the vendored file of a date-fns export: its subpath, else the file of its own name (date-fns 3 puts each export in
// `<export>.js`, so an export vendored as another one's dependency, addMilliseconds under addHours, is answered too)
export const dateFnsFile = (m, name) => m.subpaths[`date-fns/${name}`] ?? (/^[A-Za-z]+$/.test(name) && Object.hasOwn(m.files, `${name}.js`) ? `${name}.js` : null);
function dateFns(env) {
  const m = manifestOf('date-fns'); if (!m) return null;
  const rec = env.fake('module:date-fns');
  return new Proxy({}, { get(t, p) {
    if (p === '__esModule') return true;
    const rel = typeof p === 'string' ? dateFnsFile(m, p) : null;
    if (rel) { const mod = requireVendored(env, 'date-fns', rel); return mod[p] ?? mod.default; }
    return rec[p];
  } });
}

// a vendored row answers only a range its version is compatible with (range.mjs, lane w9bb): the range the nearest package.json
// above the unit's folder declares for the specifier's package; a range off the vendored version's major (range.mjs
// compatible: `^4` for zod 3) keeps the recording proxy, a range not declared or not read keeps the row. LEAN_BREAK=w9bb-vendored-range: the row at any range
const packageOf = (spec) => (spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);
function declaredAdmits(env, spec, pkg) {
  if (broken('w9bb-vendored-range')) return true;
  const range = declaredRange(env.packageRoot, packageOf(spec));
  return range === null || compatible(range, manifestOf(pkg).version) !== false;
}

export function libraryFake(env, spec) {
  if (!libraryFakesOn() || typeof spec !== 'string' || !env.ctx) return null;
  const cache = (env.libraryModules ??= new Map());
  if (cache.has(spec)) return cache.get(spec);
  const row = ROWS.find((r) => r.test(spec));
  let mod = null;
  if (row && (row.kind === 'model' || (manifestOf(row.pkg) && declaredAdmits(env, spec, row.pkg)))) mod = row.make(env, spec) ?? null;
  cache.set(spec, mod);
  return mod;
}

// a value of a declared library type (exec/spec.mjs `module`: the package that declares the type): a behavioural value
// for the types a model knows (express's Request and Response), else null and the recording proxy as before
export function libraryTypeFake(env, path, tspec) {
  if (!libraryFakesOn() || !tspec?.module) return null;
  return expressTypeFake(env, path, tspec);
}
