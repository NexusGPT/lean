// Validation of the library member rows by run (design/library-rows.md, "2026-10-28 library members"): for each row of
// LIBRARY_MEMBER_ROWS, three or more inputs run on the engine this process runs on, and what the row claims is compared
// with what the engine does. A row lands only when every case holds. `node validate.mjs [--log <dir>]` writes one log per
// row and prints `rows N, cases M, failed K`; exit 1 when a case fails or a row has no validation.
import fs from 'node:fs';
import path from 'node:path';
import { LIBRARY_MEMBER_ROWS } from '../../../library-rows.mjs';

const show = (v) => JSON.stringify(v, (k, x) => (x === undefined ? '<undefined>' : x)); // an undefined field or value stays visible
const same = (a, b) => show(a) === show(b);
const keep = (obj, name, fn) => { const d = Object.getOwnPropertyDescriptor(obj, name); Object.defineProperty(obj, name, { ...d, value: fn(d.value) }); return () => Object.defineProperty(obj, name, d); };
const cases = {};

// the claim: a member of a value of unknown type is read from the value itself, so an accessor keyed by the member and the value
// is the same function on both sides; an absent member reads undefined, an inherited one reads the inherited value
cases['incomplete-type-member'] = [
  ['an own member', () => { const req = { params: { provider: 'vault' }, body: { a: 1 } }; return [[req.params.provider, req.body.a], ['vault', 1]]; }],
  ['an absent member reads undefined', () => { const req = { params: {} }; return [req.body, undefined]; }],
  ['an inherited member', () => { const base = { baseUrl: '/rest' }; const req = Object.create(base); return [req.baseUrl, '/rest']; }],
  ['two reads of a plain member agree', () => { const req = { query: { page: '2' } }; return [[req.query.page, req.query.page], ['2', '2']]; }],
];
// the claim: a.push.apply(a, b) is a.push(...b), and the receiver of a call through the function value is its first operand
cases['push-apply-value'] = [
  ['apply of two arrays', () => { const a = [1, 2], b = [3, 4], x = [1, 2]; a.push.apply(a, b); x.push(...b); return [a, x]; }],
  ['empty arrays', () => { const a = [], b = [], x = []; a.push.apply(a, b); x.push(...b); return [a, x]; }],
  ['call with items', () => { const a = ['p'], x = ['p']; a.push.call(a, 'q', 'r'); x.push('q', 'r'); return [a, x]; }],
  ['the receiver is the first operand (why the row stays refused as a value)', () => { const a = [1], b = [9]; a.push.apply(b, [2]); return [[a, b], [[1], [9, 2]]]; }],
];
// the claim: the text of an object is Object.prototype.toString or its own method, so the call has no one reading
cases['tostring-object'] = [
  ['a plain object', () => [({}).toString(), '[object Object]']],
  ['an object with its own toString', () => [({ toString() { return 'own'; } }).toString(), 'own']],
  ['an object without a prototype throws', () => { try { Object.create(null).toString(); return ['no throw', 'TypeError']; } catch (e) { return [e.constructor.name, 'TypeError']; } }],
  ['a number is fixed by its value', () => [(255).toString(), '255']],
];
// the claim: a locale read in an iteration callback is one read per element, in index order, and some/find stop at the match
cases['locale-in-callback'] = [
  ['map reads each element in index order', () => { const seen = []; const undo = keep(String.prototype, 'toLocaleLowerCase', (f) => function () { seen.push(String(this)); return f.call(this); }); try { const out = ['A', 'b', 'C'].map((n) => n.toLocaleLowerCase()); return [{ out, seen }, { out: ['a', 'b', 'c'], seen: ['A', 'b', 'C'] }]; } finally { undo(); } }],
  ['some stops at the first match', () => { const seen = []; const undo = keep(String.prototype, 'toLocaleLowerCase', (f) => function () { seen.push(String(this)); return f.call(this); }); try { const hit = ['x', 'Y', 'z'].some((n) => n.toLocaleLowerCase() === 'y'); return [{ hit, seen }, { hit: true, seen: ['x', 'Y'] }]; } finally { undo(); } }],
  ['an empty array reads nothing', () => { const seen = []; const undo = keep(String.prototype, 'toLocaleLowerCase', (f) => function () { seen.push(String(this)); return f.call(this); }); try { const out = [].map((n) => n.toLocaleLowerCase()); return [{ out, seen }, { out: [], seen: [] }]; } finally { undo(); } }],
  ['reduce reads in order and threads the accumulator', () => { const seen = []; const undo = keep(String.prototype, 'toLocaleUpperCase', (f) => function () { seen.push(String(this)); return f.call(this); }); try { const out = ['a', 'b'].reduce((acc, n) => acc + n.toLocaleUpperCase(), ''); return [{ out, seen }, { out: 'AB', seen: ['a', 'b'] }]; } finally { undo(); } }],
  ['a number read inside filter', () => { let reads = 0; const undo = keep(Number.prototype, 'toLocaleString', (f) => function (...a) { reads++; return f.apply(this, a); }); try { const out = [1, 2, 3].filter((x) => x.toLocaleString() !== '2'); return [{ out, reads }, { out: [1, 3], reads: 3 }]; } finally { undo(); } }],
];
// the claim: the index of a match is a function of pattern and string for a non-global literal; a global pattern moves lastIndex
cases['match-index'] = [
  ['a non-global literal gives the same index twice', () => { const s = 'xxabxab'; const i1 = /ab/.exec(s).index, i2 = /ab/.exec(s).index; return [[i1, i2], [2, 2]]; }],
  ['a global pattern gives a different index on the second exec', () => { const re = /ab/g, s = 'xxabxab'; return [[re.exec(s).index, re.exec(s).index], [2, 5]]; }],
  ['the first position by search equals the index of the first match', () => { const s = 'zzabzab'; return [/ab/.exec(s).index, s.search(/ab/)]; }],
];
// the claim: groups is an object the match builds (null prototype), with undefined for a group that did not take part
cases['match-groups'] = [
  ['named captures', () => { const g = /(?<user>\w+)@(?<host>[a-z.]+)/.exec('ann@x.org').groups; return [{ ...g }, { user: 'ann', host: 'x.org' }]; }],
  ['no named capture: groups is undefined', () => [/(\w+)@/.exec('ann@x.org').groups, undefined]],
  ['a group that did not take part', () => { const g = /(?<a>x)|(?<b>y)/.exec('y').groups; return [{ ...g }, { a: undefined, b: 'y' }]; }],
  ['the object has no prototype', () => [Object.getPrototypeOf(/(?<a>x)/.exec('x').groups), null]],
];
// the claim: one call, two receivers: the same indexOf means a substring on a string and an element identity on an array
cases['method-on-union'] = [
  ['a string finds a substring', () => ['ab'.indexOf('b'), 1]],
  ['an array finds an element', () => [['a', 'b'].indexOf('b'), 1]],
  ['the same argument reads differently', () => { const v = ['ab', 'b']; const s = 'ab'; return [[s.indexOf('b'), v.indexOf('b')], [1, 1]]; }],
  ['a one-element array does not contain the substring', () => [[['ab'].indexOf('b'), 'ab'.indexOf('b')], [-1, 1]]],
];
// the claim: a const g pattern that is only a pattern argument of matchAll/match/replace/replaceAll/split/search keeps lastIndex 0
cases['matchall-named'] = [
  ['matchAll twice gives the same matches and leaves lastIndex', () => { const RE = /a+/g, s = 'aa b a'; const m1 = [...s.matchAll(RE)].map((m) => [m[0], m.index]), m2 = [...s.matchAll(RE)].map((m) => [m[0], m.index]); return [{ m1, m2, last: RE.lastIndex }, { m1: [['aa', 0], ['a', 5]], m2: [['aa', 0], ['a', 5]], last: 0 }]; }],
  ['match, replace, replaceAll, split and search leave lastIndex 0', () => { const RE = /a+/g, s = 'aa b a'; s.match(RE); s.replace(RE, 'x'); s.replaceAll(RE, 'y'); s.split(RE); s.search(RE); return [RE.lastIndex, 0]; }],
  ['matchAll after those calls still starts at 0', () => { const RE = /a+/g, s = 'aa b a'; s.match(RE); s.search(RE); s.replace(RE, 'x'); return [[...s.matchAll(RE)].map((m) => m[0]), ['aa', 'a']]; }],
  ['exec moves lastIndex (why such a pattern is refused)', () => { const RE = /a+/g, s = 'aa b a'; RE.exec(s); return [[[...s.matchAll(RE)].map((m) => m[0]), RE.lastIndex], [['a'], 2]]; }],
];
// the claim: c.sort() with no comparator is c = [...c].sort(), the default order (strings by UTF-16 code units)
cases['sort-default-statement'] = [
  ['strings', () => { const a = ['b', 'a', 'C'], x = ['b', 'a', 'C']; a.sort(); const y = [...x].sort(); return [a, y]; }],
  ['numbers sort as text', () => { const a = [10, 9, 1], x = [10, 9, 1]; a.sort(); const y = [...x].sort(); return [[a, y], [[1, 10, 9], [1, 10, 9]]]; }],
  ['empty and single', () => { const a = [], b = ['x']; a.sort(); b.sort(); return [[a, b], [[], ['x']]]; }],
];
// the claim: c?.pop() removes from a present receiver, so the receiver must be rebound; an absent receiver is untouched
cases['optional-chain-mutator'] = [
  ['present receiver loses its last element', () => { const c = [1, 2, 3]; const v = c?.pop(); return [{ v, c }, { v: 3, c: [1, 2] }]; }],
  ['absent receiver gives undefined', () => { const c = undefined; const v = c?.pop(); return [v, undefined]; }],
  ['shift removes the first', () => { const c = ['a', 'b']; const v = c?.shift(); return [{ v, c }, { v: 'a', c: ['b'] }]; }],
  ['splice removes a run', () => { const c = [1, 2, 3, 4]; const v = c?.splice(1, 2); return [{ v, c }, { v: [2, 3], c: [1, 4] }]; }],
];
// the claim: this.field.shift() reads and writes the field in one statement
cases['world-field-mutator'] = [
  ['shift on a field', () => { const o = { items: ['a', 'b'] }; const v = o.items.shift(); return [{ v, items: o.items }, { v: 'a', items: ['b'] }]; }],
  ['pop on an empty field', () => { const o = { items: [] }; const v = o.items.pop(); return [{ v, items: o.items }, { v: undefined, items: [] }]; }],
  ['splice on a field', () => { const o = { items: [1, 2, 3] }; const v = o.items.splice(0, 2); return [{ v, items: o.items }, { v: [1, 2], items: [3] }]; }],
];

