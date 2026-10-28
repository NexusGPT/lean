// Certified correspondence, independent of the translator and the bounded runner.
// The decidable fragment and the three simulation theorems are in design/cheap-rungs.md.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ts, loadProgram, topLevelFunctions } from './common.mjs';
const K = ts.SyntaxKind;
const hash = s => createHash('sha256').update(s).digest('hex');
const no = why => ({ status: 'undecided', why });
const yes = (rung, evidence) => ({ status: 'decided-equal', rung, evidence: { theorem: `cheap-rungs/v1/${rung}`, ...evidence } });
const walk = (n, f) => { f(n); ts.forEachChild(n, c => { walk(c, f); }); };

// Compare the PARSED grammar, including operator/declaration tokens and empty statements.
// Only punctuation semicolons are omitted; EmptyStatement remains a distinct grammar node.
// Literal spelling (including template raw text and JSX whitespace) is retained.
export function parsedTree(n, replacements = new Map()) {
  if (replacements.has(n)) return replacements.get(n);
  if (n.kind === K.EndOfFileToken || n.kind === K.SemicolonToken) return null;
  if (ts.isJSDoc(n) || ts.isJsxText(n)) return [n.kind, n.getFullText()];
  const children = n.getChildren().map(c => parsedTree(c, replacements)).filter(c => c !== null);
  return children.length ? [n.kind, children] : [n.kind, n.getText()];
}
const tree = (n, replacements) => JSON.stringify(parsedTree(n, replacements));
const BAD_NAMES = new Set(['eval', 'Function', 'Reflect', 'Proxy', 'arguments', 'caller', 'callee', 'toString', 'toLocaleString', 'stack', '__filename', '__dirname', 'require']);
function common(P, C, env) {
  if (env?.sameEnvironment !== true) return 'module environment not established';
  if (!P?.unit?.body || !C?.unit?.body) return 'unit missing or has no body';
  if (P.sf.parseDiagnostics.length || C.sf.parseDiagnostics.length) return 'parse diagnostics';
  if (JSON.stringify([...P.sf.pragmas]) !== JSON.stringify([...C.sf.pragmas]) ||
      JSON.stringify(P.sf.referencedFiles) !== JSON.stringify(C.sf.referencedFiles) ||
      JSON.stringify(P.sf.typeReferenceDirectives) !== JSON.stringify(C.sf.typeReferenceDirectives) ||
      JSON.stringify(P.sf.libReferenceDirectives) !== JSON.stringify(C.sf.libReferenceDirectives)) return 'compiler directives differ';
  if (P.unit.name !== C.unit.name) return 'unit identity changed';
  let why = null;
  for (const S of [P, C]) walk(S.sf, n => {
    if ((ts.isIdentifier(n) || ts.isStringLiteral(n)) && BAD_NAMES.has(n.text)) why = 'source reflection or dynamic environment';
    if (ts.isMetaProperty(n) || ts.isWithStatement(n)) why = 'source or dynamic scope observation';
  });
  return why;
}

