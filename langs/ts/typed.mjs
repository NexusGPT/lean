// The typed reading (design/w1f-module-units.md): a change whose emitted JavaScript is byte-equal on both sides is
// PASS-typed. TypeScript's emit erases types, so two programs that emit the same JavaScript run the same code: whatever
// changed (an annotation, an interface, a type-only import, a directive comment, a JSDoc type of a JavaScript file)
// changed what the checker reads, never what runs.
//
// The two sides are one program each over the same files, the project's own (its tsconfig's file list) or the changed
// files alone without one, with the project's emit options; they differ only in the changed files' texts, served at
// their real paths, so every import resolves as it does in the checkout. A file's emit can read another file's types
// (a const enum's value inlined, decorator metadata naming a type's runtime constructor, an import kept or elided by
// what the imported name is), always through an import: a changed file's verdict therefore reads the emit of every file
// that imports it, directly or through others (its importers' closure), and of every file of the program when a side of
// the changed file declares globals (a script, `declare global`, an ambient module). Every file read must emit
// byte-equal on both sides; one that differs is named.
//
//   typedReading({ root, changes: [{ rel, parent, head }], project }) -> Map rel -> { equal, files, differs, reason?, ... }
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ts, COMPILER_OPTIONS, projectless, parseProjectConfig, topLevelFunctions } from './common.mjs';
import { broken, breakList } from './break.mjs'; // the one --break convention (A6; names in tests/break.mjs)

const hash = (v) => createHash('sha256').update(v).digest('hex');
// the files of a program read beyond the changed ones are capped: past it the reading is not made (no PASS-typed)
export const TYPED_FILE_CAP = 3000;
const TEMPORARY = /(^|[\\/])\.lean_(?:head|base|values)_\d+_/; // pr.mjs's materialised sides, never a file of the project
// LEAN_BREAK (the suite's one convention, tests/w1f-module-units.mjs --break): `w1f-emit` compares nothing (the reading never decides), `w1f-closure`
// reads the changed file's own emit alone (the importers' closure removed: a type read by another file's emit is missed)

// the project's options with emit on: JavaScript only, no maps (positions are not behaviour), no comments (a comment is
// not behaviour: the ledger's inert rule), into a folder no file is read from, whatever the project says of errors
export function emitOptions(options) {
  const o = { ...options, noEmit: false, emitDeclarationOnly: false, declaration: false, declarationMap: false, sourceMap: false,
    inlineSourceMap: false, inlineSources: false, removeComments: true, noEmitOnError: false, allowJs: true, outDir: path.join(path.sep, '__lean_typed_emit__') };
  delete o.composite; delete o.incremental; delete o.tsBuildInfoFile; delete o.rootDir; delete o.declarationDir; delete o.build;
  return o;
}

// whether a side of a file declares names every file of the program sees: a script (no import or export), a
// `declare global` block, or an ambient `declare module 'x'`
function declaresGlobals(sf) {
  if (!ts.isExternalOrCommonJsModule(sf)) return true; // a CommonJS file (require, module.exports) is a module
  return sf.statements.some((st) => ts.isModuleDeclaration(st) && (st.flags & ts.NodeFlags.GlobalAugmentation || ts.isStringLiteral(st.name)));
}

function sideProgram(options, roots, texts, oldProgram) {
  const host = ts.createCompilerHost(options, true);
  const { getSourceFile, fileExists, readFile } = host;
  host.fileExists = (f) => (texts.has(path.resolve(f)) ? texts.get(path.resolve(f)) !== null : fileExists.call(host, f));
  host.readFile = (f) => (texts.has(path.resolve(f)) ? texts.get(path.resolve(f)) ?? undefined : readFile.call(host, f));
  host.getSourceFile = (f, lang, onError, fresh) => {
    const abs = path.resolve(f);
    if (!texts.has(abs)) return getSourceFile.call(host, f, lang, onError, fresh);
    const text = texts.get(abs);
    return text === null ? undefined : ts.createSourceFile(f, text, lang, true);
  };
  return ts.createProgram({ rootNames: roots.filter((r) => texts.get(path.resolve(r)) !== null), options, host, oldProgram });
}

// the JavaScript a program emits for one source file: every output it writes, named relative to the emit folder
function emitted(program, sf) {
  const out = [];
  const r = program.emit(sf, (name, text) => { out.push([name, text]); });
  out.sort((a, b) => a[0].localeCompare(b[0]));
  return { text: out.map(([n, t]) => `//# ${path.basename(n)}\n${t}`).join('\n'), skipped: r.emitSkipped };
}

// the hash of a file's emit in a program, computed once per program
const emitHashes = new WeakMap();
function emitHash(program, abs) {
  if (!emitHashes.has(program)) emitHashes.set(program, new Map());
  const m = emitHashes.get(program);
  if (!m.has(abs)) { const sf = program.getSourceFile(abs); m.set(abs, sf && !sf.isDeclarationFile ? hash(emitted(program, sf).text) : null); }
  return m.get(abs);
}

