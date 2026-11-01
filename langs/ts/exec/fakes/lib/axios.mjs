// axios as a library fake: a model of the client over the world's request table (design/w2d-library-rows.md). The
// unit's call forms (`axios(cfg)`, `axios(url, cfg)`, `axios.get(url, cfg)`, `axios.post(url, data, cfg)`,
// `axios.request(cfg)`, an instance from `axios.create(defaults)`) are one request each, normalised as axios 1.x
// normalises it before the adapter runs: the method in lower case (`get` when none), the URL joined to `baseURL` unless
// absolute (buildFullPath), `params` serialised onto it (buildURL), the body, and the headers the unit gave (defaults,
// instance, call: later wins). That request is what the world sees, and it is recorded on the trace as
// `call module:axios.request [{method, url, data, headers}]`: two forms that make the same request record the same
// line. The world answers from a table keyed by (method, url, body): the same request has the same response on a side
// and on both sides of an input; the status is a seeded draw over success and failure codes, `data` the world's answer
// for that key. A status outside validateStatus (2xx by default) rejects with an AxiosError carrying the response, as
// axios does (`Request failed with status code N`, ERR_BAD_REQUEST for 4xx, ERR_BAD_RESPONSE for 5xx); a seeded
// fault of the call (one in twelve, the recording proxy's draw) rejects with ERR_NETWORK and no response. Request
// interceptors run last-registered first on the config, response interceptors in order on the response.
import { createHash } from 'node:crypto';
import { namePromise, programBuilt, render } from '../../fake.mjs';

const STATUSES = [200, 200, 200, 201, 204, 400, 401, 403, 404, 409, 422, 500, 503];
const STATUS_TEXT = { 200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict', 422: 'Unprocessable Entity', 500: 'Internal Server Error', 503: 'Service Unavailable' };
const isAbsolute = (u) => /^([a-z][a-z\d+\-.]*:)?\/\//i.test(u);
const combine = (base, rel) => (rel ? base.replace(/\/?\/$/, '') + '/' + rel.replace(/^\/+/, '') : base);
// axios/lib/helpers/buildURL.js with AxiosURLSearchParams' encode
const encode = (v) => encodeURIComponent(v).replace(/%3A/gi, ':').replace(/%24/g, '$').replace(/%2C/gi, ',').replace(/%20/g, '+').replace(/%5B/gi, '[').replace(/%5D/gi, ']');
function serialise(params) {
  const parts = [];
  for (const [k, v0] of Object.entries(params)) {
    if (v0 === null || v0 === undefined) continue;
    const many = Array.isArray(v0), key = many ? `${k}[]` : k;
    for (const v of many ? v0 : [v0]) parts.push(`${encode(key)}=${encode(v instanceof Date ? v.toISOString() : v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v))}`);
  }
  return parts.join('&');
}
function buildURL(url, params, serializer) {
  if (!params) return url;
  const q = typeof serializer === 'function' ? serializer(params) : typeof serializer?.serialize === 'function' ? serializer.serialize(params) : params instanceof URLSearchParams ? params.toString() : serialise(params);
  if (!q) return url;
  const h = url.indexOf('#'); if (h !== -1) url = url.slice(0, h);
  return url + (url.includes('?') ? '&' : '?') + q;
}
const lowerHeaders = (h) => Object.fromEntries(Object.entries(h ?? {}).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, v]));
class AxiosError extends Error {
  constructor(message, code, config, request, response) { super(message); this.name = 'AxiosError'; this.isAxiosError = true; this.code = code; this.config = config; this.response = response; if (request !== undefined) this.request = request; if (response) this.status = response.status; }
  toJSON() { return { message: this.message, name: this.name, code: this.code, status: this.status }; }
}
class CanceledError extends AxiosError { constructor(message, config) { super(message ?? 'canceled', 'ERR_CANCELED', config); this.name = 'CanceledError'; this.__CANCEL__ = true; } }

