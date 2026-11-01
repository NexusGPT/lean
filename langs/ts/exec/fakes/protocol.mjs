// What the protocol tests of the fakes share (exec/fakes/<module>.test.mjs; design/w2b-node-fakes.md). A protocol test
// runs one stated sequence of operations on the fake and on the real module and compares what each answers. `--break`
// (or LEAN_FAKES=record) removes the mechanism under test: every specifier keeps the recording proxy alone, and every
// protocol must fail.
import { Environment } from '../fake.mjs';

export const BREAK = process.argv.includes('--break');
if (BREAK) process.env.LEAN_FAKES = 'record';

// an environment whose calls never fault: a protocol is stated for a run without the world's drawn failures (those
// are the recording proxy's, tested with it)
export function world(seed = 1, strings = []) {
  const env = new Environment(seed);
  env.shapes = { strings };
  env.faultDraw = () => false;
  return env;
}
// the module a unit's `import x from '<spec>'` receives
export const moduleOf = (env, spec) => env.module(spec);
// the operations recorded since a mark, as `op path`
export const opsSince = (env, mark) => env.trace.slice(mark).map((r) => `${r.op} ${r.path}`);
// an outcome comparable across the fake and the real module: a value, or an error by its Node code and syscall
export function outcome(f) {
  try { const v = f(); return { ok: Buffer.isBuffer(v) ? { buffer: v.toString('hex') } : v }; }
  catch (e) { return { error: e?.code ?? e?.constructor?.name ?? String(e), syscall: e?.syscall ?? null }; }
}
export async function outcomeAsync(f) {
  try { const v = await f(); return { ok: Buffer.isBuffer(v) ? { buffer: v.toString('hex') } : v }; }
  catch (e) { return { error: e?.code ?? e?.constructor?.name ?? String(e), syscall: e?.syscall ?? null }; }
}
