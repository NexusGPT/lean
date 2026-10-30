// Shared helpers for lean-ts: load the vendored TypeScript compiler, build a program (project-aware when a
// tsconfig is found above the file, strict single-file otherwise), and read the proof hints (@decreases,
// @invariant) that a source may carry in comments.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
export const ts = require('./vendor/typescript/lib/typescript.js');
export const here = path.dirname(fileURLToPath(import.meta.url));

export const COMPILER_OPTIONS = {
  strict: true,
  noImplicitReturns: true,
  noFallthroughCasesInSwitch: true,
  noUncheckedIndexedAccess: false,
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ES2020,
  lib: ['lib.es2022.d.ts'],
  types: [],
  noEmit: true,
  skipLibCheck: true,
  allowJs: true,
  checkJs: true, jsx: ts.JsxEmit.ReactJSX, experimentalDecorators: true }; // a file read without its project keeps its legacy decorators (a project's own tsconfig decides otherwise)

// Diagnostics that only say "this file's neighbours are not here". With a project they do not occur; alone
// they would hide the real verdict behind missing modules, so they are reported under their own rule.
export const RESOLUTION_CODES = new Set([2307, 2305, 2306, 2792, 7016, 2688, 6053, 6059, 5083, 2300, 2724, 2875, 2705, 2580, 2583, 2584, 2304, 2503, 1700, 2591, 2694]); // what the checkout failed to resolve or provide (a module, a lib, a global type, the JSX runtime), never a defect of the function

// A name's Dafny identifier: every character outside [A-Za-z0-9_] becomes `_`, a leading `_` takes a `u` before it, and a
// Dafny keyword or a name the prelude declares takes a trailing `_` (a unit `label` is the Dafny function `label_`, its
// lemma `Equal_label_`). The translator names every unit, local and field through it, and check.mjs and the suite name
// a unit's lemmas through it, so a lemma name is never recomputed by a second rule.
export const RESERVED = new Set(['abstract', 'allocated', 'as', 'assert', 'assume', 'bool', 'break', 'by', 'calc', 'case', 'char', 'class', 'codatatype',
  'const', 'constructor', 'datatype', 'decreases', 'else', 'ensures', 'exists', 'expect', 'export', 'extends', 'false', 'forall', 'fp', 'function',
  'ghost', 'if', 'import', 'in', 'include', 'inductive', 'int', 'invariant', 'is', 'iterator', 'label', 'lemma', 'map', 'match', 'method', 'modifies',
  'modify', 'module', 'multiset', 'nameonly', 'nat', 'new', 'newtype', 'null', 'object', 'old', 'opaque', 'predicate', 'print', 'provides', 'reads',
  'real', 'refines', 'requires', 'return', 'returns', 'reveal', 'seq', 'set', 'static', 'string', 'then', 'this', 'trait', 'true', 'type', 'unchanged',
  'var', 'while', 'witness', 'yield', 'yields', 'result', 'Option', 'None', 'Some', 'value', 'Nullish', 'Absent', 'Null', 'Undef', 'PromiseHandle',
  'fresh', 'twostate', 'ORDINAL', 'array', 'iset', 'imap', 'bv', 'least', 'greatest', 'continue', 'default', 'extern', 'exports', 'synthesize', 'opened', 'reveals']);
export const dn = (name) => { let n = name.replace(/[^A-Za-z0-9_]/g, '_'); if (n.startsWith('_')) n = 'u' + n; return RESERVED.has(n) ? `${n}_` : n; };

/**
 * loadProgram(file, {project}) — project: a tsconfig path, true (search upward from the file), or false
 * (single file, strict). Returns {program, sf, checker, diagnostics, abs, projectFile}.
 */
export function loadProgram(file, opts = {}) {
  const abs = path.resolve(file);
  const want = opts.project ?? true;
  let configFile = null;
  if (typeof want === 'string') configFile = path.resolve(want);
  else if (want) configFile = ts.findConfigFile(path.dirname(abs), ts.sys.fileExists, 'tsconfig.json') ?? null;
  let options = { ...COMPILER_OPTIONS, ...projectless(abs) };
  let roots = [abs];
  if (configFile && fs.existsSync(configFile)) {
    const parsed = parseProjectConfig(configFile);
    if (parsed) {
      // the project's own options decide resolution; ours decide strictness and emit
      options = { ...parsed.options, strict: true, noEmit: true, skipLibCheck: true, noImplicitReturns: true, allowJs: true, checkJs: true };
      if (options.jsx === undefined) options.jsx = ts.JsxEmit.ReactJSX; // a project without a jsx setting still parses .tsx
      // a lib file the vendored compiler does not carry would make TypeScript load no lib at all
      if (Array.isArray(options.lib)) {
        const libDir = path.join(here, 'vendor', 'typescript', 'lib');
        options.lib = options.lib.filter((l) => fs.existsSync(path.join(libDir, l)));
        if (!options.lib.length) options.lib = ['lib.es2022.d.ts'];
      }
      delete options.composite; delete options.incremental; delete options.tsBuildInfoFile;
      delete options.rootDir; // an emit layout: nothing is emitted, and a workspace package read from its source lies outside it
      options.configFilePath = configFile; // automatic @types inclusion starts from the config's directory
      workspaceResolution(options, configFile);
      // the file is the root: the compiler follows its imports, which is what a translation needs; the project's own
      // declaration files join it (the globals they declare are part of every file's program)
      roots = [abs, ...projectDeclarations(parsed, abs)];
    } else configFile = null;
  }
  if (!configFile) roots = [...roots, path.join(here, 'ambient.d.ts')]; // structuredClone and the like, declared for a file read without its project
  const program = ts.createProgram(roots, options);
  const sf = program.getSourceFile(abs);
  if (!sf) throw new Error(`cannot read ${file}`);
  const checker = program.getTypeChecker();
  const diagnostics = fileDiagnostics(program, sf);
  return { program, sf, checker, diagnostics, abs, projectFile: configFile };
}

/**
 * loadMany(files) — one program per tsconfig for a whole set of files (a census). Returns a Map abs -> {program, sf,
 * checker, diagnostics, abs, projectFile}; a file whose project cannot read it maps to {error}.
 */
export function loadMany(files, opts = {}) {
  const out = new Map();
  for (const part of loadManyChunks(files, opts)) for (const [k, v] of part) out.set(k, v);
  return out;
}

// One GiB is a last-resort source/declaration guard, not a chunking target.
// Keep the normal project/1200-root grouping: a smaller byte target repeats
// large shared declaration closures. Type-graph expansion is bounded in the lint.
// An indivisible import closure is still read whole and reported, never truncated.
export const PROGRAM_SOURCE_BUDGET_BYTES = 1024 * 1024 * 1024;
const CHUNK_OVER_BUDGET = Symbol('compiler source budget');

// loadManyChunks: the same, one Map per byte-bounded chunk of one project.
export function* loadManyChunks(files, opts = {}) {
  const groups = new Map(); // configFile|'' -> [abs]
  for (const f of files) {
    const abs = path.resolve(f);
    const cfg = opts.project === false ? null : (ts.findConfigFile(path.dirname(abs), ts.sys.fileExists, 'tsconfig.json') ?? null);
    // a file without a project groups with the files that see the same installed declarations
    const k = cfg ?? `\0${typeRootsFrom(path.dirname(abs)).join('\0')}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(abs);
  }
  const budget = opts.sourceByteBudget ?? PROGRAM_SOURCE_BUDGET_BYTES;
  if (!Number.isSafeInteger(budget) || budget <= 0) throw new Error('sourceByteBudget must be a positive integer');
  const cap = opts.chunk ?? 1200; // preserve the original project grouping; bytes are a final guard
  if (cap !== Infinity && (!Number.isSafeInteger(cap) || cap <= 0)) throw new Error('chunk must be a positive integer');
  for (const [cfg, absList] of groups) {
    let roots = [], bytes = 0;
    for (const abs of absList) {
      let size = 0; try { size = fs.statSync(abs).size; } catch { /* loadChunk reports unreadable sources */ }
      if (roots.length && (bytes + size > budget || roots.length >= cap)) { yield* boundedChunks(cfg, roots, opts, budget); roots = []; bytes = 0; }
      roots.push(abs); bytes += size;
    }
    if (roots.length) yield* boundedChunks(cfg, roots, opts, budget);
  }
}
function* boundedChunks(cfg, roots, opts, budget) {
  const loaded = loadChunk(cfg, roots, opts, budget);
  if (loaded !== CHUNK_OVER_BUDGET) { yield loaded; return; }
  const half = Math.ceil(roots.length / 2);
  opts.log?.(`split project ${cfg || '(none)'}: ${roots.length} roots exceed ${budget} source/declaration bytes`);
  yield* boundedChunks(cfg, roots.slice(0, half), opts, budget);
  yield* boundedChunks(cfg, roots.slice(half), opts, budget);
}

// End the compiler/checker construction frame before the generator suspends.
// The caller owns the returned Map and clears it before requesting another chunk.
function loadChunk(cfg, absList, opts, budget) {
  const out = new Map();
  const project = cfg && !cfg.startsWith('\0') ? cfg : null; // a projectless group is keyed by its type roots (census-env), not a config
  const first = loadProgramOptions(absList[0], project);
  const host = ts.createCompilerHost(first.options);
  const getSourceFile = host.getSourceFile;
  const seen = new Set(); let bytes = 0;
  host.getSourceFile = (...args) => {
    const sf = getSourceFile.apply(host, args);
    if (sf && !seen.has(sf.fileName)) {
      seen.add(sf.fileName); bytes += Buffer.byteLength(sf.text);
      if (bytes > budget && absList.length > 1) throw CHUNK_OVER_BUDGET;
    }
    return sf;
  };
  let program;
  try { program = ts.createProgram([...absList, ...first.declarations.filter((d) => !absList.includes(d))], first.options, host); } // the project's own declaration files join the program (census-env)
  catch (e) { if (e === CHUNK_OVER_BUDGET) return e; for (const a of absList) out.set(a, { error: String(e.message) }); return out; }
  const sourceBytes = program.getSourceFiles().filter(s => !s.isDeclarationFile).reduce((n, s) => n + Buffer.byteLength(s.text), 0);
  const declarationBytes = program.getSourceFiles().filter(s => s.isDeclarationFile).reduce((n, s) => n + Buffer.byteLength(s.text), 0);
  const closure = sourceBytes + declarationBytes > budget ? { sourceBytes, declarationBytes, totalBytes: sourceBytes + declarationBytes, budgetBytes: budget } : null;
  const checker = program.getTypeChecker();
  for (const abs of absList) {
    const sf = program.getSourceFile(abs);
    if (!sf) { out.set(abs, { error: `cannot read ${abs}`, ...(closure ? { closure } : {}) }); continue; }
    let diagnostics;
    try { diagnostics = fileDiagnostics(program, sf); }
    catch (e) { out.set(abs, { error: `diagnostics: ${String(e.message).slice(0, 200)}`, ...(closure ? { closure } : {}) }); continue; }
    out.set(abs, { program, sf, checker, diagnostics, abs, projectFile: project, ...(closure ? { closure } : {}) });
  }
  opts.log?.(`project ${project || '(none)'}: ${absList.length} files, ${sourceBytes} source + ${declarationBytes} declaration bytes${closure ? ' (indivisible closure over budget)' : ''}`);
  return out;
}

// the compiler options loadProgram uses for a file under a config (shared by loadProgram and loadMany)
export function loadProgramOptions(abs, configFile) {
  let options = { ...COMPILER_OPTIONS, ...projectless(abs) };
  let declarations = [];
  if (configFile && fs.existsSync(configFile)) {
    const parsed = parseProjectConfig(configFile);
    if (parsed) {
      declarations = projectDeclarations(parsed, abs);
      options = { ...parsed.options, strict: true, noEmit: true, skipLibCheck: true, noImplicitReturns: true, allowJs: true, checkJs: true };
      if (Array.isArray(options.lib)) {
        const libDir = path.join(here, 'vendor', 'typescript', 'lib');
        options.lib = options.lib.filter((l) => fs.existsSync(path.join(libDir, l)));
        if (!options.lib.length) options.lib = ['lib.es2022.d.ts'];
      }
      delete options.composite; delete options.incremental; delete options.tsBuildInfoFile;
      delete options.rootDir;
      options.configFilePath = configFile;
      workspaceResolution(options, configFile);
    }
  }
  return { options, declarations };
}

// The declaration files a project's own `include`/`files` name (outside node_modules): ambient globals the project
// declares for itself (an `interface AbortSignal` in a both.d.ts), part of the program of every file it holds.
export function projectDeclarations(parsed, abs) {
  return parsed.fileNames.filter((f) => /\.d\.[mc]?ts$/.test(f) && !/[\\/]node_modules[\\/]/.test(f) && path.resolve(f) !== abs).map((f) => path.resolve(f));
}

// The `node_modules/@types` folders TypeScript's default type roots name for a directory: every ancestor's, nearest first.
export function typeRootsFrom(dir) {
  const out = [];
  for (let d = dir; ; d = path.dirname(d)) { const t = path.join(d, 'node_modules', '@types'); if (fs.existsSync(t)) out.push(t); if (path.dirname(d) === d) break; }
  return out;
}

// A file read without a project resolves as the compiler resolves for a bundler (node_modules, package exports), not by
// the Classic walk that never reads node_modules; where an install provides declaration packages, they are visible as
// TypeScript makes them visible by default (every package under the type roots above the file). With no install above
// the file nothing changes: no type roots, no declaration packages.
export function projectless(abs) {
  const typeRoots = typeRootsFrom(path.dirname(abs));
  const o = { moduleResolution: ts.ModuleResolutionKind.Bundler };
  if (typeRoots.length) { o.typeRoots = typeRoots; o.types = undefined; }
  return o;
}

// A tsconfig as TypeScript reads it ({options, errors}), or null when the file itself does not parse. An `extends` that
// names a package of the repository's own workspace reads that package's folder, as the package manager's workspace
// link would, when no node_modules entry provides it: the inherited options (target, lib, moduleResolution) are the
// project's, not the compiler's defaults. An installed entry always wins; a package from outside the workspace is
// never invented.
const projectConfigs = new Map(); // tsconfig -> parsed
export function parseProjectConfig(configFile) {
  const key = `${configFile}\0${fs.statSync(configFile).mtimeMs}`; // a rewritten tsconfig is read again
  if (projectConfigs.has(key)) return projectConfigs.get(key);
  const raw = ts.readConfigFile(configFile, ts.sys.readFile);
  const parsed = raw.error ? null : ts.parseJsonConfigFileContent(raw.config, workspaceLinkHost(path.dirname(configFile)), path.dirname(configFile));
  projectConfigs.set(key, parsed);
  return parsed;
}

// A file-system host on which `<any>/node_modules/<workspace package>/<rest>` that does not exist reads
// `<the package's folder>/<rest>` (the link pnpm, npm and yarn workspaces create). Used to read configurations only.
export function workspaceLinkHost(fromDir) {
  const ws = workspacePaths(fromDir);
  if (!ws || !ws.packages.length) return ts.sys;
  const marker = `${path.sep}node_modules${path.sep}`;
  const linked = (p) => {
    const i = p.lastIndexOf(marker); if (i < 0) return null;
    const rest = p.slice(i + marker.length).split(path.sep).join('/');
    for (const [name, dir] of ws.packages) if (rest === name || rest.startsWith(name + '/')) return path.join(dir, rest.slice(name.length));
    return null;
  };
  const via = (p, test) => { if (test(p)) return p; const l = linked(p); return l && test(l) ? l : null; };
  return {
    ...ts.sys,
    fileExists: (p) => !!via(p, ts.sys.fileExists),
    // a node_modules folder inside the workspace exists for the link even before any install
    directoryExists: (p) => !!via(p, ts.sys.directoryExists) || (path.basename(p) === 'node_modules' && (p + path.sep).startsWith(ws.root + path.sep)),
    readFile: (p, enc) => { const q = via(p, ts.sys.fileExists); return q ? ts.sys.readFile(q, enc) : undefined; },
    realpath: (p) => { const q = via(p, (x) => ts.sys.fileExists(x) || ts.sys.directoryExists(x)); return q ? (ts.sys.realpath ? ts.sys.realpath(q) : q) : p; },
  };
}

// A project's module resolution, as TypeScript reads its tsconfig, plus the workspace's own packages (shared by
// loadProgram and loadProgramOptions). A declared baseUrl is kept; with none, none is set, so `paths` resolve from
// the folder of the tsconfig that declares them (TypeScript's pathsBasePath), never from the workspace root. A
// workspace package resolves to ITS SOURCE in this tree, never to a built dist or a node_modules link that may point
// at another checkout: the proof is about the commit, not the machine. Its entries are absolute targets, so they
// hold whatever the base, and they are added only for a name no declared pattern already matches.
export function workspaceResolution(options, configFile) {
  const ws = workspacePaths(path.dirname(configFile));
  if (!ws) return;
  const declared = Object.keys(options.paths ?? {});
  const matched = (name) => pathsKeyMatches(declared, name);
  options.paths = { ...(options.paths ?? {}) };
  for (const [name, dir] of ws.packages) {
    const src = fs.existsSync(path.join(dir, 'src', 'index.ts')) ? path.join(dir, 'src', 'index.ts') : fs.existsSync(path.join(dir, 'index.ts')) ? path.join(dir, 'index.ts') : null;
    if (src && !matched(name)) options.paths[name] = [src];
    if (!matched(name + '/x')) options.paths[name + '/*'] = [path.join(dir, 'src') + '/*', dir + '/*'];
  }
}

// TypeScript's pattern test for a `paths` key: an exact key, or a key with one `*` whose prefix and suffix both fit
// around the name
export function pathsKeyMatches(keys, name) {
  return keys.some((k) => { const i = k.indexOf('*'); if (i < 0) return k === name; const pre = k.slice(0, i), suf = k.slice(i + 1); return name.length >= pre.length + suf.length && name.startsWith(pre) && name.endsWith(suf); });
}

// A non-relative import the project's own `paths` map to a source file of this tree, resolved as loadProgram resolves
// it (the tsconfig above the importing file, workspaceResolution): the file, else null (a package, a builtin, a
// name no `paths` key matches, a declaration file, anything under node_modules). Lane B's loader asks this.
const aliasOptions = new Map(); // tsconfig -> its compiler options
export function aliasTarget(fromAbs, spec) {
  const cfg = ts.findConfigFile(path.dirname(fromAbs), ts.sys.fileExists, 'tsconfig.json');
  if (!cfg) return null;
  if (!aliasOptions.has(cfg)) aliasOptions.set(cfg, loadProgramOptions(fromAbs, cfg).options);
  const options = aliasOptions.get(cfg);
  if (!options.paths || !pathsKeyMatches(Object.keys(options.paths), spec)) return null;
  const r = ts.resolveModuleName(spec, fromAbs, options, ts.sys).resolvedModule;
  if (!r || r.isExternalLibraryImport || /\.d\.[mc]?ts$/.test(r.resolvedFileName) || /[\\/]node_modules[\\/]/.test(r.resolvedFileName)) return null;
  return r.resolvedFileName;
}

// The pnpm/npm workspace above a directory: {root, packages: [[name, dir]]} or null.
export function workspacePaths(fromDir) {
  let dir = fromDir;
  for (let i = 0; i < 12; i++) {
    const ws = path.join(dir, 'pnpm-workspace.yaml');
    const pj = path.join(dir, 'package.json');
    let globs = null;
    if (fs.existsSync(ws)) {
      const txt = fs.readFileSync(ws, 'utf8');
      globs = [...txt.matchAll(/^\s*-\s*["']?([^"'\n#]+?)["']?\s*$/gm)].map((m) => m[1].trim());
    } else if (fs.existsSync(pj)) {
      try { const j = JSON.parse(fs.readFileSync(pj, 'utf8')); if (Array.isArray(j.workspaces)) globs = j.workspaces; } catch { /* not a workspace root */ }
    }
    if (globs) {
      const packages = [];
      for (const g of globs) {
        if (g.startsWith('!')) continue;
        const base = g.replace(/\/?\*.*$/, '');
        const baseDir = path.join(dir, base);
        if (!fs.existsSync(baseDir)) continue;
        const dirs = g.includes('*') ? fs.readdirSync(baseDir).map((d) => path.join(baseDir, d)) : [baseDir];
        for (const d of dirs) {
          const pkg = path.join(d, 'package.json');
          if (!fs.existsSync(pkg)) continue;
          try { const j = JSON.parse(fs.readFileSync(pkg, 'utf8')); if (j.name) packages.push([j.name, d]); } catch { /* skip */ }
        }
      }
      return { root: dir, packages };
    }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

export function lineOf(sf, pos) {
  return sf.getLineAndCharacterOfPosition(pos).line + 1;
}
export function colOf(sf, pos) {
  return sf.getLineAndCharacterOfPosition(pos).character + 1;
}
export function span(sf, node) {
  return [lineOf(sf, node.getStart(sf)), lineOf(sf, node.getEnd())];
}

// Accepts [[s,e],...], [{start,end}|{from,to}...] or {ranges:[...]}; lines are 1-based and inclusive.
export function readRanges(fs, file) {
  let raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (raw && !Array.isArray(raw) && raw.ranges) raw = raw.ranges;
  if (!Array.isArray(raw)) throw new Error('ranges file must be a JSON array');
  return raw.map((r) => {
    if (Array.isArray(r)) return [Number(r[0]), Number(r[1])];
    return [Number(r.start ?? r.from), Number(r.end ?? r.to)];
  });
}
export function overlaps(sf, node, ranges) {
  if (!ranges) return true;
  const [a, b] = span(sf, node);
  return ranges.some(([s, e]) => s <= b && a <= e);
}

// Proof hints live in the comments just before a loop: `// @decreases <expr>`, `// @invariant <expr>`.
// They are untrusted: the prover checks them, a wrong hint only makes the proof fail.
export function hintsOf(sf, node) {
  const ranges = ts.getLeadingCommentRanges(sf.text, node.getFullStart()) ?? [];
  const out = { decreases: null, invariants: [] };
  for (const r of ranges) {
    const text = sf.text.slice(r.pos, r.end);
    for (const line of text.split('\n')) {
      let m = line.match(/@decreases\s+(.+?)\s*(\*\/)?$/);
      if (m) out.decreases = m[1];
      m = line.match(/@invariant\s+(.+?)\s*(\*\/)?$/);
      if (m) out.invariants.push(m[1]);
    }
  }
  return out;
}

/**
 * A function-like unit at the top level: a function declaration, or `const f = (...) => ...` /
 * `const f = function (...) {...}` (exported or not). Returns a uniform record:
 *   {name, node (the declaration statement), fn (the FunctionDeclaration | ArrowFunction | FunctionExpression),
 *    params, body (Block | expression), typeNode, isAsync, isArrow}
 */
export function unitOf(st) {
  if (ts.isFunctionDeclaration(st) && st.name) {
    return { name: st.name.text, node: st, fn: st, params: st.parameters, body: st.body, typeNode: st.type,
      isAsync: !!st.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword), isArrow: false, generics: st.typeParameters };
  }
  if (ts.isVariableStatement(st) && st.declarationList.declarations.length === 1) {
    const d = st.declarationList.declarations[0];
    const init = d.initializer;
    if (ts.isIdentifier(d.name) && init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) && (st.declarationList.flags & ts.NodeFlags.Const)) {
      return { name: d.name.text, node: st, fn: init, params: init.parameters, body: init.body, typeNode: init.type,
        isAsync: !!init.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword), isArrow: ts.isArrowFunction(init), generics: init.typeParameters };
    }
  }
  return null;
}

export function topLevelFunctions(sf) {
  const map = new Map();
  for (const st of sf.statements) {
    const u = unitOf(st);
    if (u) map.set(u.name, u);
    for (const m of classMethodUnits(st)) map.set(m.name, m);
    for (const m of literalMemberUnits(st)) if (!map.has(m.name)) map.set(m.name, m); // a declared function or class method keeps its name
  }
  for (const u of callbackUnits(sf, map)) map.set(u.name, u);
  return map;
}

/**
 * The object literals a module statement exports or binds to a module-level const, with the binding that names each:
 * `export const X = {...}` and `const X = {...}` (X), `export default {...}` (default), `module.exports = {...}`
 * (exports), `exports.x = {...}` and `module.exports.x = {...}` (x). Parentheses, `as` and `satisfies` are looked through.
 * design/exported-units.md.
 */
export function moduleLiterals(st) {
  const strip = (e) => { while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isTypeAssertionExpression(e) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e)))) e = e.expression; return e; };
  const out = [];
  if (ts.isVariableStatement(st) && (st.declarationList.flags & ts.NodeFlags.Const)) {
    for (const d of st.declarationList.declarations) { const o = strip(d.initializer); if (ts.isIdentifier(d.name) && o && ts.isObjectLiteralExpression(o)) out.push({ binding: d.name.text, literal: o, form: st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ? 'export-const' : 'module-const' }); }
  } else if (ts.isExportAssignment(st) && !st.isExportEquals) {
    const o = strip(st.expression); if (o && ts.isObjectLiteralExpression(o)) out.push({ binding: 'default', literal: o, form: 'export-default' });
  } else if (ts.isExpressionStatement(st) && ts.isBinaryExpression(st.expression) && st.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
    const o = strip(st.expression.right), l = st.expression.left;
    const isModuleExports = (e) => ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'module' && e.name.text === 'exports';
    if (o && ts.isObjectLiteralExpression(o)) {
      if (isModuleExports(l)) out.push({ binding: 'exports', literal: o, form: 'module-exports' });
      else if (ts.isPropertyAccessExpression(l) && ts.isIdentifier(l.name) && ((ts.isIdentifier(l.expression) && l.expression.text === 'exports') || isModuleExports(l.expression))) out.push({ binding: `exports.${l.name.text}`, literal: o, form: 'exports-property' }); // named as code reaches it (`exports.x.m`), never as a module-level `x`, which may be a class or a function of its own
    }
  }
  return out;
}

/**
 * The members of a module literal (moduleLiterals) as units named `<binding>.<key>`: a method, or a function or arrow
 * held by a property. A getter or setter is not a unit: reading the key runs it, a property read, not a call. The key is a static name:
 * an identifier, or a string that is one. The receiver of a unit is the literal (`u.literal`, its type the receiver
 * type): `this.f` is a field of the receiver, `this.m()` the sibling unit `<binding>.m`, as a class method reaches its
 * class (design/exported-units.md). A generator member is a unit as a generator function is; a member without a body is not.
 */
export function literalMemberUnits(st) {
  const out = [];
  for (const { binding, literal, form } of moduleLiterals(st)) {
    for (const p of literal.properties) {
      const key = p.name && (ts.isIdentifier(p.name) || (ts.isStringLiteral(p.name) && /^[A-Za-z_$][\w$]*$/.test(p.name.text))) ? p.name.text : null;
      if (!key) continue;
      let fn = null;
      if (ts.isMethodDeclaration(p)) fn = p;
      else if (ts.isPropertyAssignment(p)) { let i = p.initializer; while (i && ts.isParenthesizedExpression(i)) i = i.expression; if (i && (ts.isFunctionExpression(i) || ts.isArrowFunction(i))) fn = i; }
      if (!fn || !fn.body) continue;
      out.push({ name: `${binding}.${key}`, node: p, fn, params: fn.parameters, body: fn.body, typeNode: fn.type,
        isAsync: !!fn.modifiers?.some((x) => x.kind === ts.SyntaxKind.AsyncKeyword), isArrow: ts.isArrowFunction(fn), generics: fn.typeParameters,
        literal, binding, form, method: key, statement: st });
    }
  }
  return out;
}

/**
 * The methods of a top-level class as units named `Class.method`. A method is a function of an explicit receiver
 * (`self`), its parameters and, when effectful, the world. A constructor with a body is the unit `Class.constructor`
 * (its receiver is the fresh handle `new` allocates). Getters and setters are units named get_<field> and set_<field>; bodiless members are not units.
 */
export function classMethodUnits(st) {
  if (!ts.isClassDeclaration(st) || !st.name) return [];
  const out = [];
  for (const m of st.members) {
    if (ts.isConstructorDeclaration(m) && m.body) { // the constructor: a unit of an explicit receiver (the fresh handle) and the world
      out.push({ name: `${st.name.text}.constructor`, node: m, fn: m, params: m.parameters, body: m.body, typeNode: undefined, isAsync: false, isArrow: false, generics: undefined, cls: st, className: st.name.text, method: 'constructor', isStatic: false, isCtor: true });
      continue;
    }
    if (!(ts.isMethodDeclaration(m) || ts.isGetAccessorDeclaration(m) || ts.isSetAccessorDeclaration(m)) || !m.body || !m.name || !ts.isIdentifier(m.name)) continue;
    const accessor = ts.isGetAccessorDeclaration(m) ? 'get' : ts.isSetAccessorDeclaration(m) ? 'set' : null;
    const unitMethod = accessor ? `${accessor}_${m.name.text}` : m.name.text;
    const isStatic = !!m.modifiers?.some((x) => x.kind === ts.SyntaxKind.StaticKeyword);
    out.push({ name: `${st.name.text}.${unitMethod}`, node: m, fn: m, params: m.parameters, body: m.body, typeNode: m.type,
      isAsync: !!m.modifiers?.some((x) => x.kind === ts.SyntaxKind.AsyncKeyword), isArrow: false, generics: m.typeParameters,
      cls: st, className: st.name.text, method: m.name.text, isStatic, accessor });
  }
  return out;
}

