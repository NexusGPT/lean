#!/usr/bin/env node
// Lane B: bounded differential execution of one unit, parent against candidate.
//
//   node run.mjs --parent <file.ts> --candidate <file.ts> --unit <name|Class.method> [--n 200] [--seed 1]
//                [--out result.json] [--project <tsconfig>|--no-project] [--ms 2000] [--unit-seconds 120]
//
// Both files are compiled with the vendored TypeScript compiler and loaded in their own sandbox (node:vm) with the
// same fakes (fake.mjs): relative imports inside the same package are compiled and loaded too; every other import,
// every global that reaches the outside (the clock, random, timers, the console, fetch, process) is a fake that
// records what is asked of it. Inputs come from the parameter types (spec.mjs, gen.mjs), the same on both sides;
// opaque inputs are fakes. The observation of one call is the outcome (returned or thrown value), the arguments after
// the call (reachable mutation), the trace of environment requests, and the pending work. The verdict:
//   WITNESS      an input on which the observations differ (the input index, both observations)
//   PASS-bounded no difference on n inputs; the bound is stated (n, seed, the fake policy, the per-input time limit)
//   NEW          a candidate-only unit loaded and ran; no equality claim
//   REFUSE       a repository-owned local source link failed (kind: load)
//   ASK          a side could not be loaded or run (the reason), or the unit is not found
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { broken } from '../break.mjs'; // the one --break convention (A6; names in tests/break.mjs)
import { createRequire } from 'node:module';
import { fork, spawnSync, execFile } from 'node:child_process';
import { captureEnvironment, captureActive, snapshot, witnessRecord, drawSummary, CLOCK_EPOCH, beginUnitRecord, finishUnitRecord, incompleteUnitRecord } from './record.mjs';
import { ts, loadProgram, topLevelFunctions, aliasTarget, literalMemberUnits, enclosingUnitName, MODULE_UNIT, moduleStatements, fileClassFieldsDefine } from '../common.mjs';
import { Environment, render, renderTree, renderDrawn, programConstructor, BudgetError, promiseName, withSite, rememberFunctionSource, setRoots, bindRealm, ownFunction, resetEscapes, openEscapes, closeEscapes, escapeEntry, escapeKey, undecidedDrives, undrivenOf, pauseEscapes, resumeEscapes, canonHandles , enterWorld, behaviouralGlobals } from './fake.mjs';
import { specOf, findValues, readValues, argsFor, fits } from './spec.mjs';
import { inputsFor, aliasInputs, knownInput, knownLength, walkLength } from './gen.mjs';
import { enumerateHeaps } from './korat.mjs';
import { runNew } from './new-unit.mjs';
import { Graph, isNode } from './graph.mjs';
import { startRecording, stopRecording, addRealm, summarizeRecords } from './transitions.mjs';
import { witnessPatch, statementMarks } from '../patch.mjs';
import { comparedTable, guideOf } from './compared.mjs';
import { descriptorsOf, interpretFire, newHandlerStats } from './handlers-interp.mjs';
import { annotateWitness } from './callees.mjs';
import { decoratorTable } from '../decorators.mjs';
import { stylesLayer, projectConfig } from './styles.mjs';
import { contextRow } from '../hooks.mjs';
import { bridgeGlobal, bridgeCounts, isBridgeName } from './bridge.mjs';
import { netMode, netFlags, denyNetwork, networkDenied, deniedAttempts, sandboxEntry } from './net-deny.mjs';
import { currentSandboxList, applyList, guardSpawn, spawnRefusals } from './sandbox-list.mjs';
import { factMarks, factHook } from './callee-trace.mjs'; // the per-callee fact's record: every call site of the pair's files (lane w8e, callee-facts.mjs)
import { searchPlan, branchMarks, valueMarks, seenValue, outcomeOf, searchInputs, searchWorld, worldText, applyRecipe, changesOf, recipeText, SEARCH_SHARE, REACH_CEILING } from './search.mjs';
import { keepDifference, WITNESS_SITES, WITNESS_SHARE } from './sites.mjs';

const require = createRequire(import.meta.url);
// The library transition table (translate/library.json) is validated on every run: while the unit runs, each built-in
// call of the table made from the sandbox's files is recorded (transitions.mjs) and checked against its row; the
// certificate carries the counts and every defect. LEAN_LIBRARY_TABLE names another table (the suite's negative
// check); LEAN_LIBRARY_CASES names a directory where each defect is written as a case.
const loadedFiles = new Set(); // every file a sandbox loaded: a built-in call is the unit's when its caller's file is one of them
let libraryTable = null;
const libraryTableOf = () => libraryTable ??= JSON.parse(fs.readFileSync(process.env.LEAN_LIBRARY_TABLE || path.join(path.dirname(new URL(import.meta.url).pathname), '../translate/library.json'), 'utf8'));
let activeSiteState = null;
let activeRecords = null, windowDepth = 0; // a run's record set, and the window: the prototypes are patched only while unit code runs (guardedCall, an effect, a cleanup, the await of a promise the unit returned), so the harness's own work between calls costs nothing
const recording = async (records, fn) => { const prev = activeRecords; activeRecords = records; try { return await fn(); } finally { activeRecords = prev; } };
const openWindow = (env) => { activeSiteState = env?.siteState ?? null; if (!activeRecords) return false; if (windowDepth++ === 0) { startRecording(activeRecords, undefined, { keep: (f) => loadedFiles.has(f), site: () => activeSiteState?.current?.site ?? null }); } if (env && env.realm) addRealm(env.realm); return true; };
const closeWindow = (opened) => { if (!opened) return; if (--windowDepth === 0) stopRecording(); };
const awaitUnit = async (env, p, ms) => { const w = openWindow(env); try { return await withTimeout(onClock(env, p, ms), ms); } finally { closeWindow(w); } }; // a promise the unit returned: its continuations are unit code
// A promise the unit returned, awaited as the event loop awaits it (design/world-calls.md, lane w9ab): while it is
// pending and the host's turn has drained, the world's clock moves to the next armed timer and fires what is due then
// (runTimers), so a unit awaiting `new Promise((r) => setTimeout(r, n))`, a retry's back-off or a poll's interval
// settles on the virtual clock instead of running out its wall time on every input. The timers the unit armed and did
// not await still fire after the outcome, as before. When nothing is armed and nothing moved for IDLE_TURNS turns, the
// promise waits on no world call lean answers: the run stops at once (Unsettled, ASK) naming the await site and the
// last world call. Not under the race explorer (env.scheduler holds every release itself), nor inside a firing
// (one clock at a time). LEAN_BREAK=world-clock: the wall clock alone, as before
const AWAIT_FIRES = 50, IDLE_TURNS = 8, IDLE_MS = 200;
class Unsettled extends BudgetError { constructor(m) { super(m); this.name = 'Unsettled'; } } // a harness stop every catch lets through as it lets a budget through; observeWindow reads it as a timed-out input (skipped), where a budget stop is ASK
const siteLabel = (s) => (!s ? 'an unmarked statement' : typeof s === 'object' && s.file ? `${path.basename(String(s.file))}:${s.start}${s.text ? ` \`${String(s.text).split('\n')[0].slice(0, 80)}\`` : ''}` : JSON.stringify(s).slice(0, 80)); // patch.mjs statementMarks: { file, start, end, text }
const stoppedAt = (env) => `${siteLabel(env.siteState?.current?.site)} (last world call: ${lastWorldCall(env)})`; // where a stopped input stood
const lastWorldCall = (env) => { for (let i = env.trace.length - 1; i >= 0; i--) { const t = env.trace[i]; if (t.op !== 'fire') return `${t.op} ${t.path}`; } return 'none'; };
async function onClock(env, p, ms) {
  if (!env?.timers || !p || typeof p.then !== 'function' || env.scheduler || env.clockDriving || broken('world-clock')) return p;
  let state = 0, value, error;
  Promise.resolve(p).then((v) => { state = 1; value = v; }, (e) => { state = 2; error = e; });
  const moved = () => `${env.trace.length}/${env.pending.length}/${env.timers.queue.length}/${env.computed?.length ?? 0}`;
  env.clockDriving = true;
  try {
    let idle = 0, idleSince = 0, fires = 0, mark = moved();
    for (;;) {
      await new Promise((r) => setImmediate(r));
      if (state) break;
      const armed = env.timers.queue.filter((e) => e.fired === 0);
      if (armed.length) {
        if (++fires > AWAIT_FIRES) throw new BudgetError(`more than ${AWAIT_FIRES} timer instants passed while the unit awaited at ${siteLabel(env.siteState?.current?.site)} (last world call: ${lastWorldCall(env)})`);
        await runTimers(env, ms, AWAIT_FIRES, { until: Math.min(...armed.map((e) => e.due)) });
        idle = 0; mark = moved(); continue;
      }
      const now = moved(); if (now !== mark) { mark = now; idle = 0; continue; }
      if (idle++ === 0) idleSince = Date.now();
      if (idle >= IDLE_TURNS) { if (Date.now() - idleSince < wallAllowance(IDLE_MS)) { await new Promise((r) => setTimeout(r, 5)); continue; } } else continue; // a fake's own host work (a file read) takes host time, never a timer: the stop waits IDLE_MS of the wall too
      throw new Unsettled(`unsettled: the unit awaits at ${siteLabel(env.siteState?.current?.site)} a promise no world call settles (last world call: ${lastWorldCall(env)}; nothing armed)`);
    }
  } finally { env.clockDriving = false; }
  if (state === 2) throw error;
  return value;
}
const libraryCases = (summary) => {
  const dir = process.env.LEAN_LIBRARY_CASES; if (!dir || !summary.defects.length) return;
  fs.mkdirSync(dir, { recursive: true });
  for (const d of summary.defects) { const name = `${d.op.replace(/[^A-Za-z0-9]+/g, '_')}-${crypto.createHash('sha256').update(JSON.stringify(d)).digest('hex').slice(0, 12)}.json`; fs.writeFileSync(path.join(dir, name), JSON.stringify(d, null, 1)); }
};

const COMPILE = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true, emitDecoratorMetadata: false, esModuleInterop: true, importHelpers: false, strict: false, sourceMap: false, removeComments: true, jsx: ts.JsxEmit.ReactJSX, allowJs: true, moduleDetection: ts.ModuleDetectionKind.Force };

// the loader's marks: every JSX attribute value becomes `__lean_h(pos, value, file)` and every `useState(...)`
// or `x.useState(...)` call `__lean_s(pos, call, file)`, where pos is the node's position in the source; both return
// their value unchanged and record the function or the slot under that position (handlers-interp.mjs meets them with
// the static descriptors there). The positions are the source file's unless the file uses import.meta before the node
// (src2 replaces it before transpiling)
const leanMarks = (file) => (context) => {
  const f = context.factory;
  const visit = (node) => {
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) { // an `on[A-Z]` value meets its descriptor at a fire; any other function value is keyed by its descriptor in the tree (handlers-interp.mjs keyHandlers)
      const e = node.initializer.expression;
      return f.updateJsxAttribute(node, node.name, f.updateJsxExpression(node.initializer, f.createCallExpression(f.createIdentifier('__lean_h'), undefined, [f.createNumericLiteral(e.pos), ts.visitNode(e, visit), f.createStringLiteral(file)])));
    }
    if (ts.isCallExpression(node) && ((ts.isIdentifier(node.expression) && node.expression.text === 'useState') || (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'useState'))) {
      return f.createCallExpression(f.createIdentifier('__lean_s'), undefined, [f.createNumericLiteral(node.pos), ts.visitEachChild(node, visit, context), f.createStringLiteral(file)]);
    }
    return ts.visitEachChild(node, visit, context);
  };
  return (sf) => ts.visitNode(sf, visit);
};

// A file is compiled once per source text. Each sandbox receives its own marker.
const siteCompiles = new Map();
// the guards of a compiled file (compared.mjs comparedTable), read once, when a world search first asks for them
// the falsy values as search.mjs seenValue writes them
const FALSY_SEEN = new Set(['null', 'undefined:undefined', 'string:', 'number:0', '-0', 'number:NaN', 'boolean:false', '0n']);
const comparedOfFile = (abs) => { const c = siteCompiles.get(abs); return c ? (c.compared ??= comparedTable(c.src, abs)) : null; };
// the class-field emit mode is the file's own (common.mjs fileClassFieldsDefine, the rule lane A reads from its program):
// its project's, the run's --project, or lean's single-file options under --no-project
let fieldsProject = true;
export const setFieldsProject = (p) => { fieldsProject = p; }; // a caller that loads files itself (conformance/node-side.mjs): the run's project, as runPair sets it
// the branch probes of the input search (search.mjs branchMarks): the files of the pair under search, by absolute path,
// each with its branch table and its side's tag; null when no search runs (LEAN_SEARCH, --search), and then nothing changes
let probes = null;
export const setProbes = (m) => { probes = m; }; // a candidate-only run's probes (new-unit.mjs newUnitProbes): the NEW path's reach, the same hooks
// the files whose call sites lane B records for the callee facts (callee-trace.mjs): the pair's two files while runPair runs
let factFiles = new Set();
function compileWithSites(src, tsName, abs) {
  const define = fileClassFieldsDefine(abs, fieldsProject);
  const probe = probes?.get(abs) ?? null;
  const fact = factFiles.has(abs); // a file of the pair under check: its call sites are recorded (callee-trace.mjs factMarks)
  const old = siteCompiles.get(abs);
  if (old?.src === src && old.define === define && old.probe === probe && old.fact === fact) return old;
  const sites = [];
  let stateName = '__lean_site';
  while (src.includes(stateName)) stateName += '_';
  let callbackName = '__lean_callbacks';
  while (src.includes(callbackName)) callbackName += '_';
  const sf = ts.createSourceFile(tsName, src, ts.ScriptTarget.Latest, true, tsName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const callbacks = [...topLevelFunctions(sf).values()].filter(u => u.form === 'callback');
  const callbackAt = new Map(callbacks.filter(u => !u.enclosingUnit).map(u => [u.fn.pos, u.name]));
  // Capture an argument at its evaluation point, returning that very function. The callee, receiver, other arguments
  // and their evaluation order are unchanged. The one inventory supplies the name, before other transforms add marks.
  const callbackMarks = context => {
    const f = context.factory;
    const visit = n => {
      const value = ts.visitEachChild(n, visit, context);
      return callbackAt.has(n.pos) && (ts.isArrowFunction(n) || ts.isFunctionExpression(n))
        ? f.createCallExpression(f.createPropertyAccessExpression(f.createIdentifier(callbackName), 'capture'), undefined, [f.createStringLiteral(callbackAt.get(n.pos)), value]) : value;
    };
    return tree => ts.visitNode(tree, visit);
  };
  // The module unit (common.mjs MODULE_UNIT): each statement the module's evaluation runs is entered by a mark,
  // `state.enter && state.enter(file, index, bindings)`, a no-op unless the module unit is observed (runModuleUnit). The
  // marks come first, so `index` is the statement's place in the file's own statements. `bindings` is a hoisted function
  // of the file's scope that reads every module binding the module's own code holds, each by a getter of its own (one in
  // its temporal dead zone throws, and is read as uninitialized).
  let bindingsName = '__lean_module_bindings';
  while (src.includes(bindingsName)) bindingsName += '_';
  const moduleSts = moduleStatements(sf), moduleAt = new Map(moduleSts.map((m) => [m.index, m]));
  const moduleMarks = context => {
    const f = context.factory;
    return tree => {
      if (!ts.isSourceFile(tree)) return tree;
      const enter = (i) => f.createExpressionStatement(f.createLogicalAnd(f.createPropertyAccessExpression(f.createIdentifier(stateName), 'enter'),
        f.createCallExpression(f.createPropertyAccessExpression(f.createIdentifier(stateName), 'enter'), undefined, [f.createStringLiteral(abs), f.createNumericLiteral(i), f.createIdentifier(bindingsName)])));
      return f.updateSourceFile(tree, tree.statements.flatMap((st, i) => (moduleAt.has(i) ? [enter(i), st] : [st])));
    };
  };
  const bound = [...new Set(moduleSts.flatMap((m) => m.declares))];
  const bindingsShim = `\nfunction ${bindingsName}() { return { ${bound.map((n) => `${JSON.stringify(n)}: function () { return ${n}; }`).join(', ')} }; }\n`;
  const emit = (before) => ts.transpileModule(src, { compilerOptions: { ...COMPILE, useDefineForClassFields: define }, fileName: tsName, transformers: { before } }).outputText;
  const original = emit([]); // a function's text key is its own text, never the loader's marks (whose positions move with the lines above)
  let globalName = '__lean_global';
  while (src.includes(globalName)) globalName += '_';
  const shadowed = shadowedIntrinsics(sf);
  const marked = intrinsicPrologue(emit([moduleMarks, callbackMarks, statementMarks(ts, abs, sites, stateName), leanMarks(abs), ...(probe?.table ? [branchMarks(probe.table, abs, stateName, probe.reach)] : []), ...(probe?.values?.length ? [valueMarks(probe.values, abs, stateName)] : []), ...(fact ? [factMarks(stateName)] : [])]), shadowed, globalName);
  const functions = (text) => {
    const sf = ts.createSourceFile(abs, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), out = [];
    const walk = (n) => { if ((ts.isFunctionLike(n) && n.body) || ts.isClassDeclaration(n) || ts.isClassExpression(n)) out.push(n.getText(sf)); ts.forEachChild(n, walk); };
    walk(sf); return out;
  };
  const a = functions(original), b = functions(marked);
  if (a.length !== b.length) throw new Error('statement markers changed the function count');
  b.forEach((text, i) => rememberFunctionSource(text, a[i]));
  const compiled = { src, define, probe, fact, sites, stateName, callbackName, globalName, callbacks: callbacks.map(u => ({ name: u.name, inBody: !!u.enclosingUnit })), js: marked + unitShim(src, tsName, shadowed.has('Object') ? `${globalName}.Object` : 'Object') + bindingsShim, early: () => earlyUnitShim(src, tsName, shadowed.has('Object') ? `${globalName}.Object` : 'Object') };
  siteCompiles.set(abs, compiled);
  return compiled;
}

// The emit's own code before the file's first statement (the "use strict" directive, TypeScript's helpers `var __x =
// (this && this.__x) || ...`, `Object.defineProperty(exports, "__esModule", ...)`, `exports.a = void 0`) reads the
// intrinsics of the global object by name. A file that binds such a name at module scope (node's own lib:
// `const { Object, ... } = primordials`) shadows it, so the emit's first line read the file's `Object` in its temporal
// dead zone and the module never loaded. Each such read of the prologue reads the global object instead (the wrapper's
// parameter `globalName`, the sandbox's global), the value an unshadowed name has; the file's own code is unchanged.
let intrinsicNames = null;
const intrinsics = () => (intrinsicNames ??= new Set(Object.getOwnPropertyNames(vm.runInNewContext('this'))));
function shadowedIntrinsics(sf) {
  const out = new Set();
  const bind = (n) => { if (!n) return; if (ts.isIdentifier(n)) { if (intrinsics().has(n.text)) out.add(n.text); } else for (const e of n.elements ?? []) if (!ts.isOmittedExpression(e)) bind(e.name); };
  for (const st of sf.statements) {
    if (ts.isVariableStatement(st)) st.declarationList.declarations.forEach((d) => bind(d.name));
    else if (ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isEnumDeclaration(st) || ts.isImportEqualsDeclaration(st)) bind(st.name);
    else if (ts.isImportDeclaration(st) && st.importClause) { const c = st.importClause; bind(c.name); if (c.namedBindings) { if (ts.isNamespaceImport(c.namedBindings)) bind(c.namedBindings.name); else c.namedBindings.elements.forEach((e) => bind(e.name)); } }
  }
  return out;
}
function intrinsicPrologue(js, shadowed, globalName) {
  if (!shadowed.size || broken('emit-intrinsics')) return js;
  const sf = ts.createSourceFile('emit.js', js, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const isExports = (e) => ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'exports';
  // a declaration of the marks' temporaries (`var _a, _b;`, hoisted above the prologue by callee-trace.mjs factMarks and
  // the other marks) is the emit's own too: the scan passes it, else the helpers after it keep their bare `Object`
  const hoistedTemps = (st) => !broken('emit-intrinsics-hoisted') && ts.isVariableStatement(st) && st.declarationList.declarations.length > 0
    && st.declarationList.declarations.every((d) => ts.isIdentifier(d.name) && /^_(?:[a-z]+|\d+)$/.test(d.name.text) && !d.initializer);
  const emitted = (st) => hoistedTemps(st) || (ts.isExpressionStatement(st) && ts.isStringLiteral(st.expression))
    || (ts.isVariableStatement(st) && st.declarationList.declarations.length === 1 && /^__\w+$/.test(st.declarationList.declarations[0].name.getText(sf)) && /^\(this && this\.__\w+\) \|\|/.test(st.declarationList.declarations[0].initializer?.getText(sf) ?? ''))
    || (ts.isExpressionStatement(st) && /^Object\.defineProperty\(exports, "__esModule"/.test(st.expression.getText(sf)))
    || (ts.isExpressionStatement(st) && ts.isBinaryExpression(st.expression) && isExports(st.expression.left) && /= void 0$/.test(st.expression.getText(sf)));
  const at = [];
  const visit = (n) => {
    if (ts.isIdentifier(n) && shadowed.has(n.text) && !(n.parent && ((ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) || (ts.isPropertyAssignment(n.parent) && n.parent.name === n) || ((ts.isParameter(n.parent) || ts.isVariableDeclaration(n.parent) || ts.isFunctionLike(n.parent)) && n.parent.name === n)))) at.push(n);
    ts.forEachChild(n, visit);
  };
  for (const st of sf.statements) { if (!emitted(st)) break; visit(st); }
  let out = js;
  for (const n of at.reverse()) out = out.slice(0, n.getStart(sf)) + `${globalName}.${n.text}` + out.slice(n.end);
  return out;
}

// The names a file reads with no declaration of that name anywhere in it (a value position, never a member name, a key
// or a type). A unit whose call throws a ReferenceError for a name that both versions of its file read so (`__DEV__`,
// a bundler's define) meets a name its host sets: the run sets it as the environment's fake from then on and runs the
// input again (runPair). A name only one version reads stays its ReferenceError: a candidate that reads a name nothing
// declares (a typo), or one that stops reading it (the fix), is a difference
function freeReads(src, fileName) {
  const sf = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true, /x$/.test(fileName) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const declared = new Set(), read = new Set();
  const declares = (p) => ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isFunctionDeclaration(p) || ts.isFunctionExpression(p) || ts.isClassDeclaration(p) || ts.isClassExpression(p) || ts.isBindingElement(p) || ts.isImportClause(p) || ts.isImportSpecifier(p) || ts.isNamespaceImport(p) || ts.isImportEqualsDeclaration(p) || ts.isEnumDeclaration(p) || ts.isModuleDeclaration(p);
  const notValue = (n, p) => (ts.isPropertyAccessExpression(p) && p.name === n) || ((ts.isPropertyAssignment(p) || ts.isMethodDeclaration(p) || ts.isPropertyDeclaration(p) || ts.isGetAccessor(p) || ts.isSetAccessor(p) || ts.isEnumMember(p) || ts.isPropertySignature(p)) && p.name === n) || ts.isQualifiedName(p) || ts.isJsxAttribute(p) || ts.isLabeledStatement(p) || ts.isBreakOrContinueStatement(p) || ts.isExportSpecifier(p) || (ts.isBindingElement(p) && p.propertyName === n) || (ts.isImportSpecifier(p) && p.propertyName === n) || ts.isMetaProperty(p);
  const ambient = (d) => { for (let x = d; x && !ts.isSourceFile(x); x = x.parent) if ((ts.canHaveModifiers(x) && ts.getModifiers(x)?.some((m) => m.kind === ts.SyntaxKind.DeclareKeyword))) return true; return false; };
  const walk = (n) => {
    if (ts.isTypeNode(n) || ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) return;
    if (ts.isIdentifier(n) && n.parent) { if (declares(n.parent) && n.parent.name === n) { if (!ambient(n.parent)) declared.add(n.text); } else if (!notValue(n, n.parent)) read.add(n.text); } // `declare const __DEV__` says the host gives the name: no declaration
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return new Set([...read].filter((x) => !declared.has(x)));
}
export function sharedFreeReads(parentFile, candidateFile) {
  if (broken('free-global-call')) return new Set();
  const a = freeReads(fs.readFileSync(parentFile, 'utf8'), parentFile), b = freeReads(fs.readFileSync(candidateFile, 'utf8'), candidateFile);
  return new Set([...a].filter((x) => b.has(x) && isBridgeName(x)));
}

// every top-level function and class of the file, exported or not, reachable for the harness
function shimNames(src, abs) {
  const sf = ts.createSourceFile(abs, src, ts.ScriptTarget.ES2020, true, abs.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const names = [];
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name) names.push(st.name.text);
    else if (ts.isClassDeclaration(st) && st.name) names.push(st.name.text);
    else if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer) || (st.declarationList.flags & ts.NodeFlags.Const && literalMemberUnits(st).some((u) => u.binding === d.name.text)))) names.push(d.name.text); // a module const object literal holds literal units (design/exported-units.md)
  }
  // the module's own state: every binding a top-level variable statement declares (a destructured one too), read at the
  // moment the getter runs, so the observation sees what a call left in them (moduleState); an ambient declaration emits no binding
  const cells = [];
  const bound = (n) => { if (ts.isIdentifier(n)) cells.push(n.text); else for (const e of n.elements) if (!ts.isOmittedExpression(e)) bound(e.name); };
  for (const st of sf.statements) if (ts.isVariableStatement(st) && !(ts.getCombinedModifierFlags(st) & ts.ModifierFlags.Ambient)) for (const d of st.declarationList.declarations) bound(d.name);
  return { names, cells };
}
const stateShim = (cells, O) => `;try { ${O}.defineProperty(module.exports, '__lean_state', { enumerable: false, value: () => { const o = ${O}.create(null); ${cells.map((n) => `try { o[${JSON.stringify(n)}] = ${n}; } catch (e) {}`).join(' ')} return o; } }); } catch (e) {}`;
function unitShim(src, abs, O = 'Object') {
  const { names, cells } = shimNames(src, abs);
  return `\n;try { module.exports.__lean_units = { ${names.map((n) => `${JSON.stringify(n)}: (typeof ${n} === 'undefined' ? undefined : ${n})`).join(', ')} }; } catch (e) {}\n` + `\n${stateShim(cells, O)}\n`;
}
// the same surface for a module whose top level awaits (loadInner runs its body as an async function's): placed at the
// body's start on its first line, each unit a getter that reads its binding when the harness picks it, so a unit is
// reachable while the body waits at an await (a script whose main polls a server) and not only once every top-level
// await has settled; a binding still uninitialised (a class, a const below the pending await) reads as undefined. The
// end shim still runs when the body completes. LEAN_BREAK=await-units: the end shim's surface alone, as before (lane w9ab)
function earlyUnitShim(src, abs, O = 'Object') {
  const { names, cells } = shimNames(src, abs);
  const getters = names.map((n) => `${O}.defineProperty(u, ${JSON.stringify(n)}, { enumerable: true, configurable: true, get: () => { try { return typeof ${n} === 'undefined' ? undefined : ${n}; } catch (e) { return undefined; } } });`).join(' ');
  return `;try { const u = {}; ${getters} module.exports.__lean_units = u; } catch (e) {}${stateShim(cells, O)}`;
}

// a non-relative import the project's own `paths` map to a source file of this tree: common.mjs aliasTarget (lane paths-alias)

