#!/usr/bin/env node
// The admission contract (design/admission-contract.md): one lowering per unit, consumed by the lint and the translator.
//
// lowerFile(file, ranges, opts)   the record of every unit of a file the ranges reach: { unit, lines, readings: [{id,
//                version}], refusal: null | { id, version, rule, reason, line, by } }, and the findings the lint reports
//                from it. Phases, each consulting the catalogue (readings.mjs) once:
//                  1. the lint's own judgement (admissionFindings), each finding the refusal of the reading that owns it
//                  2. the readings the unit uses (its syntax kinds and the forms readings claim); a kind no reading
//                     reads is refused (`no-reading`), never read by default
//                  3. withdrawal: a unit that uses a withdrawn version of a reading is refused (`withdrawn`)
//                  4. emission: the translator, as the proof lane runs it (--core --heap), reads every unit phases 1-3
//                     admitted; a refusal there is the record's refusal, named by the reading its site belongs to
// admitUnits(file, ranges, lintOpts, loaded)   phases 1-3: the findings the translator's gate refuses by
// lintFindings(file, ranges, opts)  the lint's findings, read off the record (lint.mjs lintFile)
// auditSites()   every decision site of lint.mjs and translate.mjs (a refusal the lint makes, a refusal the translator
//                makes), read off their source with the compiler, each with the reading the catalogue (readings.mjs)
//                gives it; a site no entry covers is listed as such
//
// Usage: node lower.mjs --audit [--json] [--md <file>]
//        node lower.mjs <file.ts> [--no-project]        the record of each unit, as JSON
import fs from 'node:fs';
import { elementWritePath, syncLoopCallback, reduceAccumulator, plainDataRecord } from './common.mjs';
import { asyncGenerator } from './generators.mjs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ts, loadProgram, normaliseApplyCalls, topLevelFunctions, lineOf, colOf, overlaps, isArrayLike, originOf } from './common.mjs';
import { READINGS, ADVICE_RULES, STRUCTURAL_KINDS, readingById, readingOfKind, readingOfFinding, readingOfRefusal, translatorText, withdrawnReason, withdrawalKey, currentVersion } from './readings.mjs';
import { memberRow } from './library-rows.mjs';
import { methodLiteralOf } from './common.mjs';
import { moduleState } from './module-forms.mjs';
import { admissionFindings } from './lint/lint.mjs';
import { translate } from './translate/translate.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

// the rules a dynamic lint site can name: the shared decisions that hand the lint a rule (common.mjs, promise-forms.mjs,
// generators.mjs, the EFFECT_GLOBALS table, operatorValue's update-or-assignment), read off their source
const DYNAMIC_RULES = {
  'named.rule': ['promise-handler', 'promise-thenable'],
  'shape.rule': ['generator-bound', 'generator-effect', 'generator-use'], // generators.shape; executorShape's are below
  'executorShape': ['promise-executor', 'promise-executor-escape', 'promise-unsettled'],
  'w.rule': ['dynamic-key', 'prototype'],
  rule: ['update-expression', 'assignment-expression'],
  EFFECT_GLOBALS: ['dynamic-eval', 'prototype'],
};
const dynamicRules = (expr) => { for (const [k, v] of Object.entries(DYNAMIC_RULES)) if (expr === k || expr.includes(k)) return v; const lits = [...expr.matchAll(/'([a-z][a-z0-9-]*)'/g)].map((m) => m[1]); return lits.length ? lits : null; };

