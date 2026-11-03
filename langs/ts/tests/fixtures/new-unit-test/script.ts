// a script (lane w9bg): it exports nothing; its top level reads the environment, builds a request and makes it through
// a function of its own, then prints what came back. A test of `send` imports the script under the stubs of lean's
// answers (the environment, fetch) and asserts the requests it made
const endpoint = 'https://status.example.test';
const token = process.env.STATUS_TOKEN;
if (!token) {
  throw new Error('STATUS_TOKEN is required');
}

async function send(route: string, payload?: unknown): Promise<unknown> {
  const res = await fetch(`${endpoint}${route}`, {
    method: payload === undefined ? 'GET' : 'PUT',
    headers: { authorization: `Token ${token}`, ...(payload === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
  if (res.status >= 400) {
    throw new Error(`${route} answered ${res.status}`);
  }
  return res.status === 204 ? null : res.text();
}

const report = await send('/report', { ok: true });
console.log('sent', report);
