#!/usr/bin/env node
// The admission contract (design/admission-contract.md): one lowering per unit, consumed by the lint and the translator.
//
// auditSites()   every decision site of lint.mjs and translate.mjs (a refusal the lint makes, a refusal the translator
//                makes), read off their source with the compiler, each with the reading the catalogue (readings.mjs)
//                gives it; a site no entry covers is listed as such
//
// Usage: node lower.mjs --audit [--json] [--md <file>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ts } from './common.mjs';
import { READINGS, ADVICE_RULES, readingOfFinding, readingOfRefusal } from './readings.mjs';
import { memberRow } from './library-rows.mjs';

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

export function auditTable(sites) {
  const rows = sites.map((s) => `| ${s.file.replace('langs/ts/', '')}:${s.line} | ${s.kind} | ${s.rule ?? ''} | ${s.reading ?? '**uncatalogued**'} | ${String(s.message ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 110)} |`);
  return ['| site | kind | rule | reading | message |', '| --- | --- | --- | --- | --- |', ...rows].join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
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