// the text of a message argument with every hole written `${}`: a literal, a template, a row of the library member table
// (library-rows.mjs, its message with placeholder arguments), or the first literal branch of a conditional
function templateOf(n, sf) {
  if (!n) return null;
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
  if (ts.isTemplateExpression(n)) return n.head.text + n.templateSpans.map((s) => '${}' + s.literal.text).join('');
  const row = /^memberRow\('([a-z-]+)'\)\.message\(/.exec(n.getText(sf));
  if (row && memberRow(row[1])?.message) return memberRow(row[1]).message('${}', '${}');
  if (ts.isConditionalExpression(n)) return templateOf(n.whenTrue, sf);
  if (ts.isIdentifier(n)) { // a name bound to one of the decisions below: its text
    let fn = n.parent; while (fn && !ts.isFunctionLike(fn) && !ts.isSourceFile(fn)) fn = fn.parent;
    let init = null; const w = (x) => { if (init) return; if (ts.isVariableDeclaration(x) && ts.isIdentifier(x.name) && x.name.text === n.text && x.initializer && x.pos < n.pos) init = x.initializer; ts.forEachChild(x, w); }; if (fn) w(fn);
    if (init && ts.isConditionalExpression(init)) init = ts.isCallExpression(init.whenTrue) ? init.whenTrue : init.whenFalse;
    const callee = init && ts.isCallExpression(init) && ts.isIdentifier(init.expression) ? init.expression.text : null;
    if (callee && Object.hasOwn(SHARED_TEXTS, callee)) return SHARED_TEXTS[callee];
  }
  return null;
}
// the texts of the decisions lower.mjs takes for both deciders, for the audit of the sites that hand them on
const SHARED_TEXTS = { valueAssignmentWhy: 'write this assignment as a statement' };

// the names both deciders import from a shared module (common.mjs and its kin), and the decisions lower.mjs takes for
// both: a site whose statement calls one is decided once (the named-then pattern); any other is one decider's, which the
// other reads through the record
const LOWER_DECISIONS = new Set(['installsFunction', 'loneSurrogate', 'nullPrototypeCreate', 'valueAssignmentWhy', 'numberSpecial', 'nonemptyMathArgs', 'inlinePromiseStatementKind']);
LOWER_DECISIONS.add('optionalCallShape');
function importedNames(sf) {
  const out = new Set();
  for (const st of sf.statements) if (ts.isImportDeclaration(st) && st.importClause?.namedBindings && ts.isNamedImports(st.importClause.namedBindings) && !/lint\.mjs|translate\.mjs/.test(st.moduleSpecifier.text)) for (const e of st.importClause.namedBindings.elements) out.add(e.name.text);
  return out;
}
export function auditSites(root = here) {
  const sites = [];
  const files = [['lint/lint.mjs', 'lint'], ['translate/translate.mjs', 'translate']];
  const parsed = files.map(([rel]) => ts.createSourceFile(rel, fs.readFileSync(path.join(root, rel), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS));
  const [li, tr] = parsed.map(importedNames);
  const sharedNames = new Set([...li].filter((x) => tr.has(x) && !['ts', 'lineOf', 'colOf', 'loadProgram', 'normaliseApplyCalls', 'originOf', 'isArrayLike', 'topLevelFunctions', 'unitOf', 'hintsOf', 'dn', 'fileUsesReals', 'admitUnits', 'lintFindings', 'unparen', 'applyCall'].includes(x))); // applyCall: normaliseApplyCalls reads it before both deciders, so a call it rewrote is no decision of theirs // the helpers every reading uses are no decision
  // the decision a site takes: the shared names called in its statement, in the tests that guard it (the if conditions and
  // conditional tests around it), and in the initializers of the locals those name (`const why = shared(...)`, `cs.why`)
  const isShared = (name) => sharedNames.has(name) || LOWER_DECISIONS.has(name);
  const deciders = (n, sf) => {
    let st = n; while (st && !ts.isStatement(st)) st = st.parent;
    const scope = [st];
    for (let c = st, p = st?.parent; p && !ts.isFunctionLike(p); c = p, p = p.parent) { if (ts.isIfStatement(p) && c !== p.expression) scope.push(p.expression); if (ts.isBlock(p) && p.parent && ts.isIfStatement(p.parent)) continue; if (!ts.isIfStatement(p) && !ts.isBlock(p)) break; }
    for (let c = n; c && c !== st; c = c.parent) if (c.parent && ts.isConditionalExpression(c.parent) && c.parent.condition !== c) scope.push(c.parent.condition);
    let fn = n.parent; while (fn && !ts.isFunctionLike(fn) && !ts.isSourceFile(fn)) fn = fn.parent;
    // the locals in scope at the site: declared before it in a block (or a function body) that holds it
    const holds = (b) => b.pos <= n.pos && n.end <= b.end;
    const scopeOf = (y) => { let b = y.parent; while (b && !(ts.isBlock(b) || ts.isSourceFile(b) || ts.isCaseClause(b) || ts.isDefaultClause(b) || ts.isFunctionLike(b) || ts.isIterationStatement(b, false))) b = b.parent; return b; };
    const locals = new Map(); { const w = (y) => { if (ts.isVariableDeclaration(y) && ts.isIdentifier(y.name) && y.initializer && y.pos < n.pos && scopeOf(y) && holds(scopeOf(y))) locals.set(y.name.text, y.initializer); if (holds(y) || y.end < n.pos) ts.forEachChild(y, w); }; w(sf); } // every scope that holds the site, the file's own included
    const out = new Set(), seen = new Set();
    const scan = (x) => { const w = (y) => { if (ts.isCallExpression(y)) { const f = y.expression; if (ts.isIdentifier(f) && isShared(f.text)) out.add(f.text); if (ts.isPropertyAccessExpression(f) && ts.isIdentifier(f.expression) && isShared(f.expression.text)) out.add(f.expression.text); } if (ts.isIdentifier(y) && isShared(y.text) && y.parent && ts.isCallExpression(y.parent) && y.parent.arguments.includes(y)) out.add(y.text); // a decision handed as a callback (`find(literalProtoMember)`)
      if (ts.isIdentifier(y) && locals.has(y.text) && !seen.has(y.text)) { // a local the site reads: a value it was bound to, or a wrapper whose body is one call (`const isNullCreate = (n) => nullPrototypeCreate(...)`); never a helper's whole body
        seen.add(y.text); const init = locals.get(y.text);
        if (!ts.isFunctionLike(init)) scan(init); else if (init.body && !ts.isBlock(init.body) && ts.isCallExpression(init.body)) scan(init.body);
      } if (!ts.isFunctionLike(y) || y === x) ts.forEachChild(y, w); }; w(x); };
    for (const x of scope) if (x) scan(x);
    return [...out].sort();
  };
  const statusOf = (names) => (names.some((x) => LOWER_DECISIONS.has(x)) ? 'lowering' : names.length ? 'shared' : 'one-decider');
  for (const [i, [rel, who]] of files.entries()) {
    const sf = parsed[i];
    const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
    const add = (n, kind, rules, msgNode) => {
      const template = templateOf(msgNode, sf);
      const msgText = template ?? (msgNode ? `<${msgNode.getText(sf).slice(0, 60)}>` : null);
      for (const rule of rules ?? [null]) {
        let reading;
        if (kind === 'lint-advice' || ADVICE_RULES.has(rule)) reading = 'advice';
        else if (who === 'lint') reading = rule ? readingOfFinding(rule, template ?? '') : null;
        else if (template !== null && !template.startsWith('${}')) reading = readingOfRefusal(template); // the translator's own table: a rule prefix through the lint's, else its patterns
        else reading = rule ? readingOfFinding(rule, '') : template !== null ? readingOfRefusal(template) : null;
        const by = deciders(n, sf);
        // Permanent exceptions name both different conditions in the catalogue. The lowering record's reading id
        // links to that contract without changing phase order or admission.
        const exception = readingById(reading)?.decisionExceptions?.find((e) => e.sites.some((s) => s.who === who && s.rule === rule && (!s.message || s.message === msgText)));
        sites.push({ file: `langs/ts/${rel}`, line: line(n), who, kind, rule, message: msgText, reading, decided: kind === 'lint-advice' ? 'advice' : exception ? `exception:${exception.id}` : statusOf(by), by, ...(exception ? { conditions: exception.conditions, reason: exception.reason } : {}) });
      }
    };
    const walk = (n) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
        const f = n.expression.text, a = n.arguments;
        if (who === 'lint' && (f === 'v' || f === 'note' || f === 'refuse') && a.length >= 2) {
          const ri = f === 'refuse' ? 0 : 1, r = a[ri];
          let fn = n.parent; while (fn && !ts.isFunctionLike(fn)) fn = fn.parent;
          const rules = ts.isStringLiteral(r) ? [r.text] : r.getText(sf) === 'shape.rule' && fn && fn.getText(sf).includes('executorShape(') ? DYNAMIC_RULES.executorShape : dynamicRules(r.getText(sf)); // a shape from executorShape names the promise rules, one from generators.shape the generator rules
          add(n, f === 'note' ? 'lint-advice' : 'lint-refuse', rules, a[ri + 1]);
        }
        if (who === 'translate' && f === 'fail' && a.length >= 2) {
          const t = templateOf(a[1], sf), m = t && /^([a-z][a-z0-9-]*): /.exec(t);
          const dyn = /^`\$\{(\w+)\.rule\}: \$\{\w+\.message\}`$/.exec(a[1].getText(sf)); // `${named.rule}: ${named.message}`: the shared decision's rule
          if (dyn) add(n, 'translate-refuse', dynamicRules(`${dyn[1]}.rule`), null);
          else if (!t && /\.refuse$/.test(a[1].getText(sf))) add(n, 'translate-refuse', ['prototype'], null); // a shared decorators.mjs test's refusal text, the rule the lint names it by
          else add(n, 'translate-refuse', m ? [m[1]] : null, a[1]);
        }
      }
      if (who === 'translate' && ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'Unsupported') {
        let fn = n.parent; while (fn && !ts.isFunctionLike(fn)) fn = fn.parent;
        const inFail = !!fn && fn.parent && ts.isVariableDeclaration(fn.parent) && fn.parent.name.getText(sf) === 'fail'; // the mechanism every fail site throws through, not a site
        if (!inFail) add(n, 'translate-throw', null, n.arguments?.[0]);
      }
      if (who === 'lint' && ts.isObjectLiteralExpression(n) && n.parent && ts.isCallExpression(n.parent) && /\.push$/.test(n.parent.expression.getText(sf))) {
        const p = n.properties.find((q) => ts.isPropertyAssignment(q) && q.name.getText(sf) === 'rule');
        if (p) add(n, 'lint-refuse', ts.isStringLiteral(p.initializer) ? [p.initializer.text] : ['ts-strict', 'unresolved-module'], n.properties.find((q) => ts.isPropertyAssignment(q) && q.name.getText(sf) === 'msg')?.initializer);
      }
      ts.forEachChild(n, walk);
    };
    walk(sf);
  }
  return sites;
}

