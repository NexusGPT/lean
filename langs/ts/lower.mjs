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
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ts, loadProgram, normaliseApplyCalls, topLevelFunctions, lineOf, colOf, overlaps, isArrayLike, originOf } from './common.mjs';
import { READINGS, ADVICE_RULES, STRUCTURAL_KINDS, readingById, readingOfKind, readingOfFinding, readingOfRefusal, translatorText, withdrawnReason, withdrawalKey, currentVersion } from './readings.mjs';
import { memberRow } from './library-rows.mjs';
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
const LOWER_DECISIONS = new Set(['installsFunction', 'loneSurrogate', 'nullPrototypeCreate', 'valueAssignmentWhy']);
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
        sites.push({ file: `langs/ts/${rel}`, line: line(n), who, kind, rule, message: msgText, reading, decided: kind === 'lint-advice' ? 'advice' : statusOf(by), by });
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
