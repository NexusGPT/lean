// The protocol of each library fake (design/w2d-library-rows.md): the clauses a fake must satisfy, each a script run on
// generated inputs (a fixed seed) against a module. Two kinds:
//   vector clauses  the same script against the real package and against the fake; the real package's outputs are
//                   recorded once by vectors.mjs (vectors/<lib>.json, the package version named) and the fake must
//                   give the same outputs: for a vendored package this checks that the package loaded in a sandbox on
//                   lean's world computes what it computes on Node, for a model (axios, express) that the model is the
//                   package's behaviour on the clauses' inputs;
//   world clauses   what the fake takes from lean's world (protocol.test.mjs): a clock read is the side's recorded
//                   clock, randomness the seeded draw, a timer the virtual clock, a request a trace record.
// The inputs are drawn here, never stored: the vector file holds the outputs only, so the recording and the check
// draw the same inputs from the same seed.
export function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const pick = (r, xs) => xs[Math.floor(r() * xs.length)];
const KEYS = ['a', 'b', 'c', 'id', 'name', 'n'];
function value(r, depth = 0) {
  const k = r();
  if (depth > 2 || k < 0.35) return pick(r, [0, 1, -1, 2, 7, 3.5, '', 'a', 'b', 'x y', true, false, null, undefined]);
  if (k < 0.65) return Array.from({ length: Math.floor(r() * 4) }, () => value(r, depth + 1));
  const o = {}; for (let i = Math.floor(r() * 4); i > 0; i--) o[pick(r, KEYS)] = value(r, depth + 1); return o;
}
const record = (r) => ({ id: Math.floor(r() * 5), name: pick(r, ['a', 'b', 'c', '']), n: pick(r, [0, 1, 2, -1, 3.5]), tags: Array.from({ length: Math.floor(r() * 3) }, () => pick(r, ['x', 'y', 'z'])) });
const records = (r) => Array.from({ length: Math.floor(r() * 6) }, () => record(r));
const path = (r) => pick(r, ['a', 'a.b', 'a[0]', 'b.c.d', 'id', 'name', 'tags[1]', ['a', 'b'], 'x.y']);
const MS = [0, 1700000000000, 1709251199999, 1704067200000, 951782400000, 1735689599000, 1710000000123];
const UNITS = ['millisecond', 'second', 'minute', 'hour', 'day', 'week', 'month', 'year'];
// a value as JSON can hold it: undefined, NaN, infinities and -0 by name, a Date by its instant, an error by class and message
export function plain(v, depth = 0) {
  if (v === undefined) return { $undefined: true };
  if (typeof v === 'number') return Number.isNaN(v) ? { $nan: true } : !Number.isFinite(v) ? { $infinity: Math.sign(v) } : Object.is(v, -0) ? { $negativeZero: true } : v;
  if (v === null || typeof v !== 'object') return typeof v === 'function' ? { $function: true } : v;
  if (depth > 8) return { $deep: true };
  if (Object.prototype.toString.call(v) === '[object Date]') return { $date: Number.isNaN(v.getTime()) ? 'invalid' : v.getTime() };
  if (v instanceof Error || Object.prototype.toString.call(v) === '[object Error]') return { $error: v.name, message: v.message, ...(v.code ? { code: v.code } : {}) };
  if (Array.isArray(v)) return v.map((x) => plain(x, depth + 1));
  return Object.fromEntries(Object.keys(v).sort().map((k) => [k, plain(v[k], depth + 1)]));
}
const attempt = (f) => { try { return { value: plain(f()) }; } catch (e) { return { threw: plain(e) } } };
const N = 40;