// ---------- decisions both deciders take, each one predicate and one text (the named-then pattern) ----------
// Each replaces a test the lint and the translator each wrote for one construct: the lint refuses by it, the translator
// reads (or refuses) by the same call, so the two can no longer answer one construct two ways.
// a function value stored into an outside root (`process.onExit = () => ...`): the outside calls it later, no transition
// reads that call (lint property-assign, translator globalWrite)
export function installsFunction(checker, value) {
  const t = checker.getTypeAtLocation(value);
  const parts = t.flags & ts.TypeFlags.Union ? t.types.filter((x) => !(x.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null))) : [t];
  return parts.some((x) => checker.getSignaturesOfType(x, ts.SignatureKind.Call).length > 0);
}
export const INSTALLS_FUNCTION_WHY = (root) => `a function installed into \`${root}\` is called by the outside later; no transition reads that call`;
// a string holding a UTF-16 surrogate code unit (an astral character or a lone surrogate): the string model is a
// sequence of BMP scalar values (lint string-code-unit on literals, translator strEsc on every string it writes)
export const loneSurrogate = (text) => /[\uD800-\uDFFF]/.test(text);
export const LONE_SURROGATE_WHY = 'use BMP scalar literals within the string model; astral and surrogate strings need lane B';
// `Object.create(null)` of the global Object: an object without a prototype, which no plain-object reading holds (lint
// prototype, translator isNullCreate, which also types it as a dictionary where the context does)
export function nullPrototypeCreate(checker, n, sf, current = null) {
  return ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === 'Object' && n.expression.name.text === 'create' && n.arguments.length === 1 && n.arguments[0].kind === ts.SyntaxKind.NullKeyword && originOf(checker, n.expression.expression, sf, current).kind === 'global';
}
export const NULL_PROTOTYPE_WHY = '`Object.create(null)` makes an object without a prototype; a plain object\'s reads and `in` go through Object.prototype and the ordinary lane has one dictionary for both; write `{}` and test own keys with `Object.prototype.hasOwnProperty.call(d, k)`';
// an assignment used as a value (`(x += 1)`): `=`, `+=`, `-=` and `*=` have a value reading; any other operator is
// refused (lint assignment-expression, translator operatorValue). The text, or null
export const valueAssignmentWhy = (op) => ([ts.SyntaxKind.EqualsToken, ts.SyntaxKind.PlusEqualsToken, ts.SyntaxKind.MinusEqualsToken, ts.SyntaxKind.AsteriskEqualsToken].includes(op) ? null : 'write this assignment as a statement');

// The numbers reading has two syntactic forms. Origin matters only for a name; a shadowed NaN is ordinary data.
export function numberSpecial(form, value, origin = null) {
  if (form === 'literal') return !Number.isFinite(Number(value));
  if (form === 'global') return origin === 'global' && ['NaN', 'Infinity'].includes(value);
  throw new Error(`unknown number form: ${form}`);
}