// Source-changing functions may only be invoked directly. No returned callback, class method,
// decorator, inferred function name or exported alias can smuggle their source to a world call.
// Invariant: no expression of the module evaluates to a changed function object except a direct
// callee reference. Besides naming it (checked per reference, shorthand and export specifiers
// resolved to their local binding), a function object is reachable through a container that holds
// it: the global object (script declarations), the CommonJS exports object, the module namespace
// (a self import, a dynamic import) and a receiver that may be one of those (a `this` outside a
// class body). Any such handle in the module refuses the rung while a function changed.
const CONTAINER_NAMES = new Set(['globalThis', 'window', 'self', 'global', 'exports', 'module']);
function containerHandle(S) {
  let why = null;
  walk(S.sf, n => {
    if (why) return;
    if (ts.isIdentifier(n) && CONTAINER_NAMES.has(n.text) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) && !(ts.isPropertyAssignment(n.parent) && n.parent.name === n)) why = `container handle ${n.text}`;
    else if (n.kind === K.ThisKeyword) {
      const c = ts.getThisContainer(n, true, false);
      const inClass = c && (ts.isClassLike(c.parent) && (ts.isMethodDeclaration(c) || ts.isConstructorDeclaration(c) || ts.isGetAccessor(c) || ts.isSetAccessor(c) || ts.isPropertyDeclaration(c) || ts.isClassStaticBlockDeclaration(c)));
      if (!inClass) why = 'receiver outside a class body';
    } else if (ts.isCallExpression(n) && n.expression.kind === K.ImportKeyword) why = 'dynamic import';
    else if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier) {
      const m = S.checker?.getSymbolAtLocation(n.moduleSpecifier);
      if (m?.valueDeclaration === S.sf || (n.moduleSpecifier.text ?? '').replace(/\.[jt]sx?$/, '') === './' + moduleBase(S.sf.fileName)) why = 'self import';
    }
  });
  return why;
}
const moduleBase = f => path.basename(f).replace(/\.[jt]sx?$/, '');
function referencedSymbol(S, n) {
  if (ts.isShorthandPropertyAssignment(n.parent) && n.parent.name === n) return S.checker.getShorthandAssignmentValueSymbol(n.parent);
  if (ts.isExportSpecifier(n.parent)) return S.checker.getExportSpecifierLocalTargetSymbol(n.parent);
  return S.checker.getSymbolAtLocation(n);
}
function sourceGuard(P, C) {
  const functions = S => { const out = []; walk(S.sf, n => { if (ts.isFunctionLike(n) && n.body) out.push(n); }); return out; };
  const ps = functions(P), cs = functions(C);
  if (ps.length !== cs.length) return 'function structure changed';
  let changed = false;
  for (let i = 0; i < ps.length; i++) {
    if (ps[i].getText() === cs[i].getText()) continue;
    changed = true;
    for (const [S, fn] of [[P, ps[i]], [C, cs[i]]]) {
      if (!ts.isFunctionDeclaration(fn) || !ts.isSourceFile(fn.parent) || !fn.name) return 'changed function source may escape (method, closure or function value)';
      const symbol = S.checker.getSymbolAtLocation(fn.name);
      if (!symbol) return 'function binding unresolved';
      let bad = false;
      walk(S.sf, n => {
        if (!ts.isIdentifier(n) || n === fn.name || referencedSymbol(S, n) !== symbol) return;
        if (!ts.isCallExpression(n.parent) || n.parent.expression !== n) bad = true;
      });
      if (bad) return 'changed function used as a value or reflected';
    }
  }
  if (changed) for (const S of [P, C]) { const why = containerHandle(S); if (why) return `changed function reachable through a container (${why})`; }
  return null;
}

// An engine diagnostic can quote the spelling of a failing expression. Exact correspondence
// therefore retains raw spelling at potentially failing expressions, even though the surrounding
// statement grammar drops trivia. This is conservative (a comment inside a call is left undecided).
function diagnosticText(S) {
  const out = [];
  walk(S.sf, n => {
    if (ts.isCallExpression(n) || ts.isNewExpression(n) || ts.isTaggedTemplateExpression(n) ||
        ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n) || ts.isSpreadElement(n) ||
        ts.isBindingElement(n) || ts.isForOfStatement(n) || ts.isThrowStatement(n)) out.push(n.getText());
  });
  return JSON.stringify(out);
}
export function parsedEqual(P, C, env) {
  const why = common(P, C, env);
  if (why) return no(why);
  const p = tree(P.sf), c = tree(C.sf);
  if (p !== c) return no('parsed module differs');
  const source = sourceGuard(P, C);
  if (source) return no(source);
  if (diagnosticText(P) !== diagnosticText(C)) return no('engine diagnostic expression text differs');
  return yes('parsed-equal', { moduleTreeSha256: hash(p), environment: env.evidence ?? 'caller-established identical environment', source: 'changed top-level functions used only as direct callees; no source observers', exceptions: 'potential engine diagnostic expressions retain their spelling' });
}

// A deliberately small total expression language. No property read, callable input, allocation,
// implicit object coercion, write, closure, throw or TDZ can reach a renamed identifier in an error.
const primitive = n => n && [K.NumberKeyword, K.StringKeyword, K.BooleanKeyword].includes(n.kind);
const OPS = new Set([K.PlusToken, K.MinusToken, K.AsteriskToken, K.SlashToken, K.PercentToken,
  K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.LessThanToken, K.LessThanEqualsToken,
  K.GreaterThanToken, K.GreaterThanEqualsToken, K.AmpersandAmpersandToken, K.BarBarToken, K.QuestionQuestionToken]);