const TF = ts.TypeFlags;
export function isArrayLike(checker, type) {
  if (checker.isArrayType(type) || checker.isTupleType(type)) return true;
  // an interface that extends an array (RegExpMatchArray, a typed result list): the checker's own array-like test
  return typeof checker.isArrayLikeType === 'function' && checker.isArrayLikeType(type) && !(type.flags & (TF.StringLike | TF.Any | TF.Unknown));
}
export function isTuple(checker, type) {
  return checker.isTupleType(type);
}
export function stripUndefined(type) {
  if (!(type.flags & ts.TypeFlags.Union)) return { base: type, optional: false };
  const parts = type.types.filter((t) => !(t.flags & ts.TypeFlags.Undefined));
  const optional = parts.length !== type.types.length;
  if (!optional) return { base: type, optional: false };
  if (parts.length === 1) return { base: parts[0], optional };
  // boolean | undefined is the union true | false | undefined
  if (parts.every((t) => t.flags & ts.TypeFlags.BooleanLiteral)) return { base: parts[0].checker ?? parts[0], optional, bool: true };
  return { base: type, optional, multi: true };
}

// Where a symbol lives, relative to the file being translated.
//   'local'    declared inside the current function
//   'unit'     a top-level function of this file
//   'module'   a module-level const of this file (read-only external state)
//   'import'   imported from another module (value)
//   'other'    declared in another file of the project
//   'global'   a global (lib or ambient)
//   null       no symbol
export function originOf(checker, id, sf, current) {
  const sym = checker.getSymbolAtLocation(id);
  if (!sym) return { kind: null, sym: null, decl: null };
  let s = sym;
  if (s.flags & ts.SymbolFlags.Alias) { try { s = checker.getAliasedSymbol(s); } catch { /* unresolved alias */ } }
  const decl = s.declarations?.[0] ?? sym.declarations?.[0] ?? null;
  const isImportDecl = (d) => !!d && (ts.isImportSpecifier(d) || ts.isImportClause(d) || ts.isNamespaceImport(d) || ts.isImportEqualsDeclaration(d));
  if (isImportDecl(sym.declarations?.[0])) return { kind: 'import', sym: s, decl };
  if (!decl) return { kind: 'global', sym: s, decl: null };
  if (decl.getSourceFile() !== sf) return { kind: decl.getSourceFile().isDeclarationFile ? 'global' : 'other', sym: s, decl };
  // a unit is a unit even from inside its own body (recursion), so units are recognised before locality
  if (ts.isMethodDeclaration(decl) && decl.parent && ts.isClassDeclaration(decl.parent) && decl.parent.parent === sf) return { kind: 'unit', sym: s, decl };
  if ((ts.isFunctionDeclaration(decl) && decl.parent === sf) || (ts.isVariableDeclaration(decl) && decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) && decl.parent?.parent && ts.isVariableStatement(decl.parent.parent) && decl.parent.parent.parent === sf)) return { kind: 'unit', sym: s, decl };
  for (let p = decl; p; p = p.parent) if (p === current) return { kind: 'local', sym: s, decl };
  if (ts.isVariableDeclaration(decl) && (ts.getCombinedNodeFlags(decl) & ts.NodeFlags.Const)) return { kind: 'module', sym: s, decl };
  if (ts.isTypeAliasDeclaration(decl) || ts.isInterfaceDeclaration(decl) || ts.isEnumDeclaration(decl)) return { kind: 'type', sym: s, decl };
  return { kind: 'module-mutable', sym: s, decl };
}

/** The value of an infinity spelling: +1 for the global `Infinity` and `Number.POSITIVE_INFINITY`, -1 for
 * `Number.NEGATIVE_INFINITY`, a prefix minus flips the sign and parentheses are looked through; 0 for anything else (a
 * local or an import named Infinity included). The three spellings of one value are one reading (ECMA-262 21.1.2.6 and
 * 21.1.2.7, and the global property Infinity of 19.1.1): the lint admits them alike and the translator keys a unit that
 * names one by the canonical spelling, so `Infinity` and `Number.POSITIVE_INFINITY` units of equal text are one function. */
export function infinitySign(checker, n, sf, current) {
  while (n && ts.isParenthesizedExpression(n)) n = n.expression;
  if (!n) return 0;
  if (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.MinusToken) return -infinitySign(checker, n.operand, sf, current) || 0;
  if (ts.isIdentifier(n)) return n.text === 'Infinity' && originOf(checker, n, sf, current).kind === 'global' ? 1 : 0;
  if (ts.isPropertyAccessExpression(n) && !n.questionDotToken && ts.isIdentifier(n.expression) && n.expression.text === 'Number' && originOf(checker, n.expression, sf, current).kind === 'global') {
    if (n.name.text === 'POSITIVE_INFINITY') return 1;
    if (n.name.text === 'NEGATIVE_INFINITY') return -1;
  }
  return 0;
}

/** a file is REAL when a unit of it has a float literal or a bare `/` (not under Math.floor/Math.trunc): its numbers are
 * Dafny reals (exact decimals, not IEEE 754); every other file is an integer file. The lint and the translator both
 * decide by this, so the editor's rule and the proof lane agree. */
export function fileUsesReals(sf, skip = null) { // skip: a node whose subtree is left out (a unit the reading does not reach)
  let real = false;
  const underFloor = (n) => { for (let p = n.parent; p; p = p.parent) { if (ts.isCallExpression(p) && ts.isPropertyAccessExpression(p.expression) && ts.isIdentifier(p.expression.expression) && p.expression.expression.text === 'Math' && (p.expression.name.text === 'floor' || p.expression.name.text === 'trunc') && p.arguments[0] && (p.arguments[0] === n || p.arguments[0].pos <= n.pos && n.end <= p.arguments[0].end)) return true; if (ts.isStatement(p) || ts.isFunctionLike(p)) return false; } return false; };
  const w = (n) => {
    if (real) return;
    if (ts.isTypeNode(n) || ts.isDecorator(n) || (skip && skip(n))) return;
    if (ts.isNumericLiteral(n) && /[.eE]/.test(n.text) && !/^0[xXoObB]/.test(n.text)) { real = true; return; }
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.SlashToken && !underFloor(n)) { real = true; return; }
    ts.forEachChild(n, w);
  };
  w(sf);
  return real;
}

// a literal method's originating object, including the inferred type through a local alias
export function methodLiteralOf(checker, type) {
  const declarations = [ ...(type.symbol?.declarations ?? []), ...checker.getPropertiesOfType(type).flatMap((p) => p.declarations ?? []) ];
  for (const d of declarations) {
    const obj = ts.isObjectLiteralExpression(d) ? d : d.parent;
    if (obj && ts.isObjectLiteralExpression(obj) && obj.properties.some((p) => ts.isMethodDeclaration(p) || ts.isGetAccessorDeclaration(p))) { for (let owner = obj.parent; owner; owner = owner.parent) if (ts.isFunctionLike(owner)) return obj; }
  }
  return null;
}

// every container on a receiver path is a nonoptional data record, never a class or opaque handle
export function receiverRecordPath(checker, target) {
  const chain = []; let root = target;
  while (ts.isPropertyAccessExpression(root)) { chain.unshift(root); root = root.expression; }
  if (root.kind !== ts.SyntaxKind.ThisKeyword || chain.length < 2) return null;
  for (let i = 0; i < chain.length - 1; i++) {
    if (checker.getSymbolAtLocation(chain[i].name)?.declarations?.some((d) => ts.isGetAccessorDeclaration(d) || ts.isSetAccessorDeclaration(d))) return null;
    const t = checker.getTypeAtLocation(chain[i]);
    if (!(t.flags & (ts.TypeFlags.Object | ts.TypeFlags.Intersection)) || (t.objectFlags & ts.ObjectFlags.Class) || t.symbol?.declarations?.some((d) => ts.isClassDeclaration(d) || ts.isClassExpression(d)) || isArrayLike(checker, t) || checker.getIndexInfosOfType(t).length) return null;
    const ps = checker.getPropertiesOfType(t);
    if (!ps.length || ps.some((p) => checker.getSignaturesOfType(checker.getTypeOfSymbolAtLocation(p, chain[i]), ts.SignatureKind.Call).length || p.declarations?.some((d) => ts.isGetAccessorDeclaration(d) || ts.isSetAccessorDeclaration(d)))) return null;
    if (!checker.getPropertyOfType(t, chain[i + 1].name.text)) return null;
  }
  return chain;
}

// a write through the declared `this` of a free function (TypeScript's `this` parameter): the receiver and every container
// on the path to the written field are nonoptional data records (the method rule for a receiver path), never a class, an
// array, a dictionary, an optional or an opaque handle, so the write rebuilds the receiver value as a parameter's is rebuilt
export function thisParamPath(checker, target) {
  const chain = []; let root = target;
  while (ts.isPropertyAccessExpression(root)) { chain.unshift(root); root = root.expression; }
  if (root.kind !== ts.SyntaxKind.ThisKeyword || !chain.length) return null;
  const accessor = (n) => checker.getSymbolAtLocation(n.name)?.declarations?.some((d) => ts.isGetAccessorDeclaration(d) || ts.isSetAccessorDeclaration(d));
  for (let i = 0; i < chain.length; i++) {
    const at = i === 0 ? root : chain[i - 1];
    if (i > 0 && accessor(at)) return null;
    const t = checker.getTypeAtLocation(at);
    if (!(t.flags & (ts.TypeFlags.Object | ts.TypeFlags.Intersection)) || (t.objectFlags & ts.ObjectFlags.Class) || t.symbol?.declarations?.some((d) => ts.isClassDeclaration(d) || ts.isClassExpression(d)) || isArrayLike(checker, t) || checker.getIndexInfosOfType(t).length) return null;
    const ps = checker.getPropertiesOfType(t);
    if (!ps.length || ps.some((p) => checker.getSignaturesOfType(checker.getTypeOfSymbolAtLocation(p, at), ts.SignatureKind.Call).length || p.declarations?.some((d) => ts.isGetAccessorDeclaration(d) || ts.isSetAccessorDeclaration(d)))) return null;
    if (!checker.getPropertyOfType(t, chain[i].name.text)) return null;
  }
  return accessor(chain[chain.length - 1]) ? null : chain;
}

// A field write through a parameter's own element path: `p[i].f = v`, `p[i]!.f = v`, `(p[i] as T).f = v`,
// `p.a[i].b.f = v`. The written record is reached from the root name through data-field and array-element steps only,
// at least one an element: each element step indexes an array whose element type is never null or undefined, by a
// number index whose expression calls, assigns and awaits nothing; `!` and `as T` (T the element's own type) stand
// directly on an element step and are erased at run time; no step is optional or an accessor. Such a write is a heap
// step on the element reached, the step `p.f = v` takes on the parameter itself; the lint and the translator recognise
// the path through this one test. The root identifier and the steps from the root (fields and elements), or null.
export function elementWritePath(checker, target) {
  const TF = ts.TypeFlags;
  if (!target || !ts.isPropertyAccessExpression(target) || target.questionDotToken) return null;
  const absent = (t) => (t.flags & (TF.Null | TF.Undefined | TF.Void)) || ((t.flags & TF.Union) && t.types.some((x) => x.flags & (TF.Null | TF.Undefined | TF.Void)));
  const accessor = (pa) => checker.getSymbolAtLocation(pa.name)?.declarations?.some((d) => ts.isGetAccessorDeclaration(d) || ts.isSetAccessorDeclaration(d));
  const quiet = (e) => { let ok = true; const w = (n) => { if (!ok) return; if (ts.isCallExpression(n) || ts.isNewExpression(n) || ts.isTaggedTemplateExpression(n) || ts.isAwaitExpression(n) || ts.isYieldExpression(n) || ts.isDeleteExpression(n) || ts.isFunctionLike(n) || ts.isClassLike(n) || (ts.isBinaryExpression(n) && n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && n.operatorToken.kind <= ts.SyntaxKind.LastAssignment) || ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && (n.operator === ts.SyntaxKind.PlusPlusToken || n.operator === ts.SyntaxKind.MinusMinusToken))) { ok = false; return; } ts.forEachChild(n, w); }; w(e); return ok; };
  const steps = []; let x = target.expression; let elements = 0; let erased = false; // erased: a `!` or `as T` met, which must stand on an element step
  for (;;) {
    if (ts.isParenthesizedExpression(x)) { x = x.expression; continue; }
    if (ts.isNonNullExpression(x)) { erased = true; x = x.expression; continue; }
    if (ts.isAsExpression(x) || ts.isTypeAssertionExpression(x)) {
      const to = checker.getTypeAtLocation(x), from = checker.getNonNullableType(checker.getTypeAtLocation(x.expression));
      if (to !== from && !(checker.isTypeAssignableTo(to, from) && checker.isTypeAssignableTo(from, to))) return null; // a cast to another type reads another shape
      erased = true; x = x.expression; continue;
    }
    if (ts.isElementAccessExpression(x)) {
      if (x.questionDotToken) return null;
      const at = checker.getTypeAtLocation(x.expression);
      if (absent(at) || !checker.isArrayType(at)) return null; // an array, never a tuple, a dictionary or an absent value
      const et = checker.getTypeArguments(at)[0];
      if (!et || absent(et) || !(checker.getTypeAtLocation(x.argumentExpression).flags & TF.NumberLike) || !quiet(x.argumentExpression)) return null;
      steps.unshift(x); elements++; erased = false; x = x.expression; continue;
    }
    if (erased) return null; // `!` or `as` on anything but an element step
    if (ts.isPropertyAccessExpression(x)) {
      if (x.questionDotToken || accessor(x) || absent(checker.getTypeAtLocation(x))) return null;
      steps.unshift(x); x = x.expression; continue;
    }
    break;
  }
  if (erased || !ts.isIdentifier(x) || !elements || accessor(target)) return null;
  return { root: x, steps };
}

// A plain data record: an object type with fields only (no call, construct or index signature, no method or accessor,
// no class), each field a number, a string, a boolean, a literal union, a primitive that may be absent one way, a plain
// data record or an array of one of these. The heap core holds such a value as a cell of its fields
// (translate/heap.mjs shapeOf); the lint admits a write through the element a synchronous `forEach` callback receives
// only for such an element, the case the heap core carries (elementWritePath above).
export function plainDataRecord(checker, t, depth = 0) {
  const TF = ts.TypeFlags;
  if (!t || depth > 6) return false;
  const prim = (x) => !!(x.flags & (TF.NumberLike | TF.StringLike | TF.BooleanLike));
  const field = (ft, d) => {
    if (prim(ft)) return true;
    if (ft.flags & TF.Union) {
      const absent = ft.types.filter((x) => x.flags & (TF.Null | TF.Undefined | TF.Void)), rest = ft.types.filter((x) => !absent.includes(x));
      if (new Set(absent.map((x) => (x.flags & TF.Null ? 'n' : 'u'))).size > 1) return false;
      return rest.length > 0 && rest.every(prim) && (!absent.length || rest.every((x) => !(x.flags & TF.Object)));
    }
    if (checker.isArrayType(ft)) { const e = checker.getTypeArguments(ft)[0]; return !!e && (prim(e) || plainDataRecord(checker, e, d + 1)); }
    return plainDataRecord(checker, ft, d + 1);
  };
  if (!(t.flags & TF.Object) || checker.isArrayType(t) || checker.isTupleType(t)) return false;
  if (t.getCallSignatures().length || t.getConstructSignatures().length || checker.getIndexInfosOfType(t).length) return false;
  if ((t.objectFlags & ts.ObjectFlags.Class) || t.symbol?.declarations?.some((d) => ts.isClassDeclaration(d) || ts.isClassExpression(d))) return false;
  if (['Map', 'Set', 'Date', 'Promise', 'RegExp', 'WeakMap', 'WeakSet', 'Error'].includes(t.symbol?.name)) return false;
  const props = checker.getPropertiesOfType(t);
  if (!props.length) return false;
  for (const p of props) {
    if (p.flags & (ts.SymbolFlags.Method | ts.SymbolFlags.Accessor) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(p.name)) return false;
    const decl = p.valueDeclaration ?? p.declarations?.[0];
    if (!decl) return false;
    if (!field(checker.getTypeOfSymbolAtLocation(p, decl), depth)) return false;
  }
  return true;
}

// Stage 5 rank 15. The counted for header `let i = e; i < limit; i++` (also <=, >, >= with i--, i += k, i -= k, k a positive
// literal, the step in the direction of the condition) whose body never assigns the counter: the translator reads it as a
// counted loop with the counter as the helper's lead parameter. Every other for header is read as
// `init; while (cond) { body; step }`, continue running the step; the lint and the translator agree through this one test.
export function countedFor(s) {
  const K = ts.SyntaxKind;
  if (!ts.isForStatement(s) || !s.initializer || !s.condition || !s.incrementor) return false;
  const i = s.initializer;
  if (!ts.isVariableDeclarationList(i) || !(i.flags & ts.NodeFlags.Let) || i.declarations.length !== 1 || !ts.isIdentifier(i.declarations[0].name) || !i.declarations[0].initializer) return false;
  const name = i.declarations[0].name.text, u = s.incrementor, c = s.condition;
  const isName = (x) => ts.isIdentifier(x) && x.text === name;
  const unary = (op) => (ts.isPostfixUnaryExpression(u) || ts.isPrefixUnaryExpression(u)) && u.operator === op && isName(u.operand);
  const compound = (op) => ts.isBinaryExpression(u) && u.operatorToken.kind === op && isName(u.left) && ts.isNumericLiteral(u.right) && Number(u.right.text) > 0;
  const up = unary(K.PlusPlusToken) || compound(K.PlusEqualsToken), down = unary(K.MinusMinusToken) || compound(K.MinusEqualsToken);
  const ck = ts.isBinaryExpression(c) && isName(c.left) ? c.operatorToken.kind : null;
  const condUp = ck === K.LessThanToken || ck === K.LessThanEqualsToken, condDown = ck === K.GreaterThanToken || ck === K.GreaterThanEqualsToken;
  if (!((up && condUp) || (down && condDown))) return false;
  let assigned = false;
  const scan = (n) => {
    if (assigned) return;
    if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment && isName(n.left)) assigned = true;
    if ((ts.isPostfixUnaryExpression(n) || ts.isPrefixUnaryExpression(n)) && (n.operator === K.PlusPlusToken || n.operator === K.MinusMinusToken) && isName(n.operand)) assigned = true;
    ts.forEachChild(n, scan);
  };
  scan(s.statement);
  return !assigned;
}

// Stage 5 rank 20. A synchronous array-method callback (forEach, map, filter, find, findIndex, some, every, flatMap, reduce
// on an array): the method runs it once per element before returning, so a throw inside it is the enclosing unit's throw,
// and the lint and the translator read the statement holding it as one opaque block, as a loop statement with a throw.
const LOOP_METHODS = new Set(['forEach', 'map', 'filter', 'find', 'findIndex', 'some', 'every', 'flatMap', 'reduce']);
// the call `xs.m(...)` of such a method on an array
export function syncLoopCall(n, checker) {
  if (!n || !ts.isCallExpression(n)) return false;
  const f = n.expression;
  if (!ts.isPropertyAccessExpression(f) || !LOOP_METHODS.has(f.name.text)) return false;
  return isArrayLike(checker, checker.getTypeAtLocation(f.expression));
}
export function syncLoopCallback(n, checker) {
  if (!n || !ts.isArrowFunction(n) || !n.parent || n.parent.arguments?.[0] !== n || n.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)) return false;
  return syncLoopCall(n.parent, checker);
}

// The index and input of a match (ECMA-262 22.2.7.2 RegExpBuiltinExec): for a regular expression literal without the g
// and y flags, `re.exec(s)` and `s.match(re)` start at 0 and leave lastIndex alone, so the match, its `index` and its
// `input` are functions of the pattern and s. `m.index` and `m.input`, where m is a const bound to such a call and s is a
// literal or a name (a field path on one) the unit never writes, read as `regex_index(re, s)` (one uninterpreted function
// of the pattern and the string, the same on both sides) and s itself. Returns { regex, arg, name } or null. An index
// read through the array alone would be unsound: two matches with equal items may sit at different places.
export function execMatchMember(e, checker) {
  if (!e || !ts.isPropertyAccessExpression(e) || e.questionDotToken || !['index', 'input'].includes(e.name.text)) return null;
  let r = e.expression; while (ts.isParenthesizedExpression(r) || ts.isNonNullExpression(r)) r = r.expression;
  if (!ts.isIdentifier(r)) return null;
  const sym = checker.getSymbolAtLocation(r), d = sym?.valueDeclaration;
  if (!d || !ts.isVariableDeclaration(d) || !(d.parent.flags & ts.NodeFlags.Const) || !d.initializer) return null;
  let c = d.initializer; while (ts.isParenthesizedExpression(c)) c = c.expression;
  if (!ts.isCallExpression(c) || c.arguments.length !== 1 || !ts.isPropertyAccessExpression(c.expression) || c.expression.questionDotToken) return null;
  const unp = (x) => { while (ts.isParenthesizedExpression(x)) x = x.expression; return x; };
  const m = c.expression.name.text;
  const regex = m === 'exec' ? unp(c.expression.expression) : m === 'match' ? unp(c.arguments[0]) : null;
  const arg = m === 'exec' ? unp(c.arguments[0]) : m === 'match' ? unp(c.expression.expression) : null;
  if (!regex || !ts.isRegularExpressionLiteral(regex) || /[gy]/.test(regex.text.slice(regex.text.lastIndexOf('/') + 1))) return null;
  if (!(checker.getTypeAtLocation(arg).flags & ts.TypeFlags.StringLike)) return null;
  // the string: a literal, or a name or a field path on one the unit never writes, in scope at the read as at the call
  let root = arg; while (ts.isPropertyAccessExpression(root) && !root.questionDotToken) root = unp(root.expression);
  if (!ts.isStringLiteral(arg) && !ts.isNoSubstitutionTemplateLiteral(arg)) {
    if (!ts.isIdentifier(root)) return null;
    const rs = checker.getSymbolAtLocation(root), rd = rs?.valueDeclaration;
    if (!rd || checker.getSymbolsInScope(e, ts.SymbolFlags.Value).find((x) => x.name === root.text) !== rs) return null;
    let fn = rd.parent; while (fn && !ts.isFunctionLike(fn) && !ts.isSourceFile(fn)) fn = fn.parent;
    let written = false;
    const w = (y) => { if ((ts.isBinaryExpression(y) && y.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && y.operatorToken.kind <= ts.SyntaxKind.LastAssignment && (() => { let l = unp(y.left); while (ts.isPropertyAccessExpression(l) || ts.isElementAccessExpression(l)) l = unp(l.expression); return ts.isIdentifier(l) && checker.getSymbolAtLocation(l) === rs; })()) || ((ts.isPrefixUnaryExpression(y) || ts.isPostfixUnaryExpression(y)) && ts.isIdentifier(unp(y.operand)) && checker.getSymbolAtLocation(unp(y.operand)) === rs)) written = true; ts.forEachChild(y, w); };
    if (fn) w(fn);
    if (written) return null;
  }
  return { regex, arg, name: e.name.text };
}

