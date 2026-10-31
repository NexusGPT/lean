// The sandbox list of a project (design/sandbox-allow-list.md): `.gate/sandbox.json`, read from the PARENT commit of the
// change (git show <commit>:.gate/sandbox.json, never the working tree, so a change cannot widen its own list). It is the
// file DA's build sandbox reads (DA research/open-code-review/d3/harness/sandbox_allow.py), in the same vocabulary:
// `install` and `process_list` are DA's fields, `read`, `write` and `spawn` are lane B's, each `{ allow, deny }`.
//
//   read.allow / read.deny     paths lane B's process may read beyond the trees it is given / paths it may not, even there
//   write.allow / write.deny   paths it may write (default none beyond LEAN_LIBRARY_CASES) / paths it may not
//   spawn.allow / spawn.deny   programs it may start (default none) / programs it may not, even when allowed
//   install.allow.lockfile     true: a package the lockfile beside a node_modules folder pins is given to the run
//   install.allow.packages     packages given even when the lockfile does not pin them
//   install.allow.tools        DA's build's system tools; lane B reads it not (its programs are spawn's)
//   install.deny               names always refused: a package of node_modules, and a program spawn would start
//   process_list               "real": the run may list this machine's processes; "hidden": it may not
//
// Absent file: today's sandbox, unchanged (no row, no package filtered, no program, the process list hidden as the
// permission model already holds it). A file present: every name it refuses is a row of the certificate,
// `sandbox: refused <kind> <name> by <rule>`; what it refuses at the start (a path, a package) is named when the run's
// flags are made, a program the unit's code tries to start when it tries.
import fs from 'node:fs';
import path from 'node:path';
import module from 'node:module';
import { spawnSync } from 'node:child_process';
import childProcess from 'node:child_process';
import { createHash } from 'node:crypto';

export const LIST_PATH = '.gate/sandbox.json';
const PROCESS_LIST = ['real', 'hidden'];
const LANE_FIELDS = ['read', 'write', 'spawn'];
export const DEFAULT = Object.freeze({ version: 1, install: { allow: { lockfile: true, packages: [], tools: [] }, deny: [] }, read: { allow: [], deny: [] }, write: { allow: [], deny: [] }, spawn: { allow: [], deny: [] }, process_list: 'hidden' });
const copy = (x) => JSON.parse(JSON.stringify(x));

// the list with every absent field filled from DEFAULT; an unknown field, a wrong type or a bad value throws, naming
// every wrong field: no run is held to a list nobody can read
export function validateList(raw) {
  const errs = [], out = copy(DEFAULT);
  const keys = (obj, where, allowed) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { errs.push(`${where} is not an object`); return false; }
    for (const k of Object.keys(obj).sort()) if (!allowed.includes(k)) errs.push(`${where} has an unknown field ${k}`);
    return true;
  };
  const names = (v, where) => {
    if (!Array.isArray(v) || !v.every((x) => typeof x === 'string' && x)) { errs.push(`${where} is not a list of names`); return []; }
    if (new Set(v).size !== v.length) errs.push(`${where} names one name twice`);
    return [...v];
  };
  if (keys(raw, 'the list', ['version', 'install', 'process_list', ...LANE_FIELDS])) {
    if ((raw.version ?? 1) !== 1) errs.push(`version is ${JSON.stringify(raw.version)}, not 1`);
    const inst = raw.install ?? {};
    if (keys(inst, 'install', ['allow', 'deny'])) {
      const allow = inst.allow ?? {};
      if (keys(allow, 'install.allow', ['lockfile', 'packages', 'tools'])) {
        if (typeof (allow.lockfile ?? true) !== 'boolean') errs.push('install.allow.lockfile is not true or false');
        out.install.allow.lockfile = allow.lockfile ?? true;
        for (const k of ['packages', 'tools']) out.install.allow[k] = names(allow[k] ?? [], `install.allow.${k}`);
      }
      out.install.deny = names(inst.deny ?? [], 'install.deny');
    }
    for (const f of LANE_FIELDS) {
      const v = raw[f] ?? {};
      if (keys(v, f, ['allow', 'deny'])) for (const k of ['allow', 'deny']) out[f][k] = names(v[k] ?? [], `${f}.${k}`);
    }
    const pl = raw.process_list ?? 'hidden';
    if (!PROCESS_LIST.includes(pl)) errs.push(`process_list is ${JSON.stringify(pl)}, not one of ${PROCESS_LIST.join(', ')}`);
    out.process_list = pl;
  }
  if (errs.length) throw new Error(`${LIST_PATH} does not match the schema: ${errs.join('; ')}`);
  return out;
}