// Math.min/max require a provably nonempty sequence, including dominance and intervening writes.
export function nonemptyMathArgs(checker, e) {
  const K = ts.SyntaxKind, TF = ts.TypeFlags;
  const tOf = (n) => checker.getTypeAtLocation(n);
  const nonNull = (t) => t.flags & TF.Union ? t.types.filter(x => !(x.flags & (TF.Null | TF.Undefined))) : [t];
  const unparenX = (n) => { while (ts.isParenthesizedExpression(n)) n = n.expression; return n; };
  const isArrayExpr = (n) => nonNull(tOf(n)).every(t => isArrayLike(checker, t));
  const MUT_NAMES = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'set', 'add', 'delete', 'clear', 'fill', 'copyWithin']);
  const filled = (a) => !ts.isSpreadElement(a) || (ts.isArrayLiteralExpression(a.expression) && a.expression.elements.some(filled));
  if (e.arguments.some(filled)) return true;
  if (e.arguments.length !== 1 || !ts.isSpreadElement(e.arguments[0])) return false;
  const lengthName = (x) => { // the name whose length the value's length is
    x = unparenX(x);
    if (ts.isIdentifier(x)) return isArrayExpr(x) ? checker.getSymbolAtLocation(x) : null;
    if (ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && !x.expression.questionDotToken && isArrayExpr(x.expression.expression) && ((x.expression.name.text === 'map' && x.arguments.length === 1) || (x.expression.name.text === 'slice' && !x.arguments.length))) return lengthName(x.expression.expression);
    if (ts.isArrayLiteralExpression(x) && x.elements.length === 1 && ts.isSpreadElement(x.elements[0])) return lengthName(x.elements[0].expression);
    return null;
  };
  const sym = lengthName(e.arguments[0].expression);
  if (!sym) return false;
  const isLen = (x) => { x = unparenX(x); return ts.isPropertyAccessExpression(x) && x.name.text === 'length' && !x.questionDotToken && ts.isIdentifier(unparenX(x.expression)) && checker.getSymbolAtLocation(unparenX(x.expression)) === sym; };
  // the test c, known to be `truth`, says the length is above zero
  const implies = (c, truth) => {
    c = unparenX(c);
    if (ts.isPrefixUnaryExpression(c) && c.operator === K.ExclamationToken) return implies(c.operand, !truth);
    if (ts.isBinaryExpression(c) && c.operatorToken.kind === K.AmpersandAmpersandToken) return truth && (implies(c.left, true) || implies(c.right, true));
    if (ts.isBinaryExpression(c) && c.operatorToken.kind === K.BarBarToken) return !truth && (implies(c.left, false) || implies(c.right, false));
    if (isLen(c)) return truth;
    if (!ts.isBinaryExpression(c)) return false;
    let op = c.operatorToken.kind, lit = unparenX(c.right);
    if (!isLen(c.left)) { if (!isLen(c.right)) return false; lit = unparenX(c.left); op = { [K.LessThanToken]: K.GreaterThanToken, [K.LessThanEqualsToken]: K.GreaterThanEqualsToken, [K.GreaterThanToken]: K.LessThanToken, [K.GreaterThanEqualsToken]: K.LessThanEqualsToken }[op] ?? op; }
    if (!ts.isNumericLiteral(lit)) return false;
    const n = Number(lit.text);
    if (truth) return (op === K.GreaterThanToken && n >= 0) || (op === K.GreaterThanEqualsToken && n >= 1) || ((op === K.ExclamationEqualsEqualsToken || op === K.ExclamationEqualsToken) && n === 0);
    return (op === K.LessThanEqualsToken && n >= 0) || (op === K.LessThanToken && n >= 1) || ((op === K.EqualsEqualsEqualsToken || op === K.EqualsEqualsToken) && n === 0);
  };
  const writes = (node, from, to) => { // a write of the name inside node between two positions
    let hit = false;
    const w = (x) => {
      if (hit || x.end <= from || x.pos >= to) return;
      if (ts.isIdentifier(x) && checker.getSymbolAtLocation(x) === sym) {
        let top = x; while (top.parent && (ts.isParenthesizedExpression(top.parent) || ts.isNonNullExpression(top.parent))) top = top.parent;
        const p = top.parent;
        if (p && ts.isBinaryExpression(p) && p.left === top && p.operatorToken.kind >= K.FirstAssignment && p.operatorToken.kind <= K.LastAssignment) hit = true;
        if (p && ts.isPropertyAccessExpression(p) && p.expression === top && (MUT_NAMES.has(p.name.text) || (p.name.text === 'length' && p.parent && ts.isBinaryExpression(p.parent) && p.parent.left === p))) hit = true;
      }
      ts.forEachChild(x, w);
    };
    w(node);
    return hit;
  };
  // a statement that never completes normally: a jump, or a block ending in one (the statements before it cannot reach the end)
  const exits = (st) => { if (ts.isBlock(st)) return st.statements.length > 0 && exits(st.statements[st.statements.length - 1]); return ts.isReturnStatement(st) || ts.isThrowStatement(st) || ts.isBreakStatement(st) || ts.isContinueStatement(st); };
  // a loop around the call runs it again after the statements that follow it: a write of the list anywhere in the loop can empty it for the next pass
  let loopEnd = 0;
  for (let child = e, p = e.parent; p && !ts.isFunctionLike(p); child = p, p = p.parent) {
    const upto = Math.max(e.pos, loopEnd);
    if (ts.isConditionalExpression(p) && child !== p.condition && implies(p.condition, p.whenTrue === child) && !writes(p, p.condition.end, upto)) return true;
    if (ts.isIfStatement(p) && child !== p.expression && implies(p.expression, p.thenStatement === child) && !writes(p, p.expression.end, upto)) return true;
    if (ts.isBinaryExpression(p) && child === p.right && ((p.operatorToken.kind === K.AmpersandAmpersandToken && implies(p.left, true)) || (p.operatorToken.kind === K.BarBarToken && implies(p.left, false))) && !writes(p, p.left.end, upto)) return true;
    if ((ts.isBlock(p) || ts.isSourceFile(p) || ts.isCaseClause(p) || ts.isDefaultClause(p)) && p.statements) {
      const k = p.statements.indexOf(child);
      for (let i = k - 1; i >= 0; i--) { const g = p.statements[i]; if (ts.isIfStatement(g) && !g.elseStatement && exits(g.thenStatement) && implies(g.expression, false) && !writes(p, g.end, upto)) return true; }
    }
    if (ts.isIterationStatement(p, false)) loopEnd = Math.max(loopEnd, p.end);
  }
  return false;
}