export function axiosModule(env) {
  const seen = new Map(); // request key -> its response: the world's table
  const answer = (method, url, data) => {
    const key = `${method.toUpperCase()} ${url} ${JSON.stringify(render(data))}`;
    if (!seen.has(key)) {
      const u = createHash('sha256').update(`${env.seed}:axios:${key}`).digest().readUInt32BE(0) / 4294967296;
      const status = STATUSES[Math.floor(u * STATUSES.length)];
      seen.set(key, { status, statusText: STATUS_TEXT[status] ?? '', headers: { 'content-type': 'application/json' }, data: status === 204 ? '' : env.answer(`module:axios.request(${key})#data`) });
    }
    return seen.get(key);
  };
  const dispatch = (config) => {
    const method = String(config.method ?? 'get').toLowerCase();
    const full = isAbsolute(config.url ?? '') || !config.baseURL ? (config.url ?? '') : combine(config.baseURL, config.url);
    const url = buildURL(full, config.params, config.paramsSerializer);
    const headers = lowerHeaders(config.headers);
    env.record('call', 'module:axios.request', [render({ method, url, data: config.data, headers })]);
    const k = (env.calls.get('module:axios.request') ?? 0) + 1; env.calls.set('module:axios.request', k);
    const site = `module:axios.request()#${k}`;
    const cfg = { ...config, method, url, headers };
    if (config.signal?.aborted) return Promise.reject(new CanceledError(undefined, cfg));
    if (env.faultDraw(site)) { env.record('fault', 'module:axios.request', []); const e = new AxiosError('Network Error', 'ERR_NETWORK', cfg, {}); programBuilt.add(e); return Promise.reject(e); }
    const r = answer(method, url, config.data);
    const response = { data: r.data, status: r.status, statusText: r.statusText, headers: { ...r.headers }, config: cfg, request: {} };
    const vs = config.validateStatus === undefined ? (s) => s >= 200 && s < 300 : config.validateStatus; // axios/lib/core/settle.js: no status, or no validateStatus, resolves
    const ok = !response.status || !vs || vs(response.status);
    if (ok) return Promise.resolve(response);
    const e = new AxiosError(`Request failed with status code ${response.status}`, response.status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST', cfg, response.request, response);
    programBuilt.add(e);
    return Promise.reject(e);
  };
  const manager = () => { const hs = []; return { handlers: hs, use(fulfilled, rejected) { hs.push({ fulfilled, rejected }); return hs.length - 1; }, eject(id) { if (hs[id]) hs[id] = null; }, clear() { hs.length = 0; } }; };
  const merge = (a, b) => ({ ...a, ...b, headers: { ...(a?.headers ?? {}), ...(b?.headers ?? {}) } });
  function make(defaults) {
    const interceptors = { request: manager(), response: manager() };
    const request = (configOrUrl, config) => {
      let cfg = typeof configOrUrl === 'string' ? merge(instance.defaults, { ...config, url: configOrUrl }) : merge(instance.defaults, configOrUrl ?? {});
      let p = Promise.resolve(cfg);
      for (const h of [...interceptors.request.handlers].reverse()) if (h) p = p.then(h.fulfilled, h.rejected);
      p = p.then(dispatch);
      for (const h of interceptors.response.handlers) if (h) p = p.then(h.fulfilled, h.rejected);
      const k = (env.axiosPromises = (env.axiosPromises ?? 0) + 1);
      const held = env.scheduler ? env.scheduler.hold(p, `module:axios#${k}`) : p;
      return namePromise(env, held, `module:axios.request()#${k}`, {});
    };
    const instance = (a, b) => request(a, b);
    instance.request = (a, b) => request(a, b);
    for (const m of ['get', 'delete', 'head', 'options']) instance[m] = (url, config) => request({ ...config, method: m, url });
    for (const m of ['post', 'put', 'patch']) instance[m] = (url, data, config) => request({ ...config, method: m, url, data });
    for (const m of ['postForm', 'putForm', 'patchForm']) instance[m] = (url, data, config) => request({ ...config, method: m.slice(0, -4), url, data, headers: { ...(config?.headers ?? {}), 'Content-Type': 'multipart/form-data' } });
    instance.defaults = { ...defaults, headers: { ...(defaults?.headers ?? {}) } };
    instance.interceptors = interceptors;
    instance.getUri = (config) => { const c = merge(instance.defaults, config ?? {}); const full = isAbsolute(c.url ?? '') || !c.baseURL ? (c.url ?? '') : combine(c.baseURL, c.url); return buildURL(full, c.params, c.paramsSerializer); };
    instance.create = (config) => make(merge(instance.defaults, config ?? {}));
    instance.isAxiosError = (e) => !!e && typeof e === 'object' && e.isAxiosError === true;
    instance.isCancel = (v) => !!(v && v.__CANCEL__);
    instance.AxiosError = AxiosError; instance.CanceledError = CanceledError; instance.Cancel = CanceledError;
    instance.all = (ps) => Promise.all(ps); instance.spread = (cb) => (arr) => cb(...arr);
    instance.default = instance; instance.axios = instance;
    return instance;
  }
  return make({});
}