// lib -> [{ clause, input(r) -> args, run(mod, args) -> value }]; `mod(spec)` gives the module for an import specifier
export const VECTOR_CLAUSES = {
  lodash: [
    { clause: 'get', input: (r) => [value(r), path(r), pick(r, [undefined, 'dflt'])], run: (m, [o, p, d]) => m('lodash').get(o, p, d) },
    { clause: 'set on a copy', input: (r) => [value(r), path(r), value(r)], run: (m, [o, p, v]) => { const _ = m('lodash'); const c = _.cloneDeep(o); _.set(c, p, v); return c; } },
    { clause: 'has', input: (r) => [value(r), path(r)], run: (m, [o, p]) => m('lodash').has(o, p) },
    { clause: 'pick', input: (r) => [value(r), [path(r), path(r)].flat()], run: (m, [o, ps]) => m('lodash').pick(o, ps) },
    { clause: 'omit', input: (r) => [value(r), [path(r)].flat()], run: (m, [o, ps]) => m('lodash').omit(o, ps) },
    { clause: 'groupBy', input: (r) => [records(r), pick(r, ['name', 'id', 'n'])], run: (m, [xs, k]) => m('lodash').groupBy(xs, k) },
    { clause: 'keyBy and countBy', input: (r) => [records(r)], run: (m, [xs]) => [m('lodash').keyBy(xs, 'id'), m('lodash').countBy(xs, 'name')] },
    { clause: 'uniq and uniqBy', input: (r) => [Array.from({ length: Math.floor(r() * 8) }, () => pick(r, [0, 1, 2, 'a', 'b', null, NaN, -0]))], run: (m, [xs]) => [m('lodash').uniq(xs), m('lodash').uniqBy(xs, (x) => typeof x)] },
    { clause: 'sortBy and orderBy', input: (r) => [records(r)], run: (m, [xs]) => [m('lodash').sortBy(xs, ['n', 'name']), m('lodash').orderBy(xs, ['name', 'id'], ['desc', 'asc'])] },
    { clause: 'isEqual and isEmpty', input: (r) => [value(r), value(r)], run: (m, [a, b]) => [m('lodash').isEqual(a, b), m('lodash').isEqual(a, m('lodash').cloneDeep(a)), m('lodash').isEmpty(a)] },
    { clause: 'merge', input: (r) => [value(r), value(r)], run: (m, [a, b]) => { const _ = m('lodash'); return _.merge(_.cloneDeep(a), b); } },
    { clause: 'chunk, flatten, compact, difference', input: (r) => [Array.from({ length: Math.floor(r() * 7) }, () => value(r, 2)), 1 + Math.floor(r() * 3)], run: (m, [xs, n]) => { const _ = m('lodash'); return [_.chunk(xs, n), _.flatten(xs), _.compact(xs), _.difference(xs, [0, 'a', null])]; } },
    { clause: 'sum, max, min, mean', input: (r) => [Array.from({ length: Math.floor(r() * 5) }, () => pick(r, [0, 1, -1, 2.5, 7]))], run: (m, [xs]) => { const _ = m('lodash'); return [_.sum(xs), _.max(xs), _.min(xs), _.mean(xs), _.sumBy(xs, (x) => x * 2)]; } },
    { clause: 'case and string functions', input: (r) => [pick(r, ['hello world', 'fooBar', 'Foo-Bar_baz', '  x  ', 'XMLHttpRequest', 'a1b2', ''])], run: (m, [s]) => { const _ = m('lodash'); return [_.camelCase(s), _.kebabCase(s), _.snakeCase(s), _.startCase(s), _.capitalize(s), _.trim(s), _.upperFirst(s), _.words(s)]; } },
    { clause: 'mapValues, toPairs, fromPairs, partition', input: (r) => [records(r)], run: (m, [xs]) => { const _ = m('lodash'); return [_.mapValues(_.keyBy(xs, 'id'), 'name'), _.fromPairs(_.toPairs({ a: 1, b: xs.length })), _.partition(xs, (x) => x.n > 0)]; } },
  ],
  zod: [
    { clause: 'object parse', input: (r) => [r() < 0.5 ? record(r) : value(r)], run: (m, [v]) => { const { z } = m('zod'); const S = z.object({ id: z.number().int().min(0), name: z.string().min(1), n: z.number().optional(), tags: z.array(z.enum(['x', 'y'])).default([]) }); const r = S.safeParse(v); return r.success ? { ok: r.data } : { issues: r.error.issues.map((i) => [i.code, i.path.join('.')]) }; } },
    { clause: 'union, literal, nullable, transform', input: (r) => [value(r)], run: (m, [v]) => { const { z } = m('zod'); const S = z.union([z.literal('a'), z.number().nullable(), z.array(z.string()).transform((xs) => xs.length)]); const r = S.safeParse(v); return r.success ? { ok: r.data } : { issues: r.error.issues.map((i) => i.code) }; } },
    { clause: 'parse throws ZodError', input: (r) => [value(r)], run: (m, [v]) => { const { z, ZodError } = m('zod'); try { return { ok: z.string().email().parse(v) }; } catch (e) { return { threw: e instanceof ZodError, name: e.name, issues: e.issues.length }; } } },
  ],
  dayjs: [
    { clause: 'add, format', input: (r) => [pick(r, MS), Math.floor(r() * 40) - 10, pick(r, UNITS)], run: (m, [ms, n, u]) => m('dayjs')(ms).add(n, u).format('YYYY-MM-DD HH:mm:ss.SSS') },
    { clause: 'diff, startOf, endOf', input: (r) => [pick(r, MS), pick(r, MS), pick(r, UNITS.slice(1))], run: (m, [a, b, u]) => { const d = m('dayjs'); return [d(a).diff(d(b), u), d(a).diff(d(b), u, true), d(a).startOf(u).valueOf(), d(a).endOf(u).valueOf(), d(a).isBefore(d(b)), d(a).isSame(d(b), u)]; } },
    { clause: 'parse strings', input: (r) => [pick(r, ['2024-02-29', '2024-02-30', '2024-13-01', 'not a date', '2023-11-14T22:13:20Z', '2023-11-14 10:00', ''])], run: (m, [s]) => { const v = m('dayjs')(s); return [v.isValid(), v.isValid() ? v.valueOf() : null]; } },
    { clause: 'utc plugin', input: (r) => [pick(r, MS)], run: (m, [ms]) => { const d = m('dayjs'); d.extend(m('dayjs/plugin/utc')); return d.utc(ms).format(); } },
  ],
  luxon: [
    { clause: 'plus, toISO', input: (r) => [pick(r, MS), Math.floor(r() * 40) - 10, pick(r, ['days', 'hours', 'months', 'years', 'minutes'])], run: (m, [ms, n, u]) => m('luxon').DateTime.fromMillis(ms, { zone: 'utc' }).plus({ [u]: n }).toISO() },
    { clause: 'diff, startOf', input: (r) => [pick(r, MS), pick(r, MS)], run: (m, [a, b]) => { const { DateTime } = m('luxon'); const x = DateTime.fromMillis(a, { zone: 'utc' }), y = DateTime.fromMillis(b, { zone: 'utc' }); return [x.diff(y, 'days').days, x.startOf('month').toMillis(), x.toFormat('yyyy LLL dd'), DateTime.fromISO('2024-02-30').isValid]; } },
  ],
  'date-fns': [
    { clause: 'format, add, difference', input: (r) => [pick(r, MS), Math.floor(r() * 40) - 10], run: (m, [ms, n]) => { const f = m('date-fns'); const d = new Date(ms); return [f.format(d, 'yyyy-MM-dd HH:mm'), f.addDays(d, n).getTime(), f.addMonths(d, n).getTime(), f.differenceInDays(f.addDays(d, n), d), f.differenceInCalendarDays(d, new Date(MS[1])), f.isBefore(d, new Date(MS[1])), f.startOfMonth(d).getTime()]; } },
    { clause: 'parseISO, isValid, formatDistance', input: (r) => [pick(r, ['2024-02-29', '2024-02-30', 'x', '2023-11-14T22:13:20Z']), pick(r, MS)], run: (m, [s, ms]) => { const f = m('date-fns'); const d = f.parseISO(s); return [f.isValid(d), f.isValid(d) ? d.getTime() : null, f.formatDistance(new Date(ms), new Date(MS[1])), f.formatDistanceStrict(new Date(ms), new Date(MS[1]))]; } },
  ],
  uuid: [
    { clause: 'v5, v3', input: (r) => [pick(r, ['hello', '', 'example.com', 'x y']), pick(r, ['6ba7b810-9dad-11d1-80b4-00c04fd430c8', '6ba7b811-9dad-11d1-80b4-00c04fd430c8'])], run: (m, [name, ns]) => [m('uuid').v5(name, ns), m('uuid').v3(name, ns)] },
    { clause: 'validate, version, parse/stringify', input: (r) => [pick(r, ['9342d47a-1bab-5709-9869-c840b2eac501', '00000000-0000-0000-0000-000000000000', 'not-a-uuid', '4BC63010-6337-4FA8-8B7E-A691B74DCA06', '4bc63010-6337-9fa8-8b7e-a691b74dca06', ''])], run: (m, [s]) => { const u = m('uuid'); return [u.validate(s), u.validate(s) ? u.version(s) : attempt(() => u.version(s)), u.validate(s) ? u.stringify(u.parse(s)) : null, u.NIL]; } },
  ],
  axios: [
    { clause: 'getUri: baseURL, url, params', input: (r) => [pick(r, [undefined, 'https://api.x.io', 'https://api.x.io/v1/', '/rel']), pick(r, ['/users', 'users/1', 'https://other.io/p?a=1', '', 'q#frag']), pick(r, [undefined, { q: 'a b' }, { ids: [1, 2] }, { d: null, e: undefined, f: 'x:y,$' }, { o: { k: 1 } }])], run: (m, [baseURL, url, params]) => m('axios').getUri({ baseURL, url, params }) },
    { clause: 'settle: a status outside validateStatus rejects', input: (r) => [pick(r, [200, 201, 204, 301, 400, 404, 500, 503]), pick(r, ['default', 'all', 'below500'])], run: null, async: (m, [status, vs]) => m.axiosOutcome(status, vs) },
  ],
  express: [
    { clause: 'response: status, chain, body once', input: (r) => [Array.from({ length: 1 + Math.floor(r() * 4) }, () => pick(r, [['status', 404], ['status', 201], ['json', { a: 1 }], ['send', 'ok'], ['set', 'X-A', '1'], ['sendStatus', 204], ['end']]))], run: null, ops: true },
  ],
};
export const LIBS = Object.keys(VECTOR_CLAUSES);
export function inputsOf(lib, clause) { const r = rng(1 + [...`${lib}:${clause.clause}`].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)); return Array.from({ length: N }, () => clause.input(r)); }
// the outputs of every clause of a lib, given the module accessor; async clauses and the express ops through `extra`
export async function runLib(lib, mod, extra = {}) {
  const out = {};
  for (const c of VECTOR_CLAUSES[lib]) {
    const rows = [];
    for (const args of inputsOf(lib, c)) {
      if (c.ops) rows.push(attempt(() => extra.responseOps(args[0])));
      else if (c.async) { try { rows.push({ value: plain(await c.async(Object.assign((s) => mod(s), extra), args)) }); } catch (e) { rows.push({ threw: plain(e) }); } }
      else rows.push(attempt(() => c.run(mod, args)));
    }
    out[c.clause] = rows;
  }
  return out;
}
// express's Response semantics as a list of observations of each operation: what it returned, the status, whether the
// body was sent, or what it threw
export function responseObservations(res, ops) {
  return ops.map(([op, ...args]) => { try { const r = res[op](...args); return { same: r === res, status: res.statusCode, sent: res.headersSent }; } catch (e) { return { threw: e.code ?? e.message, status: res.statusCode, sent: res.headersSent }; } });
}