function resolveRelative(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const c of [base, base + '.ts', base + '.tsx', base + '.mts', base + '.js', base + '.mjs', path.join(base, 'index.ts'), path.join(base, 'index.tsx'), path.join(base, 'index.js')]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

// The JSX runtime of the sandbox: an element is a plain value {$el, props, children}, never a fake, so that two versions
// are compared on the tree they render, by React's rules: null, undefined and booleans render nothing; arrays are
// flattened; numbers render as text; the key is a prop. A component tag is named, not called: the tree holds its name.
function jsxChildren(c) {
  const out = [];
  const add = (x) => { if (x === null || x === undefined || typeof x === 'boolean') return; if (Array.isArray(x)) { x.forEach(add); return; } if (typeof x === 'number' || typeof x === 'bigint') { out.push(String(x)); return; } out.push(x); };
  add(c);
  return out;
}
const deepMode = { depth: 0 }; // --deep[=k]: same-package function components rendered k levels down (moonshot 7, design/ui-layers.md); 0, a component tag is its name and props (a tree of names)
function jsxValue(type, props, key, env = null) {
  const tag = typeof type === 'string' ? type : type && type.__isFake ? { $fake: type.__fakePath } : type && type.__leanProvider ? { $provider: contextName(type.__leanProvider) } : type && type.__leanConsumer ? { $consumer: contextName(type.__leanConsumer) } : type && type.__leanContext ? { $provider: contextName(type) } : typeof type === 'function' ? { $component: type.name || 'anonymous' } : type === JSX_FRAGMENT ? '' : String(type);
  const rest = {}; let children = [];
  for (const k of Object.keys(props ?? {})) { if (k === 'children') children = jsxChildren(props[k]); else rest[k] = props[k]; }
  if (key !== undefined && key !== null) rest.key = key;
  const el = { $el: tag, props: rest, children };
  // the element's type, never observed: a component is rendered later, top down, where its element is placed (React's
  // order), so a child takes its context from the providers above its place (deepExpand)
  if (type && typeof type !== 'string') Object.defineProperty(el, '$type', { value: type, enumerable: false });
  return el;
}
// a context of React's own (createContext in the hook runtime): named by its displayName, else by its creation order
const contextName = (ctx) => (typeof ctx.displayName === 'string' && ctx.displayName) || ctx.__leanContext;
// what one run rendered deep: the components rendered with their depth, the handles left as names with why, every
// context read (which frame read which context, from a provider element or from outside); the tree layer reads it
const deepLog = { rendered: new Map(), handles: new Map(), contexts: new Map() };
const logOnce = (m, k, v) => { if (!m.has(k)) m.set(k, v); };
const harnessStop = (e) => e instanceof BudgetError || e?.message === '__timeout__' || e instanceof Suspended || e instanceof RenderLoop || e instanceof CallTimeout;
// a useContext read: the value of the nearest provider element of that context above the frame in the rendered tree;
// with none, the outside value, one fake per context, the same at every frame and every render (hooks.json, useContext)
function readContext(env, ctx, frame) {
  const stack = env.contextStack ?? [];
  for (let j = stack.length - 1; j >= 0; j--) if (stack[j].ctx === ctx) { logOnce(deepLog.contexts, `${frame} ${contextName(ctx)} provider`, { frame, context: contextName(ctx), from: 'provider' }); return stack[j].value; }
  logOnce(deepLog.contexts, `${frame} ${contextName(ctx)} outside`, { frame, context: contextName(ctx), from: 'outside' });
  const outside = (env.outsideContexts ??= new Map()); if (!outside.has(ctx)) outside.set(ctx, env.fake(`react:context:${contextName(ctx)}`));
  return outside.get(ctx);
}
// deep render: the tree the unit returned, walked top down; a same-package function component (a real function the
// sandbox linked, never a fake) at a component depth below k is called with its props on its own hook frame, keyed by
// its place (its owner's frame, then its order among the owner's component tags, as React keys a fiber), and its output
// walked in turn; a provider element's value is the context of everything below it; a component at depth k, and a
// package component (a fake), stays a handle: its name and props
function deepExpand(env, v, level, owner, counter) {
  if (Array.isArray(v)) return v.map((x) => deepExpand(env, x, level, owner, counter));
  if (!v || typeof v !== 'object' || v.__isFake || !Object.hasOwn(v, '$el')) return v;
  const type = v.$type; const out = { ...v };
  if (type !== undefined) Object.defineProperty(out, '$type', { value: type, enumerable: false });
  const inPlace = () => { out.children = v.children.map((c) => deepExpand(env, c, level, owner, counter)); return out; };
  if (type && (type.__leanProvider || type.__leanContext)) {
    const stack = (env.contextStack ??= []); stack.push({ ctx: type.__leanProvider ?? type, value: v.props.value });
    try { return inPlace(); } finally { stack.pop(); }
  }
  if (type && type.__leanConsumer) { // a consumer's child is a function of the nearest value, called where it is placed
    const f = v.children[0]; if (typeof f !== 'function') return inPlace();
    let r; try { r = f(readContext(env, type.__leanConsumer, `${owner || 'unit'}:Consumer`)); } catch (e) { if (harnessStop(e)) throw e; out.rendered = { threw: render(e) }; return out; }
    out.rendered = deepExpand(env, r, level, owner, counter); return out;
  }
  if (typeof type === 'function' && !type.__isFake) {
    const name = type.name || 'anonymous';
    if (level >= deepMode.depth) { logOnce(deepLog.handles, name, `at depth ${level + 1}, below the stated depth ${deepMode.depth}: its name and props, never its output`); return out; } // its children are props: React renders them only where it places them
    const frameKey = `${owner}${owner ? '>' : ''}${name}#${counter.seq += 1}`;
    const frames = (env.childFrames ??= new Map()); if (!frames.has(frameKey)) frames.set(frameKey, { hookSlots: [], effectSlots: [] });
    const saved = env.react.__pushFrame(frames.get(frameKey)); const was = env.deepFrame; env.deepFrame = frameKey;
    let r;
    try { r = type({ ...v.props, ...(v.children.length ? { children: v.children.length === 1 ? v.children[0] : v.children } : {}) }); }
    catch (e) { if (harnessStop(e)) throw e; out.rendered = { threw: render(e) }; out.deep = frameKey; return out; }
    finally { env.deepFrame = was; env.react.__popFrame(saved); }
    logOnce(deepLog.rendered, name, level + 1);
    out.rendered = deepExpand(env, r, level + 1, frameKey, { seq: 0 }); out.deep = frameKey;
    return out;
  }
  if (type && type.__isFake) logOnce(deepLog.handles, type.__fakePath, 'outside the package: its name and props; its children are rendered in place, as if it passed them through, and it provides no context');
  return inPlace();
}
const cloneFrames = (m) => (m ? new Map([...m].map(([k, f]) => [k, { ...f, hookSlots: f.hookSlots.slice(), effectSlots: f.effectSlots.slice() }])) : undefined);
const JSX_FRAGMENT = '';
const jsxRuntimeFor = (env) => { const j = (type, props, key) => jsxValue(type, props, key, env); return { jsx: j, jsxs: j, jsxDEV: j, Fragment: JSX_FRAGMENT, __esModule: true }; };

class RenderLoop extends Error { constructor(why) { super(`render-loop: ${why}`); this.name = 'RenderLoop'; } } // React's own limits: 25 re-renders from a setter during render, then it throws; effects that keep setting state re-render without end
// one commit: render until a setter during render stops changing the state (React re-renders at once, up to 25 times)
async function commitRender(env, call, ms) {
  let v, renders = 0;
  do { env.stateDirty = false; env.react?.__beginRender?.(); renders++; const r = call(); v = (r && typeof r.then === 'function') ? await awaitUnit(env, r, ms) : r; if (deepMode.depth > 0 && env.react && isJsxValue(v)) { const tree = v; v = guardedCall(env, () => deepExpand(env, tree, 0, '', { seq: 0 }), ms); } if (env.stateDirty && renders >= 25) throw new RenderLoop('a setter during render re-rendered 25 times'); } while (env.stateDirty && env.react);
  return v;
}
// after a commit: effects run (settleEffects), and an effect that set the state re-renders and settles again, bounded
async function commitEffects(env, call, ms, v) {
  for (let rounds = 0; ; rounds++) {
    env.stateDirty = false; await settleEffects(env, ms);
    if (!env.stateDirty) return v;
    if (rounds >= 1000) throw new RenderLoop('effects re-rendered 1000 times');
    v = await commitRender(env, call, ms);
  }
}
class Suspended extends Error { constructor(why) { super(`suspense: ${why}`); this.name = 'Suspended'; } } // a render that suspends (a thrown thenable, use(promise)): React would show a fallback and retry; lean has no model of that schedule
// hooks belong to React's render protocol, rather than the generic external callback fake
function reactRuntime(env) {
  let slot = 0;
  // an effect is a slot too: its body and deps from the latest render, the deps it last ran with, its cleanup. At the
  // first render it joins the mount list (run once after the render); afterwards `settleEffects` re-runs it when a dep
  // changed by Object.is, cleanup first (React's rule)
  const effectSlot = (fn, deps, kind) => {
    const i = slot++; const key = `${kind}:${i}`; const es = (env.effectSlots ??= []); const prev = es[i];
    es[i] = { key, fn, deps, lastDeps: prev ? prev.lastDeps : undefined, cleanup: prev ? prev.cleanup : null, ran: prev ? prev.ran : false };
    if (!prev) { env.pending.push({ op: key, deps: render(deps) }); (env.reactEffects ??= []).push(fn); }
  };
  const runtime = {
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useState: (initial) => { // slots are retained on the environment, keyed by call order, as React keys them: a second render reads the same slot
      const i = slot++; const key = `react:state:${i}`;
      const slots = (env.hookSlots ??= []);
      if (!(i in slots)) { slots[i] = typeof initial === 'function' ? initial() : initial; env.record('hook', key, [render(slots[i])]); }
      const value = slots[i];
      const setter = (next) => { const v = typeof next === 'function' && !next.__isFake ? next(slots[i]) : next; // a fake is the value the world answered, never an updater: calling it would ask the world what the app never asked
      if (!Object.is(v, slots[i])) env.stateDirty = true; slots[i] = v; }; // no trace record: the slots after the handler are the observation (observeJsx), so the order of setter calls inside one handler, React's batching, is not
      ownFunction(setter, env); // a setter handed on is this side's function: its handle is numbered and it is driven like the unit's own (design/callbacks.md)
      (env.setterIndex ??= new WeakMap()).set(setter, i); // the slot a setter writes: the loader's __lean_s mark turns it into position -> slot on the current frame
      return [value, setter];
    },
    useEffect: (fn, deps) => effectSlot(fn, deps, 'react:effect'),
    use: (x) => { if (x && typeof x.then === 'function') throw new Suspended('use(promise)'); return x; }, // a suspended render: no model of the fallback and the retry; the run ends as ASK:suspense
    useRef: (initial) => { const i = slot++; const slots = (env.hookSlots ??= []); if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; }, // one box per slot, the same box on every render
    useId: () => { const i = slot++; const slots = (env.hookSlots ??= []); if (!(i in slots)) slots[i] = `:r${i}:`; return slots[i]; }, // a stable id per slot
    createContext: (defaultValue) => { const ctx = { __leanContext: `context#${env.contextCount = (env.contextCount ?? 0) + 1}`, displayName: undefined, _defaultValue: defaultValue }; ctx.Provider = { __leanProvider: ctx }; ctx.Consumer = { __leanConsumer: ctx }; return ctx; }, // React's own context: a provider element of it gives its value to everything rendered below it; the default is never read, since the nearest provider of a unit's root is outside the unit
    useContext: (ctx) => { const i = slot++; const slots = (env.hookSlots ??= []); if (ctx && ctx.__leanContext) { env.record('get', `react:context:${i}`); slots[i] = readContext(env, ctx, env.deepFrame ?? 'unit'); return slots[i]; } if (!(i in slots)) slots[i] = env.fake(`react:context:${ctx && ctx.__fakePath ? ctx.__fakePath : ctx && ctx.displayName ? ctx.displayName : 'anonymous'}`); env.record('get', `react:context:${i}`); return slots[i]; }, // the provided value is outside the unit: one fake per context, the same on every render
    useReducer: (reducer, initialArg, init) => { const i = slot++; const key = `react:state:${i}`; const slots = (env.hookSlots ??= []); if (!(i in slots)) { slots[i] = init ? init(initialArg) : initialArg; env.record('hook', key, [render(slots[i])]); } const dispatch = ownFunction((action) => { const v = reducer(slots[i], action); if (!Object.is(v, slots[i])) env.stateDirty = true; slots[i] = v; }, env); return [slots[i], dispatch]; },
    useLayoutEffect: (fn, deps) => effectSlot(fn, deps, 'react:layout-effect'), // as useEffect: after the render, in registration order (layout effects run first in React; one component, one order)
  };
  runtime.__beginRender = () => { slot = 0; env.deepSeq = 0; }; // a render starts at slot 0 (React's call-order keying); the deep children restart their order too
  runtime.__pushFrame = (frame) => { const saved = { slot, hookSlots: env.hookSlots, effectSlots: env.effectSlots, hookFrame: env.hookFrame }; slot = 0; env.hookSlots = frame.hookSlots; env.effectSlots = frame.effectSlots; env.hookFrame = frame; return saved; }; // a child's own hook frame (its own position -> slot map too)
  runtime.__popFrame = (saved) => { slot = saved.slot; env.hookSlots = saved.hookSlots; env.effectSlots = saved.effectSlots; env.hookFrame = saved.hookFrame; };
  const proxy = new Proxy(runtime, { get(t, p) { if (p === '__esModule') return true; if (p === 'default') return proxy; return p in t ? t[p] : env.module('react')[p]; } });
  env.react = runtime;
  return proxy;
}
// a rendered tree, observed to its last element: render's depth bound (six object levels) restarts at every element, so
// an element is never cut because of where it sits; a value inside a prop keeps the bound
const isJsxValue = (v) => (Array.isArray(v) ? v.some(isJsxValue) : !!v && typeof v === 'object' && !v.__isFake && Object.hasOwn(v, '$el'));
// the layer a front-end verdict names (research 18, 19: every verdict names its layer and its admitted set)
export const FRONT_END_OBSERVATION = Object.freeze({ layer: 'element tree', renders: 'one', handlers: 'each invoked once on a fake event, its result and requests recorded', effects: 'run once after the render, in registration order; cleanups recorded as pending', schedule: 'synchronous; microtasks drained after the call; timers recorded as pending, never fired' });
// handlers are observed after render and registered effects, in tree order, on a bounded event input
async function observeJsx(v, env) {
  if (Array.isArray(v)) { const items = []; for (const x of v) items.push(await observeJsx(x, env)); return items; }
  if (!v || typeof v !== 'object' || v.__isFake || !Object.hasOwn(v, '$el')) return v;
  const props = { ...v.props };
  for (const k of Object.keys(props)) if (/^on[A-Z]/.test(k) && typeof props[k] === 'function') {
    try { const returned = render(await props[k](env.fake(`react:event:${k}`))); props[k] = { $handler: { returned, slots: render(env.hookSlots ?? []) } }; } // the state the handler leaves, whatever the order of its setter calls
    catch (e) { if (e instanceof BudgetError) throw e; props[k] = { $handler: { threw: render(e), slots: render(env.hookSlots ?? []) } }; }
  }
  const children = [];
  for (const c of v.children) children.push(await observeJsx(c, env));
  const out = { ...v, props, children };
  if (Object.hasOwn(v, 'rendered')) out.rendered = await observeJsx(v.rendered, env); // the deep child's own tree, its handlers invoked like the parent's
  return out;
}

// the breadcrumb: the phase the harness is in, the input, and the file being loaded, so that a run whose event loop
// drains before a verdict names what was pending
export const crumb = { phase: 'start', input: null, loading: null, side: null, timedOut: 0, contention: 1 }; // contention: this unit's measured CPU slowdown against the suite's idle-core baseline (cpuContention) // timedOut: calls that hit their own --ms bound so far (the unit bound admits each one its budget)
// a listener of the breadcrumb (worker.mjs sends each step to the process that holds the bound, so a killed run names where it was)
let crumbListener = null;
export const onCrumb = (f) => { crumbListener = f; };
const tellCrumb = () => { if (crumbListener) crumbListener({ phase: crumb.phase, input: crumb.input, side: crumb.side, loading: crumb.loading, timedOut: crumb.timedOut, contention: crumb.contention }); };
const callTimedOut = () => { crumb.timedOut++; tellCrumb(); }; // a call that hit its own bound: paid for by that bound, reported to the process that holds the unit's
// the unit's CPU slowdown is sampled at its start and at every input (a short spin, about 10 ms): a thread moves between
// cores of different speed and shares them, so one sample at the start is not the unit's rate; the running mean is
const rateSamples = [];
const sampleContention = () => { const base = Number(process.env.LEAN_CPU_BASELINE); if (!(base > 0)) return; rateSamples.push(cpuRateNsPerIter(2_000_000, 3)); const mean = rateSamples.reduce((a, b) => a + b, 0) / rateSamples.length; crumb.contention = Math.min(CONTENTION_CAP, Math.max(1, mean / base)); loadFactor = crumb.contention; }; // the measured slowdown is also the wall allowance of every in-process watchdog: one model of this core's speed, not a run-queue estimate beside it
const step = (phase, input = null) => { crumb.phase = phase; crumb.input = input; crumb.side = null; if (input !== null) sampleContention(); tellCrumb(); };
export const crumbText = () => `pending: ${crumb.phase}${crumb.input !== null ? ` (input ${crumb.input})` : ''}${crumb.loading ? `, loading ${crumb.loading}` : ''}${crumb.escaped ? `; an error escaped the harness: ${crumb.escaped}` : ''}`;
// a run never ends without a verdict: when the event loop drains while the verdict is still owed (a promise nobody
// will settle, no timer or handle left), the run reports ASK naming what was pending, writes it to --out, and exits 2
let guarded = false; // a caller armed the guard: a run drained in the child drains it too (runPair), so its guard answers as before
export function verdictGuard(out, shape = (r) => r) {
  let owed = true; guarded = true;
  const drained = () => {
    if (!owed) return; owed = false;
    const res = shape({ verdict: 'ASK', reason: `harness: the run ended before a verdict; ${crumbText()}` });
    const text = JSON.stringify(res, null, 1);
    let wrote = null; if (out) { try { fs.writeFileSync(out, text); wrote = out; } catch (e) { console.log(`--out not written: ${e.message}`); } } // the verdict is printed even when --out cannot be written
    console.log(wrote ? `${res.verdict}: ${res.reason} -> ${wrote}` : text);
    process.exit(2);
  };
  process.on('beforeExit', drained);
  process.on('uncaughtException', (e) => { crumb.escaped = String(e && e.message || e).slice(0, 300); }); // the late-error hooks keep the process alive past an escaped error; the guard names it
  return { settle() { owed = false; process.off('beforeExit', drained); } };
}

// ----- the decorator contract table (translate/decorators.json): lane B applies each listed row in its fakes -----
// A guard row registers its guards on the class or on the handler, and a call of the handler runs them first (class
// guards, then method guards): a guard that answers false throws ForbiddenException before the body. A pipe row
// registers its pipes on the parameter, and the call passes the argument through each. A metadata row writes a cell of
// the sandbox's metadata store (keyed by the target object, then the key), which the sandbox's Reflect.getMetadata and
// Nest's Reflector read. Every other decorator keeps the rule of the loader below: one of the package's own code is
// applied as TypeScript's __decorate applies it; a fake one is run for its reads, its result never replaces the class or
// the member.
class ForbiddenException extends Error { constructor() { super('Forbidden resource'); this.name = 'ForbiddenException'; } }
const decoStore = (env) => (env.decorations ??= { guards: new Map(), pipes: new Map(), cells: new Map(), written: [] });
const seededUnit = (env, tag) => crypto.createHash('sha256').update(`${env.seed}:${tag}`).digest().readUInt32BE(0) / 4294967296; // the same on both sides for the same question, never drawn from the shared stream
// a stable name for a guard or a pipe: a same-file class by its name, a fake by its path with the arguments of the
// call or construction that made it (never its call counter, which another decorator of the file would shift)
function decoLabel(env, x) {
  if (x && x.__isFake) {
    const path = x.__fakePath, m = /^(new )?(.*?)(?:\(\))?#(\d+)$/.exec(path);
    if (!m) return path;
    let seen = 0; const op = m[1] ? 'new' : 'call';
    for (const r of env.trace) if (r.op === op && r.path === m[2] && ++seen === Number(m[3])) return `${m[1] ?? ''}${m[2]}(${JSON.stringify(r.args)})`;
    return `${m[1] ?? ''}${m[2]}`;
  }
  if (typeof x === 'function') return `class:${x.name || 'anonymous'}`;
  if (x && typeof x === 'object') return `instance:${x.constructor?.name ?? 'Object'}`;
  return String(x);
}
const metaCell = (env, target, prop) => { const s = decoStore(env); let byProp = s.cells.get(target); if (!byProp) s.cells.set(target, byProp = new Map()); const pk = prop === undefined ? '\u0000' : prop; let m = byProp.get(pk); if (!m) byProp.set(pk, m = new Map()); return m; };
function defineMeta(env, key, value, target, prop) { metaCell(env, target, prop).set(key, value); decoStore(env).written.push({ key, target, prop }); }
// a read walks the target's prototype chain (reflect-metadata's OrdinaryGetMetadata); a fake target stands for a
// handler the framework hands in: it reads one of the cells written with that key, in write order, or none, chosen by
// the seed and the fake's path, the same choice on both sides
function getMeta(env, key, target, prop) {
  if (target && target.__isFake) {
    const ws = decoStore(env).written.filter((w) => w.key === key && w.prop === prop && !(w.target && w.target.__isFake));
    const i = Math.floor(seededUnit(env, `metadata:${target.__fakePath}:${String(key)}`) * (ws.length + 1));
    return i < ws.length ? metaCell(env, ws[i].target, prop).get(key) : undefined;
  }
  for (let t = target; t !== null && t !== undefined && (typeof t === 'object' || typeof t === 'function'); t = Object.getPrototypeOf(t)) {
    const byProp = decoStore(env).cells.get(t); const m = byProp && byProp.get(prop === undefined ? '\u0000' : prop);
    if (m && m.has(key)) return m.get(key);
  }
  return undefined;
}
function metadataReflect(env) {
  const R = {}; for (const k of Reflect.ownKeys(Reflect)) if (typeof Reflect[k] === 'function') R[k] = Reflect[k];
  R.getMetadata = (key, target, prop) => getMeta(env, key, target, prop);
  R.defineMetadata = (key, value, target, prop) => { env.record('call', 'Reflect.defineMetadata', [render(key), render(value), target && target.__isFake ? target.__fakePath : decoLabel(env, target)]); defineMeta(env, key, value, target, prop); };
  return R;
}
// Nest's Reflector over the same store (@nestjs/core 11: get, getAll, getAllAndOverride, getAllAndMerge)
function metadataReflector(env) {
  const get = (key, target) => getMeta(env, key, target);
  const getAll = (key, targets) => (targets ?? []).map((t) => get(key, t));
  const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
  return {
    get, getAll,
    getAllAndOverride: (key, targets) => { for (const t of targets ?? []) { const v = get(key, t); if (v !== undefined) return v; } return undefined; },
    getAllAndMerge: (key, targets) => { const vs = getAll(key, targets).filter((v) => v !== undefined); if (!vs.length) return vs; if (vs.length === 1) return isObj(vs[0]) ? vs[0] : [vs[0]]; return vs.reduce((a, b) => (Array.isArray(a) ? a.concat(b) : isObj(a) && isObj(b) ? { ...a, ...b } : [a, b])); },
  };
}
// the module answer for a package of the table: its guard, pipe and SetMetadata exports apply their rows; every other
// export is the package's fake
function decoratedModule(env, spec) {
  const rows = [...decoratorTable().decorators, ...decoratorTable().metadata].filter((r) => r.package === spec && (r.kind === 'guard' || r.kind === 'pipe' || r.export === 'SetMetadata'));
  if (!rows.length) return null;
  const cache = (env.decoModules ??= new Map()); if (cache.has(spec)) return cache.get(spec);
  const over = {};
  for (const r of rows) {
    if (r.kind === 'guard') over[r.export] = (...guards) => { const labels = guards.map((g) => decoLabel(env, g)); return function (target, key) { const s = decoStore(env); const k = key === undefined ? '' : String(key); let m = s.guards.get(target); if (!m) s.guards.set(target, m = new Map()); m.set(k, [...(m.get(k) ?? []), ...guards.map((g, i) => ({ guard: g, label: labels[i] }))]); }; };
    if (r.kind === 'pipe') over[r.export] = (...args) => { const pipes = typeof args[0] === 'string' ? args.slice(1) : args; const labels = pipes.map((p) => decoLabel(env, p)); return function (target, key, index) { if (!pipes.length || typeof index !== 'number') return; const s = decoStore(env); let m = s.pipes.get(target); if (!m) s.pipes.set(target, m = new Map()); const k = String(key); let byIndex = m.get(k); if (!byIndex) m.set(k, byIndex = new Map()); byIndex.set(index, [...(byIndex.get(index) ?? []), ...pipes.map((p, i) => ({ pipe: p, label: labels[i] }))]); }; };
    if (r.export === 'SetMetadata') over[r.export] = (key, value) => function (target, k, desc) { defineMeta(env, key, value, desc && desc.value !== undefined ? desc.value : target); };
  }
  const base = env.module(spec);
  const mod = new Proxy(base, { get: (t, p) => (typeof p === 'string' && Object.hasOwn(over, p) ? over[p] : t[p]) });
  cache.set(spec, mod);
  return mod;
}
// a guard's verdict: a same-file guard class runs its own canActivate on a fake receiver and a fake context; any other
// guard is a seeded answer, true about seven times in ten, the same on both sides for the same guard and input
function guardVerdict(env, g) {
  const G = g.guard;
  if (typeof G === 'function' && !G.__isFake && G.prototype && typeof G.prototype.canActivate === 'function') return G.prototype.canActivate.call(Object.create(G.prototype), env.fake(`guard:${g.label}:context`));
  if (G && typeof G === 'object' && !G.__isFake && typeof G.canActivate === 'function') return G.canActivate(env.fake(`guard:${g.label}:context`));
  env.record('call', `guard:${g.label}.canActivate`, []);
  return seededUnit(env, `guard:${g.label}`) < 0.7;
}
// a pipe's result: a same-file pipe runs its own transform; any other pipe answers a value of the parameter's declared
// type, seeded by the pipe and the argument it received
function pipeResult(env, p, raw, pspec) {
  const P = p.pipe;
  if (typeof P === 'function' && !P.__isFake && P.prototype && typeof P.prototype.transform === 'function') return P.prototype.transform.call(Object.create(P.prototype), raw, env.fake(`pipe:${p.label}:metadata`));
  if (P && typeof P === 'object' && !P.__isFake && typeof P.transform === 'function') return P.transform(raw, env.fake(`pipe:${p.label}:metadata`));
  env.record('call', `pipe:${p.label}.transform`, [render(raw)]);
  const path = `pipe:${p.label}(${JSON.stringify(render(raw))})`;
  return pspec ? env.typed(path, pspec) : env.answer(path);
}
// a call of a handler through its listed guards and pipes (Nest's order: guards, then pipes, then the handler)
function routeCall(env, Cls, member, args, spec, run) {
  const s = env.decorations; if (!s) return run(args);
  const guards = [...(s.guards.get(Cls)?.get('') ?? []), ...(s.guards.get(Cls.prototype)?.get(member) ?? [])];
  const pipes = s.pipes.get(Cls.prototype)?.get(member);
  if (!guards.length && !pipes) return run(args);
  const piped = () => { const a = [...args]; if (pipes) for (const [i, list] of pipes) for (const p of list) a[i] = pipeResult(env, p, a[i], spec.params[i]?.spec ?? null); return run(a); };
  const step = (i) => {
    if (i >= guards.length) return piped();
    const v = guardVerdict(env, guards[i]);
    const decide = (ok) => { if (!ok) { env.record('guard-deny', guards[i].label, []); throw new ForbiddenException(); } return step(i + 1); };
    return v && typeof v.then === 'function' ? v.then(decide) : decide(v);
  };
  return step(0);
}

// one sandbox per side: a module cache, the fakes, the frozen globals
export function sandbox(env, root) {
  captureEnvironment(env);
  const cache = new Map();
  env.siteState = { current: null, completed: null, fault: null, files: Object.create(null), hits: null };
  env.siteState.f = factHook(env); // a marked call site (callee-trace.mjs): recorded when env.factLog is set, else the call as written
  env.siteState.b = (file, k, v) => { const hits = env.siteState.hits, p = hits && probes?.get(file); if (p) { const key = p.keys.b[k]; hits.add(outcomeOf(p.table[k], v) === 'T' ? key.T : key.F); if (key.s) hits.add(key.s); } return v; }; // a branch probe (search.mjs): the outcome is recorded while the unit runs, the value goes back unchanged; a branch that is a changed statement's point also records that statement
  env.siteState.r = (file, id, v) => { const hits = env.siteState.hits, p = hits && probes?.get(file); if (p) hits.add(p.keys.r[id]); return v; }; // a changed statement's probe (search.mjs reachTable): its point was evaluated
  env.siteState.v = (file, k, v) => { if (env.siteState.values && probes?.has(file)) { env.siteState.values.push(seenValue(v)); env.siteState.valueAt.push(env.answered.length); } return v; }; // a value probe of a changed line (search.mjs valueMarks): its value, by a reading that runs no code of the program, the value goes back unchanged
  const react = reactRuntime(env);
  const epoch = CLOCK_EPOCH;
  const dateNow = (...args) => epoch + env.clock('Date.now', args);
  const FakeDate = new Proxy(Date, {
    construct(t, args, newTarget) { return Reflect.construct(t, args.length ? args : [epoch + env.clock('Date', [], 'new')], newTarget); },
    get(t, p) { return p === 'now' ? dateNow : Reflect.get(t, p); },
    apply(t, receiver, args) { return new Date(epoch + env.clock('Date', args)).toString(); },
  });
  const hrtime = (...args) => {
    const ns = BigInt(env.clock('process.hrtime', args)) * 1000000n;
    const previous = args[0];
    const delta = previous === undefined ? ns : ns - (BigInt(previous[0]) * 1000000000n + BigInt(previous[1]));
    const nanos = (delta % 1000000000n + 1000000000n) % 1000000000n;
    return [Number((delta - nanos) / 1000000000n), Number(nanos)];
  };
  hrtime.bigint = (...args) => BigInt(env.clock('process.hrtime.bigint', args)) * 1000000n;
  const fakeProcess = new Proxy(env.module('process'), { get(t, p) { return p === 'hrtime' ? hrtime : Reflect.get(t, p); } });
  const performanceNow = (...args) => env.clock('performance.now', args) / 1000;
  const fakePerformance = new Proxy(env.module('performance'), { get(t, p) { return p === 'now' ? performanceNow : Reflect.get(t, p); } });
  const g = {
    console: env.module('console'), process: fakeProcess, fetch: env.fake('global:fetch'), Date: FakeDate,
    setTimeout: (fn, ms, ...a) => env.arm('timeout', fn, ms, a), setInterval: (fn, ms, ...a) => env.arm('interval', fn, ms, a), setImmediate: (fn, ...a) => env.arm('immediate', fn, 0, a),
    requestAnimationFrame: (fn) => env.arm('frame', fn, 16), requestIdleCallback: (fn) => env.arm('idle', fn, 1),
    clearTimeout: (id) => env.clearTimer(id, 'clearTimeout'), clearInterval: (id) => env.clearTimer(id, 'clearInterval'), clearImmediate: (id) => env.clearTimer(id, 'clearImmediate'), cancelAnimationFrame: (id) => env.clearTimer(id, 'cancelAnimationFrame'), cancelIdleCallback: (id) => env.clearTimer(id, 'cancelIdleCallback'), queueMicrotask: (fn) => Promise.resolve().then(fn),
    Math: Object.assign(Object.create(Math), { random: () => env.rng() }),
    Buffer, JSON, Object, Array, String, Number, Boolean, Map, Set, WeakMap, WeakSet, Symbol, Promise, RegExp,
    Error: programConstructor(Error), TypeError: programConstructor(TypeError), RangeError: programConstructor(RangeError), SyntaxError: programConstructor(SyntaxError), ReferenceError: programConstructor(ReferenceError), EvalError: programConstructor(EvalError), URIError: programConstructor(URIError), AggregateError: programConstructor(AggregateError), // an error the unit makes is program-built (fake.mjs programConstructor); one the engine raises is observed by its class alone
    parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, encodeURI, decodeURI, URL, URLSearchParams, TextEncoder, TextDecoder, BigInt, Reflect: metadataReflect(env), Proxy, structuredClone,
    globalThis: null, crypto: env.module('crypto'), performance: fakePerformance, React: react,
    ...behaviouralGlobals(env), // the behavioural fakes' globals (exec/fakes/): fetch as a table of requests, Request, Response, Headers, AbortController on the virtual clock, localStorage as a record; none under LEAN_FAKES=recording
  };
  { const named = bridgeGlobal(env, g); g.globalThis = named; g.global = named; g.window = named; } // the global object by name: a member the host app sets and the sandbox does not (a preload bridge) is the bridge fake (exec/bridge.mjs, design/bridge-fake.md)
  // the loader's marks (leanMarks): a handler attribute's function value and a useState pair, each with its source position
  g.__lean_h = (pos, fn, file) => { if (typeof fn === 'function') (env.handlerPos ??= new WeakMap()).set(fn, { pos, file }); return fn; };
  g.__lean_s = (pos, pair, file) => { const i = Array.isArray(pair) && typeof pair[1] === 'function' ? env.setterIndex?.get(pair[1]) : undefined; if (i !== undefined) { const holder = env.hookFrame ?? env; (holder.statePos ??= new Map()).set(`${file}:${pos}`, i); } return pair; };
  const ctx = vm.createContext(g);
  env.realm = vm.runInContext('({ Array: [].constructor, Object: ({}).constructor })', ctx);
  bindRealm(vm.runInContext('Function.prototype', ctx), env); // a function this side's code made is this side's: its handle is numbered on this environment (fake.mjs escapeHandle) // the context's own intrinsics: an array literal in the unit uses them, not the host's Array; patched while a recording window is open
  env.ctx = ctx; // a unit call runs under this context's watchdog (guardedCall): a synchronous loop that never ends is a timeout, never a hang or a native crash
  // a module is inside the package root only when its real path is the root's real path or starts with it and a separator:
  // a sibling folder that shares the root's name prefix, a link inside the root to a file outside it and a .json outside
  // are outside; no root given, nothing is outside
  const realRoot = root ? (() => { try { return fs.realpathSync(root); } catch { return path.resolve(root); } })() : null;
  const insideRoot = (file) => {
    if (!realRoot) return true;
    let real; try { real = fs.realpathSync(file); } catch { return false; }
    return real === realRoot || real.startsWith(realRoot + path.sep);
  };
  // the files a failed load cached are dropped with it, so a later load of one runs it again
  const loadMark = () => ({ before: new Set(cache.keys()), seen: new Set(loadedFiles) });
  const dropSince = ({ before, seen }) => { for (const k of [...cache.keys()]) if (!before.has(k)) { cache.delete(k); delete env.siteState.files[k]; if (!seen.has(k)) loadedFiles.delete(k); } };
  // A name the module's evaluation reads that no scope declares and the sandbox does not give (a bundler's define,
  // `__DEV__`; a host's own global, node's `primordials`) throws a ReferenceError, and the module never loads. Wherever
  // the module loads, its host set the name, so the name is the environment's, as an import of a package the tree does
  // not hold is: the fake `global:<name>`, its reads recorded, set on the global object on every input, and the module is
  // evaluated again from its start. A name a default lib declares (a host name the sandbox leaves absent,
  // exec/bridge.mjs isBridgeName) or the bridge's deny list holds stays the failure. Each pass sets one more name
  for (const name of env.freeGlobals ?? []) g[name] = env.fake(`global:${name}`); // the names this run found to be the environment's (sharedFreeReads): set before the module loads
  const loadDefining = (abs) => {
    for (;;) {
      const mark = loadMark();
      try { return loadInner(abs); }
      catch (e) {
        const m = e && e.name === 'ReferenceError' && /^([A-Za-z_$][\w$]*) is not defined$/.exec(String(e.message));
        if (!m || m[1] in g || !isBridgeName(m[1]) || broken('free-global')) throw e;
        dropSince(mark);
        g[m[1]] = env.fake(`global:${m[1]}`);
        (env.freeGlobals ??= new Set()).add(m[1]);
      }
    }
  };
  function load(file) {
    const abs = path.resolve(file);
    if (cache.has(abs)) return cache.get(abs).exports;
    const wasLoading = env.loading, wasCrumb = crumb.loading; env.loading = true; crumb.loading = abs;
    // the unit's module is the first one loaded: a unique symbol is drawn as the constant it exports (gen.mjs)
    try { const out = loadDefining(abs); if (!wasLoading && env.exports === undefined) env.exports = out; return out; } finally { env.loading = wasLoading; crumb.loading = wasCrumb; if (!wasLoading) resetEscapes(env); } // the module has loaded: the unit's functions are numbered from here (fake.mjs resetEscapes)
  }
  function loadInner(abs) {
    const src = fs.readFileSync(abs, 'utf8');
    const tsName = /\.(mjs|cjs|js)$/.test(abs) ? abs.replace(/\.(mjs|cjs|js)$/, '.ts') : abs; // a script file is read as TypeScript so its imports become requires
    const src2 = src.replace(/\bimport\.meta\.url\b/g, JSON.stringify('file://' + abs)).replace(/\bimport\.meta\b/g, '({})'); // a script's import.meta under CommonJS
    const compiled = compileWithSites(src2, tsName, abs);
    if (env.classFieldsDefine === undefined) env.classFieldsDefine = compiled.define; // the unit's file loads first: its emit mode is the record's
    env.siteState.files[abs] = compiled.sites;
    let js = compiled.js;
    // a decorator is applied as TypeScript's emitted __decorate applies it (last first; a result replaces the class or the
    // member's descriptor, which is defined on the target), so a method of an instance made by `new`, a static method
    // and a getter run what the decorator installed. A fake decorator (an outside package's, not the package's own code)
    // is run for its reads and calls, but its result never replaces: what it would install is unknown, and the declared
    // code stays the code under test (the decorator table's rows apply in decoratedModule). Under env.declaredCode (the
    // model conformance step, design/model-conformance.md: a model is translated from the declared text, and a member a
    // decorator of the package returns is read as its declared text, design/heap-stage5.md 20b) no result replaces either,
    // so Node runs the code the model was translated from
    js = js.replace(/var __decorate = \(this && this\.__decorate\) \|\| function \(decorators, target, key, desc\) \{[\s\S]*?\n\};/,
      'var __decorate = function (decorators, target, key, desc) { var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc; for (var i = decorators.length - 1; i >= 0; i--) { var d = decorators[i]; if (d) { var own = ' + (env.declaredCode ? 'false' : '!d.__isFake') + ', v; try { v = c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key); } catch (e) { if (!(e && e.__isFake)) throw e; v = undefined; } if (own && v && !v.__isFake) r = v; } } return c > 3 && r && Object.defineProperty(target, key, r), r; };');
    const mod = { exports: {} };
    cache.set(abs, mod);
    loadedFiles.add(abs);
    // a module of the package (a relative import, the project's own `paths` alias) whose top level cannot run in the
    // sandbox (a bundler's import.meta.env, a host global, a require.resolve, a build-time fork that throws until the
    // bundler replaces it, a file TypeScript cannot emit alone) is the environment's module, as every alias was before
    // aliases were loaded: the same fake on both sides, its reads recorded; the files its failed load cached are dropped
    // with it. True when it loads, its exports in `out.exports`
    const loadOrEnvironment = (spec, file, out) => {
      const mark = loadMark();
      try { out.exports = load(file); return true; }
      catch (e) {
        if (harnessStop(e)) throw e;
        dropSince(mark);
        (env.unloadable ??= new Map()).set(spec, { file: path.relative(root || path.dirname(file), file), failure: String(e && e.message).split('\n')[0].slice(0, 160) }); // the module lean could not load: a difference that passes only through it is no difference lean can show (unloadableOnly)
        return false;
      }
    };
    const req = (spec) => {
      const out = {};
      if (spec.startsWith('.') ) {
        if (/\.(css|scss|sass|less|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|md|txt|html|wasm)(\?.*)?$/i.test(spec)) return env.module(spec); // an asset, not code: a fake module
        const r = resolveRelative(abs, spec);
        if (r && /\.json$/i.test(r) && insideRoot(r)) { try { return JSON.parse(fs.readFileSync(r, 'utf8')); } catch { return env.module(spec); } } // a .json outside the root falls through to the fake below
        if (r && !/\.json$/i.test(r) && insideRoot(r)) {
          if (broken('relative-unloadable')) return load(r);
          if (loadOrEnvironment(spec, r, out)) return out.exports;
        }
        return env.module(spec);
      }
      if (spec === 'react') return react;
      if (spec === 'react/jsx-runtime' || spec === 'react/jsx-dev-runtime') return jsxRuntimeFor(env); // an element is a value tree, by React's rules for children
      const alias = aliasTarget(abs, spec); // the project's own `paths` alias to a file of this package is code, loaded like a relative import
      if (alias && insideRoot(alias) && loadOrEnvironment(spec, alias, out)) return out.exports;
      return decoratedModule(env, spec) ?? env.module(spec); // packages, builtins, aliases that leave the package or resolve to nothing the tree holds: the environment (a package of the decorator table answers its listed exports by their rows)
    };
    // CommonJS gives __filename and __dirname; a script that declares its own gets them under other names
    const declares = /\b(const|let|var)\s+(__filename|__dirname)\b/.test(js);
    let wrapper, awaits = false;
    const params = ['exports', 'require', 'module', declares ? '__lean_filename' : '__filename', declares ? '__lean_dirname' : '__dirname', compiled.stateName, compiled.callbackName, compiled.globalName];
    try { wrapper = vm.compileFunction(js, params, { parsingContext: ctx, filename: abs }); }
    catch (e) {
      // a module whose top level awaits (`if (isMain) await main()`, an ES module's top-level await, which the CommonJS
      // emit keeps as written): its body runs as an async function's, so what it defines before its first await (its
      // exports) is there when require returns, as an ES importer sees a module evaluated up to its first await; a later
      // rejection is the module's own, kept on it (module.lateError) and never thrown into the run (lane w9o;
      // LEAN_BREAK=module-await: the load fails as before)
      awaits = e?.name === 'SyntaxError' && /is only valid in async functions and the top level bodies of modules/.test(e.message) && !broken('module-await');
      if (!awaits) throw new Error(`${path.relative(root || path.dirname(abs), abs)}: ${e.message}`); // the file that failed to compile is named
      const body = js.replace(/^#!.*/, ''), prologue = /^\s*(?:(?:"use strict"|'use strict');?)?/.exec(body)[0]; // the early surface after the directive, which must stay the body's first statement
      const early = broken('await-units') ? '' : compiled.early();
      try { wrapper = vm.compileFunction(`return (async () => {${prologue}${early}${body.slice(prologue.length)}\n})();`, params, { parsingContext: ctx, filename: abs }); } // on the module's first line, so its lines keep their numbers; a hashbang is valid only at a file's start
      catch (e2) { throw new Error(`${path.relative(root || path.dirname(abs), abs)}: ${e2.message}`); }
    }
    const callbacks = {
      units: new Map(compiled.callbacks.map(u => [u.name, { inBody: u.inBody, instances: [] }])),
      capture(name, fn) { callbacks.units.get(name).instances.push(fn); return fn; },
    };
    const evaluated = wrapper.call(mod.exports, mod.exports, req, mod, abs, path.dirname(abs), env.siteState, callbacks, g); // g: the global object, which the emit's prologue reads an intrinsic the file shadows from (intrinsicPrologue)
    if (awaits && evaluated && typeof evaluated.then === 'function') { const paused = (env.pausedBodies ??= new Set()); paused.add(mod); evaluated.then(() => paused.delete(mod), (e) => { mod.lateError = e; paused.delete(mod); }); } // a body still waiting at an await is paused (dropLoadTimers)
    (env.callbackUnits ??= new Map()).set(mod.exports, callbacks);
    return mod.exports;
  }
  return { load, ctx, react, jsxRuntime: jsxRuntimeFor(env) };
}

export function pickUnit(exportsObj, spec, env) {
  const callback = env.callbackUnits?.get(exportsObj)?.units.get(spec.unit);
  if (callback) {
    if (callback.inBody) return null; // nested callbacks are covered by their enclosing unit before execution
    if (callback.instances.length !== 1) { env.callbackRefusal = callback.instances.length ? 'callback-multiple-instances' : 'callback-not-created'; return null; }
    const fn = callback.instances[0];
    return { call: drawn => fn(...argsFor(spec, drawn)), receiver: null };
  }
  const units = exportsObj.__lean_units ?? {};
  if (!spec.isMethod && !(spec.unit in units) && !(spec.unit in exportsObj) && spec.unit.includes('.')) {
    // a member of an exported or module-const object literal, <binding>.<key> (common.mjs literalMemberUnits): called on the
    // literal itself, so `this` is the literal (design/exported-units.md)
    const at = spec.unit.lastIndexOf('.'), binding = spec.unit.slice(0, at), key = spec.unit.slice(at + 1);
    const [root, ...rest] = binding.split('.'); // `exports` (module.exports = {...}), `exports.x` (exports.x = {...}), `default`, or a module-level const
    let holder = root === 'exports' ? exportsObj : root === 'default' ? exportsObj.default : (units[root] ?? exportsObj[root]);
    for (const k of rest) holder = holder && (typeof holder === 'object' || typeof holder === 'function') ? holder[k] : undefined;
    const m = holder && (typeof holder === 'object' || typeof holder === 'function') ? holder[key] : undefined;
    if (typeof m !== 'function') return null;
    return { call: (args) => m.apply(holder, args), receiver: null };
  }
  if (!spec.isMethod) {
    const f = units[spec.unit] ?? exportsObj[spec.unit];
    if (typeof f !== 'function') return null;
    return { call: (drawn) => { const args = argsFor(spec, drawn); return spec.thisParam ? f.call(args[0], ...args.slice(1)) : f(...args); }, receiver: null }; // a free function with a declared `this` parameter takes its receiver first
  }
  const Cls = units[spec.className] ?? exportsObj[spec.className];
  if (typeof Cls !== 'function') return null;
  if (spec.unit.split('.')[1] === 'constructor') {
    // the constructor unit: the instance it builds is both the receiver observed after the call and the value returned
    const holder = { inst: null };
    return { call: (args) => { holder.inst = Reflect.construct(Cls, argsFor(spec, args)); return holder.inst; }, receiver: { __own: () => (holder.inst ? { ...holder.inst } : {}) } };
  }
  const member = spec.member ?? spec.unit.split('.')[1];
  const descriptor = Object.getOwnPropertyDescriptor(spec.isStatic ? Cls : Cls.prototype, member);
  const method = descriptor?.value;
  if (typeof method !== 'function' && !spec.accessor && !spec.isStatic) return null;
  if (spec.isStatic && spec.accessor) return { call: (args) => spec.accessor === 'get' ? Reflect.get(Cls, member, Cls) : (Reflect.set(Cls, member, args[0], Cls), undefined), receiver: null };
  if (spec.isStatic) { const sm = Cls[member]; return typeof sm === 'function' ? { call: (args) => sm.apply(Cls, argsFor(spec, args)), receiver: null } : null; }
  if (spec.branded) {
    // a class holding a private name: the receiver is an instance its constructor made (a proxy holds no brand, spec.mjs
    // branded), made here, before the observation; a constructor taking arguments is not drawn yet: the unit asks
    if (spec.branded.required) { env.callbackRefusal = `private-brand: ${spec.className} holds a private name, so its receiver is an instance its constructor makes, and the constructor takes ${spec.branded.required} argument(s) lane B does not draw`; return null; }
    let inst; try { inst = Reflect.construct(Cls, []); } catch (e) { env.callbackRefusal = `private-brand: ${spec.className} holds a private name and its constructor threw: ${String(e && e.message).slice(0, 160)}`; return null; }
    const own = { __own: () => ({ ...inst }) };
    return { call: (args) => spec.accessor === 'get' ? inst[member] : spec.accessor === 'set' ? (inst[member] = args[0], undefined) : routeCall(env, Cls, member, args, spec, (a) => method.apply(inst, argsFor(spec, a))), receiver: own };
  }
  // the receiver: real prototype methods, every field a fake
  const base = Object.create(Cls.prototype);
  const self = new Proxy(base, {
    get(t, p) {
      if (p === '__isFake') return false;
      if (p === '__own') return () => ({ ...t }); // the fields this run assigned
      if (typeof p === 'symbol') return t[p];
      if (p in Cls.prototype) { const v = Reflect.get(Cls.prototype, p, self); return typeof v === 'function' ? v.bind(self) : v; }
      if (Object.prototype.hasOwnProperty.call(t, p)) return t[p]; // a field this run assigned: its value
      if ((spec.metadataReaders ?? []).includes(p)) { env.record('get', `this.${String(p)}`); return (env.reflector ??= metadataReflector(env)); } // a field declared as Nest's Reflector reads the sandbox's metadata store (decorator table)
      env.record('get', `this.${String(p)}`);
      return env.member('this', p, spec.receiver); // a field of the receiver: typed by the class (a service handle, a value of the field's type)
    },
    set(t, p, v) { const d = Object.getOwnPropertyDescriptor(Cls.prototype, p); if (d?.set) { d.set.call(self, v); return true; } env.record('set', `this.${String(p)}`, [render(v)]); t[p] = v; return true; },
  });
  return { call: (args) => spec.accessor === 'get' ? self[member] : spec.accessor === 'set' ? (self[member] = args[0], undefined) : routeCall(env, Cls, member, args, spec, (a) => method.apply(self, argsFor(spec, a))), receiver: self }; // a handler runs through the guards and pipes its listed decorators registered
}

// a synchronous call under the vm's watchdog: JavaScript cannot be preempted, so an unbounded loop (an input aliased
// into the array it grows, a mutant that breaks a bound) is interrupted by the isolate and reported as a timeout
class CallTimeout extends Error { constructor(ms) { super(`__timeout__`); this.ms = ms; } }
function guardedCall(env, fn, ms) {
  if (!env.ctx) return fn();
  env.ctx.__leanCall = fn;
  const w = openWindow(env);
  const t0 = Date.now(), u0 = cpuNow();
  try { const r = vm.runInContext('__leanCall()', env.ctx, { timeout: Math.max(1, wallAllowance(ms)) }); if (Date.now() - t0 > ms && cpuSpentMs(u0) > ms) throw new CallTimeout(ms); return r; } // past the bound both ways: a timeout, as on an idle machine
  catch (e) { if (e && e.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') throw new CallTimeout(ms); throw e; }
  finally { delete env.ctx.__leanCall; closeWindow(w); }
}
export { guardedCall }; // a PR-added test of a unit no parent holds runs under the same watchdog (new-tests.mjs)
const callUnit = (env, fn) => { const w = openWindow(env); try { return fn(); } finally { closeWindow(w); } }; // an effect or a cleanup called directly: unit code, inside a window
async function withTimeout(p, ms) {
  let timer;
  const t = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('__timeout__')), wallAllowance(ms)); });
  try { return await Promise.race([p, t]); } finally { clearTimeout(timer); }
}