// One optional-call decision: the lint reads why; emission reads kind, absence, field and signature.
// Context carries lexical facts from the caller, never a second callee classifier. valueOperands records an
// active synthetic value-step context; source contexts are checked below by the same rule.
export function optionalCallShape(checker, e, sf, context = {}) {
  const K = ts.SyntaxKind, TF = ts.TypeFlags;
  const tOf = (n) => checker.getTypeAtLocation(n);
  const nonNull = (t) => t.flags & TF.Union ? t.types.filter((x) => !(x.flags & (TF.Undefined | TF.Null))) : [t];
  const isAny = (t) => !!(t.flags & (TF.Any | TF.Unknown));
  const isOptional = (t) => !!(t.flags & TF.Union) && t.types.some((x) => x.flags & (TF.Undefined | TF.Null));
  const local = (n) => originOf(checker, n, sf, context.current ?? null).kind === 'local';
  const refuse = (why) => ({ why });
  const valueStepIn = (n) => {
    if (!n || ts.isFunctionLike(n)) return false;
    if ((ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment) ||
        ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && [K.PlusPlusToken, K.MinusMinusToken].includes(n.operator)) ||
        ts.isCommaListExpression(n) || (ts.isBinaryExpression(n) && n.operatorToken.kind === K.CommaToken)) return true;
    let found = false; ts.forEachChild(n, (c) => { if (!found && valueStepIn(c)) found = true; }); return found;
  };
  let top = e;
  for (let p = e.parent; p && !ts.isStatement(p) && !ts.isFunctionLike(p) && !ts.isVariableDeclaration(p) && !ts.isParameter(p) && !ts.isCaseClause(p) && !ts.isSourceFile(p); p = p.parent) top = p;
  const root = ts.isBinaryExpression(top) && top.operatorToken.kind >= K.FirstAssignment && top.operatorToken.kind <= K.LastAssignment && top.parent && ts.isExpressionStatement(top.parent) ? top.right : top;
  if (context.valueOperands || valueStepIn(root)) return refuse('write the optional call in its own statement; an assignment, update or comma beside it evaluates every operand before the call decides');
  const plainRecord = (t) => {
    const parts = nonNull(t); if (parts.length !== 1) return false;
    const p = parts[0], literal = methodLiteralOf(checker, p);
    return !!(p.flags & (TF.Object | TF.Intersection)) && !isArrayLike(checker, p) && !['Set', 'ReadonlySet', 'Map', 'ReadonlyMap', 'Promise'].includes(p.symbol?.name) &&
      !isAny(p) && !p.symbol?.declarations?.some((d) => (ts.isClassDeclaration(d) || ts.isClassExpression(d)) && d.getSourceFile() === sf) && literal?.getSourceFile() !== sf;
  };
  const functionShape = (t) => {
    const parts = nonNull(t); if (parts.length !== 1 || isAny(parts[0])) return null;
    const sigs = checker.getSignaturesOfType(parts[0], ts.SignatureKind.Call);
    return sigs.length === 1 && !sigs[0].typeParameters?.length ? { calleeType: parts[0], signature: sigs[0] } : null;
  };
  const f = e.expression;
  if (ts.isIdentifier(f)) {
    if (!local(f)) return refuse('an optional call reads a local function value; bind an imported or global callee to a local first');
    const declared = tOf(f), fn = functionShape(declared);
    return fn ? { why: null, kind: 'local', callee: f, declared, absent: isOptional(declared), ...fn } : refuse('an optional call needs a callee typed as one nongeneric function or undefined; narrow an opaque or overloaded value first');
  }
  if (!ts.isPropertyAccessExpression(f)) return refuse('an optional call reads a named callee; bind a computed callee to a local first');
  const recv = f.expression, name = f.name.text;
  if (recv.kind === K.ThisKeyword) {
    if (!context.currentClass || context.objectMethod || context.thisParam) return refuse('an optional call on `this` reads a field of a class receiver');
    if (context.units?.has(`${context.currentClass.name?.text}.${name}`)) return { why: null, kind: 'method', callee: f, absent: false };
    const field = checker.getPropertyOfType(tOf(recv), name);
    const declared = field && checker.getTypeOfSymbolAtLocation(field, f), fn = declared && functionShape(declared);
    if (!fn || field.declarations?.some((d) => ts.isGetAccessorDeclaration(d) || ts.isSetAccessorDeclaration(d))) return refuse('an optional call on `this` reads a function field of the class');
    return { why: null, kind: 'receiver', callee: f, receiver: recv, name, field, declared, absent: isOptional(declared) || !!(field.flags & ts.SymbolFlags.Optional), ...fn };
  }
  let link = recv;
  for (;;) {
    if (ts.isPropertyAccessExpression(link) && link.questionDotToken) return refuse('an optional call reads a field of a nonoptional record path; narrow the path first');
    if (ts.isIdentifier(link)) { if (!local(link)) return refuse('an optional call reads a function field of a record held in a local or a parameter'); break; }
    if (!ts.isPropertyAccessExpression(link)) return refuse('an optional call reads a function field of a record path; bind the receiver to a local first');
    link = link.expression;
  }
  for (let x = recv; ts.isPropertyAccessExpression(x); x = x.expression) if (!plainRecord(tOf(x.expression)) || nonNull(tOf(x.expression)).length !== (tOf(x.expression).types?.length ?? 1)) return refuse('an optional call reads a field of a nonoptional record path; narrow the path first');
  const receiverType = tOf(recv);
  if (!plainRecord(receiverType)) return refuse('an optional call reads a function field of a plain record; narrow an opaque, class or union receiver first');
  if (isOptional(receiverType) && !f.questionDotToken) return refuse('an optional call reads a field of a present record');
  const receiverBase = nonNull(receiverType)[0], field = checker.getPropertyOfType(receiverBase, name);
  const declared = field && checker.getTypeOfSymbolAtLocation(field, f), fn = declared && functionShape(declared);
  if (!fn) return refuse('an optional call reads a declared function field of the record');
  const absentReceiver = !!f.questionDotToken && isOptional(receiverType), absentField = isOptional(declared) || !!(field.flags & ts.SymbolFlags.Optional);
  return { why: null, kind: 'record', callee: f, receiver: recv, name, receiverType, receiverBase, field, declared, absentReceiver, absentField, absent: absentReceiver || absentField, ...fn };
}

// One inline-promise statement vocabulary; emission dispatch and admission consume the same kind.
const INLINE_PROMISE_STATEMENTS = new Map([
  [ts.SyntaxKind.Block, 'block'], [ts.SyntaxKind.EmptyStatement, 'empty'],
  [ts.SyntaxKind.ReturnStatement, 'return'], [ts.SyntaxKind.ThrowStatement, 'throw'],
  [ts.SyntaxKind.IfStatement, 'if'], [ts.SyntaxKind.VariableStatement, 'variable'],
  [ts.SyntaxKind.ExpressionStatement, 'expression'],
]);
export const inlinePromiseStatementKind = (node) => INLINE_PROMISE_STATEMENTS.get(node.kind) ?? null;