export const defaultList = (reason = 'no parent commit given') => ({ list: copy(DEFAULT), source: { kind: 'default', path: LIST_PATH, reason } });

// { list, source } of a run whose parent commit is `commit` in the checkout `repo`: the file at that commit, never the
// working tree; absent there, the default. A git error other than an absent file, a file that is not JSON or does not
// match the schema throws
export function loadSandboxList(repo, commit) {
  if (!repo || !commit) return defaultList();
  const r = spawnSync('git', ['-C', repo, 'show', `${commit}:${LIST_PATH}`], { encoding: 'utf8', env: { ...process.env, LC_ALL: 'C', GIT_TERMINAL_PROMPT: '0' } });
  const sha = spawnSync('git', ['-C', repo, 'rev-parse', '--verify', `${commit}^{commit}`], { encoding: 'utf8' });
  const at = sha.status === 0 ? sha.stdout.trim() : String(commit);
  if (r.status !== 0) {
    if (/does not exist|exists on disk, but not in/.test(r.stderr)) return { list: copy(DEFAULT), source: { kind: 'default', path: LIST_PATH, commit: at, root: path.resolve(repo), reason: `${LIST_PATH} is not in commit ${at}` } };
    throw new Error(`git show ${commit}:${LIST_PATH} in ${repo} failed: ${(r.stderr || r.error?.message || `exit ${r.status}`).trim().slice(-300)}`);
  }
  let raw; try { raw = JSON.parse(r.stdout); } catch (e) { throw new Error(`${LIST_PATH} at ${at} is not JSON: ${e.message}`); }
  const top = spawnSync('git', ['-C', repo, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  return { list: validateList(raw), source: { kind: 'commit', path: LIST_PATH, commit: at, root: top.status === 0 ? top.stdout.trim() : path.resolve(repo), sha256: hashText(r.stdout) } };
}
const hashText = (t) => createHash('sha256').update(t).digest('hex');

// the list every run of this process is held to (pr.mjs and check.mjs set it from the parent commit); absent, the default
let current = null;
export const useSandboxList = (loaded) => { current = loaded; };
export const currentSandboxList = () => current ?? defaultList();

// ----- what a node_modules folder offers, and the lockfile beside it -----
// the package names a lockfile pins: package-lock.json (v1 to v3), pnpm-lock.yaml, yarn.lock; null when there is none
export function lockfilePinned(dir) {
  const read = (f) => { try { return fs.readFileSync(path.join(dir, f), 'utf8'); } catch { return null; } };
  let t = read('package-lock.json');
  if (t !== null) {
    const out = new Set(); let doc = {}; try { doc = JSON.parse(t); } catch { return out; }
    for (const [k, v] of Object.entries(doc.packages ?? {})) { if (k.includes('node_modules/')) out.add(k.split('node_modules/').at(-1)); else if (k && v?.name) out.add(v.name); }
    const walk = (deps) => { for (const [name, v] of Object.entries(deps ?? {})) { out.add(name); walk(v?.dependencies); } };
    walk(doc.dependencies);
    return out;
  }
  t = read('pnpm-lock.yaml');
  if (t !== null) {
    const out = new Set(); let section = null;
    for (const line of t.split('\n')) {
      if (/^\S/.test(line)) { section = line.split(':')[0].trim(); continue; }
      const m = line.match(/^ {2}['"]?\/?((?:@[^/@\s'"]+\/)?[^/@\s'":(]+)[@/]/);
      if ((section === 'packages' || section === 'snapshots') && m) out.add(m[1]);
    }
    return out;
  }
  t = read('yarn.lock');
  if (t !== null) {
    const out = new Set();
    for (const line of t.split('\n')) {
      if (!line || ' #'.includes(line[0]) || !line.trimEnd().endsWith(':')) continue;
      for (let spec of line.trimEnd().slice(0, -1).split(',')) { spec = spec.trim().replace(/^"|"$/g, ''); const at = spec.indexOf('@', 1); if (at > 0) out.add(spec.slice(0, at)); }
    }
    return out;
  }
  return null;
}
// the packages a node_modules folder holds: { name, dir }; the store and the manager's own files (a dot entry) are no package
function packagesIn(nm) {
  const out = [], ls = (d) => { try { return fs.readdirSync(d); } catch { return []; } };
  for (const e of ls(nm)) {
    if (e.startsWith('.')) continue;
    if (e.startsWith('@')) for (const s of ls(path.join(nm, e))) out.push({ name: `${e}/${s}`, dir: path.join(nm, e, s) });
    else out.push({ name: e, dir: path.join(nm, e) });
  }
  return out;
}
// the lockfile that installed a node_modules folder: the nearest one at or above the folder holding it
function lockOf(nm) {
  for (let d = path.dirname(nm); ; d = path.dirname(d)) { const p = lockfilePinned(d); if (p) return p; if (path.dirname(d) === d) return null; }
}
// the rule of one package (DA's order): denied; pinned by the lockfile with allow.lockfile; named in allow.packages; else refused
export function packageRule(list, name, pinned) {
  if (list.install.deny.includes(name)) return 'install.deny';
  if (list.install.allow.lockfile && pinned?.has(name)) return null;
  if (list.install.allow.packages.includes(name)) return null;
  return 'install.allow';
}
// the rule of one program: denied by spawn.deny or install.deny; named in spawn.allow; else refused. A bare name is the
// program PATH finds; a name with a separator is that path, matched as written or resolved
export function spawnRule(spawn, name) {
  const forms = (n) => (n.includes('/') ? [n, path.resolve(n)] : [n]);
  if (forms(name).some((n) => spawn.deny.includes(n))) return spawn.denyRule?.[name] ?? 'spawn.deny';
  return forms(name).some((n) => spawn.allow.includes(n)) ? null : 'spawn.allow';
}

// ----- the paths a process may read, less the ones refused -----
const inside = (p, root) => p === root || p.startsWith(root.endsWith(path.sep) ? root : root + path.sep);
// the read set less the denied paths: a denied path that holds an allowed one removes it; an allowed folder that holds a
// denied path is replaced by its entries along the way down, every one but the one leading to the denied path (the
// permission model has no deny, so the remainder is written as allows); the folders on the way stay unlisted
export function subtractPaths(allowed, denied) {
  let out = [...allowed];
  for (const d of denied) {
    const next = [];
    for (const a of out) {
      if (inside(a, d)) continue; // the whole allowed path is denied
      if (!inside(d, a)) { next.push(a); continue; }
      let dir = a;
      for (const step of path.relative(a, d).split(path.sep)) {
        let entries = []; try { entries = fs.readdirSync(dir); } catch { break; }
        for (const e of entries) if (e !== step) next.push(path.join(dir, e));
        dir = path.join(dir, step);
      }
    }
    out = next;
  }
  return [...new Set(out)];
}
const withReal = (p) => { try { const r = fs.realpathSync(p); return r === p ? [p] : [p, r]; } catch { return [p]; } };

// what the list makes of one run's sandbox: the read and write paths, the programs, and the rows of what it refused.
// `reads` and `writes` are today's sets (run.mjs workerReads, LEAN_LIBRARY_CASES); with the default list they come back
// as they are, with no row
export function applyList(loaded, reads, writes = []) {
  const { list, source } = loaded;
  if (source.kind !== 'commit') return { reads, writes, spawn: null, refused: [] };
  const root = source.root ?? process.cwd();
  const at = (p) => (path.isAbsolute(p) ? path.resolve(p) : path.resolve(root, p));
  const refused = [], row = (kind, name, rule) => refused.push({ kind, name, rule, row: `sandbox: refused ${kind} ${name} by ${rule}` });
  let r = [...reads, ...list.read.allow.map(at)];
  if (list.process_list === 'real' && process.platform === 'linux') r.push('/proc');
  // install: every package of every node_modules folder the run reads meets the rule; a refused one is not given
  const deniedPkgs = [];
  for (const nm of [...new Set(r.filter((p) => path.basename(p) === 'node_modules'))]) {
    const pinned = lockOf(nm);
    for (const pkg of packagesIn(nm)) {
      const rule = packageRule(list, pkg.name, pinned);
      if (!rule) continue;
      if (!refused.some((x) => x.kind === 'install' && x.name === pkg.name)) row('install', pkg.name, rule);
      deniedPkgs.push(pkg.dir);
      const store = path.join(nm, '.pnpm'), enc = pkg.name.replace('/', '+') + '@'; // pnpm's store copy of the package
      try { for (const e of fs.readdirSync(store)) if (e.startsWith(enc)) deniedPkgs.push(path.join(store, e)); } catch { /* no store */ }
    }
  }
  const readDeny = list.read.deny.map(at);
  for (const d of readDeny) if (r.some((a) => inside(a, d) || inside(d, a))) row('read', d, 'read.deny');
  const deny = [...readDeny, ...deniedPkgs].flatMap(withReal);
  r = subtractPaths([...new Set(r.flatMap(withReal))], deny);
  const writeDeny = list.write.deny.map(at);
  let w = [...writes, ...list.write.allow.map(at)];
  for (const d of writeDeny) if (w.some((a) => inside(a, d) || inside(d, a))) row('write', d, 'write.deny');
  w = subtractPaths([...new Set(w)], writeDeny);
  const allow = [...list.spawn.allow, ...(list.process_list === 'real' ? ['ps'] : [])];
  const denyRule = {}; for (const n of list.install.deny) denyRule[n] = 'install.deny'; for (const n of list.spawn.deny) denyRule[n] = 'spawn.deny';
  const spawn = { allow: [...new Set(allow)].filter((n) => !denyRule[n]), deny: Object.keys(denyRule), denyRule };
  for (const n of new Set(allow)) if (denyRule[n]) row('spawn', n, denyRule[n]);
  return { reads: r, writes: w, spawn, refused };
}
export const sourceText = (s) => (s.kind === 'commit' ? `${s.path} of commit ${s.commit} (sha256 ${s.sha256.slice(0, 16)})` : `the default (${s.reason})`);

// ----- the programs, in the process that runs the unit -----
// Every door of child_process is replaced, once per process, by one that starts only a program the list allows; a
// refused one throws ERR_ACCESS_DENIED naming the program and the rule, and is kept for the record. A shell command
// starts the shell: its name is the shell's (sh unless the options name another), so allowing sh allows what it runs.
const spawned = [];
export const spawnRefusals = () => spawned;
let guarded = false;
const programOf = (door, args) => {
  const opts = args.find((a, i) => i > 0 && a && typeof a === 'object' && !Array.isArray(a)) ?? {};
  const shell = (s) => (typeof s === 'string' ? s : '/bin/sh');
  if (door === 'exec' || door === 'execSync') return path.basename(shell(opts.shell));
  if (door === 'fork') return path.basename(opts.execPath ?? process.execPath);
  if (opts.shell) return path.basename(shell(opts.shell));
  return String(args[0]);
};
export function guardSpawn(spawn) {
  if (guarded || !spawn) return;
  guarded = true;
  const seal = (obj, key, fn) => Object.defineProperty(obj, key, { value: fn, writable: false, configurable: false, enumerable: true });
  const check = (door, args) => {
    const name = programOf(door, args), rule = spawnRule(spawn, name);
    if (!rule) return;
    spawned.push({ kind: 'spawn', name, rule, door, row: `sandbox: refused spawn ${name} by ${rule}` });
    throw Object.assign(new Error(`child_process.${door} ERR_ACCESS_DENIED: sandbox: refused spawn ${name} by ${rule} (${LIST_PATH})`), { code: 'ERR_ACCESS_DENIED', permission: 'ChildProcess' });
  };
  for (const door of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) {
    const orig = childProcess[door];
    seal(childProcess, door, function (...args) { check(door, args); return orig.apply(this, args); });
  }
  const proto = childProcess.ChildProcess.prototype, origSpawn = proto.spawn;
  seal(proto, 'spawn', function (o) { check('ChildProcess.spawn', [o?.file ?? '', o]); return origSpawn.call(this, o); });
  module.syncBuiltinESMExports(); // an import of node:child_process sees the guarded doors too
}
