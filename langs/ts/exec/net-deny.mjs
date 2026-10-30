// The network-denied mode of lane B (LEAN_NET=deny; design/sandbox-boundary.md). The unit's code runs in a vm context
// whose fetch is a fake, but a host intrinsic the context holds (Buffer's constructor is the process's own Function)
// reaches the process, and the process's network is open: this Node's permission model has no network switch (it came
// with --allow-net in Node 25). So the mode denies at the process's own bindings: every JavaScript door to a socket or a
// name lookup (net, and through it tls, http, http2 and the process's fetch; dgram; dns) fails with ERR_ACCESS_DENIED
// before a socket exists, and the attempt is kept for the unit's record. The doors below the JavaScript layer
// (process.binding) are the permission model's: it refuses them under --permission (the probe log).
import net from 'node:net';
import dgram from 'node:dgram';
import dns from 'node:dns';

const MODES = new Set(['open', 'deny']);
// the mode the environment names: LEAN_NET unset is open; any value but open or deny is an error, never a guess
export function netMode(env = process.env) {
  const v = env.LEAN_NET ?? 'open';
  if (!MODES.has(v)) throw new Error(`LEAN_NET must be open or deny, not ${JSON.stringify(v)}`);
  return v;
}

const attempts = [];
let installed = false;
export const networkDenied = () => installed;
export const deniedAttempts = () => attempts;

const denial = (api) => Object.assign(new Error(`${api} ERR_ACCESS_DENIED: the network is denied (LEAN_NET=deny)`), { code: 'ERR_ACCESS_DENIED', permission: 'Net' });
// the target of a connect or listen call, in any of Node's argument forms: an options object, (port, host), a path
const targetOf = (args) => {
  const a = Array.isArray(args[0]) ? args[0][0] : args[0]; // net's internal normalized form passes [options, cb]
  if (a && typeof a === 'object') return a.path !== undefined ? String(a.path) : `${a.host ?? 'localhost'}:${a.port ?? ''}`;
  if (typeof a === 'string' && !/^\d+$/.test(a)) return a;
  return `${typeof args[1] === 'string' ? args[1] : 'localhost'}:${a ?? ''}`;
};
const seal = (obj, key, fn) => Object.defineProperty(obj, key, { value: fn, writable: false, configurable: false, enumerable: false });

// install the deny once per process; side() names the side running when an attempt is made (the record's crumb)
export function denyNetwork({ side = () => null } = {}) {
  if (installed) return;
  installed = true;
  const note = (api, target) => { const e = denial(api); attempts.push({ api, target, side: side() ?? null, failed: e.code }); return e; };
  // a socket fails as a refused connection does: the error is emitted on the socket, after the caller attached its handlers
  seal(net.Socket.prototype, 'connect', function (...args) { const e = note('net.connect', targetOf(args)); process.nextTick(() => this.destroy(e)); return this; });
  seal(net.Server.prototype, 'listen', function (...args) { const e = note('net.listen', targetOf(args)); process.nextTick(() => this.emit('error', e)); return this; });
  const sendTarget = (args) => { const nums = args.slice(1).filter((x) => typeof x === 'number'); return `${args.slice(1).find((x) => typeof x === 'string') ?? 'localhost'}:${nums.length ? nums[nums.length - 1] : ''}`; }; // send(msg, [offset, length,] port, [address], [cb]): the port is the last number
  for (const m of ['bind', 'connect', 'send']) seal(dgram.Socket.prototype, m, function (...args) { throw note(`dgram.${m}`, m === 'send' ? sendTarget(args) : targetOf(args)); });
  const lookups = ['lookup', 'lookupService', 'resolve', 'resolve4', 'resolve6', 'resolveAny', 'resolveCaa', 'resolveCname', 'resolveMx', 'resolveNaptr', 'resolveNs', 'resolvePtr', 'resolveSoa', 'resolveSrv', 'resolveTxt', 'reverse'];
  for (const m of lookups) {
    const callback = function (name, ...rest) { const e = note(`dns.${m}`, String(name)); const cb = rest.findLast((x) => typeof x === 'function'); if (!cb) throw e; process.nextTick(cb, e); };
    const promised = function (name) { return Promise.reject(note(`dns.${m}`, String(name))); };
    if (typeof dns[m] === 'function') seal(dns, m, callback);
    if (typeof dns.Resolver.prototype[m] === 'function') seal(dns.Resolver.prototype, m, callback);
    if (typeof dns.promises[m] === 'function') seal(dns.promises, m, promised);
    if (typeof dns.promises.Resolver.prototype[m] === 'function') seal(dns.promises.Resolver.prototype, m, promised);
  }
}

// the record's entry for the mode: what holds the deny in this process, and every attempt refused since `from`. Without
// the permission model (a run in lean's own process, a unit with no parent) the raw bindings stay open to code that leaves
// the vm context, and the entry says so
export function sandboxEntry(from = 0) {
  const perm = typeof process.permission === 'object' && process.permission !== null;
  const by = !perm ? 'lean\'s bindings only: this process runs without the permission model, so the raw bindings are not refused' : netFlags('open').length ? 'the permission model and lean\'s bindings' : 'lean\'s bindings under the permission model (this Node has no --allow-net)';
  return { network: 'deny', by, denied: attempts.slice(from) };
}

// the flag the worker's Node takes for the mode: a Node whose permission model has a network switch denies the network
// under --permission unless --allow-net is given, so the open mode passes it and the deny mode leaves it out
export const netFlags = (mode) => (mode === 'open' && process.allowedNodeEnvironmentFlags.has('--allow-net') ? ['--allow-net'] : []);