// Permanent exception: admission risk is a source-level conservative test; value outputs describe the actual
// lowering ABI. One traversal and one fixed point carry both named conditions. Their scopes are deliberately not
// conflated: doing so would either weaken the gate or add/remove outputs from emitted functions.
export const MUTATION_DECISIONS = readingById('mutation').decisions;
for (const decision of ['mutationAnalysis', 'parameterMutationConflicts', 'loopElementBinding', 'elementMutation', 'firstElementMutation']) LOWER_DECISIONS.add(decision);
const MUTATION_METHODS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'set', 'add', 'delete', 'clear', 'fill', 'copyWithin']);
const mutationRoot = (x) => { while (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x) || ts.isNonNullExpression(x) || ts.isParenthesizedExpression(x)) x = x.expression; return x; };
const mutationAssignment = (n) => ts.isBinaryExpression(n) && n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && n.operatorToken.kind <= ts.SyntaxKind.LastAssignment;
const mutationUpdate = (n) => (ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(n.operator);
const mutationThisParam = (u) => u?.params?.[0] && ts.isIdentifier(u.params[0].name) && u.params[0].name.text === 'this';
// emission is null during admission; its output answer is then null (not computed). At emission, the established
// loop lowering and receiver-call binding supply their context. This analysis never guesses which callback is emitted.
export function mutationAnalysis(checker, sf, units, emission = null) {
  const all = [...units.values()], records = new Map(), edges = [];
  for (const u of all) {
    if (!u.body && !emission) continue;
    const names = new Set(u.params.filter(p => ts.isIdentifier(p.name)).map(p => p.name.text));
    const rec = { admissionRisk: new Set(), valueOutputs: emission ? new Set() : null, rebound: [] };
    records.set(u.name, rec);
    const rebounds = new Set();
    const own = (r) => ts.isIdentifier(r) ? r.text : r.kind === ts.SyntaxKind.ThisKeyword && mutationThisParam(u) ? 'this' : null;
    const hit = (target, admission, output, through = true) => {
      const r = mutationRoot(target);
      if (through && r === target) return;
      if (admission && ts.isIdentifier(r) && names.has(r.text)) rec.admissionRisk.add(r.text);
      const name = output && own(r);
      if (name && names.has(name)) rec.valueOutputs.add(name);
    };
    const edge = (callee, args, projection, roots) => {
      if (!callee) return;
      callee.params.forEach((p, i) => {
        if (!ts.isIdentifier(p.name) || !args[i]) return;
        const a = roots ? mutationRoot(args[i]) : args[i];
        const name = projection === 'admissionRisk' ? (ts.isIdentifier(a) ? a.text : null) : own(a);
        if (name && names.has(name)) edges.push({ from: callee.name, input: p.name.text, to: u.name, output: name, projection });
      });
    };
    const walk = (n, admission, output) => {
      if (ts.isFunctionLike(n) && n !== u.fn) admission = false;
      if ((ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && !emission?.isLoopCallback(n)) output = false;
      if (!admission && !output) return;
      const target = mutationAssignment(n) ? n.left : mutationUpdate(n) ? n.operand : ts.isDeleteExpression(n) ? n.expression : null;
      if (target) {
        hit(target, admission, output);
        if (output && !ts.isDeleteExpression(n)) { const ew = elementWritePath(checker, target); if (ew && names.has(ew.root.text)) rec.valueOutputs.add(ew.root.text); }
        if (admission && !ts.isDeleteExpression(n)) {
          let t = target; while (ts.isParenthesizedExpression(t)) t = t.expression;
          const d = ts.isIdentifier(t) ? checker.getSymbolAtLocation(t)?.valueDeclaration : null;
          if (d && ts.isParameter(d) && d.parent === u.fn) rebounds.add(d);
        }
      }
      if (ts.isCallExpression(n)) {
        const f = n.expression;
        if (admission && ts.isPropertyAccessExpression(f)) {
          if (MUTATION_METHODS.has(f.name.text)) hit(f.expression, true, false, false);
          if (ts.isIdentifier(f.expression) && f.expression.text === 'Object' && f.name.text === 'assign' && n.arguments[0]) hit(n.arguments[0], true, false, false);
        }
        if (admission && ts.isIdentifier(f) && units.get(f.text)?.body) edge(units.get(f.text), n.arguments, 'admissionRisk', true);
        if (output) { const via = emission.receiverCallArgs(n); if ((ts.isIdentifier(f) && units.has(f.text)) || via) edge(via ? via.callee : units.get(f.text), via ? via.args : n.arguments, 'valueOutputs', false); }
      }
      if (output && ts.isExpressionStatement(n)) {
        let e = n.expression; while (ts.isParenthesizedExpression(e)) e = e.expression;
        if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression)) {
          const f = e.expression;
          if (MUTATION_METHODS.has(f.name.text)) hit(f.expression, false, true, false);
          if (ts.isIdentifier(f.expression) && f.expression.text === 'Object' && f.name.text === 'assign' && e.arguments.length >= 2) {
            const r = mutationRoot(e.arguments[0]); if (ts.isIdentifier(r) && names.has(r.text)) rec.valueOutputs.add(r.text);
          }
        }
      }
      ts.forEachChild(n, x => walk(x, admission, output));
    };
    // A bodyless emission retains the translator's existing handling; this change does not alter ambient admission.
    walk(u.body, !!u.body, !!emission && !asyncGenerator(u));
    rec.rebound = [...rebounds];
  }
  for (let changed = true; changed;) {
    changed = false;
    for (const e of edges) {
      const source = records.get(e.from)?.[e.projection], dest = records.get(e.to)?.[e.projection];
      if (source?.has(e.input) && dest && !dest.has(e.output)) { dest.add(e.output); changed = true; }
    }
  }
  return { conditions: MUTATION_DECISIONS, units: records };
}
export const parameterMutationConflicts = (record, projection) => record ? record.rebound.filter(d => record[projection]?.has(d.name.text)) : [];

// One binding classification for the source admission and the value-emission backstops. The owned accumulator
// condition deliberately does not include write depth; the admission condition below additionally checks that depth.
export function loopElementBinding(checker, id, isLoopCallback = () => false) {
  const d = checker.getSymbolAtLocation(id)?.valueDeclaration;
  if (!d) return null;
  const parameter = ts.isParameter(d), synchronous = parameter && !!d.parent && syncLoopCallback(d.parent, checker);
  const emitted = parameter && !!d.parent && isLoopCallback(d.parent);
  const forOf = ts.isVariableDeclaration(d) && !!d.parent && ts.isVariableDeclarationList(d.parent) && !!d.parent.parent && ts.isForOfStatement(d.parent.parent);
  const ownedAccumulator = parameter && reduceAccumulator(d, checker);
  return { decl: d, synchronous, emitted, forOf, ownedAccumulator, valueElement: !ownedAccumulator && (synchronous || emitted || forOf) };
}
// A shared write classification carries BOTH conditions: a source shape eligible for the heap, and actual planner
// selection. null selection is the admission phase. false selection means the value emitter must refuse a lost write.
export function elementMutation(checker, e, { isLoopCallback = () => false, heapSelected = null, sf = e.getSourceFile(), current = null } = {}) {
  let target = mutationAssignment(e) ? e.left : mutationUpdate(e) ? e.operand : ts.isDeleteExpression(e) ? e.expression : null;
  let valueWriteForm = true;
  if (!target && ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression)) {
    const f = e.expression;
    if (ts.isIdentifier(f.expression) && f.expression.text === 'Object' && f.name.text === 'assign') target = e.arguments[0] ?? null;
    else if (MUTATION_METHODS.has(f.name.text)) { target = f.expression; valueWriteForm = !['fill', 'copyWithin'].includes(f.name.text); }
  }
  if (!target) return null;
  let root = target; while (ts.isPropertyAccessExpression(root) || ts.isElementAccessExpression(root) || ts.isParenthesizedExpression(root) || ts.isNonNullExpression(root) || ts.isAsExpression(root)) root = root.expression;
  if (!ts.isIdentifier(root)) return null;
  const binding = loopElementBinding(checker, root, isLoopCallback);
  const d = originOf(checker, root, sf, current).decl;
  const sourceParameter = !!d && ts.isParameter(d) && syncLoopCallback(d.parent, checker);
  const sourceCall = sourceParameter ? d.parent.parent : null;
  const ownedWrite = sourceParameter && reduceAccumulator(d, checker, target);
  const fieldWrite = (mutationAssignment(e) && [ts.SyntaxKind.EqualsToken, ts.SyntaxKind.PlusEqualsToken, ts.SyntaxKind.MinusEqualsToken, ts.SyntaxKind.AsteriskEqualsToken].includes(e.operatorToken.kind)) || mutationUpdate(e);
  const heapShapeEligible = !!(sourceParameter && fieldWrite && sourceCall.expression.name.text === 'forEach' && sourceCall.parent && ts.isExpressionStatement(sourceCall.parent) && d.parent.parameters.length === 1 && d.parent.parameters[0] === d && ts.isIdentifier(d.name) && plainDataRecord(checker, checker.getTypeAtLocation(d.name)));
  const admissionThrough = root !== target || !ts.isBinaryExpression(e) || ts.isCallExpression(e);
  const valueThrough = root !== target || ts.isCallExpression(e);
  return {
    node: e, target, root, name: root.text, binding, sourceCall, sourceDecl: d, ownedWrite, heapShapeEligible, heapSelected,
    admissionRefused: !!(admissionThrough && sourceParameter && !ownedWrite && !heapShapeEligible),
    valueRefused: !!(heapSelected !== true && valueWriteForm && valueThrough && binding?.valueElement),
    conditions: MUTATION_DECISIONS,
  };
}
export function firstElementMutation(checker, u, context) {
  let hit = null;
  const walk = n => { if (hit) return; const decision = elementMutation(checker, n, context); if (decision?.valueRefused) { hit = decision; return; } ts.forEachChild(n, walk); };
  if (u.body) walk(u.body);
  return hit;
}

