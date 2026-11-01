// axios as a library fake: the package's own code (vendor/axios, 1.21.0, its browser build, which requires no module)
// loaded into the side's sandbox, with lean's adapter as its default adapter (design/w2d-library-rows.md). Everything
// axios does before a request leaves it is axios's: the call forms (`axios(cfg)`, `axios.get(url)`, `post(url, data)`,
// an instance from `create`), merging the defaults, the interceptors, transformRequest (an object body becomes JSON and
// sets its Content-Type), the headers, cancellation. The adapter is where the request reaches the world:
//   - the request, as the world sees it: the method, the URL axios builds from baseURL, url and params (`getUri`, the
//     function its own adapters call), the body as transformed, the headers as set; recorded on the trace as
//     `call module:axios.request [{method, url, data, headers}]`, so two call forms that make one request make one record;
//   - the answer: a table keyed by (method, url, body): the same request has the same response on a side and on both
//     sides of an input; the status a seeded draw over success and failure codes, `data` the world's answer for the key;
//   - the outcome: axios's settle (a status validateStatus refuses rejects with an AxiosError carrying the response:
//     `Request failed with status code N`, ERR_BAD_REQUEST for 4xx, ERR_BAD_RESPONSE otherwise), and the recording
//     proxy's seeded fault of a call (one in twelve) as a network failure (ERR_NETWORK, no response), as its adapters fail.
// A unit that passes its own `adapter` gets its own adapter, as with axios.
import { createHash } from 'node:crypto';
import { programBuilt, render } from '../../fake.mjs';
import { requireVendored, manifestOf } from './load.mjs';

const STATUSES = [200, 200, 200, 201, 204, 400, 401, 403, 404, 409, 422, 500, 503];
const STATUS_TEXT = { 200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict', 422: 'Unprocessable Entity', 500: 'Internal Server Error', 503: 'Service Unavailable' };

// axios/lib/core/settle.js: no status, or no validateStatus, resolves; a status validateStatus refuses rejects with the
// response. null when the request resolves, else the error (AxiosError the package's class)
export function settle(AxiosError, response, validateStatus) {
  if (!response.status || !validateStatus || validateStatus(response.status)) return null;
  return new AxiosError(`Request failed with status code ${response.status}`, response.status >= 400 && response.status < 500 ? AxiosError.ERR_BAD_REQUEST : AxiosError.ERR_BAD_RESPONSE, response.config, response.request, response);
}
export const VALIDATE = { default: (s) => s >= 200 && s < 300, all: null, below500: (s) => s < 500 };

export function axiosModule(env) {
  const m = manifestOf('axios'); if (!m) return null;
  const axios = requireVendored(env, 'axios', m.main);
  if (!axios || axios.__leanAdapter) return axios;
  const table = new Map(); // request key -> the world's response
  const answer = (key) => {
    if (!table.has(key)) {
      const u = createHash('sha256').update(`${env.seed}:axios:${key}`).digest().readUInt32BE(0) / 4294967296;
      const status = STATUSES[Math.floor(u * STATUSES.length)];
      table.set(key, { status, statusText: STATUS_TEXT[status] ?? '', data: status === 204 ? '' : env.answer(`module:axios.request(${key})#data`) });
    }
    return table.get(key);
  };
  const adapter = (config) => {
    const method = String(config.method ?? 'get').toLowerCase();
    const url = axios.getUri(config);
    const headers = config.headers && typeof config.headers.toJSON === 'function' ? config.headers.toJSON() : { ...(config.headers ?? {}) };
    env.record('call', 'module:axios.request', [render({ method, url, data: config.data, headers })]);
    const k = (env.calls.get('module:axios.request') ?? 0) + 1; env.calls.set('module:axios.request', k);
    let p;
    if (env.faultDraw(`module:axios.request()#${k}`)) {
      env.record('fault', 'module:axios.request', []);
      const e = new axios.AxiosError('Network Error', axios.AxiosError.ERR_NETWORK, config, {}); programBuilt.add(e);
      p = Promise.reject(e);
    } else {
      const r = answer(`${method.toUpperCase()} ${url} ${JSON.stringify(render(config.data))}`);
      const response = { data: r.data, status: r.status, statusText: r.statusText, headers: { 'content-type': 'application/json' }, config, request: {} };
      const e = settle(axios.AxiosError, response, config.validateStatus);
      if (e) programBuilt.add(e); // axios's text, the same on both sides: program data, as a message the program builds
      p = e ? Promise.reject(e) : Promise.resolve(response);
    }
    return env.scheduler ? env.scheduler.hold(p, `module:axios.request()#${k}`) : p;
  };
  axios.defaults.adapter = adapter;
  Object.defineProperty(axios, '__leanAdapter', { value: true });
  return axios;
}