// A bucket map: `const m = new Map<K, T[]>()` declared in the unit, never rebound, whose arrays no other live name holds
// when a push through the map changes one. Its arrays are written by `m.get(k)?.push(a)` as a statement (ECMA-262
// 13.3.9: the push runs only when the key is present; the arguments carry no call), or through a bucket local, `const l =
// m.get(k)` or `const l = m.get(k) ?? [..]` with k a name or a literal, then `l.push(a)` (under `if (l)` for the first
// form): l is the map's array when the key was present, so the push changes the map at k when k is present (no write to
// the map runs between the binding and a use of l), and `m.set(k, l)` stores l itself. The reading writes the map: m :=
// if k in m then m[k := m[k] + [a]] else m. Every other use of the map or of a bucket local that may hand an array to
// another name (`return m` aside, after which nothing runs) must come after the last write, outside any loop that writes:
// a value read from it would otherwise miss a later push. A Map of any values also takes the set-back form, `const l =
// m.get(k) ?? <fresh>`, changes of l, then `m.set(k, l)` in the same list with no jump and no other use of the map between
// (the model changes its copy of l and writes it back, as the shared object ends). bucketMaps returns, per unit, the
// pushes and the bucket locals.
const BUCKET_MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin']);
const bucketCache = new WeakMap();
export function bucketMaps(unitFn, checker) {
  if (!unitFn) return { pushes: new Map(), locals: new Map() };
  if (bucketCache.has(unitFn)) return bucketCache.get(unitFn);
  const K = ts.SyntaxKind;
  const out = { pushes: new Map(), locals: new Map() }; // push call -> { m, key, local? }; bucket local decl -> { m, key }
  bucketCache.set(unitFn, out);
  const up = (x) => { while (x.parent && (ts.isParenthesizedExpression(x.parent) || ts.isNonNullExpression(x.parent))) x = x.parent; return x; };
  const unp = (x) => { while (ts.isParenthesizedExpression(x)) x = x.expression; return x; };
  const inScope = (at, id, sym) => checker.getSymbolsInScope(at, ts.SymbolFlags.Value).find((x) => x.name === id.text) === sym;
  const hasCall = (x) => { let f = false; const w = (y) => { if (ts.isCallExpression(y) || ts.isNewExpression(y) || ts.isAwaitExpression(y) || ts.isYieldExpression(y) || (ts.isBinaryExpression(y) && y.operatorToken.kind >= K.FirstAssignment && y.operatorToken.kind <= K.LastAssignment) || ts.isPrefixUnaryExpression(y) && [K.PlusPlusToken, K.MinusMinusToken].includes(y.operator) || ts.isPostfixUnaryExpression(y) || ts.isFunctionLike(y)) f = true; if (!f) ts.forEachChild(y, w); }; w(x); return f; };
  const prim = (x) => { const t = checker.getTypeAtLocation(x); const parts = t.flags & ts.TypeFlags.Union ? t.types : [t]; return parts.every((p) => !!(p.flags & (ts.TypeFlags.NumberLike | ts.TypeFlags.StringLike | ts.TypeFlags.BooleanLike | ts.TypeFlags.BigIntLike | ts.TypeFlags.Undefined | ts.TypeFlags.Null | ts.TypeFlags.Void))); };
  const keyRoot = (k) => { k = unp(k); while (ts.isPropertyAccessExpression(k) && !k.questionDotToken) k = unp(k.expression); return k; };
  const stableKey = (k) => { k = unp(k); if (ts.isStringLiteral(k) || ts.isNumericLiteral(k) || ts.isNoSubstitutionTemplateLiteral(k)) return true; if (ts.isPropertyAccessExpression(k)) { const r = keyRoot(k); if (!ts.isIdentifier(r)) return false; const rs = checker.getSymbolAtLocation(r); let written = false; const w = (y) => { if (ts.isBinaryExpression(y) && y.operatorToken.kind >= K.FirstAssignment && y.operatorToken.kind <= K.LastAssignment && ts.isPropertyAccessExpression(unp(y.left)) && checker.getSymbolAtLocation(keyRoot(y.left)) === rs) written = true; ts.forEachChild(y, w); }; w(unitFn); return !written && stableKey(r); } if (!ts.isIdentifier(k)) return false; const sym = checker.getSymbolAtLocation(k); const d = sym?.valueDeclaration; if (!d) return false; let assigned = false; const w = (y) => { if (ts.isIdentifier(y) && checker.getSymbolAtLocation(y) === sym) { const p = up(y).parent; if (p && ((ts.isBinaryExpression(p) && p.left === up(y) && p.operatorToken.kind >= K.FirstAssignment && p.operatorToken.kind <= K.LastAssignment) || ((ts.isPrefixUnaryExpression(p) || ts.isPostfixUnaryExpression(p)) && [K.PlusPlusToken, K.MinusMinusToken].includes(p.operator)))) assigned = true; } ts.forEachChild(y, w); }; w(unitFn); return !assigned; };
  // the loops a node sits in, inside the unit: statements and array-method callbacks
  const loopsOf = (x) => { const ls = []; for (let q = x.parent; q && q !== unitFn; q = q.parent) if (ts.isIterationStatement(q, false) || (ts.isFunctionLike(q) && syncLoopCallback(q, checker))) ls.push(q); return ls; };
  // a reference to the map counts only in the unit itself or in array-method callbacks (loops)
  const plainPlace = (x) => { for (let q = x.parent; q && q !== unitFn; q = q.parent) if (ts.isFunctionLike(q) && !syncLoopCallback(q, checker)) return false; return true; };
  const walkIds = (sym, f) => { const w = (y) => { if (ts.isIdentifier(y) && checker.getSymbolAtLocation(y) === sym && !(y.parent && (ts.isVariableDeclaration(y.parent) || ts.isParameter(y.parent) || ts.isBindingElement(y.parent)) && y.parent.name === y) && !(y.parent && ts.isPropertyAccessExpression(y.parent) && y.parent.name === y)) f(y); ts.forEachChild(y, w); }; w(unitFn.body ?? unitFn); };
  // a use whose member is written or changed in place: `l.f = v`, `l.f++`, `delete l.f`, `l[i] = v`, `l.push(..)`, `l.add(..)`
  const CHANGERS = new Set([...BUCKET_MUTATORS, 'add', 'set', 'delete', 'clear']);
  const changes = (top) => {
    const p = top.parent; if (!p) return false;
    const target = (x) => { const q = up(x).parent; return !!q && ((ts.isBinaryExpression(q) && q.left === up(x) && q.operatorToken.kind >= K.FirstAssignment && q.operatorToken.kind <= K.LastAssignment) || ((ts.isPrefixUnaryExpression(q) || ts.isPostfixUnaryExpression(q)) && [K.PlusPlusToken, K.MinusMinusToken].includes(q.operator)) || ts.isDeleteExpression(q)); };
    if ((ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) && p.expression === top) {
      if (target(p)) return true;
      if (ts.isPropertyAccessExpression(p) && CHANGERS.has(p.name.text) && p.parent && ts.isCallExpression(p.parent) && p.parent.expression === p) return true;
      let q = p; while (q.parent && (ts.isPropertyAccessExpression(q.parent) || ts.isElementAccessExpression(q.parent)) && q.parent.expression === q) q = q.parent; // a path below it
      if (q !== p && (target(q) || (ts.isPropertyAccessExpression(q) && CHANGERS.has(q.name.text) && q.parent && ts.isCallExpression(q.parent) && q.parent.expression === q))) return true;
    }
    return false;
  };
  const freshValue = (v) => { v = unp(v); return ts.isArrayLiteralExpression(v) || ts.isObjectLiteralExpression(v) || (ts.isNewExpression(v) && ts.isIdentifier(v.expression) && ['Map', 'Set', 'Array'].includes(v.expression.text) && !(v.arguments ?? []).length); };
  const maps = [];
  const findMaps = (y) => {
    if (ts.isVariableDeclaration(y) && ts.isIdentifier(y.name) && y.initializer && (y.parent.flags & ts.NodeFlags.Const)) {
      const init = unp(y.initializer);
      const t = checker.getTypeAtLocation(y.name);
      const vt = t.symbol?.name === 'Map' && checker.getTypeArguments ? checker.getTypeArguments(t)[1] : null;
      if (ts.isNewExpression(init) && ts.isIdentifier(init.expression) && init.expression.text === 'Map' && !(init.arguments ?? []).length && vt && plainPlace(y)) maps.push({ decl: y, arrays: checker.isArrayType(vt) });
    }
    ts.forEachChild(y, findMaps);
  };
  findMaps(unitFn.body ?? unitFn);
  const keyText = (k) => unp(k).getText();
  const jumpsIn = (from, to, block) => { let f = false; const w = (y) => { if (f || ts.isFunctionLike(y)) return; if (y.pos >= from && y.end <= to && (ts.isReturnStatement(y) || ts.isThrowStatement(y) || ts.isBreakStatement(y) || ts.isContinueStatement(y))) { f = true; return; } ts.forEachChild(y, w); }; w(block); return f; };
  for (const { decl, arrays } of maps) {
    const msym = checker.getSymbolAtLocation(decl.name);
    const writes = [], escapes = [], pushes = new Map(), locals = new Map(), mrefs = [];
    let ok = true;
    walkIds(msym, (r) => {
      if (!ok) return;
      if (!plainPlace(r)) { ok = false; return; }
      mrefs.push(r);
      const top = up(r), p = top.parent;
      if (p && ts.isReturnStatement(p)) return; // nothing runs after
      if (!(p && ts.isPropertyAccessExpression(p) && p.expression === top)) { escapes.push(r); return; }
      const name = p.name.text, call = p.parent && ts.isCallExpression(p.parent) && p.parent.expression === p ? p.parent : null;
      if (name === 'size' && !call) return;
      if (!call) { escapes.push(r); return; }
      const stmt = call.parent && ts.isExpressionStatement(call.parent) ? call.parent : null;
      if (name === 'has') return;
      if ((name === 'delete' || name === 'clear') && stmt) { writes.push(call); return; }
      if (name === 'set' && stmt && call.arguments.length === 2) {
        const v = unp(call.arguments[1]);
        if (freshValue(v)) { writes.push(call); return; }
        if (ts.isIdentifier(v)) { const ld = checker.getSymbolAtLocation(v)?.valueDeclaration; if (ld && ts.isVariableDeclaration(ld)) { writes.push(call); (call.__bucketSet ??= []).push({ ld, key: call.arguments[0] }); return; } }
        ok = false; return;
      }
      if (name === 'get' && call.arguments.length === 1) {
        const g = up(call), gp = g.parent;
        if (gp && ts.isPropertyAccessExpression(gp) && gp.expression === g) { // a member of the value the map holds at k
          const mc = gp.parent && ts.isCallExpression(gp.parent) && gp.parent.expression === gp ? gp.parent : null;
          if (arrays && gp.name.text === 'push' && mc && gp.questionDotToken && mc.parent && ts.isExpressionStatement(mc.parent) && !mc.arguments.some((a) => ts.isSpreadElement(a) || hasCall(a)) && g === call) { writes.push(mc); pushes.set(mc, { m: decl, key: call.arguments[0] }); return; }
          if (changes(g)) { ok = false; return; }
          if (prim(mc ?? gp)) return; // `.length`, `.includes(x)`: a primitive read
          escapes.push(r); return;
        }
        // `const l = m.get(k)` or `const l = m.get(k) ?? <a fresh value>`: a bucket local
        let b = g; if (b.parent && ts.isBinaryExpression(b.parent) && b.parent.left === b && b.parent.operatorToken.kind === K.QuestionQuestionToken && freshValue(b.parent.right)) b = up(b.parent);
        const vd = b.parent;
        if (vd && ts.isVariableDeclaration(vd) && vd.initializer === b && ts.isIdentifier(vd.name) && (vd.parent.flags & ts.NodeFlags.Const) && stableKey(call.arguments[0])) { locals.set(vd, { m: decl, key: call.arguments[0], coalesced: b !== g }); return; }
        escapes.push(r); return;
      }
      escapes.push(r);
    });
    if (!ok) continue;
    // each bucket local is one of two kinds. A push local (an array map): its pushes write the map at k and nothing else
    // changes it. A set-back local: `m.set(k, l)` stands later in the same statement list, every use of l lies between the
    // binding and that statement, no jump leaves the stretch and the map is not named in it: whatever changes l there, the
    // map at k ends as l (the model's copy of l, written back), as the shared object does.
    const localUses = new Map();
    for (const [ld, info] of locals) {
      const lsym = checker.getSymbolAtLocation(ld.name), uses = [], changed = [], pushed = [];
      let back = null;
      walkIds(lsym, (r) => {
        if (!ok) return;
        if (!plainPlace(r) || !inScope(r, info.m.name, msym) || (ts.isIdentifier(keyRoot(info.key)) && !inScope(r, keyRoot(info.key), checker.getSymbolAtLocation(keyRoot(info.key))))) { ok = false; return; }
        const top = up(r), p = top.parent;
        uses.push(r);
        if (p && ts.isCallExpression(p) && p.arguments.includes(top) && p.__bucketSet?.some((x) => x.ld === ld)) { if (keyText(p.arguments[0]) !== keyText(info.key) || back) ok = false; back = p; return; } // m.set(k, l)
        if (changes(top)) {
          const mc = p.parent;
          if (arrays && ts.isPropertyAccessExpression(p) && p.name.text === 'push' && mc && ts.isCallExpression(mc) && mc.parent && ts.isExpressionStatement(mc.parent) && !mc.arguments.some((a) => ts.isSpreadElement(a) || hasCall(a))) pushed.push(mc);
          else changed.push(r);
          return;
        }
        if (p && ts.isPropertyAccessExpression(p) && p.expression === top) { const mc = p.parent && ts.isCallExpression(p.parent) && p.parent.expression === p ? p.parent : null; if (prim(mc ?? p)) return; escapes.push(r); return; }
        // a test of presence (`if (l)`, `!l`, `l ? a : b`, `l && x`) reads no value
        if (p && (ts.isIfStatement(p) || ts.isConditionalExpression(p) && p.condition === top || ts.isPrefixUnaryExpression(p) && p.operator === K.ExclamationToken || ts.isBinaryExpression(p) && p.left === top && [K.AmpersandAmpersandToken, K.BarBarToken].includes(p.operatorToken.kind))) return;
        if (p && ts.isReturnStatement(p)) return;
        escapes.push(r);
      });
      if (!ok) break;
      const stmtOf = (x) => { while (x && !ts.isVariableStatement(x) && !ts.isExpressionStatement(x)) x = x.parent; return x; };
      const vs = stmtOf(ld), bs = back && stmtOf(back);
      const setBack = !!bs && !!vs && bs.parent === vs.parent && bs.pos > vs.end && uses.every((u) => u.pos < bs.end) && !jumpsIn(vs.end, bs.pos, vs.parent) && !mrefs.some((r) => r.pos > vs.end && r.pos < bs.pos) && !loopsOf(bs).some((L) => !loopsOf(vs).includes(L));
      if (setBack) { info.setBack = true; for (const c of [...pushed]) writes.push(c); }
      else if (changed.length) { ok = false; break; }
      else for (const c of pushed) { writes.push(c); pushes.set(c, { m: info.m, key: info.key, local: ld }); }
      localUses.set(ld, uses);
    }
    // a set of a name that is no bucket local of this map
    for (const w of writes) if (w.__bucketSet && !w.__bucketSet.every((x) => locals.has(x.ld))) ok = false;
    if (!ok) continue;
    const after = (a, b) => b.pos > a.pos || loopsOf(a).some((L) => loopsOf(b).includes(L)); // b may run after a
    // an escape followed by a write: the escaped value misses the write
    if (escapes.some((e) => writes.some((w) => after(e, w)))) continue;
    // a push local used after a write that is not its own push (the local would no longer be the map's array)
    let bad = false;
    for (const [ld, uses] of localUses) {
      if (locals.get(ld).setBack) continue;
      const own = new Set([...pushes].filter(([, v]) => v.local === ld).map(([c]) => c));
      for (const u of uses) for (const w of writes) {
        if (own.has(w) || (w.__bucketSet?.some((x) => x.ld === ld))) continue;
        if ((w.pos > ld.end && w.pos < u.pos) || loopsOf(u).some((L) => loopsOf(w).includes(L) && !loopsOf(ld).includes(L))) bad = true;
      }
    }
    if (bad) continue;
    for (const [c, v] of pushes) out.pushes.set(c, v);
    for (const [ld, v] of locals) out.locals.set(ld, v);
  }
  return out;
}

// Stage 5 rank 21. A local procedure: a function declared inside a unit (a const arrow with a block body, or a nested
// function declaration) whose name is used only as the callee of plain calls of its arity, whose body never returns a
// value, throws, tries, awaits, yields, reads `this` or `arguments` or names itself. Each call is read as the body spliced
// at the call site with the parameters bound to the arguments, so an outer cell the body writes threads like any
// statement. The call is a new environment: a parameter or a local named like a unit binding ends with the call (the
// translator saves the outer binding and rebinds it after the splice, translate.mjs scopeFor). A parameter may carry a
// default: a call that leaves it out binds the default, evaluated at the call after the earlier parameters; a call that
// passes it passes a value whose type has no undefined, so the default never applies (ECMA-262 10.2.11).
export function localProcedure(decl, checker, unitFn) {
  const K = ts.SyntaxKind;
  let fn, name;
  if (ts.isVariableDeclaration(decl) && ts.isIdentifier(decl.name) && decl.initializer && ts.isArrowFunction(decl.initializer) && ts.isBlock(decl.initializer.body)) { fn = decl.initializer; name = decl.name; }
  else if (ts.isFunctionDeclaration(decl) && decl.name && decl.body) { fn = decl; name = decl.name; }
  else return null;
  if (!unitFn || !(decl.pos >= unitFn.pos && decl.end <= unitFn.end) || decl === unitFn) return null;
  if (fn.modifiers?.some((m) => m.kind === K.AsyncKeyword) || fn.asteriskToken || fn.typeParameters) return null;
  if (!fn.parameters.every((p) => ts.isIdentifier(p.name) && !p.dotDotDotToken && !p.questionToken)) return null;
  let minArgs = fn.parameters.length; while (minArgs > 0 && fn.parameters[minArgs - 1].initializer) minArgs--; // the trailing defaulted parameters a call may leave out
  const mayBeUndefined = (a) => { const t = checker.getTypeAtLocation(a); return !!(t.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void | ts.TypeFlags.Any | ts.TypeFlags.Unknown)) || (!!(t.flags & ts.TypeFlags.Union) && t.types.some((x) => !!(x.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void | ts.TypeFlags.Any | ts.TypeFlags.Unknown)))); };
  const sym = checker.getSymbolAtLocation(name);
  if (!sym) return null;
  let bad = false, calls = 0;
  const inBody = (n) => {
    if (bad) return;
    if (ts.isReturnStatement(n) || ts.isThrowStatement(n) || ts.isTryStatement(n) || ts.isAwaitExpression(n) || ts.isYieldExpression(n) || n.kind === K.ThisKeyword || (ts.isIdentifier(n) && n.text === 'arguments')) { bad = true; return; }
    if (ts.isIdentifier(n) && checker.getSymbolAtLocation(n) === sym) { bad = true; return; }
    ts.forEachChild(n, inBody);
  };
  inBody(fn.body);
  if (bad) return null;
  const refs = (n) => {
    if (bad || n === decl) return;
    if (ts.isIdentifier(n) && n !== name && checker.getSymbolAtLocation(n) === sym) {
      const p = n.parent;
      if (!(p && ts.isCallExpression(p) && p.expression === n && !p.questionDotToken && p.arguments.length >= minArgs && p.arguments.length <= fn.parameters.length && !p.arguments.some(ts.isSpreadElement) && p.parent && ts.isExpressionStatement(p.parent))) { bad = true; return; }
      if (p.arguments.some((a, i) => fn.parameters[i].initializer && mayBeUndefined(a))) { bad = true; return; } // a passed value that may be undefined would take the default
      calls++;
    }
    ts.forEachChild(n, refs);
  };
  refs(unitFn);
  if (bad || !calls) return null;
  return { decl, fn, name: name.text, sym };
}