// ----- escaped functions, driven (design/callbacks.md) -----
// Every function of the unit first rendered inside an observation window (fake.mjs openEscapes: a request's argument at
// any depth, a field it set, the value it returned or threw, a prop of its tree, a cleanup, a `.catch` handler) is
// called once at the window's end, as the world it reached may call it: on three drawn arguments `drive#<handle>.arg0..2`
// (fake.mjs drawn: a fake or a value of the unit's own pools, by the seed and the path) with a fake `this`, the same on
// both sides, since a handle is numbered by first sight on each side, and other values on other inputs; then called again,
// up to DRIVE_CALLS times in all, each time on its own drawn arguments (state it carries between calls). A class is constructed
// on them, then each method of its prototype is called on the instance with them. An awaited result is awaited; an
// iterator is stepped up to four times. The observation is the drive's own: what it returned or threw, the requests it
// made, the work it armed, and the hook slots it left; then the trace, the pending work, the armed timers and the slots
// are put back, so a drive is never part of the window's own observation. A function a drive hands out is driven in
// turn, up to DRIVE_DEPTH; past MAX_DRIVES per window, or when the drive itself stops (its time limit, a budget, the
// stack), the record is `undriven` with why, and the two sides compare as undecided there (fake.mjs undecidedDrives):
// never a WITNESS, lane B's verdict carries the gap as ASK callback-undriven.
export const MAX_DRIVES = 64, DRIVE_DEPTH = 3, DRIVE_ARGS = 3, DRIVE_STEPS = 4, DRIVE_METHODS = 16, DRIVE_CALLS = 3;
const isClassFn = (f) => { try { return /^class\b/.test(Function.prototype.toString.call(f)); } catch { return false; } };
const isIterator = (v) => !!v && typeof v === 'object' && !v.__isFake && typeof v.next === 'function' && (typeof v[Symbol.iterator] === 'function' || typeof v[Symbol.asyncIterator] === 'function');
const driveStop = (e) => (e instanceof CallTimeout || e?.message === '__timeout__' ? 'timeout' : e instanceof BudgetError ? `budget: ${e.message}` : e instanceof Suspended ? 'suspense' : e instanceof RenderLoop ? 'render-loop' : e && (e instanceof RangeError || e.name === 'RangeError') && /call stack/i.test(String(e.message)) ? 'stack overflow' : null);
async function driveCall(env, thunk, ms) { // one call of a drive: returned or threw, an awaited result awaited, an iterator stepped
  let v = guardedCall(env, thunk, ms); const named = promiseName(v);
  if (v && typeof v.then === 'function') v = await awaitUnit(env, v, ms);
  const out = { returned: render(v) }; if (named) out.promise = named;
  if (isIterator(v)) { const steps = []; for (let i = 0; i < DRIVE_STEPS; i++) { let r = guardedCall(env, () => v.next(), ms); if (r && typeof r.then === 'function') r = await awaitUnit(env, r, ms); steps.push(render(r)); if (!r || r.done) break; } out.steps = steps; }
  return out;
}
// The omitted forms of a drive (design/w9af-omitted-args.md): a caller leaves a trailing parameter out (its default
// applies, `arguments.length` is shorter, an undefined test holds), so after its drawn calls a driven function is called
// on the first call's own leading arguments with each optional trailing parameter left out (the parameters patch.mjs
// parameterReads reads: a default, `?`, a bracketed JSDoc @param, an undefined test, `arguments`), the shortest last,
// and then with `undefined` passed explicitly where the trailing run starts (its own boundary: a default applies, the
// length does not shrink). The leading arguments are the first call's, so state the first call left keyed on them (a
// cache per key) is met again. Each form is its own record with its own requests and the statement that first reads
// the parameter left out (`read`): a difference there is reported at that statement (firstDifference). At most
// DRIVE_ARGS parameters are ever passed, so a parameter past them is already left out by the drawn calls.
// LEAN_BREAK=w9af-omitted-drives: no form
export function omittedForms(params, args) {
  if (!params || broken('w9af-omitted-drives')) return [];
  const m = Math.min(params.length, args.length); let k0 = m;
  while (k0 > 0 && params[k0 - 1].name && params[k0 - 1].optional) k0--;
  const out = [];
  for (let n = m - 1; n >= k0; n--) out.push({ args: args.slice(0, n), read: params.slice(n, m).find((p) => p.read)?.read ?? null });
  if (k0 < m) out.push({ args: [...args.slice(0, k0), undefined], undefinedAt: k0, read: params[k0].read ?? null });
  return out;
}
async function driveOne(env, fn, k, ms) {
  const mark = env.trace.length, pend = env.pending.length, queued = env.timers.queue, slots = env.hookSlots ? env.hookSlots.slice() : null, dirty = env.stateDirty, clock = env.timers.now;
  env.timers.queue = []; // the drive's own timers only: they fire inside it (below), as the main observation fires the call's
  const args = Array.from({ length: DRIVE_ARGS }, (_, i) => env.drawn(`drive#${k}.arg${i}`)); // drawn as the world draws (fake.mjs drawn): the same on both sides, other values on other inputs
  const rec = { $fn: `#${k}`, args: render(args) }; // the driven input, as drawn
  let omitStart = null;
  if (env.siteState) { env.siteState.completed = null; env.siteState.exited = null; }
  try {
    if (isClassFn(fn)) {
      const inst = guardedCall(env, () => Reflect.construct(fn, args), ms);
      rec.constructed = render(inst);
      const proto = fn.prototype && typeof fn.prototype === 'object' ? fn.prototype : {};
      const names = Object.getOwnPropertyNames(proto).filter((n) => n !== 'constructor' && typeof Object.getOwnPropertyDescriptor(proto, n)?.value === 'function');
      if (names.length > DRIVE_METHODS) throw new BudgetError(`a class with more than ${DRIVE_METHODS} methods`);
      rec.methods = [];
      for (const n of names) { try { rec.methods.push({ method: n, ...(await driveCall(env, () => Reflect.apply(proto[n], inst, args), ms)) }); } catch (e) { if (driveStop(e)) throw e; rec.methods.push({ method: n, threw: render(e) }); } }
    } else {
      const self = env.fake(`drive#${k}.this`);
      Object.assign(rec, await driveCall(env, () => Reflect.apply(fn, self, args), ms));
      // called again, as the world that keeps it calls it again: state it carries between calls (a counter, a limit
      // on the second event) shows on a later call; each call on its own drawn arguments, the same on both sides
      const params = env.siteState?.exited?.body?.params ?? null; // the driven function's own frame exits last: its parameters (patch.mjs parameterReads)
      rec.again = [];
      for (let j = 1; j < DRIVE_CALLS; j++) {
        const more = Array.from({ length: DRIVE_ARGS }, (_, i) => env.drawn(`drive#${k}.call${j}.arg${i}`));
        try { rec.again.push({ args: render(more), ...(await driveCall(env, () => Reflect.apply(fn, self, more), ms)) }); } catch (e) { if (driveStop(e)) throw e; rec.again.push({ args: render(more), threw: render(e) }); break; }
      }
      omitStart = env.trace.length;
      for (const form of omittedForms(params, args)) { // the same leading arguments again, the trailing ones left out: a default, an `arguments.length` test or an undefined test applies, on the state the first call left
        const at = env.trace.length, entry = { args: form.args.length, ...(form.undefinedAt !== undefined ? { undefinedAt: form.undefinedAt } : {}) };
        if (env.siteState) env.siteState.completed = null;
        try { Object.assign(entry, await driveCall(env, () => Reflect.apply(fn, self, form.args), ms)); } catch (e) { if (driveStop(e)) throw e; entry.threw = render(e); }
        withSite(entry, env.siteState?.completed ?? env.siteState?.current?.site ?? null); Object.defineProperty(entry, 'read', { value: form.read });
        entry.trace = env.trace.slice(at); (rec.omitted ??= []).push(entry);
      }
    }
  } catch (e) { const stop = driveStop(e); if (stop) rec.undriven = stop; else rec.threw = render(e); }
  if (!rec.undriven && env.timers.queue.length) { try { await runTimers(env, ms); } catch (e) { const stop = driveStop(e); if (stop) rec.undriven = stop; else throw e; } } // a timer the driven function armed fires, in due order: its callback's requests are the drive's
  await new Promise((r) => setImmediate(r)); // the drive's own continuations settle inside it
  withSite(rec, env.siteState?.completed ?? env.siteState?.current?.site ?? null); // the statement of the driven function the drive completed at: a witness's line
  if (!rec.undriven) {
    rec.trace = env.trace.slice(mark, omitStart ?? undefined); // the omitted forms' requests are each form's own (rec.omitted)
    const armed = env.pending.slice(pend).map(({ id, ...rest }) => rest); if (armed.length) rec.pending = render(armed);
    if (slots) rec.slots = render(env.hookSlots);
  }
  env.trace.length = mark; env.pending.length = pend; env.timers.queue = queued; env.timers.now = clock; env.stateDirty = dirty;
  if (slots) { env.hookSlots.length = 0; env.hookSlots.push(...slots); } // the same array: the setters hold it
  return rec;
}
// a step of the re-render machine (runSequences): every function the tree holds and lane B does not fire as an
// `on[A-Z]` command is driven now, in tree order, keyed by its place (`#held<p>`), never by which closure object the
// render made, so a re-render that makes new closures, or a memoised one, compares alike; what each does in this state
// (after the commands so far) is part of the step's observation. The drives are put back as every drive is
const heldOf = (tree) => treeFunctions(tree, (k, x) => !/^on[A-Z]/.test(k) && typeof x === 'function' && !x.__isFake);
async function withHeldDrives(env, tree, ms, obs) {
  const held = heldOf(tree); if (!held.length) return obs;
  const records = activeRecords; activeRecords = null; const out = [];
  try { for (const [p, h] of held.entries()) out.push(p < MAX_DRIVES ? { label: h.label, ...(await driveOne(env, h.fn, `held${p}`, ms)) } : { label: h.label, $fn: `#held${p}`, undriven: `drive budget spent (${MAX_DRIVES} drives in one observation)` }); }
  finally { activeRecords = records; }
  return { ...obs, drives: out };
}
// the window's drives, in order of first sight, then what the drives handed out (breadth first)
export async function driveWindow(env, ms) {
  const queue = closeEscapes(env).map((k) => ({ k, depth: 0 })), out = []; let spent = 0;
  if (!queue.length) return out;
  const records = activeRecords; activeRecords = null; // the library recorder validates the table on the unit's own run; a drive calls the unit's functions on drawn arguments the table's rows are not checked against, and recording every built-in call of every drive costs a stack capture each
  try { await driveQueue(env, ms, queue, out, spent); } finally { activeRecords = records; }
  return out;
}
async function driveQueue(env, ms, queue, out, spent) {
  while (queue.length) {
    const { k, depth } = queue.shift(); const entry = escapeEntry(env, k);
    if (!entry || entry.driven) continue; // driven in an earlier window of this side (a program's earlier command): once per function object
    entry.driven = true;
    if (spent >= MAX_DRIVES || depth >= DRIVE_DEPTH) { out.push({ $fn: `#${k}`, undriven: spent >= MAX_DRIVES ? `drive budget spent (${MAX_DRIVES} drives in one observation)` : `drive depth (a function handed out by ${DRIVE_DEPTH} nested drives)` }); continue; }
    spent++; openEscapes(env);
    const rec = await driveOne(env, entry.fn, k, ms);
    for (const j of closeEscapes(env)) queue.push({ k: j, depth: depth + 1 });
    out.push(rec);
  }
}

