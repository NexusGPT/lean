// A minimal fetch fake (fixture until w2c's exec/fakes/web/fetch.mjs lands): a table keyed by (method, url, body) seeded
// from the recording (recording.fetch: [{ method, url, body, status, headers, response }]); a hit answers a real
// Response built from the entry, a miss answers a seeded string with status 200; every request recorded.
export const specifier = 'global:fetch';
const keyOf = (method, url, body) => JSON.stringify([String(method ?? 'GET').toUpperCase(), String(url), body == null ? '' : String(body)]);
export function create(env, recording = {}) {
  const table = new Map((recording.fetch ?? []).map((e) => [keyOf(e.method, e.url, e.body), e]));
  return async function fetch(input, init = {}) {
    const req = new Request(input, init); // the arguments as the standard reads them: a pair it refuses rejects with its error
    const body = init.body == null ? null : String(init.body);
    env.record('call', 'fetch', [req.method, req.url, body ?? '']);
    const e = table.get(keyOf(req.method, req.url, body)) ?? table.get(keyOf(req.method, input, body));
    if (e) return new Response(e.response, { status: e.status ?? 200, headers: e.headers ?? {} });
    return new Response(env.primitive('string', `fetch(${req.url})`), { status: 200 });
  };
}