// The in operator with prototype names. `k in o` on an ordinary object is true when o owns k or when k is a name of
// Object.prototype (ECMA-262 HasProperty walks [[GetPrototypeOf]] to Object.prototype); the names are the fixed list
// below. The reading holds for a plain object, whose prototype is Object.prototype. A file that makes an object with
// another prototype (`Object.create`, `Object.setPrototypeOf`, `Reflect.setPrototypeOf`, a `__proto__:` member of a
// literal, an assignment to `.__proto__`) can hand such an object to any unit of the file, so the lint and the
// translator both refuse `in` there; this returns the first such node, or null.
export const OBJECT_PROTO_NAMES = Object.getOwnPropertyNames(Object.prototype).sort();
// a `__proto__: v` member of an object literal (not computed, not shorthand) sets the new object's prototype (ECMA-262
// B.3.1, __proto__ property names in object initializers); a value read as a record or a dictionary never carries it
export function literalProtoMember(p) { return ts.isPropertyAssignment(p) && ts.isObjectLiteralExpression(p.parent) && !!p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === '__proto__'; }
// every such maker of the file in source order, each with what it makes: `value` an expression whose value is the made
// object (Object.create, Object.setPrototypeOf's result, a literal with a `__proto__:` member), `target` an expression
// whose object it changes (setPrototypeOf's first argument, the object of `.__proto__ = p` or of a dynamic write whose
// key may be '__proto__'), `protos` the operands that become a prototype (or Object.create's property descriptors)
const makerLists = new WeakMap();
export function prototypeMakers(checker, sf) {
  if (makerLists.has(sf)) return makerLists.get(sf);
  const K = ts.SyntaxKind;
  const globalMember = (x, objects, names) => ts.isPropertyAccessExpression(x) && ts.isIdentifier(x.expression) && objects.includes(x.expression.text) && names.includes(x.name.text) && originOf(checker, x.expression, sf, null).kind === 'global';
  const out = [];
  const walk = (n) => {
    if (ts.isCallExpression(n) && globalMember(n.expression, ['Object'], ['create'])) out.push({ node: n, value: n, target: null, protos: [...n.arguments] });
    else if (ts.isCallExpression(n) && (globalMember(n.expression, ['Object'], ['setPrototypeOf']) || globalMember(n.expression, ['Reflect'], ['setPrototypeOf']))) out.push({ node: n, value: n.expression.expression.text === 'Object' ? n : null, target: n.arguments[0] ?? null, protos: n.arguments.slice(1) });
    else if (literalProtoMember(n)) out.push({ node: n, value: n.parent, target: null, protos: [n.initializer] });
    else if (ts.isBinaryExpression(n) && n.operatorToken.kind === K.EqualsToken) {
      const l = n.left;
      if ((ts.isPropertyAccessExpression(l) && l.name.text === '__proto__') || (ts.isElementAccessExpression(l) && ts.isStringLiteral(l.argumentExpression) && l.argumentExpression.text === '__proto__')) out.push({ node: n, value: null, target: l.expression, protos: [n.right] });
      else if (ts.isElementAccessExpression(l) && protoKeyWrite(checker, l.argumentExpression, n.right) === 'prototype') out.push({ node: n, value: null, target: l.expression, protos: [n.right] }); // a key that may be '__proto__' with an object or null value
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  makerLists.set(sf, out);
  return out;
}
export function prototypeMaker(checker, sf) {
  return prototypeMakers(checker, sf)[0]?.node ?? null;
}
// A write `o[k] = v` through a key that may be '__proto__'. ECMA-262 10.1.9 OrdinarySet finds no own key of that name
// on a plain object and reaches the accessor of Object.prototype (B.2.2.1.2); its setter replaces the prototype when v
// is an object or null and ignores a primitive, so no key is made either way. The answer, shared by the lint and the
// translator: 'free' when the key is never '__proto__' (a number, a string literal type other than '__proto__', a
// template whose fixed head or tail rules it out); 'primitive' when every value the type admits is a primitive (the
// write is skipped on that key); 'prototype' when the value may be an object or null (no reading of a dictionary
// holds a prototype, so the write is refused).
const PROTO_KEY = '__proto__';
export function protoKeyWrite(checker, key, value) {
  const TF = ts.TypeFlags;
  let k = key; while (ts.isParenthesizedExpression(k)) k = k.expression;
  const partFree = (t) => (t.flags & TF.StringLiteral ? t.value !== PROTO_KEY : !!(t.flags & TF.NumberLike) || (!!(t.flags & TF.TemplateLiteral) && (!PROTO_KEY.startsWith(t.texts[0]) || !PROTO_KEY.endsWith(t.texts[t.texts.length - 1]))));
  const kt = checker.getTypeAtLocation(k);
  const free = (ts.isTemplateExpression(k) && (!PROTO_KEY.startsWith(k.head.text) || !PROTO_KEY.endsWith(k.templateSpans[k.templateSpans.length - 1].literal.text)))
    || (ts.isStringLiteralLike(k) && k.text !== PROTO_KEY)
    || (kt.flags & TF.Union ? kt.types : [kt]).every(partFree);
  if (free || protoKeyGuarded(checker, k)) return 'free';
  const vt = checker.getTypeAtLocation(value);
  const primitive = (t) => !!(t.flags & (TF.StringLike | TF.NumberLike | TF.BigIntLike | TF.BooleanLike | TF.EnumLike | TF.ESSymbolLike | TF.Undefined | TF.Void | TF.Never));
  return (vt.flags & TF.Union ? vt.types : [vt]).every(primitive) ? 'primitive' : 'prototype';
}

// A key the code tests against '__proto__' before the write is never that name at the write: the key is one name
// (a const, or a parameter the function never assigns) and the write sits in the branch of `k !== '__proto__'` (or
// `!=`, either order, alone or one conjunct of `&&`), in the else branch of `k === '__proto__'` (or one disjunct of
// `||`), or after `if (k === '__proto__') <return | throw | break | continue>` in the same block. The write then
// makes or replaces an own key as for any other name. No other test counts (TypeScript does not narrow a string
// by `!==`, so the guard is read off the syntax).
function protoKeyGuarded(checker, key) {
  const K = ts.SyntaxKind;
  const un = (x) => { while (x && ts.isParenthesizedExpression(x)) x = x.expression; return x; };
  if (!ts.isIdentifier(key)) return false;
  const sym = checker.getSymbolAtLocation(key);
  const decl = sym?.valueDeclaration;
  if (!decl) return false;
  const fn = (x) => { for (let p = x.parent; p; p = p.parent) if (ts.isFunctionLike(p)) return p; return null; };
  const home = fn(decl);
  if (!home || home !== fn(key)) return false; // the guard and the write are in the function that binds the key
  const constant = ts.isVariableDeclaration(decl) && ts.isIdentifier(decl.name) && !!(ts.getCombinedNodeFlags(decl) & ts.NodeFlags.Const);
  const param = ts.isParameter(decl) && ts.isIdentifier(decl.name) && decl.parent === home;
  if (!constant && !param) return false;
  if (param) { // a parameter assigned anywhere in its function may hold another key at the write
    let hit = false;
    const w = (x) => { if (hit) return; if (ts.isIdentifier(x) && x !== decl.name && checker.getSymbolAtLocation(x) === sym) { const p = x.parent; if ((ts.isBinaryExpression(p) && p.left === x && p.operatorToken.kind >= K.FirstAssignment && p.operatorToken.kind <= K.LastAssignment) || ((ts.isPrefixUnaryExpression(p) || ts.isPostfixUnaryExpression(p)) && [K.PlusPlusToken, K.MinusMinusToken].includes(p.operator)) || ts.isArrayLiteralExpression(p) || ts.isShorthandPropertyAssignment(p)) hit = true; } ts.forEachChild(x, w); };
    if (home.body) w(home.body);
    if (hit) return false;
  }
  const isKey = (x) => { x = un(x); return !!x && ts.isIdentifier(x) && checker.getSymbolAtLocation(x) === sym; };
  const isProto = (x) => { x = un(x); return !!x && ts.isStringLiteralLike(x) && x.text === PROTO_KEY; };
  const compare = (c, ops) => { c = un(c); return ts.isBinaryExpression(c) && ops.includes(c.operatorToken.kind) && ((isKey(c.left) && isProto(c.right)) || (isProto(c.left) && isKey(c.right))); };
  const notProto = (c) => { c = un(c); if (ts.isBinaryExpression(c) && c.operatorToken.kind === K.AmpersandAmpersandToken) return notProto(c.left) || notProto(c.right); return compare(c, [K.ExclamationEqualsEqualsToken, K.ExclamationEqualsToken]); };
  const isProtoTest = (c) => { c = un(c); if (ts.isBinaryExpression(c) && c.operatorToken.kind === K.BarBarToken) return isProtoTest(c.left) || isProtoTest(c.right); return compare(c, [K.EqualsEqualsEqualsToken, K.EqualsEqualsToken]); };
  const exits = (st) => { if (!st) return false; if (ts.isBlock(st)) return exits(st.statements[st.statements.length - 1]); return ts.isReturnStatement(st) || ts.isThrowStatement(st) || ts.isBreakStatement(st) || ts.isContinueStatement(st); };
  for (let c = key, p = key.parent; p && p !== home; c = p, p = p.parent) {
    if (ts.isIfStatement(p) && c === p.thenStatement && notProto(p.expression)) return true;
    if (ts.isIfStatement(p) && c === p.elseStatement && isProtoTest(p.expression)) return true;
    if (ts.isBlock(p) || ts.isCaseClause(p) || ts.isDefaultClause(p)) {
      const i = p.statements.indexOf(c);
      for (let j = 0; j < i; j++) { const s = p.statements[j]; if (ts.isIfStatement(s) && !s.elseStatement && isProtoTest(s.expression) && exits(s.thenStatement)) return true; }
    }
    if (ts.isFunctionLike(p)) return false;
  }
  return false;
}

// The reach of a made prototype (design/narrow-in.md). An object whose prototype is not Object.prototype can be the right
// operand of an `in` only in a unit it reaches; every other unit keeps the `in` reading of a plain object. It reaches the
// unit that makes it, and then follows the paths a value has between the units of one file, until nothing changes:
//   - an argument of a call to a unit of the file is that unit's parameter;
//   - a unit that returns it (or yields it) hands it to every unit calling it, as the call's value;
//   - a unit that changes its parameter's object (the caller's object) hands it to the argument of every call to it;
//   - a module cell that holds it reaches every unit reading the cell;
//   - inside a unit it follows bindings, assignments, field and element reads (deep: a value read off a carrier carries),
//     literals and closures that hold it, and the built-in calls of the default library, which keep no reference beyond
//     their arguments, their receiver and their result (a mutator such as push or Object.assign writes it into its
//     receiver or first argument; a callback receives it as a parameter).
// The wide rule (every unit refused) stands when it leaves what the file can follow: a call the file does not read (an
// import, a parameter's function), code outside the file through a returned value or a changed argument of an exported
// unit or of a class method, a field of `this`, a thrown value, an element, an exported module cell or module code, and a
// new prototype that may hold functions (they run with the made object as `this`) in a file that uses `this`.
const reachCache = new WeakMap();
export function prototypeReach(checker, sf) {
  if (reachCache.has(sf)) return reachCache.get(sf);
  const makers = prototypeMakers(checker, sf);
  const r = makers.length ? reachOf(checker, sf, makers) : null;
  reachCache.set(sf, r);
  return r;
}
// the refusal of an `in` at `node`: null when no made object reaches the unit holding it, else { maker, why }
export function inPrototypeReach(checker, sf, node) {
  const r = prototypeReach(checker, sf);
  if (!r) return null;
  const maker = r.makers[0].node;
  if (r.wide) return { maker, why: r.wide };
  const u = r.unitOf(node);
  if (!u) return { maker, why: 'this `in` is in module code, which the reach does not follow' };
  const why = r.reached.get(u.name);
  return why ? { maker, why } : null;
}
const LIB_FILE = /[\\/]typescript[\\/]lib[\\/]lib\.[^\\/]*\.d\.ts$/;
const CALLBACK_CONSUMERS = new Set(['then', 'catch', 'finally', 'map', 'flatMap', 'forEach', 'filter', 'find', 'findIndex', 'findLast', 'findLastIndex', 'some', 'every', 'reduce', 'reduceRight', 'sort', 'toSorted']);
const RECEIVER_WRITERS = new Set(['push', 'unshift', 'splice', 'fill', 'copyWithin', 'set', 'add', 'register']);
const FIRST_ARG_WRITERS = new Set(['Object.assign', 'Object.defineProperty', 'Object.defineProperties', 'Object.setPrototypeOf', 'Reflect.set', 'Reflect.defineProperty', 'Reflect.setPrototypeOf']);
function reachOf(checker, sf, makers) {
  const K = ts.SyntaxKind, TF = ts.TypeFlags;
  const units = [];
  for (const st of sf.statements) { const u = unitOf(st); if (u?.body) units.push(u); units.push(...classMethodUnits(st)); } // a bodiless declaration (an overload, `declare`) is code outside the file
  const byFn = new Map(units.map((u) => [u.fn, u]));
  const inside = (n, root) => { for (let p = n; p; p = p.parent) if (p === root) return true; return false; };
  const unitOfNode = (n) => { for (let p = n; p; p = p.parent) { const u = byFn.get(p); if (u) return u; } return null; };
  const line = (n) => lineOf(sf, n.getStart(sf));
  const carriers = new Map(units.map((u) => [u.name, new Set()])), paramOut = new Map(units.map((u) => [u.name, new Set()])), paramHold = new Map(units.map((u) => [u.name, new Set()]));
  const reached = new Map(), returns = new Set(), cells = new Set(), mutated = new Set(), madeOnly = new Set(), thisCarrier = new Set();
  let wide = null, changed = true, deep = false, thisWide = false;
  // a property read yields a made object only when some object holds one (a store, a literal, a built-in's result, the
  // arguments object, a rest parameter): until then a read off a carrier is a plain value, after it every read carries
  const container = () => { if (!deep) { deep = true; changed = true; } };
  const goWide = (why) => { if (!wide) wide = why; };
  const reach = (u, why) => { if (!reached.has(u.name)) { reached.set(u.name, why); changed = true; } };
  const add = (set, x) => { if (!set.has(x)) { set.add(x); changed = true; } };
  const strip = (e) => { while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e) || ts.isTypeAssertionExpression(e) || ts.isSatisfiesExpression(e) || ts.isAwaitExpression(e) || ts.isSpreadElement(e))) e = e.expression; return e; };
  const symOf = (id) => { const p = id.parent; let s = p && ts.isShorthandPropertyAssignment(p) && p.name === id ? checker.getShorthandAssignmentValueSymbol(p) : checker.getSymbolAtLocation(id); if (s && s.flags & ts.SymbolFlags.Alias) { try { s = checker.getAliasedSymbol(s); } catch { /* unresolved */ } } return s ?? null; };
  const declOf = (s) => s?.valueDeclaration ?? s?.declarations?.[0] ?? null;
  const ownFn = (n) => { for (let p = n.parent; p; p = p.parent) if (ts.isFunctionLike(p)) return p; return null; };
  const thisFn = (n) => { for (let p = n.parent; p; p = p.parent) if (ts.isFunctionLike(p) && !ts.isArrowFunction(p)) return p; return null; };
  const moduleLevel = (d) => { if (!d || d.getSourceFile() !== sf) return false; for (let p = d.parent; p; p = p.parent) if (ts.isFunctionLike(p) || ts.isClassLike(p)) return false; return true; };
  const exported = (d) => { if (d && ts.isVariableStatement(d)) d = d.declarationList.declarations[0]; return !!d && !!(ts.getCombinedModifierFlags(d) & (ts.ModifierFlags.Export | ts.ModifierFlags.Default)); };
  const unitSym = new Map();
  for (const u of units) { const nm = u.cls ? u.fn.name : ts.isFunctionDeclaration(u.node) ? u.node.name : u.node.declarationList?.declarations[0]?.name; const s = nm && checker.getSymbolAtLocation(nm); if (s) unitSym.set(s, u); }
  // the references of every name outside the units (module code) and the value uses of each unit's name
  const moduleRefs = new Set(), valueUse = new Set();
  const refs = (n) => {
    if (ts.isIdentifier(n)) {
      const s = symOf(n); const p = n.parent;
      const isDeclName = p && (ts.isVariableDeclaration(p) || ts.isFunctionDeclaration(p) || ts.isClassDeclaration(p) || ts.isParameter(p) || ts.isBindingElement(p) || ts.isMethodDeclaration(p) || ts.isPropertyDeclaration(p) || ts.isGetAccessorDeclaration(p) || ts.isSetAccessorDeclaration(p)) && p.name === n;
      const member = p && ((ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n));
      if (s && !isDeclName && !member) {
        const owner = unitOfNode(n);
        if (!owner) moduleRefs.add(s);
        const u = unitSym.get(s);
        if (u && (!owner || !(ts.isCallExpression(p) && p.expression === n))) valueUse.add(u.name); // a unit's name as a value or called from module code
      }
    }
    if (ts.isPropertyAccessExpression(n) && n.expression.kind === K.ThisKeyword && ts.isCallExpression(n.parent) && n.parent.expression === n) { /* a method call on this: an ordinary call */ }
    ts.forEachChild(n, refs);
  };
  refs(sf);
  const outsideCallable = (u) => !!u.cls || exported(u.node) || valueUse.has(u.name);
  let usesThis = false; const thisScan = (n) => { if (usesThis) return; if (n.kind === K.ThisKeyword) { usesThis = true; return; } ts.forEachChild(n, thisScan); }; thisScan(sf);
  const primitiveOnly = (t) => (t.flags & TF.Union ? t.types : [t]).every((x) => !!(x.flags & (TF.StringLike | TF.NumberLike | TF.BigIntLike | TF.BooleanLike | TF.EnumLike | TF.ESSymbolLike | TF.Null | TF.Undefined | TF.Void | TF.Never)));
  const callable = (t) => (t.flags & TF.Union ? t.types : [t]).some((x) => checker.getSignaturesOfType(x, ts.SignatureKind.Call).length > 0);
  const fromLib = (d) => !!d && LIB_FILE.test(d.getSourceFile().fileName);
  const mayCall = (t) => (t.flags & TF.Union ? t.types : [t]).some((x) => !!(x.flags & (TF.Any | TF.Unknown | TF.TypeParameter | TF.NonPrimitive | TF.Index | TF.IndexedAccess | TF.Conditional | TF.Substitution)) || checker.getSignaturesOfType(x, ts.SignatureKind.Call).length > 0 || checker.getSignaturesOfType(x, ts.SignatureKind.Construct).length > 0);
  // a new prototype whose own members are data: its functions are Object.prototype's, which never read the made object's keys as `this` code of the file
  const functionFree = (p) => {
    p = strip(p);
    if (!p || p.kind === K.NullKeyword) return true;
    const t = checker.getTypeAtLocation(p);
    return (t.flags & TF.Union ? t.types : [t]).every((x) => {
      if (primitiveOnly(x)) return true;
      if (mayCall(x) || !(x.flags & TF.Object) || (x.objectFlags & ts.ObjectFlags.Class) || x.symbol?.declarations?.some((d) => ts.isClassLike(d))) return false;
      if (checker.getIndexInfosOfType(x).some((ii) => mayCall(ii.type))) return false;
      return checker.getPropertiesOfType(x).every((ps) => !ps.declarations?.some((d) => ts.isGetAccessorDeclaration(d) || ts.isSetAccessorDeclaration(d) || ts.isMethodDeclaration(d) || ts.isMethodSignature(d)) && !mayCall(checker.getTypeOfSymbolAtLocation(ps, p)));
    });
  };
  const makerValues = new Set(makers.map((m) => m.value).filter(Boolean));
  const makerOf = new Map(makers.map((m) => [m.node, m]));
  for (const m of makers) {
    if (m.protos.some((p, i) => !functionFree(p) || (i > 0 && ts.isCallExpression(m.node) && m.value === m.node))) thisWide = thisWide || `its new prototype (line ${line(m.node)}) may hold functions, which may run here with the made object as \`this\``;
    if (unitOfNode(m.node)) continue;
    // module code: a module cell's initializer, or a change of a module cell's object
    const host = m.value ? (() => { let x = m.value; while (x.parent && (ts.isParenthesizedExpression(x.parent) || ts.isAsExpression(x.parent) || ts.isNonNullExpression(x.parent) || ts.isSatisfiesExpression(x.parent))) x = x.parent; return x.parent && ts.isVariableDeclaration(x.parent) && x.parent.initializer === x && ts.isIdentifier(x.parent.name) && moduleLevel(x.parent) ? x.parent.name : null; })() : (() => { let t = strip(m.target); while (t && (ts.isPropertyAccessExpression(t) || ts.isElementAccessExpression(t))) t = strip(t.expression); return t && ts.isIdentifier(t) && moduleLevel(declOf(symOf(t))) ? t : null; })();
    const s = host && symOf(host);
    if (s) cells.add(s); else goWide(`it is made in module code (line ${line(m.node)}) outside a module cell`);
  }
  const target = (call, u) => {
    let d = null; try { d = checker.getResolvedSignature(call)?.declaration ?? null; } catch { /* no signature */ }
    if (d && byFn.has(d)) return { kind: 'unit', u: byFn.get(d) };
    if (d && ts.isFunctionLike(d) && d.body && inside(d, u.fn)) return { kind: 'local', fn: d }; // a function written inside the unit (a function type is no code)
    if (fromLib(d)) return { kind: 'lib' };
    const callee = strip(call.expression ?? call.tag);
    if (ts.isNewExpression(call) && callee && ts.isIdentifier(callee)) { const cd = declOf(symOf(callee)); if (cd && ts.isClassDeclaration(cd) && cd.getSourceFile() === sf && !cd.heritageClauses?.length && !cd.members.some(ts.isConstructorDeclaration)) return { kind: 'none' }; }
    let root = callee; while (root && (ts.isPropertyAccessExpression(root) || ts.isElementAccessExpression(root))) root = strip(root.expression);
    if (root && ts.isIdentifier(root) && root.text === 'console' && originOf(checker, root, sf, null).kind === 'global') return { kind: 'lib' };
    return { kind: 'other' };
  };
  const argsOf = (call) => call.arguments ? [...call.arguments] : ts.isTaggedTemplateExpression(call) && ts.isTemplateExpression(call.template) ? call.template.templateSpans.map((x) => x.expression) : [];
  const receiverOf = (call) => { const c = strip(call.expression ?? call.tag); return c && (ts.isPropertyAccessExpression(c) || ts.isElementAccessExpression(c)) ? c.expression : null; };
  const libName = (call) => { const c = strip(call.expression); return c && ts.isPropertyAccessExpression(c) && ts.isIdentifier(c.expression) ? `${c.expression.text}.${c.name.text}` : ''; };
  // does the value of `e` (in unit u) hold a made object, or is it one
  const busy = new Set();
  const returnsCarry = (fn, u) => {
    if (busy.has(fn)) return false; busy.add(fn);
    try {
      if (fn.body && !ts.isBlock(fn.body)) return carry(fn.body, u);
      let hit = false; const w = (n) => { if (hit) return; if ((ts.isReturnStatement(n) || ts.isYieldExpression(n)) && n.expression && ownFn(n) === fn && carry(n.expression, u)) { hit = true; return; } ts.forEachChild(n, w); }; if (fn.body) w(fn.body);
      return hit;
    } finally { busy.delete(fn); }
  };
  const captures = (fn, u) => { const C = carriers.get(u.name); let hit = false; const w = (n) => { if (hit) return; if (ts.isIdentifier(n)) { const s = symOf(n); if (s && (C.has(s) || cells.has(s) || (unitSym.has(s) && returns.has(unitSym.get(s).name)))) { hit = true; return; } } if (makerValues.has(n)) { hit = true; return; } ts.forEachChild(n, w); }; ts.forEachChild(fn, w); return hit; };
  const carry = (e, u) => {
    e = strip(e); if (!e) return false;
    if (makerValues.has(e)) return true;
    if (ts.isExpression(e) && !ts.isFunctionLike(e) && primitiveOnly(checker.getTypeAtLocation(e))) return false; // a primitive value holds no object
    const C = carriers.get(u.name);
    if (ts.isIdentifier(e)) {
      const s = symOf(e); if (!s) return false;
      if (C.has(s) || cells.has(s)) return true;
      if (e.text === 'arguments' && (!declOf(s) || fromLib(declOf(s)))) return [...C].some((x) => { let d = declOf(x); while (d && ts.isBindingElement(d)) d = d.parent?.parent; return !!d && ts.isParameter(d); }) && (container(), true); // the arguments object holds the parameters
      const fu = unitSym.get(s); return !!fu && returns.has(fu.name); // a unit that returns one, as a value
    }
    if (e.kind === K.ThisKeyword || e.kind === K.SuperKeyword) { const f = thisFn(e); if (f === u.fn) return thisCarrier.has(u.name); return !!f && inside(f, u.fn) && (!!thisWide || reached.has(u.name)); } // a method's receiver, a nested function's `this`
    if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) return deep && carry(e.expression, u);
    if (ts.isCallExpression(e) || ts.isNewExpression(e) || ts.isTaggedTemplateExpression(e)) {
      const t = target(e, u);
      if (t.kind === 'unit') return returns.has(t.u.name);
      if (t.kind === 'local') return returnsCarry(t.fn, u);
      const callee = strip(e.expression ?? e.tag);
      if (callee && carry(callee, u)) return true;
      if (t.kind === 'lib') { const consumer = callee && ts.isPropertyAccessExpression(callee) && CALLBACK_CONSUMERS.has(callee.name.text); const hit = argsOf(e).some((a) => { const y = strip(a); return consumer && y && (ts.isArrowFunction(y) || ts.isFunctionExpression(y)) ? returnsCarry(y, u) : carry(a, u); }) || (!!receiverOf(e) && carry(receiverOf(e), u)); if (hit) container(); return hit; } // a callback a method only calls gives the result its returns, never itself
      return false;
    }
    if (ts.isConditionalExpression(e)) return carry(e.whenTrue, u) || carry(e.whenFalse, u);
    if (ts.isBinaryExpression(e)) {
      const op = e.operatorToken.kind;
      if (op === K.CommaToken || (op >= K.FirstAssignment && op <= K.LastAssignment)) return carry(e.right, u);
      if (op === K.BarBarToken || op === K.AmpersandAmpersandToken || op === K.QuestionQuestionToken) return carry(e.left, u) || carry(e.right, u);
      return false;
    }
    if (ts.isObjectLiteralExpression(e)) { const hit = e.properties.some((p) => ts.isPropertyAssignment(p) ? carry(p.initializer, u) : ts.isShorthandPropertyAssignment(p) ? carry(p.name, u) : ts.isSpreadAssignment(p) ? carry(p.expression, u) : captures(p, u) || returnsCarry(p, u)); if (hit) container(); return hit || e.properties.some(literalProtoMember); }
    if (ts.isArrayLiteralExpression(e)) { const hit = e.elements.some((x) => carry(x, u)); if (hit) container(); return hit; }
    if (ts.isArrowFunction(e) || ts.isFunctionExpression(e)) return captures(e, u) || returnsCarry(e, u);
    if (ts.isClassExpression(e)) return captures(e, u);
    if (ts.isLiteralExpression(e) || ts.isTemplateExpression(e) || ts.isNoSubstitutionTemplateLiteral(e) || ts.isPrefixUnaryExpression(e) || ts.isPostfixUnaryExpression(e) || ts.isTypeOfExpression(e) || ts.isVoidExpression(e) || ts.isDeleteExpression(e) || ts.isYieldExpression(e) || [K.TrueKeyword, K.FalseKeyword, K.NullKeyword].includes(e.kind) || ts.isJsxElement(e) || ts.isJsxSelfClosingElement(e) || ts.isJsxFragment(e)) return false;
    let hit = false; ts.forEachChild(e, (c) => { if (!hit && ts.isExpression(c) && carry(c, u)) hit = true; }); return hit; // another form: any operand that holds one
  };
  const bindNames = (name, u) => { if (!name) return; if (ts.isIdentifier(name)) { const s = symOf(name); if (s) add(carriers.get(u.name), s); return; } if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) for (const el of name.elements) if (ts.isBindingElement(el)) bindNames(el.name, u); };
  const bindParams = (fn, u, idx) => { const ps = fn.parameters ?? []; (idx === null ? ps : [ps[idx] ?? ps.find((p) => p.dotDotDotToken)].filter(Boolean)).forEach((p) => { if (p.dotDotDotToken) container(); bindNames(p.name, u); }); }; // a rest parameter is an array holding the arguments
  // the object `x` evaluates to now holds (or is) a made object: the names that may share it carry it too
  const sinking = new Set();
  const returnsOf = (fn) => { if (fn.body && !ts.isBlock(fn.body)) return [fn.body]; const out = []; const w = (n) => { if ((ts.isReturnStatement(n) || ts.isYieldExpression(n)) && n.expression && ownFn(n) === fn) out.push(n.expression); ts.forEachChild(n, w); }; if (fn.body) w(fn.body); return out; };
  const libNamespace = (o) => { o = strip(o); if (!o || !ts.isIdentifier(o)) return false; const d = declOf(symOf(o)); return fromLib(d) && !ts.isParameter(d); }; // Object, Array, JSON: a built-in namespace, never an operand that holds data
  // holds: the object now holds a made object (a store); otherwise it is made (its own prototype changed)
  const sinkMut = (x, u, site, holds = true) => {
    x = strip(x); if (!x || wide) return;
    if (ts.isExpression(x) && primitiveOnly(checker.getTypeAtLocation(x))) return; // a primitive (undefined, null, a string) holds no object
    if (holds) container();
    if (ts.isIdentifier(x)) {
      const s = symOf(x), d = declOf(s);
      if (!s || !d || d.getSourceFile() !== sf) return goWide(`it is stored into \`${x.text}\`, which lives outside the file (line ${line(site)})`);
      if (moduleLevel(d) && (ts.isClassDeclaration(d) || ts.isFunctionDeclaration(d))) return goWide(`it is stored on \`${x.text}\` (line ${line(site)}), whose \`this\` code the reach does not follow`);
      if (moduleLevel(d)) { add(cells, s); return; }
      if (!inside(d, u.fn)) return goWide(`it is stored into \`${x.text}\`, a name of another function (line ${line(site)})`);
      add(carriers.get(u.name), s);
      if (mutated.has(s) || (!holds && madeOnly.has(s))) return; (holds ? mutated : madeOnly).add(s); changed = true; // followed once as made, once more if it comes to hold one
      let p = d; while (p && ts.isBindingElement(p)) p = p.parent?.parent;
      if (p && ts.isParameter(p)) {
        if (p.parent === u.fn) { const i = u.fn.parameters.indexOf(p); if (holds || p !== d) add(paramHold.get(u.name), i); return add(paramOut.get(u.name), i); } // the caller's object (a part of it when destructured)
        const f = p.parent, call = f.parent;
        if (call && ts.isCallExpression(call) && call.arguments.includes(f) && target(call, u).kind === 'lib') { for (const o of [receiverOf(call), ...call.arguments]) if (o && o !== f && !primitiveOnly(checker.getTypeAtLocation(o))) sinkMut(o, u, site); return; } // a callback of a built-in: its parameter is an element or an argument of that call
        return goWide(`it is stored into the parameter \`${x.text}\` of a nested function (line ${line(site)})`);
      }
      if (p && ts.isVariableDeclaration(p) && ts.isCatchClause(p.parent)) return goWide(`it is stored into the caught value \`${x.text}\` (line ${line(site)})`);
      if (p && ts.isVariableDeclaration(p)) {
        const loop = p.parent?.parent;
        if (loop && ts.isForOfStatement(loop) && loop.initializer === p.parent) sinkMut(loop.expression, u, site);
        else if (p.initializer) sinkMut(p.initializer, u, site, holds || p !== d);
        const w = (n) => { if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment && ts.isIdentifier(strip(n.left)) && symOf(strip(n.left)) === s) sinkMut(n.right, u, site, holds); ts.forEachChild(n, w); }; w(u.fn);
        return;
      }
      if (p && (ts.isFunctionDeclaration(p) || ts.isClassDeclaration(p))) return;
      return goWide(`it is stored into \`${x.text}\` (line ${line(site)}), a name the reach does not follow`);
    }
    if (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x)) return sinkMut(x.expression, u, site);
    if (x.kind === K.ThisKeyword) return goWide(`it is stored into a field of \`this\` (line ${line(site)}), which every holder of the receiver reads`);
    if (ts.isObjectLiteralExpression(x) || ts.isArrayLiteralExpression(x) || ts.isArrowFunction(x) || ts.isFunctionExpression(x) || makerValues.has(x) || ts.isLiteralExpression(x)) return; // a fresh object: no other name holds it
    if (ts.isConditionalExpression(x)) { sinkMut(x.whenTrue, u, site, holds); sinkMut(x.whenFalse, u, site, holds); return; }
    if (ts.isBinaryExpression(x)) { const op = x.operatorToken.kind; if (op === K.CommaToken || (op >= K.FirstAssignment && op <= K.LastAssignment)) return sinkMut(x.right, u, site, holds); if (op === K.BarBarToken || op === K.AmpersandAmpersandToken || op === K.QuestionQuestionToken) { sinkMut(x.left, u, site, holds); sinkMut(x.right, u, site, holds); return; } }
    if (ts.isNewExpression(x) && target(x, u).kind === 'lib') return; // a fresh built-in object
    if (ts.isCallExpression(x) && target(x, u).kind === 'lib') { for (const o of [receiverOf(x), ...x.arguments]) if (o && !primitiveOnly(checker.getTypeAtLocation(o)) && !libNamespace(o)) sinkMut(o, u, site); return; } // a built-in's result is fresh or one of its operands (an element, the receiver)
    if (ts.isCallExpression(x) || ts.isNewExpression(x)) { const t = target(x, u); if (t.kind === 'unit' && !sinking.has(t.u.name)) { sinking.add(t.u.name); try { returnsOf(t.u.fn).forEach((r) => sinkMut(r, t.u, site, holds)); } finally { sinking.delete(t.u.name); } return; } if (t.kind === 'unit') return; } // a unit's result is what its returns name: a fresh object, its parameter, a module cell
    return goWide(`it is stored into a value the reach does not follow (line ${line(site)})`);
  };
  const assignTo = (left, u, site) => {
    left = strip(left); if (!left) return;
    if (ts.isIdentifier(left)) {
      const s = symOf(left), d = declOf(s);
      if (!s || !d || d.getSourceFile() !== sf) return goWide(`it is assigned to \`${left.text}\`, outside the file (line ${line(site)})`);
      if (moduleLevel(d)) return add(cells, s);
      return add(carriers.get(u.name), s);
    }
    if (ts.isPropertyAccessExpression(left)) {
      const ps = checker.getSymbolAtLocation(left.name), setter = ps?.declarations?.find(ts.isSetAccessorDeclaration);
      if (setter) { const su = byFn.get(setter); if (su) { bindParams(setter, su, 0); reach(su, `a setter call from \`${u.name}\` hands it here (line ${line(site)})`); } else if (!fromLib(setter)) goWide(`it is passed to a setter the file does not read (line ${line(site)})`); }
    }
    if (ts.isPropertyAccessExpression(left) || ts.isElementAccessExpression(left)) return sinkMut(left.expression, u, site);
    if (ts.isObjectLiteralExpression(left)) { for (const p of left.properties) assignTo(ts.isPropertyAssignment(p) ? p.initializer : ts.isShorthandPropertyAssignment(p) ? p.name : ts.isSpreadAssignment(p) ? p.expression : null, u, site); return; }
    if (ts.isArrayLiteralExpression(left)) { for (const el of left.elements) assignTo(el, u, site); return; }
  };
  const handOver = (x, u, site) => { // an operand of a built-in call that carries something: a callback receives it
    x = strip(x); if (!x) return;
    if (ts.isArrowFunction(x) || ts.isFunctionExpression(x)) return bindParams(x, u, null);
    const t = checker.getTypeAtLocation(x);
    if (!callable(t) || carry(x, u)) return;
    const id = ts.isIdentifier(x) ? x : ts.isPropertyAccessExpression(x) ? x.name : null;
    const s = id && symOf(id), d = declOf(s);
    const fu = s && unitSym.get(s);
    if (fu) { bindParams(fu.fn, fu, null); reach(fu, `a built-in call in \`${u.name}\` calls this unit with it (line ${line(site)})`); if (fu.cls && !fu.isStatic) goWide(`a method value is handed to a built-in call with it (line ${line(site)})`); return; }
    if (d && ts.isFunctionLike(d) && d.body && inside(d, u.fn)) return bindParams(d, u, null);
    if (d && ts.isVariableDeclaration(d) && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)) && inside(d, u.fn)) return bindParams(d.initializer, u, null);
    if (fromLib(d)) return;
    goWide(`it is handed with a function value the file does not read to a built-in call (line ${line(site)})`);
  };
  const call = (n, u) => {
    const t = target(n, u), args = argsOf(n), recv = receiverOf(n), callee = strip(n.expression ?? n.tag);
    if (t.kind === 'unit') {
      if (returns.has(t.u.name)) reach(u, `\`${t.u.name}\` returns it here (line ${line(n)})`);
      for (const i of paramOut.get(t.u.name)) { if (!args[i] || args.slice(0, i + 1).some(ts.isSpreadElement)) { goWide(`a call to \`${t.u.name}\` changes an argument the reach cannot name (line ${line(n)})`); continue; } reach(u, `a call to \`${t.u.name}\` (line ${line(n)}) changes the prototype of an object here`); sinkMut(args[i], u, n, paramHold.get(t.u.name).has(i)); }
    }
    const carried = args.map((a) => carry(a, u)), recvC = !!recv && carry(recv, u), calleeC = !recv && !!callee && carry(callee, u);
    if (!carried.some(Boolean) && !recvC) return; // a carried function value called with nothing made: its result carries (carry), its code is a unit's
    if (t.kind === 'unit') {
      if (recvC && t.u.cls && !t.u.isCtor) { add(thisCarrier, t.u.name); reach(t.u, `it is the receiver of a call from \`${u.name}\` (line ${line(n)})`); } // the method's `this`
      carried.forEach((c, i) => { if (c) bindParams(t.u.fn, t.u, ts.isSpreadElement(args[i]) ? null : i); });
      if (carried.some(Boolean)) reach(t.u, `it reaches this unit as an argument from \`${u.name}\` (line ${line(n)})`);
      return;
    }
    if (t.kind === 'local') { carried.forEach((c, i) => { if (c) bindParams(t.fn, u, ts.isSpreadElement(args[i]) ? null : i); }); if (recvC) goWide(`it is the receiver of a nested function (line ${line(n)})`); return; }
    if (t.kind === 'none') return;
    if (callee?.kind === K.SuperKeyword) return goWide(`it is passed to the constructor of a class the file does not read (line ${line(n)}), which may keep it in the new object`);
    if (t.kind === 'lib') {
      // a built-in hands a callback only values of its operands: a callback whose own captures carry receives nothing made, unless another operand carries or another function could be handed to it
      const ops = [...args, ...(recv ? [recv] : [])], opC = [...carried, ...(recv ? [recvC] : [])];
      const fnOps = ops.filter((x) => { const y = strip(x); return !!y && (ts.isArrowFunction(y) || ts.isFunctionExpression(y) || callable(checker.getTypeAtLocation(y))); }).length;
      ops.forEach((x, i) => { if (ops.some((_, j) => j !== i && opC[j]) || (opC[i] && fnOps > 1)) handOver(x, u, n); });
      const lib = libName(n), m = callee && ts.isPropertyAccessExpression(callee) ? callee.name.text : '';
      if (carried.some(Boolean) && (lib === 'Promise.reject' || ['reject', 'abort', 'error', 'throw'].includes(m))) return goWide(`it is handed to \`${callee.getText(sf).slice(0, 40)}\` (line ${line(n)}), which may throw it, and a handler anywhere may catch it`);
      const written = FIRST_ARG_WRITERS.has(lib) ? [args[0]] : recv && RECEIVER_WRITERS.has(m) ? [recv] : ['call', 'apply', 'bind'].includes(m) || lib.startsWith('Reflect.') ? args.filter((a) => !primitiveOnly(checker.getTypeAtLocation(a))) : []; // call, apply and Reflect hand their object operands to another function as `this` or arguments
      for (const w of written) if (w && !carry(w, u)) sinkMut(w, u, n);
      return;
    }
    goWide(`it is passed to a call the file does not read (\`${(callee ?? n).getText(sf).slice(0, 60)}\`, line ${line(n)}), which may hand it to any unit`);
  };
  const scan = (u) => {
    const visit = (n) => {
      if (wide) return;
      const m = makerOf.get(n);
      if (m) { reach(u, `it is made in this unit (line ${line(n)})`); if (m.target) sinkMut(m.target, u, n, false); }
      if (ts.isIdentifier(n)) { const s = symOf(n); if (s && cells.has(s)) { add(carriers.get(u.name), s); reach(u, `this unit reads the module cell \`${n.text}\`, which holds it`); } }
      if (ts.isVariableDeclaration(n) && n.initializer && carry(n.initializer, u)) bindNames(n.name, u);
      if (ts.isForOfStatement(n) && carry(n.expression, u)) { if (ts.isVariableDeclarationList(n.initializer)) n.initializer.declarations.forEach((d) => bindNames(d.name, u)); else assignTo(n.initializer, u, n); }
      if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment && carry(n.right, u)) assignTo(n.left, u, n);
      if ((ts.isReturnStatement(n) || ts.isYieldExpression(n)) && n.expression && ownFn(n) === u.fn && carry(n.expression, u)) add(returns, u.name);
      if (thisWide && (ts.isReturnStatement(n) || ts.isYieldExpression(n)) && n.expression && ownFn(n) !== u.fn && ownFn(n) && !ts.isArrowFunction(ownFn(n)) && carry(n.expression, u)) goWide(`${thisWide}, and a function that may run implicitly returns it (line ${line(n)})`);
      if (n === u.fn.body && !ts.isBlock(n) && carry(n, u)) add(returns, u.name);
      if (ts.isThrowStatement(n) && carry(n.expression, u)) goWide(`it is thrown (line ${line(n)}), and a handler anywhere may catch it`);
      if (ts.isCallExpression(n) || ts.isNewExpression(n) || ts.isTaggedTemplateExpression(n)) call(n, u);
      if ((ts.isJsxExpression(n) || ts.isJsxSpreadAttribute(n)) && n.expression && carry(n.expression, u)) goWide(`it is passed to an element (line ${line(n)}), which the reach does not follow`);
      if (ts.isDecorator(n)) return;
      ts.forEachChild(n, visit);
    };
    visit(u.fn);
    if ((carriers.get(u.name).size || returns.has(u.name)) && !reached.has(u.name)) reach(u, 'it reaches this unit');
  };
  for (const s of cells) { const d = declOf(s); if (d && exported(d)) goWide(`it is held in the exported module cell \`${s.name}\``); }
  // a prototype that may hold functions: the file's code that can run with the made object as `this` (a method, an
  // accessor, a function that is not an arrow) is reached, and its `this` carries it; such code outside the units is wide
  if (thisWide) {
    const mark = (n) => {
      if (wide) return;
      if (n.kind === K.ThisKeyword || n.kind === K.SuperKeyword) {
        const f = thisFn(n), owner = unitOfNode(n);
        if (f && !owner) goWide(`${thisWide}, and a function outside the units uses \`this\` (line ${line(n)})`);
        else if (f && owner && !(f === owner.fn && owner.isCtor)) { if (f === owner.fn) add(thisCarrier, owner.name); reach(owner, thisWide); }
      }
      ts.forEachChild(n, mark);
    };
    mark(sf);
  }
  for (let pass = 0; changed && !wide && pass < 200; pass++) {
    changed = false;
    if (thisWide && deep) for (const u of units) if (u.accessor === 'set') { bindParams(u.fn, u, null); reach(u, `${thisWide}; a setter of it receives what is stored`); } // a store into the made object may run a setter of its prototype
    for (const u of units) { scan(u); if (wide) break; }
    for (const s of cells) { const d = declOf(s); if (d && exported(d)) goWide(`it is held in the exported module cell \`${s.name}\``); else if (moduleRefs.has(s)) goWide(`module code reads the module cell \`${s.name}\`, which holds it`); }
    for (const u of units) if (outsideCallable(u) && (returns.has(u.name) || paramOut.get(u.name).size)) goWide(`\`${u.name}\` hands it to code outside the file (it ${returns.has(u.name) ? 'returns it' : 'changes the prototype of an argument'}), which may pass it to any unit`);
  }
  if (changed && !wide) goWide('the reach did not settle');
  return { makers, wide, reached, unitOf: unitOfNode };
}

// The accumulator of a reduce (ECMA-262 23.1.3.24 Array.prototype.reduce: the callback's first parameter holds
// initialValue, then each step's return value), when it names an object of the unit's own and never an element of the
// array: the call passes an initial value it builds out of primitives (`{}`, `[]`, `{ n: 0 }`, `new Map()`), the callback
// never rebinds the parameter, holds no nested function, and every value it returns is the parameter itself (the last
// operand of a comma included). Without an initial value the accumulator starts as the array's first element, a handed
// start is the caller's object, and a step that returns an element hands that element on: each is no accumulator here.
// The lint and the translator read the same test. Given the write (`write`, the assigned or mutated expression), it
// must also be one step deep (`acc.f = v`, `acc[k] = v`, `acc.push(x)`): a deeper path may pass through an object stored in it
export function reduceAccumulator(param, checker, write = null) {
  const cb = param && param.parent;
  if (!cb || !ts.isParameter(param) || !ts.isArrowFunction(cb) || cb.parameters[0] !== param || !ts.isIdentifier(param.name)) return false;
  const call = cb.parent;
  if (!call || !ts.isCallExpression(call) || call.arguments[0] !== cb || call.arguments.length < 2 || !ts.isPropertyAccessExpression(call.expression) || call.expression.name.text !== 'reduce') return false;
  const K = ts.SyntaxKind, TF = ts.TypeFlags;
  const bare = (x) => { while (ts.isParenthesizedExpression(x) || ts.isAsExpression(x) || ts.isNonNullExpression(x) || ts.isSatisfiesExpression(x) || ts.isTypeAssertionExpression(x)) x = x.expression; return x; };
  const primitive = (x) => { const t = checker.getTypeAtLocation(x); return (t.flags & TF.Union ? t.types : [t]).every((y) => y.flags & (TF.NumberLike | TF.BigIntLike | TF.StringLike | TF.BooleanLike | TF.Undefined | TF.Null | TF.EnumLike)); };
  const init = bare(call.arguments[1]);
  const built = (ts.isObjectLiteralExpression(init) && init.properties.every((q) => ts.isPropertyAssignment(q) && primitive(q.initializer)))
    || (ts.isArrayLiteralExpression(init) && init.elements.every((x) => !ts.isSpreadElement(x) && primitive(x)))
    || (ts.isNewExpression(init) && ts.isIdentifier(init.expression) && ['Map', 'Set', 'Array', 'Object'].includes(init.expression.text) && (init.arguments ?? []).length === 0);
  if (!built) return false;
  const name = param.name.text;
  const isAcc = (x) => { x = bare(x); while (ts.isBinaryExpression(x) && x.operatorToken.kind === K.CommaToken) x = bare(x.right); return ts.isIdentifier(x) && x.text === name; };
  let ok = true;
  const walk = (x) => {
    if (!ok) return;
    if (ts.isFunctionLike(x)) { ok = false; return; } // a nested function may capture and hand on the accumulator
    if (ts.isReturnStatement(x) && (!x.expression || !isAcc(x.expression))) { ok = false; return; }
    if (ts.isBinaryExpression(x) && x.operatorToken.kind >= K.FirstAssignment && x.operatorToken.kind <= K.LastAssignment && ts.isIdentifier(bare(x.left)) && bare(x.left).text === name) { ok = false; return; }
    ts.forEachChild(x, walk);
  };
  if (ts.isBlock(cb.body)) ts.forEachChild(cb.body, walk); else { if (!isAcc(cb.body)) return false; walk(cb.body); }
  if (!ok || !write) return ok;
  const target = bare(write);
  if (ts.isIdentifier(target)) return target.text === name;
  return (ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target)) && ts.isIdentifier(bare(target.expression)) && bare(target.expression).text === name;
}

