#!/usr/bin/env node
// The protocol test of every behavioural fake against the real module (design/w2e-fake-conformance.md, 2026-11-01).
//
//   node fakes.mjs [--dir <fakes dir>]... [--good <dir>] [--wrong <dir>] [--seed 1] [--cases 12] [--json <out>] [--break]
//
// A fake is what lane B hands a unit: a module under exec/fakes/** that exports `create(env, recording)` (its specifiers
// by its `specifier` export, else its file name: fs.mjs -> node:fs, web/fetch.mjs -> global:fetch, lib/x.mjs -> x), or
// what a hook answers: a module registry (index.mjs MODELLED: env.module(spec), the recording proxy whose members ask the
// registry), a global lookup (index.mjs lookup(env, 'global:X')), a library hook (libraryFake inside lane B's sandbox).
// Each is tested with its own tree's Environment and runTimers, fault draws off. A specifier no family covers fails ("no
// protocol"), so no fake is admitted untested. Each family runs one seeded script against the fake and against the real
// module wherever the real module is pure or sandboxable (path, url, URL, Buffer, createHash, Headers, Request/Response,
// FormData, Blob, TextEncoder/Decoder, structuredClone, AbortController, a vendored library: in this process; fs: in a
// fresh temporary folder brought to the fake's world; timers: on the real event loop, a measurement with too much skew
// taken again; Web Storage: in a child with Node's; process.env: on fresh names), and compares outcome by outcome, a
// thrown error by its code. Where the real thing is not reachable (the network, the process's exit, the host's facts) the
// reference is the protocol itself, stated as clauses checked on the real platform's classes first (fetch's answer is a
// real Response of its own parts; os answers the real one's shapes). A clause the real module fails is the harness's
// defect and fails the run. Every fake keeps `determinism` (two fakes from one seed answer alike, trace included); every
// effectful one keeps `recorded` (each call lands on the trace or the pending list: the trace stays the oracle; a pure
// function's value flows into the outcome and owes no record).
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
import { createRequire } from 'node:module';
import realTimersPromises from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { makeRng } from '../exec/fake.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
process.removeAllListeners('warning'); // the real modules warn on what the scripts hand them on purpose (a negative delay, url.parse)
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
  // built-ins by their tag, never by instanceof: a fake that runs in lane B's sandbox answers values of another realm
  const tag = Object.prototype.toString.call(v).slice(8, -1);
  if (ArrayBuffer.isView(v)) return { [tag]: RealBuffer.from(v.buffer, v.byteOffset, v.byteLength).toString('hex') };
  if (tag === 'ArrayBuffer') return { ArrayBuffer: RealBuffer.from(v).toString('hex') };
  if (tag === 'URL') return { URL: v.href };
  if (tag === 'URLSearchParams') return { URLSearchParams: [...v] };
  if (tag === 'Map') return { Map: [...v].map((e) => canon(e, depth + 1)) };
  if (tag === 'Set') return { Set: [...v].map((e) => canon(e, depth + 1)) };
  if (tag === 'Date') return { Date: canon(v.getTime()) };
  if (tag === 'RegExp') return { RegExp: String(v) };
  if (tag === 'Error' || tag === 'DOMException') return { Error: v.name, message: v.message, code: v.code };
  if (Array.isArray(v)) return v.map((e) => canon(e, depth + 1));
  if (typeof v.isFile === 'function' && typeof v.isDirectory === 'function') { const f = v.isFile(); return { stat: { isFile: f, isDirectory: v.isDirectory(), size: f ? v.size : null } }; } // a directory's size is the file system's own
  const proto = Object.getPrototypeOf(v), cname = proto?.constructor?.name;
  const out = {}; for (const k of Object.keys(v).sort()) out[k] = canon(v[k], depth + 1);
  return proto && cname && cname !== 'Object' ? { [cname]: out } : out;
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
  const env = new fake.Env(seed);
  env.faultDraw = () => false; // a protocol is stated for a run without the world's drawn failures: those are the recording proxy's, tested with it
  if (fake.needsCtx) fake.sandbox(env, fake.tmpRoot); // a library fake answers inside lane B's sandbox, as the unit reaches it
  let created = fake.create(env, recording);
  if (fake.wrap) created = { [fake.wrap]: created }; // a hook's global: the value lane B's sandbox holds under its name
  else if (typeof created === 'function' && !fake.asModule) created = { [fake.globalName ?? created.name]: created }; // a global's fake may be the global itself
  return { env, subject: created };
}
const traceMark = (env) => `${env.trace.length}:${env.pending.map((e) => e.id).join(',')}`; // what an observer of the world sees: the trace and the pending list; a call recorded changes it (a clear removes a pending entry)