// an error raised after the unit returned (a fire-and-forget promise, a timer): recorded as an observation, never a crash
const lateErrors = [];
let runsInFlight = 0; // unit runs in this process (runPairInProcess): an error that escapes one of them is the unit's
const lateHook = (kind) => (e) => { if (runsInFlight > 0) { lateErrors.push(String(e && e.message || e)); return; } process.stderr.write(`lean: ${kind} outside a unit run: ${e && e.stack ? e.stack : String(e)}\n`); process.exit(1); }; // outside a run the error is the importing script's own: printed, exit 1, never swallowed
if (!globalThis.__leanLateHooks) { globalThis.__leanLateHooks = true; process.on('unhandledRejection', lateHook('unhandled rejection')); process.on('uncaughtException', lateHook('uncaught exception')); }
export async function observe(side, spec, args, ms) {
  try { return await observeWindow(side, spec, args, ms); }
  finally { if (side.env?.escapes?.window) closeEscapes(side.env); } // a run that stopped before its drives closes its window
}
// the module's own state (SEMANTICS.md observation item 2): a binding of the unit's file keeps what a call wrote into it
// after the call, as an argument does, so the call's write to it is observed. One binding is read as render reads a value,
// except that a function is a leaf by its identity (rendering it would number it as an escape the unit handed out) and an
// accessor is never run; the walk stops at render's depth and at MODULE_OBJECTS objects in all (then the binding is one
// token, alike on both sides). The observation is the change: per binding, the members whose rendering the call changed
// (a member added, changed or deleted), or the whole binding when it is no record; an initializer the call never
// touches is no observation of the call, as the proof lane's world starts in any state, the same on both sides
const MODULE_OBJECTS = 4000;
function moduleState(side) {
  const cells = side.state ? side.state() : null; if (!cells) return null;
  const fns = (side.stateFns ??= new Map()); let budget = MODULE_OBJECTS; // one numbering for both snapshots: a function replaced by another is a change
  const leaf = (v) => { if (typeof v !== 'function') return null; if (!fns.has(v)) fns.set(v, fns.size); return { $function: fns.get(v) }; };
  const read = (v, depth, seen) => {
    const f = leaf(v); if (f) return f;
    if (!isNode(v)) return render(v);
    if (depth > 6) return { $deep: true };
    if (seen.has(v)) return { $cycle: true };
    if (--budget < 0) throw new BudgetError('module state');
    seen.add(v);
    try {
      if (Array.isArray(v)) return v.map((x) => read(x, depth + 1, seen));
      if (v instanceof Map) return { $map: [...v.entries()].map(([k, x]) => [read(k, depth + 1, seen), read(x, depth + 1, seen)]) };
      if (v instanceof Set) return { $set: [...v].map((x) => read(x, depth + 1, seen)) };
      return members(v, (x) => read(x, depth + 1, seen));
    } finally { seen.delete(v); }
  };
  const members = (v, each) => { const out = {}; for (const k of Object.keys(v).sort()) { const d = Object.getOwnPropertyDescriptor(v, k); out[k] = d && !('value' in d) ? { $accessor: true } : each(d ? d.value : undefined); } return out; };
  const out = {};
  for (const name of Object.keys(cells)) {
    budget = MODULE_OBJECTS; const v = cells[name];
    try {
      const plain = isNode(v) && !Array.isArray(v) && !(v instanceof Map) && !(v instanceof Set);
      out[name] = plain ? { members: Object.fromEntries(Object.entries(members(v, (x) => read(x, 1, new Set([v])))).map(([k, x]) => [k, JSON.stringify(x)])) } : { whole: JSON.stringify(read(v, 0, new Set())) };
    } catch (e) { if (!(e instanceof BudgetError)) throw e; out[name] = { whole: '{"$budget":true}' }; }
  }
  return out;
}
function moduleChange(before, after) {
  if (!before || !after) return null;
  const change = {};
  for (const name of Object.keys(after)) {
    const a = before[name], b = after[name]; if (!a) continue;
    if (a.members && b.members) {
      const d = {};
      for (const k of new Set([...Object.keys(a.members), ...Object.keys(b.members)])) if (a.members[k] !== b.members[k]) d[k] = Object.hasOwn(b.members, k) ? JSON.parse(b.members[k]) : { $deleted: true };
      if (Object.keys(d).length) change[name] = d;
    } else if (JSON.stringify(a) !== JSON.stringify(b)) change[name] = b.whole !== undefined ? { $now: JSON.parse(b.whole) } : { $now: Object.fromEntries(Object.entries(b.members).map(([k, x]) => [k, JSON.parse(x)])) };
  }
  return Object.keys(change).length ? change : null;
}
async function observeWindow(side, spec, args, ms) {
  const { env, unit } = side;
  let stateBefore;
  try { stateBefore = moduleState(side); } catch (e) { return { harness: `module state: ${String(e && e.message).slice(0, 120)}` }; }
  // the heap layer, stage 1: the object graph reachable from the arguments is named before the call (graph.mjs)
  let graph;
  try { graph = new Graph().before(args); } catch (e) { if (e instanceof BudgetError) return { harness: `budget: ${e.message}` }; throw e; }
  let outcomeSite = null;
  if (env.siteState) { env.siteState.completed = null; env.siteState.fault = null; }
  openEscapes(env); // every function first rendered from here to the drives is driven at the end (driveWindow)
  let outcome, outcomeValue, hasOutcome = false, returnedPromise = null, thrownValue;
  lateErrors.length = 0;
  try {
    const slotsBefore = (env.hookSlots ?? []).slice(), framesBefore = cloneFrames(env.childFrames), traceBefore = env.trace.length, callsBefore = new Map(env.calls), demandBefore = env.demand; // the environment's answers are seeded by path and call index: with the same counters the second render asks the same questions and gets the same answers; the clock and the random stream are not restored (a read of them in a render is the impurity the check is for)
    const call = () => { const r = guardedCall(env, () => unit.call(args), ms); returnedPromise = promiseName(r); return r; }; // a promise the world made and the unit returned as it is: its name joins the outcome
    // each render's own pending continuations settle before its requests are read: work a render started (a promise
    // chain in a hook) is that render's, never the next render's, so the two traces compare like with like
    const settleRender = async () => { await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r)); };
    const outerHanded = env.handedMark(); // the world's writes to the objects the first render hands it, journaled (fake.mjs writeHanded)
    let v, handed1;
    try { v = await commitRender(env, call, ms); if (isJsxValue(v) && env.react) await settleRender(); } finally { handed1 = env.handedTake(outerHanded); outerHanded?.push(...handed1); }
    outcomeSite = env.siteState?.completed ?? null;
    if (isJsxValue(v) && env.react) { // a rendered unit renders twice from the same slots (Strict Mode's rule, run by lean alone): a differing tree or request trace is an impure render, REFUSE with both renders
      const traceAfter = env.trace.length, pendingAfter = env.pending.length, effectsAfter = (env.reactEffects ?? []).length, slotsAfter = (env.hookSlots ?? []).slice();
      const callsAfter = new Map(env.calls), demandAfter = env.demand;
      const framesAfter = env.childFrames; env.hookSlots = slotsBefore.slice(); env.childFrames = cloneFrames(framesBefore); env.calls = new Map(callsBefore); env.demand = demandBefore; // a deep child's frames start the second render as they started the first
      const first = { tree: render(v), trace: env.trace.slice(traceBefore, traceAfter) };
      const paused = pauseEscapes(env); // the second render's functions are new objects the observation never shows: numbered, not driven
      let second;
      env.handedUndo(handed1); // the props as the first render was handed them: the world's write is the world's, and the second render's world (its calls counted from the same index) writes it again
      const outer2 = env.handedMark();
      try { const v2 = await commitRender(env, call, ms); await settleRender(); second = { tree: render(v2), trace: env.trace.slice(traceAfter) }; } finally { resumeEscapes(env, paused); env.handedUndo(env.handedTake(outer2)); env.handedRedo(handed1); } // what the world wrote in the one render the observation keeps, the first
      env.trace.length = traceAfter; env.pending.length = pendingAfter; if (env.reactEffects) env.reactEffects.length = effectsAfter; env.hookSlots = slotsAfter; env.childFrames = framesAfter; env.calls = callsAfter; env.demand = demandAfter; // the second render leaves nothing behind
      if (JSON.stringify(canonHandles(first)) !== JSON.stringify(canonHandles(second))) return { impure: { first, second } }; // each render makes its own closures: a function is compared by its place (handles renamed by first sight in each render), what it does is driven
    }
    for (const effect of env.reactEffects ?? []) { // the mount's effects, once, in registration order (the pending records of their cleanups are part of the one-render observation)
      const es = (env.effectSlots ?? []).find((x) => x && x.fn === effect);
      try { const cleanup = await awaitUnit(env, Promise.resolve(callUnit(env, effect)), ms); if (typeof cleanup === 'function') env.pending.push({ op: 'react:cleanup', handler: render(cleanup) }); if (es) { es.ran = true; es.lastDeps = es.deps; es.cleanup = typeof cleanup === 'function' ? cleanup : null; } }
      catch (e) { if (e instanceof BudgetError || e?.message === '__timeout__') throw e; env.record('effect-throw', 'react', [render(e)]); if (es) { es.ran = true; es.lastDeps = es.deps; } }
    }
    if (env.reactEffects?.length) { await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r)); } // the mount's effects settle as settleEffects settles a later round: a continuation they started (an answered call's then) runs before the state is read
    if ((isJsxValue(v) || env.reactEffects?.length) && env.react && env.stateDirty) v = await commitEffects(env, call, ms, await commitRender(env, call, ms)); // an effect set the state: React re-renders and settles again
    outcomeValue = await withTimeout(observeJsx(v, env), ms); hasOutcome = true;
    if (env.timers.queue.length) await runTimers(env, ms, 50, env.timerPerm ? { perm: env.timerPerm } : {}); // every timer the call armed, once, in due order; what they ask of the environment lands in the trace; on a timer-order input (gen.mjs, repr.mjs) the ties at one instant in another legal order
    if (isJsxValue(outcomeValue)) side.sawJsx = true; // the unit rendered: the certificate names the front-end layer of this observation
    outcome = { returned: isJsxValue(outcomeValue) ? renderTree(outcomeValue) : render(outcomeValue) };
    if (returnedPromise) outcome.promise = returnedPromise;
  } catch (e) {
    if (e && e.message === '__timeout__') { callTimedOut(); return { harness: 'timeout', at: `timed out at ${stoppedAt(env)}` }; }
    if (e instanceof Unsettled) return { harness: 'timeout', at: e.message }; // a promise nothing will settle is an input that never ends: skipped as a timed-out one is (both sides alike, or one side named), only at once and with where it waits
    if (e instanceof BudgetError) return { harness: `budget: ${e.message}` };
    if (e instanceof Suspended || (e && typeof e.then === 'function')) return { harness: `suspense: ${e instanceof Suspended ? e.message.slice(10) : 'a thenable thrown during render'}` }; // ASK:suspense, never a crash and never a thrown-value outcome
    if (e instanceof RenderLoop) return { harness: e.message }; // ASK:render-loop: React would throw or never settle
    if (e instanceof CallTimeout) { callTimedOut(); return { harness: 'timeout', at: `timed out at ${stoppedAt(env)}` }; }
    if (e && (e instanceof RangeError || e.name === 'RangeError') && /call stack/i.test(String(e.message))) return { harness: 'stack overflow' }; // whichever realm threw it: the host's (a fake, a patched intrinsic) or the sandbox's (the unit's own recursion)
    outcomeSite = env.siteState?.completed ?? env.siteState?.current?.site ?? null;
    outcome = { threw: render(e) }; thrownValue = e;
    if (returnedPromise) outcome.promise = returnedPromise;
  }
  // drain microtasks so pending work settles
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r)); // let a fire-and-forget continuation fail now rather than during the next side
  for (const m of lateErrors.splice(0)) env.record('late-error', 'process', [m.slice(0, 200)]);
  // the receiver's own state after the call: every field of `this` the run touched, rendered (a typed field such as a
  // Map or a counter is a real value, so a change to it is seen here, not on the trace)
  const receiver = {};
  let own = {};
  if (side.unit && side.unit.receiver) { for (const [k, v] of env.cache) if (k.startsWith('this.') && !k.includes('(') && !k.includes('#') && !k.includes('.', 5)) receiver[k] = render(v); own = side.unit.receiver.__own ? side.unit.receiver.__own() : {}; for (const k of Object.keys(own)) receiver[`this.${k}`] = render(own[k]); }
  // the graph after the call: the arguments, the receiver's own fields and the outcome as roots, then every pre-call
  // object; a fresh object is named by its first sight, so two runs equal up to a renaming serialise the same
  let heap;
  try { heap = graph.after(args, own, outcomeValue, hasOutcome); } catch (e) { if (e instanceof BudgetError) return { harness: `budget: ${e.message}` }; throw e; }
  const result = { outcome, heap, receiver, trace: env.trace.slice(), pending: env.pending.map(({ id, ...rest }, i) => withSite(rest, env.pending[i].site)) }; // a timer id is an arm counter, not an observation
  let moduleAfter; try { moduleAfter = moduleState(side); } catch (e) { return { harness: `module state: ${String(e && e.message).slice(0, 120)}` }; }
  const written = moduleChange(stateBefore, moduleAfter); if (written) result.module = written; // what the call left in the module's own bindings
  const drives = await driveWindow(env, ms); if (drives.length) result.drives = drives; // every function the observation shows, driven (design/callbacks.md)
  Object.defineProperty(result, 'raw', { value: hasOutcome ? { returned: outcomeValue } : { threw: thrownValue } }); // the values themselves, not their renderings: a unit no parent holds is checked against its declared types (new-unit.mjs)
  return Object.defineProperty(result, 'site', { value: outcomeSite });
}

// a module body paused at a top-level await (loadInner) waits on what it armed while loading (a poll's sleep): those
// timers are its continuation, and never fire inside a unit's observation, where the body would resume and its requests
// would be the unit's (lane w9ab). A module that loaded to its end keeps its armed timers, as before
function dropLoadTimers(env) { if (env.pausedBodies?.size && !broken('await-units')) env.timers.queue.length = 0; }
// ----- the virtual clock: armed timers fire in due order -----
// runTimers fires every armed timer once, in due order (ties by arm order), moving the clock to each due instant; an
// interval re-arms after its run and stays pending, unless its own callback cleared it; a timer that arms another runs it too, up to the limit (then a
// budget: ASK). The observation holds the fired order (a 'fire' record per timer) and what each callback asked of
// the environment.
const PERMS = { 1: [[0]], 2: [[0, 1], [1, 0]], 3: [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]] }; // the firing orders of up to three timers due at one instant
// a timer may fire before an earlier-armed one due at the same instant only when the event loop leaves their order open:
// different kinds, never two timeouts or intervals (equal delays fire in arm order in Node; the queue does not keep the
// delay, so two of them are never swapped). Every caller that picks an order (the timer-order family, the JSX schedule
// explorer's ticks) runs only orders Node can produce
const mayPrecede = (a, b) => a.kind !== b.kind && !(['timeout', 'interval'].includes(a.kind) && ['timeout', 'interval'].includes(b.kind));
async function runTimers(env, ms, limit = 50, { until = Infinity, perm = 0, legal = true } = {}) { // until: fire what is due up to this instant (the schedule explorer advances the clock step by step); perm: which order the timers due at one instant fire in (the event loop fixes none for equal instants)
  const t = env.timers; let fired = 0;
  for (;;) {
    const due = t.queue.filter((e) => e.fired === 0 && e.due <= until).sort((a, b) => a.due - b.due || a.order - b.order);
    if (!due.length) break;
    const ties = due.filter((x) => x.due === due[0].due); let pick = perm && PERMS[ties.length] ? ties[PERMS[ties.length][perm % PERMS[ties.length].length][0]] : due[0];
    if (legal && pick !== due[0] && !ties.every((x) => x === pick || x.order > pick.order || mayPrecede(pick, x))) pick = due[0]; // an order the event loop forbids is never run
    const e = pick; if (e.due > t.now) t.now = e.due;
    const i = t.queue.indexOf(e); t.queue.splice(i, 1); const j = env.pending.findIndex((x) => x.id === e.id); if (j >= 0) env.pending.splice(j, 1);
    if (++fired > limit) throw new BudgetError(`more than ${limit} timers fired`);
    env.record('fire', { timeout: 'setTimeout', interval: 'setInterval', immediate: 'setImmediate', frame: 'requestAnimationFrame', idle: 'requestIdleCallback' }[e.kind], [e.due]); // the instant, never the id: an id is an arm counter nobody outside sees
    const outer = t.firing; t.firing = e; // off the queue while its callback runs: a clear of its id in the callback (an interval that stops itself) reaches it here (fake.mjs clearTimer)
    try { const r = guardedCall(env, () => e.fn(...e.args), ms); if (r && typeof r.then === 'function') await awaitUnit(env, r, ms); } catch (x) { if (x instanceof BudgetError || x?.message === '__timeout__') throw x; env.record('timer-throw', e.kind, [render(x)]); } finally { t.firing = outer; }
    if (e.interval && !e.cleared) { e.fired = 1; e.due = t.now + e.interval; e.order = t.nextId++; t.queue.push(e); env.pending.push(withSite({ op: 'setInterval', ms: e.interval, id: e.id }, e.site)); } // once per run: the interval stays pending for the next tick
    await new Promise((r) => setImmediate(r));
  }
  for (const e of t.queue) e.fired = 0; // the next run may fire the intervals again
  await new Promise((r) => setImmediate(r));
}
export { runTimers };
// ----- re-render sequences: the component as a machine over its hook slots -----
// After the mount, a bounded set of command sequences runs on both sides from a fresh mount each: `fire` a handler of
// the current tree on a fake event, `settle` (effects whose deps changed by Object.is, cleanup first; microtasks
// drained), re-render, compare the tree, the requests and the pending work; `unmount` closes every path (every
// cleanup). A divergence is a WITNESS with the sequence; a clean run states its depth and breadth in the bound.
const sameDeps = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
async function settleEffects(env, ms) {
  for (const es of env.effectSlots ?? []) {
    if (!es) continue;
    if (es.ran && es.deps !== undefined && sameDeps(es.deps, es.lastDeps)) continue;
    if (es.cleanup) { env.record('call', `${es.key}.cleanup`, []); try { await awaitUnit(env, Promise.resolve(callUnit(env, es.cleanup)), ms); } catch (e) { if (e instanceof BudgetError || e?.message === '__timeout__') throw e; env.record('effect-throw', es.key, [render(e)]); } es.cleanup = null; }
    env.record('call', es.key, []);
    try { const c = await awaitUnit(env, Promise.resolve(callUnit(env, es.fn)), ms); es.cleanup = typeof c === 'function' ? c : null; } catch (e) { if (e instanceof BudgetError || e?.message === '__timeout__') throw e; env.record('effect-throw', es.key, [render(e)]); }
    es.ran = true; es.lastDeps = es.deps;
  }
  await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r));
}
const eraseHandlers = (v) => (Array.isArray(v) ? v.map(eraseHandlers) : v && typeof v === 'object' && !v.__isFake && Object.hasOwn(v, '$el') ? { $el: v.$el, props: Object.fromEntries(Object.entries(v.props).map(([k, x]) => [k, typeof x === 'function' ? 'fn' : eraseHandlers(x)])), children: v.children.map(eraseHandlers), ...(Object.hasOwn(v, 'rendered') ? { rendered: eraseHandlers(v.rendered) } : {}) } : v);
const treeFunctions = (v, pick, at = [], out = []) => { if (Array.isArray(v)) { v.forEach((c, i) => treeFunctions(c, pick, [...at, `[${i}]`], out)); return out; } if (!v || typeof v !== 'object' || v.__isFake || !Object.hasOwn(v, '$el')) return out; for (const [k, x] of Object.entries(v.props)) if (pick(k, x)) out.push({ label: `${at.join('/')}:${k}`, fn: x, props: v.props }); v.children.forEach((c, i) => treeFunctions(c, pick, [...at, `${typeof v.$el === 'string' ? v.$el : 'C'}[${i}]`], out)); if (Object.hasOwn(v, 'rendered')) treeFunctions(v.rendered, pick, [...at, `${typeof v.$el === 'string' ? v.$el : 'C'}>`], out); return out; }; // a deep child's output: its handlers are the page's too
// the commands of the re-render machine: every `on[A-Z]` handler of the tree first, in tree order, then every other
// function the tree holds (a `select`, a render prop handed to a child), which the world may call as well: an escaped
// function is observed by what it does when called, and what a held function does after a re-render is reached only by
// calling it, letting React re-render, and calling the new one (design/callbacks.md)
const treeHandlers = (v) => [...treeFunctions(v, (k, x) => /^on[A-Z]/.test(k) && typeof x === 'function'), ...treeFunctions(v, (k, x) => !/^on[A-Z]/.test(k) && typeof x === 'function' && !x.__isFake)];
// the render row's targets (bound.render.targets, design/certificate-timing.md, 2026-10-31): per handler label, the props that make its
// element addressable on a page (key, id, data-testid, role, aria-label as the name), each a string or number else null;
// read from a raw tree (every command label of treeHandlers) or an observed one (an `on[A-Z]` prop observed as $handler)
const addressable = (x) => (typeof x === 'string' || typeof x === 'number' ? x : null);
const targetOf = ({ label, props }) => ({ label, path: label.slice(0, label.lastIndexOf(':')), key: addressable(props.key), id: addressable(props.id), testid: addressable(props['data-testid']), role: addressable(props.role), name: addressable(props['aria-label']) });
const treeTargets = (v, observed = false) => (observed ? treeFunctions(v, (k, x) => /^on[A-Z]/.test(k) && !!x && typeof x === 'object' && Object.hasOwn(x, '$handler')) : treeHandlers(v)).map(targetOf);
const addTargets = (into, targets) => { const seen = new Set(into.map((t) => JSON.stringify(t))); for (const t of targets) { const k = JSON.stringify(t); if (!seen.has(k)) { seen.add(k); into.push(t); } } }; // a label whose element changes its props between states gives one row per distinct target
async function runSequences({ files, roots, spec, unit, seed, inputIndex, ms, depth, breadth, schedules = false, handlers = null }) { // schedules: the clock is a command (moonshot 9): a tick fires what is due at the next instant, ties in every order, and a handler may arrive before a timer fires
  const mount = async (name) => { // a fresh mount: the same seed gives the same fakes and the same inputs as the pair's run of this input
    const env = new Environment(seed * 7919 + inputIndex); env.shapes = spec;
    const exportsObj = sandbox(env, roots[name]).load(files[name]); const u = pickUnit(exportsObj, spec, env); if (!u) throw new Error(`${name}: unit ${unit} not exported`);
    await new Promise((r) => setImmediate(r)); env.trace.length = 0; env.pending.length = 0; env.calls.clear();
    const inputs = aliasInputs(inputsFor(spec, seed, inputIndex, env), spec, seed, inputIndex); env.argPool = inputs.filter((x) => x && (typeof x === 'object' || typeof x === 'function') && x.__isFake); enterWorld(env, spec, inputIndex, inputs); // the pair's run of this input meets the same world
    return { env, u, inputs };
  };
  const callOf = (s) => () => guardedCall(s.env, () => s.u.call(s.inputs), ms);
  const renderOnce = async (s) => commitRender(s.env, callOf(s), ms);
  const commit = async (s) => commitEffects(s.env, callOf(s), ms, await renderOnce(s)); // render, effects, and again while an effect changes the state
  // run one command path on one side; returns the observation after every command
  const runPath = async (name, labels) => {
    const s = await mount(name);
    openEscapes(s.env); // the path is one observation window: every function its observations show is driven after the unmount (design/callbacks.md)
    try { return await runPathIn(s, labels, name); } finally { if (s.env.escapes?.window) closeEscapes(s.env); } // a path the harness stopped closes its window
  };
  const runPathIn = async (s, labels, name) => {
    const obs = [];
    const harness = (e) => e instanceof BudgetError || e?.message === '__timeout__' || e instanceof Suspended || e instanceof RenderLoop || e instanceof CallTimeout; // the harness's own stops end the sequence run as ASK; anything else a render throws is an observation
    const settle = async () => { let t = await commit(s); if (!schedules && s.env.timers.queue.length) { await runTimers(s.env, ms); t = await commit(s); } return t; }; // a commit, its effects, the re-renders they cause, and (outside the schedule explorer) the timers they armed
    const tick = async (perm) => { const q = s.env.timers.queue.filter((e) => e.fired === 0); if (!q.length) return null; const next = Math.min(...q.map((e) => e.due)); await runTimers(s.env, ms, 50, { until: next, perm }); return commit(s); }; // the clock advances to the next due instant; the timers due there fire in the chosen order
    let tree;
    const seen = (t) => { if (name === 'parent') addTargets(targets, treeTargets(t)); }; // every tree the parent's path reaches: its handlers' targets
    try { tree = await settle(); seen(tree); } catch (e) { if (harness(e)) throw e; obs.push(withSite({ command: 'mount', threw: render(e), trace: traceWithSites(s.env.trace) }, s.env.siteState?.completed)); return { obs, s }; } // a render that throws at the mount: the path ends on that observation, compared like any other
    for (const label of labels) {
      const from = s.env.trace.length;
      if (label.startsWith('tick@')) { // a clock step: the instant it reaches and what fired are the observation
        const perm = Number(label.slice(5)) || 0; const before = s.env.timers.now;
        try { const t2 = await tick(perm); if (t2 !== null) { tree = t2; seen(tree); } } catch (e) { if (harness(e)) throw e; obs.push(withSite({ command: label, threw: render(e), trace: traceWithSites(s.env.trace.slice(from)) }, s.env.siteState?.completed)); return { obs, s }; }
        obs.push(await withHeldDrives(s.env, tree, ms, { command: label, clock: [before, s.env.timers.now], tree: eraseHandlers(tree), trace: traceWithSites(s.env.trace.slice(from)), pending: render(s.env.pending.map(({ id, ...rest }) => rest)) }));
        continue;
      }
      const h = treeHandlers(tree).find((x) => x.label === label);
      if (!h) { obs.push({ command: label, missing: true, handlers: treeHandlers(tree).map((x) => x.label) }); return { obs, s }; }
      const event = s.env.fake(`react:event:${label}`), slotsBefore = (s.env.hookSlots ?? []).slice(); let threw = false;
      try { const r = guardedCall(s.env, () => h.fn(event), ms); if (r && typeof r.then === 'function') await awaitUnit(s.env, r, ms); } catch (e) { if (harness(e)) throw e; threw = true; s.env.record('handler-throw', label, [render(e)]); }
      if (handlers) interpretFire(handlers.stats, handlers.models[name], { fn: h.fn, label, args: [event], env: s.env, slotsBefore, props: s.inputs[0], threw }); // a readable descriptor applied to the slots before the handler must give the slots the handler left
      try { tree = await settle(); seen(tree); } catch (e) { if (harness(e)) throw e; obs.push(withSite({ command: label, threw: render(e), trace: traceWithSites(s.env.trace.slice(from)) }, s.env.siteState?.completed)); return { obs, s }; } // a render that throws after a click (a state the one-render check never reached): an observation, never a crash
      obs.push(await withHeldDrives(s.env, tree, ms, { command: label, tree: eraseHandlers(tree), trace: traceWithSites(s.env.trace.slice(from)), pending: render(s.env.pending.map(({ id, ...rest }) => rest)) }));
    }
    const pendingTimers = s.env.timers.queue.filter((e) => e.fired === 0); const ties = pendingTimers.length ? pendingTimers.filter((e) => e.due === Math.min(...pendingTimers.map((x) => x.due))).length : 0; // read before the unmount clears them: the clock steps the next level may take
    const ticks = schedules && pendingTimers.length && pendingTimers.length <= 3 ? Array.from({ length: Math.min(PERMS[ties]?.length ?? 1, 6) }, (_, k) => `tick@${k}`) : [];
    // unmount: every cleanup, in slot order
    const from = s.env.trace.length;
    for (const es of s.env.effectSlots ?? []) if (es && es.cleanup) { s.env.record('call', `${es.key}.cleanup`, []); try { await awaitUnit(s.env, Promise.resolve(callUnit(s.env, es.cleanup)), ms); } catch (e) { if (e instanceof BudgetError || e?.message === '__timeout__') throw e; s.env.record('effect-throw', es.key, [render(e)]); } es.cleanup = null; }
    obs.push({ command: 'unmount', trace: traceWithSites(s.env.trace.slice(from)) });
    const drives = await driveWindow(s.env, ms); if (drives.length) obs.push({ command: 'drive', drives });
    return { obs, s, handlers: treeHandlers(tree).map((x) => x.label), ticks, timers: pendingTimers.length };
  };
  const targets = [], walked = []; // the render row: the targets of every tree the parent reached, every path walked with no difference (bound.render)
  let paths = 0; let frontier = [[]]; const done = new Set(); let maxTimers = 0; let undriven = null;
  for (let level = 0; level <= depth; level++) {
    const next = [];
    for (const labels of frontier) {
      const key = labels.join('>'); if (done.has(key)) continue; done.add(key); paths++;
      let P, C;
      try { P = await runPath('parent', labels); C = await runPath('candidate', labels); } catch (e) { if (e instanceof BudgetError || e?.message === '__timeout__' || e instanceof Suspended || e instanceof RenderLoop) return { ask: `sequence ${JSON.stringify(labels)}: ${e.message}` }; throw e; }
      maxTimers = Math.max(maxTimers, P.timers ?? 0);
      for (let k = 0; k < Math.max(P.obs.length, C.obs.length); k++) {
        const a = JSON.stringify(P.obs[k] ?? null), b = JSON.stringify(C.obs[k] ?? null);
        if (a !== b && undecidedDrives(P.obs[k] ?? null, C.obs[k] ?? null)) { undriven ??= { sequence: labels, reasons: undecidedDrives(P.obs[k], C.obs[k]) }; continue; } // a drive that could not run: undecided, never a difference
        if (a === b && !undriven) { const u = undrivenOf(P.obs[k]) ?? undrivenOf(C.obs[k]); if (u) undriven = { sequence: labels, reasons: [u] }; }
        if (a !== b) return { timers: maxTimers, walked, targets, witness: { input: inputIndex, sequence: [...labels, ...(labels.length > k ? [] : [])].slice(0, k + 1).concat(k >= labels.length ? ['unmount'] : []), step: k, parent: P.obs[k] ?? null, candidate: C.obs[k] ?? null, ...witnessPatch(P.obs[k] ?? null, C.obs[k] ?? null) } }; // the step's tree difference as a patch
      }
      if (labels.length) walked.push(labels); // the mount alone is the state itself (bound.states)
      if (level < depth) for (const label of [...(P.handlers ?? []).slice(0, breadth), ...(P.ticks ?? [])]) next.push([...labels, label]);
    }
    frontier = next;
  }
  return { paths, timers: maxTimers, walked, targets, ...(undriven ? { undriven } : {}) };
}

