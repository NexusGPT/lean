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
import { ts, loadProgram, normaliseApplyCalls, topLevelFunctions, lineOf, colOf, overlaps, isArrayLike } from './common.mjs';
import { READINGS, ADVICE_RULES, STRUCTURAL_KINDS, readingById, readingOfKind, readingOfFinding, readingOfRefusal, translatorText, withdrawnReason, currentVersion } from './readings.mjs';
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
  return null;
}

export function auditSites(root = here) {
  const sites = [];
  const files = [['lint/lint.mjs', 'lint'], ['translate/translate.mjs', 'translate']];
  for (const [rel, who] of files) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
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
        sites.push({ file: `langs/ts/${rel}`, line: line(n), who, kind, rule, message: msgText, reading });
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
  const key = [abs, createHash('sha256').update(given.sf.text).digest('hex'), JSON.stringify(opts.project ?? true), JSON.stringify(ranges), !!opts.advisory, !!opts.anyType, process.env.LEAN_WITHDRAW ?? ''].join('\0');
  if (memo.has(key)) return memo.get(key);
  const L = normaliseApplyCalls(given);
  const findings = admitUnits(file, ranges, { ...opts, loaded: given }, L);
  const units = admitted.get(findings).map((r) => {
    const [a, b] = r.lines;
    const f = findings.find((x) => refusing(x) && x.line >= a && x.line <= b);
    return { ...r, refusal: f ? { id: f.reading?.id ?? 'uncatalogued', version: f.reading?.version ?? null, rule: f.rule, reason: f.msg, line: f.line, by: ['no-reading', 'withdrawn'].includes(f.rule) ? 'catalogue' : 'lint' } : null };
  });
  // phase 4: the translator reads the units phases 1-3 admitted, as the proof lane runs it
  const open = units.filter((u) => !u.refusal);
  if (open.length && opts.emission !== false) {
    const report = {};
    const refuse = (u, id, rule, reason, line, by, site = null) => { u.refusal = { id, version: readingById(id) ? currentVersion(readingById(id)) : null, rule, reason, line, by, ...(site ? { site } : {}) }; };
    try {
      translate(file, null, { core: true, heap: true, tolerant: true, project: opts.project ?? true, only: open.map((u) => u.unit), report, loaded: given });
      for (const u of open) {
        const out = report.lintedOut?.find((x) => x.unit === u.unit), bad = report.failed?.find((x) => x.unit === u.unit);
        if (out) { const id = readingOfFinding(out.rule, out.msg) ?? 'uncatalogued'; refuse(u, id, out.rule, out.msg, u.lines[0], 'lint'); }
        else if (bad) {
          const text = translatorText(bad.text ?? bad.message), id = readingOfRefusal(text) ?? 'uncatalogued';
          const m = /^([a-z][a-z0-9-]*): /.exec(text), line = Number(/:(\d+): /.exec(bad.text ?? bad.message)?.[1] ?? u.lines[0]);
          refuse(u, id, m && !/^internal$/.test(m[1]) ? m[1] : id, text, line, 'translate', translatorSite(bad.stack));
        } else if (!report.translated?.includes(u.unit)) refuse(u, 'translator-internal', 'translator-internal', 'the translation did not read this unit', u.lines[0], 'translate');
      }
    } catch (e) {
      // the translator stopped on the file (a crash, or a refusal outside its per-unit reading): every unit it was to read
      // is refused by that, named; never read
      const text = translatorText(String(e?.message ?? e).split('\n')[0]);
      for (const u of open) refuse(u, e?.constructor?.name === 'Error' || !(e instanceof Error) ? 'translator-internal' : (readingOfRefusal(text) ?? 'translator-internal'), 'translator-crash', `the translator stopped: ${text}`, u.lines[0], 'translate', translatorSite(e?.stack));
    }
    const { sf } = L;
    for (const u of open) if (u.refusal) {
      const node = topLevelFunctions(sf).get(u.unit)?.node;
      const f = node ? finding(sf, file, node, u.refusal.rule, u.refusal.reason, { unit: u.unit, label: 'migration', labelDecided: false, advice: null, reading: { id: u.refusal.id, version: u.refusal.version }, by: 'translate' }) : null;
      if (f) { f.line = u.refusal.line; findings.push(f); }
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
  const rows = sites.map((s) => `| ${s.file.replace('langs/ts/', '')}:${s.line} | ${s.kind} | ${s.rule ?? ''} | ${s.reading ?? '**uncatalogued**'} | ${String(s.message ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 110)} |`);
  return ['| site | kind | rule | reading | message |', '| --- | --- | --- | --- | --- |', ...rows].join('\n');
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