function normalForm(S, callees = new Map()) {
  const u = S.unit, fn = u.fn;
  if (!ts.isFunctionDeclaration(fn) || !ts.isSourceFile(fn.parent) || u.isAsync || fn.asteriskToken || fn.typeParameters?.length || !ts.isBlock(u.body)) return null;
  const names = new Map(), bound = new Map(), replacements = new Map(), declarations = [];
  const bind = (id, kind, index) => {
    if (!ts.isIdentifier(id) || names.has(id.text)) return false;
    const sym = S.checker.getSymbolAtLocation(id);
    if (!sym || sym.declarations?.length !== 1) return false;
    names.set(id.text, sym); bound.set(sym, [kind, index]); replacements.set(id, ['binding', kind, index]); return true;
  };
  for (const [i, p] of u.params.entries()) {
    if (!primitive(p.type) || p.initializer || p.questionToken || p.dotDotDotToken || p.modifiers?.length || !bind(p.name, 'parameter', i)) return null;
  }
  const expr = (n, available = bound) => {
    if (ts.isParenthesizedExpression(n)) return expr(n.expression, available);
    if (ts.isNumericLiteral(n) || ts.isStringLiteral(n) || n.kind === K.TrueKeyword || n.kind === K.FalseKeyword) return true;
    if (ts.isIdentifier(n)) {
      const b = available.get(S.checker.getSymbolAtLocation(n));
      if (!b) return false;
      replacements.set(n, ['binding', ...b]); return true;
    }
    if (ts.isPrefixUnaryExpression(n) && [K.PlusToken,K.MinusToken,K.ExclamationToken,K.TildeToken].includes(n.operator)) return expr(n.operand, available);
    if (ts.isBinaryExpression(n) && OPS.has(n.operatorToken.kind)) return expr(n.left, available) && expr(n.right, available);
    if (ts.isConditionalExpression(n)) return expr(n.condition, available) && expr(n.whenTrue, available) && expr(n.whenFalse, available);
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && !n.questionDotToken && !n.typeArguments?.length) {
      const target = callees.get(S.checker.getSymbolAtLocation(n.expression));
      return !!target && n.arguments.length === target.params.length && n.arguments.every(a => expr(a, available));
    }
    return false;
  };
  const sts = [...u.body.statements];
  if (!sts.length || !ts.isReturnStatement(sts.at(-1)) || !sts.at(-1).expression) return null;
  const locals = sts.slice(0,-1);
  // Reorder only an initial block of immutable declarations whose initializers depend on parameters
  // and literals, never on one another. Sorting by binding name happens BEFORE alpha numbering.
  const independent = locals.every(st => ts.isVariableStatement(st) && !st.modifiers?.length && st.declarationList.declarations.length === 1 &&
    st.declarationList.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let) && ts.isIdentifier(st.declarationList.declarations[0].name) &&
    st.declarationList.declarations[0].initializer && expr(st.declarationList.declarations[0].initializer, new Map(bound)));
  const ordered = independent ? [...locals].sort((a,b) => a.declarationList.declarations[0].name.text.localeCompare(b.declarationList.declarations[0].name.text)) : locals;
  for (const [i, st] of ordered.entries()) {
    if (!ts.isVariableStatement(st) || st.modifiers?.length || st.declarationList.declarations.length !== 1 || !(st.declarationList.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let))) return null;
    const d = st.declarationList.declarations[0];
    if (!d.initializer || (d.type && !primitive(d.type)) || d.exclamationToken || !expr(d.initializer) || !bind(d.name, 'local', i)) return null;
    // Replace the declaration list's const/let token only after the no-write grammar was checked.
    for (const child of st.declarationList.getChildren()) if ([K.ConstKeyword,K.LetKeyword].includes(child.kind)) replacements.set(child, ['immutable-lexical']);
    declarations.push(st);
  }
  if (!expr(sts.at(-1).expression)) return null;
  // Signatures preserve type annotations, function name, modifiers, arity and parameter position.
  replacements.set(u.body, ['body', [...declarations, sts.at(-1)].map(st => parsedTree(st, replacements))]);
  return { text: tree(fn, replacements), rules: ['binding-bijection', 'immutable-lexical', ...(independent && locals.length > 1 ? ['independent-declaration-order'] : [])] };
}
export function normalised(P, C, env) {
  const why = common(P,C,env) || sourceGuard(P,C);
  if (why) return no(why);
  // Only this unit changes; every other declaration, initializer and import must correspond.
  const context = S => tree(S.sf, new Map([[S.unit.node, ['unit', S.unit.name]]]));
  if (context(P) !== context(C)) return no('module outside the unit differs');
  const p = normalForm(P), c = normalForm(C);
  if (!p || !c) return no('rewrite conditions not established (binding, totality or source observation)');
  if (p.text !== c.text) return no('certified normal forms differ');
  return yes('normalised', { normalFormSha256: hash(p.text), rewrites: [...new Set([...p.rules,...c.rules])], environment: env.evidence ?? 'caller-established identical environment', contract: 'total primitive expressions; no writes, aliases, callbacks or engine errors' });
}
export function congruence(P, C, env) {
  const why = common(P,C,env) || sourceGuard(P,C);
  if (why) return no(why);
  if (tree(P.unit.node) !== tree(C.unit.node)) return no('caller program points or arguments differ');
  const all = [topLevelFunctions(P.sf), topLevelFunctions(C.sf)];
  const reached = new Set(), visiting = new Set(), proofs = [], masks = [new Map(),new Map()], calls = [new Map(),new Map()];
  function prove(name) {
    if (visiting.has(name)) return false; // no circular summary premises
    if (reached.has(name)) return true;
    const us = all.map(m => m.get(name));
    if (us.some(u => !u || !ts.isFunctionDeclaration(u.fn))) return false;
    visiting.add(name);
    const sub = [];
    for (const [i,S] of [P,C].entries()) walk(us[i].body, n => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
        const g = all[i].get(n.expression.text);
        if (g && S.checker.getSymbolAtLocation(n.expression) === S.checker.getSymbolAtLocation(g.fn.name)) sub.push(g.name);
      }
    });
    for (const g of new Set(sub)) if (!prove(g)) return false;
    const ss = [P,C].map((S,i) => ({ ...S, unit: us[i] }));
    const forms = ss.map((S,i) => normalForm(S,calls[i]));
    if (!forms[0] || !forms[1]) return false; // empty effects, no alias-bearing parameter, no exceptional exit
    let proof;
    if (tree(us[0].node) === tree(us[1].node) && diagnosticText(ss[0]) === diagnosticText(ss[1])) proof = { rung: 'parsed-equal', evidence: { unitTreeSha256: hash(tree(us[0].node)) } };
    else if (!sub.length && forms[0].text === forms[1].text) proof = { rung: 'normalised', evidence: { normalFormSha256: hash(forms[0].text), rewrites: forms[0].rules } };
    else return false;
    if (name !== P.unit.name) proofs.push({ unit: name, provedBy: proof.rung, evidence: proof.evidence, contract: { effects: [], aliases: 'primitive parameters and results only', exceptions: 'total; no exceptional exit' } });
    for (const [i,S] of [P,C].entries()) { masks[i].set(us[i].node,['proved-unit',name]); calls[i].set(S.checker.getSymbolAtLocation(us[i].fn.name),us[i]); }
    visiting.delete(name); reached.add(name); return true;
  }
  if (!prove(P.unit.name) || !proofs.length) return no('callee contract or proof missing (effects, alias, exceptions, recursion)');
  if (tree(P.sf,masks[0]) !== tree(C.sf,masks[1])) return no('unproved module context differs');
  if (!proofs.some(p => p.provedBy !== 'parsed-equal')) return no('no changed callee discharged');
  return yes('congruence', { callees: proofs, callerTreeSha256: hash(tree(P.unit.node)), environment: env.evidence ?? 'caller-established identical environment', contract: 'same ordered call sites and arguments; total primitive callee transitions' });
}
export function decideRungs(P,C,env) {
  const attempts = [];
  for (const rung of [parsedEqual,normalised,congruence]) {
    const result = rung(P,C,env);
    if (result.status === 'decided-equal') return result;
    attempts.push(result.why);
  }
  return no(attempts.join('; '));
}