export const traceWithSites = (records) => records.map((r) => withSite(render(r), r.site));
export { commitRender, commitEffects, settleEffects, treeHandlers, RenderLoop };
// ----- the bound of a unit: lane B runs in a child process, killed when the bound passes (design/microtask-worker.md) -----
// The vm watchdog (guardedCall) interrupts only the synchronous call; a unit whose awaits settle in microtasks keeps
// the host in one microtask drain, where no timer fires and no signal handler runs. So lane B runs each unit in a child
// process (worker.mjs) under a wall-clock bound: when the bound passes, the child is killed with SIGKILL and the unit's
// verdict is ASK naming the bound (spin-bound), with the step, the input and the side that was running. The child reads
// only the lean sources and the trees it is given (Node's permission model: --permission with --allow-fs-read), writes
// nothing (LEAN_LIBRARY_CASES excepted), starts no process, worker or addon, and holds only the environment variables
// lean's own code reads (workerEnv); a unit no parent holds runs in new-unit.mjs's child under the same. The network is open to code that leaves
// the vm context, since this Node's permission model has no network switch; LEAN_NET=deny closes it at the process's own
// bindings (net-deny.mjs) and the unit's record names every attempt it refused (design/sandbox-boundary.md).
export const UNIT_SECONDS = 120; // the bound of one unit when no flag and no run budget names one
// The bound counts the unit's OWN CPU time, so that a verdict does not depend on how loaded the machine is (lane
// bench-scoring: 15 of 21 clean-lane refusals were units a wall bound killed under a load of 100; the benchmark
// degraded with the machine). The parent reads the child's CPU time from the OS every CPU_POLL_MS (ps: the one
// portable read of another process's time) and kills it past the bound. A wall bound FAR_GUARD times longer stays as
// the far guard, for a child that burns no CPU and never answers; a host whose ps answers nothing keeps the wall bound
// at the CPU bound, the old rule, said once on stderr.
export const CPU_POLL_MS = 1000, FAR_GUARD = 10, CONTENTION_CAP = 3; // CONTENTION_CAP: the largest CPU slowdown a shared or slower core can impose on a thread (an efficiency core runs at about a third of a performance core); a reading above it is the sampler disturbed, not the unit starved, and a unit that runs away would otherwise burn the whole stretched allowance (a spin test stretched six times ran 734 s)
const cpuWatched = new Map(); // pid -> { bound (s), onSample, onBound, onUnavailable }
let cpuPoll = null, psUnavailable = false;
const psSeconds = (t) => { const [dd, rest] = t.includes('-') ? t.split('-') : ['0', t]; const parts = rest.split(':').map(Number); return Number(dd) * 86400 + parts.reduce((acc, x) => acc * 60 + x, 0); }; // mm:ss.cc (BSD) or [dd-]hh:mm:ss (procps)
// The time read is the worker's MAIN THREAD: the unit's JavaScript runs there, while V8's garbage collector and
// compiler run on helper threads whose time is the engine's, not the unit's (a unit at full speed on an idle machine
// read 121 s of process time in 90 s of wall time). Linux: /proc/<pid>/task/<pid>/stat, fields 14 and 15 in clock
// ticks; macOS: `ps -M -p <pid>`, whose first thread row carries the main thread's user and system time; elsewhere the
// process total (`ps -o time=`).
let clkTck = 0; // Linux clock ticks per second, read on the first poll (never at load: a preview spawns no process)
const CLK_TCK = () => clkTck || (clkTck = (() => { try { return Number(execFileSyncQuiet('getconf', ['CLK_TCK'])) || 100; } catch { return 100; } })());
function execFileSyncQuiet(cmd, args) { const r = spawnSync(cmd, args, { encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : ''; }
function mainThreadSeconds(pid, cb) {
  if (process.platform === 'linux') {
    fs.readFile(`/proc/${pid}/task/${pid}/stat`, 'utf8', (err, text) => {
      if (err) return cb(err, null);
      const after = text.slice(text.lastIndexOf(')') + 2).split(' '); // fields from 3 on, after the command name
      cb(null, (Number(after[11]) + Number(after[12])) / CLK_TCK()); // utime and stime are fields 14 and 15 of the stat line
    });
    return;
  }
  const bsd = process.platform === 'darwin';
  execFile('ps', bsd ? ['-M', '-p', String(pid)] : ['-o', 'time=', '-p', String(pid)], { encoding: 'utf8' }, (err, out) => {
    if (err && !out) return cb(err, null);
    const lines = String(out ?? '').trim().split('\n');
    if (!bsd) return cb(null, lines.length ? psSeconds(lines[lines.length - 1].trim()) : null);
    const row = lines.find((l) => new RegExp(`^\\S+\\s+${pid}\\s`).test(l)); // the process's first thread row carries the pid
    if (!row) return cb(null, null);
    const m = row.match(/(\d+:\d+(?:\.\d+)?)\s+(\d+:\d+(?:\.\d+)?)\s/); // STIME UTIME
    cb(null, m ? psSeconds(m[1]) + psSeconds(m[2]) : null);
  });
}
function pollCpu() {
  const pids = [...cpuWatched.keys()];
  if (!pids.length) { clearInterval(cpuPoll); cpuPoll = null; return; }
  for (const pid of pids) mainThreadSeconds(pid, (err, cpu) => {
    const w = cpuWatched.get(pid); if (!w) return;
    if (err || cpu === null) { // the reading itself failing (ps absent, refused; a worker already gone is no failure): the wall bound at the CPU bound takes over, once
      if (err && !/exit code 1|ENOENT/.test(String(err.message)) && !psUnavailable) { psUnavailable = true; process.stderr.write(`lean: no CPU reading of the lane B worker (${String(err.message).slice(0, 120)}); the unit bound is wall-clock on this host\n`); for (const x of cpuWatched.values()) x.onUnavailable(); }
      return;
    }
    w.onSample(cpu);
    if (cpu >= w.bound) w.onBound(cpu);
  });
}
function watchCpu(pid, bound, handlers) {
  cpuWatched.set(pid, { bound, ...handlers });
  if (psUnavailable) handlers.onUnavailable();
  else if (!cpuPoll) { cpuPoll = setInterval(pollCpu, CPU_POLL_MS); cpuPoll.unref(); }
  return { stop: () => { cpuWatched.delete(pid); if (!cpuWatched.size && cpuPoll) { clearInterval(cpuPoll); cpuPoll = null; } } };
}
// The in-process watchdogs (guardedCall, withTimeout) are wall clocks too: a call's bound of ms is allowed the wall
// time ms of CPU takes on this machine. Under the suite that is the unit's measured CPU slowdown (sampleContention,
// capped at CONTENTION_CAP, re-read at every input); without a baseline it is read from the load average at the start
// of the unit (os.loadavg: the 1-minute run queue over the cores), floored at 1 and capped at FAR_GUARD. A call that
// ran past ms both ways is a timeout whether or not the watchdog interrupted it, as on an idle machine. The stretch
// is bounded because a spinning call allocates for its whole wall allowance: ten times the idle allowance under eleven
// workers exhausted a 48 GB machine (see workerFlags)
// CPU seconds buy less work when the core is shared (a sibling hardware thread, cache pressure): the bound on a unit's
// CPU time is stated for an idle core. cpuRateNsPerIter spins a fixed integer loop and reads this thread's CPU per
// iteration; the suite measures it once before its pool starts (LEAN_CPU_BASELINE), each unit measures it at its start,
// and the unit's bound stretches by the ratio (capped at FAR_GUARD): the same work, under contention, is the same bound
export function cpuRateNsPerIter(iters = 4_000_000, samples = 5) { // the median of five short spins: one spin alone read four times its rate on a scheduling burst
  const read = () => (typeof process.threadCpuUsage === 'function' ? process.threadCpuUsage() : process.cpuUsage());
  const rates = [];
  for (let k = 0; k < samples; k++) {
    const a = read(); let x = 0x9e3779b9 | 0;
    for (let i = 0; i < iters; i++) { x = (Math.imul(x ^ (x >>> 15), 0x85ebca6b) + i) | 0; }
    const b = read(); if (x === 42) process.stderr.write(''); // keep the loop's result alive
    rates.push(((b.user - a.user) + (b.system - a.system)) * 1000 / iters);
  }
  rates.sort((p, q) => p - q); return rates[Math.floor(rates.length / 2)];
}
let loadFactor = 1;
export function readLoadFactor() { const cores = os.cpus().length || 1; const load = os.loadavg()[0] || 0; loadFactor = Math.min(FAR_GUARD, Math.max(1, load / cores)); return loadFactor; }
const wallAllowance = (ms) => Math.round(ms * loadFactor);
const cpuNow = () => (typeof process.threadCpuUsage === 'function' ? process.threadCpuUsage() : process.cpuUsage()); // the main thread's own time when Node exposes it, else the process's
const cpuSpentMs = (u0) => { const u = cpuNow(); return (u.user - u0.user + u.system - u0.system) / 1000; };
let unitSecondsDefault = UNIT_SECONDS;
export const setUnitSeconds = (s) => { unitSecondsDefault = unitSecondsValue(s); }; // pr.mjs: the run's per-unit bound
export function unitSecondsValue(s) {
  if (s === undefined || s === null) return unitSecondsDefault;
  const n = Number(s);
  if (String(s).trim() === '' || !Number.isFinite(n) || n <= 0) throw new Error('--unit-seconds must be a positive number');
  return n;
}
const workerFile = path.join(path.dirname(new URL(import.meta.url).pathname), 'worker.mjs');
const leanSources = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'); // langs/ts: the code, the vendored compiler, the tables
// the tree a unit's file is given: the nearest folder above it holding .git (the checkout), else its package root
export function treeOf(file) {
  let d = path.dirname(path.resolve(file));
  for (;;) { if (fs.existsSync(path.join(d, '.git'))) return d; const up = path.dirname(d); if (up === d) break; d = up; }
  return findRoot(file);
}
function workerReads(opts) {
  const read = new Set([leanSources]);
  for (const f of [opts.parent, opts.candidate]) if (f) read.add(treeOf(f));
  if (typeof opts.values === 'string') read.add(path.resolve(opts.values));
  if (typeof opts.project === 'string') read.add(path.dirname(path.resolve(opts.project)));
  if (process.env.LEAN_LIBRARY_TABLE) read.add(path.resolve(process.env.LEAN_LIBRARY_TABLE));
  // the packages the trees' code resolves: module resolution (Node's and TypeScript's, @types included) looks in the
  // node_modules folder of every folder from the file up to the root, and such a folder may be a link out of the tree
  // (a checkout whose dependencies live in another checkout or a shared store); without it the child loads no
  // declaration and no package that the command line's run loads, and reads the unit at other types
  for (const p of [...read]) {
    if (p === leanSources) continue;
    for (let d = p; ; d = path.dirname(d)) { const nm = path.join(d, 'node_modules'); if (fs.existsSync(nm)) read.add(nm); if (path.dirname(d) === d) break; }
  }
  const out = new Set();
  for (const p of read) { out.add(p); try { out.add(fs.realpathSync(p)); } catch { /* a path that does not exist reads nothing */ } }
  return [...out];
}
// the environment a process that runs a unit's code starts with: only the variables lean's own code reads there (LEAN_*,
// NODE_OPTIONS, the cache folder lower.mjs derives from XDG_CACHE_HOME or HOME, PATH). The permission model has no switch
// for process.env, and code that leaves the vm context reads the real process's (design/sandbox-boundary.md), so what
// the process is not given is what that code cannot read
const KEPT_ENV = /^(?:LEAN_\w*|NODE_OPTIONS|PATH|HOME|XDG_CACHE_HOME)$/;
export const workerEnv = (env = process.env) => Object.fromEntries(Object.entries(env).filter(([k]) => KEPT_ENV.test(k)));
// A sandboxed process keeps only the kept set in its own environment, whatever the platform added at exec: macOS's
// loader puts __CF_USER_TEXT_ENCODING into every child whatever env it was given, so the reduction is applied by the
// process to itself, once, before any unit code loads. Called by the worker and by the parentless unit's child.
export function scrubEnv(env = process.env) { for (const k of Object.keys(env)) if (!KEPT_ENV.test(k)) delete env[k]; return env; }
// a path outside the trees a process under the permission model may read does not exist for the run: the model throws
// on an existence check there (a walk up for a package.json, a config, a values file), where the run asks whether it exists
export function absentOutsideReads() {
  const exists = fs.existsSync;
  fs.existsSync = (p) => { try { return exists(p); } catch (e) { if (e && e.code === 'ERR_ACCESS_DENIED') return false; throw e; } };
}
// the sandbox of one run under the project's list (sandbox-list.mjs, design/sandbox-allow-list.md): today's reads and
// writes less what the list refuses, plus what it allows; a program only when the list allows one (the permission model's
// switch is all or nothing, so the names are held in the child by guardSpawn). The default list leaves the flags as they were
export function workerSandbox(opts) {
  const loaded = opts.sandboxList ?? currentSandboxList();
  const cases = process.env.LEAN_LIBRARY_CASES ? path.resolve(process.env.LEAN_LIBRARY_CASES) : null;
  if (cases) fs.mkdirSync(cases, { recursive: true });
  const applied = applyList(loaded, workerReads(opts), cases ? [cases] : []);
  const flags = ['--permission', ...applied.reads.map((p) => `--allow-fs-read=${p}`), ...netFlags(netMode())];
  if (cases) flags.push(`--allow-fs-read=${cases}`);
  flags.push(...applied.writes.map((p) => `--allow-fs-write=${p}`));
  if (applied.spawn?.allow.length) flags.push('--allow-child-process');
  return { flags, spawn: applied.spawn, entry: loaded.source.kind === 'commit' ? (spawned = []) => ({ list: loaded.source, process_list: loaded.list.process_list, refused: [...applied.refused, ...spawned] }) : null };
}
export const workerFlags = (opts) => workerFlagsFrom(workerSandbox(opts).flags);
export function workerFlagsFrom(flags) {
  // the worker's heap: its share of the machine when the process that runs units in parallel states one
  // (LEAN_WORKER_HEAP_MB: the suite gives each of its JOBS workers an equal part of 60 percent of memory), else a quarter
  // of the machine, never below V8's default. A spinning call allocates for its whole wall allowance (a chunking loop
  // pushing empty slices reached 4 GB in 16 s); the heaps of every worker together must fit the machine, or the
  // operating system refuses the next page and V8 aborts the process at whatever size it had (an admission suite lost
  // one unit that way at 4 GB on a 48 GB machine under eleven workers), where its own limit would have been the
  // harness's bound. An exhausted heap still aborts the process and loses the unit (ASK: the worker exited).
  const fromEnv = Number(process.env.LEAN_WORKER_HEAP_MB);
  const heapMb = fromEnv > 0 ? Math.floor(fromEnv) : Math.max(4096, Math.floor(os.totalmem() / 4 / 1048576));
  return [...process.execArgv.filter((x) => !/^--(permission|allow-|max-old-space-size)/.test(x)), `--max-old-space-size=${heapMb}`, ...flags];
}
const crumbOf = (c) => (c ? `${c.phase}${c.input !== null && c.input !== undefined ? ` (input ${c.input})` : ''}${c.side ? `, the ${c.side} side running` : ''}${c.loading ? `, loading ${c.loading}` : ''}` : 'start');
// a unit whose parent does not hold it runs as today (new-unit.mjs starts its own bounded process); every other unit runs
// in the child under the bound, the module unit always (an added file's evaluation runs candidate-only there: runModuleUnit)
const parentHolds = (parent, unit) => unit === MODULE_UNIT || (!!parent && fs.existsSync(parent) && topLevelFunctions(ts.createSourceFile(parent, fs.readFileSync(parent, 'utf8'), ts.ScriptTarget.Latest, true)).has(unit));
let recordHeadCache = null;
// lean's own head, as pr.mjs leanVersion reads it: the commit of the checkout that TRACKS this file; a copy of lean placed
// inside some other repository (a harness's temp folder under its own checkout) must not name that repository's head
const leanHeadForRecords = () => {
  if (recordHeadCache) return recordHeadCache;
  const here = path.dirname(new URL(import.meta.url).pathname);
  const tracked = spawnSync('git', ['-C', here, 'ls-files', '--error-unmatch', 'run.mjs'], { encoding: 'utf8' });
  const head = tracked.status === 0 ? spawnSync('git', ['-C', here, 'rev-parse', 'HEAD'], { encoding: 'utf8' }) : null;
  if (!head || head.status !== 0) console.error(`witness record head unavailable (${head ? `exit ${head.status}: ${head.stderr ?? head.error?.message}` : 'this copy of lean has no git history of its own'})`);
  return recordHeadCache = head && head.status === 0 ? head.stdout.trim() : 'unknown';
};
// a member named by its property, `C.m`, where neither side holds a unit of that name and a side holds the getter unit
// `C.get_m` (common.mjs names an accessor unit by its kind): the source reaches `C.m` by reading the property, so the
// unit run is the getter, driven by that read (pickUnit). A setter is reached by a write only: never by the property's name
function propertyRead(parent, candidate, unit) {
  const at = unit.lastIndexOf('.');
  if (at <= 0 || unit === MODULE_UNIT) return null;
  const units = [parent, candidate].map((f) => (f && fs.existsSync(f) ? topLevelFunctions(ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true)) : new Map()));
  if (units.some((u) => u.has(unit))) return null;
  const getter = `${unit.slice(0, at)}.get_${unit.slice(at + 1)}`;
  return units.some((u) => u.has(getter)) ? getter : null;
}
export async function runPair(opts) {
  const read = opts.unit ? propertyRead(opts.parent, opts.candidate, opts.unit) : null;
  if (read) return { ...await runPair({ ...opts, unit: read }), unit: opts.unit, 'read-as': read };
  if (!opts.recordHead) opts = { ...opts, recordHead: leanHeadForRecords() }; // the lean head every record names, read once per process
  if (opts.inProcess || !parentHolds(opts.parent, opts.unit)) return runPairInProcess(opts);
  // the unit's CPU bound covers its real work; a call that hits its own --ms bound is paid for by that bound, so the
  // unit's allowance grows by ms for each such call the worker reports (for_desugar chunks: half the drawn sizes spin,
  // 2 s each, two sides, 30 inputs: 60 s of bounded calls beside the work, against a 120 s bound). CPU time does not
  // stretch with load: a spinning call under a load of k per core takes k times the wall but burns the same CPU
  const seconds = unitSecondsValue(opts.unitSeconds);
  const callMs = Number(opts.ms ?? 2000);
  const { unitSeconds, inProcess, ...rest } = opts;
  return new Promise((resolve) => {
    let last = null, done = false;
    const box = workerSandbox(opts);
    const child = fork(workerFile, [], { execArgv: workerFlagsFrom(box.flags), env: workerEnv(), stdio: ['ignore', 'inherit', 'inherit', 'ipc'], serialization: 'json' });
    const end = (res) => { if (done) return; done = true; clearTimeout(timer); cpuWatch.stop(); if (!res.record) res.record = incompleteUnitRecord(opts, res.reason ?? 'worker returned no capture'); if (box.entry) res.sandboxList = box.entry(res.sandboxSpawned); delete res.sandboxSpawned; resolve(res); };
    const started = Date.now();
    let cpuSeen = 0, timedOut = 0, contention = 1;
    const allowance = () => seconds * contention + timedOut * callMs / 1000; // the bound for an idle core, stretched by the unit's measured CPU slowdown, plus the budget of every call that hit its own
    const killAt = (why) => {
      try { child.kill('SIGKILL'); } catch { /* already gone */ }
      end({ verdict: 'ASK', kind: 'spin-bound', unit: opts.unit, reason: `spin-bound: lane B passed its ${why} bound of ${seconds} s per unit (--unit-seconds${contention > 1 ? `, stretched ${contention.toFixed(2)} times by the measured CPU slowdown of a shared core` : ''}${timedOut ? `, plus ${timedOut} call(s) at their own ${callMs} ms bound` : ''}) after ${Math.round((Date.now() - started) / 1000)} s of wall time and ${Math.round(cpuSeen)} s of CPU time; the worker was killed at ${crumbOf(last)}`, bound: { unitSeconds: seconds, cpuSeconds: Math.round(cpuSeen), wallSeconds: Math.round((Date.now() - started) / 1000), killedAt: last, n: opts.n ?? 200, seed: opts.seed ?? 1, ms: opts.ms ?? 2000 } });
    };
    const wallGuard = () => setTimeout(() => killAt(psUnavailable ? 'wall-clock' : `far wall-clock guard (${FAR_GUARD} times the CPU-time)`), Math.max(0, allowance() * 1000 * (psUnavailable ? 1 : FAR_GUARD) - (Date.now() - started)));
    let timer = wallGuard();
    const cpuWatch = watchCpu(child.pid, seconds, { onSample: (cpu) => { cpuSeen = cpu; }, onBound: (cpu) => { cpuSeen = cpu; killAt('CPU-time'); },
      onUnavailable: () => { clearTimeout(timer); timer = setTimeout(() => killAt('wall-clock'), Math.max(0, allowance() * 1000 - (Date.now() - started))); } });
    child.on('message', (m) => {
      if (m && m.crumb) { last = m.crumb; const c = Number(m.crumb.contention) || 1; if (m.crumb.timedOut > timedOut || c !== contention) { timedOut = Math.max(timedOut, m.crumb.timedOut || 0); contention = c; const w = cpuWatched.get(child.pid); if (w) w.bound = allowance(); clearTimeout(timer); timer = wallGuard(); } return; }
      if (!m || !Object.hasOwn(m, 'result')) return;
      if (m.drained && guarded) { done = true; clearTimeout(timer); cpuWatch.stop(); Object.assign(crumb, { phase: last?.phase ?? crumb.phase, input: last?.input ?? null, loading: last?.loading ?? null }); return; } // the child's event loop drained before a verdict: the caller's loop drains as the in-process run's did, and its guard names what was pending
      end(m.result);
    });
    child.on('error', (e) => end({ verdict: 'ASK', unit: opts.unit, reason: `harness: the lane B worker failed to start: ${String(e && e.message).slice(0, 200)}` }));
    child.on('exit', (code, signal) => end({ verdict: 'ASK', unit: opts.unit, reason: `harness: the lane B worker exited (${signal ?? `code ${code}`}) before a verdict; pending: ${crumbOf(last)}` }));
    child.send({ opts: { ...rest, boundSeconds: seconds, sandboxList: undefined, ...(box.spawn ? { sandboxSpawn: box.spawn } : {}) } }); // boundSeconds: the unit's CPU bound this parent enforces, for the stages that take a share of it (programs.mjs maxCpuMs)
  });
}
// a WITNESS names the same-file callees it may have come through (callees.mjs): `through` on each witness, and
// `where.cause = 'callee'` when the unit's own text is equal on both sides
export async function runPairInProcess(opts) { runsInFlight++; try { return await runPairInFlight(opts); } finally { runsInFlight--; } } // a unit run in flight: the late hooks record what escapes it
async function runPairInFlight(opts) {
  readLoadFactor(); // the machine's share of a core for this unit: the wall allowance of every in-process watchdog
  fieldsProject = opts.project ?? true; // the emit mode every file of this run compiles with (compileWithSites)
  rateSamples.length = 0; sampleContention(); tellCrumb(); // this unit's CPU slowdown against the suite's idle-core baseline, re-sampled at every input: the process that holds the bound stretches it
  if (netMode() === 'deny') denyNetwork({ side: () => crumb.side }); // the network-denied mode (net-deny.mjs): once per process, before the unit's code loads
  const deniedFrom = deniedAttempts().length; // this unit's refused attempts are the ones made from here on
  if (opts.sandboxSpawn) guardSpawn(opts.sandboxSpawn); // the programs the project's list allows (sandbox-list.mjs), once per process, before the unit's code loads
  const spawnFrom = spawnRefusals().length;
  const owner = enclosingUnitName(opts.candidate, opts.unit);
  if (owner) return { ...await runPairInFlight({ ...opts, unit: owner }), unit: opts.unit, 'covered-by': owner };
  const unitRecord = { schema: 'witness-record/v2', version: 2, invocation: { kind: 'unit' }, unit: opts.unit, seed: opts.seed ?? 1, leanHead: opts.recordHead ?? 'unknown', drawDomain: { parameters: [], status: 'not recorded', reason: 'input plan not reached' }, draws: [], reach: { status: 'not recorded', reason: 'sandbox statement markers retain only current/completed sites; no per-line visit accumulator or diff bitmap' } };
  beginUnitRecord(unitRecord);
  let res;
  try { res = annotateWitness(await runPairOnce({ ...opts, unitRecord }), opts.parent, opts.candidate, opts.unit); }
  finally { finishUnitRecord(unitRecord); }
  if (networkDenied()) unitRecord.sandbox = res.sandbox ?? sandboxEntry(deniedFrom); // the mode, what holds it, and every connection or lookup it refused, with the side that made it; a unit run in another process (new-unit.mjs) brings that process's entry
  if (opts.sandboxSpawn) res.sandboxSpawned = spawnRefusals().slice(spawnFrom); // the programs this unit's code tried and the list refused; the parent adds them to the list's rows
  res.record = unitRecord; // one home: lane B's result; check.mjs and pr.mjs pass it to the certificate
  for (const w of res.witnesses ?? []) if (!w.record) w.record = { schema: 'witness-record/v2', version: 2, seed: unitRecord.seed, leanHead: unitRecord.leanHead, invocation: { kind: 'unrecorded' }, unrecorded: [{ site: 'runPairInFlight: non-single-call witness', reason: 'program/sequence initialization and command arguments not captured at this output boundary' }] };
  const ud = res?.bound?.undriven; if (ud && ['PASS-bounded', 'PASS-decided'].includes(res.verdict)) { res.verdict = 'ASK'; res.kind = 'callback-undriven'; res.reason = `callback-undriven: on ${ud.inputs} input(s) a function the unit handed out could not be driven (${ud.first.reasons.join('; ')}, first at input ${ud.first.input}); an undriven callback is undecided, never a difference`; } // no rung found a WITNESS: the gap is the verdict's (design/callbacks.md)
  for (const witness of res.witnesses ?? []) {
    if (witness.where?.lines || !witness.parent || !witness.candidate) continue;
    const a = witness.parent, b = witness.candidate;
    if (JSON.stringify(a.threw) !== JSON.stringify(b.threw) && (a.site || b.site)) {
      witness.where.lines = { kind: 'completion', parent: siteLines(a.site), candidate: siteLines(b.site) };
      continue;
    }
    if (a.trace && b.trace && JSON.stringify(a.trace) !== JSON.stringify(b.trace)) {
      witness.where.lines = firstDifference({ trace: a.trace }, { trace: b.trace }).lines;
    }
  }
  const fe = res?.bound?.frontEnd; if (fe && fe.layers) fe.layers = { ...fe.layers, tree: { verdict: res.verdict, ...fe.layers.tree } }; // the tree layer's verdict is lane B's; the styles layer keeps its own
  return res;
}
// the --values flag: a path, `none` for no values file, absent for the nearest `.lean/values.json` above the candidate
export const valuesOpt = (v) => (v === undefined ? undefined : v === 'none' ? null : v);
// the depth --deep states: true or a bare flag is one level; a number k is k levels; anything else is a tree of names
export const deepDepth = (deep) => (deep === true ? 1 : Number.isInteger(Number(deep)) && Number(deep) > 0 ? Number(deep) : 0);
const componentsText = (k) => (k > 0 ? `same-package function components rendered ${k === 1 ? 'one level down' : `${k} levels down`} on their own hook frames, top down where their elements are placed, each useContext read from the nearest provider element above it (--deep${k === 1 ? '' : '=' + k})` : 'a tree of names: a component tag is its name and props');
// the layers of a rendered unit's certificate (design/ui-layers.md): the tree, to the stated depth with its context, and
// the resolved styles; each with its assumptions; what neither layer observes is named
function layersOf(styles) {
  const layers = { styles: null, notObserved: 'pixels, layout, the committed DOM, the accessibility tree; styles beyond the pinned utilities' };
  Object.defineProperty(layers, 'tree', { enumerable: true, get: () => ({
    depth: deepMode.depth, components: componentsText(deepMode.depth),
    rendered: [...deepLog.rendered].map(([name, depth]) => ({ component: name, depth })),
    handles: [...deepLog.handles].map(([name, why]) => ({ component: name, why })),
    contexts: [...deepLog.contexts.values()],
    assumptions: deepMode.depth > 0 ? ['a component renders where its element is placed, after its owner returned, top down (React\'s order); its hook frame is keyed by that place', `components deeper than ${deepMode.depth} level(s) are handles: their name and props are observed, never their output`, 'a package component is a handle: its children are rendered in place, as if it passed them through, and it provides no context', `useContext: ${contextRow()?.effect ?? 'the nearest provider above the frame'}`, 'a rendered child\'s effects run once with the mount of the one-render observation; the command sequences re-run the unit\'s own effects only'] : ['a component tag is its name and props; no child is rendered', `useContext at the unit's root: ${contextRow()?.effect ?? 'the outside value'}`],
  }) });
  Object.defineProperty(layers, 'styles', { enumerable: true, get: () => styles.result() });
  return layers;
}
// the inputs of a unit: its spec (shaped by what both versions read), the enumerated small heaps, and the i-th draw on
// one side's environment (a heap builder first, then the seeded generator with its sharing); each side draws its own
// copy, so a replay draws input i on a fresh environment seeded as that side's was and gets the input both runs started from
// `values`: the project's values file (a path; null for none; undefined: the nearest `.lean/values.json` above the candidate)
export function inputPlan(parent, candidate, unit, { project = true, seed = 1, values = undefined } = {}) {
  const vfile = values === undefined ? findValues(candidate) : values;
  const spec = specOf(candidate, unit, { project, usageFrom: parent, values: vfile ? readValues(vfile) : null }); // the inputs are shaped by what both versions read and compare against (usage.mjs), and the values the project lists come first
  const heaps = enumerateHeaps(spec, 2, seed); // the small heaps of the unit's record shapes, enumerated once; a builder makes a fresh copy per side
  spec.walkFrom = heaps.builders.length; // the generated inputs walk the compared boundaries from the first one after the enumerated heaps
  return { spec, heaps, draw: (i, env) => { const inputs = i < heaps.builders.length ? heaps.builders[i](env) : aliasInputs(inputsFor(spec, seed, i, env), spec, seed, i); enterWorld(env, spec, i, inputs); return inputs; } }; // a full-world input after the draw (fake.mjs enterWorld)
}
// ----- the module unit (common.mjs MODULE_UNIT, design/module-unit.md) -----
// Its call is the module's evaluation, as the loader runs it for every unit (the world answers with handles while a module
// loads); input i is the environment's seed (the clock, random), the same on both sides. The observation: the outcome (the
// module loaded, or what it threw), the requests in init order, the work it armed (recorded, never fired), its exports by
// key and its own bindings by name (common.mjs moduleStatements `declares`). A binding only one side declares is no
// observation (only the units read it, each checked as its own unit); a function value is its handle, never its text.
// The witness names the statement on each side: the statement whose mark (compileWithSites) was the last entered before
// the first differing request, armed work or thrown value; for a binding or an export key, the last top-level statement
// that writes it.
const moduleSideOf = (file) => {
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const statements = moduleStatements(sf).map((m) => {
    const start = m.node.getStart(sf), site = { file: path.resolve(file), start: sf.getLineAndCharacterOfPosition(start).line + 1, end: sf.getLineAndCharacterOfPosition(m.node.end - 1).line + 1 };
    return { ...m, site: Object.defineProperty(site, 'text', { value: sf.text.slice(start, m.node.end).slice(0, 200) }) };
  });
  return { file: path.resolve(file), statements };
};
async function observeModule(side, i, seed, ms, root) {
  const env = new Environment(seed * 7919 + i);
  const box = sandbox(env, root);
  const marks = []; let bindings = null;
  env.siteState.enter = (f, index, b) => { if (f !== side.file) return; marks.push({ index, trace: env.trace.length, pending: env.pending.length }); if (b) bindings = b; };
  let outcome, exportsObj = null;
  lateErrors.length = 0;
  try { exportsObj = guardedCall(env, () => box.load(side.file), ms); outcome = { returned: 'evaluated' }; }
  catch (e) {
    if (e instanceof CallTimeout || e?.message === '__timeout__') { callTimedOut(); return { harness: 'timeout' }; }
    if (e instanceof BudgetError) return { harness: `budget: ${e.message}` };
    if (harnessStop(e)) return { harness: String(e && e.message).slice(0, 200) };
    if (e && (e instanceof RangeError || e.name === 'RangeError') && /call stack/i.test(String(e.message))) return { harness: 'stack overflow' };
    outcome = { threw: render(e) };
  }
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r)); // a load-time continuation settles (or fails) now, inside this side
  for (const m of lateErrors.splice(0)) env.record('late-error', 'process', [m.slice(0, 200)]);
  const trace = env.trace.slice(), pending = env.pending.map(({ id, ...rest }) => rest); // a timer id is an arm counter, not an observation
  const read = (get) => { try { return render(get()); } catch { return { $uninitialized: true }; } };
  const getters = bindings ? bindings() : {};
  const values = Object.fromEntries(Object.keys(getters).sort().map((k) => [k, read(getters[k])]));
  const exported = exportsObj && (typeof exportsObj === 'object' || typeof exportsObj === 'function') ? Object.fromEntries(Object.keys(exportsObj).filter((k) => !k.startsWith('__lean')).sort().map((k) => [k, read(() => exportsObj[k])])) : null;
  env.trace.length = trace.length; // a getter of an export (a re-export reads the other module) is the harness's read, never the module's request
  return Object.defineProperty({ outcome, trace, pending, bindings: values, exports: exported }, 'marks', { value: marks });
}
// the statement of a side for the k-th record of a list the marks count (trace, pending): the last statement entered before it
const markedStatement = (side, obs, list, k) => { let at = null; for (const m of obs.marks ?? []) if (m[list] <= k) at = m.index; else break; return side.statements.find((s) => s.index === at) ?? null; };
const lastEntered = (side, obs) => { const m = (obs.marks ?? []).at(-1); return m ? side.statements.find((s) => s.index === m.index) ?? null : null; };
const lastWriter = (side, test) => side.statements.filter(test).at(-1) ?? null;
function moduleDifference(sides, oP, oC) {
  const lines = (p, c) => ({ kind: 'module statement', parent: p ? siteLines(p.site) : null, candidate: c ? siteLines(c.site) : null });
  const J = JSON.stringify;
  if (J(oP.outcome) !== J(oC.outcome)) return { field: 'outcome', lines: lines(lastEntered(sides.parent, oP), lastEntered(sides.candidate, oC)) };
  for (const list of ['trace', 'pending']) {
    const a = oP[list], b = oC[list];
    if (J(a) === J(b)) continue;
    let k = 0; while (k < Math.max(a.length, b.length) && J(a[k]) === J(b[k])) k++;
    return { field: list, index: k, parent: a[k] ?? null, candidate: b[k] ?? null, lines: lines(markedStatement(sides.parent, oP, list, k), markedStatement(sides.candidate, oC, list, k)) };
  }
  const order = (side, key) => { const s = lastWriter(side, key); return s ? s.index : Infinity; };
  const shared = Object.keys(oP.bindings).filter((n) => Object.hasOwn(oC.bindings, n) && J(oP.bindings[n]) !== J(oC.bindings[n]));
  if (shared.length) {
    const name = shared.sort((x, y) => order(sides.parent, (s) => s.writes.includes(x)) - order(sides.parent, (s) => s.writes.includes(y)))[0];
    const writer = (side) => lastWriter(side, (s) => s.writes.includes(name));
    return { field: 'bindings', binding: name, parent: oP.bindings[name], candidate: oC.bindings[name], lines: lines(writer(sides.parent), writer(sides.candidate)) };
  }
  if (J(oP.exports) !== J(oC.exports)) {
    const keys = [...new Set([...Object.keys(oP.exports ?? {}), ...Object.keys(oC.exports ?? {})])].filter((k) => J(oP.exports?.[k]) !== J(oC.exports?.[k]));
    const writes = (k) => (s) => s.exportKeys.includes(k) || s.exportKeys.includes('*');
    const key = keys.sort((x, y) => order(sides.parent, writes(x)) - order(sides.parent, writes(y)))[0];
    return { field: 'exports', key, parent: oP.exports?.[key] ?? { $absent: true }, candidate: oC.exports?.[key] ?? { $absent: true }, lines: lines(lastWriter(sides.parent, writes(key)), lastWriter(sides.candidate, writes(key))) };
  }
  return null;
}
// the draws past lane B's first witness (design/w8n-all-sites.md): they look for further sites until the budget of n
// inputs is spent, WITNESS_SITES sites are held, or WITNESS_SHARE of the unit's seconds has passed since the first
// witness (the verdict is already WITNESS; the unit's bound must never turn it into a spin-bound ASK)
function extraDraws(opts) {
  const ms = WITNESS_SHARE * unitSecondsValue(opts.unitSeconds) * 1000;
  let first = null, timed = false;
  return {
    full: false,
    over(diffs) { if (!diffs.length || process.env.LEAN_BREAK === 'w8n-all-sites') return false; first ??= Date.now(); this.past = true; if (Date.now() - first > ms) timed = true; return timed; },
    summary(diffs, n, stopped = null) { if (process.env.LEAN_BREAK === 'w8n-all-sites') return undefined; return { held: diffs.length, differing: diffs.differing ?? diffs.length, cap: WITNESS_SITES, stop: this.full ? `${WITNESS_SITES} sites held` : this.error ? `an error ended the draws (${this.error})` : stopped ? `a harness stop (${stopped})` : timed ? `${WITNESS_SHARE} of the unit's seconds past the first witness` : `the budget of ${n} inputs`, key: 'where.field, the two sides\' operations, the candidate line' }; },
  };
}
// the observation both sides are compared on: a binding counts when both sides declare it
const comparable = (o, other) => ({ ...o, bindings: Object.fromEntries(Object.entries(o.bindings).filter(([k]) => Object.hasOwn(other.bindings, k))) });
async function runModuleUnit(opts) {
  const { parent, candidate, n = 200, seed = 1, ms = 2000 } = opts, unit = MODULE_UNIT;
  if (!candidate || !fs.existsSync(candidate)) return { verdict: 'ASK', unit, reason: 'module unit: the candidate file is absent; a file the head deleted has its module unit as a removed row' };
  if (!parent || !fs.existsSync(parent)) return newModuleUnit(opts);
  const roots = { parent: findRoot(parent), candidate: findRoot(candidate) };
  setRoots(sideLocations(parent, candidate, roots));
  const sides = { parent: moduleSideOf(parent), candidate: moduleSideOf(candidate) };
  const bound = { n, seed, ms, observation: 'the module\'s evaluation: its outcome, the requests in init order, the work it armed (never fired), its exports by key, the bindings both sides declare', inputs: 'input i seeds the environment (the clock, random); while a module loads the world answers with handles', statements: { parent: sides.parent.statements.length, candidate: sides.candidate.statements.length } };
  const diffs = [], skipped = [], extra = extraDraws(opts); let stopped = null;
  for (let i = 0; i < n; i++) {
    if (extra.over(diffs)) break;
    step('module', i);
    const oP = await observeModule(sides.parent, i, seed, ms, roots.parent), oC = await observeModule(sides.candidate, i, seed, ms, roots.candidate);
    if (oP.harness === 'timeout' && oC.harness === 'timeout') { skipped.push(i); continue; }
    if (oP.harness || oC.harness) { const reason = `input ${i}: ${oP.harness ? 'parent ' + oP.harness : 'candidate ' + oC.harness}`; if (extra.past) { stopped = reason; break; } return { verdict: 'ASK', unit, reason, bound }; } // past the first witness a harness stop ends the draws
    const cP = comparable(oP, oC), cC = comparable(oC, oP);
    if (JSON.stringify(cP) === JSON.stringify(cC)) continue;
    if (keepDifference(diffs, { input: i, args: [], parent: cP, candidate: cC, where: moduleDifference(sides, oP, oC) })) { extra.full = true; break; }
  }
  if (diffs.length) return { verdict: 'WITNESS', unit, witnesses: diffs, bound: { ...bound, sites: extra.summary(diffs, n, stopped) } };
  if (skipped.length) bound.skipped = { inputs: skipped.length, reason: 'both sides timed out on that input' };
  if (skipped.length >= n) return { verdict: 'ASK', unit, reason: `every input timed out (${skipped.length} of ${n})`, bound };
  return { verdict: 'PASS-bounded', unit, bound };
}

