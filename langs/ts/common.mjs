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
  let options = { ...COMPILER_OPTIONS };
  let roots = [abs];
  if (configFile && fs.existsSync(configFile)) {
    const raw = ts.readConfigFile(configFile, ts.sys.readFile);
    if (!raw.error) {
      const parsed = ts.parseJsonConfigFileContent(raw.config, ts.sys, path.dirname(configFile));
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
      options.configFilePath = configFile; // automatic @types inclusion starts from the config's directory
      workspaceResolution(options, configFile);
      // the file alone is the root: the compiler follows its imports, which is what a translation needs
      roots = [abs];
    } else configFile = null;
  }
  if (!configFile) roots = [...roots, path.join(here, 'ambient.d.ts')]; // structuredClone and the like, declared for a file read without its project
  const program = ts.createProgram(roots, options);
  const sf = program.getSourceFile(abs);
  if (!sf) throw new Error(`cannot read ${file}`);
  const checker = program.getTypeChecker();
  const diagnostics = [...program.getSyntacticDiagnostics(sf), ...program.getSemanticDiagnostics(sf)];
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

// loadManyChunks: the same, one Map per chunk of one project, so a caller can lint a chunk and let it go
export function* loadManyChunks(files, opts = {}) {
  const groups = new Map(); // configFile|'' -> [abs]
  for (const f of files) {
    const abs = path.resolve(f);
    const cfg = opts.project === false ? null : (ts.findConfigFile(path.dirname(abs), ts.sys.fileExists, 'tsconfig.json') ?? null);
    const k = cfg ?? ''; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(abs);
  }
  const CHUNK = opts.chunk ?? 1200; // a program over thousands of roots exhausts the heap; chunks share nothing but cost little
  const chunks = [];
  for (const [cfg, absList] of groups) for (let i = 0; i < absList.length; i += CHUNK) chunks.push([cfg, absList.slice(i, i + CHUNK)]);
  for (const [cfg, absList] of chunks) {
    const out = new Map();
    // options exactly as loadProgram computes them, with the whole group as roots
    const first = loadProgramOptions(absList[0], cfg || null);
    let program;
    try { program = ts.createProgram(absList, first.options); } catch (e) { for (const a of absList) out.set(a, { error: String(e.message) }); yield out; continue; }
    const checker = program.getTypeChecker();
    for (const abs of absList) {
      const sf = program.getSourceFile(abs);
      if (!sf) { out.set(abs, { error: `cannot read ${abs}` }); continue; }
      let diagnostics;
      try { diagnostics = [...program.getSyntacticDiagnostics(sf), ...program.getSemanticDiagnostics(sf)]; } catch (e) { out.set(abs, { error: `diagnostics: ${String(e.message).slice(0, 200)}` }); continue; }
      out.set(abs, { program, sf, checker, diagnostics, abs, projectFile: cfg || null });
    }
    opts.log?.(`project ${cfg || '(none)'}: ${absList.length} files`);
    yield out;
  }
}

// the compiler options loadProgram uses for a file under a config (shared by loadProgram and loadMany)
export function loadProgramOptions(abs, configFile) {
  let options = { ...COMPILER_OPTIONS };
  if (configFile && fs.existsSync(configFile)) {
    const raw = ts.readConfigFile(configFile, ts.sys.readFile);
    if (!raw.error) {
      const parsed = ts.parseJsonConfigFileContent(raw.config, ts.sys, path.dirname(configFile));
      options = { ...parsed.options, strict: true, noEmit: true, skipLibCheck: true, noImplicitReturns: true, allowJs: true, checkJs: true };
      if (Array.isArray(options.lib)) {
        const libDir = path.join(here, 'vendor', 'typescript', 'lib');
        options.lib = options.lib.filter((l) => fs.existsSync(path.join(libDir, l)));
        if (!options.lib.length) options.lib = ['lib.es2022.d.ts'];
      }
      delete options.composite; delete options.incremental; delete options.tsBuildInfoFile;
      options.configFilePath = configFile;
      workspaceResolution(options, configFile);
    }
  }
  return { options };
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
  }
  return map;
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

/** a file is REAL when a unit of it has a float literal or a bare `/` (not under Math.floor/Math.trunc): its numbers are
 * Dafny reals (exact decimals, not IEEE 754); every other file is an integer file. The lint and the translator both
 * decide by this, so the editor's rule and the proof lane agree. */