// An OPEN record type: an object type that declares fields and carries an index signature (string or number) beside
// them (`interface H { accept?: string; [name: string]: string | undefined }`, IncomingHttpHeaders, ProcessEnv). The
// value reading holds its declared fields alone (a datatype of them), so a read of a key the type does not declare
// reads an entry that reading dropped: `h.other` and `({ accept: h.accept }).other` would read alike. Shared by the
// lint (dot and bracket reads) and the translator (its backstop at the member read): such a read is refused.
export function openRecordType(checker, t) {
  const TF = ts.TypeFlags;
  if (!t || !(t.flags & TF.Object)) return false;
  if (!checker.getPropertiesOfType(t).length) return false;
  return !!(checker.getIndexInfoOfType(t, ts.IndexKind.String) || checker.getIndexInfoOfType(t, ts.IndexKind.Number));
}
// `k in r` on a type that may be open: refused unless the key is a string literal every open member declares (the
// datatype answers a declared key; an entry of the index is not in it, so `"x" in h` and `"x" in { accept: h.accept }`
// would answer alike); the text of the refusal, or null
export function openRecordIn(checker, keyNode, objType) {
  const TF = ts.TypeFlags;
  const parts = objType && objType.flags & TF.Union ? objType.types : objType ? [objType] : [];
  const open = parts.filter((p) => openRecordType(checker, p));
  if (!open.length) return null;
  let k = keyNode; while (ts.isParenthesizedExpression(k)) k = k.expression;
  if (ts.isStringLiteralLike(k) && open.every((p) => checker.getPropertyOfType(p, k.text))) return null;
  // since open-datatype: an open record with a string index carries its undeclared keys (the datatype's open_index_), so
  // an undeclared literal key and a computed key are read there; a computed key stays refused where a declared field is
  // optional (a missing field and a field holding undefined read alike, and `in` tells them apart), on a union of
  // records, and on a number index alone
  if (parts.length === 1 && open.length === 1 && openRecordReadWhy(checker, open[0], ts.isStringLiteralLike(k) ? k.text : null) === null && (ts.isStringLiteralLike(k) || !checker.getPropertiesOfType(open[0]).some((p) => p.flags & ts.SymbolFlags.Optional))) return null;
  return `${OPEN_RECORD_WHY(checker.typeToString(objType))}; \`in\` answers only a declared key`;
}
// A key an open record's type does not declare, by dot, bracket or `in` (design/open-datatype.md): the datatype of a type
// with fields and a string index signature carries the undeclared keys as a dictionary (its open_index_ slot), so the
// read is the dictionary's read; null when it is read, else { rule, why }: a number index alone has no such slot
// (dynamic-key), a name of Object.prototype is read through the prototype, not the own keys (prototype)
export function openRecordReadWhy(checker, t, keyName) {
  if (!openRecordType(checker, t)) return null;
  if (!checker.getIndexInfoOfType(t, ts.IndexKind.String)) return { rule: 'dynamic-key', why: OPEN_RECORD_WHY(checker.typeToString(t)) };
  if (keyName !== null && (OBJECT_PROTO_NAMES.includes(keyName) || keyName === '__proto__')) return { rule: 'prototype', why: `${keyName} names a member of Object.prototype, which a record reads through its prototype; read a declared field or an entry under another name` };
  return null;
}
export const OPEN_RECORD_WHY = (typeText) => `${typeText} declares fields and an index signature; its value reading holds the declared fields alone, so a key it does not declare is outside the reading; read a declared field, or keep the open keys in a Record<string, T> of their own`;
// a non-null assertion on a value whose type admits null or undefined: `x!` checks nothing at run time, so the absent
// value flows on (`u.name!` is undefined) or the read through it throws a TypeError (`u.name!.length`); the proof lane
// carries neither exactly (an absent value read as one of the type, a throw no caller nor effect order sees), so the
// lint refuses it as non-null-assertion and the translator reads it with the same test
export function nonNullOnAbsent(checker, n) {
  if (!ts.isNonNullExpression(n)) return false;
  let t = null; try { t = checker.getTypeAtLocation(n.expression); } catch { return false; }
  return !!t && !!(t.flags & ts.TypeFlags.Union) && t.types.some((x) => !!(x.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)));
}

// a definite-assignment assertion (`let v!: number`) turns off TypeScript's check that the variable is assigned before
// it is read, and a read before the first assignment gives undefined; the translator gives such a variable an
// uninterpreted start value of its type, which would prove `return v` equal to `return v + 0` (undefined against NaN).
// It is read safely only when nothing in its block mentions it before the declaration and the first statement after
// it that mentions it is a plain assignment `v = e;` whose value does not read it; otherwise it may be read first, and
// the lint (definite-assignment) and the translator refuse it with this test
export function definiteAssignmentRead(checker, d) {
  if (!ts.isVariableDeclaration(d) || !d.exclamationToken || !ts.isIdentifier(d.name)) return false;
  const sym = checker.getSymbolAtLocation(d.name);
  const list = d.parent, st = list?.parent, block = st?.parent;
  if (!sym || !st || !ts.isVariableStatement(st) || !block?.statements) return true;
  const mentions = (n) => { let hit = false; const w = (x) => { if (hit) return; if (ts.isIdentifier(x) && x !== d.name && checker.getSymbolAtLocation(x) === sym) { hit = true; return; } ts.forEachChild(x, w); }; w(n); return hit; };
  if (list.declarations.slice(list.declarations.indexOf(d) + 1).some(mentions)) return true;
  const at = block.statements.indexOf(st);
  if (block.statements.slice(0, at).some(mentions)) return true; // a function declared before it may read it when called
  for (const s of block.statements.slice(at + 1)) {
    if (!mentions(s)) continue;
    const e = ts.isExpressionStatement(s) ? s.expression : null;
    return !(e && ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(e.left) && checker.getSymbolAtLocation(e.left) === sym && !mentions(e.right));
  }
  return false;
}

// The key order of a for-in, shared by the lint and the translator (design/forin-order.md). ECMA-262 14.7.5.9 visits
// the own enumerable keys in OrdinaryOwnPropertyKeys order (10.1.11): array indexes ascending, then the other keys in
// creation order. A record datatype forgets creation order, so a record's keys are read only where the unit fixes them:
// the iterated value is a plain literal, or a `const` local without a type that a plain literal initialises and whose
// every other use keeps its own keys (a field read, a write of a field it has, a nested read or write, a key
// enumeration). Returns { free: true } when the order is a function of the value alone (a string, a number, an array, a
// Set, a Map, a dictionary: its carrier holds its order), { keys, literal } with the keys in property order, or null
// when the order is not known (a parameter, a spread, a class instance, an any value): the for-in is refused.
export function forInKeyOrder(checker, e, unitNode) {
  const TF = ts.TypeFlags, K = ts.SyntaxKind;
  while (ts.isParenthesizedExpression(e)) e = e.expression;
  const t = checker.getTypeAtLocation(e);
  const parts = (t.flags & TF.Union ? t.types : [t]).filter((p) => !(p.flags & (TF.Null | TF.Undefined | TF.Void)));
  const freePart = (p) => {
    if (p.flags & (TF.Any | TF.Unknown)) return false;
    if (p.flags & (TF.StringLike | TF.NumberLike | TF.BooleanLike | TF.BigIntLike)) return true;
    if (isArrayLike(checker, p)) return true;
    const name = (p.aliasSymbol ?? p.getSymbol?.())?.getName?.();
    if (p.flags & TF.Object && ['Set', 'Map', 'ReadonlySet', 'ReadonlyMap'].includes(name)) return true;
    return !!(p.flags & TF.Object) && !!checker.getIndexInfoOfType(p, ts.IndexKind.String) && !checker.getPropertiesOfType(p).length; // a dictionary
  };
  if (parts.length && parts.every(freePart)) return { free: true };
  let literal = e, sym = null;
  if (ts.isIdentifier(e)) {
    sym = checker.getSymbolAtLocation(e); const d = sym?.valueDeclaration;
    if (!d || !unitNode || !(d.pos >= unitNode.pos && d.end <= unitNode.end) || !ts.isVariableDeclaration(d) || d.type || !d.initializer || !(ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const)) return null;
    literal = d.initializer; while (ts.isParenthesizedExpression(literal)) literal = literal.expression;
  }
  if (!ts.isObjectLiteralExpression(literal)) return null;
  const created = [];
  for (const p of literal.properties) {
    if (!(ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p))) return null; // a spread, a method, an accessor
    let key;
    if (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) || ts.isNoSubstitutionTemplateLiteral(p.name)) key = p.name.text;
    else if (ts.isNumericLiteral(p.name) && !Number.isNaN(Number(p.name.text))) key = String(Number(p.name.text)); // ToPropertyKey of a number is its ToString
    else return null; // a computed or private name
    if (key === '__proto__' && ts.isPropertyAssignment(p)) return null; // sets the prototype, no own key
    if (!created.includes(key)) created.push(key); // a repeated key keeps its first place (10.1.9)
  }
  if (sym) {
    const d = sym.valueDeclaration; let safe = true;
    const assigns = (op) => op >= K.FirstAssignment && op <= K.LastAssignment;
    const own = (x) => { // x names the local: the use keeps the object's own keys
      const c = x.parent;
      if (ts.isForInStatement(c) && c.expression === x) return true;
      if (ts.isTypeQueryNode(c)) return true;
      if (ts.isCallExpression(c) && c.arguments.length === 1 && c.arguments[0] === x && ts.isPropertyAccessExpression(c.expression) && ts.isIdentifier(c.expression.expression) && c.expression.expression.text === 'Object' && ['keys', 'values', 'entries'].includes(c.expression.name.text) && originOf(checker, c.expression.expression, x.getSourceFile(), unitNode).kind === 'global') return true; // Object.keys, values, entries read the keys
      if (!((ts.isPropertyAccessExpression(c) || ts.isElementAccessExpression(c)) && c.expression === x)) return false; // passed, returned, spread, aliased: another place may change its keys
      const top = c.parent;
      if (ts.isDeleteExpression(top) || (ts.isCallExpression(top) && top.expression === c)) return false; // a delete removes a key; a method call runs with `this` the object
      let pattern = top; while (pattern && (ts.isArrayLiteralExpression(pattern) || ts.isObjectLiteralExpression(pattern) || ts.isPropertyAssignment(pattern) || ts.isShorthandPropertyAssignment(pattern) || ts.isSpreadElement(pattern) || ts.isSpreadAssignment(pattern))) pattern = pattern.parent;
      const destructured = pattern !== top && pattern && ((ts.isBinaryExpression(pattern) && assigns(pattern.operatorToken.kind) && pattern.left.pos <= c.pos && c.end <= pattern.left.end) || ((ts.isForOfStatement(pattern) || ts.isForInStatement(pattern)) && pattern.initializer.pos <= c.pos && c.end <= pattern.initializer.end));
      const written = (ts.isBinaryExpression(top) && top.left === c && assigns(top.operatorToken.kind)) || ((ts.isPrefixUnaryExpression(top) || ts.isPostfixUnaryExpression(top)) && [K.PlusPlusToken, K.MinusMinusToken].includes(top.operator)) || ((ts.isForInStatement(top) || ts.isForOfStatement(top)) && top.initializer === c) || destructured;
      if (!written) return true;
      return ts.isPropertyAccessExpression(c) && created.includes(c.name.text); // a write of a key the literal made keeps its place; a new or computed key may create one
    };
    const walk = (x) => { if (!safe) return; if (ts.isIdentifier(x) && x !== d.name && checker.getSymbolAtLocation(x) === sym && !own(x)) safe = false; ts.forEachChild(x, walk); };
    walk(unitNode);
    if (!safe) return null;
  }
  const isIndex = (k) => /^(0|[1-9][0-9]*)$/.test(k) && Number(k) < 4294967295;
  const keys = [...created.filter(isIndex).sort((a, b) => Number(a) - Number(b)), ...created.filter((k) => !isIndex(k))];
  return { keys, literal };
}
// A copy of every own key: `{ ...x }` (CopyDataProperties, ECMA-262 13.2.5.5 and 7.3.25) and `Object.assign({}, x)`
// (20.1.2.1) copy every own enumerable key x holds, and a value of a record type may hold keys its type does not name (a
// value of a wider type passes for it). The readings hold a record's declared fields alone, so such a copy is read only
// when the unit built x's keys itself: x is an object literal of named members (its keys are its text), or a const of
// the same function whose initializer is one and which the function uses only to read or write a declared field
// (`o.f`, `o.f = v`) or to spread again. The spread of a record comes first in its literal (a later one writes over the
// members before it, an own key holding undefined included), and a built copy holds no key the literal's record type
// does not declare. A dictionary (no declared field, a string index) carries every key it holds and is no record here.
// One test for the lint (spread-source), the value reading (objectLit) and the heap core: the reason, or null.
export function copySourceWhy(checker, src, site = null) {
  const TF = ts.TypeFlags;
  const bare = (x) => { while (ts.isParenthesizedExpression(x)) x = x.expression; return x; };
  const record = (y) => !!(y.flags & (TF.Object | TF.Intersection)) && !checker.isArrayType(y) && !checker.isTupleType(y) && !y.getCallSignatures().length && checker.getPropertiesOfType(y).length > 0;
  let t = null; try { t = checker.getTypeAtLocation(bare(src)); } catch { return 'the copied value has no type'; }
  if (!t || !(t.flags & TF.Union ? t.types : [t]).some(record)) return null; // a dictionary, an array, a primitive: not a record copy
  if (site && ts.isSpreadAssignment(site) && ts.isObjectLiteralExpression(site.parent) && site.parent.properties.slice(0, site.parent.properties.indexOf(site)).some((q) => !(ts.isSpreadAssignment(q) || ts.isShorthandPropertyAssignment(q) || (ts.isPropertyAssignment(q) && (ts.isIdentifier(q.name) || ts.isStringLiteral(q.name) || ts.isComputedPropertyName(q.name)))))) return 'a spread after a method or accessor member: the merge of the members before it takes values, and a method is a function the reading does not hold as a value; write the spread before that member';
  const keys = new Set();
  const built = (x, depth) => {
    x = bare(x); if (depth > 8) return false;
    if (ts.isObjectLiteralExpression(x)) return x.properties.every((p, i) => {
      if (ts.isShorthandPropertyAssignment(p)) { keys.add(p.name.text); return true; }
      if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text !== '__proto__') { keys.add(p.name.text); return true; }
      return ts.isSpreadAssignment(p) && i === 0 && built(p.expression, depth + 1);
    });
    if (!ts.isIdentifier(x)) return false;
    const sym = checker.getSymbolAtLocation(x); const d = sym?.valueDeclaration;
    if (!d || !ts.isVariableDeclaration(d) || !ts.isIdentifier(d.name) || !d.initializer || !(ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const)) return false;
    let fn = d.parent; while (fn && !ts.isFunctionLike(fn)) fn = fn.parent; if (!fn) return false; // a module constant: other code may add keys to it
    let q = x; while (q && q !== fn) q = q.parent; if (!q) return false; // read in another function than the one that built it
    if (!built(d.initializer, depth + 1)) return false;
    let only = true;
    const w = (n) => {
      if (!only) return;
      if (ts.isShorthandPropertyAssignment(n) && checker.getShorthandAssignmentValueSymbol(n) === sym) { only = false; return; } // `{ o }` hands the object on
      if (ts.isIdentifier(n) && n !== d.name && checker.getSymbolAtLocation(n) === sym) {
        const p = n.parent;
        const field = ts.isPropertyAccessExpression(p) && p.expression === n && !(ts.isCallExpression(p.parent) && p.parent.expression === p) && !ts.isDeleteExpression(p.parent);
        if (!field && !(ts.isSpreadAssignment(p) && p.expression === n)) only = false;
      }
      ts.forEachChild(n, w);
    };
    w(fn);
    return only;
  };
  if (!built(src, 0)) return COPY_NOT_BUILT;
  const lit = site && ts.isSpreadAssignment(site) ? site.parent : null;
  const ctx = lit ? checker.getContextualType(lit) : null;
  const target = ctx && (ctx.flags & TF.Union ? ctx.types.filter((y) => !(y.flags & (TF.Undefined | TF.Null))) : [ctx]);
  if (target && target.length === 1 && record(target[0]) && !checker.getIndexInfoOfType(target[0], ts.IndexKind.String)) {
    const extra = [...keys].find((k) => !checker.getPropertyOfType(target[0], k));
    if (extra) return `the copy holds the key \`${extra}\`, which ${checker.typeToString(target[0])} does not declare`;
  }
  return null;
}
const COPY_NOT_BUILT = 'a value of a record type may carry keys its type does not name, and the copy takes them all; spread a literal, or a const this function builds from a literal, or copy the fields by name (`{ a: x.a, b: x.b }`)';
// The invariant a record copy keeps: a copy carries everything its source carries, known or not. A source the unit built
// is read by its keys ('built'); any other record source is an uninterpreted copy of it, `Spread_T(x)`, updated by the
// members written after it ('copy'): two sides copying the same value prove, and a copy of the declared fields by hand
// never does, since nothing says what the copy holds beyond its source (a field of the copy equal to the source's would
// make the copy equal to the hand copy: a record value holds its declared fields alone). The term needs the spread first
// in its literal after named members and spreads only ('refuse', with the reason); a built copy holding a key the target
// type does not declare is a copy too.
// A source that is no record (a dictionary, an array, a primitive) is 'plain'. One test for the lint, objectLit, the core.
// `this.m()` inside an instance method of class C runs the m the receiver's chain finds first (ECMA-262 10.1.8.1 [[Get]],
// then Call), and the receiver of C's method may be an instance of any subclass, one another file declares included. The
// call is C's own m only when no subclass can hold another m: m is an ECMAScript private name (#m is no property and
// is never looked up on the chain), m is TypeScript-private (a subclass redeclaring it fails to compile, TS2415), or the
// file declares C or m final with the TSDoc tag @sealed (or @final): a fact TypeScript does not check, so it is an
// assumption the certificate names ('sealed receiver'). A same-file class below C redeclaring m defeats every one of
// these. Returns { why } when the call is C's own m, null when a subclass may override it.
export function sealedMember(checker, sf, cls, name) {
  const own = cls.members.find((m) => m.name && !ts.isComputedPropertyName(m.name) && m.name.text === name && !m.modifiers?.some((x) => x.kind === ts.SyntaxKind.StaticKeyword));
  const below = (c) => { for (let cur = c, seen = new Set(); cur && !seen.has(cur); ) { seen.add(cur); const ext = cur.heritageClauses?.find((h) => h.token === ts.SyntaxKind.ExtendsKeyword)?.types[0]?.expression; if (!ext) return false; const d = checker.getSymbolAtLocation(ext)?.valueDeclaration; if (d === cls) return true; cur = d && ts.isClassDeclaration(d) ? d : null; } return false; };
  let redeclared = false;
  const w = (n) => { if (redeclared) return; if (ts.isClassLike(n) && n !== cls && below(n) && n.members.some((m) => m.name && !ts.isComputedPropertyName(m.name) && m.name.text === name && !m.modifiers?.some((x) => x.kind === ts.SyntaxKind.StaticKeyword))) redeclared = true; ts.forEachChild(n, w); };
  w(sf);
  if (redeclared) return null;
  if (own && ts.isPrivateIdentifier(own.name)) return { why: `#${name} is a private name` };
  if (own && own.modifiers?.some((x) => x.kind === ts.SyntaxKind.PrivateKeyword)) return { why: `${name} is private (TS2415 forbids a subclass redeclaring it)` };
  const tagged = (n) => !!n && ts.getJSDocTags(n).some((t) => t.tagName.text === 'sealed' || t.tagName.text === 'final');
  if (tagged(cls)) return { why: `${cls.name?.text} is declared @sealed`, assumed: true };
  if (tagged(own)) return { why: `${name} is declared @sealed`, assumed: true };
  return null;
}
export function copySource(checker, src, site = null) {
  const TF = ts.TypeFlags; let x = src; while (ts.isParenthesizedExpression(x)) x = x.expression;
  let t = null; try { t = checker.getTypeAtLocation(x); } catch { return { kind: 'refuse', why: 'the copied value has no type' }; }
  const record = !!t && (t.flags & TF.Union ? t.types : [t]).some((y) => !!(y.flags & (TF.Object | TF.Intersection)) && !checker.isArrayType(y) && !checker.isTupleType(y) && !y.getCallSignatures().length && checker.getPropertiesOfType(y).length > 0);
  if (!record) return { kind: 'plain' };
  if (site && ts.isSpreadAssignment(site) && ts.isObjectLiteralExpression(site.parent)) { // a dictionary literal (Record<string, T>): its reading holds every key a spread copies (a map merge)
    let ctx = null; try { ctx = checker.getContextualType(site.parent); } catch { ctx = null; }
    const parts = ctx ? (ctx.flags & TF.Union ? ctx.types.filter((y) => !(y.flags & (TF.Undefined | TF.Null))) : [ctx]) : [];
    if (parts.length === 1 && (parts[0].flags & TF.Object) && checker.getIndexInfoOfType(parts[0], ts.IndexKind.String) && !checker.getPropertiesOfType(parts[0]).length) return { kind: 'plain' };
  }
  const why = copySourceWhy(checker, src, site);
  return why === null ? { kind: 'built' } : why === COPY_NOT_BUILT || why.startsWith('the copy holds the key') ? { kind: 'copy' } : { kind: 'refuse', why }; // a built copy holding a key the target does not declare carries it, as any copy carries what its source carries
}
// A type assertion checks nothing at run time (ECMA-262 has none; the emit drops `e as T`, `<T>e`, and the assertion
// TypeScript makes when a value typed any or unknown fills a slot of another type, `const n: number = x`). The value
// keeps its run-time type. So a value whose static type is not the type of its value, HELD below, is read with its
// real type: the source's type for `e as T` from a source not assignable to T, the opaque Any for a source typed any or
// unknown (or holding one, `any[]`); an operation on a held value is then an operation on that real value (on Any, an
// uninterpreted application, so `v` and `v + 0` are different terms). A held value may go where its reading carries it
// (an operand, a receiver, a test, a held local, the unit's own result, an argument to an outside call); in a slot
// whose reading needs the asserted type (a same-file callee's parameter, a field, an element) the unit is refused,
// rule type-assertion. Shared by the lint (every expression) and the translator (typeOf reads `assertionHeld`,
// convertToD asks `typeAssertion` before it converts). The checker's error type (an unresolved import) is the
// environment's and never held.
const opaqueT = (t) => !!t && !!(t.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) && t.intrinsicName !== 'error';
function holdsOpaque(checker, t, depth = 0, seen = new Set()) {
  const TF = ts.TypeFlags;
  if (!t || depth > 3 || seen.has(t)) return false;
  seen.add(t);
  if (t.flags & (TF.Any | TF.Unknown)) return t.intrinsicName !== 'error';
  if (t.flags & (TF.Union | TF.Intersection)) return t.types.some((x) => holdsOpaque(checker, x, depth, seen));
  if (!(t.flags & TF.Object)) return false;
  const args = t.objectFlags & ts.ObjectFlags.Reference ? checker.getTypeArguments(t) : [];
  if (args.some((x) => holdsOpaque(checker, x, depth + 1, seen))) return true;
  for (const kind of [ts.IndexKind.String, ts.IndexKind.Number]) { const info = checker.getIndexInfoOfType(t, kind); if (info && holdsOpaque(checker, info.type, depth + 1, seen)) return true; }
  const props = checker.getPropertiesOfType(t);
  if (props.length > 40) return false;
  for (const p of props) {
    const d = p.valueDeclaration ?? p.declarations?.[0];
    if (d && (ts.isMethodDeclaration(d) || ts.isMethodSignature(d))) continue;
    let pt = null; try { pt = checker.getTypeOfSymbol(p); } catch { continue; }
    if (holdsOpaque(checker, pt, depth + 1, seen)) return true;
  }
  return false;
}
const tAt = (checker, n) => { try { return checker.getTypeAtLocation(n); } catch { return null; } };
const isConstAssertion = (n) => !!n.type && ts.isTypeReferenceNode(n.type) && n.type.typeName.getText() === 'const';
// the writes of a local variable of a function: its initializer and every `name = value`
const localWrites = new WeakMap();
function writesOf(checker, sym) {
  const d = sym?.valueDeclaration;
  if (!d || !ts.isVariableDeclaration(d) || !ts.isIdentifier(d.name)) return null;
  let fn = d.parent; while (fn && !ts.isFunctionLike(fn) && !ts.isSourceFile(fn)) fn = fn.parent;
  if (!fn || ts.isSourceFile(fn)) return null; // a module variable is a cell of the world, never held
  let m = localWrites.get(fn);
  if (!m) {
    m = new Map();
    const walk = (x) => {
      if (ts.isBinaryExpression(x) && x.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && x.operatorToken.kind <= ts.SyntaxKind.LastAssignment && ts.isIdentifier(x.left)) { const s = checker.getSymbolAtLocation(x.left); if (s) { if (!m.has(s)) m.set(s, []); m.get(s).push(x.operatorToken.kind === ts.SyntaxKind.EqualsToken ? x.right : x); } } // `t = v` writes v; a compound `t += v` writes the operation itself
      ts.forEachChild(x, walk);
    };
    walk(fn); localWrites.set(fn, m);
  }
  return [...(d.initializer ? [d.initializer] : []), ...(m.get(sym) ?? [])];
}
// a real type an operation reads exactly as written: one primitive family (numbers, strings or booleans, literals
// included), so `k + 1` on a number asserted to `1 | 2` is the number's own sum; any other real type (Any, a union of
// families, an object) makes the operation one on the opaque value
const primitiveFamily = (t) => { const TF = ts.TypeFlags; const ps = t.flags & TF.Union ? t.types : [t]; return [TF.NumberLike, TF.StringLike, TF.BooleanLike].some((f) => ps.every((x) => x.flags & f)); };
// The diagnostics of a file, read in one place and remembered for the file: the strict values below are read from them.
// Every program lean builds over a file reads its diagnostics through here (loadProgram, loadMany, the apply/call
// normalisation, the faithful rewrite, pr.mjs), so the lint and the translator see the same strict values.
const diagnosticsOfFile = new WeakMap();
const strictValuesOfFile = new WeakMap();
export function fileDiagnostics(program, sf) {
  const d = [...program.getSyntacticDiagnostics(sf), ...program.getSemanticDiagnostics(sf)];
  diagnosticsOfFile.set(sf, d); strictValuesOfFile.delete(sf);
  return d;
}
// A strict-mode error about a value names a value whose type nothing checked: the code used it as a type the compiler
// could not confirm. TypeScript emits the code unchanged, so the value at run time is whatever arrives, exactly as for
// `e as T` (design/strict-fixer.md, 2026-10-30). That value is held at Any (heldOf below), so every operation on it is an
// uninterpreted application and no fact of the unconfirmed type enters a proof. The families:
// - possibly absent (TS2531, 2532, 2533, 18047, 18048, 18049): the value is the expression the error spans, used as
//   present;
// - assignability (TS2322, 2345) whose only cause is absence: the source with null and undefined removed is assignable
//   to the slot, so the error is strict null checking's; the value is the source (an initializer, the right side of
//   `=`, a returned expression, an argument);
// - a member some members of a union declare and others do not (TS2339, 2551 on a union receiver): the value is the
//   receiver, whose union the code never narrowed.
// A member no type declares, a name that does not resolve, any other type error stays the unit's (null here).
export const ABSENT_CODES = new Set([2531, 2532, 2533, 18047, 18048, 18049]);
const exactNode = (sf, start, length) => {
  let hit = null;
  const w = (x) => { const s = x.getStart(sf); if (s > start || x.getEnd() < start + length) return; if (s === start && x.getEnd() === start + length && ts.isExpression(x) && !hit) hit = x; ts.forEachChild(x, w); };
  w(sf);
  return hit;
};
export function strictValue(checker, sf, d) {
  if (!d || d.file !== sf || d.start === undefined) return null;
  const TF = ts.TypeFlags;
  if (ABSENT_CODES.has(d.code)) return exactNode(sf, d.start, d.length ?? 0);
  if (d.code === 2322 || d.code === 2345) {
    let at = exactNode(sf, d.start, d.length ?? 0), v = null;
    if (!at) { // a `return` keyword: the returned expression
      const w = (x) => { if (!v && ts.isReturnStatement(x) && x.getStart(sf) === d.start && x.expression) v = x.expression; else if (!v && x.pos <= d.start && x.end >= d.start) ts.forEachChild(x, w); };
      w(sf);
    } else if (ts.isIdentifier(at) && at.parent && (ts.isVariableDeclaration(at.parent) || ts.isPropertyDeclaration(at.parent) || ts.isParameter(at.parent)) && at.parent.name === at) v = at.parent.initializer ?? null;
    else if (ts.isIdentifier(at) && at.parent && ts.isPropertyAssignment(at.parent) && at.parent.name === at) v = at.parent.initializer;
    else if (at.parent && ts.isBinaryExpression(at.parent) && at.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken && at.parent.left === at) v = at.parent.right;
    else if (!(at.parent && ts.isShorthandPropertyAssignment(at.parent))) v = at;
    if (!v) return null;
    let source = null, target = null;
    try { source = checker.getTypeAtLocation(v); target = checker.getContextualType(v); } catch { return null; }
    if (!source || !target) return null;
    const present = checker.getNonNullableType(source);
    if (present === source || (present.flags & TF.Never)) return null; // nothing absent to remove: a type error of its own
    return checker.isTypeAssignableTo(present, target) ? v : null;
  }
  if (d.code === 2339 || d.code === 2551) {
    const at = exactNode(sf, d.start, d.length ?? 0);
    const pa = at && at.parent && ts.isPropertyAccessExpression(at.parent) && at.parent.name === at ? at.parent : null;
    if (!pa) return null;
    let rt = null; try { rt = checker.getTypeAtLocation(pa.expression); } catch { return null; }
    if (!rt || !(rt.flags & TF.Union)) return null;
    return rt.types.some((m) => !!checker.getPropertyOfType(m, pa.name.text)) ? pa.expression : null; // some member declares it
  }
  return null;
}
const strictValues = (checker, sf) => {
  let s = strictValuesOfFile.get(sf);
  if (!s) { s = new Set(); for (const d of diagnosticsOfFile.get(sf) ?? []) { const v = strictValue(checker, sf, d); if (v) s.add(v); } strictValuesOfFile.set(sf, s); }
  return s;
};
// the real type of a held value (a TypeScript type; the any type for an opaque one), or null when the value is not held
export function assertionHeld(checker, n, seen = new Map()) {
  if (!n) return null;
  if (seen.has(n)) return seen.get(n); // a node met again: its answer, or null while it is being decided (a cycle)
  seen.set(n, null);
  const r = heldOf(checker, n, seen);
  seen.set(n, r);
  return r;
}
function heldOf(checker, n, seen) {
  const any = () => checker.getAnyType();
  const opaqueOperand = (x) => { const h = assertionHeld(checker, x, seen); return !!h && !primitiveFamily(h); };
  { const sf = n.getSourceFile?.(); if (sf && strictValues(checker, sf).has(n)) return any(); } // the value a strict-mode error is about
  if (ts.isParenthesizedExpression(n) || ts.isNonNullExpression(n) || ts.isSatisfiesExpression(n)) return assertionHeld(checker, n.expression, seen);
  if (ts.isAwaitExpression(n)) return assertionHeld(checker, n.expression, seen) ? any() : null;
  if (ts.isAsExpression(n) || ts.isTypeAssertionExpression(n)) {
    if (isConstAssertion(n)) return assertionHeld(checker, n.expression, seen);
    const from = tAt(checker, n.expression), to = tAt(checker, n);
    if (!from || !to || opaqueT(to)) return null;
    const inner = assertionHeld(checker, n.expression, seen);
    if (inner) return inner;
    if (holdsOpaque(checker, from)) return any();
    if (from !== to && !checker.isTypeAssignableTo(from, to)) return primitiveFamily(from) ? from : any(); // a source of one primitive family is read as itself; any other as the opaque value
    return null;
  }
  if (ts.isIdentifier(n)) {
    if (heldParams && n.parent && ts.isParameter(n.parent) && n.parent.name === n && heldParams.has(n.parent)) return any(); // a parameter of a unit read at Any for a call that hands it a held value
    let sym = null; try { sym = n.parent && ts.isShorthandPropertyAssignment(n.parent) && n.parent.name === n ? checker.getShorthandAssignmentValueSymbol(n.parent) : checker.getSymbolAtLocation(n); } catch { return null; } // a shorthand member's name reads the local it names
    if (heldParams && sym?.valueDeclaration && ts.isParameter(sym.valueDeclaration) && heldParams.has(sym.valueDeclaration)) return any();
    const ws = writesOf(checker, sym);
    if (!ws) return null;
    const declared = tAt(checker, sym.valueDeclaration.name);
    if (!declared || opaqueT(declared)) return null;
    const heldWrites = ws.map((w) => assertionHeld(checker, w, seen));
    const real = ws.map((w, i) => heldWrites[i] ?? (opaqueT(tAt(checker, w)) ? any() : null));
    if (!real.some(Boolean)) return null;
    return real.length === 1 ? real[0] : any();
  }
  if (ts.isObjectLiteralExpression(n)) return heldLiteral(checker, n, seen) ? tAt(checker, n) : null; // a literal holding a held field: its own record type, each held field at its real type (heldField)
  if (ts.isPropertyAccessExpression(n)) {
    const h = assertionHeld(checker, n.expression, seen);
    if (h && heldRecord(checker, h, seen)) { const p = checker.getPropertyOfType(h, n.name.text); return p ? heldField(checker, p, seen) : any(); } // a field of a held literal: held when its value was
    return h && !primitiveFamily(h) ? any() : null;
  }
  if (ts.isElementAccessExpression(n)) return opaqueOperand(n.expression) ? any() : null;
  if (ts.isCallExpression(n)) {
    const v = heldCall(checker, n, seen);
    if (v) return v.result; // a same-file unit read once more for this call: its result's real type when it is held there
    return (ts.isPropertyAccessExpression(n.expression) || ts.isElementAccessExpression(n.expression)) && opaqueOperand(n.expression.expression) ? any() : null;
  }
  if (ts.isBinaryExpression(n)) {
    const k = n.operatorToken.kind;
    if (k === ts.SyntaxKind.EqualsToken) return null;
    if (k > ts.SyntaxKind.FirstAssignment && k <= ts.SyntaxKind.LastAssignment) return ts.isIdentifier(n.left) && (opaqueOperand(n.left) || opaqueOperand(n.right)) ? any() : null; // a compound write to a local: the operation on the real values, which the local then holds (writesOf)
    if ([ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.InstanceOfKeyword, ts.SyntaxKind.InKeyword].includes(k)) return null; // a boolean whatever its operands are
    return opaqueOperand(n.left) || opaqueOperand(n.right) ? any() : null;
  }
  if (ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) return opaqueOperand(n.operand) ? any() : null;
  if (ts.isConditionalExpression(n)) return opaqueOperand(n.whenTrue) || opaqueOperand(n.whenFalse) ? any() : null;
  return null;
}
// an any or unknown value in a slot whose contextual type is another (`const n: number = x`, a field of a typed literal)
function opaqueInTypedSlot(checker, n) {
  if (!opaqueT(tAt(checker, n))) return false;
  let ct = null; try { ct = checker.getContextualType(n); } catch { return false; }
  if (!ct) return false;
  return !(ct.flags & ts.TypeFlags.Union ? ct.types : [ct]).some((x) => x.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.TypeParameter | ts.TypeFlags.Void));
}
// the value a literal member writes: a property's initializer, a shorthand's name; null for any other member
const memberValue = (p) => ts.isPropertyAssignment(p) ? p.initializer : ts.isShorthandPropertyAssignment(p) ? p.name : null;
// A literal is HELD when a field holds a held value, or an any or unknown value where its type names another: the
// literal is read with its own record type (each field the type of its value: any for an opaque value, the real type
// for a held one, heldField), so the held field is Any in the literal's datatype and nothing converts it to the
// declared type. Its members are plain data (named properties, shorthands, spreads of values that are not held); a
// method, an accessor, a computed key or a held spread source keeps the literal refused.
function heldLiteral(checker, n, seen = new Map()) {
  if (!ts.isObjectLiteralExpression(n)) return false;
  let hit = false;
  for (const p of n.properties) {
    if (ts.isSpreadAssignment(p)) { if (assertionHeld(checker, p.expression, seen)) return false; continue; }
    const v = memberValue(p);
    if (!v || (ts.isPropertyAssignment(p) && !(ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)))) return false;
    if (!hit && (assertionHeld(checker, v, seen) || opaqueInTypedSlot(checker, v))) hit = true;
  }
  return hit;
}
// the type of a held literal (heldOf of an object literal: its own type, declared by the literal)
export function heldRecord(checker, t, seen = new Map()) {
  const d = t?.symbol?.declarations?.[0];
  return !!d && ts.isObjectLiteralExpression(d) && heldLiteral(checker, d, seen);
}
// the real type of a field of a held literal's type: the real type of the value its member writes, null when it is not
// held (the field's own type is the value's type: any for an opaque value)
export function heldField(checker, prop, seen = new Map()) {
  const d = prop?.valueDeclaration ?? prop?.declarations?.[0];
  const v = d && d.parent && ts.isObjectLiteralExpression(d.parent) ? memberValue(d) : null;
  return v ? assertionHeld(checker, v, seen) : null;
}
// a unit of the file: a top-level function, an arrow or function const at top level, a method of a top-level class
function unitFunction(fn) {
  if (!fn) return false;
  if (ts.isFunctionDeclaration(fn)) return ts.isSourceFile(fn.parent);
  if (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) { const d = fn.parent; return !!d && ts.isVariableDeclaration(d) && d.initializer === fn && ts.isVariableDeclarationList(d.parent) && ts.isVariableStatement(d.parent.parent) && ts.isSourceFile(d.parent.parent.parent); }
  if (ts.isMethodDeclaration(fn) || ts.isConstructorDeclaration(fn) || ts.isGetAccessorDeclaration(fn) || ts.isSetAccessorDeclaration(fn)) return !!fn.parent && ts.isClassDeclaration(fn.parent) && ts.isSourceFile(fn.parent.parent);
  return false;
}
const enclosingFn = (n) => { let p = n.parent; while (p && !ts.isFunctionLike(p) && !ts.isSourceFile(p)) p = p.parent; return p && ts.isFunctionLike(p) ? p : null; };
const importRooted = (checker, e) => {
  let r = e; while (ts.isPropertyAccessExpression(r) || ts.isElementAccessExpression(r) || ts.isCallExpression(r) || ts.isParenthesizedExpression(r) || ts.isNonNullExpression(r)) r = r.expression;
  if (!ts.isIdentifier(r)) return false;
  let s = null; try { s = checker.getSymbolAtLocation(r); } catch { return false; }
  const d = s?.declarations?.[0];
  return !!d && (ts.isImportSpecifier(d) || ts.isImportClause(d) || ts.isNamespaceImport(d) || ts.isImportEqualsDeclaration(d));
};
// a call whose callee is declared at the top level of another module: a method of a local an imported factory made
// (`client.x.y(v)`), whose interface that module exports. The translator reads such a call as the outside's
// (externalCall: no reading of its body, its arguments handed over as their own values), so a held argument reaches
// it as the same uninterpreted conversion on both sides, as one reaches an imported function (importRooted). A callee
// declared in a global script (the default library, lean's own number operations, an ambient declaration file) or
// inside a namespace, a `declare global` or a `declare module` block is a library's, which a reading may give exact
// operations at the declared types; it stays refused, as a callee the checker cannot resolve or one of this file.
const outsideCallee = (checker, call) => {
  let decl = null; try { decl = checker.getResolvedSignature(call)?.declaration ?? null; } catch { return false; }
  const sf = decl?.getSourceFile?.();
  if (!sf || sf === call.getSourceFile() || !ts.isExternalModule(sf)) return false;
  for (let q = decl.parent; q && q !== sf; q = q.parent) if (ts.isModuleDeclaration(q)) return false;
  return true;
};
// where a held value's reading carries it: no conversion to the asserted type happens there
function carried(checker, n) {
  const p = n.parent;
  if (!p) return true;
  if (ts.isVariableDeclaration(p) && p.initializer === n) return ts.isIdentifier(p.name) && !!writesOf(checker, checker.getSymbolAtLocation(p.name));
  if (ts.isBinaryExpression(p)) {
    const k = p.operatorToken.kind;
    if (k === ts.SyntaxKind.EqualsToken && p.right === n) { const s = ts.isIdentifier(p.left) ? checker.getSymbolAtLocation(p.left) : null; return !!writesOf(checker, s); } // a write to a local: the local is held in turn
    if (k > ts.SyntaxKind.FirstAssignment && k <= ts.SyntaxKind.LastAssignment && p.right === n) { const s = ts.isIdentifier(p.left) ? checker.getSymbolAtLocation(p.left) : null; return !!writesOf(checker, s); } // a compound write to a local: the local holds the operation's result, so its real type is read (a field or an element keeps its declared type)
    if (k >= ts.SyntaxKind.FirstAssignment && k <= ts.SyntaxKind.LastAssignment) return false; // the target of a write
    return true; // an operand: an operation on the real value
  }
  if (ts.isPrefixUnaryExpression(p) || ts.isPostfixUnaryExpression(p) || ts.isTypeOfExpression(p) || ts.isExpressionStatement(p) || ts.isTemplateSpan(p)) return true;
  if (ts.isParenthesizedExpression(p) || ts.isNonNullExpression(p) || ts.isSatisfiesExpression(p) || ts.isAwaitExpression(p) || ts.isAsExpression(p) || ts.isTypeAssertionExpression(p)) return true; // the wrapper is held in turn
  if ((ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) && p.expression === n) return true;
  if ((ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && memberValue(p) === n) return heldLiteral(checker, p.parent); // a field of a literal: the field is its value's type in the literal's datatype, and the literal is held in turn
  if (ts.isConditionalExpression(p)) return true; // the condition is a truth test; a branch makes the whole held
  if ((ts.isIfStatement(p) || ts.isWhileStatement(p) || ts.isDoStatement(p) || ts.isSwitchStatement(p) || ts.isCaseClause(p)) && p.expression === n) return true; // a test, or a switch over the real value
  if (ts.isCallExpression(p)) {
    if (p.expression === n) return false; // calling a held value
    if (p.expression.getText() === 'Array.isArray') return true; // a test of the run-time value
    if (heldCall(checker, p)) return true; // a same-file unit read once more with this parameter at Any
    return importRooted(checker, p.expression) || outsideCallee(checker, p); // the outside receives the value as it is
  }
  if (ts.isReturnStatement(p) || (ts.isArrowFunction(p) && p.body === n)) return unitFunction(ts.isReturnStatement(p) ? enclosingFn(p) : p); // the unit's own result
  return false;
}
// a same-file unit whose result is a held value: a caller would read it with the asserted type
function returnsHeld(checker, fn) {
  if (!fn || !fn.body) return false;
  if (!ts.isBlock(fn.body)) return !!assertionHeld(checker, fn.body);
  let hit = false;
  const walk = (x) => { if (hit || (x !== fn.body && ts.isFunctionLike(x))) return; if (ts.isReturnStatement(x) && x.expression && (assertionHeld(checker, x.expression) || (opaqueT(tAt(checker, x.expression)) && (() => { const ct = checker.getContextualType(x.expression); return !!ct && !opaqueT(ct); })()))) hit = true; ts.forEachChild(x, walk); };
  walk(fn.body);
  return hit;
}
// the real type of a unit's result when it is held: the one held literal record type every return gives (its fields
// read as heldField says), else Any; null when no return is held
function heldResultType(checker, fn) {
  const rets = [];
  if (!ts.isBlock(fn.body)) rets.push(fn.body);
  else { const walk = (x) => { if (x !== fn.body && ts.isFunctionLike(x)) return; if (ts.isReturnStatement(x) && x.expression) rets.push(x.expression); ts.forEachChild(x, walk); }; walk(fn.body); }
  const held = rets.map((r) => assertionHeld(checker, r) ?? (opaqueT(tAt(checker, r)) && (() => { const ct = checker.getContextualType(r); return !!ct && !opaqueT(ct); })() ? checker.getAnyType() : null));
  if (!held.some(Boolean)) return null;
  return held.every((h) => h && h === held[0]) && heldRecord(checker, held[0]) ? held[0] : checker.getAnyType();
}
// A same-file unit called with a held value for a parameter, or whose result is held, is read once more for that call
// (design/type-assertions.md, 2026-10-30): each such parameter at Any, the body read with it held, and the result Any
// when the body's result is held under that reading, else the declared type. The callee is a plain unit (a top-level
// function or function const, no type parameter, plain named parameters) that calls no same-file unit, so its reading
// at Any is one more leaf; any other callee keeps the call refused.
let heldParams = null; // the parameters (declarations) read at Any while a unit is read once more for a call
export function withHeldParams(params, f) { const saved = heldParams; heldParams = params; try { return f(); } finally { heldParams = saved; } }
const variantMemo = new WeakMap();
export function heldVariantUnit(checker, decl) {
  if (!decl || !ts.isFunctionLike(decl) || !decl.body || !unitFunction(decl) || ts.isMethodDeclaration(decl) || ts.isConstructorDeclaration(decl) || ts.isGetAccessorDeclaration(decl) || ts.isSetAccessorDeclaration(decl)) return false;
  if (variantMemo.has(decl)) return variantMemo.get(decl);
  let ok = !decl.typeParameters?.length && !decl.asteriskToken && !(ts.getCombinedModifierFlags(decl) & ts.ModifierFlags.Async) && decl.parameters.every((p) => ts.isIdentifier(p.name) && !p.initializer && !p.questionToken && !p.dotDotDotToken && p.name.text !== 'this');
  const sf = decl.getSourceFile();
  const walk = (x) => {
    if (!ok) return;
    if (ts.isCallExpression(x) || ts.isNewExpression(x)) { let d = null; try { d = checker.getResolvedSignature(x)?.declaration ?? null; } catch { /* unresolved */ } if (d && d.getSourceFile() === sf && !isWithin(d, decl)) ok = false; } // another same-file unit: not a leaf
    if (ts.isIdentifier(x) && x !== decl.name) { let s = null; try { s = checker.getSymbolAtLocation(x); } catch { /* none */ } const d = s?.valueDeclaration; if (d && d.getSourceFile() === sf && (d === decl || (ts.isVariableDeclaration(d) && d.initializer === decl)) ) ok = false; } // a reference to itself
    ts.forEachChild(x, walk);
  };
  if (ok) walk(decl.body);
  variantMemo.set(decl, ok);
  return ok;
}
const isWithin = (d, root) => { for (let q = d; q; q = q.parent) if (q === root) return true; return false; };
// the reading of a call of a same-file unit once more: { decl, held: parameter indices at Any, result: whether the
// result is held there }, or null when the call needs none (no held argument, a result not held) or the callee is not
// one such a reading reaches
export function heldCall(checker, call, seen = new Map()) { // seen: the caller's, so a write cycle through the call (`x = f(x)`) is met again, not re-entered
  if (!ts.isCallExpression(call)) return null;
  let decl = null; try { decl = checker.getResolvedSignature(call)?.declaration ?? null; } catch { return null; }
  if (!decl || decl.getSourceFile() !== call.getSourceFile() || !heldVariantUnit(checker, decl)) return null;
  if (call.arguments.length > decl.parameters.length || call.arguments.some((a) => ts.isSpreadElement(a))) return null;
  const held = [];
  call.arguments.forEach((a, i) => { if (assertionHeld(checker, a, seen) || opaqueInTypedSlot(checker, a)) held.push(i); });
  const params = new Set(held.map((i) => decl.parameters[i]));
  const result = withHeldParams(params, () => heldResultType(checker, decl)); // the result's real type there, or null
  return held.length || result ? { decl, held, result } : null;
}
// the refusal text for a held value (or an any or unknown value in a slot of another type) where its reading does not
// carry it, or for a call of a same-file unit whose result is held; null otherwise
export function typeAssertion(checker, n) {
  if (!n || !ts.isExpression(n)) return null;
  if (ts.isCallExpression(n)) {
    let decl = null; try { decl = checker.getResolvedSignature(n)?.declaration ?? null; } catch { /* unresolved */ }
    if (decl && decl.getSourceFile() === n.getSourceFile() && ts.isFunctionLike(decl) && unitFunction(decl) && !heldVariantUnit(checker, decl) && returnsHeld(checker, decl)) return `\`${n.getText().slice(0, 60)}\` calls a function whose result is asserted without a check; its value may be of another type than this caller reads; test it in the callee or give its source that type`;
  }
  if (ts.isParenthesizedExpression(n.parent) || ts.isNonNullExpression(n.parent) || ts.isSatisfiesExpression(n.parent)) return null; // the outermost wrapper owns the report
  const held = assertionHeld(checker, n);
  if (!held) {
    const t = tAt(checker, n);
    if (!opaqueT(t)) return null;
    if ((ts.isAsExpression(n) || ts.isTypeAssertionExpression(n)) && !opaqueT(tAt(checker, n.expression)) && ts.isCallExpression(n.parent) && n.parent.expression !== n) {
      // `e as any` of a typed value handed to a callee outside the file: the value is the typed source's, widened on purpose
      let decl = null; try { decl = checker.getResolvedSignature(n.parent)?.declaration ?? null; } catch { /* unresolved */ }
      if (!decl || decl.getSourceFile() !== n.getSourceFile()) return null;
    }
    let ct = null; try { ct = checker.getContextualType(n); } catch { return null; }
    if (!ct) return null;
    const parts = ct.flags & ts.TypeFlags.Union ? ct.types : [ct];
    if (parts.some((x) => x.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.TypeParameter | ts.TypeFlags.Void))) return null;
  }
  if (carried(checker, n)) return null;
  return `\`${n.getText().slice(0, 60)}\` holds a value whose type nothing checked (an \`as\` that narrows, or an any or unknown value), and this slot reads it as its declared type; test it first (\`typeof x === "number"\`, a field test), or keep it in a local, an operation or the result`;
}