// ---------- the lowering ----------
const K = ts.SyntaxKind;
// a syntax kind's name: several names share one value (FirstStatement is VariableStatement); the one not First/Last
const KIND_NAME = new Map();
for (const [name, value] of Object.entries(K)) if (typeof value === 'number' && (!KIND_NAME.has(value) || /^(First|Last)[A-Z]/.test(KIND_NAME.get(value)))) KIND_NAME.set(value, name);
export const kindName = (n) => KIND_NAME.get(n.kind) ?? String(n.kind);
const isToken = (n) => n.kind >= K.FirstToken && n.kind <= K.LastToken;
const USES = READINGS.filter((r) => r.uses);
const ALWAYS = READINGS.filter((r) => r.always).map((r) => r.id);
const LIB_NAMESPACES = new Set(['Math', 'Object', 'JSON', 'Array', 'Number', 'String', 'Promise']);

// the readings a unit uses, and the syntax no reading reads: a walk of its parameters and body. A type is read by the
// type reading (its nodes are not walked), a token (punctuation, a modifier) by the node that holds it
export function unitReadings(u, sf, checker) {
  const used = new Set(ALWAYS), unread = [];
  const ctx = {
    moduleState: (id) => { try { return moduleState(checker, id, sf); } catch { return null; } },
    libraryReceiver: (e) => {
      if (ts.isIdentifier(e) && LIB_NAMESPACES.has(e.text)) return true;
      let t; try { t = checker.getTypeAtLocation(e); } catch { return false; }
      const parts = t.flags & ts.TypeFlags.Union ? t.types.filter((x) => !(x.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null))) : [t];
      return parts.length > 0 && parts.every((x) => isArrayLike(checker, x) || !!(x.flags & ts.TypeFlags.StringLike) || ['Set', 'Map', 'ReadonlySet', 'ReadonlyMap'].includes(x.symbol?.name));
    },
  };
  const visit = (n) => {
    if (ts.isTypeNode(n) || n.kind === K.TypeParameter) return;
    const kind = kindName(n), owner = readingOfKind(kind);
    if (owner) used.add(owner);
    else if (!isToken(n) && !STRUCTURAL_KINDS.has(kind)) unread.push({ kind, node: n });
    if (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) return; // a type the unit declares: erased, read through the checker, its members never walked
    for (const r of USES) if (!used.has(r.id) && r.uses(n, ts, ctx)) used.add(r.id);
    ts.forEachChild(n, visit);
  };
  for (const p of u.params ?? []) visit(p);
  if (u.body) visit(u.body);
  return { readings: [...used].sort().map((id) => ({ id, version: currentVersion(readingById(id)) })), unread };
}

const finding = (sf, file, node, rule, msg, extra = {}) => { const pos = node.getStart(sf), end = node.getEnd(); return { file, line: lineOf(sf, pos), col: colOf(sf, pos), endLine: lineOf(sf, end), endCol: colOf(sf, end), rule, msg, text: sf.text.slice(pos, end).slice(0, 200), ...extra }; };
const unitsIn = (sf, ranges) => [...topLevelFunctions(sf).values()].filter((u) => overlaps(sf, u.node, ranges));
const spanOf = (sf, u) => [lineOf(sf, u.node.getStart(sf)), lineOf(sf, u.node.getEnd())];
const refusing = (f) => !f.env && !f.advisory && !ADVICE_RULES.has(f.rule);
const tagReading = (f) => { if (!f.reading) { const id = refusing(f) ? (readingOfFinding(f.rule, f.msg) ?? 'uncatalogued') : null; if (id) f.reading = { id, version: readingById(id) ? currentVersion(readingById(id)) : null }; } return f; };

// phases 1-3 for the units the ranges reach: the lint's findings, each tagged with its reading, and a finding for each unit
// that uses syntax no reading reads or a withdrawn reading. `loaded` is the program the walk reads (the translator's, or
// the lowering's own); lintOpts go to the lint as they always did
export function admitUnits(file, ranges, lintOpts = {}, loaded = null) {
  const out = admissionFindings(file, ranges, lintOpts).map(tagReading);
  const L = loaded ?? normaliseApplyCalls(lintOpts.loaded ?? loadProgram(file, { project: lintOpts.project ?? true }));
  const { sf, checker } = L;
  const records = [];
  for (const u of unitsIn(sf, ranges)) {
    const { readings, unread } = unitReadings(u, sf, checker);
    const [a, b] = spanOf(sf, u);
    const extra = { unit: u.name, label: 'migration', labelDecided: false, advice: null };
    for (const { kind, node } of unread) out.push(finding(sf, file, node, 'no-reading', `${kind} has no reading in the catalogue of readings (readings.mjs); it is refused, never read by default`, { ...extra, reading: { id: 'no-reading', version: null } }));
    for (const r of readings) { const why = withdrawnReason(r.id); if (why) out.push(finding(sf, file, u.node, 'withdrawn', `reading ${r.id} version ${r.version} is withdrawn: ${why}`, { ...extra, reading: r })); }
    records.push({ unit: u.name, lines: [a, b], readings });
  }
  out.sort((x, y) => x.line - y.line || x.col - y.col);
  admitted.set(out, records);
  return out;
}
const admitted = new WeakMap(); // the findings array admitUnits returned -> the units it read, with their readings

