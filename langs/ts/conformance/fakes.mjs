#!/usr/bin/env node
// The protocol test of every behavioural fake against the real module (design/w2e-fake-conformance.md, 2026-11-01).
//
//   node fakes.mjs [--dir <fakes dir>]... [--good <dir>] [--wrong <dir>] [--seed 1] [--cases 12] [--json <out>] [--break]
//
// Every module under exec/fakes/** that exports `create` (or a default function) is a fake. Its specifiers (its
// `specifier` export, else its file name: fs.mjs -> node:fs, web/fetch.mjs -> global:fetch, lib/x.mjs -> x) name the
// protocol families it is tested by; a fake no family covers fails ("no protocol"), so no fake is admitted untested.
// Each family runs one seeded script against the fake and against the real module wherever the real module is pure or
// sandboxable (path, url, URL, Buffer, createHash, Headers, TextEncoder/Decoder, structuredClone, AbortController: in
// this process; fs: in a fresh temporary folder; timers: on the real event loop; localStorage: in a child with Node's
// web storage), and compares outcome by outcome, a thrown error by its code. Where the real thing is not reachable (the
// network, the process) the family's reference is the protocol itself, stated as clauses (fetch answers what was
// seeded, compared with a real Response built from the seed). Every named clause runs on the real module first: a clause
// the real module fails is the harness's defect and fails the run. Two clauses hold for every fake: `determinism` (two
// fakes from one seed answer the script alike, trace included) and `recorded` (every call lands on the trace or the
// pending list: the trace stays the oracle).
//
// The fixture folders: conformance/fixtures/fakes/good (minimal fakes, each must pass) and .../wrong (each exports
// `expectRefused`, the clauses it must fail; an fs whose read returns the previous write among them). --break removes
// the mechanism (every comparison agrees, no clause is checked on the fake): the wrong fixtures are then admitted and
// the run exits 1. Exit 0 only when every fake and every good fixture passes and every wrong fixture is refused on the
// clauses it names. The last line is the TOTAL line.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import realUrlModule from 'node:url';
import realCrypto from 'node:crypto';
import { Buffer as RealBuffer } from 'node:buffer';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Environment, makeRng } from '../exec/fake.mjs';
import { runTimers } from '../exec/run.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const opts = (k) => argv.flatMap((x, i) => (x === k ? [argv[i + 1]] : []));
const BREAK = argv.includes('--break');
const SEED = Number(opt('--seed', 1)), CASES = Number(opt('--cases', 12));
const DIRS = opts('--dir').length ? opts('--dir') : [path.join(here, '../exec/fakes')];
const GOOD = opt('--good', path.join(here, 'fixtures/fakes/good')), WRONG = opt('--wrong', path.join(here, 'fixtures/fakes/wrong'));
const jsonOut = opt('--json', null);

// ----- outcomes: a value in a form both sides can be compared in; a throw by its code (else its name) -----
export function canon(v, depth = 0) {
  if (depth > 8) return { deep: true };
  if (v === undefined) return { undefined: true };
  if (v === null || typeof v === 'boolean' || typeof v === 'string') return v;
  if (typeof v === 'number') return Object.is(v, -0) ? { number: '-0' } : Number.isFinite(v) ? v : { number: String(v) };
  if (typeof v === 'bigint') return { bigint: String(v) };
  if (typeof v === 'symbol') return { symbol: String(v) };
  if (typeof v === 'function') return v.__isFake ? { fake: String(v.__fakePath) } : { function: v.name };
  if (v.__isFake) return { fake: String(v.__fakePath) }; // a recording handle where the real module answers a value: never equal to it
  if (ArrayBuffer.isView(v)) return { [v.constructor.name]: RealBuffer.from(v.buffer, v.byteOffset, v.byteLength).toString('hex') };
  if (v instanceof ArrayBuffer) return { ArrayBuffer: RealBuffer.from(v).toString('hex') };
  if (v instanceof URL) return { URL: v.href };
  if (v instanceof URLSearchParams) return { URLSearchParams: [...v] };
  if (v instanceof Map) return { Map: [...v].map((e) => canon(e, depth + 1)) };
  if (v instanceof Set) return { Set: [...v].map((e) => canon(e, depth + 1)) };
  if (v instanceof Date) return { Date: canon(v.getTime()) };
  if (v instanceof RegExp) return { RegExp: String(v) };
  if (v instanceof Error) return { Error: v.name, message: v.message, code: v.code };
  if (Array.isArray(v)) return v.map((e) => canon(e, depth + 1));
  if (typeof v.isFile === 'function' && typeof v.isDirectory === 'function') { const f = v.isFile(); return { stat: { isFile: f, isDirectory: v.isDirectory(), size: f ? v.size : null } }; } // a directory's size is the file system's own
  const proto = Object.getPrototypeOf(v);
  const out = {}; for (const k of Object.keys(v).sort()) out[k] = canon(v[k], depth + 1);
  return proto && proto !== Object.prototype && proto.constructor?.name ? { [proto.constructor.name]: out } : out;
}
const thrown = (e) => ({ throw: typeof e?.code === 'string' ? e.code : e?.name ?? String(e) });
const same = (a, b) => BREAK || JSON.stringify(a) === JSON.stringify(b);
const show = (x) => { const s = JSON.stringify(x); return s && s.length > 160 ? s.slice(0, 157) + '...' : s; };

// a step is one call through the subject: `at` a member path ('join', 'posix.join', 'promises.readFile'), `new` for a
// constructor, `post` a projection of the result (a URL's fields, a Response's body) applied on both sides alike
const member = (subject, at) => { const ps = at.split('.'); let self = null, v = subject; for (const p of ps) { self = v; v = v?.[p]; } return { self, fn: v }; };
async function outcome(subject, step) {
  const { self, fn } = member(subject, step.at);
  if (typeof fn !== 'function') return { absent: step.at };
  try {
    let v = step.new ? Reflect.construct(fn, step.args) : Reflect.apply(fn, self, step.args);
    if (step.await) v = await v;
    if (step.post) v = await step.post(v);
    return { ok: canon(v) };
  } catch (e) { return thrown(e); }
}
const label = (s) => `${s.new ? 'new ' : ''}${s.at}(${s.args.map((a) => show(canon(a))).join(', ')})${s.post ? ` -> ${s.postName ?? 'post'}` : ''}`;

// ----- the fake under test: a fresh environment, a fresh fake, its calls counted against what it recorded -----
function fresh(fake, seed, recording = {}) {
  const env = new Environment(seed);
  let created = fake.create(env, recording);
  if (typeof created === 'function') created = { [fake.globalName ?? created.name]: created }; // a global's fake may be the global itself
  return { env, subject: created };
}
const traceMark = (env) => `${env.trace.length}:${env.pending.map((e) => e.id).join(',')}`; // what an observer of the world sees: the trace and the pending list; a call recorded changes it (a clear removes a pending entry)

// run a script on the fake and the real subject step by step; every step compared, and counted for `recorded`
async function differential(fake, real, steps, seed, recording) {
  const { env, subject } = fresh(fake, seed, recording);
  let first = null, n = 0, unrecorded = null; const absent = new Set(), transcript = [];
  for (const s of steps) {
    const before = traceMark(env);
    const f = await outcome(subject, s);
    if (f.absent) { absent.add(f.absent); continue; }
    if (traceMark(env) === before && !unrecorded) unrecorded = label(s);
    const r = await outcome(real, s);
    n++; transcript.push(f);
    if (!first && !same(f, r)) first = `${label(s)}: fake ${show(f)}, real ${show(r)}`;
  }
  return { n, first, absent: [...absent], unrecorded, transcript, trace: JSON.stringify(env.trace) };
}

