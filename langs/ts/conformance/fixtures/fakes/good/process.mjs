// A minimal process fake (fixture until w2b's exec/fakes/process.mjs lands): env a record from the recording, a fixed
// cwd and argv, exit a recorded fault that never ends the real process.
export const specifier = 'node:process';
export class ProcessExit extends Error {}
export function create(env, recording = {}) {
  const vars = { ...(recording.env ?? {}) };
  return {
    env: new Proxy(vars, { get(t, k) { if (typeof k === 'string') env.record('get', `process.env.${k}`, []); return Reflect.get(t, k); } }),
    argv: ['/usr/bin/node', '/work/main.js'],
    cwd() { env.record('call', 'process.cwd', []); return '/work'; },
    exit(code) { env.record('call', 'process.exit', [code]); throw new ProcessExit(`process.exit(${code})`); },
  };
}
