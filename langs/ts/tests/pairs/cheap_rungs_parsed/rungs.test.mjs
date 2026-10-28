import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ts, loadProgram, topLevelFunctions } from "../../../common.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const api = await import("../../../rungs.mjs").catch(e => ({ missing: e.message }));
const parsed = (text, name = "f") => {
 const file = "/rung.ts";
 const options = { target: ts.ScriptTarget.ES2020, strict: true, noLib: true };
 const sf = ts.createSourceFile(file, text, options.target, true);
 const host = { getSourceFile: p => p === file ? sf : undefined, getDefaultLibFileName: () => "", writeFile() {}, getCurrentDirectory: () => "/", getDirectories: () => [], fileExists: p => p === file, readFile: p => p === file ? text : undefined, getCanonicalFileName: p => p, useCaseSensitiveFileNames: () => true, getNewLine: () => "\n" };
 const program = ts.createProgram([file], options, host);
 return { sf, checker: program.getTypeChecker(), unit: topLevelFunctions(sf).get(name) };
};
const decide = (p, c, env = { sameEnvironment: true }) => {
 assert.equal(typeof api.decideRungs, "function", api.missing);
 return api.decideRungs(parsed(p), parsed(c), env);
};
for (const kind of ["parsed", "normalised", "capture", "error", "congruence", "alias"]) test(kind, () => {
 const d = path.join(here, "../cheap_rungs_" + kind);
 const want = JSON.parse(fs.readFileSync(path.join(d,"expect.json"))).rung;
 const r = decide(fs.readFileSync(path.join(d,"parent.ts"),"utf8"),fs.readFileSync(path.join(d,"candidate.ts"),"utf8"));
 assert.equal(r.status, want ? "decided-equal" : "undecided", JSON.stringify(r));
 if (want) assert.equal(r.rung, want);
 if (kind === "congruence") assert.equal(r.evidence.callees[0].unit, "g");
});
const refusals = [
 ["environment not established", "export function f(x:number){return x}", "export function f(x:number){/*c*/return x}", {}],
 ["changed module cell", "const z=1; export function f(){return z}", "const z=2; export function f(){return z}"],
 ["source observation", "export function f(){return f.toString()}", "export function f(){/*c*/return f.toString()}"],
 ["indirect source observation", "function g(x:unknown){return String(x)} export function f(){return g(f)}", "function g(x:unknown){return String(x)} export function f(){/*c*/return g(f)}"],
 ["callee observes source", "function g(){return f.toString()} export function f(){return g()}", "function g(){return f.toString()} export function f(){/*c*/return g()}"],
 ["ASI return", "export function f(){return 1}", "export function f(){return\n1}"],
 ["empty statement", "export function f(x:number){if(x);return 1}", "export function f(x:number){if(x)return 1}"],
 ["template raw text", "export function f(){return `a b`}", "export function f(){return `a  b`}"],
 ["const write", "export function f(){const a=1; a=2;return a}", "export function f(){let a=1;a=2;return a}"],
 ["inferred function name", "export function f(){const a=()=>1;return a.name}", "export function f(){const b=()=>1;return b.name}"],
 ["shorthand changes key", "export function f(x:number){return {x}}", "export function f(y:number){return {y}}"],
 ["eval", "export function f(x:number){return eval(\"x\")}", "export function f(y:number){return eval(\"x\")}"],
 ["TDZ", "export function f(){return a; let a=1}", "export function f(){return b; let b=1}"],
 ["callee argument change", "function g(x:number){return x} export function f(x:number){return g(x)}", "function g(y:number){return y} export function f(x:number){return g(2)}"],
 ["recursive callee", "function g(x:number):number{return g(x)} export function f(x:number){return g(x)}", "function g(y:number):number{return g(y)} export function f(x:number){return g(x)}"],
];
for (const [name,p,c,env] of refusals) test("must not decide: " + name, () => assert.equal(decide(p,c,env).status,"undecided"));
test("independent declarations reorder", () => assert.equal(decide("export function f(x:number){const a=1;const b=2;return x+a+b}","export function f(x:number){const b=2;const a=1;return x+a+b}").rung,"normalised"));
test("AST comparison retains declaration kind", () => {
 assert.equal(typeof api.parsedEqual,"function",api.missing);
 assert.equal(api.parsedEqual(parsed("export function f(){const a=1; return a}"),parsed("export function f(){let a=1; return a}"),{sameEnvironment:true}).status,"undecided");
});
export { parsed, decide };
test("check certificate names the rung and retains lane B", async () => {
 const { check } = await import("../../../check.mjs");
 for (const [kind,rung] of [["parsed","parsed-equal"],["normalised","normalised"],["congruence","congruence"]]) {
  const d=path.join(here,"../cheap_rungs_"+kind);
  const got=await check({parent:path.join(d,"parent.ts"),candidate:path.join(d,"candidate.ts"),unit:"f",project:false,n:3,dafnySeconds:5});
  assert.equal(got.verdict,"PASS-proved");
  assert.equal(got.certificate.provedBy,rung);
  assert.equal(got.certificate.lanes.A.provedBy,rung);
  assert.equal(got.certificate.lanes.B.verdict,"PASS-bounded");
 }
});
for (const [name,source] of [
 ["shorthand source escape", "import {inspect} from 'env'; export function f(){return inspect({f})}"],
 ["export object source escape", "import {inspect} from 'env'; export function f(){return inspect(exports)}"],
 ["script global source escape", "function f(){return inspect(globalThis)}"],
 ["receiver source escape", "export function f(){return inspect(this)}"],
]) test("source escape: "+name, () => {
 const changed=source.replace("function f(){","function f(){/* trivia */");
 assert.equal(decide(source,changed).status,"undecided");
});
// A changed function reached through an export alias, the module namespace or a dynamic import is a value, not a direct callee.
for (const [name,source] of [
 ["export specifier alias", "import {inspect} from 'env'; function f(){return 1} export {f as g}; export function h(){return inspect(1)}"],
 ["default export of the binding", "function f(){return 1} export default f;"],
 ["self import namespace", "import * as me from './rung'; import {inspect} from 'env'; export function f(){return inspect(me)}"],
 ["dynamic import", "import {inspect} from 'env'; export function f(){return inspect(import('./rung'))}"],
]) test("source escape: "+name, () => {
 const changed=source.replace("function f(){","function f(){/* trivia */");
 assert.notEqual(changed,source);
 assert.equal(decide(source,changed).status,"undecided");
});
// The container guard must not refuse a receiver that can only be a class instance: a class method's `this`.
test("class-body receiver still decides", () => {
 const source="class K { v = 1; get(){ return this.v } } export function f(x:number){return x}";
 assert.equal(decide(source, source.replace("return x}","/* trivia */ return x}")).rung, "parsed-equal");
});
// Class methods: a changed method is decided when its function object, and the class whose source holds it, are only
// ever invoked. Each must-not case opens one route by which module code can hold the changed method as a value.
const svc = "import { Store } from 'store'; export class K { constructor(private s: Store) {} run(x: number) { return this.s.get(x) } other() { return this.run(1) } }";
const touch = (src) => src.replace("run(x: number) {", "run(x: number) { /* trivia */");
const decideUnit = (p, c, unit) => api.decideRungs(parsed(p, unit), parsed(c, unit), { sameEnvironment: true });
test("method trivia decides by parsed-equal", () => assert.equal(decideUnit(svc, touch(svc), "K.run").rung, "parsed-equal"));
test("method rename decides by normalised", () => {
 const p = "export class K { run(x: number) { const a = x + 1; return a * 2 } }";
 const c = "export class K { run(y: number) { const b = y + 1; return b * 2 } }";
 assert.equal(decideUnit(p, c, "K.run").rung, "normalised");
});
for (const [name, extra] of [
 ["method read as a value", "export function h(k: K) { return [1].map(k.run) }"],
 ["method bound as a value", "export function h(k: K) { const f = k.run.bind(k); return f }"],
 ["method key spelled as a string", "import { invoke } from 'lib'; export function h(k: K) { return invoke(k, 'run') }"],
 ["computed read on an open value", "export function h(k: any, n: string) { return String(k[n]) }"],
 ["computed read on the class instance", "export function h(k: K, n: 'run' | 'other') { return String(k[n]) }"],
 ["method destructured", "export function h(k: K) { const { run } = k; return String(run) }"],
 ["class coerced", "export function h() { return String(K) }"],
 ["constructor read", "export function h(k: K) { return String(k.constructor) }"],
 ["descriptor reflection", "export function h() { return String(Object.getOwnPropertyDescriptor(K.prototype, 'x')) }"],
]) test("must not decide: " + name, () => {
 const p = svc + " " + extra;
 assert.equal(decideUnit(p, touch(p), "K.run").status, "undecided");
});
test("must not decide: static receiver is the class", () => {
 const p = "export class K { run(x: number) { return x } static show() { return String(this) } }";
 assert.equal(decideUnit(p, p.replace("{ return x }", "{ /* t */ return x }"), "K.run").status, "undecided");
});
test("must not decide: decorator declared in this module receives the class", () => {
 const p = "function Tag(t: any) { console.log(String(t)) } @Tag export class K { run(x: number) { return x } }";
 assert.equal(decideUnit(p, p.replace("{ return x }", "{ /* t */ return x }"), "K.run").status, "undecided");
});
test("must not decide: changed closure inside the method", () => {
 const p = "export class K { run(xs: number[]) { return xs.map((x) => x + 1) } }";
 assert.equal(decideUnit(p, p.replace("(x) => x + 1", "(x) => /* t */ x + 1"), "K.run").status, "undecided");
});
// The rung relies on V8 printing a failing expression from its parse tree (measured on the node that runs lean). If an
// engine starts quoting source spelling, a trivia change inside a failing call would change the message: this goes red.
test("engine messages are printed from the parse tree", () => {
 const msg = (f) => { try { f(); return "no throw"; } catch (e) { return e.message; } };
 const pairs = [
  [() => { const o = {}; o.x(); }, () => { const o = {}; o /* c */ .  x ( ); }],
  [() => { const v = 1; for (const x of v) {} }, () => { const v = 1; for (const x of /* c */ v ) {} }],
  [() => { const v = null; const { a } = v; }, () => { const v = null; const {  a  } = /* c */ v; }],
  [() => { const K = 1; new K(); }, () => { const K = 1; new /* c */ K ( ); }],
 ];
 for (const [a, b] of pairs) assert.equal(msg(b), msg(a));
});
// General renaming (any code, methods included): each must-not case renames a binding whose name is observable.
const renameCases = [
 ["callee printed in an engine message", "run(cb: any) { const g = cb; return g() }", "run(cb: any) { const h = cb; return h() }"],
 ["member-call base printed in an engine message", "run(s: any) { const r = s; return r.get(1) }", "run(s: any) { const q = s; return q.get(1) }"],
 ["for-of operand printed", "run(x: any) { const v = x; let n = 0; for (const i of v) n++; return n }", "run(x: any) { const w = x; let n = 0; for (const i of w) n++; return n }"],
 ["destructuring source printed", "run(x: any) { const o = x; const { a } = o; return a }", "run(x: any) { const p = x; const { a } = p; return a }"],
 ["spread operand printed", "run(x: any) { const v = x; return [...v] }", "run(x: any) { const w = x; return [...w] }"],
 ["inferred function name", "run() { const a = function () { return 1 }; return a.name }", "run() { const b = function () { return 1 }; return b.name }"],
 ["assigned anonymous function name", "run() { let a: any; a = () => 1; return a.name }", "run() { let b: any; b = () => 1; return b.name }"],
 ["shorthand key", "run(x: number) { const a = x; return { a } }", "run(x: number) { const b = x; return { b } }"],
 ["read before initialisation", "run(x: number) { if (x) return a; const a = 1; return a }", "run(x: number) { if (x) return b; const b = 1; return b }"],
 ["lexical binding in a switch case", "run(x: number) { switch (x) { case 1: let a = 1; return a; default: return 0 } }", "run(x: number) { switch (x) { case 1: let b = 1; return b; default: return 0 } }"],
 ["capture of a parameter", "run(x: number) { const y = 2; return x }", "run(y: number) { const x = 2; return x }"],
];
for (const [name, p, c] of renameCases) test("must not decide (rename): " + name, () => {
 const cls = (b) => `export class K { ${b} }`;
 assert.equal(decideUnit(cls(p), cls(c), "K.run").status, "undecided");
});
test("rename decides where no name is observable", () => {
 const p = "export class K { run(s: { get(n: number): number }, x: number) { const total = x * 2; let acc = 0; for (let i = 0; i < total; i++) acc += i; return s.get(acc) } }";
 const c = p.replace(/total/g, "limit").replace(/acc/g, "sum").replace(/\bi\b/g, "k");
 assert.equal(decideUnit(p, c, "K.run").rung, "normalised");
});
