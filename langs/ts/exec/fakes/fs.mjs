// `fs`: an in-memory file tree. What the unit writes it reads back; what it never touched is drawn once, by the seed
// and the absolute path (absent, a file whose text is one of the unit's own strings, or an empty folder), and kept from
// then on, so a unit meets both a missing file and a present one across its inputs, and the same on both sides. Errors
// are Node's: ENOENT, EEXIST, ENOTDIR, EISDIR, ENOTEMPTY with Node's code, errno, syscall, path and message. The sync
// form, the promise form (`fs.promises`, `fs/promises`) and the callback form are the same operation on the same tree.
//
// The folders `/`, `/app` (the working directory), `/tmp` and `/home/lean` exist. A folder on the way to a path the unit
// asks about, and not decided yet, is a folder (something is asked for inside it); a folder the tree holds as absent, or
// a file in its place, fails as Node fails (ENOENT, ENOTDIR). A folder the run made began empty: what is in it is what
// the run put there. A folder's listing is what the tree holds in it.
//
// Which error: the kernel's path walk (path_resolution(7)) comes first. Every folder on the way to the path is looked up
// from the root down, and the first one that is not a folder decides: ENOENT when it is absent, ENOTDIR when it is a
// file (so `stat('/a/x')` with `/a` a file is ENOTDIR, `/a/b/x` with `/a` a file and `/a/b` absent too). Only a walk
// that reaches the last folder asks the operation's own question of the last component (ENOENT, EEXIST, EISDIR, ...).
import nodePath from 'node:path';
import { fileURLToPath } from 'node:url';
import { drawOf, drawnString, nodeError, worldPromise, nodeCallback, listOf, methodOf, entries, worldError } from './common.mjs';
import { resolveIn } from './path.mjs';

const P = nodePath.posix;
const ROOTS = ['/', '/app', '/tmp', '/home', '/home/lean'];

function tree(env) {
  const nodes = new Map(); // absolute path -> { kind: 'file', data: Buffer, mtime } | { kind: 'dir', mtime } | { kind: 'absent' }
  let tick = 0;
  const now = () => 1700000000000 + (++tick);
  for (const r of ROOTS) nodes.set(r, { kind: 'dir', mtime: 1700000000000 });
  // an undecided folder on the way to a path the unit asks about is a folder (something is asked for inside it), unless
  // a decided ancestor rules it out (absent, a file, or a folder the run made, which began empty)
  const folder = (p) => {
    const parent = P.dirname(p);
    const up = parent === p ? { kind: 'dir' } : nodes.has(parent) ? nodes.get(parent) : folder(parent);
    const n = up.kind === 'dir' && !up.made ? { kind: 'dir', mtime: 1700000000000 } : { kind: 'absent' };
    nodes.set(p, n); return n;
  };
  // what the world holds at a path the run never touched: drawn once, by the seed and the path, then kept
  const at = (p) => {
    if (nodes.has(p)) return nodes.get(p);
    const parent = P.dirname(p);
    const up = parent === p ? { kind: 'dir' } : nodes.has(parent) ? nodes.get(parent) : folder(parent);
    if (up.kind !== 'dir' || up.made) { const n = { kind: 'absent' }; nodes.set(p, n); return n; } // inside a file, an absent folder, or a folder this run made (it began empty): nothing
    const u = drawOf(env, `fs:${p}`);
    const n = u < 0.45 ? { kind: 'absent' } : u < 0.85 ? { kind: 'file', data: Buffer.from(drawnString(env, `fs:${p}`), 'utf8'), mtime: 1700000000000 } : { kind: 'dir', mtime: 1700000000000 };
    nodes.set(p, n); return n;
  };
  // the path walk: null when every folder on the way to p is a folder, else the error of the first that is not
  const walk = (p) => {
    const ups = []; for (let q = P.dirname(p); ; q = P.dirname(q)) { ups.unshift(q); if (P.dirname(q) === q) break; }
    for (const q of ups) { const n = nodes.has(q) ? nodes.get(q) : folder(q); if (n.kind === 'absent') return 'ENOENT'; if (n.kind === 'file') return 'ENOTDIR'; }
    return null;
  };
  // the node at p once the walk reached it; a walk that fails throws its error, for the syscall that failed
  const reach = (p, syscall, shownPath, ...more) => { const e = walk(p); if (e) throw nodeError(e, syscall, shownPath, ...more); return at(p); };
  const listing = (p) => [...nodes.keys()].filter((k) => k !== p && P.dirname(k) === p && nodes.get(k).kind !== 'absent').map((k) => P.basename(k)).sort();
  return { nodes, at, walk, reach, listing, now };
}

