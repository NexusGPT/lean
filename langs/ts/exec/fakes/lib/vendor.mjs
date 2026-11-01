#!/usr/bin/env node
// Vendors the CommonJS closure of a published package into exec/fakes/lib/vendor/<package>/ (design/w2d-library-rows.md).
// A library fake runs the package's own code, loaded into the unit's sandbox (load.mjs), so its pure functions are the
// package's functions and its world contact (Date, Math.random, timers, a required core module) is lean's world. This
// tool copies, from an installed copy, the files an entry reaches through relative `require` calls, the package's
// licence and `package.json`, and writes `manifest.json`: the version, the licence, the entries, every file's sha256
// and the bare specifiers the closure requires (each answered by the environment at load time, never vendored).
//
//   node exec/fakes/lib/vendor.mjs --from <node_modules> --package <name> --entry <path in the package> [--entry ...]
//                                  [--subpath <export>=<path in the package>]...
//
// --subpath names an import specifier below the package (`dayjs/plugin/utc`) and the file it loads; the package's own
// main entry is the first --entry. Rerunning replaces the folder.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const all = (k) => argv.flatMap((a, i) => (a === k ? [argv[i + 1]] : []));
const one = (k) => all(k)[0] ?? null;
const from = one('--from'), pkg = one('--package'), entries = all('--entry'), subpaths = all('--subpath');
if (!from || !pkg || !entries.length) { console.error('usage: vendor.mjs --from <node_modules> --package <name> --entry <file> [--entry <file>]... [--subpath <spec>=<file>]...'); process.exit(2); }
const src = path.join(from, pkg);
const meta = JSON.parse(fs.readFileSync(path.join(src, 'package.json'), 'utf8'));
const out = path.join(here, 'vendor', pkg);
fs.rmSync(out, { recursive: true, force: true });

// a relative require resolved as Node resolves it inside the package: the file, the file with an extension, a folder's index
function resolveIn(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const c of [base, `${base}.js`, `${base}.cjs`, `${base}.json`, path.join(base, 'index.js'), path.join(base, 'index.cjs')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  throw new Error(`${path.relative(src, fromFile)}: cannot resolve ${spec}`);
}
const REQUIRE = /\brequire\(\s*(['"])([^'"]+)\1\s*\)/g;
const files = new Map(), externals = new Set();
const queue = [...entries, ...subpaths.map((s) => s.split('=')[1])].map((e) => path.join(src, e));
while (queue.length) {
  const f = queue.shift();
  if (files.has(f)) continue;
  const text = fs.readFileSync(f, 'utf8');
  files.set(f, text);
  if (f.endsWith('.json')) continue;
  for (const m of text.matchAll(REQUIRE)) { if (m[2].startsWith('.')) queue.push(resolveIn(f, m[2])); else externals.add(m[2]); }
}
const sha = (s) => createHash('sha256').update(s).digest('hex');
const manifest = {
  package: pkg, version: meta.version, license: meta.license, from: `https://registry.npmjs.org/${pkg}/-/${pkg.split('/').pop()}-${meta.version}.tgz`,
  main: entries[0], subpaths: Object.fromEntries(subpaths.map((s) => s.split('='))), externals: [...externals].sort(), files: {},
};
for (const [f, text] of [...files].sort(([a], [b]) => (a < b ? -1 : 1))) {
  const rel = path.relative(src, f);
  fs.mkdirSync(path.dirname(path.join(out, rel)), { recursive: true });
  fs.writeFileSync(path.join(out, rel), text);
  manifest.files[rel] = sha(text);
}
const lic = fs.readdirSync(src).find((n) => /^licen[cs]e/i.test(n));
if (lic) fs.copyFileSync(path.join(src, lic), path.join(out, lic));
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
const bytes = [...files.values()].reduce((s, t) => s + t.length, 0);
console.log(`${pkg}@${meta.version}: ${files.size} files, ${bytes} bytes, externals: ${manifest.externals.join(', ') || 'none'}`);