// the module unit of a file the parent does not have (an added file): its evaluation alone, as a function the parent does
// not hold is run alone (new-unit.mjs): n evaluations, each seeded as the compared ones are; NEW records what they did
// (the outcome, the shape of the requests and of the armed work, per input) and makes no equality claim. A harness stop
// (a timeout, the budget) is ASK.
async function newModuleUnit(opts) {
  const { candidate, n = 200, seed = 1, ms = 2000 } = opts, unit = MODULE_UNIT;
  const root = findRoot(candidate);
  setRoots(sideLocations(candidate, candidate, { parent: root, candidate: root }));
  const side = moduleSideOf(candidate);
  const bound = { n, seed, ms, observation: 'the module\'s evaluation alone: its outcome, the requests in init order, the work it armed (never fired)', inputs: 'input i seeds the environment (the clock, random); while a module loads the world answers with handles', statements: { candidate: side.statements.length } };
  const base = { candidateOnly: true, unit, file: candidate };
  let faults = 0; const faultExamples = [], shapes = new Map();
  for (let i = 0; i < n; i++) {
    step('module', i);
    const o = await observeModule(side, i, seed, ms, root);
    if (o.harness) return { ...base, verdict: 'ASK', loaded: i > 0, inputs: i, faults, reason: `input ${i}: candidate ${o.harness}`, bound };
    if (Object.hasOwn(o.outcome, 'threw')) { faults++; if (faultExamples.length < 3) faultExamples.push({ input: i, error: o.outcome.threw, where: { kind: 'module statement', candidate: lastEntered(side, o) ? siteLines(lastEntered(side, o).site) : null } }); }
    const shape = { outcome: Object.hasOwn(o.outcome, 'threw') ? 'threw' : 'evaluated', trace: o.trace.map(({ op, path }) => ({ op, path })), pending: o.pending.map((x) => x.op) };
    const key = JSON.stringify(shape); const entry = shapes.get(key) ?? { ...shape, inputs: 0 }; entry.inputs++; shapes.set(key, entry);
  }
  return { ...base, verdict: 'NEW', loaded: true, inputs: n, seed, fakes: [], faults, faultExamples, traceShape: [...shapes.values()], bound };
}