export function fileUsesReals(sf) {
  let real = false;
  const underFloor = (n) => { for (let p = n.parent; p; p = p.parent) { if (ts.isCallExpression(p) && ts.isPropertyAccessExpression(p.expression) && ts.isIdentifier(p.expression.expression) && p.expression.expression.text === 'Math' && (p.expression.name.text === 'floor' || p.expression.name.text === 'trunc') && p.arguments[0] && (p.arguments[0] === n || p.arguments[0].pos <= n.pos && n.end <= p.arguments[0].end)) return true; if (ts.isStatement(p) || ts.isFunctionLike(p)) return false; } return false; };
  const w = (n) => {
    if (real) return;
    if (ts.isTypeNode(n) || ts.isDecorator(n)) return;
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

// Stage 5 rank 21. A local procedure: a function declared inside a unit (a const arrow with a block body, or a nested
// function declaration) whose name is used only as the callee of plain calls of its arity, whose body never returns a
// value, throws, tries, awaits, yields, reads `this` or `arguments` or names itself, and whose declared names (its
// parameters and locals) collide with no name the unit declares outside it. Each call is read as the body spliced at the
// call site with the parameters bound to the arguments, so an outer cell the body writes threads like any statement.
export function localProcedure(decl, checker, unitFn) {
  const K = ts.SyntaxKind;
  let fn, name;
  if (ts.isVariableDeclaration(decl) && ts.isIdentifier(decl.name) && decl.initializer && ts.isArrowFunction(decl.initializer) && ts.isBlock(decl.initializer.body)) { fn = decl.initializer; name = decl.name; }
  else if (ts.isFunctionDeclaration(decl) && decl.name && decl.body) { fn = decl; name = decl.name; }
  else return null;
  if (!unitFn || !(decl.pos >= unitFn.pos && decl.end <= unitFn.end) || decl === unitFn) return null;
  if (fn.modifiers?.some((m) => m.kind === K.AsyncKeyword) || fn.asteriskToken || fn.typeParameters) return null;
  if (!fn.parameters.every((p) => ts.isIdentifier(p.name) && !p.dotDotDotToken && !p.questionToken && !p.initializer)) return null;
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
      if (!(p && ts.isCallExpression(p) && p.expression === n && !p.questionDotToken && p.arguments.length === fn.parameters.length && !p.arguments.some(ts.isSpreadElement) && p.parent && ts.isExpressionStatement(p.parent))) { bad = true; return; }
      calls++;
    }
    ts.forEachChild(n, refs);
  };
  refs(unitFn);
  if (bad || !calls) return null;
  // a name the body declares that the unit also declares outside it would shadow the unit's after the splice: refused,
  // except a parameter the body never assigns that every call passes under that same name (`keep(x)` in `for (const x of xs)`)
  const inside = new Map(), outside = new Set();
  const declNames = (n, add, skip) => { if (n === skip) return; if ((ts.isParameter(n) || ts.isVariableDeclaration(n) || ts.isBindingElement(n) || ts.isFunctionDeclaration(n)) && n.name && ts.isIdentifier(n.name)) add(n.name.text, n); ts.forEachChild(n, (c) => declNames(c, add, skip)); };
  declNames(fn, (k, n) => inside.set(k, n), null);
  declNames(unitFn, (k) => outside.add(k), fn);
  outside.delete(name.text);
  const assigned = new Set();
  const writes = (n) => { if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment && ts.isIdentifier(n.left)) assigned.add(n.left.text); if ((ts.isPostfixUnaryExpression(n) || ts.isPrefixUnaryExpression(n)) && (n.operator === K.PlusPlusToken || n.operator === K.MinusMinusToken) && ts.isIdentifier(n.operand)) assigned.add(n.operand.text); ts.forEachChild(n, writes); };
  writes(fn.body);
  const callArgs = []; const collect = (n) => { if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression !== name && checker.getSymbolAtLocation(n.expression) === sym) callArgs.push(n.arguments); ts.forEachChild(n, collect); }; collect(unitFn);
  for (const [k, n] of inside) {
    if (!outside.has(k)) continue;
    const i = ts.isParameter(n) ? fn.parameters.indexOf(n) : -1;
    if (i < 0 || assigned.has(k) || !callArgs.every((as) => ts.isIdentifier(as[i]) && as[i].text === k)) return null;
  }
  return { decl, fn, name: name.text, sym };
}