// each source file of the program -> the files that import it (by the program's own resolution)
function importers(program) {
  const options = program.getCompilerOptions(), cache = ts.createModuleResolutionCache(program.getCurrentDirectory(), (x) => x, options);
  const by = new Map();
  for (const sf of program.getSourceFiles()) {
    if (program.isSourceFileFromExternalLibrary(sf)) continue;
    const info = ts.preProcessFile(sf.text, true, true);
    for (const spec of [...info.importedFiles, ...info.referencedFiles.map((r) => ({ ...r, reference: true }))]) {
      const target = spec.reference ? path.resolve(path.dirname(sf.fileName), spec.fileName)
        : ts.resolveModuleName(spec.fileName, sf.fileName, options, ts.sys, cache).resolvedModule?.resolvedFileName;
      if (!target) continue;
      const key = path.resolve(target);
      if (!by.has(key)) by.set(key, new Set());
      by.get(key).add(path.resolve(sf.fileName));
    }
  }
  return by;
}

// changes: [{ rel, parent: text|null, head: text|null, units?: [name] }] under `root` (the head's tree: the checkout or its
// snapshot). A file whose emit differs is read unit by unit for the units named: the head with that one unit's text put
// back to the parent's (every other file as the head has it) emits byte-equal in every file of the reach exactly when
// the unit's own change is erased by the compiler: out.get(rel).units[name] = { equal, differs }.
export function typedReading({ root, changes, project = true }) {
  const out = new Map();
  const started = performance.now();
  const groups = new Map(); // tsconfig ('' for none) -> changes
  for (const c of changes) {
    const abs = path.resolve(root, c.rel);
    const cfg = project === false ? '' : typeof project === 'string' ? path.resolve(project) : (ts.findConfigFile(path.dirname(abs), ts.sys.fileExists, 'tsconfig.json') ?? '');
    if (!groups.has(cfg)) groups.set(cfg, []);
    groups.get(cfg).push({ ...c, abs });
  }
  for (const [cfg, list] of groups) {
    const fail = (reason) => { for (const c of list) out.set(c.rel, { equal: false, reason, project: cfg ? path.relative(root, cfg) : null }); };
    try {
      let options, roots;
      const parsed = cfg && fs.existsSync(cfg) ? parseProjectConfig(cfg) : null;
      if (parsed) { options = { ...parsed.options, configFilePath: cfg }; roots = parsed.fileNames.filter((f) => !TEMPORARY.test(f)); }
      else { options = { ...COMPILER_OPTIONS, ...projectless(list[0].abs) }; roots = []; }
      if (options.outFile || options.out) { fail('the project emits one bundle (outFile): no file-by-file emit to compare'); continue; }
      options = emitOptions(options);
      for (const c of list) if (!roots.some((r) => path.resolve(r) === c.abs)) roots.push(c.abs);
      const texts = { parent: new Map(list.map((c) => [c.abs, c.parent])), head: new Map(list.map((c) => [c.abs, c.head])) };
      const head = sideProgram(options, roots, texts.head, undefined);
      const parent = sideProgram(options, roots, texts.parent, head);
      head.getTypeChecker(); parent.getTypeChecker(); // binds every file: a CommonJS file is known as a module only once bound
      const sources = (p) => p.getSourceFiles().filter((sf) => !sf.isDeclarationFile && !p.isSourceFileFromExternalLibrary(sf) && !TEMPORARY.test(sf.fileName));
      const all = new Set([...sources(head), ...sources(parent)].map((sf) => path.resolve(sf.fileName)));
      const by = [importers(head), importers(parent)];
      const memo = new Map();
      const emitOf = (abs) => {
        if (!memo.has(abs)) {
          const a = parent.getSourceFile(abs), b = head.getSourceFile(abs);
          const pa = a && !a.isDeclarationFile ? emitted(parent, a) : null, pb = b && !b.isDeclarationFile ? emitted(head, b) : null;
          memo.set(abs, { equal: (pa?.text ?? null) === (pb?.text ?? null), parent: pa ? hash(pa.text) : null, head: pb ? hash(pb.text) : null });
        }
        return memo.get(abs);
      };
      for (const c of list) {
        if (c.parent === null || c.head === null) { out.set(c.rel, { equal: false, reason: c.parent === null ? 'added file: no parent emit' : 'deleted file: no head emit' }); continue; }
        // the files whose emit this file's change can reach
        const sides = [parent.getSourceFile(c.abs), head.getSourceFile(c.abs)];
        let reach;
        if (broken('w1f-closure')) reach = new Set([c.abs]);
        else if (sides.some((sf) => !sf || declaresGlobals(sf))) reach = new Set(all);
        else {
          reach = new Set([c.abs]);
          const queue = [c.abs];
          while (queue.length) for (const g of by) for (const imp of g.get(queue.shift()) ?? []) if (!reach.has(imp)) { reach.add(imp); queue.push(imp); }
          // a changed file another change imports is read with it: its own row reads its own closure
        }
        const files = [...reach].filter((f) => all.has(f) || f === c.abs);
        if (files.length > TYPED_FILE_CAP) { out.set(c.rel, { equal: false, reason: `the files its emit can reach (${files.length}) exceed the cap (${TYPED_FILE_CAP})` }); continue; }
        const own = emitOf(c.abs);
        const differs = broken('w1f-emit') ? [c.abs] : files.filter((f) => !emitOf(f).equal);
        const diag = (p, sf) => sf ? [...p.getSyntacticDiagnostics(sf), ...p.getSemanticDiagnostics(sf)].filter((d) => d.category === ts.DiagnosticCategory.Error).length : 0;
        out.set(c.rel, {
          equal: !differs.length, emitted: { parent: own.parent, head: own.head }, files: files.length,
          differs: differs.map((f) => path.relative(root, f).split(path.sep).join('/')),
          // a file no change touched whose emit differs: its behaviour changed through this change's types (a const enum inlined, decorator metadata)
          unchangedDiffers: differs.filter((f) => !list.some((x) => x.abs === f) && !changes.some((x) => path.resolve(root, x.rel) === f)).map((f) => path.relative(root, f).split(path.sep).join('/')),
          errors: { parent: diag(parent, sides[0]), head: diag(head, sides[1]) },
          project: cfg ? path.relative(root, cfg).split(path.sep).join('/') : null,
          options: { module: options.module ?? null, target: options.target ?? null, emitDecoratorMetadata: !!options.emitDecoratorMetadata, isolatedModules: !!options.isolatedModules, verbatimModuleSyntax: !!options.verbatimModuleSyntax },
          ...(breakList().some((b) => b.startsWith('w1f-')) ? { broken: breakList().filter((b) => b.startsWith('w1f-')).join(',') } : {}),
        });
        if (differs.length && c.units?.length && !broken('w1f-emit')) {
          const ps = ts.createSourceFile(c.abs, c.parent, ts.ScriptTarget.Latest, true), hs = ts.createSourceFile(c.abs, c.head, ts.ScriptTarget.Latest, true);
          const pu = topLevelFunctions(ps), hu = topLevelFunctions(hs), units = {};
          for (const name of c.units) {
            const a = pu.get(name), b = hu.get(name);
            if (!a || !b || a.enclosingUnit || b.enclosingUnit) continue; // a nested unit is its enclosing unit's; a unit one side lacks has no parent text
            const text = c.head.slice(0, b.node.getStart(hs)) + c.parent.slice(a.node.getStart(ps), a.node.getEnd()) + c.head.slice(b.node.getEnd());
            if (text === c.head) continue;
            const reverted = sideProgram(options, roots, new Map([...texts.head, [c.abs, text]]), head);
            const unitDiffers = files.filter((f) => emitHash(reverted, f) !== emitHash(head, f));
            units[name] = { equal: !unitDiffers.length, differs: unitDiffers.map((f) => path.relative(root, f).split(path.sep).join('/')) };
          }
          out.get(c.rel).units = units;
        }
      }
    } catch (e) { fail(`emit failed: ${String(e.message).slice(0, 200)}`); }
  }
  for (const v of out.values()) v.ms = Math.round(performance.now() - started);
  return out;
}

// the sentence of a row the reading decided (a unit of a file whose emit differs: its own reading, `unit`)
export function typedReason(t, unit = null) {
  if (unit && t.units?.[unit]?.equal) return `this unit's own change is erased by the compiler: the head emitted with this unit's parent text is byte-equal to the head's (${t.files} file(s) read); the file's emit differs elsewhere (${t.differs.slice(0, 3).join(', ')})`;
  if (t.equal) return `the emitted JavaScript is byte-equal on both sides (${t.files} file(s) read: this file and every file whose emit its types can reach); the change is erased by the compiler${t.errors.head > t.errors.parent ? `; the head has ${t.errors.head - t.errors.parent} more type error(s) in this file` : ''}`;
  if (t.differs?.length) return `the emitted JavaScript differs in ${t.differs.slice(0, 3).join(', ')}${t.differs.length > 3 ? ` and ${t.differs.length - 3} more` : ''}${t.unchangedDiffers?.length ? `; ${t.unchangedDiffers.slice(0, 3).join(', ')} unchanged: its emit reads this change's types` : ''}`;
  return t.reason ?? 'the typed reading made no decision';
}
