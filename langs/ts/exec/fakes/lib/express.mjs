// express as a library fake: the request and the response a handler is handed, when the unit's parameter is declared
// with express's own type (exec/spec.mjs `module` is `express` or `express-serve-static-core`, the type `Request` or
// `Response`), are models over the recording proxy of that parameter (design/w2d-library-rows.md).
//   Response: the response's state is the model's: `statusCode` (200 until set), `headersSent`, the headers set. Every
//     method that writes the response is recorded on the trace with its arguments (`call <path>.status [404]`,
//     `call <path>.json [body]`) and returns the response itself where express returns `this`, so
//     `res.status(400).json(e)` and `res.status(400); res.json(e)` make the same records; a second body
//     (`send`, `json`, `jsonp`, `sendStatus`, `redirect`, `render`) or a header written after the body throws
//     express's error (Node's ERR_HTTP_HEADERS_SENT, `Cannot set headers after they are sent to the client`); `get`
//     reads a header the unit set. Any other member is the recording proxy's.
//   Request: `get(name)` and `header(name)` read `headers[name in lower case]` through the proxy (`Referer` and
//     `Referrer` are one header, express's req.get), so a header read either way is one read with one value; every
//     other member is the proxy's, recorded and answered from the declared type as before.
// The express module itself (`express()`, Router, the middleware factories) stays the recording proxy: what it
// does is registration, which the proxy records.
import { render } from '../../fake.mjs';

const RESPONSE = new Set(['Response']), REQUEST = new Set(['Request']);
const PACKAGES = new Set(['express', 'express-serve-static-core']);
const headersSentError = () => { const e = new Error('Cannot set headers after they are sent to the client'); e.code = 'ERR_HTTP_HEADERS_SENT'; return e; };

export const expressModule = () => null;

export function expressTypeFake(env, path, tspec) {
  if (!PACKAGES.has(tspec.module)) return null;
  const name = tspec.symbolName ?? '';
  if (RESPONSE.has(name)) return responseModel(env, path, tspec);
  if (REQUEST.has(name)) return requestModel(env, path, tspec);
  return null;
}

function responseModel(env, path, tspec) {
  const cache = (env.expressModels ??= new Map()); if (cache.has(path)) return cache.get(path);
  const base = env.fake(path, { ...tspec, module: null }); // the recording proxy the model stands over
  const st = { statusCode: 200, headersSent: false, ended: false, headers: new Map() };
  let self = null;
  const rec = (m, args) => env.record('call', `${path}.${m}`, args.map((a) => a));
  const body = (m) => (...args) => { if (st.headersSent) throw headersSentError(); rec(m, args.map(render)); if (m === 'sendStatus') st.statusCode = args[0]; if (m === 'redirect' && args.length > 1 && typeof args[0] === 'number') st.statusCode = args[0]; else if (m === 'redirect') st.statusCode = 302; st.headersSent = true; st.ended = true; return self; };
  const setHeader = (m) => (field, value) => {
    if (st.headersSent) throw headersSentError();
    rec(m, [render(field), render(value)]);
    if (field && typeof field === 'object') for (const [k, v] of Object.entries(field)) st.headers.set(String(k).toLowerCase(), v);
    else st.headers.set(String(field).toLowerCase(), value);
    return self;
  };
  const methods = {
    status: (code) => { rec('status', [render(code)]); st.statusCode = code; return self; },
    send: body('send'), json: body('json'), jsonp: body('jsonp'), sendStatus: body('sendStatus'), redirect: body('redirect'), render: body('render'), sendFile: body('sendFile'), download: body('download'),
    end: (...args) => { rec('end', args.map(render)); st.headersSent = true; st.ended = true; return self; },
    set: setHeader('set'), header: setHeader('header'), setHeader: setHeader('setHeader'), append: setHeader('append'),
    type: (t) => setHeader('type')('content-type', t), contentType: (t) => setHeader('contentType')('content-type', t), location: (u) => setHeader('location')('location', u),
    get: (field) => st.headers.get(String(field).toLowerCase()), getHeader: (field) => st.headers.get(String(field).toLowerCase()),
    cookie: (...args) => { if (st.headersSent) throw headersSentError(); rec('cookie', args.map(render)); return self; },
    clearCookie: (...args) => { if (st.headersSent) throw headersSentError(); rec('clearCookie', args.map(render)); return self; },
    vary: (f) => { rec('vary', [render(f)]); return self; },
    links: (l) => { rec('links', [render(l)]); return self; },
    attachment: (f) => { rec('attachment', [render(f)]); return self; },
  };
  self = new Proxy(base, {
    get(t, p, r) {
      if (p === 'statusCode') return st.statusCode;
      if (p === 'headersSent') return st.headersSent;
      if (p === 'writableEnded' || p === 'finished') return st.ended;
      if (typeof p === 'string' && Object.hasOwn(methods, p)) return methods[p];
      return Reflect.get(t, p, r);
    },
    set(t, p, v) { if (p === 'statusCode') { env.record('set', `${path}.statusCode`, [render(v)]); st.statusCode = v; return true; } return Reflect.set(t, p, v); },
  });
  cache.set(path, self);
  return self;
}

function requestModel(env, path, tspec) {
  const cache = (env.expressModels ??= new Map()); if (cache.has(path)) return cache.get(path);
  const base = env.fake(path, { ...tspec, module: null }); // the recording proxy the model stands over
  const header = (name) => { const k = String(name).toLowerCase(); const hs = base.headers; if (hs === null || hs === undefined) return undefined; return k === 'referer' || k === 'referrer' ? (hs.referer ?? hs.referrer) : hs[k]; };
  const self = new Proxy(base, { get(t, p, r) { if (p === 'get' || p === 'header') return header; return Reflect.get(t, p, r); } });
  cache.set(path, self);
  return self;
}