async function runPairOnce(opts) {
  probes = null; // the branch probes are this unit's, set below when its search runs
  if (opts.unit === MODULE_UNIT) return runModuleUnit(opts);
  const { parent, candidate, unit, n = 200, seed = 1, ms = 2000, project = true, sequenceDepth = 2, sequenceBreadth = 4, sequenceInputs = 2, deep = false } = opts;
  deepMode.depth = deepDepth(deep); deepLog.rendered.clear(); deepLog.handles.clear(); deepLog.contexts.clear();
  const styles = stylesLayer({ parent: projectConfig(parent), candidate: projectConfig(candidate) }); let treeDone = false; // the styles layer reads every input both sides rendered, past the tree layer's witnesses too; each side's classes under its own project's Tailwind configuration (the nearest tailwind.config.* or CSS entry, exec/styles.mjs projectConfig)
  // a missing parent unit has no equality question
  if (!parent || !fs.existsSync(parent) || !topLevelFunctions(ts.createSourceFile(parent, fs.readFileSync(parent, 'utf8'), ts.ScriptTarget.Latest, true)).has(unit)) {
    return runNew(opts);
  }
  let plan; step('inputs');
  try { plan = inputPlan(parent, candidate, unit, { project, seed, values: opts.values }); } catch (e) { return { verdict: 'ASK', reason: `spec: ${e.message}` }; }
  const { spec, heaps } = plan;
  // the input search (search.mjs): on unless LEAN_SEARCH=0 or --no-search; with it lane B reaches for the unit's changed
  // statements (design/w9i-reach.md). LEAN_BREAK=w9i-reach restores the earlier rule: the w3c search behind its flag only
  const reachOn = process.env.LEAN_BREAK !== 'w9i-reach', unitStart = Date.now();
  const searchOn = opts.search ?? (process.env.LEAN_SEARCH ? process.env.LEAN_SEARCH === '1' : reachOn);
  const reach = searchOn && reachOn;
  const worldOn = (opts.world ?? process.env.LEAN_WORLD_SEARCH !== '0') && !broken('w9l-bounds'); // the world search (search.mjs searchWorld): on unless LEAN_WORLD_SEARCH=0 or its break
  let sPlan = null, wPlan = null; probes = null;
  if (searchOn || worldOn) { // one plan: the input search's branch and reach probes when it runs, the value probes of the changed lines when the world search runs
    try { const p = searchPlan(parent, candidate, unit, (f) => fs.readFileSync(f, 'utf8'), { reach }); if (searchOn) sPlan = p; if (worldOn) wPlan = p; probes = new Map(Object.entries(p.files).map(([f, e]) => [f, { ...e, table: searchOn ? e.table : null, reach: searchOn ? e.reach : [], values: worldOn ? e.values : [] }])); }
    catch (e) { if (searchOn) sPlan = { error: String(e && e.message).slice(0, 160) }; }
  }
  const worldStarts = []; // per input that ran on both sides: its draw, the world answers it consumed, whether the change infected it (the world search's start)
  const threwOf = (oP, oC) => !!(oP.outcome && Object.hasOwn(oP.outcome, 'threw')) || !!(oC.outcome && Object.hasOwn(oC.outcome, 'threw'));
  const ranOf = (sides) => (sides.parent.env.siteState.ran?.() ?? 0) + (sides.candidate.env.siteState.ran?.() ?? 0);
  // the guide of a run (compared.mjs): the literals the functions it entered on either side compare a read against; a
  // frame's site is a statement of its own function (patch.mjs statementMarks)
  const guideRunOf = (sides) => { const sites = new Map(); for (const s of [sides.parent, sides.candidate]) for (const f of s.env.siteState.frames?.() ?? []) { const x = f.site; if (x && x.file) sites.set(`${x.file}:${x.start}:${x.end}`, x); } return guideOf(sites.values(), comparedOfFile); };
  const answeredOf = (sides) => { const seen = new Set(), out = []; for (const s of [sides.parent, sides.candidate]) for (const a of s.env.answered) if (!seen.has(a.path)) { seen.add(a.path); out.push(a); } return out; };
  // infected: the changed lines' values differ between the sides; at: how many world answers the sides had consumed when the first differing value was computed
  const infectionOf = (sides) => {
    const P = sides.parent.env.siteState, C = sides.candidate.env.siteState;
    if (JSON.stringify(P.values) === JSON.stringify(C.values)) return { infected: false, at: null };
    let j = 0; while (j < P.values.length && j < C.values.length && P.values[j] === C.values[j]) j++;
    const atOf = (S) => (j < S.valueAt.length ? S.valueAt[j] : Infinity); // a side with no value there: the other side computed it
    // falsy (design/w9ac-compare-literals.md): the sides computed as many values and each pair that differs is falsy on
    // both sides ('' against null): a truth test or `x || d` erases it, so the world search climbs such a draw last
    const falsy = P.values.length === C.values.length && P.values.every((v, k) => v === C.values[k] || (FALSY_SEEN.has(v) && FALSY_SEEN.has(C.values[k])));
    return { infected: true, at: Math.min(atOf(P), atOf(C)), ...(falsy ? { falsy: true } : {}) };
  };
  const drawHits = []; // per input that ran on both sides: the target branches it reached (the search's start)
  const hitsOf = (sides) => new Set([...sides.parent.env.siteState.hits, ...sides.candidate.env.siteState.hits]);
  // the unit's changed statements an input completed (either side), as `<side> <line>`: a witness carries them, and one
  // that completes a statement no kept witness completed is its own site (exec/sites.mjs keepDifference)
  const reachedOf = (hits) => (reach && sPlan?.statements && hits ? [...new Set(sPlan.statements.filter((t) => hits.has(t)).map((t) => { const d = sPlan.statementOf(t); return `${d.side} ${d.line}`; }))] : null);
  const unitRecord = opts.unitRecord;
  unitRecord.drawDomain = { status: 'recorded', parameters: spec.params.map(p => ({ name: p.name, spec: p.spec, optional: !!p.optional, count: 0, families: {} })), requested: n, seed, heaps: heaps.builders.length, known: knownLength(spec), boundaryWalk: spec.shaped ? walkLength(spec) : 0 };
  const roots = { parent: findRoot(parent), candidate: findRoot(candidate) };
  setRoots(sideLocations(parent, candidate, roots)); // the directories lean loaded the two copies from render as one token (fake.mjs setRoots)
  factFiles = new Set([path.resolve(parent), path.resolve(candidate)]); // the callee facts' record: each side's own file (callee-trace.mjs)
  const factSides = { parent: {}, candidate: {} }; // per side, per call site of its file: what lane B saw the calls do (bound.calleeFacts)
  const diffs = [], records = []; // records: the unit's built-in calls of the library table, checked against it at the end
  const bridgeSeen = { calls: new Set(), callbacks: new Set() }; // the bridge calls the fake for an unset global answered on the parent's mounts, and the callbacks it fired, by path (exec/bridge.mjs)
  const states = []; // every state lane B reached: the input as drawn and, for a rendered unit, the tree it rendered (bound.states)
  let harnessAsk = null, sawJsx = false, timeoutAt = null; const skipped = [], oneSided = []; // timeoutAt: where the first timed-out input stood (stoppedAt)
  const reached = { body: 0, guard: 0 }; let firstGuard = null; // per input: whether the call got past its guards (atGuard), the bound's count
  const knownRun = spec.known ? { inputs: 0, body: 0 } : null; // the inputs of the known phase (the project's listed values) and how many of them reached the body
  let recorderRetries = 0; // inputs re-run without the recorder after a harness stop under it (its wrapper deepens the stack and costs a little time); the verdict never depends on the recorder
  const sharedFree = sharedFreeReads(parent, candidate), runFree = new Set(); // the names both versions read undeclared, and those a call has met (freeReads)
  const freeThrown = (o) => { const e = o?.raw && Object.hasOwn(o.raw, 'threw') ? o.raw.threw : null, m = e && e.name === 'ReferenceError' && /^([A-Za-z_$][\w$]*) is not defined$/.exec(String(e.message)); return m && sharedFree.has(m[1]) && !runFree.has(m[1]) ? m[1] : null; }; // the thrown value itself (observe: raw), whose engine-made message the outcome omits
  const mountSides = async (i, recipe = null, world = null) => { // a fresh environment per side for input i, the unit picked, the inputs drawn; a search recipe's changes applied to the drawn input (search.mjs)
    const sides = {};
    for (const [name, file] of [['parent', parent], ['candidate', candidate]]) {
      const env = new Environment(seed * 7919 + i);
      env.shapes = spec;
      if (runFree.size) env.freeGlobals = new Set(runFree);
      let exportsObj;
      try { exportsObj = sandbox(env, roots[name]).load(file); } catch (e) { harnessAsk = `${name}: load failed: ${String(e && e.message).slice(0, 200)}`; break; }
      const u = pickUnit(exportsObj, spec, env);
      if (!u) { harnessAsk = env.callbackRefusal ?? `${name}: unit ${unit} not exported`; break; }
      await new Promise((r) => setImmediate(r)); // let load-time continuations settle
      env.trace.length = 0; env.pending.length = 0; env.calls.clear(); dropLoadTimers(env); // what the module did while loading is not the unit's behaviour
      if (probes) env.siteState.hits = new Set(); // the branches the call reaches, not the load
      env.answered.length = 0; env.worldSet = world?.length ? new Map(world) : null; if (probes) { env.siteState.values = []; env.siteState.valueAt = []; }
      if (wPlan) { let at = env.siteState.current, ran = 0; const frames = new Set(); Object.defineProperty(env.siteState, 'current', { get: () => at, set: (v) => { at = v; ran++; if (v && frames.size < 4096) frames.add(v); }, enumerable: true, configurable: true }); env.siteState.ran = () => ran; env.siteState.frames = () => frames; } // the statements the call runs, every loaded file (each statement mark sets current): how far a world search's run got // the world answers and the changed lines' values of the call, not the load; a world recipe's answers (search.mjs searchWorld)
      let inputs;
      captureActive(env, false);
      try { inputs = plan.draw(i, env); } catch (e) { if (e instanceof BudgetError) { harnessAsk = `input ${i}: budget: ${e.message}`; break; } throw e; }
      const typed = recipe?.changes.length && !broken('w9l-typed') ? spec.params.every((p, k) => k >= inputs.length || fits(p.spec, inputs[k], spec.defs, 0, true)) : false; // a search's change keeps a draw its declared types admit admitted: each leaf fits its own type, the whole value must still fit (a tag set to another member of a union whose fields it then lacks is no input of the type)
      if (recipe && !applyRecipe(inputs, recipe)) { harnessAsk = `search: a change of input ${i} did not apply`; break; }
      if (typed && !spec.params.every((p, k) => k >= inputs.length || fits(p.spec, inputs[k], spec.defs, 0, true))) { harnessAsk = `search: a change of input ${i} leaves its declared type`; break; } // the first inputs are the enumerated small heaps (stage 2: every sharing and cycle of the record shapes over a pool of two objects per shape, one input per non-isomorphic graph), then the i-th seeded input set, which may share objects between positions of one shape (stage 1)
      env.factLog = factSides[name]; // from here the side's call sites are recorded (callee-trace.mjs): the unit's run, never its load or its draw
      env.argPool = inputs.filter((x) => x && (typeof x === 'object' || typeof x === 'function') && x.__isFake); // handles the unit was handed: a generated key or member may be one of them
      sides[name] = { env, unit: u, state: exportsObj.__lean_state, inputs, args: snapshot(env, inputs), drawn: renderDrawn(inputs) }; // the input as drawn, rendered before either side runs: the witness's args (a call may write its arguments)
    }
    return sides;
  };
  // a witness's args: the input as drawn, before either call; `parent` and `candidate` keep what each call left. The two
  // sides draw their own copies from one seed, so their drawn renderings are equal; one that differs is named beside it
  const drawnOf = (sides) => ({ record: witnessRecord({ seed, leanHead: opts.recordHead ?? 'unknown', input: crumb.input, sides, invocation: { kind: 'call', isMethod: spec.isMethod, isStatic: spec.isStatic, accessor: spec.accessor ?? null } }), args: sides.parent.drawn, ...(JSON.stringify(sides.parent.drawn) !== JSON.stringify(sides.candidate.drawn) ? { drawnCandidate: sides.candidate.drawn } : {}) });
  const observeSide = async (sides, name) => { crumb.side = name; tellCrumb(); captureActive(sides[name].env, true); try { return await observe(sides[name], spec, sides[name].inputs, ms); } finally { captureActive(sides[name].env, false); } }; // the side being observed joins the breadcrumb
  const observeBoth = (sides, record) => (record ? recording(records, async () => [await observeSide(sides, 'parent'), await observeSide(sides, 'candidate')]) : (async () => [await observeSide(sides, 'parent'), await observeSide(sides, 'candidate')])());
  // retained state: for a class unit, programs of method calls on one constructed instance per side run first (programs.mjs); a divergence in a program that calls this unit is its WITNESS, one elsewhere rides in the certificate for the unit it names
  let programRun = null;
  if (spec.isMethod && !spec.isStatic && !spec.accessor && spec.unit.split('.')[1] !== 'constructor') {
    const { runPrograms } = await import('./programs.mjs'); step('programs');
    try { programRun = await recording(records, () => runPrograms({ files: { parent, candidate }, roots, spec, seed, ms, project, recordHead: opts.recordHead, rt: { sandbox, observe, guardedCall, firstDifference }, maxCpuMs: broken('programs-share') ? Infinity : (opts.boundSeconds ?? unitSecondsValue(opts.unitSeconds)) * 1000 / 4 })); } catch (e) { if (e instanceof BudgetError) programRun = { verdict: 'ASK', reason: `budget: ${e.message}`, programs: 0, commands: 0 }; else throw e; }
  }
  const extra = extraDraws(opts);
  try { for (let i = 0; i < n; i++) { // past the first witness, an error escaping an input ends the draws, never the WITNESS
    if (!treeDone && extra.over(diffs)) { if (!sawJsx) break; treeDone = true; } // past the first witness the draws look for further sites, within their share of the unit's time
    step('lane B', i); let sides = await mountSides(i);
    if (harnessAsk) break;
    let [oP, oC] = await observeBoth(sides, !treeDone);
    for (let x; !harnessAsk && (x = freeThrown(oP) ?? freeThrown(oC));) { runFree.add(x); sides = await mountSides(i); if (!harnessAsk) [oP, oC] = await observeBoth(sides, !treeDone); } // a name the host sets (sharedFreeReads): the input once more with it set
    if (harnessAsk) break;
    if (!treeDone && (oP.harness === 'stack overflow' || oC.harness === 'stack overflow' || oP.harness === 'timeout' || oC.harness === 'timeout')) { // the stop may be the recorder's: once more without it, on fresh environments; a second stop stands
      recorderRetries++; sides = await mountSides(i); if (harnessAsk) break; [oP, oC] = await observeBoth(sides, false);
    }
    const family = i < heaps.builders.length ? 'enumerated heaps' : knownInput(spec, i) ? 'listed values' : spec.shaped && i - heaps.builders.length - knownLength(spec) < walkLength(spec) ? 'boundary walk' : 'seeded type-directed draw';
    const drawnRecord = witnessRecord({ seed, leanHead: opts.recordHead ?? 'unknown', input: i, sides, invocation: { kind: 'call', isMethod: spec.isMethod, isStatic: spec.isStatic, accessor: spec.accessor ?? null } });
    unitRecord.draws.push({ ...drawSummary(drawnRecord), family, completion: { parent: oP.harness ?? (oP.impure ? 'impure' : 'observed'), candidate: oC.harness ?? (oC.impure ? 'impure' : 'observed') } });
    for (const p of unitRecord.drawDomain.parameters) { p.count++; p.families[family] = (p.families[family] ?? 0) + 1; }
    if (treeDone && (oP.harness || oC.harness || oP.impure || oC.impure)) break; // past the tree layer's witnesses the run only feeds the styles layer: a stop there ends it
    if ((sides.parent.sawJsx || sides.candidate.sawJsx) && oP.outcome && oC.outcome && Object.hasOwn(oP.outcome, 'returned') && Object.hasOwn(oC.outcome, 'returned')) styles.add(i, oP.outcome.returned, oC.outcome.returned);
    if (treeDone) continue;
    if (sides.parent.sawJsx || sides.candidate.sawJsx) sawJsx = true;
    if (oP.impure || oC.impure) return { verdict: 'REFUSE', kind: 'render-impure', unit, side: oP.impure ? 'parent' : 'candidate', input: i, ...drawnOf(sides), renders: (oP.impure ?? oC.impure), reason: `render-impure: the ${oP.impure ? 'parent' : 'candidate'} renders two different trees or request traces from the same state (Rules of React: a render is pure)`, bound: { n, seed, ms } };
    if (oP.harness === 'timeout' || oC.harness === 'timeout') { skipped.push(i); timeoutAt ??= (oP.harness === 'timeout' ? oP.at : oC.at) ?? null; if (oP.harness !== oC.harness) oneSided.push({ input: i, side: oP.harness ? 'parent' : 'candidate' }); continue; } // a side did not return within the limit (an unbounded loop, often on an aliased input): a timeout proves nothing, so the input is skipped; the other inputs still run, a witness among them counts, and no witness is ASK when only one side timed out
    if (oP.harness === 'stack overflow' && oC.harness === 'stack overflow') { skipped.push(i); continue; } // both sides exhausted the call stack on this input, with and without the recorder: the input proves nothing
    if ((oP.harness === 'stack overflow' && !oC.harness) || (oC.harness === 'stack overflow' && !oP.harness)) { // one side recursed past the stack where the other returned: the thrown RangeError is that side's outcome (SEMANTICS item 1), observed on the same stack without the recorder
      const side = oP.harness ? 'parent' : 'candidate';
      if (keepDifference(diffs, { input: i, ...drawnOf(sides), parent: oP, candidate: oC, where: { field: 'outcome', note: `the ${side} exceeded the call stack (RangeError); the other side returned` } })) { extra.full = true; if (!sawJsx) break; treeDone = true; }
      continue;
    }
    if (oP.harness || oC.harness) { harnessAsk = `input ${i}: ${oP.harness ? 'parent ' + oP.harness : 'candidate ' + oC.harness}`; break; }
    states.push({ input: i, args: sides.parent.drawn, ...(sides.parent.sawJsx && oP.outcome && Object.hasOwn(oP.outcome, 'returned') ? { tree: oP.outcome.returned } : {}) }); // the state reached on input i, as both sides started it
    { const b = bridgeCounts(sides.parent.env); b.calls.forEach((x) => bridgeSeen.calls.add(x)); b.callbacks.forEach((x) => bridgeSeen.callbacks.add(x)); }
    const stopped = atGuard(oP, sides.parent) && atGuard(oC, sides.candidate);
    if (stopped) { reached.guard++; firstGuard ??= oP.outcome.threw; } else reached.body++;
    if (knownRun && knownInput(spec, i)) { knownRun.inputs++; if (!stopped) knownRun.body++; }
    if (probes) drawHits.push({ input: i, hits: hitsOf(sides) });
    if (wPlan) { const inf = infectionOf(sides); worldStarts.push({ recipe: { from: i, changes: [] }, answered: answeredOf(sides), ran: ranOf(sides), threw: threwOf(oP, oC), ...inf, ...(inf.infected ? { guide: guideRunOf(sides) } : {}) }); } // a climb starts only from an infected input: its guide is read for it alone
    const sP = JSON.stringify(oP), sC = JSON.stringify(oC);
    if (sP !== sC) {
      const undecided = undecidedDrives(oP, oC); // the sides differ only from a drive that could not run on: undecided, never a difference (design/callbacks.md)
      const via = undecided ? null : unloadableOnly(oP, oC, sides); // the sides differ only in requests to a module lean could not load: the inlined or changed call is no difference lean can show
      if (undecided) (diffs.undriven ??= []).push({ input: i, reasons: undecided });
      else if (via) (diffs.unloadable ??= []).push({ input: i, ...via });
      else { // one witness per site (exec/sites.mjs), a site for each field this input differs on at its own statement; a rendered unit keeps running for the styles layer
        const drawn = drawnOf(sides), reached = probes ? reachedOf(drawHits.at(-1)?.hits) : null;
        if (fieldDifferences(oP, oC).some((where, j) => keepDifference(diffs, { input: i, ...drawn, parent: oP, candidate: oC, where, ...(reached ? { reached } : {}) }, j > 0))) { extra.full = true; if (!sawJsx) break; treeDone = true; }
      }
    } else { const u = undrivenOf(oP) ?? undrivenOf(oC); if (u) (diffs.undriven ??= []).push({ input: i, reasons: [u] }); } // equal, with a callback lean could not drive: the gap is carried
  } } catch (e) { if (!extra.past) throw e; extra.error = `${crumb.phase} input ${crumb.input}: ${String(e && e.message).slice(0, 160)}`; }
  // the branch-guided input search (search.mjs, design/w3c-search-inputs.md): the draws agreed and reached the body; a
  // changed input runs both sides as a draw does, and a difference is a WITNESS only when a second run on fresh
  // environments gives the same two observations
  let searchSummary = null;
  // with reach (design/w9i-reach.md) the search runs past the draws' witnesses too, for the changed statements and
  // branches no draw reached, each divergence one more candidate site; past a witness within what is left of three
  // quarters of the unit's seconds, so the unit's bound never turns the WITNESS into an ASK
  const unitMs = unitSecondsValue(opts.unitSeconds) * 1000, searchMs = !diffs.length ? unitMs * SEARCH_SHARE : Math.min(unitMs * SEARCH_SHARE, unitMs * REACH_CEILING - (Date.now() - unitStart));
  if (sPlan && !sPlan.error && (!diffs.length || reach) && !extra.full && searchMs > 0 && !harnessAsk && !sawJsx) {
    const pairOf = async (recipe) => { step('search', recipe.from); const sides = await mountSides(recipe.from, recipe); if (harnessAsk) { harnessAsk = null; return null; } const [oP, oC] = await observeBoth(sides, false); return { sides, oP, oC }; };
    const statusOf = ({ sides, oP, oC }) => { if (oP.harness || oC.harness || oP.impure || oC.impure) return 'skip'; if (JSON.stringify(oP) === JSON.stringify(oC)) return 'equal'; return undecidedDrives(oP, oC) || unloadableOnly(oP, oC, sides) ? 'equal' : 'diff'; };
    let unconfirmed = 0;
    const run = async (recipe) => {
      const a = await pairOf(recipe); if (!a) return { status: 'skip' };
      const status = statusOf(a), hits = hitsOf(a.sides);
      if (status !== 'diff') return { status, hits };
      const b = await pairOf(recipe); // the replay: the same recipe on fresh environments must give the same two observations
      if (!b || JSON.stringify(b.oP) !== JSON.stringify(a.oP) || JSON.stringify(b.oC) !== JSON.stringify(a.oC)) { unconfirmed++; return { status: 'skip', hits }; }
      return { status, hits, ...a };
    };
    const changes = async (recipe) => { const sides = await mountSides(recipe.from, recipe); if (harnessAsk) { harnessAsk = null; return null; } return changesOf(sides.parent.inputs, spec.params, spec.defs, sPlan.literals, { aware: !/\bvalues\b/.test(process.env.LEAN_SEARCH_BREAK ?? ''), lists: reach }); }; // LEAN_SEARCH_BREAK: tests/search-inputs.mjs --break removes a mechanism (values: the literal and boundary values; keep: the kept inputs)
    const onDiff = reach ? (r, recipe) => { // a divergence the search found: a site per differing field, as a draw's (keepDifference)
      const base = { input: { source: 'search', ...recipeText(recipe) }, ...drawnOf(r.sides), parent: r.oP, candidate: r.oC, source: 'search', replayed: true, reached: reachedOf(r.hits) };
      if (base.record) base.record.search = recipeText(recipe); // the record's input is draw `from` with these changes, not the plain draw
      if (fieldDifferences(r.oP, r.oC).some((where, j) => keepDifference(diffs, { ...base, where: { ...where, source: 'search' } }, j > 0))) { extra.full = true; return true; }
      return false;
    } : null;
    let r;
    try { r = await searchInputs({ seed, targets: sPlan.targets, start: drawHits, run, changes, maxInputs: n, maxMs: searchMs, keep: !/\bkeep\b/.test(process.env.LEAN_SEARCH_BREAK ?? ''), onDiff }); }
    catch (e) { if (!diffs.length) throw e; r = null; extra.error ??= `search: ${String(e && e.message).slice(0, 160)}`; } // past a witness an error ends the search, never the WITNESS
    if (r) {
      const { witness, recipe, ...rest } = r;
      searchSummary = { ...rest, unconfirmed, changedLines: sPlan.changed, unreached: rest.unreached.map(sPlan.describe) };
      if (reach) { const byDraws = new Set(drawHits.flatMap((x) => [...x.hits])), un = new Set(rest.unreached); searchSummary.statements = { targets: sPlan.statements.length, reachedByDraws: sPlan.statements.filter((t) => byDraws.has(t)).length, reached: sPlan.statements.filter((t) => !un.has(t)).length }; }
      if (witness) {
        const w = { input: { source: 'search', ...recipeText(recipe) }, ...drawnOf(witness.sides), parent: witness.oP, candidate: witness.oC, where: { ...firstDifference(witness.oP, witness.oC), source: 'search' }, source: 'search', replayed: true };
        if (w.record) w.record.search = recipeText(recipe); // the record's input is draw `from` with these changes, not the plain draw
        diffs.push(w);
      }
    }
  } else if (sPlan) { const T = new Set(sPlan.targets ?? []), got = new Set(drawHits.flatMap((x) => [...x.hits].filter((h) => T.has(h)))); searchSummary = { source: 'search', stop: sPlan.error ? `plan: ${sPlan.error}` : diffs.length && !reach ? 'the draws differ' : harnessAsk ? 'harness stop' : sawJsx ? 'rendered unit' : extra.full ? `${WITNESS_SITES} sites held` : 'no time left past the witness', targets: T.size, reachedByDraws: got.size, reached: got.size, tried: 0, ...(reach && sPlan.statements ? { statements: { targets: sPlan.statements.length, reachedByDraws: sPlan.statements.filter((t) => got.has(t)).length, reached: sPlan.statements.filter((t) => got.has(t)).length } } : {}) }; } // not searched: the branches the draws reached, for the before/after count
  // the world search (search.mjs searchWorld, design/w9l-bounded-and-moves.md): the draws and the input search agree; an
  // input on which the changed lines' values differ had its difference masked by the world's answers after it: the same
  // input with other answers of the same menu, on both sides alike; a difference is a WITNESS only when a second run
  // on fresh environments gives the same two observations
  let worldSummary = null;
  if (wPlan && !diffs.length && !harnessAsk && !sawJsx && worldStarts.length) {
    let unconfirmed = 0;
    const pairOf = async (recipe, world) => { step('world', recipe.from); const sides = await mountSides(recipe.from, recipe, world); if (harnessAsk) { harnessAsk = null; return null; } const [oP, oC] = await observeBoth(sides, false); return { sides, oP, oC }; };
    const statusOf = ({ sides, oP, oC }) => { if (oP.harness || oC.harness || oP.impure || oC.impure) return 'skip'; if (JSON.stringify(oP) === JSON.stringify(oC)) return 'equal'; return undecidedDrives(oP, oC) || unloadableOnly(oP, oC, sides) ? 'equal' : 'diff'; };
    const run = async (recipe, world) => {
      const a = await pairOf(recipe, world); if (!a) return { status: 'skip', answered: [], ran: 0, threw: false, infected: false, at: null };
      const status = statusOf(a), seen = { answered: answeredOf(a.sides), ran: ranOf(a.sides), threw: threwOf(a.oP, a.oC), ...infectionOf(a.sides), guide: guideRunOf(a.sides) };
      if (status !== 'diff') return { status, ...seen };
      const b = await pairOf(recipe, world); // the replay
      if (!b || JSON.stringify(b.oP) !== JSON.stringify(a.oP) || JSON.stringify(b.oC) !== JSON.stringify(a.oC)) { unconfirmed++; return { status: 'skip', ...seen }; }
      return { status, ...seen, ...a };
    };
    const near = wPlan.literals.near.strings.length + wPlan.literals.near.numbers.length > 0; // no literal in a changed condition: no leaf change to infect with, no mount to list them
    const changes = async (recipe) => { if (!near) return []; const sides = await mountSides(recipe.from, recipe); if (harnessAsk) { harnessAsk = null; return null; } return changesOf(sides.parent.inputs, spec.params, spec.defs, wPlan.literals); };
    const r = await searchWorld({ seed, starts: worldStarts, run, changes, maxInputs: n, maxMs: unitSecondsValue(opts.unitSeconds) * 1000 / 4 });
    const { witness, recipe, world, ...rest } = r;
    worldSummary = { ...rest, unconfirmed, values: wPlan.values };
    if (witness) {
      const input = { source: 'world', ...recipeText(recipe), world: worldText(world) };
      const w = { input, ...drawnOf(witness.sides), parent: witness.oP, candidate: witness.oC, where: { ...firstDifference(witness.oP, witness.oC), source: 'world' }, source: 'world', replayed: true };
      if (w.record) w.record.search = input; // the record's input is draw `from` with these changes, under these world answers
      diffs.push(w);
    }
  }
  // the witness lane B leads with (design/w9i-reach.md): the first found, unless the search found one whose difference
  // shows at a changed statement no draw completed (a part of the change only the search ran); then the first such
  if (reach && diffs.length > 1) {
    const byDraws = new Set(reachedOf(new Set(drawHits.flatMap((x) => [...x.hits]))) ?? []);
    const at = (w) => { const l = w.where?.lines; return [l?.candidate?.start !== undefined ? `candidate ${l.candidate.start}` : null, l?.parent?.start !== undefined ? `parent ${l.parent.start}` : null].filter(Boolean); };
    const k = diffs.findIndex((w, j) => j > 0 && w.source === 'search' && at(w).some((x) => (w.reached ?? []).includes(x) && !byDraws.has(x)));
    if (k > 0) diffs.unshift(...diffs.splice(k, 1));
  }
  // the render row (design/certificate-timing.md, 2026-10-31): whether the unit returned an element, lean's clock epoch and head (the witness
  // record's clockEpoch and leanHead), the handler sequences a clean run walked with their input, and per handler label
  // the element it targets; the sequences and their targets are added where the sequences run
  const renderRow = { component: states.some((x) => Object.hasOwn(x, 'tree') && isJsxValue(x.tree)), clock: { epoch: CLOCK_EPOCH }, sequences: [], targets: [], leanHead: opts.recordHead ?? 'unknown', bridge: { calls: bridgeSeen.calls.size, callbacks: bridgeSeen.callbacks.size } };
  for (const x of states) if (Object.hasOwn(x, 'tree')) addTargets(renderRow.targets, treeTargets(x.tree, true));
  const walkedInto = (i, r) => { if (!r) return; for (const labels of r.walked ?? []) if (!renderRow.sequences.some((x) => x.input === i && JSON.stringify(x.labels) === JSON.stringify(labels))) renderRow.sequences.push({ input: i, labels }); addTargets(renderRow.targets, r.targets ?? []); };
  const bound = { n, seed, ms, reached, states, render: renderRow, ...(spec.known ? { values: { ...spec.known, phase: knownLength(spec), inputs: knownRun.inputs, reachedBody: knownRun.body } } : {}), heaps: { enumerated: heaps.distinct, assignments: heaps.assignments, space: heaps.space, pool: heaps.pool, shapes: heaps.shapes }, fakes: 'demand-driven proxies, seeded primitives, seeded recorded clocks', inputs: `${spec.known ? 'the values the project lists first (bound.values), then ' : ''}from parameter types with boundary values first; positions of one shape sometimes share one object`, observation: 'outcome, the reachable object graph (identity up to a renaming of fresh objects), receiver fields, trace, pending work', schedule: 'after the call: every armed timer once, in due order (ties by arm order), intervals re-armed and left pending, at most 50 fired' };
  if (searchSummary) bound.search = searchSummary;
  if (worldSummary) bound.world = worldSummary;
  if (diffs.length) bound.sites = extra.summary(diffs, n, harnessAsk);
  bound.calleeFacts = factSides; // per side, per call site (its start in the side's file): calls, checked, wrote, shared, outside, unrecorded, async (callee-trace.mjs; read by check.mjs through callee-facts.mjs confirmedFacts)
  if (diffs.unloadable && !diffs.length) bound.unloadable = { inputs: diffs.unloadable.length, first: diffs.unloadable[0] }; // no other difference: ASK below, naming the module and its failure
  if (diffs.undriven && !diffs.length) bound.undriven = { inputs: diffs.undriven.length, first: diffs.undriven[0] }; // runPair turns a PASS into ASK callback-undriven
  Object.defineProperty(bound, 'library', { enumerable: true, get: () => { const sm = summarizeRecords(records, libraryTableOf()); libraryCases(sm); if (recorderRetries) sm.retriedWithoutRecorder = recorderRetries; return sm; } }); // read when the result is written, after every rung
  if (skipped.length) bound.skipped = { inputs: skipped.length, oneSided: oneSided.length, reason: 'a side timed out on that input (an unbounded loop), or both sides exhausted the call stack; the input proves nothing', ...(timeoutAt ? { at: timeoutAt } : {}) };
  const where = timeoutAt ? `; first: ${timeoutAt}` : ''; // the statement it ran or awaited at and the world call before it (lane w9ab)
  if (!diffs.length && oneSided.length) return { verdict: 'ASK', reason: `one side timed out on ${oneSided.length} input(s) (first: input ${oneSided[0].input}, ${oneSided[0].side})${where}; the other inputs showed no difference`, unit, bound, ran: n - skipped.length };
  if (skipped.length && skipped.length >= n - (harnessAsk ? 1 : 0) && !diffs.length) return { verdict: 'ASK', reason: `every input timed out (${skipped.length} of ${n})${where}`, unit, bound };
  const handlerRun = sawJsx ? { models: { parent: descriptorsOf(parent, unit, { project }), candidate: descriptorsOf(candidate, unit, { project }) }, stats: newHandlerStats() } : null; // the descriptors of the unit's handlers, read once per side, applied at every fire of the sequences and the finite lane
  if (sawJsx) bound.frontEnd = { ...FRONT_END_OBSERVATION, components: componentsText(deepMode.depth), notObserved: 'committed DOM, computed styles, layout, pixels, accessibility tree, re-renders after a state change' }; // a rendered unit: the layer this verdict holds at, and the layers it says nothing about
  if (sawJsx) bound.frontEnd.layers = layersOf(styles); // the tree layer (depth, rendered children, handles, context reads) and the styles layer, each with its assumptions
  if (handlerRun) bound.frontEnd.handlers = Object.assign(handlerRun.stats, { observed: FRONT_END_OBSERVATION.handlers }); // how a handler is observed, and the descriptor interpreter's counts: fired, readable, interpretable, agreed, and every defect
  if (programRun) {
    const member = spec.member ?? unit.split('.')[1];
    bound.programs = { programs: programRun.programs, commands: programRun.commands, methods: programRun.methods, maxLen: 5, seed, ...(programRun.skipped ? { skipped: programRun.skipped } : {}), ...(programRun.stop ? { stop: programRun.stop } : {}) };
    if (programRun.verdict === 'ASK') bound.programs.ask = programRun.reason;
    if (programRun.verdict === 'WITNESS') {
      const mine = programRun.program.some((c) => c.method === member);
      bound.programs.divergence = { method: programRun.divergence.method, commands: programRun.program.length, program: programRun.program, mine };
      if (mine) return { verdict: 'WITNESS', unit, witnesses: [{ record: programRun.record, input: `program ${programRun.programIndex}`, program: programRun.program, args: programRun.program.map((c) => c.args), parent: programRun.divergence.parent, candidate: programRun.divergence.candidate, where: { ...programRun.divergence.where, command: programRun.divergence.command, method: programRun.divergence.method } }, ...diffs], bound, spec: { params: spec.params, returns: spec.returns, literals: spec.literals, strings: spec.strings } };
    }
  }
  // races (design/schedules.md): an async unit called twice, the second call arriving while the first is pending, every
  // promise the world answers held by the scheduler; the orders run are bounded by conflicts and by b preemptions
  const racesOf = async (load) => { step('races'); const { RACE_BOUND } = await import('./program.mjs'); let rr = null; try { rr = await recording(records, load); } catch (e) { if (e instanceof BudgetError || e?.message === '__timeout__') rr = { verdict: 'ASK', reason: `races: ${e instanceof BudgetError ? 'budget: ' + e.message : 'timeout'}`, stats: null }; else rr = { verdict: 'ASK', reason: `races: ${String(e && e.message).slice(0, 160)}`, stats: null }; } if (!rr) return null; const st = rr.stats; bound.races = { liveCalls: 2, preemptions: 2, programs: st?.programs ?? 0, orders: st?.orders ?? null, drawn: st?.drawn ?? 0, dependentPairs: st?.dependentPairs ?? 0, cut: st?.cut ?? null, complete: st?.complete ?? false, events: 'the first call\'s start, the second call\'s arrival, each release of a promise the world answers', bound: RACE_BOUND, ...(rr.skipped ? { skipped: rr.skipped } : {}) }; if (rr.verdict === 'ASK') bound.races.ask = rr.reason; return rr; };
  const raceWitness = (rr) => ({ verdict: 'WITNESS', unit, witnesses: [{ input: `race program ${rr.witness.program}`, race: true, program: [`call(${rr.witness.program})`, `call2(${rr.witness.program})`], side: rr.witness.side, orders: rr.witness.orders, dependentPair: rr.witness.dependentPair, otherSide: rr.witness.otherSide, replayed: rr.witness.replayed, where: { field: 'race', side: rr.witness.side, moved: rr.witness.dependentPair.moved, before: rr.witness.dependentPair.before, lines: raceLines(rr.witness) } }, ...diffs], bound, spec: { params: spec.params, returns: spec.returns, literals: spec.literals, strings: spec.strings } });
  if (!diffs.length && !diffs.unloadable && !sawJsx && !harnessAsk && spec.isAsync && spec.isMethod) {
    const { runClassRaces } = await import('./programs.mjs');
    const rr = await racesOf(() => runClassRaces({ files: { parent, candidate }, roots, spec, seed, ms, project, rt: { sandbox, guardedCall, awaitUnit } }));
    if (rr?.verdict === 'WITNESS') return raceWitness(rr);
    if (rr?.undecided) return { verdict: 'ASK', reason: rr.reason, unit, bound };
  }
  if (diffs.length && sawJsx) for (const d of diffs) Object.assign(d, witnessPatch(d.parent, d.candidate)); // a rendered unit: each witness carries the patch from the parent's tree to the candidate's
  if (diffs.length) return { verdict: 'WITNESS', unit, witnesses: diffs, bound, spec: { params: spec.params, returns: spec.returns, literals: spec.literals, strings: spec.strings } };
  if (diffs.unloadable) { const u = diffs.unloadable[0]; return { verdict: 'ASK', kind: 'unloadable-module', reason: `unloadable module ${u.module}: ${u.failure}; the difference passes through it`, unit, unloadable: u, bound, spec: { params: spec.params, returns: spec.returns, literals: spec.literals, strings: spec.strings } }; } // a difference elsewhere (outcome, another request, the heap) was a WITNESS above; here every difference ran through a module lean replaced by the environment's, so lean cannot say the inlined or changed call differs
  if (!spec.isMethod && !sawJsx && !harnessAsk && !diffs.length) { // environment programs with retained handles (program.mjs): what the environment may do later with what the unit handed it
    const { runEnvironmentPrograms } = await import('./program.mjs'); step('environment programs');
    let r = null;
    try { r = await recording(records, () => runEnvironmentPrograms({ files: { parent, candidate }, roots, spec, seed, ms, rt: { sandbox, pickUnit, guardedCall, awaitUnit, runTimers, driveWindow } })); } catch (e) { if (e instanceof BudgetError) r = { verdict: 'ASK', reason: `budget: ${e.message}` }; else throw e; }
    if (r) {
      bound.environmentPrograms = { runs: r.runs ?? 0, maxCommands: r.maxCommands ?? 6, seed: r.seed ?? seed, commands: 'call, invoke, fire, tick, settle, next, throw, return', observation: 'the outcome, the requests since the previous command, the pending count; never the graph' };
      if (r.verdict === 'ASK') bound.environmentPrograms.ask = r.reason;
      if (r.verdict === 'WITNESS') return { verdict: 'WITNESS', unit, witnesses: [{ input: 'environment program', program: r.program, step: r.step, seed: r.seed, path: r.path, replayPath: r.replayPath, replayed: r.replayed, parent: r.parent, candidate: r.candidate, where: { field: 'program', step: r.step } }], bound, spec: { params: spec.params, returns: spec.returns, literals: spec.literals, strings: spec.strings } };
      if (spec.isAsync) { const { runFreeRaces } = await import('./program.mjs'); const rr = await racesOf(() => runFreeRaces({ files: { parent, candidate }, roots, spec, seed, ms, project, rt: { sandbox, pickUnit, guardedCall, awaitUnit } })); if (rr?.verdict === 'WITNESS') return raceWitness(rr); if (rr?.undecided) return { verdict: 'ASK', reason: rr.reason, unit, bound }; }
    }
  }
  if (harnessAsk) return { verdict: 'ASK', reason: harnessAsk, unit, bound, ran: diffs.length };
  if (sawJsx) { // the one-render check found no difference: a finite component is decided over every click order (rung 2); the rest runs re-render sequences (rung 3)
    const { finiteDomain, exploreFinite } = await import('./finite.mjs'); step('finite'); const rt = { traceWithSites, sandbox, pickUnit, commitRender, commitEffects, treeHandlers, runTimers, RenderLoop, guardedCall, awaitUnit };
    let domain = null; try { domain = finiteDomain(candidate, unit, { project }); } catch (e) { domain = { why: `finiteness: ${String(e && e.message).slice(0, 120)}` }; }
    if (domain && !domain.why) {
      const r = await recording(records, () => exploreFinite({ files: { parent, candidate }, roots, spec, unit, domain, seed, ms, rt, handlers: handlerRun }));
      bound.frontEnd.finite = { slots: domain.slots.map((x) => x.values.length), props: domain.props.map((p) => `${p.name}:${p.opaque ? p.opaque : p.values.length}`), assignments: domain.assignments.length };
      if (r.verdict === 'ASK') return { verdict: 'ASK', reason: `finite exploration: ${r.reason}`, unit, bound };
      if (r.verdict === 'WITNESS') { bound.frontEnd.renders = 'every click order from every prop assignment, explored'; return { verdict: 'WITNESS', unit, witnesses: [{ input: r.witness.props, sequence: r.witness.clicks, step: r.witness.step ?? null, parent: r.witness.parent ?? null, candidate: r.witness.candidate ?? null, reason: r.witness.reason ?? null, patch: r.witness.patch, patchSummary: r.witness.patchSummary, where: { field: 'sequence', command: (r.witness.clicks ?? [])[r.witness.step ?? 0] ?? null } }], bound, spec: { params: spec.params, returns: spec.returns, literals: spec.literals, strings: spec.strings } }; }
      bound.frontEnd.renders = `every click order from every prop assignment, decided: ${r.pairs} state pairs over ${r.assignments} assignment(s); effects and armed timers inside each step; a function or element prop is one opaque input; handler descriptors agreed on ${handlerRun.stats.agreed} of ${handlerRun.stats.fired} fired`;
      bound.frontEnd.notObserved = 'committed DOM, computed styles, layout, pixels, accessibility tree; other values of opaque props';
      return { verdict: 'PASS-decided', unit, bound, spec: { params: spec.params, returns: spec.returns, literals: spec.literals, strings: spec.strings } };
    }
    bound.frontEnd.finite = { why: domain ? domain.why : 'no domain' };
  }
  if (sawJsx && sequenceDepth > 0) { // not finite: re-render sequences from a fresh mount, on the first inputs
    let paths = 0; const schedulesRun = new WeakMap(), r2Of = (r) => schedulesRun.get(r) ?? null;
    for (let i = 0; i < Math.min(sequenceInputs, n); i++) {
      step('sequences', i);
      const r = await recording(records, () => runSequences({ files: { parent, candidate }, roots, spec, unit, seed, inputIndex: i, ms, depth: sequenceDepth, breadth: sequenceBreadth, handlers: handlerRun }));
      walkedInto(i, r);
      if (r.ask === undefined && !r.witness) { // the schedule explorer (moonshot 9): the same machine with the clock as a command, when the mount armed at most three timers
      const r2 = await recording(records, () => runSequences({ files: { parent, candidate }, roots, spec, unit, seed, inputIndex: i, ms, schedules: true, depth: Math.max(sequenceDepth, 2), breadth: sequenceBreadth, handlers: handlerRun })); schedulesRun.set(r, r2); walkedInto(i, r2);
        if (r2.witness) return { verdict: 'WITNESS', unit, witnesses: [{ ...r2.witness, schedule: true }], bound: { ...bound, schedules: { timers: r2.timers, paths: r2.paths, orders: 'every order Node allows of the timers due at one instant (two timeouts or intervals keep their arm order), up to three' } }, spec: { params: spec.params, returns: spec.returns, literals: spec.literals, strings: spec.strings } };
        if (r2.ask) bound.schedulesAsk = r2.ask; else bound.schedules = { timers: r2.timers ?? 0, paths: r2.paths, orders: 'every order Node allows of the timers due at one instant (two timeouts or intervals keep their arm order), up to three' };
      }
      if (r.ask) return { verdict: 'ASK', reason: `input ${i}: ${r.ask}`, unit, bound };
      if (r.witness) { bound.frontEnd.renders = `one, then command sequences of up to ${sequenceDepth} clicks`; return { verdict: 'WITNESS', unit, witnesses: [{ input: i, sequence: r.witness.sequence, step: r.witness.step, parent: r.witness.parent, candidate: r.witness.candidate, patch: r.witness.patch, patchSummary: r.witness.patchSummary, where: { field: 'sequence', command: r.witness.sequence[r.witness.step] ?? 'unmount' } }], bound, spec: { params: spec.params, returns: spec.returns, literals: spec.literals, strings: spec.strings } }; }
      paths += r.paths ?? 0;
      for (const x of [r, r2Of(r)]) if (x?.undriven && !bound.undriven) bound.undriven = { inputs: 1, first: { input: i, sequence: x.undriven.sequence, reasons: x.undriven.reasons } }; // a sequence drive that could not run: the gap is carried (runPairInFlight)
    }
    bound.frontEnd.renders = `one, then every command sequence of up to ${sequenceDepth} clicks over at most ${sequenceBreadth} handlers per step, from a fresh mount, on ${Math.min(sequenceInputs, n)} inputs (${paths} paths); effects re-run by Object.is deps with cleanup first; unmount runs every cleanup`;
    bound.frontEnd.notObserved = 'committed DOM, computed styles, layout, pixels, accessibility tree; timers never fire; sequences beyond the depth';
  }
  // no input got past a guard: the inputs drawn from the types all fell outside the domain the unit accepts (a table, a
  // check the types do not state), so the bounded run sampled the refusal only and says nothing about the body
  if (reached.body === 0 && reached.guard > 0) return { verdict: 'ASK', unreached: true, reason: `no input reached the body: every one of the ${reached.guard} inputs threw at a guard (first: ${thrownText(firstGuard)})`, unit, bound, spec: { params: spec.params, returns: spec.returns, literals: spec.literals, strings: spec.strings } };
  return { verdict: 'PASS-bounded', unit, bound, spec: { params: spec.params, returns: spec.returns, literals: spec.literals, strings: spec.strings } };
}
// the sides differ only in requests to a same-package module whose load failed (sandbox: the alias fallback): with those
// requests removed from both traces everything else is equal (outcome, heap, receiver, pending, the other requests);
// the module is named with its load failure. A request is a record whose path is the module's fake or a member or a result of it
export function unloadableOnly(oP, oC, sides) {
  const mods = new Map();
  for (const side of [sides.parent, sides.candidate]) for (const [spec, why] of side.env.unloadable ?? []) if (!mods.has(spec)) mods.set(spec, why);
  if (!mods.size) return null;
  const hit = new Set();
  const through = (r) => { for (const spec of mods.keys()) { const base = `module:${spec}`; if (typeof r.path === 'string' && r.path.startsWith(base) && (r.path.length === base.length || '.(#['.includes(r.path[base.length]))) { hit.add(spec); return true; } } return false; };
  const strip = (o) => ({ ...o, trace: (o.trace ?? []).filter((r) => !through(r)) });
  // a call into the module may fault on a seeded draw that depends on the called member's path (fake.mjs faultDraw), so
  // inlining a helper moves the draw: a side that threw such a fault stopped inside the module and shows nothing past it
  const faulted = (o) => { const m = o.outcome?.threw?.message; return typeof m === 'string' && m.startsWith('fault: ') && through({ path: m.slice(7) }); };
  const stopped = faulted(oP) || faulted(oC);
  const same = JSON.stringify(strip(oP)) === JSON.stringify(strip(oC)); // strips first: it fills `hit`
  if (!hit.size || (!stopped && !same)) return null;
  const specs = [...hit], first = mods.get(specs[0]);
  return { module: specs.length === 1 ? first.file : specs.map((x) => mods.get(x).file).join(', '), failure: first.failure, ...(specs.length > 1 ? { failures: specs.map((x) => mods.get(x).failure) } : {}), imports: specs };
}
// an input stopped at a guard: the call threw at a guard's throw (guardThrow) having done nothing the observation sees, no
// request of the environment, no pending work, no field of the receiver touched, its arguments as drawn; a throw after any
// of these, an unconditional throw and a fault of the language (a read of undefined) reached the body
function atGuard(o, side) {
  if (!o.outcome || !Object.hasOwn(o.outcome, 'threw') || o.outcome.promise) return false;
  if (o.trace.length || o.pending.length || Object.keys(o.receiver ?? {}).length) return false;
  if (!guardThrow(o.site)) return false;
  return JSON.stringify(renderDrawn(side.inputs)) === JSON.stringify(side.drawn);
}
// a guard's throw: the throw statement the run completed at sits in a branch of its own function (an if, a case of a
// switch, a catch), so the function has a way past it; the site is the statement marker's (patch.mjs), the file read once
const guardFiles = new Map();
function guardThrow(site) {
  if (!site || !site.file || typeof site.text !== 'string' || !/^throw\b/.test(site.text)) return false;
  let sf = guardFiles.get(site.file);
  if (sf === undefined) { try { sf = ts.createSourceFile(site.file, fs.readFileSync(site.file, 'utf8'), ts.ScriptTarget.Latest, true); } catch { sf = null; } guardFiles.set(site.file, sf); }
  if (!sf) return false;
  const line = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
  let hit = null;
  const walk = (n) => { if (hit) return; if (ts.isThrowStatement(n) && line(n.getStart(sf)) === site.start && line(n.end - 1) === site.end) { hit = n; return; } ts.forEachChild(n, walk); };
  walk(sf);
  for (let c = hit, p = hit?.parent; p && !ts.isFunctionLike(p) && !ts.isSourceFile(p); c = p, p = p.parent) {
    if (ts.isIfStatement(p) && c !== p.expression) return true;
    if (ts.isCaseClause(p) || ts.isDefaultClause(p) || ts.isCatchClause(p)) return true;
  }
  return false;
}
const thrownText = (t) => (t && typeof t === 'object' && typeof t.$error === 'string' ? `${t.$error}: ${t.message}` : JSON.stringify(t)).slice(0, 200);

