// The web fakes' protocols (design/w2c-web-fakes.md): each fake against the property the real thing keeps. Run under
// LEAN_FAKES=recording (the `--break`: the behavioural fakes off) every test that rests on a fake must fail.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Environment, render, behaviouralGlobals } from '../../fake.mjs';
import { STATUSES, ORIGIN } from './fetch.mjs';

const world = (seed, strings = []) => { const env = new Environment(seed); env.shapes = { strings }; return { env, g: behaviouralGlobals(env) }; };
const statusOf = (g, url, init) => g.fetch(url, init).then((r) => r.status, (e) => `fault ${e.constructor.name}`); // the world's fault draw (one call in twelve) fails the same request alike on both sides
const settle = (p) => p.then((v) => ({ v }), (e) => ({ e }));

test('fetch: the same request answers the same row on both sides, in any order', async () => {
  for (let seed = 1; seed <= 20; seed++) {
    const a = world(seed).g, b = world(seed).g;
    const fa = [await statusOf(a, 'https://x.test/a'), await statusOf(a, 'https://x.test/b')];
    const fb = [await statusOf(b, 'https://x.test/b'), await statusOf(b, 'https://x.test/a')].reverse();
    assert.deepEqual(fa, fb, `seed ${seed}`);
    const again = await statusOf(a, 'https://x.test/a'); // asked again: the same row (or the fault draw of this second call)
    if (!String(again).startsWith('fault') && !String(fa[0]).startsWith('fault')) assert.equal(again, fa[0]);
  }
});

test('fetch: the key is (method, url, body): a Request and a fetch with the same parts are one request', async () => {
  for (let seed = 1; seed <= 20; seed++) {
    const one = world(seed).g, other = world(seed).g; // the two sides of one input
    const direct = await statusOf(one, 'https://x.test/items', { method: 'POST', body: '{"n":1}', headers: { 'content-type': 'application/json' } });
    const viaRequest = await statusOf(other, new other.Request('https://x.test/items', { method: 'POST', body: '{"n":1}' }));
    assert.equal(direct, viaRequest);
  }
});

test('fetch: every status meets a fixed request within STATUSES.length inputs, ok iff 2xx', async () => {
  const seen = new Set();
  for (let seed = 1; seed <= STATUSES.length; seed++) {
    let r = null; // the status rotates with the seed modulo STATUSES.length: a seed the fault draw fails is met again n seeds on
    for (let s = seed; !r; s += STATUSES.length) r = await settle(world(s).g.fetch('https://x.test/fixed')).then((x) => x.v ?? null);
    seen.add(r.status); assert.equal(r.ok, r.status >= 200 && r.status < 300);
  }
  assert.deepEqual([...seen].sort(), [...new Set(STATUSES)].sort());
});

test('fetch: the trace records the request as the server receives it (method, url, headers, body)', async () => {
  const { env, g } = world(1);
  const h = new g.Headers({ Accept: 'text/plain' }); h.set('Authorization', 'Bearer t');
  await settle(g.fetch(new URL('/u?p=1', 'https://x.test'), { method: 'PUT', headers: h, body: 'b' }));
  const call = env.trace.find((t) => t.op === 'call' && t.path === 'global:fetch');
  assert.equal(call.args[0].method, 'PUT');
  assert.equal(call.args[0].url, 'https://x.test/u?p=1');
  assert.deepEqual(call.args[0].headers.filter(([k]) => k !== 'content-type'), [['accept', 'text/plain'], ['authorization', 'Bearer t']]);
  assert.equal(call.args[0].body, 'b');
});

test('fetch: a relative URL resolves against the virtual origin; an invalid request rejects with the standard TypeError', async () => {
  const { env, g } = world(1);
  await settle(g.fetch('/api/x'));
  assert.equal(env.trace.at(-1).args[0].url, new URL('/api/x', ORIGIN).href);
  const bad = await settle(g.fetch('https://x.test/', { method: 'GET', body: 'no' }));
  assert.ok(bad.e instanceof TypeError);
});

test('fetch: a body is read once; a null-body status reads as the empty text and its json() rejects with SyntaxError', async () => {
  let checked204 = false;
  for (let seed = 1; seed <= 40; seed++) {
    const { g } = world(seed);
    const r = await settle(g.fetch('https://x.test/body'));
    if (r.e) continue; // the world's fault draw
    const res = r.v;
    if (res.status === 204) { assert.equal(await res.clone().text(), ''); assert.ok((await settle(res.json())).e instanceof SyntaxError); checked204 = true; continue; }
    await settle(res.json()); // the parse of the drawn text: a text that is no JSON rejects, and the body is read either way
    assert.equal(res.bodyUsed, true);
    assert.ok((await settle(res.text())).e instanceof TypeError);
  }
  assert.ok(checked204);
});

