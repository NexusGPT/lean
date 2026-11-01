// Loads a vendored package (vendor.mjs, vendor/<package>/manifest.json) into one side's sandbox (design/w2d-library-rows.md).
// The package's files are compiled in the side's context (exec/run.mjs sandbox, env.ctx), so every global the package
// reads is the global the unit reads: `Date` is the seeded clock, `Math.random` the seeded generator, `setTimeout` the
// virtual clock, an unset global the bridge fake. A relative require loads the package's own vendored file; a bare
// require is answered by the environment (`env.module`), as the unit's own require is, so a core module the package
// asks for is the world's. Each file's text is checked against the manifest's sha256 before it is compiled: a vendored
// file that was edited is refused, never run. One module cache per side and package: the package's module state (a
// registered plugin, a global error map) is that side's.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const VENDOR = path.join(here, 'vendor');
const manifests = new Map();
export function manifestOf(pkg) {
  if (!manifests.has(pkg)) { const f = path.join(VENDOR, pkg, 'manifest.json'); manifests.set(pkg, fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null); }
  return manifests.get(pkg);
}
// a file's text, checked once per process against its manifest hash
const texts = new Map();
export function vendoredText(pkg, rel) {
  const key = `${pkg}/${rel}`;
  if (texts.has(key)) return texts.get(key);
  const m = manifestOf(pkg);
  if (!m || !Object.hasOwn(m.files, rel)) throw new Error(`library fake: ${key} is not a vendored file`);
  const text = fs.readFileSync(path.join(VENDOR, pkg, rel), 'utf8');
  const sha = createHash('sha256').update(text).digest('hex');
  if (sha !== m.files[rel]) throw new Error(`library fake: ${key} differs from its manifest (sha256 ${sha.slice(0, 12)}, recorded ${m.files[rel].slice(0, 12)})`);
  texts.set(key, text);
  return text;
}
const resolveRel = (pkg, fromRel, spec) => {
  const m = manifestOf(pkg), base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
  for (const c of [base, `${base}.js`, `${base}.cjs`, `${base}.json`, `${base}/index.js`, `${base}/index.cjs`]) if (Object.hasOwn(m.files, c)) return c;
  throw new Error(`library fake: ${pkg}/${fromRel} requires ${spec}, which is not vendored`);
};
// the compiled code cache of a file, per process: a side compiles each file once, with V8's cached data after the first
const cachedData = new Map();
// the bare specifiers a package's model answers itself (uuid's `crypto`: the seeded generator), by package
const overrides = new Map();
export function overrideRequire(pkg, spec, make) { overrides.set(`${pkg}\0${spec}`, make); }
// require(rel) of `pkg` inside env's sandbox: the module's exports
export function requireVendored(env, pkg, rel) {
  if (!env.ctx) return null; // no sandbox yet (a module asked for while the sandbox is built): the recording proxy answers
  const cache = (env.vendoredModules ??= new Map());
  const key = `${pkg}/${rel}`;
  if (cache.has(key)) return cache.get(key).exports;
  const text = vendoredText(pkg, rel);
  const mod = { exports: {} };
  cache.set(key, mod);
  if (rel.endsWith('.json')) { mod.exports = JSON.parse(text); return mod.exports; }
  const filename = `lean-vendor:${key}`;
  const fn = vm.compileFunction(text, ['exports', 'require', 'module', '__filename', '__dirname'], { parsingContext: env.ctx, filename, cachedData: cachedData.get(key), produceCachedData: !cachedData.has(key) });
  if (fn.cachedDataProduced && fn.cachedData) cachedData.set(key, fn.cachedData);
  const req = (spec) => {
    if (spec.startsWith('.')) return requireVendored(env, pkg, resolveRel(pkg, rel, spec));
    const own = overrides.get(`${pkg}\0${spec}`);
    if (!own) return env.module(spec);
    const made = (env.vendoredOverrides ??= new Map()), k = `${pkg}\0${spec}`;
    if (!made.has(k)) made.set(k, own(env));
    return made.get(k);
  };
  fn.call(mod.exports, mod.exports, req, mod, filename, path.posix.dirname(filename));
  return mod.exports;
}