// run a script on the fake and the real subject step by step; every step compared, and counted for `recorded`
async function differential(fake, real, steps, seed, recording) {
  const { env, subject } = fresh(fake, seed, recording);
  let first = null, n = 0, unrecorded = null; const absent = new Set(), transcript = [];
  for (const s of steps) {
    const before = traceMark(env);
    const f = fake.provides && !fake.provides(env, s.at) ? { absent: s.at } : await outcome(subject, s); // a member with no model keeps the recording proxy's answer: not this fake's
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

// Request and Response, FormData, Blob, DOMException: the platform's classes; absolute URLs only (a relative URL has no
// one reference: Node's Request refuses it, a page resolves it against its document)
function fetchClassSteps(seed, names) {
  const rng = draws(seed, 7), steps = [];
  const bodyOf = () => pick(rng, [undefined, null, '', 'text', '{"a":1}', new URLSearchParams('a=1&b=2'), new Uint8Array([104, 105])]);
  const req = async (r) => [r.method, r.url, [...r.headers], r.mode, r.credentials, r.cache, r.redirect, r.bodyUsed, await r.clone().text(), await r.text(), r.bodyUsed];
  const res = async (r) => [r.status, r.ok, r.statusText, [...r.headers], r.type, r.redirected, r.bodyUsed, await r.clone().text(), await r.text(), r.bodyUsed];
  if (names.has('Request')) for (let i = 0; i < CASES * 3; i++) {
    const u = pick(rng, ['https://a.example/x?y=1#h', 'http://localhost:8080/', 'https://user:pw@a.example/', 'HTTPS://A.EXAMPLE/%7e', 'ftp://a.example/', 'not a url', 'https://a.example/ü']);
    const init = { method: pick(rng, [undefined, 'GET', 'post', 'PUT', 'patch', 'delete', 'HEAD', 'OPTIONS', 'TRACE']), headers: pick(rng, [undefined, { 'X-A': '1' }, [['a', '1'], ['A', '2']], { 'content-type': 'text/plain' }]), body: bodyOf(), mode: pick(rng, [undefined, 'cors', 'no-cors', 'same-origin', 'navigate']), redirect: pick(rng, [undefined, 'follow', 'manual', 'error']) };
    for (const k of Object.keys(init)) if (init[k] === undefined) delete init[k];
    steps.push({ at: 'Request', new: true, args: [u, init], post: req, postName: 'fields, bodies' });
  }
  if (names.has('Response')) {
    for (let i = 0; i < CASES * 3; i++) steps.push({ at: 'Response', new: true, args: [bodyOf(), { status: pick(rng, [undefined, 200, 201, 204, 299, 300, 404, 500, 599, 99, 600]), statusText: pick(rng, [undefined, 'OK', 'Fine', 'bad\ntext']), headers: pick(rng, [undefined, { 'X-A': '1' }, [['set-cookie', 'a'], ['set-cookie', 'b']]]) }], post: res, postName: 'fields, bodies' });
    for (const d of [1, 'a', null, { a: [1] }, undefined]) steps.push({ at: 'Response.json', args: [d, pick(rng, [undefined, { status: 201 }, { headers: { 'content-type': 'text/x' } }])], post: res, postName: 'fields, bodies' });
    steps.push({ at: 'Response.error', args: [], post: (r) => [r.type, r.status, r.ok] }, { at: 'Response.redirect', args: ['https://a.example/next', 301], post: (r) => [r.status, r.headers.get('location')] }, { at: 'Response.redirect', args: ['https://a.example/next', 200] });
  }
  if (names.has('FormData')) for (let i = 0; i < CASES; i++) {
    const ops = Array.from({ length: 5 }, () => [pick(rng, ['append', 'set', 'delete']), pick(rng, ['a', 'b']), pick(rng, ['1', '', 'ü'])]);
    steps.push({ at: 'FormData', new: true, args: [], post: (f) => { for (const [op, k, v] of ops) { if (op === 'delete') f.delete(k); else f[op](k, v); } return [[...f.entries()], f.get('a'), f.getAll('b'), f.has('a')]; }, postName: ops.map((o) => o.join(' ')).join('; ') });
  }
  if (names.has('Blob')) for (let i = 0; i < CASES; i++) {
    const parts = Array.from({ length: Math.floor(rng() * 3) }, () => pick(rng, ['ab', 'ü', new Uint8Array([0, 255])])), type = pick(rng, [undefined, 'text/plain', 'TEXT/HTML', 'bad\u0001']);
    steps.push({ at: 'Blob', new: true, args: type === undefined ? [parts] : [parts, { type }], post: async (b) => [b.size, b.type, await b.text(), await b.slice(1, 3).text(), new Uint8Array(await b.arrayBuffer())], postName: 'size, type, text' });
  }
  if (names.has('DOMException')) for (const a of [[], ['m'], ['m', 'AbortError'], ['m', 'TimeoutError'], ['m', 'NotAName'], ['m', 'DataCloneError']]) steps.push({ at: 'DOMException', new: true, args: a, post: (e) => [e.name, e.message, e.code, e instanceof Error] });
  return steps;
}
// AbortSignal: its statics against the real ones; `timeout(ms)` on lane B's virtual clock, the clause checked on the real
// event loop first (not aborted before its instant, aborted with a TimeoutError after)
async function abortSignalFamily(fake, seed) {
  const steps = [{ at: 'AbortSignal.abort', args: [], post: (s) => [s.aborted, s.reason?.name] }, { at: 'AbortSignal.abort', args: ['why'], post: (s) => [s.aborted, s.reason] },
    { at: 'AbortSignal.any', args: [[AbortSignal.abort('r1'), new AbortController().signal]], post: (s) => [s.aborted, s.reason] }, { at: 'AbortSignal.any', args: [[]], post: (s) => [s.aborted] }];
  const a = await differential(fake, { AbortSignal }, steps, seed);
  const realOk = await new Promise((r) => { const s = AbortSignal.timeout(20); setTimeout(() => { const before = s.aborted; setTimeout(() => r(!before && s.aborted && s.reason?.name === 'TimeoutError'), 80); }, 5); });
  let first = null, n = 0;
  for (const ms of [1, 5, 30]) {
    const { env, subject } = fresh(fake, seed); const T = subject.AbortSignal?.timeout; if (typeof T !== 'function') break;
    const s = Reflect.apply(T, subject.AbortSignal, [ms]); n++; // never `.call` on a fake: the recording proxy answers a member named call
    await fake.runTimers(env, 1000, 50, { until: ms - 1 }); const before = s.aborted;
    await fake.runTimers(env, 1000, 50, { until: ms }); const after = s.aborted, name = s.reason?.name;
    if (!BREAK && (before || !after || name !== 'TimeoutError')) first ??= `timeout(${ms}): aborted ${before} before ${ms} ms of the virtual clock, ${after} at it, reason ${show(name)}`;
  }
  return [{ clause: 'agree', n: a.n, first: a.first, absent: a.absent, against: 'the real AbortSignal' }, { clause: 'timeout on the virtual clock', n, first, harness: realOk ? null : 'the real AbortSignal.timeout(20) does not abort between 5 ms and 85 ms' }];
}

// a vendored library: the package's own files (vendor/<pkg>, each file's sha256 in its manifest) loaded by Node as the
// package is, beside the same files run inside lane B's sandbox; the same script on both. The reference is found beside
// the hook that answers the package (exec/fakes/lib/vendor/<pkg>/manifest.json).
function vendoredReference(fake, pkg) {
  const dir = path.join(fake.hookDir ?? '', 'vendor', pkg), mf = path.join(dir, 'manifest.json');
  if (!fs.existsSync(mf)) return { error: `no vendored copy at ${path.relative(path.join(here, '..'), dir)}` };
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  for (const [rel, sha] of Object.entries(m.files ?? {})) { const got = realCrypto.createHash('sha256').update(fs.readFileSync(path.join(dir, rel), 'utf8')).digest('hex'); if (got !== sha) return { error: `vendor/${pkg}/${rel} differs from its manifest` }; }
  return { mod: createRequire(path.join(dir, 'package.json'))(path.join(dir, m.main)), version: m.version };
}
function lodashSteps(seed) {
  const rng = draws(seed, 8), steps = [];
  const val = (d = 0) => pick(rng, d > 2 ? [1, 'a', null, undefined, 0, ''] : [1, 'a', null, undefined, 0, '', NaN, -0, [1, 2, 2], { a: 1, b: { c: [1, 2] } }, () => val(d + 1)].map((x) => (typeof x === 'function' ? x() : x)));
  const obj = () => ({ a: val(1), b: { c: [val(2), val(2)], d: val(2) }, 'e.f': val(2) });
  const key = () => pick(rng, ['a', 'b.c', 'b.c[1]', 'b.c.0', ['b', 'd'], 'e.f', ['e.f'], 'x.y', '', 'constructor']);
  const list = () => Array.from({ length: Math.floor(rng() * 6) }, () => pick(rng, [{ n: 3, k: 'x' }, { n: 1, k: 'y' }, { n: 2, k: 'x' }, { n: 1, k: 'z' }]));
  for (let i = 0; i < CASES * 4; i++) {
    const o = obj();
    steps.push({ at: 'get', args: [o, key(), pick(rng, [undefined, 'dflt'])] }, { at: 'has', args: [o, key()] }, { at: 'set', args: [structuredClone(o), key(), 9] }, { at: 'pick', args: [o, [key(), key()]] }, { at: 'omit', args: [o, [key()]] },
      { at: 'groupBy', args: [list(), 'k'] }, { at: 'sortBy', args: [list(), ['n', 'k']] }, { at: 'uniq', args: [[val(), val(), 1, 1, NaN, NaN]] }, { at: 'uniqBy', args: [list(), 'k'] }, { at: 'chunk', args: [list(), Math.floor(rng() * 4)] },
      { at: 'merge', args: [structuredClone(o), obj()] }, { at: 'cloneDeep', args: [o] }, { at: 'isEqual', args: [o, pick(rng, [o, structuredClone(o), obj()])] }, { at: 'flattenDeep', args: [[1, [2, [3, [4]]]]] }, { at: 'camelCase', args: [pick(rng, ['foo bar', '--foo-bar--', 'FOO_BAR', 'fooBar', 'ü ö'])] },
      { at: 'kebabCase', args: [pick(rng, ['foo bar', 'fooBar', '__FOO_BAR__'])] }, { at: 'debounce', args: [() => 1, 5], post: (f) => typeof f.cancel === 'function', postName: 'has cancel' }, { at: 'range', args: [Math.floor(rng() * 5), Math.floor(rng() * 9) - 2] }, { at: 'sumBy', args: [list(), 'n'] }, { at: 'keyBy', args: [list(), 'k'] });
  }
  return steps;
}
function uuidSteps(seed) {
  const rng = draws(seed, 9), steps = [];
  const NS = ['6ba7b810-9dad-11d1-80b4-00c04fd430c8', '6ba7b811-9dad-11d1-80b4-00c04fd430c8', 'not-a-uuid'];
  for (let i = 0; i < CASES * 3; i++) {
    const name = pick(rng, ['', 'a', 'hello', 'ü', 'www.example.com']), ns = pick(rng, NS), u = pick(rng, ['00000000-0000-0000-0000-000000000000', '6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'c9bf9e57-1685-4c89-bafb-ff5af830be8a', 'C9BF9E57-1685-4C89-BAFB-FF5AF830BE8A', 'xyz', '', 'c9bf9e57-1685-4c89-bafb-ff5af830be8']);
    steps.push({ at: 'v5', args: [name, ns] }, { at: 'v3', args: [name, ns] }, { at: 'validate', args: [u] }, { at: 'version', args: [u] }, { at: 'parse', args: [u], post: (b) => Array.from(b), postName: 'bytes' }, { at: 'stringify', args: [Array.from({ length: 16 }, () => Math.floor(rng() * 256))] });
  }
  steps.push({ at: 'NIL.toString', args: [] });
  return steps;
}
const vendoredFamily = (pkg, steps, effectful) => async (fake, seed) => {
  const ref = vendoredReference(fake, pkg); if (ref.error) return [{ clause: 'agree', n: 0, first: null, harness: ref.error }];
  const a = await differential(fake, ref.mod, steps(seed), seed), b = await differential(fake, ref.mod, steps(seed), seed);
  const out = [{ clause: 'agree', n: a.n, first: a.first, absent: a.absent, against: `${pkg} ${ref.version}, its vendored files loaded by Node` }, { clause: 'determinism', n: a.n, first: BREAK || (same(a.transcript, b.transcript) && a.trace === b.trace) ? null : 'two fakes from one seed answered differently or wrote different traces' }];
  if (effectful) out.push(...await effectful(fake, seed, ref.mod));
  return out;
};
// uuid's random identifiers: v4's shape, seeded, recorded (randomness is a read of the world); the shape checked on the real package first
async function uuidDraws(fake, seed, real) {
  const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const draw = (s) => { const { env, subject } = fresh(fake, s); const u = []; let rec = true; for (let i = 0; i < 20; i++) { const m = traceMark(env); u.push(subject.v4()); rec &&= traceMark(env) !== m; } return { u, rec }; };
  const x = draw(seed), y = draw(seed), z = draw(seed + 1);
  return [{ clause: 'v4 shape', n: x.u.length, harness: Array.from({ length: 20 }, () => real.v4()).every((v) => V4.test(v)) ? null : 'the real v4 fails the shape', first: BREAK ? null : x.u.find((v) => !V4.test(v)) ? `not a v4 uuid: ${show(x.u.find((v) => !V4.test(v)))}` : new Set(x.u).size !== x.u.length ? 'a uuid drawn twice in twenty' : null },
    { clause: 'seeded draws', n: 3, first: BREAK ? null : JSON.stringify(x.u) !== JSON.stringify(y.u) ? 'two fakes from one seed drew differently' : JSON.stringify(x.u) === JSON.stringify(z.u) ? 'two seeds drew the same' : null },
    { clause: 'recorded', n: x.u.length, first: x.rec ? null : 'a v4 draw added nothing to the trace' }];
}

// a hook's declared vectors (exec/fakes/lib/protocol.mjs VECTOR_CLAUSES, vectors/<pkg>.json): the outputs the published
// package gave on the clause's inputs, recorded with its version and time zone; the fake, reached through the hook, must
// give them. Checked first: the vectors name the version the vendored copy is (a recording of another version is the
// harness's defect), and the run is under the recorded zone. A clause that needs the lane's own glue (no `run`) is listed
// as not run.
async function declaredVectors(fake, seed) {
  const lib = fake.spec, pf = path.join(fake.hookDir ?? '', 'protocol.mjs'), vf = path.join(fake.hookDir ?? '', 'vectors', `${lib}.json`);
  if (!fake.ask || !fs.existsSync(pf) || !fs.existsSync(vf)) return [];
  const P = await guardedImport(pf); if (P.__error || !P.VECTOR_CLAUSES?.[lib] || typeof P.inputsOf !== 'function') return [];
  const vec = JSON.parse(fs.readFileSync(vf, 'utf8')), mf = path.join(fake.hookDir, 'vendor', lib, 'manifest.json');
  const vendored = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')).version : null;
  const harness = vendored && vendored !== vec.version ? `vectors/${lib}.json records ${lib}@${vec.version}, the vendored copy is ${vendored}` : null;
  const plain = P.plain ?? ((v) => canon(v)), out = [], skipped = [];
  const tz = process.env.TZ; if (vec.tz) process.env.TZ = vec.tz;
  try {
    const { env } = fresh(fake, seed), mod = (sp) => fake.ask(env, sp);
    for (const c of P.VECTOR_CLAUSES[lib]) {
      const want = vec.outputs?.[c.clause];
      if (typeof c.run !== 'function' || !Array.isArray(want)) { skipped.push(c.clause); continue; }
      let first = null, n = 0;
      for (const [i, args] of P.inputsOf(lib, c).entries()) {
        let have; try { have = { value: plain(c.run(mod, args)) }; } catch (e) { have = { threw: plain(e) }; }
        n++; if (!first && !same(have, want[i])) first = `case ${i} ${show(args.map((a) => canon(a)))}: fake ${show(have)}, ${lib}@${vec.version} ${show(want[i])}`;
      }
      out.push({ clause: `vectors: ${c.clause}`, n, first, harness, against: `${lib}@${vec.version} as recorded (${path.relative(path.join(here, '..'), vf).replace(/^.*exec\//, 'exec/')})` });
    }
  } finally { if (tz === undefined) delete process.env.TZ; else process.env.TZ = tz; }
  if (skipped.length) out.push({ clause: 'vectors not run', n: 0, first: null, absent: skipped.map((c) => `${c} (needs the lane's own glue)`) });
  return out;
}
const libraryFamily = (own) => async (fake, seed) => {
  const rows = [...(own ? await own(fake, seed) : []), ...await declaredVectors(fake, seed)];
  return rows.some((r) => r.n > 0 || r.harness) ? rows : [...rows, { clause: 'no runnable clause', n: 0, first: `no clause of the protocol runs on ${fake.spec} through the hook alone: neither a family here nor a vector clause with a run` }];
};

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
// The world a fake's tree holds where the run has not been: a fake may start empty, from its recording, or draw what an
// untouched path holds (absent, a file, a folder) by the seed and the path, deciding the folders on the way. The real fs
// is brought to hold the same world before the script first touches a path: the fake is asked what the path holds by
// the question the step itself would ask first (its stat), the folders on the way after it (decided by then, so asking
// draws nothing new), and the real folder is given the same folders and the same file bytes. Only a path the run has
// not touched is copied this way; what the run made, moved or removed is compared, never copied.
async function fsWorld(side, R, realOn, promisesOnly) {
  const touched = new Set();
  const stat = (p) => (promisesOnly ? { at: 'stat', args: [p], await: true } : { at: 'statSync', args: [p] });
  const read = (p) => (promisesOnly ? { at: 'readFile', args: [p], await: true } : { at: 'readFileSync', args: [p] });
  const holds = async (p) => { const o = await outcome(side.subject, stat(p)); return o.ok?.stat ?? null; };
  return async (s) => {
    for (const p of s.args.filter((a) => typeof a === 'string' && a.startsWith(R + '/'))) {
      if (touched.has(p)) continue; touched.add(p);
      // the fake is asked the same questions whether or not the real side is copied to (the determinism run), so its trace is one
      const st = await holds(p); if (!st) continue;
      const ups = []; for (let q = path.dirname(p); q.startsWith(R + '/'); q = path.dirname(q)) ups.unshift(q);
      for (const q of ups) { const was = touched.has(q); touched.add(q); const up = was ? null : await holds(q); if (realOn && up?.isDirectory && !fs.existsSync(q)) fs.mkdirSync(q); }
      let bytes = null; if (!st.isDirectory) { try { const { self, fn } = member(side.subject, read(p).at); bytes = RealBuffer.from(await Reflect.apply(fn, self, [p])); } catch { /* unreadable: nothing to copy */ } }
      if (!realOn || fs.existsSync(p) || !fs.existsSync(path.dirname(p))) continue;
      if (st.isDirectory) fs.mkdirSync(p); else if (bytes) fs.writeFileSync(p, bytes);
    }
  };
}
async function fsFamily(fake, seed, { promisesOnly }) {
  const prefix = promisesOnly ? { sync: '-', async: '' } : { sync: '', async: 'promises.' };
  const realFs = promisesOnly ? fs.promises : realFsSubject;
  const statOf = (p) => (promisesOnly ? { at: 'stat', args: [p], await: true } : { at: 'statSync', args: [p] });
  const provided = (side, s) => !fake.provides || fake.provides(side.env, s.at);
  const results = { agree: { n: 0, first: null, absent: new Set(), unrecorded: null } }, clauses = {}, det = [];
  for (let k = 0; k < CASES; k++) {
    const rng = draws(seed, 150 + k);
    // the folder: a fresh temporary one the fake's world does not hold as a file (its world may draw what /tmp/x holds)
    let R = null;
    for (let t = 0; t < 10 && !R; t++) { const r = fs.mkdtempSync(path.join(os.tmpdir(), 'w2e-fs-')); const probe = fresh(fake, seed + k); if ((await outcome(probe.subject, statOf(r))).ok?.stat?.isFile) fs.rmSync(r, { recursive: true, force: true }); else R = r; }
    if (!R) { results.agree.first ??= `case ${k}: ten temporary folders were each a file in the fake's world`; continue; }
    try {
      const run = async () => {
        fs.rmSync(R, { recursive: true, force: true }); fs.mkdirSync(R); if (!fake.noRecording) fs.writeFileSync(`${R}/seed.txt`, 'seeded'); // a fake reached through a hook takes no recording: neither side holds the seeded file
        const { env, subject } = fresh(fake, seed + k, fake.noRecording ? {} : { fs: { [`${R}/seed.txt`]: 'seeded' } });
        // the folder exists on both sides: made on the fake's side unless its world holds it already; not compared
        if (!(await outcome(subject, statOf(R))).ok?.stat?.isDirectory) { const { self, fn: setup } = member(subject, promisesOnly ? 'mkdir' : 'mkdirSync'); try { await Reflect.apply(setup, self, [R, { recursive: true }]); } catch (e) { return { setupError: `mkdir ${R} threw ${show(thrown(e))}` }; } }
        return { env, subject };
      };
      const r2 = draws(seed, 100 + k), steps = fsSteps(r2, R, prefix);
      const play = async (side, realOn) => {
        const world = await fsWorld(side, R, realOn, promisesOnly), transcript = [];
        for (const s of steps) {
          if (!provided(side, s)) { results.agree.absent.add(s.at); continue; }
          await world(s);
          const before = traceMark(side.env);
          const f = await outcome(side.subject, s); if (f.absent) { results.agree.absent.add(f.absent); continue; }
          transcript.push(f);
          if (!realOn) continue;
          if (traceMark(side.env) === before) results.agree.unrecorded ??= label(s);
          const r = await outcome(realFs, s); results.agree.n++;
          if (!results.agree.first && !same(f, r)) results.agree.first = `case ${k}, step ${transcript.length}: ${label(s).replaceAll(R, '<R>')}: fake ${show(f).replaceAll(R, '<R>')}, real ${show(r).replaceAll(R, '<R>')}`;
        }
        return transcript;
      };
      let side = await run(); if (side.setupError) { results.agree.first ??= side.setupError; continue; }
      const transcript = await play(side, true), trace1 = JSON.stringify(side.env.trace);
      side = await run(); const again = await play(side, false);
      det.push(same(transcript, again) && (BREAK || JSON.stringify(side.env.trace) === trace1));
      // the named clauses on names the fake's world holds as absent (a clause states what a write to a new path does)
      for (const cl of fsClauses(rng, R, promisesOnly).filter((c) => !(fake.noRecording && c.clause === 'seeded-read'))) {
        const c = (clauses[cl.clause] ??= { n: 0, first: null, real: null });
        side = await run(); if (side.setupError) { c.first ??= side.setupError; continue; }
        const names = [...new Set(cl.steps.flatMap((s) => s.args.filter((a) => typeof a === 'string' && a.startsWith(R + '/'))))].filter((p) => !p.endsWith('/seed.txt'));
        let fresh0 = true; for (const p of names) if ((await outcome(side.subject, statOf(p))).ok || fs.existsSync(p)) fresh0 = false;
        if (!fresh0) { c.held = (c.held ?? 0) + 1; continue; } // the world holds something there: not this clause's case
        const realSide = []; for (const s of cl.steps) realSide.push(await outcome(realFs, s));
        if (!cl.holds(realSide)) { c.real ??= `the real fs fails it: ${show(realSide).replaceAll(R, '<R>')}`; continue; }
        const fakeSide = []; let absent = null;
        for (const s of cl.steps) { const f = provided(side, s) ? await outcome(side.subject, s) : { absent: s.at }; if (f.absent) absent = f.absent; fakeSide.push(f); }
        if (absent) { c.absent = absent; continue; }
        c.n++;
        if (!BREAK && !cl.holds(fakeSide)) c.first ??= `case ${k}: ${cl.steps.map(label).join(' ; ').replaceAll(R, '<R>')}: fake ${show(fakeSide).replaceAll(R, '<R>')}, wants ${cl.wants.replaceAll(R, '<R>')}`;
      }
    } finally { fs.rmSync(R, { recursive: true, force: true }); }
  }
  const out = [{ clause: 'agree', n: results.agree.n, first: results.agree.first, absent: [...results.agree.absent], against: 'the real fs in a temporary folder holding the fake\'s world where the script first reaches' }];
  for (const [clause, c] of Object.entries(clauses)) out.push({ clause, n: c.n, first: c.first, harness: c.real, absent: c.absent ? [c.absent] : [], against: c.held ? `${c.held} case(s) where the world already held the name, not counted` : undefined });
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
// play a script through a timer API; returns the fire log once `drain` has run every timer, and the measurement's skew:
// the largest delay between the instant a timer was meant to be armed (the start for the first turn, its parent's due
// instant for a nested one, its previous due instant for an interval's next period) and the instant it was. The real
// loop takes the time afresh at every arm, so two timers whose due instants are g ms apart can swap only when the skew
// reaches g: a real measurement with skew below the smallest gap fixes the order, one above it is measured again
async function playTimers(api, items, K, drain) { // K null: the delays as written (the coercion scripts)
  const log = [], ids = new Map(), ms = (d) => (K === null ? Math.max(1, Number(d) || 0) : d * K), t0 = performance.now(); let skew = 0;
  const at = (planned) => { skew = Math.max(skew, performance.now() - t0 - planned); };
  for (const it of items) {
    let n = 0, due = ms(it.d);
    at(0);
    const cb = () => {
      n++; log.push(it.kind === 'interval' ? `${it.label}#${n}` : it.label); at(due);
      if (it.clearOther != null && items[it.clearOther] && items[it.clearOther] !== it) { const o = items[it.clearOther]; (o.kind === 'interval' ? api.clearInterval : api.clearTimeout)(ids.get(o.label)); }
      if (it.nested) api.setTimeout(() => log.push(`${it.label}n`), K === null ? it.nested.d : it.nested.d * K);
      if (it.kind === 'interval' && n >= it.count) api.clearInterval(ids.get(it.label));
      due += ms(it.d);
    };
    ids.set(it.label, it.kind === 'interval' ? api.setInterval(cb, K === null ? it.d : it.d * K) : api.setTimeout(cb, K === null ? it.d : it.d * K));
    if (it.clear) (it.kind === 'interval' ? api.clearInterval : api.clearTimeout)(ids.get(it.label));
  }
  await drain(items);
  return { log, skew };
}
// the real loop's order of a script: measured until the skew stays below the smallest gap between due instants (at most
// five tries; the loop's clock counts whole milliseconds, so the skew must stay below the gap less one); null when no try was clean (the machine's load), and the case is counted unmeasured, never as agreement
async function realOrder(items, K, drain, gap) {
  for (let i = 0; i < 5; i++) { const r = await playTimers(realApi, items, K, drain); if (r.skew < gap - 1) return r.log; } // the loop's clock counts whole milliseconds: a skew of a fraction can still cross one
  return null;
}
const horizon = (items) => items.reduce((m, it) => Math.max(m, it.d * it.count + (it.nested?.d ?? 0)), 0) + 2;
const realDrain = (K) => (items) => new Promise((r) => setTimeout(r, horizon(items) * K + 20));
const realApi = { setTimeout, setInterval, clearTimeout, clearInterval };
async function fakeTimers(fake, seed, items, K, H0 = null) {
  const { env, subject } = fresh(fake, seed);
  const api = { setTimeout: subject.setTimeout, setInterval: subject.setInterval, clearTimeout: subject.clearTimeout, clearInterval: subject.clearInterval };
  if (Object.values(api).some((f) => typeof f !== 'function')) return { absent: Object.entries(api).filter(([, f]) => typeof f !== 'function').map(([k]) => k) };
  const marks = []; const wrap = Object.fromEntries(Object.entries(api).map(([k, f]) => [k, (...a) => { const b = traceMark(env); const r = f(...a); marks.push(traceMark(env) !== b); return r; }]));
  const drain = async (its) => { const H = H0 ?? horizon(its) * K; if (typeof subject.tick === 'function' && !subject.tick.__isFake && (!fake.provides || fake.provides(env, 'tick'))) { for (let u = 1; u <= H; u++) await subject.tick(1); return; } for (let u = 1; u <= H; u++) await fake.runTimers(env, 1000, 200, { until: u }); };
  try { const { log } = await playTimers(wrap, items, K, drain); return { log, recorded: marks.every(Boolean), trace: JSON.stringify(env.trace) }; } catch (e) { return { error: show(thrown(e)) }; }
}
async function timersFamily(fake, seed) {
  const K = 10, out = { order: { n: 0, first: null, unmeasured: 0 }, coercion: { n: 0, first: null, unmeasured: 0 }, det: [], recorded: null, absent: null };
  for (let k = 0; k < CASES; k++) {
    const items = timerScript(draws(seed, 200 + k));
    const f = await fakeTimers(fake, seed, items, K); if (f.absent) { out.absent = f.absent; break; }
    out.order.n++;
    if (f.error) { out.order.first ??= `case ${k}: the fake threw ${f.error}`; continue; }
    if (!f.recorded) out.recorded ??= `case ${k}: a timer call added nothing to the trace or the pending list`;
    const g = await fakeTimers(fake, seed, items, K); out.det.push(BREAK || (JSON.stringify(g.log) === JSON.stringify(f.log) && g.trace === f.trace));
    const real = await realOrder(items, K, realDrain(K), K);
    if (real === null) { out.order.unmeasured++; continue; }
    if (!same(f.log, real)) out.order.first ??= `case ${k}: ${show(items.map((it) => `${it.kind} ${it.label} ${it.d}K${it.kind === 'interval' ? ` x${it.count}` : ''}${it.nested ? ` nests ${it.nested.d}K` : ''}${it.clear ? ' cleared' : ''}${it.clearOther != null ? ` clears t${it.clearOther}` : ''}`))}: fake fired ${show(f.log)}, real ${show(real)}`;
  }
  // delay coercion: one turn of timeouts with delays Node coerces to 1 ms (0, below 1, not a number, undefined) beside
  // 1 ms ones and ones 20 and 30 ms long (a numeric string is its number): every coerced delay joins the one 1 ms list,
  // fired first in, first out whatever the timing; the lists 1, 20 and 30 ms long are 10 ms or more apart
  if (!out.absent) for (const delays of [[1, 0], [0, 1], [20, 0, 1], [-5, 1, NaN], ['20', 1, 30], [1, '0', 20, undefined], [30, '20', -1]]) {
    const items = delays.map((d, i) => ({ label: `c${i}`, kind: 'timeout', d, count: 1, nested: null, clear: false, clearOther: null }));
    const f = await fakeTimers(fake, seed, items, null, 40); out.coercion.n++;
    const real = await realOrder(items, null, () => new Promise((r) => setTimeout(r, 60)), 10);
    if (real === null) { out.coercion.unmeasured++; continue; }
    if (f.error || !same(f.log, real)) out.coercion.first ??= `delays ${show(delays.map((d) => canon(d)))}: fake fired ${f.error ?? show(f.log)}, real ${show(real)}`;
  }
  return [
    { clause: 'virtual order', n: out.order.n - out.order.unmeasured, first: out.order.first, absent: out.absent ?? [], against: `the real event loop, delays K = 10 ms apart${out.order.unmeasured ? `; ${out.order.unmeasured} case(s) unmeasured (no try with skew below K less 1 ms)` : ''}` },
    { clause: 'delay coercion', n: out.coercion.n - out.coercion.unmeasured, first: out.coercion.first, against: `the real event loop${out.coercion.unmeasured ? `; ${out.coercion.unmeasured} script(s) unmeasured (no try with skew below 9 ms)` : ''}` },
    { clause: 'determinism', n: out.det.length, first: out.det.every(Boolean) ? null : 'two fakes from one seed fired differently or wrote different traces' },
    { clause: 'recorded', n: out.order.n, first: out.recorded },
  ];
}

// fetch: no network, so the reference is the protocol, each clause checked on the real platform's classes first:
// - `request`: what the fake is asked is what a real Request reads off the same arguments (the trace names its method and
//   URL; an argument pair a real Request refuses rejects with the same error name);
// - `a real Response`: the answer behaves as a real Response built from its own status, status text, headers and body;
// - `json is the parse of text`: json() resolves to JSON.parse of the text() of a clone, or rejects alike;
// - `repeat`: one (method, url, body) answers the same status, headers and body every time (the table is a function of
//   its key; a call on the world's fault draw rejects and is counted apart);
// - `seeded` and `outside the table`, for a fake that takes a recording (recording.fetch): a seeded key answers its entry,
//   as a real Response built from the entry does; another key answers none of the seeded bodies.
const isNullBody = (status) => [101, 103, 204, 205, 304].includes(status);
const readResponse = async (res) => {
  const c = res.clone(), text = await c.text();
  let json; try { json = { ok: canon(await res.json()) }; } catch (e) { json = { throw: e?.name }; }
  return { status: res.status, ok: res.ok, statusText: res.statusText, headers: [...res.headers], text, json };
};
const parsed = (text) => { try { return { ok: canon(JSON.parse(text)) }; } catch (e) { return { throw: e.name }; } };
async function fetchFamily(fake, seed) {
  const rng = draws(seed, 6), table = [];
  for (let i = 0; i < CASES * 2; i++) {
    const json = rng() < 0.5, status = pick(rng, [200, 201, 202, 400, 404, 418, 500]);
    const method = pick(rng, ['GET', 'POST', 'PUT', 'DELETE', 'get']); // a GET carries no body: the standard refuses one
    table.push({ method, url: `https://api.example.com/${pick(rng, ['users', 'items', 'a/b'])}/${i}${pick(rng, ['', '?q=1'])}`, body: /^get$/i.test(method) ? undefined : pick(rng, [undefined, '{"a":1}', 'x']), status, headers: { 'content-type': json ? 'application/json' : 'text/plain', 'x-seed': String(i) }, response: json ? JSON.stringify({ seed: i, v: pick(rng, [1, 'a', null, [1]]) }) : `seed body ${i}` });
  }
  const BAD = [['https://a.example/x', { method: 'GET', body: 'x' }], ['https://a.example/x', { method: 'HEAD', body: 'x' }], ['https://a.example/x', { method: 'CONNECT' }], ['https://a.example/x', { headers: { 'bad name': 'v' } }], ['http://[bad', {}], ['https://a.example/x', { method: 'b@d' }]];
  const realRefusal = (args) => { try { new Request(...args); return null; } catch (e) { return e.name; } };
  const out = { request: { n: 0, first: null, harness: null }, response: { n: 0, first: null }, json: { n: 0, first: null }, repeat: { n: 0, first: null, faults: 0 }, seeded: { n: 0, first: null }, miss: { n: 0, first: null }, recorded: null };
  const play = async () => {
    const { env, subject } = fresh(fake, seed, { fetch: table }); const f = subject.fetch;
    if (typeof f !== 'function') return { absent: ['fetch'] };
    const got = [];
    const call = async (url, init) => {
      const b = traceMark(env), from = env.trace.length; let r;
      try { r = await readResponse(await f(url, init)); } catch (x) { r = { throw: x?.name, message: x?.message }; }
      const shown = JSON.stringify(env.trace.slice(from)); // every record the call added (a fault draw adds one after the request's)
      return { r, recorded: traceMark(env) !== b, names: shown.includes(new URL(url).host) && shown.toUpperCase().includes(String(init.method ?? 'GET').toUpperCase()) };
    };
    for (const e of table) {
      const init = { method: e.method, ...(e.body === undefined ? {} : { body: e.body }) };
      got.push({ e, init, first: await call(e.url, init), again: await call(e.url, init), other: await call(e.url, { method: 'PATCH', body: e.body === 'other' ? 'other2' : 'other' }) });
    }
    const bad = []; for (const [u, init] of BAD) { const b = traceMark(env); let name = null; try { await f(u, init); } catch (x) { name = x?.name ?? String(x); } bad.push({ u, init, name, recorded: traceMark(env) !== b }); }
    return { got, bad, trace: JSON.stringify(env.trace) };
  };
  const a = await play(); if (a.absent) return [{ clause: 'request', n: 0, first: null, absent: a.absent }];
  const takesRecording = !fake.noRecording; // a fake module's create(env, recording); a hook is asked with the environment only
  const fault = (x) => x.r.throw === 'TypeError' && /fetch failed/.test(x.r.message ?? '');
  for (const g of a.got) {
    for (const x of [g.first, g.again, g.other]) { if (!x.recorded) out.recorded ??= `${g.e.method} ${g.e.url} added nothing to the trace`; else if (!x.names) out.recorded ??= `the trace record of ${g.e.method} ${g.e.url} names neither its host nor its method`; }
    for (const x of [g.first, g.again, g.other]) {
      if (x.r.throw) continue;
      out.response.n++; out.json.n++;
      const real = await readResponse(new Response(isNullBody(x.r.status) ? null : x.r.text, { status: x.r.status, statusText: x.r.statusText, headers: x.r.headers }));
      const { json: _j, ...shape } = x.r, { json: _rj, ...realShape } = real;
      if (!same(canon(shape), canon(realShape))) out.response.first ??= `${g.e.method} ${g.e.url}: fake ${show(shape)}, a real Response from its own parts ${show(realShape)}`;
      const want = parsed(x.r.text);
      if (!same(x.r.json, want)) out.json.first ??= `${g.e.method} ${g.e.url}: text() ${show(x.r.text)}, json() ${show(x.r.json)}, JSON.parse(text) ${show(want)}`;
    }
    if (fault(g.first) || fault(g.again)) out.repeat.faults++;
    else { out.repeat.n++; if (!same(canon(g.first.r), canon(g.again.r))) out.repeat.first ??= `${g.e.method} ${g.e.url} twice: ${show(g.first.r)}, then ${show(g.again.r)}`; }
    if (takesRecording) {
      if (!fault(g.first)) { out.seeded.n++; const want = await readResponse(new Response(g.e.response, { status: g.e.status, headers: g.e.headers })); const { headers: _h, ...w } = want, { headers: _g, ...gg } = g.first.r; const hdr = (h) => Object.fromEntries(h.filter(([k]) => k in g.e.headers)); if (!same(canon({ ...gg, h: hdr(g.first.r.headers ?? []) }), canon({ ...w, h: hdr(want.headers) }))) out.seeded.first ??= `${g.e.method} ${g.e.url} body ${show(g.e.body)}: fake ${show(g.first.r)}, a real Response from the entry ${show(want)}`; }
      if (!g.other.r.throw) { out.miss.n++; if (!BREAK && table.some((e) => e.response === g.other.r.text)) out.miss.first ??= `PATCH ${g.e.url} with another body answered a seeded entry's body ${show(g.other.r.text)}`; }
    }
  }
  for (const b of a.bad) {
    const want = realRefusal([b.u, b.init]); if (want === null) { out.request.harness ??= `a real Request accepts ${show([b.u, b.init])}`; continue; }
    out.request.n++; if (!same(b.name, want)) out.request.first ??= `fetch(${show(b.u)}, ${show(b.init)}): fake ${b.name === null ? 'resolved' : `rejected ${b.name}`}, a real Request throws ${want}`;
  }
  const b = await play(); const det = BREAK || (JSON.stringify(b.got.map((g) => [g.first.r, g.again.r, g.other.r])) === JSON.stringify(a.got.map((g) => [g.first.r, g.again.r, g.other.r])) && b.trace === a.trace);
  const rows = [
    { clause: 'request', n: out.request.n, first: out.request.first, harness: out.request.harness, against: 'a real Request on the same arguments' },
    { clause: 'a real Response', n: out.response.n, first: out.response.first, against: 'a real Response from the answer\'s own parts' },
    { clause: 'json is the parse of text', n: out.json.n, first: out.json.first },
    { clause: 'repeat', n: out.repeat.n, first: out.repeat.first, against: `${out.repeat.faults} key(s) on the world's fault draw counted apart` },
  ];
  if (takesRecording) rows.push({ clause: 'seeded', n: out.seeded.n, first: out.seeded.first, against: 'a real Response built from the seeded entry' }, { clause: 'outside the table', n: out.miss.n, first: out.miss.first });
  else rows.push({ clause: 'seeded', n: 0, first: null, absent: ['a recording parameter (the fake is reached through a hook, asked with the environment only)'] });
  rows.push({ clause: 'determinism', n: 1, first: det ? null : 'two fakes from one seed answered differently or wrote different traces' }, { clause: 'recorded', n: a.got.length * 3, first: out.recorded });
  return rows;
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

// localStorage and sessionStorage: the same op script against Node's own Web Storage, run in a child with the flag. The
// order key(i) walks is the user agent's (HTML, Web Storage: "the order of keys is user-agent defined"), so the script
// reads the keys as a set (`keys`: key(0) .. key(length - 1), sorted) and key(i) only out of range, where it is null
const STORAGE_OPS = (rng) => Array.from({ length: 30 }, () => pick(rng, [['setItem', pick(rng, ['a', 'b', '', 'ü'])], ['getItem', pick(rng, ['a', 'b', 'zz', ''])], ['removeItem', pick(rng, ['a', 'b'])], ['key', pick(rng, [-1, 99])], ['keys'], ['length'], ['clear'], ['setItem', 'n', pick(rng, [1, null, { o: 1 }, [1, 2], undefined])]]));
const playStorage = (s, ops) => ops.map(([op, a, b]) => { try { return op === 'length' ? s.length : op === 'keys' ? Array.from({ length: s.length }, (_, i) => s.key(i)).sort() : op === 'setItem' ? s.setItem(a, b === undefined && a !== 'n' ? `v${a}` : b) ?? null : s[op](a) ?? null; } catch (e) { return { throw: e.name }; } });
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
    if (subject.env) {
      // env is a record of strings, as the real process.env is: the same writes, reads, deletes and `in` on fresh names, on both
      const keys = Array.from({ length: 4 }, (_, i) => `W2E_${seed}_${i}`), vals = ['a', 1, true, undefined, '', 'x y'];
      const rng = draws(seed, 10), script = Array.from({ length: 24 }, () => [pick(rng, ['set', 'get', 'delete', 'in']), pick(rng, keys), pick(rng, vals)]);
      const play = (e) => { const seen = new Set(), o = []; for (const [op, k, v] of script) { if (op === 'set') { seen.add(k); try { e[k] = v; o.push(e[k]); } catch (x) { o.push({ throw: x.name }); } } else if (!seen.has(k)) o.push('unasked'); else if (op === 'get') o.push(e[k]); else if (op === 'delete') { delete e[k]; o.push(e[k]); } else o.push(k in e); } return o.map((v) => canon(v)); }; // a name is read only once the script wrote it: what the world held before is the fake's to draw
      const real = (() => { try { return play(process.env); } finally { for (const k of keys) delete process.env[k]; } })();
      const got = play(subject.env); const i = got.findIndex((v, j) => JSON.stringify(v) !== JSON.stringify(real[j]));
      out.push({ clause: 'env is a record of strings', n: script.length, first: BREAK || i < 0 ? null : `${show(script[i])} after ${show(script.slice(Math.max(0, i - 3), i))}: fake ${show(got[i])}, the real process.env ${show(real[i])}`, against: 'the real process.env, on fresh names' });
    }
    if (subject.env && !fake.noRecording) out.push({ clause: 'env from the recording', n: 3, first: BREAK ? null : subject.env.W2E_A === 'a' && subject.env.W2E_EMPTY === '' && subject.env.W2E_ABSENT === undefined ? null : `env answered ${show([subject.env.W2E_A, subject.env.W2E_EMPTY, subject.env.W2E_ABSENT].map((v) => canon(v)))}, the recording ${show(env0)}` });
    if (typeof subject.cwd === 'function') { const a = subject.cwd(), b = subject.cwd(); out.push({ clause: 'cwd', n: 2, first: BREAK ? null : typeof a === 'string' && path.isAbsolute(a) && a === b ? null : `cwd answered ${show(canon(a))} then ${show(canon(b))}` }); }
    if (subject.argv) out.push({ clause: 'argv', n: 1, first: BREAK ? null : Array.isArray(subject.argv) && subject.argv.every((x) => typeof x === 'string') ? null : `argv ${show(canon(subject.argv))}` });
    if (typeof subject.exit === 'function') { let threw = false; const b = traceMark(env); try { subject.exit(3); } catch (e) { threw = !String(e.message).startsWith('w2e:'); } out.push({ clause: 'exit is a fault', n: 1, first: BREAK ? null : exited !== null ? 'the fake ended the real process' : !threw ? 'exit(3) returned' : traceMark(env) === b ? 'exit(3) added nothing to the trace' : null }); }
  } finally { process.exit = realExit; process.reallyExit = realReally; }
  return out;
}

// os: the host's facts are the world's, so no value is compared; what is compared is what Node's API makes of them: each
// member answers the real one's shape (types, keys, element shapes), and the stated facts agree with each other (EOL
// with the platform, endianness one of two)
const shapeOf = (v, d = 0) => (v === null ? 'null' : Array.isArray(v) ? (v.length && d < 4 ? [shapeOf(v[0], d + 1)] : []) : typeof v === 'object' && !v.__isFake ? (d < 4 ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, shapeOf(v[k], d + 1)])) : 'object') : v?.__isFake ? 'a recording handle' : typeof v);
// two shapes agree where both say something: a list's length (how many cpus, how many addresses) is the host's fact, so an
// empty list agrees with any list; otherwise the types, the keys and the element shapes must be the same
const shapeAgrees = (f, r) => (BREAK ? true : Array.isArray(f) && Array.isArray(r) ? !f.length || !r.length || shapeAgrees(f[0], r[0]) : f && r && typeof f === 'object' && typeof r === 'object' ? JSON.stringify(Object.keys(f)) === JSON.stringify(Object.keys(r)) && Object.keys(f).every((k) => shapeAgrees(f[k], r[k])) : JSON.stringify(f) === JSON.stringify(r));
async function osFamily(fake, seed) {
  const MEMBERS = ['platform', 'type', 'arch', 'release', 'hostname', 'homedir', 'tmpdir', 'endianness', 'totalmem', 'freemem', 'uptime', 'loadavg', 'cpus', 'userInfo', 'networkInterfaces', 'availableParallelism', 'machine', 'version'];
  const { env, subject } = fresh(fake, seed); let first = null, n = 0; const absent = [];
  for (const m of MEMBERS) {
    if (typeof os[m] !== 'function') continue;
    if (fake.provides && !fake.provides(env, m)) { absent.push(m); continue; }
    let f, r; try { f = shapeOf(subject[m]()); } catch (e) { f = { throw: e.name }; } try { r = shapeOf(os[m]()); } catch (e) { r = { throw: e.name }; }
    // networkInterfaces: its keys are the host's interface names, so its shape is that of one interface's addresses
    if (m === 'networkInterfaces') { f = Object.values(f ?? {})[0] ?? []; r = Object.values(r ?? {})[0] ?? []; }
    n++; if (!first && !shapeAgrees(f, r)) first = `os.${m}(): fake shape ${show(f)}, real ${show(r)}`;
  }
  const eol = !fake.provides || fake.provides(env, 'EOL') ? subject.EOL : undefined, plat = !fake.provides || fake.provides(env, 'platform') ? subject.platform?.() : undefined, end = !fake.provides || fake.provides(env, 'endianness') ? subject.endianness?.() : undefined;
  const facts = [eol === undefined || plat === undefined || eol === (plat === 'win32' ? '\r\n' : '\n'), end === undefined || end === 'LE' || end === 'BE'];
  const again = fresh(fake, seed); const det = BREAK || MEMBERS.filter((m) => typeof os[m] === 'function' && (!fake.provides || fake.provides(again.env, m))).every((m) => { try { return JSON.stringify(canon(again.subject[m]())) === JSON.stringify(canon(fresh(fake, seed).subject[m]())); } catch { return true; } });
  return [{ clause: 'shape', n, first, absent, against: 'the real os, member by member' }, { clause: 'stated facts agree', n: facts.length, first: BREAK || facts.every(Boolean) ? null : `EOL ${show(eol)} on platform ${show(plat)}, endianness ${show(end)}` }, { clause: 'determinism', n: 1, first: det ? null : 'two fakes from one seed state different facts' }];
}
// timers/promises: what the awaited timers resolve to, and in which order, against the real timers/promises on the real
// loop (delays 10 ms apart or equal; a real run whose arming took 9 ms or more is measured again)
async function timersPromisesFamily(fake, seed) {
  const rng = draws(seed, 11); let first = null, n = 0, unmeasured = 0;
  for (let k = 0; k < CASES; k++) {
    const delays = Array.from({ length: 2 + Math.floor(rng() * 4) }, () => 10 * (1 + Math.floor(rng() * 4)));
    const playOn = async (api, drive) => { const log = [], t0 = performance.now(); const ps = delays.map((d, i) => Reflect.apply(api.setTimeout, api, [d, `p${i}`]).then((v) => log.push(v))); const skew = performance.now() - t0; await drive(Promise.all(ps)); return { log, skew }; };
    const { env, subject } = fresh(fake, seed);
    if (fake.provides && !fake.provides(env, 'setTimeout')) return [{ clause: 'resolution order', n: 0, first: null, absent: ['setTimeout'] }];
    const f = await playOn(subject, async (all) => { const until = Math.max(...delays) + 1; for (let u = 1; u <= until; u++) await fake.runTimers(env, 1000, 200, { until: u }); await Promise.race([all, new Promise((r) => setTimeout(r, 2000))]); });
    let real = null; for (let t = 0; t < 5 && !real; t++) { const r = await playOn(realTimersPromises, (all) => all); if (r.skew < 9) real = r; }
    if (!real) { unmeasured++; continue; }
    n++; if (!first && !same(f.log, real.log)) first = `delays ${show(delays)}: fake resolved ${show(f.log)}, real ${show(real.log)}`;
  }
  return [{ clause: 'resolution order', n, first, against: `the real timers/promises on the real loop${unmeasured ? `; ${unmeasured} case(s) unmeasured` : ''}` }];
}

// the families, by specifier
const pureFamily = (real, steps) => async (fake, seed) => { const a = await differential(fake, real, steps(seed), seed); const b = await differential(fake, real, steps(seed), seed); return [{ clause: 'agree', n: a.n, first: a.first, absent: a.absent, against: 'the real module, in this process' }, { clause: 'determinism', n: a.n, first: BREAK || (same(a.transcript, b.transcript) && a.trace === b.trace) ? null : 'two fakes from one seed answered differently or wrote different traces' }]; }; // a pure function asks nothing of the world: its value flows into the unit's outcome, compared there, so no trace is owed
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
  { name: 'Request/Response', specifiers: ['global:Request', 'global:Response'], run: pureFamily({ Request, Response }, (s) => fetchClassSteps(s, new Set(['Request', 'Response']))) },
  { name: 'FormData', specifiers: ['global:FormData'], run: pureFamily({ FormData }, (s) => fetchClassSteps(s, new Set(['FormData']))) },
  { name: 'Blob', specifiers: ['global:Blob'], run: pureFamily({ Blob }, (s) => fetchClassSteps(s, new Set(['Blob']))) },
  { name: 'DOMException', specifiers: ['global:DOMException'], run: pureFamily({ DOMException }, (s) => fetchClassSteps(s, new Set(['DOMException']))) },
  { name: 'AbortSignal', specifiers: ['global:AbortSignal'], run: abortSignalFamily },
  { name: 'lodash', specifiers: ['lodash'], run: libraryFamily(vendoredFamily('lodash', lodashSteps)) },
  { name: 'uuid', specifiers: ['uuid'], run: libraryFamily(vendoredFamily('uuid', uuidSteps, uuidDraws)) },
  { name: 'library vectors', specifiers: ['zod', 'dayjs', 'luxon', 'date-fns', 'axios', 'express', 'vscode'], run: libraryFamily(null) },
  { name: 'fs', specifiers: ['node:fs', 'fs'], run: (fake, seed) => fsFamily(fake, seed, { promisesOnly: false }) },
  { name: 'fs/promises', specifiers: ['node:fs/promises', 'fs/promises'], run: (fake, seed) => fsFamily(fake, seed, { promisesOnly: true }) },
  { name: 'timers', specifiers: ['node:timers', 'timers', 'global:setTimeout'], run: timersFamily, once: true },
  { name: 'fetch', specifiers: ['global:fetch'], run: fetchFamily },
  { name: 'os', specifiers: ['node:os', 'os'], run: osFamily },
  { name: 'timers/promises', specifiers: ['node:timers/promises', 'timers/promises'], run: timersPromisesFamily },
  { name: 'localStorage', specifiers: ['global:localStorage'], run: (fake, seed) => storageFamily(fake, seed, 'localStorage') },
  { name: 'sessionStorage', specifiers: ['global:sessionStorage'], run: (fake, seed) => storageFamily(fake, seed, 'sessionStorage') },
  { name: 'console', specifiers: ['node:console', 'console', 'global:console'], run: consoleFamily },
  { name: 'process', specifiers: ['node:process', 'process', 'global:process'], run: processFamily },
];
export const FAMILY_NAMES = FAMILIES.map((f) => f.name);

