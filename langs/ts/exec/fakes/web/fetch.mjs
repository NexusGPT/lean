// fetch, Request, Response, FormData, Blob: the behavioural fake of the Fetch standard (design/w2c-web-fakes.md).
//
// Request, Response, Headers, FormData and Blob are the platform's own classes (Node's undici, the Fetch standard),
// so a unit that builds a request, reads a header or makes a response runs the standard's code. Two things are added:
// - Request and Response are subclassed only to remember the body they were built with (the standard keeps it in a
//   stream, readable only asynchronously), so a request is keyed and a response rendered synchronously; a relative URL
//   resolves against the one origin lean's virtual document has (ORIGIN), as it does in a page.
// - fetch is the world: a table keyed by (method, url, body). The first request with a key draws its row from the
//   seeded generator, by the input's seed and the key only (never by call order), and every later request with the key
//   answers the same row, so both sides of an input are served alike and a refactor that reorders its requests sees the
//   same server. A row is a status (rotated through STATUSES by the seed, so every status meets every request within
//   STATUSES.length inputs), the standard's status text, a content type, and a body: `json()` resolves to lean's varied
//   answer at the row's own path (a fake, or null, an empty list, ...: what the recording proxy answered, now named by
//   the request instead of the call count), `text()` to a drawn text (draw.mjs drawText). A null-body status (204)
//   answers the empty text and a `json()` that rejects with the engine's SyntaxError, as the standard's does.
// Every fetch is recorded on the trace as `call global:fetch` with the request as the standard reads it: method, URL,
// headers in the standard's order, the body text, and the request's mode, credentials, cache and redirect. A request
// that is not a valid Request rejects with the TypeError the standard raises; an aborted signal rejects with its
// reason; on the world's fault draw (one call in twelve, fake.mjs faultDraw) the network fails, a rejected TypeError.
import { render, namePromise, programBuilt } from '../../fake.mjs';
import { HostHeaders, headerEntries } from './headers.mjs';
import { keyName, drawText, hashOf } from './draw.mjs';

export const ORIGIN = 'http://localhost/';
export const HostRequest = globalThis.Request;
export const HostResponse = globalThis.Response;
export const HostFormData = globalThis.FormData;
export const HostBlob = globalThis.Blob;

// the statuses a row answers, in the order the seed rotates through them: success first, then the client and server
// errors a unit tells apart (`res.ok`, `status === 404`, `status >= 500`), and the null-body 204
export const STATUSES = [200, 404, 201, 500, 400, 204, 401, 200, 403, 409, 422, 429, 502, 503];
const STATUS_TEXT = { 200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict', 422: 'Unprocessable Content', 429: 'Too Many Requests', 500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable' };
const NULL_BODY = new Set([101, 103, 204, 205, 304]);

// the body a request or response was built with, as a text the key and the rendering read (the standard's extraction:
// a string as is, URLSearchParams by its serialisation, bytes by their base64, a FormData by its entries, a Blob by its
// size and type, a stream unread, any other value by its string conversion, as `new Request(u, { body: {} })` sends
// "[object Object]"); a value of lean's world by its path
const bodies = new WeakMap();
export function bodyText(body) {
  if (body === null || body === undefined) return null;
  if (typeof body === 'string') return body;
  if (body.__isFake) return `<world value ${body.__fakePath}>`;
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof ArrayBuffer) return `<bytes ${Buffer.from(body).toString('base64')}>`;
  if (ArrayBuffer.isView(body)) return `<bytes ${Buffer.from(body.buffer, body.byteOffset, body.byteLength).toString('base64')}>`;
  if (body instanceof HostFormData) return `<form ${JSON.stringify([...body.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : `<file ${v.name} ${v.size} ${v.type}>`]))}>`;
  if (body instanceof HostBlob) return `<blob ${body.size} ${body.type}>`;
  if (typeof body.getReader === 'function') return '<stream>';
  return String(body);
}
const resolved = (input) => (input instanceof HostRequest ? input : new URL(String(input), ORIGIN).href); // anything but a Request is read as its string, as the standard reads it

