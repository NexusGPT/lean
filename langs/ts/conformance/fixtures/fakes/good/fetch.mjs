// A minimal fetch fake (fixture until w2c's exec/fakes/web/fetch.mjs lands): a table keyed by (method, url, body) seeded
// from the recording (recording.fetch: [{ method, url, body, status, headers, response }]); a hit answers a real
// Response built from the entry, a miss answers a seeded string with status 200; every request recorded.
export const specifier = 'global:fetch';
const keyOf = (method, url, body) => JSON.stringify([String(method ?? 'GET').toUpperCase(), String(url), body == null ? '' : String(body)]);
export function create(env, recording = {}) {
  const table = new Map((recording.fetch ?? []).map((e) => [keyOf(e.method, e.url, e.body), e]));
  return async function fetch(input, init = {}) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init.method ?? input?.method ?? 'GET';
    env.record('call', 'fetch', [String(method).toUpperCase(), url, init.body == null ? '' : String(init.body)]);
    const e = table.get(keyOf(method, url, init.body));
    if (e) return new Response(e.response, { status: e.status ?? 200, headers: e.headers ?? {} });
    return new Response(env.primitive('string', `fetch(${url})`), { status: 200 });
  };
}