// a race witness names the statement of the first request that differs between the two sides under the distinguishing
// order (the other side's arm order when it cannot run that order); with equal requests, the last request each side made
function raceLines(w) {
  const mine = w.orders.distinguishing.observation?.trace ?? [], theirs = w.rival?.obs?.trace ?? [];
  const same = (x, y) => JSON.stringify(render(x)) === JSON.stringify(render(y));
  let i = 0; while (i < Math.max(mine.length, theirs.length) && mine[i] && theirs[i] && same(mine[i], theirs[i])) i++;
  let kind = 'race effect';
  if (i >= mine.length && i >= theirs.length) { // the requests agree: the first call whose outcome differs, at the statement it completed
    const c = [0, 1].find((k) => JSON.stringify(w.orders.distinguishing.observation?.calls?.[k]) !== JSON.stringify(w.rival?.obs?.calls?.[k]));
    const a = w.orders.distinguishing.observation?.calls?.[c]?.site, b = w.rival?.obs?.calls?.[c]?.site;
    if (a && b) return { kind: 'race completion', parent: siteLines(w.side === 'parent' ? a : b), candidate: siteLines(w.side === 'parent' ? b : a) };
    i = Math.max(mine.length, theirs.length) - 1; kind = 'race completion fallback';
  }
  else if (!mine[i] || !theirs[i]) kind = `race effect; ${w.side === 'parent' ? 'candidate' : 'parent'} record absent`;
  const own = siteLines(mine[i]?.site ?? mine.at(-1)?.site), rival = siteLines(theirs[i]?.site ?? theirs.at(-1)?.site);
  return { kind, parent: w.side === 'parent' ? own : rival, candidate: w.side === 'parent' ? rival : own };
}
function siteLines(site) {
  if (!site) return null;
  return { file: site.file, start: site.start, end: site.end, text: site.text ?? '' };
}
export function firstDifference(a, b, only = null) {
  const where = differenceField(a, b, only);
  if (!where) return null;
  const trace = where.field === 'trace';
  let parentSite = trace ? a.trace[where.index]?.site : a.site;
  let candidateSite = trace ? b.trace[where.index]?.site : b.site;
  let kind = trace ? (!a.trace[where.index] ? 'effect; parent record absent' : !b.trace[where.index] ? 'effect; candidate record absent' : 'effect') : where.field === 'outcome' ? 'completion' : 'completion fallback';
  if (where.field === 'pending') {
    let i = 0; while (i < Math.max(a.pending.length, b.pending.length) && JSON.stringify(a.pending[i]) === JSON.stringify(b.pending[i])) i++;
    if (a.pending[i]?.site && b.pending[i]?.site) { parentSite = a.pending[i].site; candidateSite = b.pending[i].site; kind = 'pending arm'; }
  }
  const omitted = where.field === 'drives' ? omittedDifference(where.parent, where.candidate) : null;
  if (omitted) { // the drawn calls agree and a call with a trailing argument left out does not: the statement that reads the parameter left out (driveOne omittedForms); else that call's first differing request, else its completion
    const [ex, ey] = omitted.entries; const x = ex?.trace ?? [], y = ey?.trace ?? [];
    let i = 0; while (i < Math.max(x.length, y.length) && JSON.stringify(x[i]) === JSON.stringify(y[i])) i++;
    if (ex?.read || ey?.read) { parentSite = ex?.read ?? null; candidateSite = ey?.read ?? null; kind = 'drive omitted argument'; }
    else if (x[i]?.site || y[i]?.site) { parentSite = x[i]?.site ?? null; candidateSite = y[i]?.site ?? null; kind = 'drive effect'; }
    else { parentSite = ex?.site ?? null; candidateSite = ey?.site ?? null; kind = 'drive completion'; }
    where.omitted = { index: omitted.index, args: (ex ?? ey).args, ...((ex ?? ey).undefinedAt !== undefined ? { undefinedAt: (ex ?? ey).undefinedAt } : {}) };
  } else if (where.field === 'drives') { // the first request the two drives differ on, at the statement that made it; else the drive itself
    const x = where.parent?.trace ?? [], y = where.candidate?.trace ?? [];
    let i = 0; while (i < Math.max(x.length, y.length) && JSON.stringify(x[i]) === JSON.stringify(y[i])) i++;
    if (x[i]?.site || y[i]?.site) { parentSite = x[i]?.site ?? null; candidateSite = y[i]?.site ?? null; kind = 'drive effect'; } else { parentSite = where.parent?.site ?? null; candidateSite = where.candidate?.site ?? null; kind = 'drive completion'; }
  }
  where.lines = { kind, parent: siteLines(parentSite), candidate: siteLines(candidateSite) };
  return where;
}
// two drive records that agree but for their omitted forms (driveOne omittedForms): the first form they differ on
function omittedDifference(x, y) {
  if (!x || !y || (!x.omitted && !y.omitted)) return null;
  const { omitted: a = [], ...xr } = x, { omitted: b = [], ...yr } = y;
  if (JSON.stringify(xr) !== JSON.stringify(yr)) return null;
  let j = 0; while (j < Math.max(a.length, b.length) && JSON.stringify(a[j]) === JSON.stringify(b[j])) j++;
  return j < Math.max(a.length, b.length) ? { index: j, entries: [a[j] ?? null, b[j] ?? null] } : null;
}
const DIFFERENCE_FIELDS = ['outcome', 'heap', 'receiver', 'trace', 'pending', 'drives', 'module'];
// every field two observations differ on, each located as firstDifference locates the first (design/w8n-all-sites.md):
// the first is firstDifference's; a later field counts when it names another candidate statement than every field
// before it (a heap or receiver difference at the statement the outcome came from adds no place to look)
// A later drive record that differs is located too (each drive is the call of another function the unit handed out):
// a difference at the first drive (the PR's own change in one handed-out function) would otherwise hide every later
// drive's (a changed default of another) on the same input; each counts when it names a new statement, as a field does.
// Only while the two lists line up, record by record (the same handle on the same drawn arguments): after a drive that
// handed out more or other functions on one side, the records at one index are no longer one function's two calls.
// LEAN_BREAK=w9af-drive-sites: the first differing drive alone
function laterDrives(a, b) {
  if (broken('w9af-drive-sites')) return [];
  const x = a.drives ?? [], y = b.drives ?? [], out = []; let first = true;
  for (let i = 0; i < Math.max(x.length, y.length) && out.length < WITNESS_SITES; i++) {
    if (!x[i] || !y[i] || x[i].$fn !== y[i].$fn || JSON.stringify(x[i].args) !== JSON.stringify(y[i].args)) break; // the two lists no longer line up (one side handed out another function): a later pair is not one function's two calls
    if (JSON.stringify(x[i]) === JSON.stringify(y[i])) continue;
    if (first) { first = false; continue; } // firstDifference's own
    const w = firstDifference({ drives: x[i] ? [x[i]] : [] }, { drives: y[i] ? [y[i]] : [] }, 'drives');
    if (w) out.push({ ...w, index: i });
  }
  return out;
}
export function fieldDifferences(a, b) {
  const all = DIFFERENCE_FIELDS.flatMap((k) => { const w = firstDifference(a, b, k); return !w ? [] : k === 'drives' ? [w, ...laterDrives(a, b)] : [w]; });
  if (['w8n-fields', 'w8n-all-sites'].includes(process.env.LEAN_BREAK)) return all.slice(0, 1); // the second restores the earlier rule whole
  const lineOf = (w) => w.lines?.candidate?.start ?? w.lines?.candidate?.line ?? null, seen = new Set();
  return all.filter((w, j) => { const l = lineOf(w); if (j === 0) { seen.add(l); return true; } if (l === null || seen.has(l)) return false; seen.add(l); return true; });
}
function differenceField(a, b, only = null) {
  for (const k of DIFFERENCE_FIELDS) {
    if (only && k !== only) continue;
    const x = JSON.stringify(a[k]), y = JSON.stringify(b[k]);
    if (x !== y) {
      if (k === 'trace') { let i = 0; while (i < Math.max(a.trace.length, b.trace.length) && JSON.stringify(a.trace[i]) === JSON.stringify(b.trace[i])) i++; return { field: k, index: i, parent: a.trace[i] ?? null, candidate: b.trace[i] ?? null }; }
      if (k === 'drives') { const x = a.drives ?? [], y = b.drives ?? []; let i = 0; while (i < Math.max(x.length, y.length) && JSON.stringify(x[i]) === JSON.stringify(y[i])) i++; const h = (x[i] ?? y[i])?.$fn ?? null; return { field: k, index: i, handle: h, drive: h ? { called: `${h} on the drawn ${Array.from({ length: DRIVE_ARGS }, (_, j) => `drive${h}.arg${j}`).join(', ')}, this drive${h}.this`, args: (x[i] ?? y[i])?.args ?? null } : null, parent: x[i] ?? null, candidate: y[i] ?? null }; } // a function both sides handed out at one position does something else when called: the drive is the input
      if (k === 'heap') { const h = a.heap ?? {}, g = b.heap ?? {}; for (const part of ['roots', 'outcome', 'own']) if (JSON.stringify(h[part]) !== JSON.stringify(g[part])) return { field: 'heap', part }; const n = Math.max((h.heap ?? []).length, (g.heap ?? []).length); for (let j = 0; j < n; j++) if (JSON.stringify((h.heap ?? [])[j]) !== JSON.stringify((g.heap ?? [])[j])) return { field: 'heap', object: j, anchor: j < (h.anchors ?? 0), parent: (h.heap ?? [])[j] ?? null, candidate: (g.heap ?? [])[j] ?? null }; return { field: 'heap' }; }
      return { field: k };
    }
  }
  return null;
}

// the directories each side was loaded from: its package root, and the prefix of its unit file that the other side's path
// does not share (the temporary folder a copy sits in; found as the segments left when the common tail of the two unit
// file paths is cut, when both files bear one name); each in its real-path spelling too. When the two files bear different
// names the files themselves are listed, so a unit that reads its own file name sees one name.
export function sideLocations(parent, candidate, roots) {
  const real = (x) => { try { return fs.realpathSync(x); } catch { return x; } };
  const abs = { parent: path.resolve(parent), candidate: path.resolve(candidate) };
  const seg = { parent: abs.parent.split(path.sep), candidate: abs.candidate.split(path.sep) };
  const dirs = [roots.parent, roots.candidate], files = [];
  if (seg.parent.at(-1) === seg.candidate.at(-1)) {
    let k = 0; while (k < seg.parent.length - 1 && k < seg.candidate.length - 1 && seg.parent.at(-1 - k) === seg.candidate.at(-1 - k)) k++;
    for (const side of ['parent', 'candidate']) dirs.push(seg[side].slice(0, seg[side].length - k).join(path.sep));
  } else files.push(abs.parent, abs.candidate);
  const withReal = (list) => [...list, ...list.map(real)];
  return { dirs: withReal(dirs.map((d) => path.resolve(d))), files: withReal(files) };
}

// the package root: the nearest package.json above the file (relative imports inside it are compiled, others faked)
export function findRoot(file) {
  let d = path.dirname(path.resolve(file));
  for (let i = 0; i < 10; i++) { if (fs.existsSync(path.join(d, 'package.json'))) return d; const up = path.dirname(d); if (up === d) break; d = up; }
  return path.dirname(path.resolve(file));
}

if (process.argv[1] && new URL(import.meta.url).pathname === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const guard = verdictGuard(opt('--out', null));
  const res = await runPair({ parent: opt('--parent'), candidate: opt('--candidate'), unit: opt('--unit'), n: Number(opt('--n', 200)), seed: Number(opt('--seed', 1)), ms: Number(opt('--ms', 2000)), deep: deepDepth((a.find((x) => x === '--deep' || x.startsWith('--deep=')) ?? '--deep=0') === '--deep' ? 1 : (a.find((x) => x.startsWith('--deep=')) ?? '--deep=0').slice(7)), project: a.includes('--no-project') ? false : opt('--project', true), sequenceDepth: Number(opt('--sequence-depth', 2)), sequenceBreadth: Number(opt('--sequence-breadth', 4)), sequenceInputs: Number(opt('--sequence-inputs', 2)), values: valuesOpt(opt('--values', undefined)), unitSeconds: opt('--unit-seconds', undefined), ...(a.includes('--search') ? { search: true } : a.includes('--no-search') ? { search: false } : {}) }).catch((e) => ({ verdict: 'ASK', reason: `harness: ${crumbText()}: ${String(e && e.message || e).slice(0, 300)}` })); // an error that escapes the harness is ASK, never a crash and never a silent exit
  const out = opt('--out', null);
  guard.settle();
  const text = JSON.stringify(res, null, 1);
  if (out) fs.writeFileSync(out, text);
  // exit once stdout has taken the whole line: on macOS a pipe write is asynchronous, and process.exit right after
  // console.log dropped a result larger than the pipe buffer (64 KB) when the reader was slow (the same bytes as before)
  process.stdout.write((out ? `${res.verdict}${res.reason ? ': ' + res.reason : ''} -> ${out}` : text) + '\n', () => process.exit(res.verdict === 'ASK' ? 2 : 0));
}
