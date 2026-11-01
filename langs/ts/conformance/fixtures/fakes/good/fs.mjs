// A minimal fs fake (fixture until w2b's exec/fakes/fs.mjs lands): an in-memory tree seeded from the recording
// (recording.fs: absolute path -> content; its parents are directories), sync and promise forms, Node's error codes as
// Linux gives them; every call recorded. `previousWrite` builds the deliberately wrong variant (../wrong).
import nodePath from 'node:path';
import { Buffer } from 'node:buffer';
import { render } from '../../../../exec/fake.mjs';

export const specifier = 'node:fs';
const fail = (code, syscall, p) => Object.assign(new Error(`${code}: ${syscall} '${p}'`), { code, syscall, path: p });
const bytesOf = (data, enc) => (typeof data === 'string' ? Buffer.from(data, enc && typeof enc === 'string' ? enc : enc?.encoding ?? 'utf8') : Buffer.from(data));
const encOf = (o) => (typeof o === 'string' ? o : o?.encoding ?? null);

export function makeFs(env, recording = {}, { previousWrite = false } = {}) {
  const root = { dir: new Map() };
  let lastWrite = Buffer.alloc(0), priorWrite = Buffer.alloc(0); // the wrong variant's memory: the write before the latest
  const parts = (p) => nodePath.resolve(String(p)).split('/').filter(Boolean);
  const walk = (p, syscall) => { // the node at p, or null when the last part is absent; a missing or non-directory parent throws
    const ps = parts(p); let n = root;
    for (let i = 0; i < ps.length; i++) {
      if (!n.dir) throw fail('ENOTDIR', syscall, p);
      const next = n.dir.get(ps[i]);
      if (!next) { if (i === ps.length - 1) return { node: null, parent: n, name: ps[i] }; throw fail('ENOENT', syscall, p); }
      n = next;
    }
    return { node: n, parent: null, name: ps.at(-1) ?? null, up: ps.length ? walk('/' + ps.slice(0, -1).join('/'), syscall).node : null };
  };
  const lookup = (p, syscall) => { const w = walk(p, syscall); if (!w.node) throw fail('ENOENT', syscall, p); return w; };
  const write = (p, data, opt, append) => {
    const w = walk(p, append ? 'open' : 'open');
    if (w.node?.dir) throw fail('EISDIR', 'open', p);
    const b = bytesOf(data, opt);
    const now = w.node && append ? Buffer.concat([w.node.file, b]) : b;
    if (w.node) w.node.file = now; else w.parent.dir.set(w.name, { file: now });
    priorWrite = lastWrite; lastWrite = now;
  };
  const read = (p, opt) => { const { node } = lookup(p, 'open'); if (node.dir) throw fail('EISDIR', 'read', p); const b = previousWrite ? priorWrite : node.file; const e = encOf(opt); return e ? b.toString(e) : Buffer.from(b); };
  const mkdir = (p, opt) => {
    const recursive = typeof opt === 'object' && opt?.recursive;
    if (!recursive) { const w = walk(p, 'mkdir'); if (w.node) throw fail('EEXIST', 'mkdir', p); w.parent.dir.set(w.name, { dir: new Map() }); return undefined; }
    let n = root, first; const ps = parts(p);
    for (let i = 0; i < ps.length; i++) {
      if (!n.dir) throw fail('ENOTDIR', 'mkdir', p);
      let next = n.dir.get(ps[i]);
      if (!next) { next = { dir: new Map() }; n.dir.set(ps[i], next); first ??= '/' + ps.slice(0, i + 1).join('/'); }
      n = next;
    }
    if (!n.dir) throw fail(first === undefined ? 'EEXIST' : 'ENOTDIR', 'mkdir', p);
    return first;
  };
  const detach = (p) => { const ps = parts(p); const up = walk('/' + ps.slice(0, -1).join('/'), 'rm').node; up.dir.delete(ps.at(-1)); };
  const unlink = (p) => { const { node } = lookup(p, 'unlink'); if (node.dir) throw fail('EISDIR', 'unlink', p); detach(p); };
  const rmdir = (p) => { const { node } = lookup(p, 'rmdir'); if (!node.dir) throw fail('ENOTDIR', 'rmdir', p); if (node.dir.size) throw fail('ENOTEMPTY', 'rmdir', p); detach(p); };
  const rm = (p, opt = {}) => {
    let w; try { w = walk(p, 'rm'); } catch (e) { if (opt.force && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) return; throw e; }
    if (!w.node) { if (opt.force) return; throw fail('ENOENT', 'rm', p); }
    if (w.node.dir && !opt.recursive) throw Object.assign(new Error(`Path is a directory: rm returned EISDIR (is a directory) ${p}`), { code: 'ERR_FS_EISDIR' });
    detach(p);
  };
  const readdir = (p) => { const { node } = lookup(p, 'scandir'); if (!node.dir) throw fail('ENOTDIR', 'scandir', p); return [...node.dir.keys()]; };
  const stat = (p) => { const { node } = lookup(p, 'stat'); const isDir = !!node.dir; return { isFile: () => !isDir, isDirectory: () => isDir, size: isDir ? 4096 : node.file.length }; };
  const exists = (p) => { try { return !!walk(p, 'access').node; } catch { return false; } };
  const rename = (a, b) => {
    const { node } = lookup(a, 'rename'); const w = walk(b, 'rename');
    const pa = nodePath.resolve(a), pb = nodePath.resolve(b);
    if (pa === pb) return;
    if (node.dir && (pb + '/').startsWith(pa + '/')) throw fail('EINVAL', 'rename', a);
    if (w.node) { if (node.dir && !w.node.dir) throw fail('ENOTDIR', 'rename', a); if (!node.dir && w.node.dir) throw fail('EISDIR', 'rename', a); if (w.node.dir?.size) throw fail('ENOTEMPTY', 'rename', a); }
    detach(a); const ps = parts(b); walk('/' + ps.slice(0, -1).join('/'), 'rename').node.dir.set(ps.at(-1), node);
  };
  for (const [p, content] of Object.entries(recording.fs ?? {})) { mkdir(nodePath.dirname(p), { recursive: true }); write(p, content); }
  lastWrite = priorWrite = Buffer.alloc(0);
  const rec = (name, f) => function (...args) { env.record('call', `module:fs.${name}`, args.map((x) => render(x))); return f(...args); };
  const sync = { readFileSync: read, writeFileSync: (p, d, o) => write(p, d, o, false), appendFileSync: (p, d, o) => write(p, d, o, true), existsSync: exists, mkdirSync: mkdir, unlinkSync: unlink, rmdirSync: rmdir, rmSync: rm, readdirSync: readdir, statSync: stat, renameSync: rename };
  const out = {}; for (const [k, f] of Object.entries(sync)) out[k] = rec(k, f);
  const promises = {}; for (const [k, f] of Object.entries(sync)) if (k !== 'existsSync') { const name = k.replace(/Sync$/, ''); promises[name] = rec(`promises.${name}`, async (...a) => f(...a)); }
  out.promises = promises;
  return out;
}
export const create = (env, recording) => makeFs(env, recording);