test('fetch: json() is the parse of text(), one body, as on every real Response', async () => {
  let parsed = 0, refused = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const { g } = world(seed);
    const r = await settle(g.fetch('https://x.test/same', { method: 'POST', body: String(seed) }));
    if (r.e) continue; // the world's fault draw
    const text = await r.v.clone().text();
    assert.equal(typeof text, 'string');
    let want; try { want = { v: JSON.parse(text) }; } catch (e) { want = { e: e.name }; }
    const got = await settle(r.v.json());
    if (want.e) { assert.equal(got.e?.name, want.e); refused++; } else { assert.deepEqual(got.v, want.v); parsed++; }
  }
  assert.ok(parsed > 0 && refused > 0, `both a JSON text and a text that is none met (${parsed}, ${refused})`);
});

test('fetch: an aborted signal rejects with its reason; the network fails on the fault draw', async () => {
  const { g } = world(1);
  const c = new g.AbortController(); c.abort();
  const r = await settle(g.fetch('https://x.test/', { signal: c.signal }));
  assert.equal(r.e?.name, 'AbortError');
  let faults = 0;
  for (let seed = 1; seed <= 120; seed++) { const x = await settle(world(seed).g.fetch('https://x.test/fault')); if (x.e) { assert.ok(x.e instanceof TypeError); faults++; } }
  assert.ok(faults > 0 && faults < 30, `${faults} faults of 120`);
});

test('AbortSignal.timeout is armed on the virtual clock and aborts with TimeoutError when it fires', () => {
  const { env, g } = world(1);
  const s = g.AbortSignal.timeout(50);
  assert.equal(s.aborted, false);
  const t = env.timers.queue.find((e) => e.due === 50);
  assert.ok(t);
  t.fn();
  assert.equal(s.aborted, true);
  assert.equal(s.reason.name, 'TimeoutError');
});

test('localStorage: write then read returns what was written; remove then read is null; the record is the same on both sides', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const a = world(seed, ['theme', 'lang']), b = world(seed, ['theme', 'lang']);
    assert.equal(a.g.localStorage.getItem('lang'), b.g.localStorage.getItem('lang')); // the store before the run: one world
    assert.equal(a.g.localStorage.getItem('never-named'), null);
    a.g.localStorage.setItem('theme', 7);
    assert.equal(a.g.localStorage.getItem('theme'), '7');
    assert.equal(a.g.localStorage.theme, '7');
    delete a.g.localStorage.theme;
    assert.equal(a.g.localStorage.getItem('theme'), null);
    a.g.localStorage.x = 'y';
    assert.ok(Object.keys(a.g.localStorage).includes('x'));
    assert.equal(a.g.localStorage.key(a.g.localStorage.length - 1), 'x');
    assert.equal(a.g.sessionStorage.getItem('x'), null); // two areas
    a.g.localStorage.clear();
    assert.equal(a.g.localStorage.length, 0);
  }
});

test('localStorage: an item named by the unit is present on some inputs and absent on others', () => {
  let present = 0;
  for (let seed = 1; seed <= 100; seed++) if (world(seed, ['token']).g.localStorage.getItem('token') !== null) present++;
  assert.ok(present > 20 && present < 80, `present on ${present} of 100`);
});

test('localStorage: a write is on the trace, a read is not', () => {
  const { env, g } = world(1, ['k']);
  g.localStorage.getItem('k'); g.localStorage.setItem('k', 'v'); g.localStorage.removeItem('k');
  assert.deepEqual(env.trace.map((t) => [t.path, t.args]), [['global:localStorage.setItem', ['k', 'v']], ['global:localStorage.removeItem', ['k']]]);
});

test('a platform object renders by its state, never as {}', async () => {
  const { g } = world(1);
  assert.deepEqual(render(new URL('https://x.test/a?b=1')), { $url: 'https://x.test/a?b=1' });
  assert.deepEqual(render(new URLSearchParams('b=1&a=2')), { $searchParams: 'b=1&a=2' });
  assert.deepEqual(render(new g.Headers({ B: '1', a: '2' })), { $headers: [['a', '2'], ['b', '1']] });
  assert.equal(render(new g.Response('x', { status: 201 })).$response.status, 201);
  assert.equal(render(new g.Response('x', { status: 201 })).$response.body, 'x');
  assert.notDeepEqual(render(new URL('https://x.test/a')), render(new URL('https://x.test/b')));
});
