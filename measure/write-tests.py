from pathlib import Path
import json
root=Path("/Users/assem/nexus/nexus-organisation/work/lean-lanes/cheap-rungs/langs/ts/tests/pairs")
cases={
"parsed":("export function f(x: number): number { return x; }","export function f(x: number): number { /* trivia */ return x }","parsed-equal"),
"normalised":("export function f(x: number): number { const a = x; return a; }","export function f(y: number): number { let b = y; return b; }","normalised"),
"capture":("export function f(x: number): number { const y = 2; return x; }","export function f(y: number): number { const x = 2; return x; }",None),
"error":("export function f(x: any): number { return x(); }","export function f(y: any): number { return y(); }",None),
"congruence":("function g(x: number): number { const a = x; return a; }\nexport function f(x: number): number { return g(x); }","function g(y: number): number { let b = y; return b; }\nexport function f(x: number): number { return g(x); }","congruence"),
"alias":("function g(x: {n:number}): number { const a = x; a.n++; return a.n; }\nexport function f(x: {n:number}): number { return g(x); }","function g(y: {n:number}): number { let b = y; b.n++; return b.n; }\nexport function f(x: {n:number}): number { return g(x); }",None),
}
for name,(p,c,rung) in cases.items():
 d=root/("cheap_rungs_"+name);d.mkdir(exist_ok=True)
 (d/"parent.ts").write_text(p+"\n");(d/"candidate.ts").write_text(c+"\n")
 # These fixtures are exercised through the decision API by rungs.test.mjs; skip the separate translator lane.
 (d/"expect.json").write_text(json.dumps({"skipA":True,"scope":[],"equal":{},"why":"Certified-rung fixture; node --test langs/ts/tests/pairs/cheap_rungs_parsed/rungs.test.mjs checks both decisions and refusals.","rung":rung},indent=1)+"\n")
