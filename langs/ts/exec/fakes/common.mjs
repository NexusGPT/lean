// What the behavioural fakes share: seeded draws, Node-shaped errors, promises the world answers, values of the unit's realm.
import { createHash } from 'node:crypto';
import { programBuilt, namePromise, worldFunction } from '../fake.mjs';

// a number in [0, 1) fixed by the seed and a tag: the same question has the same answer on both sides, in any order
export const drawOf = (env, tag) => createHash('sha256').update(`${env.seed}:fake:${tag}`).digest().readUInt32BE(0) / 4294967296;
// `n` bytes fixed by the seed and a tag
export function bytesOf(env, tag, n) {
  const out = Buffer.alloc(n); let filled = 0, block = 0;
  while (filled < n) { const h = createHash('sha256').update(`${env.seed}:fake:${tag}:${block++}`).digest(); filled += h.copy(out, filled, 0, Math.min(h.length, n - filled)); }
  return out;
}
// a string the world holds, drawn from the unit's own strings (the literals it compares against, exec/spec.mjs) or a
// plain edge, so a unit that tests for a value it names meets it on some input
export function drawnString(env, tag) {
  const pool = [...(env.shapes?.strings ?? []), '', '0', '1', 'true', 'false', `s${bytesOf(env, `${tag}:s`, 3).toString('hex')}`];
  return pool[Math.floor(drawOf(env, `${tag}:pick`) * pool.length)];
}

// An error the world raises, shaped as Node raises it: the class, `code`, `errno`, `syscall`, `path`, and Node's
// message text. lean wrote it, so its message is observed (fake.mjs programBuilt), as a fake fault's is.
const ERRNO = { ENOENT: [-2, 'no such file or directory'], EEXIST: [-17, 'file already exists'], ENOTDIR: [-20, 'not a directory'], EISDIR: [-21, 'illegal operation on a directory'], ENOTEMPTY: [-39, 'directory not empty'], EINVAL: [-22, 'invalid argument'] };
export function nodeError(code, syscall, path, dest) {
  const [errno, text] = ERRNO[code];
  const e = new Error(`${code}: ${text}, ${syscall} '${path}'${dest !== undefined ? ` -> '${dest}'` : ''}`);
  Object.assign(e, { errno, code, syscall, path }); if (dest !== undefined) e.dest = dest;
  programBuilt.add(e);
  return e;
}
export function worldError(Cls, message, fields = {}) { const e = new Cls(message); Object.assign(e, fields); programBuilt.add(e); return e; }

// a promise the world answers: named by its creation as every world promise is (fake.mjs namePromise), held by the
// race explorer's scheduler when one runs
export function worldPromise(env, path, k, run) {
  let p, settled;
  try { const value = run(); p = Promise.resolve(value); settled = { value }; } catch (reason) { p = Promise.reject(reason); settled = { reason }; p.catch(() => {}); }
  const held = env.scheduler ? env.scheduler.hold(p, `${path}()#${k}`) : p;
  return namePromise(env, held, `${path}()#${k}`, settled);
}
// a Node callback (err, value), called after the current job as Node calls it; a throw inside it is the unit's, recorded
export function nodeCallback(env, path, cb, run) {
  let err = null, value;
  try { value = run(); } catch (e) { err = e; }
  Promise.resolve().then(() => { try { const r = err ? cb(err) : cb(null, value); if (r && typeof r.then === 'function') r.catch(() => {}); } catch (e) { env.record('callback-throw', path, [String(e && e.message)]); } });
}

// a list the unit receives: an array of the unit's realm when the sandbox made one (`instanceof Array` holds there)
export const listOf = (env, xs) => (env.realm?.Array ? env.realm.Array.from(xs) : [...xs]);
export const recordOf = (env, o) => (env.realm?.Object ? Object.assign(new env.realm.Object(), o) : { ...o });
export const methodOf = (name, fn) => worldFunction(name, fn); // called at run time: fake.mjs imports this module, so its bindings are read late

// an entry table: `calls` name -> function (pure ones never fault; `faults` name -> how a drawn fault reaches the unit,
// when not as a throw), `values` name -> getter, `classes` name -> construct, `objects` the namespaces
export function entries({ name, calls = {}, pure = [], values = {}, objects = [], classes = {}, faults = {}, dynamic = null }) {
  const pureSet = new Set(pure);
  return {
    name,
    entry(member) {
      if (Object.hasOwn(calls, member)) return { call: calls[member], pure: pureSet.has(member), ...(classes[member] ? { construct: classes[member] } : {}), ...(faults[member] ? { onFault: faults[member] } : {}) };
      if (Object.hasOwn(classes, member)) return { call: (args) => { throw worldError(TypeError, `Class constructor ${member} cannot be invoked without 'new'`); }, construct: classes[member], pure: true };
      if (Object.hasOwn(values, member)) return { value: values[member] };
      if (objects.includes(member)) return { object: true };
      return dynamic ? dynamic(member) : null;
    },
  };
}