// A reference (a record, an array, a function, an object) whose type an assertion erased: `r as any`, `r as unknown as
// string`, or a local such an assertion writes. The value reading converts it by its contents (ext_Any_of_Rec_Rec(r)),
// so two objects with equal fields give one value, where JavaScript compares objects by reference. The guards that keep
// identity out of the value reading (reference-equality, reference-key) read the asserted type and see none, so the
// erased reference is refused here at every slot that compares by identity (design/type-assertions.md, 2026-10-30).
const referencePart = (t) => {
  const TF = ts.TypeFlags;
  const notRef = TF.Any | TF.Unknown | TF.Never | TF.Void | TF.Undefined | TF.Null | TF.NumberLike | TF.StringLike | TF.BooleanLike | TF.BigIntLike | TF.EnumLike | TF.ESSymbolLike | TF.TypeParameter;
  return !!t && (t.flags & TF.Union ? t.types : [t]).some((x) => !(x.flags & notRef) && !primitiveBrand(x));
};
function erasedReference(checker, n, seen = new Set()) {
  while (n && (ts.isParenthesizedExpression(n) || ts.isNonNullExpression(n) || ts.isSatisfiesExpression(n))) n = n.expression;
  if (!n) return null;
  if (ts.isAsExpression(n) || ts.isTypeAssertionExpression(n)) {
    if (isConstAssertion(n)) return null;
    const to = tAt(checker, n);
    if (!to || referencePart(to)) return null; // the asserted type is a reference: the guards see it
    const inner = erasedReference(checker, n.expression, seen);
    if (inner) return inner;
    const from = tAt(checker, n.expression);
    return referencePart(from) ? from : null;
  }
  if (ts.isIdentifier(n)) {
    if (heldParams && n.parent && ts.isParameter(n.parent) && n.parent.name === n && heldParams.has(n.parent)) return any(); // a parameter of a unit read at Any for a call that hands it a held value
    let sym = null; try { sym = checker.getSymbolAtLocation(n); } catch { return null; }
    if (!sym || seen.has(sym)) return null;
    seen.add(sym);
    for (const w of writesOf(checker, sym) ?? []) { const r = erasedReference(checker, w, seen); if (r) return r; }
  }
  return null;
}
const MAP_KEY_METHODS = new Set(['set', 'get', 'has', 'delete']), SET_ITEM_METHODS = new Set(['add', 'has', 'delete']), SEARCH_METHODS = new Set(['includes', 'indexOf', 'lastIndexOf']);
const collectionKind = (checker, t) => {
  const parts = t ? (t.flags & ts.TypeFlags.Union ? t.types : [t]) : [];
  const names = parts.map((x) => x.symbol?.name ?? x.aliasSymbol?.name).filter(Boolean);
  if (names.some((s) => s === 'Map' || s === 'ReadonlyMap')) return 'map';
  if (names.some((s) => s === 'Set' || s === 'ReadonlySet')) return 'set';
  return parts.some((x) => checker.isArrayType?.(x) || checker.isTupleType?.(x)) ? 'array' : null;
};
// the rule and the text for an erased reference in an identity slot: an operand of === !== == != (not against null,
// undefined or a literal), a switch discriminant or case, an argument of Object.is, a key of a Map's set/get/has/delete,
// an item of a Set's add/has/delete, the searched value of an array's includes/indexOf/lastIndexOf; null otherwise
export function erasedReferenceSlot(checker, n) {
  if (!n || !ts.isExpression(n)) return null;
  const p = n.parent;
  if (!p || ts.isParenthesizedExpression(p) || ts.isNonNullExpression(p) || ts.isSatisfiesExpression(p) || ts.isAsExpression(p) || ts.isTypeAssertionExpression(p)) return null; // the outermost wrapper owns the report
  const K = ts.SyntaxKind;
  const plainSide = (x) => { while (ts.isParenthesizedExpression(x)) x = x.expression; return x.kind === K.NullKeyword || (ts.isIdentifier(x) && x.text === 'undefined') || ts.isStringLiteral(x) || ts.isNumericLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x) || x.kind === K.TrueKeyword || x.kind === K.FalseKeyword; };
  let rule = null;
  if (ts.isBinaryExpression(p) && [K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.EqualsEqualsToken, K.ExclamationEqualsToken].includes(p.operatorToken.kind)) {
    if (!plainSide(p.left === n ? p.right : p.left)) rule = 'reference-equality';
  } else if ((ts.isSwitchStatement(p) || ts.isCaseClause(p)) && p.expression === n) rule = 'reference-equality';
  else if (ts.isCallExpression(p) && p.expression !== n) {
    const i = p.arguments.indexOf(n), c = p.expression;
    if (c.getText() === 'Object.is') rule = 'reference-equality';
    else if (i === 0 && ts.isPropertyAccessExpression(c)) {
      const kind = collectionKind(checker, tAt(checker, c.expression)), m = c.name.text;
      if (kind === 'map' && MAP_KEY_METHODS.has(m)) rule = 'reference-key';
      else if (kind === 'set' && SET_ITEM_METHODS.has(m)) rule = 'reference-key';
      else if (kind === 'array' && SEARCH_METHODS.has(m)) rule = 'reference-equality';
    }
  }
  if (!rule) return null;
  const t = erasedReference(checker, n);
  if (!t) return null;
  const what = `\`${n.getText().slice(0, 60)}\` is a ${checker.typeToString(t).slice(0, 40)} whose type an assertion erased`;
  return rule === 'reference-key'
    ? { rule, message: `${what}; as a Map key or a Set item it is compared by reference (SameValueZero), and the value reading would equate two objects with the same fields; key it by a primitive (a field, an id) or keep its object type` }
    : { rule, message: `${what}; this comparison compares references, and the value reading would equate two objects with the same fields; compare fields` };
}

