#!/usr/bin/env node
// lean census environment: why a unit's module or global name does not resolve, by kind, and the install that
// gives a census copy its own pinned dependency graph.
//   node census-env.mjs group <census.json> [--root <dir>] [--out <table.json>] [--md <table.md>]
// `group` reads a saved census (census.mjs --out) and puts every `unresolved-module` finding in exactly one kind:
//   builtin        a Node built-in module (`fs`, `node:fs`): its declarations come from @types/node
//   workspace      a package of the repository's own workspace (pnpm-workspace.yaml or package.json workspaces)
//   alias          a name the governing tsconfig's own `paths` map
//   lockfile       a package the repository's lockfile pins
//   relative       a relative path whose file is absent (generated: under a generated folder or gitignored)
//   absent         a package no lockfile, workspace or alias names
//   member         the module resolved but lacks the named export (a version or an entry-point mismatch)
//   global-node    a Node global (`process`, `__dirname`, `Buffer`, `NodeJS`): @types/node
//   global-lib     an ECMAScript or DOM global the configured `lib`/`target` leaves out (`Promise`, `Set`, `console`)
//   global-types   an ambient namespace another @types package declares (`PDFKit`)
//   root-dir       a file outside the project's `rootDir` (lean maps workspace packages to their source)
// and names the state of the package where one applies: installed (its folder is on the node_modules chain from the
// file), installed-incomplete (the folder is there, the entry its package.json names is not), or not installed. A
// governing tsconfig whose `extends` cannot be read is named on every finding under it: its options were lost.
import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { ts, workspacePaths, pathsKeyMatches, parseProjectConfig } from './common.mjs';

const BUILTIN = new Set(builtinModules.flatMap((m) => [m, `node:${m}`]));
const NODE_GLOBALS = new Set(['process', '__dirname', '__filename', 'Buffer', 'require', 'module', 'exports', 'global', 'NodeJS', 'setImmediate', 'clearImmediate']);