// ----- seeded inputs: the boundary values first, then draws -----
const pick = (rng, xs) => xs[Math.floor(rng() * xs.length)];
const draws = (seed, salt) => makeRng((seed * 2654435761 + salt) >>> 0);

// ----- the families: each a set of specifiers, a script, and the clauses it checks -----
const SEGS = ['', '.', '..', '/', '//', 'a', 'b', 'a/b', 'a//b/', '../c', './d', '/abs', '/abs/../x', 'f.txt', 'g.tar.gz', '.hidden', 'x.', 'ü', 'a b', 'w\\v', 'C:\\x', '~'];
const pathOf = (rng) => Array.from({ length: 1 + Math.floor(rng() * 4) }, () => pick(rng, SEGS)).join(pick(rng, ['/', '/', '//', '']));
const absOf = (rng) => '/' + pathOf(rng);
function pathSteps(seed, ns = '') {
  const rng = draws(seed, 1), P = ns ? `${ns}.` : '', steps = [];
  for (const s of SEGS) steps.push({ at: P + 'normalize', args: [s] }, { at: P + 'basename', args: [s] }, { at: P + 'dirname', args: [s] }, { at: P + 'extname', args: [s] }, { at: P + 'isAbsolute', args: [s] }, { at: P + 'parse', args: [s] });
  steps.push({ at: P + 'join', args: [] }, { at: P + 'join', args: [1] }, { at: P + 'basename', args: [undefined] }, { at: P + 'join', args: ['a', null] });
  for (let i = 0; i < CASES * 6; i++) {
    const parts = Array.from({ length: 1 + Math.floor(rng() * 4) }, () => pathOf(rng));
    steps.push({ at: P + 'join', args: parts }, { at: P + 'normalize', args: [parts.join('/')] }, { at: P + 'basename', args: [parts[0], pick(rng, ['.txt', '.gz', '', 'b', 'x.'])] },
      { at: P + 'relative', args: [absOf(rng), absOf(rng)] }, { at: P + 'resolve', args: [absOf(rng), ...parts] }, { at: P + 'format', args: [{ dir: pathOf(rng), base: pathOf(rng) }] }, { at: P + 'format', args: [{ root: pick(rng, ['', '/']), name: pathOf(rng), ext: pick(rng, ['txt', '.txt', '']) }] }, { at: P + 'toNamespacedPath', args: [parts[0]] });
  }
  return steps;
}
const URLS = ['http://example.com', 'https://user:pw@例え.jp:8080/a/../b?x=1&y=%20#h', 'file:///tmp/a b', 'http://[::1]:80/', 'HTTP://EXAMPLE.COM/%7Efoo', 'mailto:x@y', 'data:text/plain,hi', 'http://a/b?c#d', '//noscheme', 'http://', 'not a url', 'http://a:99999', 'ws://h/p', 'http://a/../../x', 'https://a.b/c?q=a+b&q=c', 'http://a.b./c', 'https://%41.com', 'http://1.2.3.4.5', 'http://0x7f.1/', ''];
const RELS = ['', '?q', '#f', '../up', '/root', 'x/y', '//other/z', 'http://abs/', '..', 'a?b#c'];
const urlOf = (rng) => `${pick(rng, ['http', 'https', 'file', 'ws', 'foo', 'HTTP'])}://${pick(rng, ['', 'u@', 'u:p@'])}${pick(rng, ['example.com', 'a.b', '127.0.0.1', '[::1]', 'xn--n3h.com', 'Ä.de', ''])}${pick(rng, ['', ':80', ':8080', ':0', ':x'])}${pick(rng, ['', '/', '/a/b', '/a/../b/./c', '/%7e', '/ sp'])}${pick(rng, ['', '?', '?a=1&b=2', '?q=a+b&q=%20'])}${pick(rng, ['', '#', '#h', '#a b'])}`;
const URL_FIELDS = (u) => ({ href: u.href, origin: u.origin, protocol: u.protocol, username: u.username, password: u.password, host: u.host, hostname: u.hostname, port: u.port, pathname: u.pathname, search: u.search, hash: u.hash, params: [...u.searchParams] });
function urlSteps(seed, { node }) {
  const rng = draws(seed, 2), steps = [];
  const fields = { post: URL_FIELDS, postName: 'fields' };
  const inputs = [...URLS, ...Array.from({ length: CASES * 4 }, () => urlOf(rng))];
  for (const s of inputs) steps.push({ at: 'URL', new: true, args: [s], ...fields }, { at: 'URL', new: true, args: [pick(rng, RELS), s], ...fields });
  if (true) for (let i = 0; i < CASES * 3; i++) {
    const qs = pick(rng, ['', 'a=1', '?a=1&a=2&b', 'x=%20+y&&=z', 'k=v=w', '%zz=1', 'ü=ö']);
    const ops = Array.from({ length: 4 }, () => [pick(rng, ['append', 'set', 'delete']), pick(rng, ['a', 'b', 'k', '']), pick(rng, ['1', '', ' ', '&=', 'ü'])]);
    steps.push({ at: 'URLSearchParams', new: true, args: [qs], post: (p) => { const seen = []; for (const [op, k, v] of ops) { if (op === 'delete') p.delete(k); else p[op](k, v); seen.push(p.toString()); } seen.push(p.get('a'), p.getAll('a'), p.has('b'), p.size); p.sort(); seen.push(p.toString()); return seen; }, postName: ops.map((o) => o.join(' ')).join('; ') });
  }
  if (node) for (let i = 0; i < CASES * 2; i++) {
    steps.push({ at: 'fileURLToPath', args: [pick(rng, ['file:///a/b%20c', 'file:///', 'file://host/x', 'http://a/b', 'file:///a/%2F', 'file:///ü'])] }, { at: 'pathToFileURL', args: [absOf(rng)], post: (u) => u.href, postName: 'href' },
      { at: 'format', args: [new URL(pick(rng, URLS.slice(0, 9)).replace(/^\/\//, 'http://')), pick(rng, [{}, { auth: false, search: false }, { fragment: false, unicode: true }])] }, { at: 'parse', args: [urlOf(rng)], post: (u) => ({ protocol: u.protocol, auth: u.auth, host: u.host, pathname: u.pathname, search: u.search, hash: u.hash, href: u.href }), postName: 'fields' });
  }
  return steps;
}
const BUF_ENC = ['utf8', 'hex', 'base64', 'base64url', 'latin1', 'ascii', 'utf16le'];
const STRS = ['', 'a', 'hello world', 'ü€😀', '\u0000\uffff', 'zz', 'aGk=', 'ff00', '\ud800'];
function bufferSteps(seed) {
  const rng = draws(seed, 3), steps = [];
  for (let i = 0; i < CASES * 6; i++) {
    const s = pick(rng, STRS), e1 = pick(rng, BUF_ENC), e2 = pick(rng, BUF_ENC);
    steps.push({ at: 'Buffer.from', args: [s, e1], post: (b) => [b.toString(e2), b.length, b.toJSON(), b.subarray(1, 3).toString('hex')], postName: `as ${e2}` }, { at: 'Buffer.byteLength', args: [s, e1] },
      { at: 'Buffer.concat', args: [[RealBuffer.from(s), RealBuffer.from(pick(rng, STRS))]] }, { at: 'Buffer.compare', args: [RealBuffer.from(s), RealBuffer.from(pick(rng, STRS))] },
      { at: 'Buffer.alloc', args: [Math.floor(rng() * 5), pick(rng, [undefined, 'a', 1])] }, { at: 'Buffer.isEncoding', args: [pick(rng, [...BUF_ENC, 'UTF-8', 'nope', ''])] }, { at: 'Buffer.from', args: [[1, 256, -1, 3.7]] });
  }
  return steps;
}
function hashSteps(seed) {
  const rng = draws(seed, 4), steps = [];
  for (let i = 0; i < CASES * 6; i++) {
    const alg = pick(rng, ['sha256', 'sha1', 'md5', 'sha512', 'SHA256', 'nope']), parts = Array.from({ length: 1 + Math.floor(rng() * 3) }, () => pick(rng, [...STRS, RealBuffer.from([0, 1, 2])])), enc = pick(rng, [undefined, 'hex', 'base64', 'base64url']);
    steps.push({ at: 'createHash', args: [alg], post: (h) => { for (const p of parts) h.update(p); return h.digest(enc); }, postName: `update ${show(parts.map((p) => canon(p)))} digest ${enc}` });
  }
  return steps;
}
function webSteps(seed, names) {
  const rng = draws(seed, 5), steps = [];
  if (names.has('Headers')) for (let i = 0; i < CASES * 3; i++) {
    const init = pick(rng, [undefined, {}, { A: '1', b: ' x ' }, [['set-cookie', 'a'], ['Set-Cookie', 'b'], ['x', '1']], { 'bad name': 'v' }, { a: 'bad\nvalue' }]);
    const ops = Array.from({ length: 4 }, () => [pick(rng, ['append', 'set', 'delete']), pick(rng, ['a', 'A', 'x-y', 'set-cookie', 'Content-Type']), pick(rng, ['1', ' 2 ', '', 'text/plain'])]);
    steps.push({ at: 'Headers', new: true, args: init === undefined ? [] : [init], post: (h) => { for (const [op, k, v] of ops) { if (op === 'delete') h.delete(k); else h[op](k, v); } return [[...h], h.get('a'), h.has('x-y'), h.getSetCookie?.()]; }, postName: ops.map((o) => o.join(' ')).join('; ') });
  }
  if (names.has('TextEncoder')) for (const s of [...STRS, 'abc'.repeat(5)]) steps.push({ at: 'TextEncoder', new: true, args: [], post: (t) => [t.encoding, t.encode(s), t.encodeInto(s, new Uint8Array(3))], postName: `encode ${show(s)}` });
  if (names.has('TextDecoder')) for (let i = 0; i < CASES * 3; i++) {
    const label2 = pick(rng, [undefined, 'utf-8', 'utf-16le', 'latin1', 'nope']), bytes = Uint8Array.from({ length: Math.floor(rng() * 6) }, () => pick(rng, [0x61, 0xc3, 0xbc, 0xff, 0xe2, 0x82, 0xac, 0x00])), o = pick(rng, [{}, { fatal: true }, { ignoreBOM: true }]);
    steps.push({ at: 'TextDecoder', new: true, args: label2 === undefined ? [] : [label2, o], post: (d) => [d.encoding, d.fatal, d.decode(bytes)], postName: `decode ${show(canon(bytes))}` });
  }
  if (names.has('structuredClone')) for (const v of [1, 'a', null, undefined, [1, [2]], { a: { b: 1 } }, new Map([[1, { x: 2 }]]), new Set([1, 'a']), new Date(5), /x/gi, new Uint8Array([1, 2]), { f() {} }, Symbol('s'), -0, NaN, 10n, new Error('e')]) steps.push({ at: 'structuredClone', args: [v] });
  if (names.has('AbortController')) for (let i = 0; i < CASES; i++) {
    const reason = pick(rng, [undefined, 'why', 0, { r: 1 }]), twice = rng() < 0.5;
    steps.push({ at: 'AbortController', new: true, args: [], post: (c) => { const seen = [c.signal.aborted]; let fired = 0; c.signal.addEventListener('abort', () => { fired++; }); c.signal.onabort = () => { fired += 10; }; reason === undefined ? c.abort() : c.abort(reason); if (twice) c.abort('again'); const r = c.signal.reason; let th; try { c.signal.throwIfAborted(); } catch (e) { th = e === r; } return [...seen, c.signal.aborted, fired, r instanceof Error || r?.constructor?.name === 'DOMException' ? r.name : canon(r), th]; }, postName: `abort(${show(reason)})${twice ? ' twice' : ''}` });
  }
  return steps;
}

// fs: the same op script on the fake and on the real fs in a fresh temporary folder (absolute paths under it on both
// sides); directory listings compared as sets (Node fixes no order); a directory's size is the file system's own
const FS_NAMES = ['a', 'b.txt', 'd', 'd/e.txt', 'd/f', 'd/f/g', 'a/x', 'seed.txt'];
const FS_DATA = ['', 'x', 'hello\n', 'ünï', '{"k":1}'];
function fsSteps(rng, R, prefix) {
  const p = () => `${R}/${pick(rng, FS_NAMES)}`, c = () => pick(rng, FS_DATA), steps = [];
  const sorted = (x) => (Array.isArray(x) ? [...x].sort() : x);
  const ops = [
    () => ({ at: `${prefix.sync}writeFileSync`, args: [p(), c()] }), () => ({ at: `${prefix.sync}appendFileSync`, args: [p(), c()] }),
    () => ({ at: `${prefix.sync}readFileSync`, args: [p(), 'utf8'] }), () => ({ at: `${prefix.sync}readFileSync`, args: [p()] }), () => ({ at: `${prefix.sync}existsSync`, args: [p()] }),
    () => ({ at: `${prefix.sync}mkdirSync`, args: [p()] }), () => ({ at: `${prefix.sync}mkdirSync`, args: [p(), { recursive: true }] }), () => ({ at: `${prefix.sync}unlinkSync`, args: [p()] }),
    () => ({ at: `${prefix.sync}rmdirSync`, args: [p()] }), () => ({ at: `${prefix.sync}rmSync`, args: [p(), pick(rng, [{ recursive: true, force: true }, { force: true }, {}])] }),
    () => ({ at: `${prefix.sync}readdirSync`, args: [pick(rng, [R, `${R}/d`, `${R}/a`, `${R}/d/f`])], post: sorted, postName: 'sorted' }), () => ({ at: `${prefix.sync}statSync`, args: [p()] }),
    () => ({ at: `${prefix.sync}renameSync`, args: [p(), p()] }),
    () => ({ at: `${prefix.async}readFile`, args: [p(), 'utf8'], await: true }), () => ({ at: `${prefix.async}writeFile`, args: [p(), c()], await: true }), () => ({ at: `${prefix.async}mkdir`, args: [p(), { recursive: true }], await: true }),
    () => ({ at: `${prefix.async}unlink`, args: [p()], await: true }), () => ({ at: `${prefix.async}readdir`, args: [R], await: true, post: sorted, postName: 'sorted' }), () => ({ at: `${prefix.async}stat`, args: [p()], await: true }),
  ];
  for (let i = 0; i < 28; i++) { const s = pick(rng, ops)(); if (s.at.startsWith('-')) continue; steps.push(s); }
  return steps;
}
// the three clauses the protocol names, each a list of steps with the property the last outcomes must satisfy
function fsClauses(rng, R, promisesOnly) {
  // one operation in the form under test: the sync name on fs, its promise form on fs/promises (existence as access)
  const op = (name, ...args) => (!promisesOnly ? { at: name, args } : name === 'existsSync' ? { at: 'access', args, await: true, post: () => true, postName: 'exists' } : { at: name.replace(/Sync$/, ''), args, await: true });
  const exists = (o) => o.ok === true, absent = (o) => o.ok === false || o.throw === 'ENOENT';
  const f = `${R}/c${Math.floor(rng() * 1e6)}.txt`, d = `${R}/m${Math.floor(rng() * 1e6)}`, c1 = pick(rng, FS_DATA.slice(1)), c2 = pick(rng, FS_DATA.slice(1)) + '2';
  return [
    { clause: 'write-then-read', steps: [op('writeFileSync', f, c1), op('readFileSync', f, 'utf8'), op('writeFileSync', f, c2), op('readFileSync', f, 'utf8'), op('readFileSync', f)],
      holds: (o) => o[1].ok === c1 && o[3].ok === c2 && JSON.stringify(o[4].ok) === JSON.stringify(canon(RealBuffer.from(c2))), wants: `${show(c1)}, then ${show(c2)}` },
    { clause: 'mkdir-then-exists', steps: [op('mkdirSync', `${d}/n`, { recursive: true }), op('existsSync', d), op('existsSync', `${d}/n`), op('statSync', `${d}/n`)],
      holds: (o) => o[0].ok === d && exists(o[1]) && exists(o[2]) && o[3].ok?.stat?.isDirectory === true, wants: `${show(d)} returned, both exist, a directory` },
    { clause: 'unlink-then-ENOENT', steps: [op('writeFileSync', f, c1), op('unlinkSync', f), op('readFileSync', f, 'utf8'), op('existsSync', f), op('statSync', f)],
      holds: (o) => o[2].throw === 'ENOENT' && absent(o[3]) && o[4].throw === 'ENOENT', wants: 'ENOENT, absent, ENOENT' },
    { clause: 'seeded-read', steps: [op('readFileSync', `${R}/seed.txt`, 'utf8')], holds: (o) => o[0].ok === 'seeded', wants: '"seeded"' },
  ];
}
const realFsSubject = { ...fs, promises: fs.promises };
async function fsFamily(fake, seed, { promisesOnly }) {
  const prefix = promisesOnly ? { sync: '-', async: '' } : { sync: '', async: 'promises.' };
  const realFs = promisesOnly ? fs.promises : realFsSubject;
  const results = { agree: { n: 0, first: null, absent: new Set(), unrecorded: null } }, clauses = {}, det = [];
  for (let k = 0; k < CASES; k++) {
    const rng = draws(seed, 150 + k);
    const R = fs.mkdtempSync(path.join(os.tmpdir(), 'w2e-fs-'));
    try {
      const run = async () => {
        fs.rmSync(R, { recursive: true, force: true }); fs.mkdirSync(R); fs.writeFileSync(`${R}/seed.txt`, 'seeded');
        const { env, subject } = fresh(fake, seed + k, { fs: { [`${R}/seed.txt`]: 'seeded' } });
        const setup = member(subject, promisesOnly ? 'mkdir' : 'mkdirSync').fn; // the folder itself exists on both sides; not compared
        try { await setup?.call(promisesOnly ? subject : subject, R, { recursive: true }); } catch (e) { return { setupError: `mkdir ${R} threw ${show(thrown(e))}` }; }
        return { env, subject };
      };
      const r2 = draws(seed, 100 + k), steps = fsSteps(r2, R, prefix);
      let side = await run(); if (side.setupError) { results.agree.first ??= side.setupError; continue; }
      const transcript = [];
      for (const s of steps) {
        const before = traceMark(side.env);
        const f = await outcome(side.subject, s); if (f.absent) { results.agree.absent.add(f.absent); continue; }
        if (traceMark(side.env) === before) results.agree.unrecorded ??= label(s);
        const r = await outcome(realFs, s); results.agree.n++; transcript.push(f);
        if (!results.agree.first && !same(f, r)) results.agree.first = `case ${k}, step ${transcript.length}: ${label(s).replaceAll(R, '<R>')}: fake ${show(f).replaceAll(R, '<R>')}, real ${show(r).replaceAll(R, '<R>')}`;
      }
      const trace1 = JSON.stringify(side.env.trace);
      side = await run(); const again = [];
      for (const s of steps) { const f = await outcome(side.subject, s); if (!f.absent) again.push(f); }
      det.push(same(transcript, again) && (BREAK || JSON.stringify(side.env.trace) === trace1));
      for (const cl of fsClauses(rng, R, promisesOnly)) {
        const c = (clauses[cl.clause] ??= { n: 0, first: null, real: null });
        const realSide = []; for (const s of cl.steps) realSide.push(await outcome(realFs, s));
        if (!cl.holds(realSide)) { c.real ??= `the real fs fails it: ${show(realSide).replaceAll(R, '<R>')}`; continue; }
        side = await run(); const fakeSide = []; let absent = null;
        for (const s of cl.steps) { const f = await outcome(side.subject, s); if (f.absent) absent = f.absent; fakeSide.push(f); }
        if (absent) { c.absent = absent; continue; }
        c.n++;
        if (!BREAK && !cl.holds(fakeSide)) c.first ??= `case ${k}: ${cl.steps.map(label).join(' ; ').replaceAll(R, '<R>')}: fake ${show(fakeSide).replaceAll(R, '<R>')}, wants ${cl.wants.replaceAll(R, '<R>')}`;
      }
    } finally { fs.rmSync(R, { recursive: true, force: true }); }
  }
  const out = [{ clause: 'agree', n: results.agree.n, first: results.agree.first, absent: [...results.agree.absent], against: 'the real fs in a temporary folder' }];
  for (const [clause, c] of Object.entries(clauses)) out.push({ clause, n: c.n, first: c.first, harness: c.real, absent: c.absent ? [c.absent] : [] });
  out.push({ clause: 'determinism', n: det.length, first: det.every(Boolean) ? null : 'two fakes from one seed answered the op script differently, or wrote different traces' });
  out.push({ clause: 'recorded', n: results.agree.n, first: results.agree.unrecorded ? `${results.agree.unrecorded} added nothing to the trace` : null });
  return out;
}

// timers: the same arm script on the fake (driven by lane B's virtual clock) and on the real event loop. The real loop
// fixes the order of timers with distinct due instants, and of timers armed in one turn with one delay (one list, first
// in first out); the script generator keeps every other tie out, and delays are K ms apart so the real loop's jitter
// cannot reorder them (a disagreement is checked again at 4K before it counts)
function timerScript(rng) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const items = Array.from({ length: 2 + Math.floor(rng() * 5) }, (_, i) => {
      const kind = rng() < 0.3 ? 'interval' : 'timeout';
      return { label: `t${i}`, kind, d: 1 + Math.floor(rng() * 6), count: 1 + Math.floor(rng() * 3), nested: kind === 'timeout' && rng() < 0.4 ? { d: 1 + Math.floor(rng() * 4) } : null, clear: rng() < 0.15, clearOther: rng() < 0.2 ? Math.floor(rng() * 6) : null };
    });
    // the instants of every fire, by simulation, only to keep ties out: two fires at one instant must share their arm turn and delay
    const q = items.filter((it) => !it.clear).map((it) => ({ it, due: it.d, turn: 'top', dur: it.d, n: 0, inner: false })); let ok = true, guard = 0;
    while (q.length && guard++ < 200) {
      q.sort((a, b) => a.due - b.due); const e = q.shift();
      if (q.some((x) => x.due === e.due && (x.turn !== e.turn || x.dur !== e.dur))) { ok = false; break; }
      if (e.inner) continue; // a nested timer only logs
      const o = e.it.clearOther != null ? items[e.it.clearOther] : null; if (o && o !== e.it) for (let i = q.length - 1; i >= 0; i--) if (q[i].it === o && !q[i].inner) q.splice(i, 1);
      if (e.it.nested) q.push({ it: e.it, due: e.due + e.it.nested.d, turn: `${e.it.label}@${e.due}`, dur: e.it.nested.d, inner: true });
      if (e.it.kind === 'interval' && ++e.n < e.it.count) q.push({ ...e, due: e.due + e.it.d, turn: `${e.it.label}#${e.n}` });
    }
    if (ok) return items;
  }
  return [{ label: 't0', kind: 'timeout', d: 1, count: 1, nested: null, clear: false, clearOther: null }];
}
// play a script through a timer API; returns the fire log once `drain` has run every timer
async function playTimers(api, items, K, drain) { // K null: the delays as written (the coercion scripts)
  const log = [], ids = new Map(), ms = (d) => (K === null ? d : d * K);
  for (const it of items) {
    let n = 0;
    const cb = () => {
      n++; log.push(it.kind === 'interval' ? `${it.label}#${n}` : it.label);
      if (it.clearOther != null && items[it.clearOther] && items[it.clearOther] !== it) { const o = items[it.clearOther]; (o.kind === 'interval' ? api.clearInterval : api.clearTimeout)(ids.get(o.label)); }
      if (it.nested) api.setTimeout(() => log.push(`${it.label}n`), ms(it.nested.d));
      if (it.kind === 'interval' && n >= it.count) api.clearInterval(ids.get(it.label));
    };
    ids.set(it.label, it.kind === 'interval' ? api.setInterval(cb, ms(it.d)) : api.setTimeout(cb, ms(it.d)));
    if (it.clear) (it.kind === 'interval' ? api.clearInterval : api.clearTimeout)(ids.get(it.label));
  }
  await drain(items);
  return log;
}
const horizon = (items) => items.reduce((m, it) => Math.max(m, it.d * it.count + (it.nested?.d ?? 0)), 0) + 2;
const realDrain = (K) => (items) => new Promise((r) => setTimeout(r, horizon(items) * K + 20));
const realApi = { setTimeout, setInterval, clearTimeout, clearInterval };
async function fakeTimers(fake, seed, items, K, H0 = null) {
  const { env, subject } = fresh(fake, seed);
  const api = { setTimeout: subject.setTimeout, setInterval: subject.setInterval, clearTimeout: subject.clearTimeout, clearInterval: subject.clearInterval };
  if (Object.values(api).some((f) => typeof f !== 'function')) return { absent: Object.entries(api).filter(([, f]) => typeof f !== 'function').map(([k]) => k) };
  const marks = []; const wrap = Object.fromEntries(Object.entries(api).map(([k, f]) => [k, (...a) => { const b = traceMark(env); const r = f(...a); marks.push(traceMark(env) !== b); return r; }]));
  const drain = async (its) => { const H = H0 ?? horizon(its) * K; if (typeof subject.tick === 'function') { for (let u = 1; u <= H; u++) await subject.tick(1); return; } for (let u = 1; u <= H; u++) await runTimers(env, 1000, 200, { until: u }); };
  try { const log = await playTimers(wrap, items, K, drain); return { log, recorded: marks.every(Boolean), trace: JSON.stringify(env.trace) }; } catch (e) { return { error: show(thrown(e)) }; }
}
async function timersFamily(fake, seed) {
  const K = 10, out = { order: { n: 0, first: null }, coercion: { n: 0, first: null }, det: [], recorded: null, absent: null };
  for (let k = 0; k < CASES; k++) {
    const items = timerScript(draws(seed, 200 + k));
    const f = await fakeTimers(fake, seed, items, K); if (f.absent) { out.absent = f.absent; break; }
    out.order.n++;
    if (f.error) { out.order.first ??= `case ${k}: the fake threw ${f.error}`; continue; }
    if (!f.recorded) out.recorded ??= `case ${k}: a timer call added nothing to the trace or the pending list`;
    const g = await fakeTimers(fake, seed, items, K); out.det.push(BREAK || (JSON.stringify(g.log) === JSON.stringify(f.log) && g.trace === f.trace));
    let real = await playTimers(realApi, items, K, realDrain(K));
    if (!same(f.log, real)) real = await playTimers(realApi, items, 4 * K, realDrain(4 * K)); // the real loop measured again with wider gaps before a disagreement counts
    if (!same(f.log, real)) out.order.first ??= `case ${k}: ${show(items.map((it) => `${it.kind} ${it.label} ${it.d}K${it.kind === 'interval' ? ` x${it.count}` : ''}${it.nested ? ` nests ${it.nested.d}K` : ''}${it.clear ? ' cleared' : ''}${it.clearOther != null ? ` clears t${it.clearOther}` : ''}`))}: fake fired ${show(f.log)}, real ${show(real)}`;
  }
  // delay coercion: one turn of timeouts with delays Node coerces to 1 ms (0, below 1, not a number) beside 1 ms and 2 ms
  // ones; one list per coerced delay, so the real order is armed order within 1 ms and 1 ms before 2 ms
  if (!out.absent) for (const delays of [[1, 0], [0, 1], [2, 0, 1], [-5, 1, NaN], ['2', 1], [1, '0', 2, undefined]]) {
    const items = delays.map((d, i) => ({ label: `c${i}`, kind: 'timeout', d, count: 1, nested: null, clear: false, clearOther: null }));
    const f = await fakeTimers(fake, seed, items, null, 5); out.coercion.n++;
    const real = await playTimers(realApi, items, null, () => new Promise((r) => setTimeout(r, 30)));
    if (f.error || !same(f.log, real)) out.coercion.first ??= `delays ${show(delays.map((d) => canon(d)))}: fake fired ${f.error ?? show(f.log)}, real ${show(real)}`;
  }
  return [
    { clause: 'virtual order', n: out.order.n, first: out.order.first, absent: out.absent ?? [], against: 'the real event loop, delays K = 10 ms apart' },
    { clause: 'delay coercion', n: out.coercion.n, first: out.coercion.first, against: 'the real event loop' },
    { clause: 'determinism', n: out.det.length, first: out.det.every(Boolean) ? null : 'two fakes from one seed fired differently or wrote different traces' },
    { clause: 'recorded', n: out.order.n, first: out.recorded },
  ];
}

// fetch: no network, so the reference is the protocol: a seeded (method, url, body) answers its entry, as a real Response
// built from the entry answers it; a request outside the table answers something else and is recorded
async function fetchFamily(fake, seed) {
  const rng = draws(seed, 6), table = [], out = { seeded: { n: 0, first: null }, miss: { n: 0, first: null }, det: [], recorded: null };
  for (let i = 0; i < CASES * 2; i++) {
    const json = rng() < 0.5, status = pick(rng, [200, 201, 202, 400, 404, 418, 500]);
    table.push({ method: pick(rng, ['GET', 'POST', 'PUT', 'DELETE', 'get']), url: `https://api.example.com/${pick(rng, ['users', 'items', 'a/b'])}/${i}${pick(rng, ['', '?q=1'])}`, body: pick(rng, [undefined, '{"a":1}', 'x']), status, headers: { 'content-type': json ? 'application/json' : 'text/plain', 'x-seed': String(i) }, response: json ? JSON.stringify({ seed: i, v: pick(rng, [1, 'a', null, [1]]) }) : `seed body ${i}` });
  }
  const read = async (res, json) => ({ status: res.status, ok: res.ok, type: res.headers.get('content-type'), seed: res.headers.get('x-seed'), body: json ? await res.json() : await res.text() });
  const play = async () => {
    const { env, subject } = fresh(fake, seed, { fetch: table }); const f = subject.fetch ?? subject.default; const got = [];
    if (typeof f !== 'function') return { absent: ['fetch'] };
    for (const e of table) {
      const json = e.headers['content-type'] === 'application/json', b = traceMark(env);
      let r; try { r = await read(await f(e.url, { method: e.method, ...(e.body === undefined ? {} : { body: e.body }) }), json); } catch (x) { r = thrown(x); }
      got.push({ e, r: canon(r), recorded: traceMark(env) !== b && JSON.stringify(env.trace.slice(-1)).includes(e.url.replace(/\?.*/, '')) });
      // the same url with another body, and another method: neither is the entry
      const other = e.body === 'other' ? 'other2' : 'other', b2 = traceMark(env);
      let m; try { m = await (await f(e.url, { method: 'PATCH', body: other })).text(); } catch (x) { m = thrown(x); }
      got.push({ miss: true, e, r: canon(m), recorded: traceMark(env) !== b2 });
    }
    return { got, trace: JSON.stringify(env.trace) };
  };
  const a = await play(); if (a.absent) return [{ clause: 'seeded', n: 0, first: null, absent: a.absent }];
  for (const g of a.got) {
    if (!g.recorded) out.recorded ??= `${g.e.method} ${g.e.url}${g.miss ? ' (outside the table)' : ''} added nothing naming its url to the trace`;
    if (g.miss) { out.miss.n++; if (!BREAK && table.some((e) => JSON.stringify(canon(e.response)) === JSON.stringify(g.r))) out.miss.first ??= `PATCH ${g.e.url} with another body answered a seeded entry's body ${show(g.r)}`; continue; }
    out.seeded.n++;
    const json = g.e.headers['content-type'] === 'application/json';
    const want = canon(await read(new Response(g.e.response, { status: g.e.status, headers: g.e.headers }), json));
    if (!same(g.r, want)) out.seeded.first ??= `${g.e.method} ${g.e.url} body ${show(g.e.body)}: fake ${show(g.r)}, a real Response from the entry ${show(want)}`;
  }
  const b = await play(); out.det.push(BREAK || (JSON.stringify(b.got.map((g) => g.r)) === JSON.stringify(a.got.map((g) => g.r)) && b.trace === a.trace));
  return [
    { clause: 'seeded', n: out.seeded.n, first: out.seeded.first, against: 'a real Response built from the seeded entry' },
    { clause: 'outside the table', n: out.miss.n, first: out.miss.first },
    { clause: 'determinism', n: out.det.length, first: out.det.every(Boolean) ? null : 'two fakes from one seed answered differently or wrote different traces' },
    { clause: 'recorded', n: a.got.length, first: out.recorded },
  ];
}

// randomness: no real reference can agree with a seeded draw; the clauses are the real one's shape (checked on the real
// module first), distinct draws, the same draws from one seed, other draws from another
async function randomClauses(fake, seed) {
  const out = [];
  const draw = (s) => { const { env, subject } = fresh(fake, s); const u = [], b = []; let rec = true; for (let i = 0; i < 40; i++) { if (typeof subject.randomUUID === 'function') { const m = traceMark(env); u.push(subject.randomUUID()); rec &&= traceMark(env) !== m; } if (typeof subject.randomBytes === 'function') { const n = i % 7; const m = traceMark(env); const x = subject.randomBytes(n); rec &&= traceMark(env) !== m; b.push(RealBuffer.isBuffer(x) && x.length === n ? x.toString('hex') : { bad: canon(x) }); } } return { u, b, rec }; };
  const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const harness = Array.from({ length: 40 }, () => realCrypto.randomUUID()).every((x) => V4.test(x)) ? null : 'the real randomUUID fails the v4 shape';
  const x = draw(seed), y = draw(seed), z = draw(seed + 1);
  const badUuid = x.u.find((v) => !V4.test(v)), repeated = new Set(x.u).size !== x.u.length;
  if (x.u.length) out.push({ clause: 'randomUUID shape', n: x.u.length, harness, first: BREAK ? null : badUuid !== undefined ? `not a v4 uuid: ${show(canon(badUuid))}` : repeated ? 'a uuid drawn twice in forty' : null });
  if (x.b.length) out.push({ clause: 'randomBytes length', n: x.b.length, first: BREAK ? null : (x.b.find((v) => typeof v !== 'string') ? `randomBytes answered ${show(x.b.find((v) => typeof v !== 'string'))}` : null) });
  if (x.u.length || x.b.length) out.push({ clause: 'seeded draws', n: 3, first: BREAK ? null : JSON.stringify([x.u, x.b]) !== JSON.stringify([y.u, y.b]) ? 'two fakes from one seed drew differently' : JSON.stringify([x.u, x.b]) === JSON.stringify([z.u, z.b]) ? 'two seeds drew the same' : null },
    { clause: 'recorded (draws)', n: 40, first: x.rec ? null : 'a draw added nothing to the trace' });
  return out;
}

// localStorage and sessionStorage: the same op script against Node's own Web Storage, run in a child with the flag
const STORAGE_OPS = (rng) => Array.from({ length: 30 }, () => pick(rng, [['setItem', pick(rng, ['a', 'b', '', 'ü'])], ['getItem', pick(rng, ['a', 'b', 'zz', ''])], ['removeItem', pick(rng, ['a', 'b'])], ['key', Math.floor(rng() * 3) - 1], ['length'], ['clear'], ['setItem', 'n', pick(rng, [1, null, { o: 1 }, [1, 2], undefined])]]));
const playStorage = (s, ops) => ops.map(([op, a, b]) => { try { return op === 'length' ? s.length : op === 'setItem' ? s.setItem(a, b === undefined && a !== 'n' ? `v${a}` : b) ?? null : s[op](a) ?? null; } catch (e) { return { throw: e.name }; } });
async function storageFamily(fake, seed, name) {
  const out = []; const scripts = Array.from({ length: CASES }, (_, k) => STORAGE_OPS(draws(seed, 300 + k)));
  const file = path.join(os.tmpdir(), `w2e-storage-${process.pid}-${Date.now()}`);
  const child = spawnSync(process.execPath, ['--no-warnings', '--experimental-webstorage', `--localstorage-file=${file}`, '--input-type=module', '-e', `const ops = JSON.parse(process.argv[1]); const play = ${playStorage.toString()}; const s = globalThis[${JSON.stringify(name)}]; console.log(JSON.stringify(ops.map((o) => { s.clear(); return play(s, o); })));`, JSON.stringify(scripts)], { encoding: 'utf8' });
  fs.rmSync(file, { force: true });
  let real; try { real = JSON.parse(child.stdout); } catch { return [{ clause: 'agree', n: 0, first: null, harness: `Node's Web Storage child: exit ${child.status}: ${(child.stderr || child.stdout).trim().slice(-200)}` }]; }
  let first = null, n = 0, det = true, recorded = null;
  for (let k = 0; k < scripts.length; k++) {
    const { env, subject } = fresh(fake, seed + k); const s = subject[name] ?? subject; const m = traceMark(env);
    const got = playStorage(s, scripts[k]).map((v) => canon(v)); n += got.length;
    if (traceMark(env) === m) recorded ??= `case ${k}: thirty storage operations added nothing to the trace`;
    if (!first && !same(got, real[k].map((v) => canon(v)))) { const i = got.findIndex((v, j) => JSON.stringify(v) !== JSON.stringify(canon(real[k][j]))); first = `case ${k}, op ${i} ${show(scripts[k][i])} after ${show(scripts[k].slice(Math.max(0, i - 3), i))}: fake ${show(got[i])}, real ${show(canon(real[k][i]))}`; }
    const again = fresh(fake, seed + k); const s2 = again.subject[name] ?? again.subject; det &&= BREAK || JSON.stringify(playStorage(s2, scripts[k]).map((v) => canon(v))) === JSON.stringify(got);
  }
  out.push({ clause: 'agree', n, first, against: `Node's own ${name} (--experimental-webstorage)` }, { clause: 'determinism', n: scripts.length, first: det ? null : 'two fakes from one seed answered differently' }, { clause: 'recorded', n: scripts.length, first: recorded });
  return out;
}

// console and process: no real module can be run (it would write the harness's own output, end its process); the clauses
async function consoleFamily(fake, seed) {
  const { env, subject } = fresh(fake, seed); const written = []; const keep = [process.stdout.write, process.stderr.write];
  process.stdout.write = process.stderr.write = (x) => { written.push(String(x)); return true; };
  let first = null, n = 0;
  try { for (const m of ['log', 'warn', 'error', 'info', 'debug']) { if (typeof subject[m] !== 'function') continue; const b = env.trace.length; const r = subject[m](`w2e-${m}`, { k: 1 }, 2); n++; const rec = env.trace.slice(b); if (!BREAK && (r !== undefined || !JSON.stringify(rec).includes(`w2e-${m}`))) first ??= `console.${m} answered ${show(canon(r))}, recorded ${show(rec)}`; } }
  finally { [process.stdout.write, process.stderr.write] = keep; }
  return [{ clause: 'captured on the trace', n, first: first ?? (!BREAK && written.length ? `wrote to the real output: ${show(written.join(''))}` : null) }];
}
async function processFamily(fake, seed) {
  const env0 = { W2E_A: 'a', W2E_EMPTY: '' };
  const { env, subject } = fresh(fake, seed, { env: env0 }); const out = [];
  const realExit = process.exit, realReally = process.reallyExit; let exited = null;
  process.exit = process.reallyExit = (c) => { exited = c; throw new Error('w2e: the fake called the real exit'); };
  try {
    if (subject.env) out.push({ clause: 'env from the recording', n: 3, first: BREAK ? null : subject.env.W2E_A === 'a' && subject.env.W2E_EMPTY === '' && subject.env.W2E_ABSENT === undefined ? null : `env answered ${show([subject.env.W2E_A, subject.env.W2E_EMPTY, subject.env.W2E_ABSENT].map((v) => canon(v)))}, the recording ${show(env0)}` });
    if (typeof subject.cwd === 'function') { const a = subject.cwd(), b = subject.cwd(); out.push({ clause: 'cwd', n: 2, first: BREAK ? null : typeof a === 'string' && path.isAbsolute(a) && a === b ? null : `cwd answered ${show(canon(a))} then ${show(canon(b))}` }); }
    if (subject.argv) out.push({ clause: 'argv', n: 1, first: BREAK ? null : Array.isArray(subject.argv) && subject.argv.every((x) => typeof x === 'string') ? null : `argv ${show(canon(subject.argv))}` });
    if (typeof subject.exit === 'function') { let threw = false; const b = traceMark(env); try { subject.exit(3); } catch (e) { threw = !String(e.message).startsWith('w2e:'); } out.push({ clause: 'exit is a fault', n: 1, first: BREAK ? null : exited !== null ? 'the fake ended the real process' : !threw ? 'exit(3) returned' : traceMark(env) === b ? 'exit(3) added nothing to the trace' : null }); }
  } finally { process.exit = realExit; process.reallyExit = realReally; }
  return out;
}

// the families, by specifier
const pureFamily = (real, steps) => async (fake, seed) => { const a = await differential(fake, real, steps(seed), seed); const b = await differential(fake, real, steps(seed), seed); return [{ clause: 'agree', n: a.n, first: a.first, absent: a.absent, against: 'the real module, in this process' }, { clause: 'determinism', n: a.n, first: BREAK || (same(a.transcript, b.transcript) && a.trace === b.trace) ? null : 'two fakes from one seed answered differently or wrote different traces' }, { clause: 'recorded', n: a.n, first: a.unrecorded && `${a.unrecorded} added nothing to the trace` }]; };
const globalsReal = { URL, URLSearchParams, Headers, TextEncoder, TextDecoder, structuredClone, AbortController };
const FAMILIES = [
  { name: 'path', specifiers: ['node:path', 'path', 'node:path/posix', 'path/posix'], run: async (fake, seed) => { const out = await pureFamily(path, (s) => pathSteps(s))(fake, seed); for (const ns of ['posix', 'win32']) { const { subject } = fresh(fake, seed); if (subject[ns]) { const r = await pureFamily(path, (s) => pathSteps(s, ns))(fake, seed); out.push(...r.map((c) => ({ ...c, clause: `${c.clause} (${ns})` }))); } } return out; } },
  { name: 'url', specifiers: ['node:url', 'url'], run: pureFamily(realUrlModule, (s) => urlSteps(s, { node: true })) },
  { name: 'URL', specifiers: ['global:URL', 'global:URLSearchParams'], run: pureFamily(globalsReal, (s) => urlSteps(s, { node: false })), once: true },
  { name: 'buffer', specifiers: ['node:buffer', 'buffer', 'global:Buffer'], run: pureFamily({ Buffer: RealBuffer }, bufferSteps) },
  { name: 'crypto', specifiers: ['node:crypto', 'crypto'], run: async (fake, seed) => [...await pureFamily(realCrypto, hashSteps)(fake, seed), ...await randomClauses(fake, seed)] },
  { name: 'Headers', specifiers: ['global:Headers'], run: pureFamily(globalsReal, (s) => webSteps(s, new Set(['Headers']))) },
  { name: 'encoding', specifiers: ['global:TextEncoder', 'global:TextDecoder', 'node:util'], run: pureFamily(globalsReal, (s) => webSteps(s, new Set(['TextEncoder', 'TextDecoder']))), once: true },
  { name: 'structuredClone', specifiers: ['global:structuredClone'], run: pureFamily(globalsReal, (s) => webSteps(s, new Set(['structuredClone']))) },
  { name: 'AbortController', specifiers: ['global:AbortController'], run: pureFamily(globalsReal, (s) => webSteps(s, new Set(['AbortController']))) },
  { name: 'fs', specifiers: ['node:fs', 'fs'], run: (fake, seed) => fsFamily(fake, seed, { promisesOnly: false }) },
  { name: 'fs/promises', specifiers: ['node:fs/promises', 'fs/promises'], run: (fake, seed) => fsFamily(fake, seed, { promisesOnly: true }) },
  { name: 'timers', specifiers: ['node:timers', 'timers', 'global:setTimeout'], run: timersFamily, once: true },
  { name: 'fetch', specifiers: ['global:fetch'], run: fetchFamily },
  { name: 'localStorage', specifiers: ['global:localStorage'], run: (fake, seed) => storageFamily(fake, seed, 'localStorage') },
  { name: 'sessionStorage', specifiers: ['global:sessionStorage'], run: (fake, seed) => storageFamily(fake, seed, 'sessionStorage') },
  { name: 'console', specifiers: ['node:console', 'console', 'global:console'], run: consoleFamily },
  { name: 'process', specifiers: ['node:process', 'process', 'global:process'], run: processFamily },
];
export const FAMILY_NAMES = FAMILIES.map((f) => f.name);

// ----- discovery: a fake is a module with `create` or a default function; its specifiers by export or file name -----
const WEB = { fetch: ['global:fetch'], url: ['global:URL', 'global:URLSearchParams'], headers: ['global:Headers'], abort: ['global:AbortController'], encoding: ['global:TextEncoder', 'global:TextDecoder'], storage: ['global:localStorage', 'global:sessionStorage'], clone: ['global:structuredClone'] };
export function specifiersOf(file, base, mod) {
  if (mod.specifier) return [mod.specifier].flat();
  if (mod.specifiers) return [mod.specifiers].flat();
  const rel = path.relative(base, file).replace(/\.mjs$/, '').split(path.sep);
  if (rel[0] === 'web' && rel.length === 2) return WEB[rel[1]] ?? [`global:${rel[1]}`];
  if (rel[0] === 'lib' && rel.length >= 2) return [rel.slice(1).join('/')];
  return [`node:${rel.join('/')}`];
}
const listFakes = (dir) => !fs.existsSync(dir) ? [] : fs.readdirSync(dir, { recursive: true }).map((f) => path.join(dir, String(f))).filter((f) => f.endsWith('.mjs') && !f.endsWith('.test.mjs') && !path.basename(f).startsWith('_') && fs.statSync(f).isFile()).sort();
async function testFake(file, base, seed) {
  const rel = path.relative(path.join(here, '..'), file);
  let mod; try { mod = await import(pathToFileURL(file).href); } catch (e) { return { file: rel, specifiers: [], clauses: [{ family: '-', clause: 'loads', n: 1, first: `import failed: ${e.message}` }] }; }
  const create = typeof mod.create === 'function' ? mod.create : typeof mod.default === 'function' ? mod.default : null;
  if (!create) return { file: rel, skipped: 'no `create` export and no default function: not a fake module' };
  const specifiers = specifiersOf(file, base, mod);
  const fake = { create, globalName: specifiers.find((s) => s.startsWith('global:'))?.slice(7) };
  const clauses = []; const ran = new Set();
  for (const sp of specifiers) {
    const fam = FAMILIES.find((f) => f.specifiers.includes(sp));
    if (!fam) { clauses.push({ family: '-', clause: 'no protocol', n: 0, first: `no protocol family covers ${sp}: a fake is admitted only with its protocol (add the family to conformance/fakes.mjs)` }); continue; }
    if (ran.has(fam.name)) continue; ran.add(fam.name);
    if (sp.startsWith('global:') && fam.specifiers.every((s) => s.startsWith('global:'))) fake.globalName = sp.slice(7);
    try { for (const c of await fam.run(fake, seed)) clauses.push({ family: fam.name, ...c }); } catch (e) { clauses.push({ family: fam.name, clause: 'runs', n: 0, first: `the family threw: ${e.stack?.split('\n').slice(0, 2).join(' ') ?? e}` }); }
  }
  return { file: rel, specifiers, expectRefused: mod.expectRefused ?? null, clauses };
}
const failing = (r) => (r.clauses ?? []).filter((c) => c.first);
const harnessDefects = (r) => (r.clauses ?? []).filter((c) => c.harness);

// ----- the run -----
const groups = [...DIRS.map((d) => ({ kind: 'fake', dir: d })), { kind: 'good', dir: GOOD }, { kind: 'wrong', dir: WRONG }];
const results = [];
for (const g of groups) for (const f of listFakes(g.dir)) results.push({ kind: g.kind, ...(await testFake(f, g.dir, SEED)) });
let bad = 0;
const lines = [];
for (const r of results) {
  if (r.skipped) { lines.push(`| ${r.kind} | ${r.file} | - | skipped | ${r.skipped} |`); continue; }
  const fails = failing(r), defects = harnessDefects(r);
  let ok;
  if (r.kind === 'wrong') { const want = r.expectRefused ?? []; ok = want.length > 0 && want.every((w) => fails.some((c) => c.clause === w)) && !defects.length; r.verdict = ok ? `refused on ${want.join(', ')}` : `ADMITTED: expected refusal on ${want.join(', ') || '(no expectRefused export)'}, failing ${fails.map((c) => c.clause).join(', ') || 'nothing'}`; }
  else { const checked = r.clauses.reduce((s, c) => s + (c.n ?? 0), 0); ok = !fails.length && !defects.length && checked > 0; r.verdict = ok ? 'pass' : `FAIL on ${[...fails, ...defects].map((c) => c.clause).join(', ') || 'no check ran (the fake provides none of the members its protocol tests)'}`; }
  r.ok = ok; if (!ok) bad++;
  for (const c of r.clauses) lines.push(`| ${r.kind} | ${r.file} | ${c.family} | ${c.clause} | ${c.first ? 'FAIL' : c.harness ? 'HARNESS' : 'PASS'} | ${c.n} | ${c.first ?? c.harness ?? c.against ?? ''}${c.absent?.length ? ` (not provided: ${c.absent.join(', ')})` : ''} |`);
}
console.log(`| group | fake | family | clause | result | checks | detail |`);
console.log(`|---|---|---|---|---|---|---|`);
for (const l of lines) console.log(l);
for (const r of results.filter((x) => !x.skipped)) console.log(`${r.ok ? 'ok  ' : 'BAD '} ${r.kind} ${r.file} [${r.specifiers.join(', ')}]: ${r.verdict}; clauses ${r.clauses.map((c) => `${c.family}/${c.clause} ${c.n}`).join(', ')}`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ seed: SEED, cases: CASES, break: BREAK, results }, null, 2));
const tested = results.filter((r) => !r.skipped), checks = tested.reduce((s, r) => s + r.clauses.reduce((t, c) => t + (c.n ?? 0), 0), 0);
const by = (k) => tested.filter((r) => r.kind === k);
console.log(`| FAKE-CONFORMANCE TOTAL | ${by('fake').length} fake(s) under exec/fakes, ${by('fake').filter((r) => r.ok).length} pass | ${by('good').filter((r) => r.ok).length} of ${by('good').length} good fixtures pass | ${by('wrong').filter((r) => r.ok).length} of ${by('wrong').length} wrong fixtures refused | ${tested.reduce((s, r) => s + r.clauses.length, 0)} clauses, ${checks} checks | seed ${SEED}${BREAK ? ' | --break' : ''} | ${bad ? `${bad} BAD` : 'ALL PASS'} |`);
process.exit(bad ? 1 : 0);
