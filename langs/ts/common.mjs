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
  checkJs: true,
};

// Diagnostics that only say "this file's neighbours are not here". With a project they do not occur; alone
// they would hide the real verdict behind missing modules, so they are reported under their own rule.
export const RESOLUTION_CODES = new Set([2307, 2305, 2306, 2792, 7016, 2688, 6053, 6059, 5083, 2300]);

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
      delete options.composite; delete options.incremental; delete options.tsBuildInfoFile;
      options.configFilePath = configFile; // automatic @types inclusion starts from the config's directory
      // a workspace package resolves to ITS SOURCE in this tree, never to a built dist or a node_modules link
      // that may point at another checkout: the proof is about the commit, not the machine
      const ws = workspacePaths(path.dirname(configFile));
      if (ws) {
        options.baseUrl = options.baseUrl ?? ws.root;
        const rel = (p) => path.relative(options.baseUrl, p) || '.';
        options.paths = { ...(options.paths ?? {}) };
        for (const [name, dir] of ws.packages) {
          const src = fs.existsSync(path.join(dir, 'src', 'index.ts')) ? path.join(dir, 'src', 'index.ts') : fs.existsSync(path.join(dir, 'index.ts')) ? path.join(dir, 'index.ts') : null;
          if (src && !options.paths[name]) options.paths[name] = [rel(src)];
          if (!options.paths[name + '/*']) options.paths[name + '/*'] = [rel(path.join(dir, 'src')) + '/*', rel(dir) + '/*'];
        }
      }
      // the file alone is the root: the compiler follows its imports, which is what a translation needs
      roots = [abs];
    } else configFile = null;
  }
  const program = ts.createProgram(roots, options);
  const sf = program.getSourceFile(abs);
  if (!sf) throw new Error(`cannot read ${file}`);
  const checker = program.getTypeChecker();
  const diagnostics = [...program.getSyntacticDiagnostics(sf), ...program.getSemanticDiagnostics(sf)];
  return { program, sf, checker, diagnostics, abs, projectFile: configFile };
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
 * (`self`), its parameters and, when effectful, the world. Constructors, getters, setters and abstract or
 * bodiless methods are not units.
 */
export function classMethodUnits(st) {
  if (!ts.isClassDeclaration(st) || !st.name) return [];
  const out = [];
  for (const m of st.members) {
    if (!ts.isMethodDeclaration(m) || !m.body || !m.name || !ts.isIdentifier(m.name)) continue;
    const isStatic = !!m.modifiers?.some((x) => x.kind === ts.SyntaxKind.StaticKeyword);
    out.push({ name: `${st.name.text}.${m.name.text}`, node: m, fn: m, params: m.parameters, body: m.body, typeNode: m.type,
      isAsync: !!m.modifiers?.some((x) => x.kind === ts.SyntaxKind.AsyncKeyword), isArrow: false, generics: m.typeParameters,
      cls: st, className: st.name.text, method: m.name.text, isStatic });
  }
  return out;
}

export function isArrayLike(checker, type) {
  return checker.isArrayType(type) || checker.isTupleType(type);
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
  for (let p = decl; p; p = p.parent) if (p === current) return { kind: 'local', sym: s, decl };
  if (ts.isMethodDeclaration(decl) && decl.parent && ts.isClassDeclaration(decl.parent) && decl.parent.parent === sf) return { kind: 'unit', sym: s, decl };
  if (ts.isFunctionDeclaration(decl) || (ts.isVariableDeclaration(decl) && decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) && decl.parent?.parent && ts.isVariableStatement(decl.parent.parent) && decl.parent.parent.parent === sf)) return { kind: 'unit', sym: s, decl };
  if (ts.isVariableDeclaration(decl) && (ts.getCombinedNodeFlags(decl) & ts.NodeFlags.Const)) return { kind: 'module', sym: s, decl };
  if (ts.isTypeAliasDeclaration(decl) || ts.isInterfaceDeclaration(decl) || ts.isEnumDeclaration(decl)) return { kind: 'type', sym: s, decl };
  return { kind: 'module-mutable', sym: s, decl };
}