// A read after a call that may change what it reads (design/alias-result.md, 2026-10-30). The ordinary lane reads
// an object as a value: `p.x`, `ext_Any_x_Any(g)`, `ext_Ext_C_x_Ext_C(self)`, a copy, a library read, the unit's
// result take the object as it was when the unit received it, while a call that runs outside code (isEffectCall, a
// clock or random read aside) only threads the world. Such a call may change any object it can reach: the values the
// run hands to the outside (a receiver, an argument, a called function value) and whatever they may alias or reach
// by type, an any or unknown value or a function value reaching anything (hash-keys.md: the outside runs code only
// through values this run hands it). A read of such an object without the world, after such a call, would read the
// value before the call: refused by name. Kept: the object handed on to a call that threads the world (a receiver, an
// argument), an alias, `typeof`, `===`, a truth test, and a local the unit made of primitive fields and only reads.
// A field read `x.f` and a one-level write `x.f = v` after such a call are world forms (2026-10-30, world read): a
// decider that reads the object as the world holds it at that point passes `h.after` (a Map the forms are put in,
// occurrence -> 'read' | 'write') and `h.identity(occurrence)` (whether it names the object, else the form is refused);
// `h.outputs` and `h.afterEnd` the same for the output parameters at the unit's end. Without `h.after` the forms are kept.
export function readAfterCall(checker, sf, u, h) { // h: the decider's own readings, { effect(n), typeOf(n), worldRead(member), worldName(id), freshAlone(argument), opaque(statement), quiet(call), deferred(call), after, identity(occurrence), outputs, afterEnd }
const TF = ts.TypeFlags, K = ts.SyntaxKind, isAny = (t) => !!t && !!(t.flags & (TF.Any | TF.Unknown)), typeOf = (n) => h.typeOf(n);
  const body = u.fn?.body ?? u.node?.body;
  if (!body) return null;
  const P = (x) => { let p = x.parent; while (p && (ts.isParenthesizedExpression(p) || ts.isNonNullExpression(p) || ts.isAsExpression(p) || ts.isSatisfiesExpression(p))) { x = p; p = p.parent; } return { p, x }; };
  const clock = (c) => { const t = ts.isCallExpression(c) ? c.expression.getText(sf) : ts.isNewExpression(c) ? `new ${c.expression.getText(sf)}` : ''; return ['Date.now', 'performance.now', 'process.hrtime', 'Math.random', 'crypto.randomUUID'].includes(t) || (t === 'new Date' && !(c.arguments && c.arguments.length)); };
  const points = [], handed = [];
  const namespace = (x) => { if (!ts.isIdentifier(x)) return false; const d = checker.getSymbolAtLocation(x)?.declarations?.[0]; return !!d && (d.getSourceFile() !== sf || ts.isImportSpecifier(d) || ts.isNamespaceImport(d) || ts.isImportClause(d)); }; // a lib global or an imported binding as receiver holds no object of this unit's unless it was handed one, which is counted there
  const libraryReceiver = (x, call) => { if ((call.arguments ?? []).some((a) => ts.isFunctionLike(a) || ts.isIdentifier(a))) return false; const t = h.typeOf(x); if (!t || isAny(t)) return false; const ps = t.flags & TF.Union ? t.types.filter((y) => !(y.flags & (TF.Undefined | TF.Null))) : [t]; return ps.length > 0 && ps.every((y) => !!(y.flags & TF.StringLike) || isArrayLike(checker, y) || ['Map', 'Set', 'ReadonlyMap', 'ReadonlySet'].includes(y.symbol?.name ?? '')); }; // a library op on an array, a Map, a Set or a string runs no outside code on its receiver (its row is the reading)
  const answer = (x) => { while (ts.isParenthesizedExpression(x) || ts.isAsExpression(x) || ts.isNonNullExpression(x) || ts.isAwaitExpression(x)) x = x.expression; return ts.isCallExpression(x) || ts.isNewExpression(x); }; // the answer of a call reaches what the outside was handed, already counted
  const fnOf = (x) => { for (let p = x.parent; p && p !== body; p = p.parent) if (ts.isFunctionLike(p)) return p; return null; }; // a call in a nested function runs when that function runs
  const madeClosure = (x) => { for (let p = x.parent; p && p !== body; p = p.parent) if (ts.isFunctionLike(p)) { const q = p.parent; if (!(q && (ts.isCallExpression(q) || ts.isNewExpression(q)) && (q.arguments ?? []).includes(p)) || h.quiet?.(q) || effect(q)) return true; } return false; }; // a function value the unit makes and keeps, or hands to a call that runs outside code or to a hook, is its code and its cells (SEMANTICS.md, function values): its body is no read of the unit; a callback of a library op is read inline and stays
  const inOpaque = (x) => { for (let p = x.parent; p && p !== body; p = p.parent) { if (ts.isFunctionLike(p)) return false; if (ts.isStatement(p) && h.opaque?.(p)) return true; } return false; }; // a statement the decider reads as one uninterpreted transition holds no read of its own
  const effect = (n) => { try { return h.effect(n); } catch { return true; } };
  const walk = (n) => {
    if ((ts.isCallExpression(n) || ts.isNewExpression(n) || ts.isAwaitExpression(n) || ts.isPropertyAccessExpression(n)) && !clock(n) && !h.quiet?.(n) && effect(n)) {
      points.push(n);
      if (ts.isCallExpression(n) || ts.isNewExpression(n)) {
        for (const a of n.arguments ?? []) { if (!ts.isSpreadElement(a) && (h.freshAlone(a) || answer(a))) continue; handed.push({ at: n, t: typeOf(ts.isSpreadElement(a) ? a.expression : a), node: a }); } // a new object of primitive parts reaches only itself
        const f = n.expression;
        if ((ts.isPropertyAccessExpression(f) || ts.isElementAccessExpression(f)) && !answer(f.expression) && !libraryReceiver(f.expression, n) && !namespace(f.expression)) handed.push({ at: n, t: typeOf(f.expression), node: f.expression });
      } else if (ts.isPropertyAccessExpression(n)) handed.push({ at: n, t: typeOf(n.expression), node: n.expression });
    }
    ts.forEachChild(n, walk);
  };
  walk(body);
  if (!points.length) return null;
  // may a value of type h reach (be, or hold through its fields) an object of type o? any, unknown, a function or an unread depth: yes
  const prim = (t) => !!t && (t.flags & (TF.NumberLike | TF.StringLike | TF.BooleanLike | TF.BigIntLike | TF.EnumLike | TF.Undefined | TF.Null | TF.Void | TF.Never | TF.ESSymbolLike)) && !(t.flags & TF.Union && t.types.some((x) => !prim(x)));
  const reaches = (h, o, depth = 0, seen = new Set()) => {
    if (h === null || !h || isAny(h)) return true;
    if (h.flags & TF.Union) return h.types.some((x) => reaches(x, o, depth, seen));
    if (prim(h) || primitiveBrand(h)) return false;
    if (checker.getSignaturesOfType(h, ts.SignatureKind.Call).length) return false; // a function value reaches what it is handed, its arguments (hash-keys.md)
    if (checker.isTypeAssignableTo(o, h) || checker.isTypeAssignableTo(h, o)) return true;
    if (depth >= 4) return true;
    if (seen.has(h)) return false; seen.add(h);
    const inner = [...(checker.getTypeArguments?.(h) ?? []), ...checker.getPropertiesOfType(h).map((s) => { try { return checker.getTypeOfSymbolAtLocation(s, body); } catch { return undefined; } }).filter((x) => x !== undefined)];
    const idx = checker.getIndexTypeOfType(h, ts.IndexKind.String) ?? checker.getIndexTypeOfType(h, ts.IndexKind.Number);
    return [...inner, ...(idx ? [idx] : [])].some((x) => reaches(x, o, depth + 1, seen));
  };
  // a call reaches what it is handed and what calls started before it were handed (the outside may keep it), and in a loop what the loop hands
  const ranBy = (h, c) => h === c || h.getEnd() <= c.getStart(sf) || (c.pos <= h.pos && h.end <= c.end) || loops(h).some((l) => loops(c).includes(l)); // h ran before c ends: c itself, a call before it, one inside its operands, or one its loop repeats
  const reached = (o, c) => handed.find((x) => ranBy(x.at, c) && reaches(x.t, o)) ?? null;
  const repeats = (l, x) => { const within = (y) => !!y && y.pos <= x.pos && x.end <= y.end; return within(l.statement) || (ts.isForStatement(l) && (within(l.condition) || within(l.incrementor))) || ((ts.isWhileStatement(l) || ts.isDoStatement(l)) && within(l.expression)); }; // a for-of or for-in header and a for initializer run once
  const loops = (x) => { const ls = []; for (let p = x.parent; p && p !== body.parent; p = p.parent) if (ts.isIterationStatement(p, false) && repeats(p, x)) ls.push(p); return ls; };
  const inFn = (x, top) => { for (let p = x.parent; p && p !== top; p = p.parent) if (ts.isFunctionLike(p)) return true; return false; };
  let why = null;
  // where a call counts: a call inside a callback runs during the call it is handed to (unless that call defers it, an
  // effect hook); inside a function the unit makes and keeps, it runs when that function runs, so only for reads inside it
  const anchorOf = (c) => { let x = c; for (;;) { const f = fnOf(x); if (!f) return x; const q = f.parent; if (q && (ts.isCallExpression(q) || ts.isNewExpression(q)) && (q.arguments ?? []).includes(f) && !h.deferred?.(q)) { x = q; continue; } return null; } };
  const between = (start, occ, t) => points.some((c0) => {
    const cf = fnOf(c0), a = anchorOf(c0); if (!a && !(cf && cf.pos <= occ.pos && occ.end <= cf.end)) return false;
    const c = a && !(cf && cf.pos <= occ.pos && occ.end <= cf.end) ? a : c0;
    const hit = reached(t, c); if (!hit) return false;
    why = { call: c, handed: hit.node };
    const inside = c.pos <= occ.pos && occ.end <= c.end;
    if (inside && !inFn(occ, c)) return false; // evaluated before the call runs
    if (c.getStart(sf) >= start && c.getEnd() <= occ.getStart(sf)) return true;
    const lc = loops(c); return c.getStart(sf) >= start && loops(occ).some((l) => lc.includes(l)) && !inside;
  });
  const declOfSym = (s) => s?.valueDeclaration ?? s?.declarations?.[0];
  const writes = (s) => { const out = []; const w = (x) => { if (ts.isBinaryExpression(x) && x.operatorToken.kind >= K.FirstAssignment && x.operatorToken.kind <= K.LastAssignment && ts.isIdentifier(x.left) && checker.getSymbolAtLocation(x.left) === s) out.push(x); ts.forEachChild(x, w); }; w(body); return out; };
  const uses = (s) => { const out = []; const w = (x) => { if (ts.isIdentifier(x) && x !== declOfSym(s)?.name && checker.getSymbolAtLocation(x) === s) out.push(x); ts.forEachChild(x, w); }; w(body); return out; };
  const primLit = (e) => { while (ts.isParenthesizedExpression(e)) e = e.expression; if (ts.isObjectLiteralExpression(e)) return e.properties.every((m) => ts.isPropertyAssignment(m) && prim(typeOf(m.initializer))); if (ts.isArrayLiteralExpression(e)) return e.elements.every((x) => !ts.isSpreadElement(x) && prim(typeOf(x))); return false; };
  const sealed = (s) => { // a local the unit made of primitive parts, never handed, aliased or given an object
    const d = declOfSym(s);
    if (!d || !ts.isVariableDeclaration(d) || !d.initializer || !primLit(d.initializer) || writes(s).length) return false;
    return uses(s).every((x) => { const { p, x: y } = P(x); if (!((ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) && p.expression === y)) return false; const q = p.parent; if (q && ts.isCallExpression(q) && q.expression === p) return false; if (q && ts.isBinaryExpression(q) && q.left === p && q.operatorToken.kind >= K.FirstAssignment && q.operatorToken.kind <= K.LastAssignment) return prim(typeOf(q.right)); return true; });
  };
  const promiseLike = (t) => (t.flags & TF.Union ? t.types : [t]).every((x) => !!(x.flags & (TF.Undefined | TF.Null | TF.Void)) || ['Promise', 'PromiseLike'].includes(x.symbol?.name ?? '')); // a promise is a handle: its state is read only through then or await, which thread the world
  const objectLike = (t) => !!t && !prim(t) && !primitiveBrand(t) && !promiseLike(t) && !(checker.getSignaturesOfType(t, ts.SignatureKind.Call).length && !isAny(t));
  const kept = (occ) => { // the occurrence hands the object on, names it again or tests what never changes
    const { p, x } = P(occ);
    if (!p) return false;
    if (h.worldName?.(occ)) return true; // a name the decider reads through the world (module state): read as it is now
    if ((ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) && p.expression === x && h.worldRead(p)) return true; // a member the decider reads through the world (a field a method of its same-file class writes, a getter): read as it is now
    if ((ts.isCallExpression(p) || ts.isNewExpression(p)) && (p.arguments ?? []).includes(x)) return effect(p);
    if (ts.isSpreadElement(p) && p.parent && (ts.isCallExpression(p.parent) || ts.isNewExpression(p.parent))) return false;
    if (ts.isPropertyAccessExpression(p) && p.expression === x && p.parent && ts.isCallExpression(p.parent) && p.parent.expression === p) return effect(p.parent);
    if (ts.isVariableDeclaration(p) && p.initializer === x && ts.isIdentifier(p.name)) return true; // an alias; a destructuring pattern reads the fields
    if (ts.isBinaryExpression(p)) { const k = p.operatorToken.kind; if (k === K.EqualsToken && p.right === x) return true; if ([K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.EqualsEqualsToken, K.ExclamationEqualsToken].includes(k)) return true; if (k === K.InstanceOfKeyword && p.left === x) return true; }
    if (ts.isTypeOfExpression(p)) return true;
    if (ts.isPrefixUnaryExpression(p) && p.operator === K.ExclamationToken) return true;
    if (isAny(typeOf(x)) && (ts.isReturnStatement(p) || (ts.isArrowFunction(p) && p.body === x))) return true; // an any value is a handle: returned as it is, only a read through it takes its state
    if ((ts.isIfStatement(p) || ts.isWhileStatement(p) || ts.isDoStatement(p) || ts.isConditionalExpression(p)) && (p.expression ?? p.condition) === x) return true;
    return false;
  };
  // a world form: an occurrence the world read keeps after the call. `x.f` read (a path below it read too, a method of
  // the value it holds called when that call threads the world or changes nothing), or `x.f = v` one level: the
  // translator reads the object as the world holds it, `ext_now_<T>(wld, x)`, at that point of the run (h.after)
  const MUTATING = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin', 'add', 'set', 'delete', 'clear']);
  const worldForm = (occ) => {
    const { p, x } = P(occ);
    if (!p || !ts.isPropertyAccessExpression(p) || p.expression !== x || ts.isPrivateIdentifier(p.name)) return null;
    const assigned = (y) => y.parent && ts.isBinaryExpression(y.parent) && y.parent.left === y && y.parent.operatorToken.kind >= K.FirstAssignment && y.parent.operatorToken.kind <= K.LastAssignment;
    if (assigned(p)) return p.parent.operatorToken.kind === K.EqualsToken ? 'write' : null;
    let top = p; for (;;) { const { p: q, x: y } = P(top); if (q && (ts.isPropertyAccessExpression(q) || ts.isElementAccessExpression(q)) && q.expression === y) { top = q; continue; } break; }
    const { p: q, x: y } = P(top);
    if (!q || assigned(y) || ts.isDeleteExpression(q) || ((ts.isPrefixUnaryExpression(q) || ts.isPostfixUnaryExpression(q)) && (q.operator === K.PlusPlusToken || q.operator === K.MinusMinusToken))) return null; // a write below the field reads it first
    if (ts.isCallExpression(q) && q.expression === y) { if (top === p) return null; const m = ts.isPropertyAccessExpression(top) ? top.name.text : null; if (!effect(q) && (!m || MUTATING.has(m))) return null; } // x.m() is the receiver handed; x.f.push(v) changes what it reads
    return 'read';
  };
  let found = null, unnamed = false;
  const visit = (n) => {
    if (found) return;
    const isThis = n.kind === K.ThisKeyword;
    if (isThis || (ts.isIdentifier(n) && ts.isExpression(n) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) && !(n.parent && 'name' in n.parent && n.parent.name === n && !ts.isShorthandPropertyAssignment(n.parent)) && !(ts.isCallExpression(n.parent) && n.parent.expression === n))) {
      const s = isThis ? null : checker.getSymbolAtLocation(n);
      const d = s ? declOfSym(s) : null;
      const t = typeOf(n);
      if (!inOpaque(n) && !madeClosure(n) && (isThis || (d && d.getSourceFile() === sf && (ts.isParameter(d) || ts.isVariableDeclaration(d) || ts.isBindingElement(d)))) && objectLike(t) && !(s && sealed(s)) && !kept(n)) {
        const local = d && ts.isVariableDeclaration(d) && d.pos >= body.pos && d.end <= body.end;
        let init = local && d.initializer; while (init && (ts.isParenthesizedExpression(init) || ts.isAwaitExpression(init) || ts.isNonNullExpression(init) || ts.isAsExpression(init))) init = init.expression;
        const fresh = init && (ts.isCallExpression(init) || ts.isNewExpression(init)) && !writes(s).length; // obtained when it was bound
        const bound = d && ts.isBindingElement(d) ? (() => { let v = d.parent; while (v && !ts.isVariableDeclaration(v)) v = v.parent; let e = v?.initializer; while (e && (ts.isParenthesizedExpression(e) || ts.isAwaitExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e))) e = e.expression; return v && v.pos >= body.pos && e && (ts.isCallExpression(e) || ts.isNewExpression(e)) ? v : null; })() : null; // a name destructured from a call's answer is obtained at its binding
        const start = bound ? bound.getEnd() : fresh ? d.getEnd() : d && ts.isCatchClause(d.parent) ? d.parent.getStart(sf) : body.getStart(sf); // a caught value is obtained at its catch
        if (between(start, n, t)) {
          const wf = worldForm(n);
          if (!wf) found = n;
          else if (h.after) { if (h.identity && !isThis && !h.identity(n)) { found = n; unnamed = true; } else h.after.set(n, wf); } // the decider that reads it through the world; one that names no identity for it refuses
          // a decider without the world read (the lint) keeps the form: it never refuses what the translator reads
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(body);
  // an output parameter (h.outputs: its name nodes) is read at the unit's end, after every call: as the world holds it
  if (!found && h.afterEnd) { const end = { pos: body.end, end: body.end, parent: body, getStart: () => body.end, getEnd: () => body.end }; for (const nm of h.outputs ?? []) if (objectLike(typeOf(nm)) && between(body.getStart(sf), end, typeOf(nm))) h.afterEnd.add(nm.text); }
  if (!found) return null;
  const txt = found.kind === K.ThisKeyword ? 'this' : found.getText(sf);
  const at = (x) => `\`${x.getText(sf).replace(/\s+/g, ' ').slice(0, 50)}\` (line ${sf.getLineAndCharacterOfPosition(x.getStart(sf)).line + 1})`;
  if (unnamed) return { node: found, message: `\`${txt}\` is read here after ${at(why.call)}, a call that may change it: it is handed ${at(why.handed)}, which may be or hold this object, and this reading names no identity for it (a new object, a name written more than once), so it cannot read it as the world holds it; read what you need before the call, or pass it to the call and use the call's result` };
  return { node: found, message: `\`${txt}\` is read here after ${at(why.call)}, a call that may change it: it is handed ${at(why.handed)}, which may be or hold this object, and this reading takes the object as it was before the call; read what you need before the call, or pass it to the call and use the call's result` };
}
/** A named promise handler (`p.then(h)`, `p.catch(h)`, `p.finally(h)`, `h` a name or a member path): one decision the lint
 * and the translator take (design/named-then.md). Admitted, the handler is called with the settled argument: a unit of
 * this file by its own function (`origin: 'unit'`), an import or another file's function as one transition named by its
 * name (`'outside'`), a module constant holding a function value as one transition named by the code its initializer
 * reaches (`'binding'`, design/reach-keys.md), so a changed maker is another transition. Refused, `rule` and `message`
 * name it. `value` says whether the name has a reading as a passed value at all: a binding outside the unit (a module
 * constant, an import, another file, a global, or a member of one) that holds a function has none (the translator reads
 * such a name as a bodiless constant, which a function is not), so its only reading is the exact one. */
export function namedPromiseHandler(checker, a, sf, current, arity) {
  const sigs = checker.getSignaturesOfType(checker.getTypeAtLocation(a), ts.SignatureKind.Call);
  const root = ts.isIdentifier(a) ? a : ts.isPropertyAccessExpression(a) && ts.isIdentifier(a.expression) ? a.expression : null;
  const o = root ? originOf(checker, root, sf, current) : { kind: null };
  const value = !(sigs.length > 0 && ['module', 'import', 'other', 'global'].includes(o.kind));
  const refused = (rule, message) => ({ admit: false, value, rule, message });
  if (!ts.isIdentifier(a)) return refused('promise-handler', 'call the member inside an arrow, `(v) => obj.m(v)`: a member named as a handler is called without its receiver');
  const sg = sigs[0];
  const plain = (p) => !(p.valueDeclaration && ts.isParameter(p.valueDeclaration) && (p.valueDeclaration.dotDotDotToken || p.valueDeclaration.initializer || p.valueDeclaration.questionToken));
  if (!sg || sg.typeParameters?.length || sigs.length !== 1 || !sg.parameters.every(plain) || sg.parameters.length > arity || !['unit', 'import', 'other', 'module'].includes(o.kind)) return refused('promise-handler', 'use an arrow or a named same-file, module constant or imported function with at most one plain parameter');
  const rt = sg.getReturnType();
  const nativePromise = !!rt.symbol && rt.symbol === checker.resolveName('Promise', undefined, ts.SymbolFlags.Type, false);
  if ((rt.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) || (!nativePromise && checker.getPropertyOfType(rt, 'then'))) return refused('promise-thenable', 'give a named handler a plain or native Promise return type');
  return { admit: true, value, origin: o.kind === 'unit' ? 'unit' : o.kind === 'module' ? 'binding' : 'outside', sig: sg };
}

// A record whose own keys the unit fixed (design/open-datatype.md): an object literal whose every member is a named
// property, a shorthand or a spread of such a record, or a `const` local of the unit that such a literal initialises.
// Any other record value (a parameter, an import, a call result, a field of either) may carry keys its type does not
// name, which a spread and Object.assign copy (ECMA-262 CopyDataProperties). The value reading carries them in the
// datatype's rest; the heap core builds a node of the declared fields only, so it takes a spread of a built record alone.
export function builtRecord(checker, e, unitNode, seen = new Set()) {
  while (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isSatisfiesExpression?.(e)) e = e.expression;
  if (ts.isIdentifier(e)) {
    const d = checker.getSymbolAtLocation(e)?.valueDeclaration;
    if (!d || seen.has(d) || !unitNode || !(d.pos >= unitNode.pos && d.end <= unitNode.end) || !ts.isVariableDeclaration(d) || !d.initializer || !(ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const)) return false;
    seen.add(d); return builtRecord(checker, d.initializer, unitNode, seen);
  }
  if (!ts.isObjectLiteralExpression(e)) return false;
  return e.properties.every((p) => ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p) || (ts.isSpreadAssignment(p) && builtRecord(checker, p.expression, unitNode, seen)));
}
// The spreads of a record literal the value reading carries (design/open-datatype.md), shared by the lint (rule
// spread-source) and the translator (objectLit). One spread first is the source updated by the later members, its rest
// included; any other layout is one uninterpreted construction of the member values in order, keyed by the layout,
// which holds each source whole, rest included. Both are functions of the values (an any value is opaque, a union
// holds its member, an index entry is a key of its dictionary), except where a key given before a spread names an
// optional field of the source's type: the member survives only if the source lacks the key, and a missing optional
// field and one holding undefined are one value in the reading (None). Returns the text of that refusal, or null. A dictionary literal is not judged here.
export function spreadReadWhy(checker, lit) {
  const TF = ts.TypeFlags;
  const spreads = lit.properties.filter(ts.isSpreadAssignment);
  if (!spreads.length || (spreads.length === 1 && lit.properties[0] === spreads[0])) return null;
  const t = checker.getTypeAtLocation(lit);
  if (t && t.flags & TF.Object && checker.getIndexInfoOfType(t, ts.IndexKind.String) && !checker.getPropertiesOfType(t).length) return null;
  if (lit.properties.some((p) => !(ts.isSpreadAssignment(p) || ts.isShorthandPropertyAssignment(p) || (ts.isPropertyAssignment(p) && !ts.isArrowFunction(p.initializer) && !ts.isFunctionExpression(p.initializer))))) return 'a method or a function value beside a later spread is not read; spread first, or build the record in steps';
  const parts = (x) => (x.flags & TF.Union ? x.types : [x]).filter((y) => !(y.flags & (TF.Undefined | TF.Null | TF.Void | TF.BooleanLiteral | TF.Boolean)));
  const keysOf = (x) => new Set(parts(x).flatMap((y) => (y.flags & (TF.Object | TF.Intersection) ? checker.getPropertiesOfType(y).map((q) => q.name) : [])));
  const optional = (x, k) => parts(x).some((y) => { const q = y.flags & (TF.Object | TF.Intersection) ? checker.getPropertyOfType(y, k) : null; return !!q && !!(q.flags & ts.SymbolFlags.Optional); });
  const before = new Set(); let unknownBefore = false;
  for (const p of lit.properties) {
    if (ts.isSpreadAssignment(p)) {
      const st = checker.getTypeAtLocation(p.expression);
      const hit = [...before].find((k) => optional(st, k));
      // a key given before a spread (named or computed) is carried by the uninterpreted merge of the values up to the last spread (heap-3's reading, translate.mjs objectLit): a function of the sources whole, so no field of it is proved and a missing optional field against one holding undefined is never told apart wrongly; the earlier refusal here is lifted (28 Oct)
      void hit;
      for (const k of keysOf(st)) before.add(k);
      continue;
    }
    const name = p.name && (ts.isIdentifier(p.name) || ts.isStringLiteralLike(p.name) || ts.isNumericLiteral(p.name)) ? p.name.text : null;
    if (name === null) unknownBefore = true; else before.add(name);
  }
}
// a function's declared `this` parameter (TypeScript's this parameter) whose type names no receiver: `any`, `unknown`, or
// no annotation at all. The receiver is then any object the caller binds, so the function is not a method of a type the
// reading could key its receiver on; the refusal text, or null when the function declares no `this` or declares a type
export function untypedThisParam(checker, fn) {
  const p = fn?.parameters?.[0];
  if (!p || !ts.isIdentifier(p.name) || p.name.text !== 'this') return null;
  if (!p.type) return '`this` is declared without a type; declare the receiver type (`this: Ctx`)';
  const t = checker.getTypeFromTypeNode(p.type);
  if (t.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return /^(any|unknown)$/.test(p.type.getText()) ? `\`this: ${p.type.getText()}\` names no receiver type; declare the receiver type the function reads (\`this: Ctx\`)` : `\`this: ${p.type.getText()}\` reads as any (the type does not resolve here); make its declaration visible to the file or declare a receiver type that resolves`;
  return null;
}

// A unit of a JavaScript file whose inputs carry no declared type: a parameter with neither a TypeScript annotation
// nor a JSDoc type (`@param {T}`, `@type`). Its values are whatever the caller passes, so the proof lane does not read it
// (design/exported-units.md: "implicit any becomes an any-type proposal"; lane B still runs it). The refusal text names
// the first such parameter, or null for a TypeScript file or a unit whose parameters are all typed.
export function untypedJsUnit(sf, u) {
  if (!sf || !/\.(js|jsx|mjs|cjs)$/i.test(sf.fileName) || !u?.params) return null;
  for (const p of u.params) {
    if (ts.isIdentifier(p.name) && p.name.text === 'this') continue;
    if (p.type || ts.getJSDocType(p)) continue;
    const name = ts.isIdentifier(p.name) ? p.name.text : p.name.getText(sf);
    return `parameter \`${name}\` of a JavaScript unit has no declared type; declare it (a JSDoc \`@param {T} ${name}\` or TypeScript) or ask --any-type for a proposed type`;
  }
  return null;
}

// A method called through Function.prototype.apply or call is the direct call on its `this`: `r.m.apply(r, b)` is
// `r.m(...b)` and `r.m.call(r, x, y)` is `r.m(x, y)` (ECMA-262 20.2.3.1 and 20.2.3.3: the function runs with thisArg as
// `this` and the elements of b, or the remaining arguments, as its arguments; spreading an array lists the elements
// CreateListFromArrayLike lists). applyCall returns { receiver, method, args, spread, via, exact, why } for a call
// through `.apply`/`.call` (the lib's own members of Function), or null. `exact` holds when the direct call is the
// same transition: (1) the receiver is the method's own base, one path (a name, `this`, property names, literal or
// name indexes; casts and `!` aside) every step of which is a plain property (no getter), so reading it twice or once
// is one value; or (2) the method is an Array.prototype method of the lib reached through a base that is such a path,
// `[]` or `Array.prototype`, and `this` is such a path to an array or tuple: an array reaches the same intrinsic, so
// `[].push.call(c, x)` is `c.push(x)` (`receiver` is then `this`). apply also needs b a non-nullable array or tuple
// (apply on undefined passes nothing where a spread throws; an array-like that is not an array iterates otherwise).
// `why` names what fails. normaliseApplyCalls rewrites every exact one before the lint and the translator read the
// source, so every analysis that knows a method by its callee (a mutator by its name) sees the direct call.
export function applyCall(n, checker) {
  if (!ts.isCallExpression(n) || n.questionDotToken || n.typeArguments) return null;
  const via = n.expression;
  if (!ts.isPropertyAccessExpression(via) || via.questionDotToken || !ts.isIdentifier(via.name) || !['apply', 'call'].includes(via.name.text)) return null;
  const callee = via.expression;
  if (!ts.isPropertyAccessExpression(callee) || callee.questionDotToken || !ts.isIdentifier(callee.name)) return null;
  const libOf = (s, names) => !!s?.declarations?.length && s.declarations.every((d) => LIB_FILE.test(d.getSourceFile().fileName) && ts.isInterfaceDeclaration(d.parent) && names.includes(d.parent.name.text));
  if (!libOf(checker.getSymbolAtLocation(via.name), ['CallableFunction', 'NewableFunction', 'Function'])) return null;
  const method = callee.name.text, base = callee.expression, kind = via.name.text;
  const [thisArg, ...rest] = n.arguments;
  if (!thisArg || ts.isSpreadElement(thisArg)) return { receiver: base, method, args: [], spread: null, via: kind, exact: false, why: 'no receiver operand' };
  const strip = (x) => { while (ts.isParenthesizedExpression(x) || ts.isNonNullExpression(x) || ts.isAsExpression(x) || ts.isTypeAssertionExpression(x) || ts.isSatisfiesExpression(x)) x = x.expression; return x; };
  const plain = (x) => { const s = checker.getSymbolAtLocation(x); return !s || !(s.flags & (ts.SymbolFlags.GetAccessor | ts.SymbolFlags.SetAccessor)); };
  const keyOf = (k) => { k = strip(k); return ts.isStringLiteral(k) || ts.isNumericLiteral(k) ? `${k.kind}:${k.text}` : null; };
  const samePath = (a, b) => { // one path, read with no effect: the same value however often it is read
    if (b === undefined) b = a;
    a = strip(a); b = strip(b);
    if (a.kind !== b.kind) return false;
    if (a.kind === ts.SyntaxKind.ThisKeyword) return true;
    if (ts.isIdentifier(a)) { const s = checker.getSymbolAtLocation(a); return a.text === b.text && !!s && s === checker.getSymbolAtLocation(b); }
    if (ts.isPropertyAccessExpression(a)) return !a.questionDotToken && !b.questionDotToken && ts.isIdentifier(a.name) && ts.isIdentifier(b.name) && a.name.text === b.name.text && plain(a.name) && samePath(a.expression, b.expression);
    if (ts.isElementAccessExpression(a)) {
      const ka = keyOf(a.argumentExpression), sameKey = ka ? ka === keyOf(b.argumentExpression) : ts.isIdentifier(strip(a.argumentExpression)) && samePath(a.argumentExpression, b.argumentExpression);
      return !a.questionDotToken && !b.questionDotToken && sameKey && samePath(a.expression, b.expression);
    }
    return false;
  };
  const arrayT = (x) => { const t = checker.getTypeAtLocation(x); return !(t.flags & (TF.Any | TF.Unknown | TF.Union | TF.Never)) && (checker.isArrayType(t) || checker.isTupleType(t)); };
  let list = null;
  if (kind === 'apply') {
    if (rest.length > 1 || (rest[0] && ts.isSpreadElement(rest[0]))) return { receiver: base, method, args: [], spread: null, via: kind, exact: false, why: '`apply` takes one list' };
    list = rest[0] ?? null;
  }
  const out = { method, args: kind === 'call' ? rest : [], spread: list, via: kind };
  if (list && !arrayT(list)) return { ...out, receiver: thisArg, exact: false, why: `the list \`${list.getText().slice(0, 40)}\` is not an array type: apply lists its length and indexes (CreateListFromArrayLike) where a spread iterates, so a string or a Set differ, and apply on null or undefined passes nothing where a spread throws` };
  const rootOf = (x) => { x = strip(x); while (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x)) x = strip(x.expression); return x; };
  const worldRoot = (x) => { // a field of `this` or a module binding is a cell of the world: each read is a transition (lane B traces it), so the apply form's two reads are not the direct call's one
    const r = rootOf(x);
    if (r.kind === ts.SyntaxKind.ThisKeyword) return 'a field of the receiver `this`';
    if (!ts.isIdentifier(r)) return null;
    const d = checker.getSymbolAtLocation(r)?.valueDeclaration;
    for (let p = d?.parent; p; p = p.parent) if (ts.isFunctionLike(p)) return null;
    return 'a module binding';
  };
  const libRoot = (x) => { const r = rootOf(x); const d = ts.isIdentifier(r) ? checker.getSymbolAtLocation(r)?.valueDeclaration : null; return !!d && LIB_FILE.test(d.getSourceFile().fileName); }; // `Array.prototype`: a constant of the language, read with no effect
  { const w = worldRoot(thisArg) ?? (libRoot(base) ? null : worldRoot(base)); if (w) return { ...out, receiver: thisArg, exact: false, why: `the receiver \`${thisArg.getText().slice(0, 40)}\` is ${w}, a cell of the world read once per mention: the apply form reads it twice, the direct call once` }; }
  if (samePath(base, thisArg)) return { ...out, receiver: base, exact: true, own: true };
  const intrinsic = libOf(checker.getSymbolAtLocation(callee.name), ['Array', 'ReadonlyArray']) && (samePath(base) || (ts.isArrayLiteralExpression(strip(base)) && !strip(base).elements.length));
  if (intrinsic && samePath(thisArg) && arrayT(thisArg) && !/\n/.test(thisArg.getText())) return { ...out, receiver: thisArg, exact: true, own: false };
  return { ...out, receiver: thisArg, exact: false, why: intrinsic ? `\`this\` (\`${thisArg.getText().slice(0, 40)}\`) is not an array reached by a plain path` : `\`this\` (\`${thisArg.getText().slice(0, 40)}\`) is another value than the method's base \`${base.getText().slice(0, 40)}\`` };
}

// normaliseApplyCalls(loaded): the loaded program with every exact apply/call (applyCall) written as the direct call.
// The text keeps its length and its line breaks: only the span before the list (or the first remaining argument)
// changes, to `r.m(` and, for apply, `...`, padded with blanks, so every other position, line and unit is the same and
// a diagnostic or a finding elsewhere reports where it did. A nested form is rewritten on the next round.
export function normaliseApplyCalls(loaded) {
  let cur = loaded;
  for (let round = 0; round < 4; round++) {
    const { sf, checker, program } = cur;
    if (!/\.(apply|call)\s*\(/.test(sf.text)) return cur;
    const edits = [];
    const walk = (x) => { const a = applyCall(x, checker); if (a?.exact) edits.push({ x, a }); ts.forEachChild(x, walk); };
    walk(sf);
    if (!edits.length) return cur;
    let text = sf.text; let last = Infinity;
    for (const { x, a } of edits.sort((p, q) => q.x.pos - p.x.pos)) { // from the end; a call inside an earlier edit's span waits for the next round
      const callee = x.expression.expression;
      const from = a.own ? callee.end : callee.getStart(sf); // after `r.m`, or the whole borrowed callee
      const close = x.end - 1; // the closing parenthesis
      const to = a.via === 'apply' ? (a.spread ? a.spread.getStart(sf) : close) : (a.args.length ? a.args[0].getStart(sf) : close);
      if (x.end > last || text[close] !== ')') continue;
      const span = text.slice(from, to); const lines = (span.match(/\n/g) ?? []).length;
      const head = (a.own ? '(' : `${a.receiver.getText(sf)}.${a.method}(`) + '\n'.repeat(lines); const tail = a.via === 'apply' && a.spread ? '...' : '';
      if (head.length + tail.length > span.length) continue;
      text = text.slice(0, from) + head + ' '.repeat(span.length - head.length - tail.length) + tail + text.slice(to);
      last = x.getStart(sf);
    }
    if (text === sf.text) return cur;
    const options = program.getCompilerOptions();
    const host = ts.createCompilerHost(options, true);
    const getSourceFile = host.getSourceFile;
    host.getSourceFile = (name, lang, onError, create) => {
      if (path.resolve(name) === path.resolve(sf.fileName)) return ts.createSourceFile(name, text, lang, true, sf.scriptKind);
      return program.getSourceFile(name) ?? getSourceFile.call(host, name, lang, onError, create);
    };
    const roots = [...new Set([sf.fileName, ...program.getRootFileNames().filter((f) => f.endsWith('.d.ts'))])];
    const next = ts.createProgram({ rootNames: roots, options, host, oldProgram: program });
    const nsf = next.getSourceFile(sf.fileName);
    if (!nsf) return cur;
    unitSourceOrigin.set(nsf, unitSourceOrigin.get(sf) ?? sf); // a rewrite carries the source the user wrote
    const diagnostics = fileDiagnostics(next, nsf);
    cur = { ...cur, program: next, sf: nsf, checker: next.getTypeChecker(), diagnostics };
  }
  return cur;
}
// Absence (design/opaque-values.md). A `let` declared without an initializer holds undefined until a write; TypeScript
// checks that a read follows a write only for a plain read in the declaring function: it assumes the variable assigned
// under `v!`, for every read when the declaration says `let v!: T`, and for a read inside a nested function, and it
// does not see a write a nested function makes. Such a let is an option (None until written) in the proof lane, its
// definedness carried by the flow. A read whose value must be present (`x!` on a value that may be undefined, a read
// TypeScript did not check) is a payload read: the translator tests the option before the statement holding it, and
// where the option is absent the unit's result is an opaque value of its own text; it does so only in the unit's own
// statement flow, so the lint refuses a payload read anywhere else (definite-assignment for a let, non-null-assertion
// for `x!`).
const fnOf = (n) => { let p = n.parent; while (p && !ts.isFunctionLike(p) && !ts.isSourceFile(p) && !ts.isClassStaticBlockDeclaration(p)) p = p.parent; return p ?? null; };
// the declaration of a let without initializer named by this identifier, or null
function bareLetDecl(checker, id) {
  if (!ts.isIdentifier(id)) return null;
  let s = null; try { s = checker.getSymbolAtLocation(id); } catch { return null; }
  const d = s?.valueDeclaration;
  if (!d || !ts.isVariableDeclaration(d) || d.initializer || !ts.isIdentifier(d.name) || d.name === id) return null;
  const list = d.parent;
  if (!ts.isVariableDeclarationList(list) || !(list.flags & ts.NodeFlags.Let) || !ts.isVariableStatement(list.parent)) return null;
  if (d.type) { let t = null; try { t = checker.getTypeFromTypeNode(d.type); } catch { return null; } if (t.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return null; } // an any or unknown let is one opaque value
  return d;
}
const writeTarget = (id) => { let x = id; while (ts.isParenthesizedExpression(x.parent)) x = x.parent; const p = x.parent; return !!p && ts.isBinaryExpression(p) && p.left === x && p.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && p.operatorToken.kind <= ts.SyntaxKind.LastAssignment; };
// every reference to the let's symbol in its function, as { node, write, unchecked }
function letRefs(checker, d) {
  const sym = checker.getSymbolAtLocation(d.name), home = fnOf(d), out = [];
  if (!sym || !home) return out;
  const w = (x) => {
    if (ts.isIdentifier(x) && x !== d.name) {
      let s = null; try { s = checker.getSymbolAtLocation(x); } catch { /* none */ }
      if (s === sym) {
        const write = writeTarget(x) && x.parent.operatorToken?.kind === ts.SyntaxKind.EqualsToken;
        const nested = fnOf(x) !== home;
        let p = x; while (ts.isParenthesizedExpression(p.parent)) p = p.parent;
        out.push({ node: x, write, nested, unchecked: !write && (!!d.exclamationToken || nested || ts.isNonNullExpression(p.parent)) });
      }
    }
    ts.forEachChild(x, w);
  };
  w(home);
  return out;
}
// a let whose definedness TypeScript does not fix at some read (an unchecked read, or a write inside a nested function):
// the proof lane carries it as an option that starts absent
export function absenceCarried(checker, d) {
  if (!d || !ts.isVariableDeclaration(d) || !ts.isIdentifier(d.name)) return false;
  if (d.initializer || !ts.isVariableDeclarationList(d.parent) || !(d.parent.flags & ts.NodeFlags.Let) || !ts.isVariableStatement(d.parent.parent)) return false;
  if (d.type) { let t = null; try { t = checker.getTypeFromTypeNode(d.type); } catch { return false; } if (t.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return false; }
  return letRefs(checker, d).some((r) => r.unchecked || (r.write && r.nested));
}
// a payload read: the value read must be present, and nothing TypeScript checked says it is. `x!` on a local or a
// parameter whose type admits undefined, or a read of an absence-carried let TypeScript did not check whose type here
// excludes absence; returns the identifier read, or null
export function payloadRead(checker, n) {
  const TF = ts.TypeFlags;
  const admits = (t) => !!t && !!(t.flags & TF.Union) && t.types.some((x) => x.flags & (TF.Undefined | TF.Null));
  if (ts.isNonNullExpression(n)) {
    let e = n.expression; while (ts.isParenthesizedExpression(e)) e = e.expression;
    let t = null; try { t = checker.getTypeAtLocation(e); } catch { return null; }
    if (ts.isIdentifier(e) && bareLetDecl(checker, e) && absenceCarried(checker, bareLetDecl(checker, e))) return e;
    return admits(t) ? e : null;
  }
  if (!ts.isIdentifier(n) || writeTarget(n)) return null;
  let p = n; while (ts.isParenthesizedExpression(p.parent)) p = p.parent;
  if (ts.isNonNullExpression(p.parent)) return null; // the assertion owns it
  const d = bareLetDecl(checker, n);
  if (!d || !absenceCarried(checker, d)) return null;
  const r = letRefs(checker, d).find((x) => x.node === n);
  if (!r || !r.unchecked) return null;
  let t = null; try { t = checker.getTypeAtLocation(n); } catch { return null; }
  return admits(t) || (t.flags & (TF.Undefined | TF.Void)) ? null : n; // a read typed with its absence carries the option as it is
}
// the statement whose start tests a payload read, or null when the read is not in the unit's own statement flow: the
// identifier is a parameter or a local of the unit, the read sits in a return, an expression statement, a declaration or
// an if condition reached through blocks and if branches only (no loop, try, switch, label or nested function), the
// unit is neither async nor a generator and returns a value, and the statement does not write the variable
// The faithful number reading (translate/faithful.mjs, design/doubles.md) rewrites a number operation whose operands the
// model does not hold exactly into a call of `Math.__lean_<op>(...)`, an uninterpreted function of its operands. To every
// reader that classifies calls (an effect, a throw, a render-pure argument, a payload position, a loop body) that call
// IS the operator it replaced: pure, total, reading only its operands. One predicate names it; a reader that treats a
// call as an effect, an outside call or an impurity asks it first.
export const faithfulOp = (n) => !!n && ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === 'Math' && n.expression.name.text.startsWith('__lean_');
export function payloadStatement(checker, n, id) {
  const unit = fnOf(n);
  if (!unit || !ts.isFunctionLike(unit) || !unit.body || !ts.isBlock(unit.body)) return null;
  if (unit.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) || unit.asteriskToken) return null;
  if (ts.isConstructorDeclaration(unit) || ts.isSetAccessorDeclaration(unit)) return null;
  let sig = null; try { sig = checker.getSignatureFromDeclaration(unit); } catch { return null; }
  const rt = sig ? checker.getReturnTypeOfSignature(sig) : null;
  if (!rt || rt.flags & (ts.TypeFlags.Void | ts.TypeFlags.Undefined | ts.TypeFlags.Never)) return null;
  let s = null;
  if (ts.isIdentifier(id)) {
    try { s = checker.getSymbolAtLocation(id); } catch { return null; }
    const d = s?.valueDeclaration;
    if (!d || fnOf(d) !== unit || !(ts.isParameter(d) || ts.isVariableDeclaration(d)) || !ts.isIdentifier(d.name)) return null;
  } else if (!pureReadOf(checker, id, unit, true)) return null; // `m.get(k)!`, `xs.find(p)!`: the operand is read before the statement, so it must read only
  let st = n; while (st && !ts.isStatement(st)) { if (ts.isFunctionLike(st)) return null; st = st.parent; }
  if (!st || !(ts.isReturnStatement(st) || ts.isExpressionStatement(st) || ts.isVariableStatement(st) || (ts.isIfStatement(st) && n.pos >= st.expression.pos && n.end <= st.expression.end))) return null;
  for (let p = st.parent; p !== unit.body; p = p.parent) if (!p || !(ts.isBlock(p) || ts.isIfStatement(p))) return null;
  const head = ts.isIfStatement(st) ? st.expression : st;
  let writes = false;
  const w = (x) => { if (writes) return; if (ts.isIdentifier(x) && writeTarget(x)) { let t = null; try { t = checker.getSymbolAtLocation(x); } catch { /* none */ } if (t === s) writes = true; } if (ts.isPrefixUnaryExpression(x) || ts.isPostfixUnaryExpression(x)) { let o = x.operand; while (ts.isParenthesizedExpression(o)) o = o.expression; if (ts.isIdentifier(o) && checker.getSymbolAtLocation(o) === s && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(x.operator)) writes = true; } ts.forEachChild(x, w); };
  w(head);
  if (!ts.isIdentifier(id) && !pureReadOf(checker, head, unit, false)) return null; // the statement neither writes nor calls out, so reading the operand first reads the same value
  return writes ? null : st;
}
// an expression that only reads: identifiers of the unit or the module, literals, operators other than writes, property
// reads that are not accessors, and calls of the reading methods get, has, at, find, findLast, findIndex, includes,
// indexOf on a Map or an array (a callback an arrow with an expression body that only reads); `top` asks for one such call
function pureReadOf(checker, e, unit, top) {
  const READS = new Set(['get', 'has', 'at', 'find', 'findLast', 'findIndex', 'includes', 'indexOf']);
  let ok = true;
  const w = (x) => {
    if (!ok) return;
    if (ts.isArrowFunction(x)) { if (ts.isBlock(x.body) || x.parameters.some((p) => !ts.isIdentifier(p.name))) ok = false; else w(x.body); return; }
    if (faithfulOp(x)) { for (const a of x.arguments) w(a); return; } // an uninterpreted number operation: the operator it stands for, pure
    if (ts.isFunctionLike(x) || ts.isNewExpression(x) || ts.isAwaitExpression(x) || ts.isYieldExpression(x) || ts.isDeleteExpression(x) || ts.isTaggedTemplateExpression(x) || ts.isClassExpression(x)) { ok = false; return; }
    if (ts.isBinaryExpression(x) && x.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && x.operatorToken.kind <= ts.SyntaxKind.LastAssignment) { ok = false; return; }
    if ((ts.isPrefixUnaryExpression(x) || ts.isPostfixUnaryExpression(x)) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(x.operator)) { ok = false; return; }
    if (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x)) {
      let ps = null; try { ps = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(x) ? x.name : x.argumentExpression); } catch { /* none */ }
      if (ps?.declarations?.some((d) => ts.isGetAccessorDeclaration(d) || ts.isSetAccessorDeclaration(d))) { ok = false; return; }
    }
    if (ts.isCallExpression(x)) {
      const c = x.expression;
      if (!ts.isPropertyAccessExpression(c) || !READS.has(c.name.text) || x.questionDotToken || c.questionDotToken) { ok = false; return; }
      let rt = null; try { rt = checker.getTypeAtLocation(c.expression); } catch { ok = false; return; }
      const nm = (rt?.aliasSymbol ?? rt?.getSymbol?.())?.getName?.();
      if (!(isArrayLike(checker, rt) || nm === 'Map' || nm === 'ReadonlyMap')) { ok = false; return; }
      w(c.expression); x.arguments.forEach(w); return;
    }
    ts.forEachChild(x, w);
  };
  let e0 = e; while (ts.isParenthesizedExpression(e0)) e0 = e0.expression;
  if (top && !ts.isCallExpression(e0)) return false;
  w(e);
  return ok;
}
// where an absence-carried let's option is carried: declared in a unit's own flow (no try, catch or switch around it, the
// unit neither async nor a generator); the translator's fault and promise paths do not carry it
export function absenceHome(checker, d) {
  const fn = fnOf(d);
  if (!fn || !unitFunction(fn) || fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) || fn.asteriskToken) return false;
  for (let p = d.parent; p && p !== fn; p = p.parent) if (ts.isTryStatement(p) || ts.isCatchClause(p) || ts.isSwitchStatement(p) || ts.isCaseClause(p) || ts.isDefaultClause(p)) return false;
  return true;
}
// the payload reads of an absence-carried let that are not `x!` (a read TypeScript did not check whose type excludes
// absence) and that no statement test reaches: the lint names each
export function strandedLetReads(checker, d) {
  if (!absenceCarried(checker, d)) return [];
  return letRefs(checker, d).map((r) => r.node).filter((x) => payloadRead(checker, x) === x && !payloadStatement(checker, x, x));
}
// A callback's identity comes from its call, not its position among unrelated calls.
// This is also the prediction's inventory; topLevelFunctions supplies its existing units.
const unitSourceOrigin = new WeakMap();
// An arrow function has no `this` or type parameters of its own: inside a class member it reads the member's receiver
// (`this.total` is the class's accessor) and the member's and the class's type parameters; a callback unit under one
// therefore carries the member's class context (cls, className, isStatic) and the type parameters in scope, so the
// translator reads `this.x` and `T` in it as in the member. A function expression binds its own `this`: no class context.
const lexicalGenerics = (fn, scope) => {
  const own = fn.typeParameters ?? [];
  if (!ts.isArrowFunction(fn) || !scope) return own.length ? own : undefined;
  const outer = [...(scope.typeParameters ?? []), ...(ts.isClassLike(scope.parent) ? scope.parent.typeParameters ?? [] : [])];
  const all = [...outer, ...own];
  return all.length ? all : undefined;
};
const lexicalClass = (fn, scope) => {
  if (!ts.isArrowFunction(fn) || !scope || !scope.parent || !ts.isClassLike(scope.parent) || !scope.parent.name) return {};
  if (!(ts.isMethodDeclaration(scope) || ts.isGetAccessorDeclaration(scope) || ts.isSetAccessorDeclaration(scope) || ts.isConstructorDeclaration(scope) || ts.isPropertyDeclaration(scope))) return {};
  return { cls: scope.parent, className: scope.parent.name.text, isStatic: !!scope.modifiers?.some((x) => x.kind === ts.SyntaxKind.StaticKeyword) };
};
export function callbackUnits(sf, existing) {
  const source = unitSourceOrigin.get(sf);
  const sourceUnits = source ? [...topLevelFunctions(source).values()].filter(u => u.form === 'callback') : [];
  const byOriginal = new Map(sourceUnits.map(u => [u.fn, u]));
  // normaliseApplyCalls reparses length/line-preserving padded text, so it has no per-node original links. Its
  // unchanged ranges are the fallback; transforms retaining TypeScript's original link use that link first.
  const byRange = new Map(sourceUnits.map(u => [`${u.fn.getStart(source)}:${u.fn.end}`, u]));
  const byFn = new Map([...existing.values()].filter((u) => u.form !== 'callback').map((u) => [u.fn, u]));
  const candidates = [], groups = new Map();
  const literal = (n) => ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)
    ? `'${JSON.stringify(n.text).slice(1, -1).replace(/\\"/g, '"').replace(/'/g, "\\'")}'`
    : ts.isNumericLiteral(n) || ts.isBigIntLiteral(n) || [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(n.kind)
      || ts.isPrefixUnaryExpression(n) && [ts.SyntaxKind.MinusToken, ts.SyntaxKind.PlusToken].includes(n.operator) && ts.isNumericLiteral(n.operand) ? n.getText(sf) : null;
  const visit = (fn) => {
    if (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) {
      let arg = fn;
      while (arg.parent && (ts.isParenthesizedExpression(arg.parent) || ts.isAsExpression(arg.parent) || ts.isSatisfiesExpression(arg.parent) || ts.isTypeAssertionExpression(arg.parent) || ts.isNonNullExpression(arg.parent))) arg = arg.parent;
      const call = arg.parent;
      if ((ts.isCallExpression(call) || ts.isNewExpression(call)) && call.arguments?.includes(arg)) {
        let scope = null;
        for (let p = call.parent; p && p !== sf; p = p.parent) {
          if (ts.isFunctionLike(p) || ts.isClassStaticBlockDeclaration(p) || ts.isPropertyDeclaration(p)) { scope = p; break; }
        }
        const index = call.arguments.indexOf(arg);
        const key = `${call.expression.getText(sf)}(${call.arguments.slice(0, index).map(literal).filter((x) => x !== null).join(',')})#${index}`;
        const u = { name: key, node: fn, fn, params: fn.parameters, body: fn.body, typeNode: fn.type, isAsync: !!fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword), isArrow: ts.isArrowFunction(fn), generics: lexicalGenerics(fn, scope), form: 'callback', ...lexicalClass(fn, scope), call, argumentIndex: index, scope, orderNamed: false };
        candidates.push(u); byFn.set(fn, u);
        if (!groups.has(scope)) groups.set(scope, new Map());
        const group = groups.get(scope);
        if (!group.has(key)) group.set(key, []);
        group.get(key).push(u);
      }
    }
    ts.forEachChild(fn, visit);
  };
  visit(sf);
  for (const group of groups.values()) for (const us of group.values()) if (us.length > 1) us.forEach((u, i) => { u.name += `@${i + 1}`; u.orderNamed = true; });
  const out = [];
  for (const u of candidates) {
    const parent = u.scope && byFn.get(u.scope);
    if (u.scope && (!parent || parent.form === 'callback' && !out.includes(parent))) continue;
    u.enclosingUnit = parent ?? null;
    if (parent) u.name = `${parent.name}/${u.name}`;
    if (source) {
      const origin = byOriginal.get(ts.getOriginalNode(u.fn)) ?? byRange.get(`${u.fn.getStart(sf)}:${u.fn.end}`);
      if (!origin) throw new Error('callback origin lost by internal rewrite');
      u.name = origin.name; u.orderNamed = origin.orderNamed;
    }
    out.push(u);
  }
  return out;
}

