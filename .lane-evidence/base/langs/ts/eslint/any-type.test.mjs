#!/usr/bin/env node
// the any-type part of the editor rule, without ESLint: ESLint is not vendored, so the rule object is driven the way
// ESLint drives it (create, then Program) with a context that records every report, on the advice fixtures. The
// suggestion of a conditional proposal is applied to a scratch copy, and the copy is linted again.
//
//   node langs/ts/eslint/any-type.test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import lean from './index.mjs';
import { lintFile } from '../lint/lint.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(here, '../tests/fixtures/advice');
let passed = 0; const failed = [];
const ok = (cond, name) => { if (cond) passed++; else failed.push(name); };
const scratchRoot = fs.existsSync('/tmp/claude-501') ? '/tmp/claude-501' : os.tmpdir();
const tmp = fs.mkdtempSync(path.join(scratchRoot, 'eslint-any-type-test-'));

// the rule run as ESLint runs it: create(context) then the Program visitor; reports are collected
function runRule(file, options) {
  const text = fs.readFileSync(file, 'utf8'); const lines = text.split('\n');
  const reports = [];
  const context = {
    filename: file, options,
    sourceCode: { getIndexFromLoc: ({ line, column }) => lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0) + column },
    report: (r) => reports.push(r),
  };
  lean.rules.provable.create(context).Program();
  return { reports, text };
}
// a suggestion applied as ESLint applies it: one replaced range
const apply = (text, s) => { let edit = null; s.fix({ replaceTextRange: (range, t) => { edit = { range, t }; return edit; } }); return text.slice(0, edit.range[0]) + edit.t + text.slice(edit.range[1]); };

try {
  const opts = [{ project: false }];
  // the two proposals, a record and a primitive: the conditional label, the proposal, and the annotation as the quick fix
  for (const [file, name, line, proposal, kind, header] of [
    ['any_record_conditional.ts', 'node', 2, '{ kind: string; text: string; children: { id: unknown }[] }', 'record', 'export function title(node: { kind: string; text: string; children: { id: unknown }[] }): string {'],
    ['any_primitive_conditional.ts', 'count', 2, 'number', 'primitive', 'export function doubled(count: number): number {'],
  ]) {
    const rec = runRule(path.join(fixtures, file), opts);
    const r0 = rec.reports.filter((r) => /^lean \(any-type\)/.test(r.message));
    ok(r0.length === 1 && r0[0].loc.start.line === line, `${file}: one any-type report at line ${line}: ${JSON.stringify(rec.reports.map((r) => r.message))}`);
    ok(r0[0]?.message.includes(`[conditional: every use of ${name} is covered by this type: `), `${file}: the label and its precondition are shown: ${r0[0]?.message}`);
    ok((r0[0]?.message ?? '').endsWith(`annotate ${name} as ${proposal}`), `${file}: the proposal is shown: ${r0[0]?.message}`);
    const json = lintFile(path.join(fixtures, file), null, { project: false, anyType: true }).filter((f) => f.rule === 'any-type');
    ok(json.length === 1 && json[0].proposalKind === kind, `${file}: the proposal is a ${kind}: ${JSON.stringify(json.map((f) => f.proposalKind))}`);
    ok(r0[0]?.suggest?.length === 1 && r0[0].suggest[0].desc === `annotate ${name} as ${proposal}`, `${file}: the annotation is offered as a quick fix`);
    if (r0[0]?.suggest?.length) {
      const fixed = apply(rec.text, r0[0].suggest[0]);
      ok(fixed.split('\n')[line - 1] === header, `${file}: the quick fix replaces the written any at the declaration: ${fixed.split('\n')[line - 1]}`);
      ok(fixed.split('\n').slice(line).join('\n') === rec.text.split('\n').slice(line).join('\n'), `${file}: nothing else in the file changes`);
      const copy = path.join(tmp, `fixed-${kind}.ts`); fs.writeFileSync(copy, fixed);
      const again = lintFile(copy, null, { project: false, anyType: true });
      ok(again.length === 0, `${file}: the annotated copy is inside the subset with no any-type finding: ${JSON.stringify(again.map((f) => `${f.rule}: ${f.msg}`))}`);
    }
  }
  // conflicting evidence: migration; no evidence: flag-only; neither offers a fix
  for (const [file, label, word] of [['any_conflict_migration.ts', 'migration', 'conflicts'], ['any_unused_flag_only.ts', 'flag-only', 'no evidence']]) {
    const { reports } = runRule(path.join(fixtures, file), opts);
    const r = reports.filter((x) => /^lean \(any-type\)/.test(x.message));
    ok(r.length === 1 && r[0].message.includes(`[${label}]`) && r[0].message.includes(word) && r[0].suggest.length === 0, `${file}: one ${label} report, no quick fix: ${JSON.stringify(reports.map((x) => x.message))}`);
  }
  // an any from an unresolved import: unresolved-module only
  const env = runRule(path.join(fixtures, 'any_unresolved_import_migration.ts'), opts);
  ok(env.reports.some((r) => /\(unresolved-module\)/.test(r.message)) && !env.reports.some((r) => /any-type/.test(r.message)), `an unresolved import gives no any-type report: ${JSON.stringify(env.reports.map((r) => r.message))}`);
  // the option turns the rule off; a typed file has nothing to report
  ok(runRule(path.join(fixtures, 'any_record_conditional.ts'), [{ project: false, anyType: false }]).reports.length === 0, 'anyType: false shows no any-type report');
  const typed = path.join(tmp, 'typed.ts'); fs.writeFileSync(typed, 'export function g(x: number): number {\n  return x + 1;\n}\n');
  ok(runRule(typed, opts).reports.length === 0, 'a typed file has no report');
} catch (e) {
  failed.push(`threw: ${e.stack ?? e.message}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
for (const f of failed) console.log(`FAIL ${f}`);
console.log(`any-type.test: ${passed} of ${passed + failed.length} checks pass`);
process.exitCode = failed.length ? 1 : 0;
