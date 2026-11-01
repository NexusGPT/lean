#!/usr/bin/env node
// The package rows' predicate (library-rows.mjs pureLibraryCall, design/w2d-library-rows.md) on one file of calls: each
// call is read as pure, or not, by its row's shape, its arguments and its result type. --break: LEAN_BREAK=package-rows
// (amendment A6), the mechanism removed: every pure call below reads as a transition and the test goes red.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (process.argv.includes('--break') && process.env.LEAN_BREAK !== 'package-rows') {
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { stdio: 'inherit', env: { ...process.env, LEAN_BREAK: 'package-rows' } });
  process.exit(r.status ?? 1);
}
const { ts } = await import('../common.mjs');
const { pureLibraryCall } = await import('../library-rows.mjs');

const decls = `
declare module 'lodash' {
  export function sum(xs: number[]): number;
  export function uniq<T>(xs: T[]): T[];
  export function get<T, R>(o: T, path: string): R;
  export function cloneDeep<T>(x: T): T;
  export function pick<T, K extends keyof T>(o: T, ...k: K[]): Pick<T, K>;
  export function sortBy<T>(xs: T[], f: (x: T) => number): T[];
  export function debounce<F extends (...a: any[]) => void>(f: F, n: number): F;
  const _: { sum(xs: number[]): number; uniq<T>(xs: T[]): T[] };
  export default _;
}
declare module 'date-fns' { export function addHours(d: Date | number, n: number): Date; export function addDays(d: Date | number, n: number): Date; }
`;
// [expression, pure?]: the calls, each the initializer of a `const` in one function
const CASES = [
  ['sum(xs)', true], // primitive
  ['_.sum(xs)', true], // a member of the package's default import
  ['uniq(xs)', true], // fresh-array of numbers
  ['uniq(boxes)', false], // fresh-array whose elements are objects the argument holds
  ['get<Box, number>(box, "n")', true], // argument-part at a primitive type
  ['get<Outer, Box>(outer, "a")', false], // argument-part at an object type: the argument's own object
  ['pick(box, "n")', true], // fresh-record of primitives
  ['pick(outer, "a")', false], // fresh-record holding the argument's object
  ['cloneDeep(outer)', true], // deep-fresh, no function in a field
  ['cloneDeep(withFn)', false], // deep-fresh holding a function in a field: lodash keeps the function itself
  ['sortBy(xs, (x) => -x)', true], // an arrow literal callback
  ['sortBy(xs, neg)', false], // a function value the package calls: its effects are its own
  ['sortBy(...[xs, neg] as [number[], (x: number) => number])', false], // a spread argument
  ['debounce(f, 10)', false], // a transition row (arms a timer)
  ['addHours(d, 1)', true], // a date row of milliseconds, a fresh Date
  ['addDays(d, 1)', false], // a calendar transition
];
const src = `import _, { sum, uniq, get, cloneDeep, pick, sortBy, debounce } from 'lodash';
import { addHours, addDays } from 'date-fns';
type Box = { n: number }; type Outer = { a: Box }; type WithFn = { n: number; f: () => number };
const neg = (x: number) => -x;
export function u(xs: number[], boxes: Box[], box: Box, outer: Outer, withFn: WithFn, f: () => void, d: Date) {
${CASES.map(([e], i) => `  const c${i} = ${e};`).join('\n')}
}
`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-package-rows-'));
fs.writeFileSync(path.join(dir, 'decls.d.ts'), decls);
fs.writeFileSync(path.join(dir, 'u.ts'), src);
const program = ts.createProgram([path.join(dir, 'u.ts'), path.join(dir, 'decls.d.ts')], { strict: true, target: ts.ScriptTarget.ES2020, esModuleInterop: true, noEmit: true });
const checker = program.getTypeChecker();
const sf = program.getSourceFile(path.join(dir, 'u.ts'));
const diags = ts.getPreEmitDiagnostics(program).map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' '));
fs.rmSync(dir, { recursive: true, force: true });
if (diags.length) { console.log(`package rows: the fixture does not type-check\n  ${diags.join('\n  ')}`); process.exit(1); }
const calls = [];
const w = (n) => { if (ts.isVariableDeclaration(n) && /^c\d+$/.test(n.name.getText(sf))) calls.push(n.initializer); ts.forEachChild(n, w); };
w(sf);
const failures = [];
CASES.forEach(([e, want], i) => { const got = !!pureLibraryCall(checker, calls[i]); if (got !== want) failures.push(`${e}: read ${got ? 'pure' : 'as a transition'}, want ${want ? 'pure' : 'a transition'}`); });
if (failures.length) { console.log(`package rows: ${failures.length} of ${CASES.length} failed${process.env.LEAN_BREAK ? ` (LEAN_BREAK=${process.env.LEAN_BREAK})` : ''}\n  ${failures.join('\n  ')}`); process.exit(1); }
console.log(`package rows: ${CASES.length} calls read as their rows state (${CASES.filter((c) => c[1]).length} pure, ${CASES.filter((c) => !c[1]).length} transitions)`);