// ----- discovery: the providers of fakes, each tested with its own tree's environment (the exec/fake.mjs and exec/run.mjs
// beside the folder, else this tree's) -----
// - a fake module: exports `create(env, recording)` (or a default function); its specifiers by its `specifier` export,
//   else by its file name (fs.mjs -> node:fs, web/fetch.mjs -> global:fetch, lib/x.mjs -> x);
// - a hook: a module exporting `lookup(env, specifier)` (exec/fakes/index.mjs, the hook fake.mjs behaviouralFake reads)
//   or `libraryFake(env, specifier)` (exec/fakes/lib/index.mjs, answered inside lane B's sandbox): every specifier a family
//   covers, every global its `globalsOf(env)` holds and every package its LIBRARY_FAKE_ROWS name is asked of it, and each
//   one it answers is a fake, tested as lane B reaches it. The files under a hook's folder are its parts, never fakes alone.
const WEB = { fetch: ['global:fetch'], url: ['global:URL', 'global:URLSearchParams'], headers: ['global:Headers'], abort: ['global:AbortController'], encoding: ['global:TextEncoder', 'global:TextDecoder'], storage: ['global:localStorage', 'global:sessionStorage'], clone: ['global:structuredClone'] };
export function specifiersOf(file, base, mod) {
  if (mod.specifier) return [mod.specifier].flat();
  if (mod.specifiers) return [mod.specifiers].flat();
  const rel = path.relative(base, file).replace(/\.mjs$/, '').split(path.sep);
  if (rel[0] === 'web' && rel.length === 2) return WEB[rel[1]] ?? [`global:${rel[1]}`];
  if (rel[0] === 'lib' && rel.length >= 2) return [rel.slice(1).join('/')];
  return [`node:${rel.join('/')}`];
}
const listFakes = (dir) => !fs.existsSync(dir) ? [] : fs.readdirSync(dir, { recursive: true }).map((f) => path.join(dir, String(f))).filter((f) => f.endsWith('.mjs') && !f.endsWith('.test.mjs') && !path.basename(f).startsWith('_') && !f.split(path.sep).includes('vendor') && fs.statSync(f).isFile()).sort();
const runtimes = new Map();
async function runtimeOf(dir) { // the environment class, the timer driver and the sandbox of the tree the folder sits in
  const execDir = path.dirname(path.resolve(dir));
  const own = fs.existsSync(path.join(execDir, 'fake.mjs')) && fs.existsSync(path.join(execDir, 'run.mjs')) ? execDir : path.join(here, '../exec');
  if (!runtimes.has(own)) { const F = await import(pathToFileURL(path.join(own, 'fake.mjs')).href), R = await import(pathToFileURL(path.join(own, 'run.mjs')).href); runtimes.set(own, { Env: F.Environment, runTimers: R.runTimers, sandbox: R.sandbox, execDir: own }); }
  return runtimes.get(own);
}
const familyOf = (sp) => FAMILIES.find((f) => f.specifiers.includes(sp)) ?? null;
async function runFamilies(fake, specifiers, seed) {
  const clauses = [], ran = new Set();
  for (const sp of specifiers) {
    const fam = familyOf(sp);
    if (!fam) { clauses.push({ family: '-', clause: 'no protocol', n: 0, first: `no protocol family covers ${sp}: a fake is admitted only with its protocol (add the family to conformance/fakes.mjs)` }); continue; }
    if (ran.has(fam.name)) continue; ran.add(fam.name);
    try { for (const c of await fam.run({ ...fake, spec: sp }, seed)) clauses.push({ family: fam.name, ...c }); } catch (e) { clauses.push({ family: fam.name, clause: 'runs', n: 0, first: `the family threw: ${e.stack?.split('\n').slice(0, 2).join(' ') ?? e}` }); }
  }
  return clauses;
}
// importing a module runs it: a hook folder's parts (a script among them, which may end the process) are never imported,
// only its index; every import runs with the process's exit turned into a throw
async function guardedImport(f) {
  const exit = process.exit; process.exit = (c) => { throw new Error(`the module called process.exit(${c}) on import`); };
  try { return await import(pathToFileURL(f).href); } catch (e) { return { __error: e }; } finally { process.exit = exit; }
}
async function testDir(dir, kind, seed) {
  const out = [], all = listFakes(dir), rt = await runtimeOf(dir), mods = new Map();
  const isHook = (m) => typeof m.lookup === 'function' || typeof m.libraryFake === 'function' || (Array.isArray(m.MODELLED) && typeof m.memberOf === 'function');
  const hooks = [];
  for (const f of all.filter((x) => path.basename(x) === 'index.mjs').sort((a, b) => a.split(path.sep).length - b.split(path.sep).length)) { const m = await guardedImport(f); if (!m.__error && isHook(m)) { hooks.push(f); mods.set(f, m); } }
  const underHook = (f) => hooks.some((h) => h !== f && f.startsWith(path.dirname(h) + path.sep) && !(path.basename(f) === 'index.mjs' && hooks.includes(f)));
  const files = all.filter((f) => hooks.includes(f) || !underHook(f));
  for (const f of files) if (!mods.has(f)) mods.set(f, await guardedImport(f));
  const rel = (f) => path.relative(path.join(rt.execDir, '..'), f);
  for (const f of files) {
    const mod = mods.get(f);
    if (mod.__error) { out.push({ kind, file: rel(f), specifiers: [], clauses: [{ family: '-', clause: 'loads', n: 1, first: `import failed: ${mod.__error.message}` }] }); continue; }
    if (hooks.includes(f) && Array.isArray(mod.MODELLED) && typeof mod.lookup !== 'function') {
      // a module registry (exec/fakes/index.mjs MODELLED, memberOf): what a unit's import receives is env.module(spec), the
      // recording proxy whose members ask the registry; a member it holds no model for is the proxy's, not this fake's
      for (const m of mod.MODELLED) {
        const sp = `node:${m}`;
        const fake = { ...rt, asModule: true, noRecording: true, create: (env) => env.module(sp), provides: (env, at) => typeof env.modelOf !== 'function' || !!env.modelOf(`module:${sp}.${at}`) };
        out.push({ kind, file: `${rel(f)}#${sp}`, specifiers: [sp], clauses: await runFamilies(fake, [sp], seed) });
      }
      continue;
    }
    if (hooks.includes(f)) {
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'w2e-sandbox-')); scratch.push(tmpRoot);
      const isLib = typeof mod.libraryFake === 'function', ask = isLib ? mod.libraryFake : mod.lookup;
      const probe = new rt.Env(seed); if (isLib) rt.sandbox(probe, tmpRoot);
      const candidates = new Set(FAMILIES.flatMap((x) => x.specifiers));
      if (typeof mod.globalsOf === 'function') for (const k of Object.keys(mod.globalsOf(probe))) candidates.add(`global:${k}`);
      for (const r of mod.LIBRARY_FAKE_ROWS ?? []) candidates.add(r.pkg);
      for (const sp of [...candidates].sort()) {
        let v; try { v = ask(probe, sp); } catch (e) { out.push({ kind, file: `${rel(f)}#${sp}`, specifiers: [sp], clauses: [{ family: '-', clause: 'loads', n: 1, first: `the hook threw: ${e.message}` }] }); continue; }
        if (v === null || v === undefined) continue;
        const name = sp.startsWith('global:') ? sp.slice(7) : null;
        const fake = { ...rt, tmpRoot, noRecording: true, hookDir: path.dirname(f), ask, needsCtx: isLib, wrap: name, asModule: !name, create: (env) => ask(env, sp) };
        out.push({ kind, file: `${rel(f)}#${sp}`, specifiers: [sp], clauses: await runFamilies(fake, [sp], seed) });
      }
      continue; // the sandbox folder is removed when the run ends (a later family may still read it)
    }
    const create = typeof mod.create === 'function' ? mod.create : typeof mod.default === 'function' ? mod.default : null;
    if (!create) { out.push({ kind, file: rel(f), skipped: 'no `create` export and no default function: not a fake module' }); continue; }
    const specifiers = specifiersOf(f, dir, mod);
    const fake = { ...rt, create, globalName: specifiers.find((s) => s.startsWith('global:'))?.slice(7) };
    out.push({ kind, file: rel(f), specifiers, expectRefused: mod.expectRefused ?? null, clauses: await runFamilies(fake, specifiers, seed) });
  }
  return out;
}
const failing = (r) => (r.clauses ?? []).filter((c) => c.first);
const harnessDefects = (r) => (r.clauses ?? []).filter((c) => c.harness);

const scratch = []; // the sandbox folders made for the hooks, removed when the run ends
process.on('exit', () => { for (const d of scratch) fs.rmSync(d, { recursive: true, force: true }); });
// ----- the run -----
const groups = [...DIRS.map((d) => ({ kind: 'fake', dir: d })), { kind: 'good', dir: GOOD }, { kind: 'wrong', dir: WRONG }];
const results = [];
for (const g of groups) results.push(...await testDir(g.dir, g.kind, SEED));
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