// I/O boundary shared by check.mjs and pr.mjs. The three detectors above never read files,
// run code or invoke a solver. Imports on both sides must resolve in the SAME directory with
// identical compiler options, and the complete parsed module context is checked by each rung.
export function certifyCorrespondence({ parent, candidate, unit, project = true, adapters = null }) {
  if (!parent || !candidate || (adapters && Object.keys(adapters).length)) return no('missing side or adapted equality');
  try {
    if (path.dirname(path.resolve(parent)) !== path.dirname(path.resolve(candidate))) return no('different module resolution directories');
    const loaded = [parent,candidate].map(f => loadProgram(f,{project}));
    const [P,C] = loaded.map(S => ({ ...S, unit: topLevelFunctions(S.sf).get(unit) }));
    if (P.projectFile !== C.projectFile || JSON.stringify(P.program.getCompilerOptions()) !== JSON.stringify(C.program.getCompilerOptions())) return no('compiler environment differs');
    // A comment adapter changes the proposition, even though comments are trivia to the parser.
    if ([P,C].some(S => /lean-adapter/.test(S.sf.text))) return no('comment adapter');
    const env = { sameEnvironment: true, evidence: { resolutionDirectory: path.dirname(path.resolve(candidate)), project: P.projectFile, compilerOptionsSha256: hash(JSON.stringify(P.program.getCompilerOptions())) } };
    const result = decideRungs(P,C,env);
    if (result.status !== 'decided-equal') return result;
    return { ...result, certificate: { tool: 'lean-ts v3', unit, provedBy: result.rung,
      parent: { file: parent, sha256: hash(P.sf.text).slice(0,16) }, candidate: { file: candidate, sha256: hash(C.sf.text).slice(0,16) },
      tools: { node: process.version, typescript: ts.version }, lanes: { A: { verdict: 'PASS-proved', provedBy: result.rung, evidence: result.evidence } } } };
  } catch (e) { return no(`correspondence unavailable: ${e.name}: ${e.message}`); }
}