export class Request extends HostRequest {
  constructor(input, init) {
    super(resolved(input), init);
    const own = init && init.body !== undefined && init.body !== null ? bodyText(init.body) : null;
    bodies.set(this, own ?? (input instanceof HostRequest ? bodies.get(input) ?? null : null));
  }
  clone() { const c = super.clone(); Object.setPrototypeOf(c, Object.getPrototypeOf(this)); bodies.set(c, bodies.get(this) ?? null); return c; }
}
Object.defineProperty(Request, 'name', { value: 'Request' });

export class Response extends HostResponse {
  constructor(body, init) { super(body, init); bodies.set(this, bodyText(body)); }
  static json(data, init = {}) { const h = new HostHeaders(init.headers); if (!h.has('content-type')) h.set('content-type', 'application/json'); return new this(JSON.stringify(data), { ...init, headers: h }); }
  clone() { const c = super.clone(); Object.setPrototypeOf(c, Object.getPrototypeOf(this)); bodies.set(c, bodies.get(this) ?? null); return c; }
}
Object.defineProperty(Response, 'name', { value: 'Response' });

// the request as the trace shows it: what the server receives
export const requestShape = (req) => ({ method: req.method, url: req.url, headers: headerEntries(req.headers), body: bodies.get(req) ?? null, mode: req.mode, credentials: req.credentials, cache: req.cache, redirect: req.redirect });
export const requestKey = (req) => JSON.stringify([req.method, req.url, bodies.get(req) ?? null]);

// a response the world answered: a row of the table
const rows = new WeakMap(); // response -> { env, row }
class FetchResponse extends Response {
  constructor(env, row) {
    super(row.nullBody ? null : row.text, { status: row.status, statusText: row.statusText, headers: row.nullBody ? {} : { 'content-type': 'application/json' } });
    rows.set(this, { env, row });
  }
  get url() { return rows.get(this)?.row.url ?? ''; }
  get redirected() { return false; }
  json() {
    const { env, row } = rows.get(this);
    return super.text().then(() => (row.nullBody ? JSON.parse('') : env.answer(`${row.path}.json()`)));
  }
  clone() { if (this.bodyUsed) throw new TypeError('Response.clone: Body has already been consumed.'); const { env, row } = rows.get(this); return new FetchResponse(env, row); }
}
Object.defineProperty(FetchResponse, 'name', { value: 'Response' });

function drawRow(env, req, key) {
  const name = keyName(key);
  const status = STATUSES[(((env.seed >>> 0) + hashOf(key).readUInt32BE(0)) >>> 0) % STATUSES.length];
  return { key, url: req.url, path: `response:${name}`, status, statusText: STATUS_TEXT[status] ?? '', nullBody: NULL_BODY.has(status), text: drawText(env, 'fetch:text', key) };
}

export function fetchFake(env) {
  const table = new Map(); // key -> row: the requests this side has made, each answered once and the same ever after
  const reject = (e, at) => { const p = Promise.reject(e); return namePromise(env, env.scheduler ? env.scheduler.hold(p, at) : p, at, { reason: e }); };
  return function fetch(input, init) {
    let req;
    try { req = new Request(input, init); } catch (e) { env.record('call', 'global:fetch', [render(input), render(init)]); return Promise.reject(e); } // not a request: the standard's TypeError, the arguments as given
    const key = requestKey(req);
    env.record('call', 'global:fetch', [requestShape(req)]);
    const n = ((env.fetchCalls ??= new Map()).get(key) ?? 0) + 1; env.fetchCalls.set(key, n);
    const at = `global:fetch(${keyName(key)})#${n}`;
    if (req.signal.aborted) return reject(req.signal.reason, at);
    if (!env.loading && env.cbDepth === 0 && env.faultDraw(at)) { env.record('fault', 'global:fetch', []); const e = new TypeError('fetch failed'); programBuilt.add(e); return reject(e, at); }
    if (!table.has(key)) table.set(key, drawRow(env, req, key));
    const res = new FetchResponse(env, table.get(key));
    const p = Promise.resolve(res);
    return namePromise(env, env.scheduler ? env.scheduler.hold(p, at) : p, at, { value: res });
  };
}

export function renderResponse(v) {
  const r = rows.get(v)?.row;
  return { $response: { status: v.status, statusText: v.statusText, url: v.url, headers: headerEntries(v.headers), body: r ? { $fake: r.path } : bodies.get(v) ?? null, bodyUsed: v.bodyUsed } };
}
export const renderRequest = (v) => ({ $request: requestShape(v) });