// the module a diagnostic names, or null when it names a global
export function moduleOf(msg) {
  const m = /module (?:path )?'([^']+)'/i.exec(msg) ?? /^TS\d+: '"([^"]+)"'/.exec(msg) ?? /Module '"([^"]+)"'/.exec(msg);
  return m ? m[1] : null;
}
export function packageName(spec) {
  if (spec.startsWith('node:')) return spec;
  const p = spec.split('/');
  return spec.startsWith('@') ? p.slice(0, 2).join('/') : p[0];
}
const globalOf = (msg) => (/Cannot find (?:name|namespace) '([^']+)'/.exec(msg) ?? /requires the '([^']+)' constructor/.exec(msg))?.[1] ?? null;

// the lockfile governing a root: the root's own, else the one beside the install its node_modules link reaches
export function lockfileOf(root) {
  const names = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lock', 'bun.lockb'];
  const dirs = [root];
  const nm = path.join(root, 'node_modules');
  try { if (fs.lstatSync(nm).isSymbolicLink()) dirs.push(path.dirname(fs.realpathSync(nm))); } catch { /* no install */ }
  for (const d of dirs) for (const n of names) if (fs.existsSync(path.join(d, n))) return path.join(d, n);
  return null;
}

// every package name a lockfile pins (its importers' dependencies and its package entries)
export function lockedNames(lockfile) {
  const out = new Set();
  if (!lockfile) return out;
  const txt = fs.readFileSync(lockfile, 'utf8');
  const base = path.basename(lockfile);
  if (base === 'package-lock.json') {
    const j = JSON.parse(txt);
    for (const k of Object.keys(j.packages ?? {})) { const i = k.lastIndexOf('node_modules/'); if (i >= 0) out.add(k.slice(i + 13)); }
    for (const k of Object.keys(j.dependencies ?? {})) out.add(k);
  } else if (base === 'pnpm-lock.yaml') {
    // package keys (`/name@1.2.3:`, `'@s/name@1.2.3':`, `name@1.2.3(peer):`) and importer dependency keys (`name:` / `'@s/n':`)
    for (const m of txt.matchAll(/^ {2,}['"]?\/?((?:@[^/'"\s]+\/)?[^@'"\s:/][^@'"\s:]*)@[^:\s]*['"]?:\s*$/gm)) out.add(m[1]);
    for (const m of txt.matchAll(/^ {6}['"]?((?:@[^/'"\s]+\/)?[^@'"\s:/][^'"\s:]*)['"]?:\s*$/gm)) out.add(m[1]);
  } else if (base === 'yarn.lock') {
    for (const m of txt.matchAll(/^"?((?:@[^/"\s]+\/)?[^@"\s,]+)@/gm)) out.add(m[1]);
  } else if (base === 'bun.lock') {
    for (const m of txt.matchAll(/^\s+"((?:@[^/"\s]+\/)?[^@"\s]+)": \["/gm)) out.add(m[1]);
  }
  return out;
}

// the package folder on the node_modules chain from a file, with whether its entry file exists
export function installState(fromAbs, pkg) {
  let dir = path.dirname(fromAbs);
  for (;;) {
    const p = path.join(dir, 'node_modules', pkg);
    if (fs.existsSync(path.join(p, 'package.json'))) {
      let j = {}; try { j = JSON.parse(fs.readFileSync(path.join(p, 'package.json'), 'utf8')); } catch { /* unreadable manifest */ }
      const entries = [j.types, j.typings, j.main, typeof j.exports === 'string' ? j.exports : null].filter(Boolean);
      const dot = j.exports && typeof j.exports === 'object' ? (j.exports['.'] ?? j.exports) : null;
      const walk = (v) => { if (typeof v === 'string') entries.push(v); else if (v && typeof v === 'object') for (const x of Object.values(v)) walk(x); };
      if (dot && typeof dot === 'object') walk(dot);
      if (!entries.length) entries.push('index.js');
      const any = entries.some((e) => fs.existsSync(path.join(p, e)) || fs.existsSync(path.join(p, e + '.js')) || fs.existsSync(path.join(p, e, 'index.js')));
      return any ? 'installed' : 'installed-incomplete';
    }
    const up = path.dirname(dir); if (up === dir) return 'not-installed'; dir = up;
  }
}

// a tsconfig's own declared options (no lean additions) and whether its `extends` chain read
const configCache = new Map();
export function declaredConfig(cfg) {
  if (!cfg) return { paths: {}, extendsError: null };
  if (configCache.has(cfg)) return configCache.get(cfg);
  // read as lean reads it (common.mjs parseProjectConfig: an `extends` into the workspace reads the package's folder)
  const parsed = parseProjectConfig(cfg);
  let res = { paths: {}, extendsError: null };
  if (parsed) {
    const ext = parsed.errors.find((e) => e.code === 6053 || e.code === 5083);
    res = { paths: parsed.options.paths ?? {}, extendsError: ext ? ts.flattenDiagnosticMessageText(ext.messageText, ' ').slice(0, 160) : null };
  }
  configCache.set(cfg, res);
  return res;
}

export const GENERATED = /(^|[\\/])(generated|__generated__|@generated|gen)([\\/]|$)|\.gen\./;

export function classifier(root) {
  const lockfile = lockfileOf(root);
  const locked = lockedNames(lockfile);
  const ws = workspacePaths(root);
  const wsNames = new Set((ws?.packages ?? []).map(([n]) => n));
  return {
    lockfile,
    classify(fileAbs, msg) {
      const code = Number(/^TS(\d+)/.exec(msg)?.[1]);
      const cfg = ts.findConfigFile(path.dirname(fileAbs), ts.sys.fileExists, 'tsconfig.json') ?? null;
      const conf = declaredConfig(cfg);
      const base = { code, config: cfg ? path.relative(root, cfg) : null, configExtendsError: conf.extendsError };
      if (code === 6059) return { ...base, kind: 'root-dir', name: null };
      const spec = moduleOf(msg);
      if (spec) {
        const pkg = packageName(spec);
        if (code === 2305 || code === 2724 || code === 2306) return { ...base, kind: 'member', name: spec, install: spec.startsWith('.') ? null : installState(fileAbs, pkg) };
        if (BUILTIN.has(spec) || BUILTIN.has(pkg)) return { ...base, kind: 'builtin', name: spec };
        if (spec.startsWith('.') || spec.startsWith('/')) {
          const gen = GENERATED.test(spec);
          return { ...base, kind: 'relative', name: spec, generated: gen };
        }
        if (pathsKeyMatches(Object.keys(conf.paths), spec)) return { ...base, kind: 'alias', name: spec };
        if (wsNames.has(pkg)) return { ...base, kind: 'workspace', name: spec, install: installState(fileAbs, pkg) };
        if (locked.has(pkg)) return { ...base, kind: 'lockfile', name: spec, install: installState(fileAbs, pkg) };
        return { ...base, kind: 'absent', name: spec, install: installState(fileAbs, pkg) };
      }
      const g = globalOf(msg);
      if (code === 2705 || code === 2583 || code === 2584) return { ...base, kind: 'global-lib', name: g ?? 'Promise' };
      if (g && NODE_GLOBALS.has(g)) return { ...base, kind: 'global-node', name: g };
      if (code === 2503) return { ...base, kind: 'global-types', name: g };
      return { ...base, kind: 'global-lib', name: g };
    },
  };
}

// group one saved census: per kind (findings, units, top names), per name, and one bucket per unit (its first finding)
export function group(census, rootOverride = null) {
  const root = rootOverride ?? census.root;
  const C = classifier(root);
  const kinds = new Map(), names = new Map(), unitBucket = new Map(), states = new Map();
  let findings = 0;
  for (const r of census.records) {
    if (!r.findings) continue;
    const abs = path.join(root, r.file);
    for (const f of r.findings) {
      if (f.rule !== 'unresolved-module') continue;
      findings++;
      const c = C.classify(abs, f.msg);
      const unit = r.units.find((u) => u.lines[0] <= f.line && f.line <= u.lines[1])?.name;
      const ukey = unit ? `${r.file}:${unit}` : null;
      const kindKey = c.kind + (c.generated ? ' (generated)' : '');
      const K = kinds.get(kindKey) ?? { kind: kindKey, findings: 0, units: new Set(), names: new Map(), install: new Map(), extendsLost: 0 };
      K.findings++; if (ukey) K.units.add(ukey);
      if (c.configExtendsError) K.extendsLost++;
      const nm = c.name ?? '(none)'; K.names.set(nm, (K.names.get(nm) ?? 0) + 1);
      if (c.install) K.install.set(c.install, (K.install.get(c.install) ?? 0) + 1);
      kinds.set(kindKey, K);
      const N = names.get(`${kindKey}|${nm}`) ?? { kind: kindKey, name: nm, findings: 0, units: new Set(), install: c.install ?? null, example: `${r.file}:${f.line}` };
      N.findings++; if (ukey) N.units.add(ukey); names.set(`${kindKey}|${nm}`, N);
      if (c.configExtendsError) states.set(c.config, c.configExtendsError);
      if (ukey && !unitBucket.has(ukey)) unitBucket.set(ukey, kindKey);
    }
  }
  const oneBucket = new Map(); for (const k of unitBucket.values()) oneBucket.set(k, (oneBucket.get(k) ?? 0) + 1);
  return {
    root, lockfile: C.lockfile, findings, units: unitBucket.size,
    kinds: [...kinds.values()].map((K) => ({ kind: K.kind, findings: K.findings, units: K.units.size, firstBucketUnits: oneBucket.get(K.kind) ?? 0, findingsUnderLostExtends: K.extendsLost,
      install: Object.fromEntries(K.install), topNames: [...K.names.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8) })).sort((a, b) => b.units - a.units),
    names: [...names.values()].map((N) => ({ ...N, units: N.units.size })).sort((a, b) => b.units - a.units),
    configsWithLostExtends: Object.fromEntries(states),
  };
}

export function groupMarkdown(label, g) {
  const L = [`### ${label}`, '', `Root: \`${g.root}\`. Lockfile: \`${g.lockfile ?? 'none'}\`. Findings: ${g.findings}. Units with at least one: ${g.units}.`, '',
    '| Kind | Units (any finding) | Units (first finding) | Findings | Under a tsconfig whose extends was lost | Package state | Top names |', '| --- | ---: | ---: | ---: | ---: | --- | --- |'];
  for (const k of g.kinds) L.push(`| ${k.kind} | ${k.units} | ${k.firstBucketUnits} | ${k.findings} | ${k.findingsUnderLostExtends} | ${Object.entries(k.install).map(([s, n]) => `${s} ${n}`).join(', ')} | ${k.topNames.map(([n, c]) => `\`${n}\` ${c}`).join(', ')} |`);
  const lost = Object.entries(g.configsWithLostExtends);
  if (lost.length) { L.push('', 'Tsconfigs whose `extends` did not read:', ''); for (const [c, e] of lost) L.push(`- \`${c}\`: ${e}`); }
  L.push('');
  return L.join('\n');
}

// ---- install: the repository's own pinned graph, its own package manager, frozen, no package script ever runs ----

const LOCKFILES = ['pnpm-lock.yaml', 'package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'bun.lock', 'bun.lockb'];
export const STAMP = '.lean-census-install.json'; // inside node_modules: removed with it, so a fresh install is a fresh stamp

// the command that installs a root from its lockfile, frozen, scripts off; null when the root has no lockfile
export function installCommand(root, { cache } = {}) {
  const lock = LOCKFILES.find((n) => fs.existsSync(path.join(root, n)));
  if (!lock) return null;
  let pj = {}; try { pj = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); } catch { /* no manifest */ }
  const pinned = typeof pj.packageManager === 'string' ? pj.packageManager.split('+')[0] : null; // `pnpm@10.14.0+sha512...`
  const exactNode = /^\d+\.\d+\.\d+$/.test(pj.engines?.node ?? '') ? pj.engines.node : null;
  if (lock === 'pnpm-lock.yaml') {
    // the pnpm the repository pins, through corepack (a lockfile is read by the major that wrote it); else the local pnpm
    const argv = pinned?.startsWith('pnpm@') ? ['corepack', pinned, 'install'] : ['pnpm', 'install'];
    argv.push('--frozen-lockfile', '--ignore-scripts', '--prefer-offline');
    // an exact engines.node fails pnpm's engine check on another patch release; no code runs, so the check is told the pin
    if (exactNode && exactNode !== process.versions.node) argv.push(`--config.node-version=${exactNode}`);
    return { lock, manager: pinned ?? 'pnpm (local)', argv };
  }
  if (lock === 'package-lock.json' || lock === 'npm-shrinkwrap.json') {
    const argv = ['npm', 'ci', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-offline', '--engine-strict=false'];
    if (cache) argv.push('--cache', cache); // a cache of the census's own (the user's cache may hold entries it cannot write)
    return { lock, manager: 'npm', argv };
  }
  if (lock === 'yarn.lock') {
    const berry = pinned?.startsWith('yarn@') && !pinned.startsWith('yarn@1');
    const argv = pinned?.startsWith('yarn@') ? ['corepack', pinned, 'install'] : ['corepack', 'yarn@1.22.22', 'install'];
    argv.push(berry ? '--immutable' : '--frozen-lockfile');
    if (!berry) argv.push('--ignore-scripts');
    return { lock, manager: pinned ?? 'yarn 1', argv, env: berry ? { YARN_ENABLE_SCRIPTS: '0' } : {} };
  }
  return { lock, manager: 'bun', argv: ['bun', 'install', '--frozen-lockfile', '--ignore-scripts'] };
}

export const sha256 = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

// install a root once per lockfile content. Returns the stamp: {lock, lockSha, manager, command, exit, stderr?, seconds}.
// `under`: the folder installs may write in; a root outside it is never installed (its stamp says so).
export function ensureInstalled(root, { under, cache, log = () => {}, force = false } = {}) {
  const abs = path.resolve(root);
  const plan = installCommand(abs, { cache });
  if (!plan) return { status: 'no-lockfile' };
  const base = { lock: plan.lock, lockSha: sha256(path.join(abs, plan.lock)), manager: plan.manager, command: plan.argv.join(' ') };
  if (!under || !(abs + path.sep).startsWith(path.resolve(under) + path.sep)) return { ...base, status: 'outside-install-folder' };
  const stampFile = path.join(abs, 'node_modules', STAMP);
  if (!force && fs.existsSync(stampFile)) {
    try { const st = JSON.parse(fs.readFileSync(stampFile, 'utf8')); if (st.lockSha === base.lockSha && st.command === base.command) return { ...st, status: st.exit === 0 ? 'installed' : 'install-failed', reused: true }; /* a failure is retried only with force */ } catch { /* reinstall */ }
  }
  log(`install ${abs}: ${base.command}`);
  const t0 = Date.now();
  const r = spawnSync(plan.argv[0], plan.argv.slice(1), { cwd: abs, encoding: 'utf8', env: { ...process.env, COREPACK_ENABLE_DOWNLOAD_PROMPT: '0', ...(plan.env ?? {}) }, maxBuffer: 256 * 1024 * 1024 });
  const stamp = { ...base, exit: r.status ?? (r.error ? -1 : -2), seconds: Math.round((Date.now() - t0) / 1000), date: new Date().toISOString() };
  if (stamp.exit !== 0) {
    stamp.stderr = String(r.stderr || r.error?.message || '').split('\n').filter(Boolean).slice(-15).join('\n');
    stamp.stdoutTail = String(r.stdout || '').split('\n').filter(Boolean).slice(-5).join('\n');
  }
  fs.mkdirSync(path.join(abs, 'node_modules'), { recursive: true }); // the stamp's home, also after a failed install
  fs.writeFileSync(stampFile, JSON.stringify(stamp, null, 1));
  return { ...stamp, status: stamp.exit === 0 ? 'installed' : 'install-failed' };
}

// remove every node_modules folder of a root the install step may write (a root inside `under`): the disk budget keeps
// one installed root at a time. Returns the folders removed.
export function cleanInstall(root, under) {
  const abs = path.resolve(root);
  if (!under || !(abs + path.sep).startsWith(path.resolve(under) + path.sep)) return [];
  const removed = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory() || e.isSymbolicLink()) continue;
      const p = path.join(dir, e.name);
      if (e.name === 'node_modules') { fs.rmSync(p, { recursive: true, force: true }); removed.push(p); }
      else if (e.name !== '.git') walk(p);
    }
  };
  walk(abs);
  return removed;
}

// the rules each unit carries in one census: file:name:line -> Set(rule); env marks the environment-only rules
export function unitRules(census) {
  const out = new Map();
  for (const r of census.records) {
    if (!r.units) continue;
    for (const u of r.units) {
      const set = new Set();
      for (const f of r.findings) if (u.lines[0] <= f.line && f.line <= u.lines[1]) set.add(f.rule);
      out.set(`${r.file}:${u.name}:${u.lines[0]}`, set);
    }
  }
  return out;
}

// two censuses of one root: totals, per rule units before/after/left/joined, and the units that moved out of
// `unresolved-module`: clean now (no rule at all), or still stopped by another rule (not a gain)
export function diff(a, b) {
  const A = unitRules(a), B = unitRules(b);
  const rules = new Set(); for (const m of [A, B]) for (const s of m.values()) for (const r of s) rules.add(r);
  const perRule = [];
  for (const rule of rules) {
    let before = 0, after = 0, left = 0, joined = 0;
    for (const [k, s] of A) { if (s.has(rule)) { before++; if (!B.get(k)?.has(rule)) left++; } }
    for (const [k, s] of B) { if (s.has(rule)) { after++; if (!A.get(k)?.has(rule)) joined++; } }
    if (before || after) perRule.push({ rule, before, after, left, joined });
  }
  perRule.sort((x, y) => y.before + y.after - (x.before + x.after));
  const moved = { leftUnresolved: 0, cleanNow: 0, stillStopped: new Map(), onlyUnresolvedBefore: 0, onlyUnresolvedBeforeCleanNow: 0 };
  for (const [k, s] of A) {
    if (!s.has('unresolved-module')) continue;
    const t = B.get(k); if (!t) continue;
    if (s.size === 1) { moved.onlyUnresolvedBefore++; if (t.size === 0) moved.onlyUnresolvedBeforeCleanNow++; }
    if (t.has('unresolved-module')) continue;
    moved.leftUnresolved++;
    if (t.size === 0) moved.cleanNow++;
    else for (const r of t) moved.stillStopped.set(r, (moved.stillStopped.get(r) ?? 0) + 1);
  }
  const missing = [...A.keys()].filter((k) => !B.has(k)).length, added = [...B.keys()].filter((k) => !A.has(k)).length;
  return {
    before: { units: a.units, entered: a.entered, files: a.files, failedFiles: a.failedFiles, seconds: a.seconds },
    after: { units: b.units, entered: b.entered, files: b.files, failedFiles: b.failedFiles, seconds: b.seconds },
    unitsOnlyBefore: missing, unitsOnlyAfter: added,
    moved: { ...moved, stillStopped: Object.fromEntries([...moved.stillStopped].sort((x, y) => y[1] - x[1])) },
    perRule,
  };
}

export function diffMarkdown(label, d) {
  const L = [`### ${label}`, '',
    `Units ${d.before.units} -> ${d.after.units}; entered ${d.before.entered} -> ${d.after.entered}; files unreadable ${d.before.failedFiles} -> ${d.after.failedFiles}; seconds ${d.before.seconds} -> ${d.after.seconds}.`, '',
    `Units that left \`unresolved-module\`: ${d.moved.leftUnresolved}; of these clean now (no rule): ${d.moved.cleanNow}; still stopped by another rule: ${d.moved.leftUnresolved - d.moved.cleanNow} (${Object.entries(d.moved.stillStopped).slice(0, 6).map(([r, n]) => `${r} ${n}`).join(', ')}).`, '',
    '| Rule | Units before | Units after | Left | Joined |', '| --- | ---: | ---: | ---: | ---: |'];
  for (const r of d.perRule) if (r.left || r.joined || r.before >= 20) L.push(`| ${r.rule} | ${r.before} | ${r.after} | ${r.left} | ${r.joined} |`);
  L.push('');
  return L.join('\n');
}

if (process.argv[1] && new URL(import.meta.url).pathname === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  if (a[0] === 'group') {
    const census = JSON.parse(fs.readFileSync(a[1], 'utf8'));
    const g = group(census, opt('--root', null));
    if (opt('--out', null)) fs.writeFileSync(opt('--out'), JSON.stringify(g, null, 1));
    const md = groupMarkdown(opt('--label', path.basename(census.root)), g);
    if (opt('--md', null)) fs.writeFileSync(opt('--md'), md);
    console.log(md);
  } else if (a[0] === 'install') {
    const st = ensureInstalled(a[1], { under: opt('--under', null), cache: opt('--cache', null), force: a.includes('--force'), log: (m) => console.error(m) });
    console.log(JSON.stringify(st, null, 1));
    process.exit(st.status === 'installed' || st.status === 'no-lockfile' || st.status === 'outside-install-folder' ? 0 : 1);
  } else if (a[0] === 'clean') {
    const removed = cleanInstall(a[1], opt('--under', null));
    console.log(`removed ${removed.length} node_modules folders under ${a[1]}`);
  } else if (a[0] === 'diff') {
    const d = diff(JSON.parse(fs.readFileSync(a[1], 'utf8')), JSON.parse(fs.readFileSync(a[2], 'utf8')));
    if (opt('--out', null)) fs.writeFileSync(opt('--out'), JSON.stringify(d, null, 1));
    console.log(diffMarkdown(opt('--label', path.basename(a[2])), d));
  } else { console.error('usage: census-env.mjs group <census.json> [--root dir] [--out json] [--md md] [--label name] | diff <before.json> <after.json> [--out json] [--label name]'); process.exit(2); }
}