// a path argument as Node reads it: a string, a Buffer, a file: URL; relative to the working directory
const pathArg = (x) => {
  if (typeof x === 'string') return resolveIn(x);
  if (Buffer.isBuffer(x)) return resolveIn(x.toString('utf8'));
  if (x instanceof URL || (x && typeof x === 'object' && typeof x.href === 'string' && x.protocol === 'file:')) return resolveIn(fileURLToPath(x.href));
  throw worldError(TypeError, `The "path" argument must be of type string or an instance of Buffer or URL. Received ${x === null ? 'null' : typeof x}`, { code: 'ERR_INVALID_ARG_TYPE' });
};
const encodingOf = (o) => (typeof o === 'string' ? o : o && typeof o === 'object' ? o.encoding ?? null : null);
const dataOf = (d, o) => (typeof d === 'string' ? Buffer.from(d, encodingOf(o) ?? 'utf8') : Buffer.isBuffer(d) ? Buffer.from(d) : ArrayBuffer.isView(d) ? Buffer.from(d.buffer, d.byteOffset, d.byteLength) : Buffer.from(String(d), 'utf8'));
const shown = (x) => (typeof x === 'string' ? x : Buffer.isBuffer(x) ? x.toString() : x?.href ?? String(x));

export function fsModel(env) {
  const t = tree(env);
  const stats = (n) => {
    const file = n.kind === 'file';
    const s = { size: file ? n.data.length : 4096, mode: file ? 0o100644 : 0o40755, mtimeMs: n.mtime, mtime: new Date(n.mtime), ctimeMs: n.mtime, birthtimeMs: n.mtime, isFile: methodOf('Stats.isFile', () => file), isDirectory: methodOf('Stats.isDirectory', () => !file), isSymbolicLink: methodOf('Stats.isSymbolicLink', () => false) };
    return s;
  };
  // the operations, each on raw arguments, returning the value the sync form returns
  const ops = {
    readFile(a) {
      const p = pathArg(a[0]), n = t.reach(p, 'open', shown(a[0]));
      if (n.kind === 'absent') throw nodeError('ENOENT', 'open', shown(a[0]));
      if (n.kind === 'dir') throw nodeError('EISDIR', 'read', shown(a[0]));
      const enc = encodingOf(a[1]);
      return enc ? n.data.toString(enc) : Buffer.from(n.data);
    },
    writeFile(a) {
      const p = pathArg(a[0]), n = t.reach(p, 'open', shown(a[0]));
      const flag = a[2] && typeof a[2] === 'object' ? a[2].flag : undefined;
      if (flag === 'wx' && n.kind !== 'absent') throw nodeError('EEXIST', 'open', shown(a[0])); // O_CREAT | O_EXCL: anything there
      if (n.kind === 'dir') throw nodeError('EISDIR', 'open', shown(a[0]));
      const data = dataOf(a[1], a[2]);
      t.nodes.set(p, { kind: 'file', data: flag === 'a' && n.kind === 'file' ? Buffer.concat([n.data, data]) : data, mtime: t.now() });
      return undefined;
    },
    appendFile(a) {
      const p = pathArg(a[0]), n = t.reach(p, 'open', shown(a[0]));
      if (n.kind === 'dir') throw nodeError('EISDIR', 'open', shown(a[0]));
      t.nodes.set(p, { kind: 'file', data: Buffer.concat([n.kind === 'file' ? n.data : Buffer.alloc(0), dataOf(a[1], a[2])]), mtime: t.now() });
      return undefined;
    },
    exists(a) { let p; try { p = pathArg(a[0]); } catch { return false; } return !t.walk(p) && t.at(p).kind !== 'absent'; },
    access(a) { const p = pathArg(a[0]); if (t.reach(p, 'access', shown(a[0])).kind === 'absent') throw nodeError('ENOENT', 'access', shown(a[0])); return undefined; },
    stat(a) { return statAt(a, 'stat'); },
    lstat(a) { return statAt(a, 'lstat'); },
    mkdir(a) {
      const p = pathArg(a[0]), recursive = !!(a[1] && typeof a[1] === 'object' && a[1].recursive);
      // recursive (Node's MKDirp): a file on the way is ENOTDIR; an absent folder on the way is made, with every one below it
      const e = t.walk(p);
      if (e && !(recursive && e === 'ENOENT')) throw nodeError(e, 'mkdir', shown(a[0]));
      const n = t.at(p);
      // something at the path itself: EEXIST, except a folder asked for recursively, which is there already
      if (n.kind === 'dir' && recursive) return undefined;
      if (n.kind !== 'absent') throw nodeError('EEXIST', 'mkdir', shown(a[0]));
      if (!recursive) { t.nodes.set(p, { kind: 'dir', made: true, mtime: t.now() }); return undefined; }
      // every missing folder from the top (the walk found no file on the way), the first one made is the answer
      const chain = []; for (let q = p; t.at(q).kind === 'absent'; q = P.dirname(q)) chain.unshift(q);
      for (const c of chain) t.nodes.set(c, { kind: 'dir', made: true, mtime: t.now() });
      return chain[0];
    },
    readdir(a) {
      const p = pathArg(a[0]), n = t.reach(p, 'scandir', shown(a[0]));
      if (n.kind === 'absent') throw nodeError('ENOENT', 'scandir', shown(a[0]));
      if (n.kind === 'file') throw nodeError('ENOTDIR', 'scandir', shown(a[0]));
      const names = t.listing(p);
      if (a[1] && typeof a[1] === 'object' && a[1].withFileTypes) return listOf(env, names.map((name) => { const k = t.nodes.get(P.join(p, name)).kind; return { name, parentPath: p, path: p, isFile: methodOf('Dirent.isFile', () => k === 'file'), isDirectory: methodOf('Dirent.isDirectory', () => k === 'dir'), isSymbolicLink: methodOf('Dirent.isSymbolicLink', () => false) }; }));
      return listOf(env, names);
    },
    unlink(a) { const p = pathArg(a[0]), n = t.reach(p, 'unlink', shown(a[0])); if (n.kind === 'absent') throw nodeError('ENOENT', 'unlink', shown(a[0])); if (n.kind === 'dir') throw nodeError('EISDIR', 'unlink', shown(a[0])); t.nodes.set(p, { kind: 'absent' }); return undefined; },
    rmdir(a) {
      const p = pathArg(a[0]), n = t.reach(p, 'rmdir', shown(a[0]));
      if (n.kind === 'absent') throw nodeError('ENOENT', 'rmdir', shown(a[0]));
      if (n.kind === 'file') throw nodeError('ENOTDIR', 'rmdir', shown(a[0]));
      if (t.listing(p).length && !a[1]?.recursive) throw nodeError('ENOTEMPTY', 'rmdir', shown(a[0]));
      removeUnder(p); return undefined;
    },
    rm(a) {
      // rm starts with an lstat; `force` forgives ENOENT alone (a file on the way is still ENOTDIR)
      const p = pathArg(a[0]), o = a[1] && typeof a[1] === 'object' ? a[1] : {}, e = t.walk(p), n = e ? { kind: 'absent' } : t.at(p);
      if (e === 'ENOTDIR') throw nodeError('ENOTDIR', 'lstat', shown(a[0]));
      if (n.kind === 'absent') { if (o.force) return undefined; throw nodeError('ENOENT', 'lstat', shown(a[0])); }
      if (n.kind === 'dir' && !o.recursive) throw worldError(Error, `Path is a directory: rm returned EISDIR (is a directory) ${shown(a[0])}`, { code: 'ERR_FS_EISDIR' });
      removeUnder(p); return undefined;
    },
    rename(a) {
      // rename(2): both walks, then the traps (a folder into itself EINVAL, onto its own ancestor ENOTEMPTY), then the kinds
      const from = pathArg(a[0]), to = pathArg(a[1]), sh = [shown(a[0]), shown(a[1])], n = t.reach(from, 'rename', ...sh);
      if (n.kind === 'absent') throw nodeError('ENOENT', 'rename', ...sh);
      const m = t.reach(to, 'rename', ...sh);
      if (from === to) return undefined;
      if (to.startsWith(from + '/')) throw nodeError('EINVAL', 'rename', ...sh);
      if (from.startsWith(to + '/')) throw nodeError('ENOTEMPTY', 'rename', ...sh);
      if (n.kind === 'file' && m.kind === 'dir') throw nodeError('EISDIR', 'rename', ...sh);
      if (n.kind === 'dir' && m.kind === 'file') throw nodeError('ENOTDIR', 'rename', ...sh);
      if (n.kind === 'dir' && m.kind === 'dir' && t.listing(to).length) throw nodeError('ENOTEMPTY', 'rename', ...sh);
      removeUnder(to); // what was at the new name is replaced
      const moved = [...t.nodes.entries()].filter(([k, v]) => (k === from || k.startsWith(from + '/')) && v.kind !== 'absent');
      removeUnder(from);
      for (const [k, v] of moved) t.nodes.set(to + k.slice(from.length), v);
      return undefined;
    },
    copyFile(a) {
      const from = pathArg(a[0]), to = pathArg(a[1]), sh = [shown(a[0]), shown(a[1])], n = t.reach(from, 'copyfile', ...sh);
      if (n.kind === 'absent') throw nodeError('ENOENT', 'copyfile', ...sh);
      if (n.kind === 'dir') throw nodeError('EISDIR', 'copyfile', ...sh);
      if (t.reach(to, 'copyfile', ...sh).kind === 'dir') throw nodeError('EISDIR', 'copyfile', ...sh);
      t.nodes.set(to, { kind: 'file', data: Buffer.from(n.data), mtime: t.now() });
      return undefined;
    },
    realpath(a) { const p = pathArg(a[0]); if (t.reach(p, 'realpath', shown(a[0])).kind === 'absent') throw nodeError('ENOENT', 'realpath', shown(a[0])); return p; },
  };
  // stat and lstat: `throwIfNoEntry: false` answers undefined where there is no entry, ENOENT or ENOTDIR alike (Node's binding)
  function statAt(a, syscall) {
    const p = pathArg(a[0]), e = t.walk(p), n = e ? null : t.at(p), code = e ?? (n.kind === 'absent' ? 'ENOENT' : null);
    if (!code) return stats(n);
    if (a[1]?.throwIfNoEntry === false) return undefined;
    throw nodeError(code, syscall, shown(a[0]));
  }
  function removeUnder(p) { for (const k of [...t.nodes.keys()]) if (k === p || k.startsWith(p + '/')) t.nodes.set(k, { kind: 'absent' }); }
  const calls = {};
  for (const [name, op] of Object.entries(ops)) {
    calls[`${name}Sync`] = (args) => op(args);
    calls[`promises.${name}`] = (args, self, k, path) => worldPromise(env, path, k, () => op(args));
    // the callback form: the last argument is the callback; existsSync's callback form takes (exists) alone
    calls[name] = (args, self, k, path) => {
      const cb = args.length && typeof args[args.length - 1] === 'function' ? args[args.length - 1] : null;
      const rest = cb ? args.slice(0, -1) : args;
      if (!cb) throw worldError(TypeError, 'The "cb" argument must be of type function. Received undefined', { code: 'ERR_INVALID_ARG_TYPE' });
      if (name === 'exists') { const v = op(rest); Promise.resolve().then(() => { try { cb(v); } catch (e) { env.record('callback-throw', path, [String(e && e.message)]); } }); return undefined; }
      nodeCallback(env, path, cb, () => op(rest));
      return undefined;
    };
  }
  delete calls['promises.exists']; // fs.promises has no exists
  // a drawn fault (fake.mjs: the world's unknown failures, EIO and the like) reaches the unit as the form reports a failure
  const faults = {};
  for (const name of Object.keys(ops)) {
    faults[`promises.${name}`] = (error, args, k, path) => worldPromise(env, path, k, () => { throw error; });
    faults[name] = (error, args, k, path) => { const cb = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : null; if (!cb) throw error; if (name === 'exists') { Promise.resolve().then(() => cb(false)); return undefined; } nodeCallback(env, path, cb, () => { throw error; }); return undefined; };
  }
  const values = { constants: () => ({ F_OK: 0, R_OK: 4, W_OK: 2, X_OK: 1 }), 'promises.constants': () => ({ F_OK: 0, R_OK: 4, W_OK: 2, X_OK: 1 }) };
  return { ...entries({ name: 'fs', calls, values, faults, objects: ['promises'] }), tree: t };
}