// where in translate.mjs a refusal was made: the first frame of its stack inside translate.mjs that is not `fail` itself
const TRANSLATE = path.join(here, 'translate', 'translate.mjs');
let failLine = null;
function translatorSite(stack) {
  if (failLine === null) { const lines = fs.readFileSync(TRANSLATE, 'utf8').split('\n'); failLine = lines.findIndex((l) => /^\s*const fail = \(n, msg\) =>/.test(l)) + 1; }
  for (const m of String(stack ?? '').matchAll(/translate\.mjs:(\d+):\d+/g)) if (Number(m[1]) !== failLine) return `langs/ts/translate/translate.mjs:${m[1]}`;
  return null;
}

const memo = new Map();
const MEMO_MAX = 64;
// the record of every unit the ranges reach; opts as the lint takes them (project, loaded, advisory, anyType)
export function lowerFile(file, ranges = null, opts = {}) {
  const abs = path.resolve(file);
  const given = opts.loaded ?? loadProgram(file, { project: opts.project ?? true });
  const key = [abs, createHash('sha256').update(given.sf.text).digest('hex'), JSON.stringify(opts.project ?? true), JSON.stringify(ranges), !!opts.advisory, !!opts.anyType, opts.emission !== false, withdrawalKey()].join('\0');
  if (memo.has(key)) return memo.get(key);
  const L = normaliseApplyCalls(given);
  const findings = admitUnits(file, ranges, { ...opts, loaded: given }, L);
  const units = admitted.get(findings).map((r) => {
    const [a, b] = r.lines;
    const f = findings.find((x) => refusing(x) && x.line >= a && x.line <= b);
    return { ...r, refusal: f ? { id: f.reading?.id ?? 'uncatalogued', version: f.reading?.version ?? null, rule: f.rule, reason: f.msg, line: f.line, by: ['no-reading', 'withdrawn'].includes(f.rule) ? 'catalogue' : 'lint' } : null };
  });
  // phase 4: the translator reads each unit phases 1-3 admitted exactly as the proof lane runs it (check.mjs: --core --heap
  // --only <unit>, not tolerant): the unit with the same-file units it calls, behind the translator's gate over all of
  // them. A refusal there is the record's, named by the reading its site belongs to; a callee refused refuses the unit,
  // since the gate and the emission take the callees with it. A translation that crashes refuses the unit by that, named
  const open = units.filter((u) => !u.refusal);
  if (open.length && opts.emission !== false) {
    const refuse = (u, id, rule, reason, line, by, site = null) => { u.refusal = { id, version: readingById(id) ? currentVersion(readingById(id)) : null, rule, reason, line, by, ...(site ? { site } : {}) }; };
    for (const u of open) {
      try { translate(file, null, { core: true, heap: true, project: opts.project ?? true, only: [u.unit], loaded: given }); }
      catch (e) {
        const message = String(e?.message ?? e);
        if (e?.constructor?.name !== 'Unsupported') { refuse(u, 'translator-internal', 'translator-crash', `the translator stopped: ${message.split('\n')[0]}`, u.lines[0], 'translate', translatorSite(e?.stack)); continue; }
        const gate = /^outside the subset:\n\s+\S+?:(\d+):\d+\s+(\S+)\s+(.*)$/m.exec(message); // the gate over the unit and its callees: its first finding
        if (gate) { const [, line, rule, msg] = gate; refuse(u, readingOfFinding(rule, msg) ?? (rule === 'withdrawn' || rule === 'no-reading' ? rule : 'uncatalogued'), rule, msg, Number(line), 'gate'); continue; }
        const text = translatorText(message.split('\n')[0]), id = readingOfRefusal(text) ?? 'uncatalogued';
        const m = /^([a-z][a-z0-9-]*): /.exec(text), line = Number(/:(\d+): /.exec(message)?.[1] ?? u.lines[0]);
        refuse(u, id, m && m[1] !== 'internal' ? m[1] : id, text, line, 'translate', translatorSite(e.stack));
      }
    }
    const { sf } = L;
    for (const u of open) if (u.refusal) {
      const node = topLevelFunctions(sf).get(u.unit)?.node;
      const f = node ? finding(sf, file, node, u.refusal.rule, u.refusal.reason, { unit: u.unit, label: 'migration', labelDecided: false, advice: null, reading: { id: u.refusal.id, version: u.refusal.version }, by: 'translate' }) : null;
      if (f) { if (u.refusal.line >= u.lines[0] && u.refusal.line <= u.lines[1]) f.line = u.refusal.line; else f.msg = `${f.msg} (raised at line ${u.refusal.line}, outside this unit: a unit it calls or a field it initialises)`; findings.push(f); } // the finding stays inside the unit it refuses
    }
    findings.sort((x, y) => x.line - y.line || x.col - y.col);
  }
  const rec = { file, units, findings };
  if (memo.size >= MEMO_MAX) memo.delete(memo.keys().next().value);
  memo.set(key, rec);
  return rec;
}
// the lint's findings read off the record: the lint never admits a unit the translator refuses
export const lintFindings = (file, ranges = null, opts = {}) => lowerFile(file, ranges, opts).findings.map((f) => ({ ...f }));

export function auditTable(sites) {
  const rows = sites.map((s) => `| ${s.file.replace('langs/ts/', '')}:${s.line} | ${s.kind} | ${s.rule ?? ''} | ${s.reading ?? '**uncatalogued**'} | ${s.decided}${s.by?.length ? ` (${s.by.join(', ')})` : ''} | ${String(s.message ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 100)} |`);
  return ['| site | kind | rule | reading | decided | message |', '| --- | --- | --- | --- | --- | --- |', ...rows].join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const file = args.find((a, i) => !a.startsWith('--') && !['--md'].includes(args[i - 1]));
  if (file && !args.includes('--audit')) { const rec = lowerFile(file, null, { project: !args.includes('--no-project') }); console.log(JSON.stringify(rec.units, null, 1)); process.exit(rec.units.some((u) => u.refusal) ? 1 : 0); }
  if (args.includes('--audit')) {
    const sites = auditSites();
    const missing = sites.filter((s) => !s.reading);
    if (args.includes('--json')) console.log(JSON.stringify(sites, null, 1));
    const md = args.includes('--md') ? args[args.indexOf('--md') + 1] : null;
    if (md) fs.writeFileSync(md, auditTable(sites) + '\n');
    const by = (k) => { const m = {}; for (const s of sites) m[s[k]] = (m[s[k]] ?? 0) + 1; return m; };
    console.error(`sites ${sites.length}; by kind ${JSON.stringify(by('kind'))}; uncatalogued ${missing.length}`);
    for (const s of missing) console.error(`  uncatalogued ${s.file}:${s.line} ${s.kind} ${s.rule ?? ''} ${String(s.message).slice(0, 100)}`);
    process.exit(missing.length ? 1 : 0);
  }
}