const logDir = process.argv.includes('--log') ? process.argv[process.argv.indexOf('--log') + 1] : null;
if (logDir) fs.mkdirSync(logDir, { recursive: true });
let total = 0, failed = 0;
for (const row of LIBRARY_MEMBER_ROWS) {
  const list = cases[row.id];
  const lines = [`row ${row.id} (${row.status}${row.reading ? ', ' + row.reading : ''}): ${row.member}`, `section: ${row.section}`, `node ${process.version}`];
  if (!list || list.length < 3) { lines.push('NO VALIDATION (a row needs three cases)'); failed++; }
  for (const [name, run] of list ?? []) {
    let pair, err = null;
    try { pair = run(); } catch (e) { err = e; }
    const ok = !err && same(pair[0], pair[1]);
    total++; if (!ok) failed++;
    lines.push(`${ok ? 'ok  ' : 'FAIL'} ${name}: observed ${err ? 'threw ' + err.message : show(pair[0])}, claimed ${err ? '-' : show(pair[1])}`);
  }
  if (logDir) fs.writeFileSync(path.join(logDir, `${row.id}.log`), lines.join('\n') + '\n');
  if (!logDir || lines.some((l) => l.startsWith('FAIL') || l.startsWith('NO'))) console.log(lines.join('\n'));
}
console.log(`rows ${LIBRARY_MEMBER_ROWS.length}, cases ${total}, failed ${failed}`);
process.exit(failed ? 1 : 0);