// The checker supplies a callback's input type from the receiving signature. Unknown/any is not a type promise.
export function callbackUntypedJsUnit(sf, u, checker) {
  if (u.form !== 'callback') return untypedJsUnit(sf, u);
  return untypedJsUnit(sf, { ...u, params: u.fn.parameters.filter(p => {
    const t = checker.getTypeAtLocation(p.name);
    return !!(t.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown));
  }) });
}

// Findings belong to the named unit, otherwise to the smallest containing source range. Columns distinguish units
// sharing one line and keep an import-time call's finding outside the callback argument it contains.
export function findingUnit(sf, units, finding) {
  const values = [...units.values()];
  if (finding.unit) return values.find(u => u.name === finding.unit) ?? null;
  const lines = sf.getLineStarts();
  const start = (lines[finding.line - 1] ?? sf.end) + (finding.col ?? 1) - 1;
  const end = (lines[(finding.endLine ?? finding.line) - 1] ?? sf.end) + (finding.endCol ?? finding.col ?? 1) - 1;
  return values.filter(u => u.node.getStart(sf) <= start && end <= u.node.getEnd())
    .sort((a, b) => (a.node.getEnd() - a.node.getStart(sf)) - (b.node.getEnd() - b.node.getStart(sf)))[0] ?? null;
}

const callbackWrites = new WeakMap();
// A closure input is a binding owned by an enclosing unit. A module binding retains its module-state reading.
// Symbol identity, not spelling, joins uses and writes; writes in a loop or another closure can happen later even
// when their source precedes creation. Const bindings are stable; a mutable binding must have no possible later write.
export function callbackEnvironment(checker, u) {
  if (u.form !== 'callback') return [];
  const sf = u.fn.getSourceFile(), owners = new Set();
  for (let p = u.enclosingUnit; p; p = p.enclosingUnit) owners.add(p.fn);
  const enclosing = n => { for (let p = n.parent; p; p = p.parent) if (ts.isFunctionLike(p)) return p; return null; };
  if (!callbackWrites.has(checker)) callbackWrites.set(checker, new WeakMap());
  const byFile = callbackWrites.get(checker);
  let writes = byFile.get(sf);
  if (!writes) {
    writes = new Map(); byFile.set(sf, writes);
    const target = n => {
      if (ts.isIdentifier(n)) {
        const d = checker.getSymbolAtLocation(n)?.valueDeclaration;
        if (d) { if (!writes.has(d)) writes.set(d, []); writes.get(d).push(n); }
      } else if (ts.isArrayLiteralExpression(n)) n.elements.forEach(target);
      else if (ts.isObjectLiteralExpression(n)) n.properties.forEach(p => target(ts.isPropertyAssignment(p) ? p.initializer : ts.isShorthandPropertyAssignment(p) ? p.name : p.expression));
      else if (ts.isParenthesizedExpression(n) || ts.isSpreadElement(n) || ts.isSpreadAssignment(n)) target(n.expression);
      else if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken) target(n.left);
    };
    const scan = n => {
      if (ts.isBinaryExpression(n) && n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && n.operatorToken.kind <= ts.SyntaxKind.LastAssignment) target(n.left);
      if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(n.operator)) target(n.operand);
      if ((ts.isForOfStatement(n) || ts.isForInStatement(n)) && !ts.isVariableDeclarationList(n.initializer)) target(n.initializer);
      ts.forEachChild(n, scan);
    };
    scan(sf);
  }
  const captures = new Map();
  const visit = n => {
    if (ts.isTypeNode(n)) return;
    if (ts.isIdentifier(n)) {
      const sym = ts.isShorthandPropertyAssignment(n.parent) ? checker.getShorthandAssignmentValueSymbol(n.parent) : checker.getSymbolAtLocation(n);
      const decl = sym?.valueDeclaration;
      if (decl && (ts.isParameter(decl) || ts.isVariableDeclaration(decl) || ts.isBindingElement(decl)) && owners.has(enclosing(decl)) && !captures.has(decl)) {
        const loop = w => { for (let p = u.fn.parent; p; p = p.parent) if (ts.isIterationStatement(p, false) && p.pos <= w.pos && w.end <= p.end) return true; return false; };
        const mutable = !(ts.getCombinedNodeFlags(decl) & ts.NodeFlags.Const) && (writes.get(decl) ?? []).some(w => w.getStart(sf) >= u.fn.getStart(sf) || enclosing(w) !== enclosing(decl) || loop(w));
        captures.set(decl, { decl, sym, use: n, mutable });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(u.fn);
  return [...captures.values()];
}

// Artifact filenames are an encoding of identity, never a replacement for the unit/certificate name.
export const artifactName = unit => encodeURIComponent(unit);

// Unit names contain the call's literals and callee source. Only commas outside brackets and quotes separate units.
export function parseUnitList(text) {
  const out = []; let start = 0, depth = 0, quote = null, escaped = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
    } else if (c === "'" || c === '"' || c === '`') quote = c;
    else if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === ',' && depth === 0) { out.push(text.slice(start, i).trim()); start = i + 1; }
  }
  out.push(text.slice(start).trim());
  return out.filter(Boolean).map(token => {
    if (token.startsWith('"')) { try { const name = JSON.parse(token); if (typeof name === 'string') return name; } catch { /* raw source name */ } }
    return token;
  });
}

// Inverse transport for raw source names. Keep ordinary lists unchanged; JSON-quote a name when its source
// comments/quotes/brackets would consume a separator, or when a newline would break a one-line HEAP header.
export function formatUnitList(names) {
  return names.map(name => {
    const probe = parseUnitList(`${name},__unit_list_end__`);
    return !/[\r\n\u2028\u2029]/.test(name) && probe.length === 2 && probe[0] === name && probe[1] === '__unit_list_end__' ? name : JSON.stringify(name).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  }).join(',');
}

// Execution/check requests for a nested callback are requests for its enclosing unit's verdict.
export function enclosingUnitName(file, name) {
  if (!file || !fs.existsSync(file)) return null;
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  return topLevelFunctions(sf).get(name)?.enclosingUnit?.name ?? null;
}

// A branded primitive: an intersection of a primitive with object types (`number & { readonly [brand]: true }`,
// `string & { __kind: 'Id' }`). The object members exist only for the checker: a value of the type is a value of the
// primitive (TypeScript reduces two different primitives to never), so it is compared, keyed and coerced as that
// primitive is. Returns the primitive member, or null for any other type.
export function primitiveBrand(t) {
  const TF = ts.TypeFlags;
  if (!t || !(t.flags & TF.Intersection)) return null;
  const PRIM = TF.NumberLike | TF.BigIntLike | TF.StringLike | TF.BooleanLike | TF.EnumLike;
  const prims = t.types.filter((x) => x.flags & PRIM);
  return prims.length === 1 && t.types.every((x) => x === prims[0] || !!(x.flags & TF.Object)) ? prims[0] : null;
}
