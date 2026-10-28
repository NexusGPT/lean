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
