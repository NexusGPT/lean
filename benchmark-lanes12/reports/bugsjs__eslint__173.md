# lean report: 475d967864210587f3e778662280bdf801062a20 → abec8af4ac3f91b9e4511e843b11f4bcf9e30486

Identity: 10b32b707f71823926eec2e3002892de2eba5f2941e7db59205539e012f231a3; lean 815fc01fec5f51af99003faa686f25330e7c33ad

1 changed function(s); 1 unchanged caller(s) checked through lane B, 1 with a WITNESS through a changed callee: **0 in scope · 2 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-invalid-this.js | `hasJSDocThisTag` (37-50) | **WITNESS** | refused:var | WITNESS |  | input 0: trace; /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__173/run-8aQoZ4/sources/lib/ast-utils.js:104 |
| lib/rules/no-invalid-this.js | `hasValidThis` (149-252) | **WITNESS** | checked | WITNESS |  | input 5: through hasJSDocThisTag (changed; its own row is WITNESS); this function's text is unchanged; /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__173/run-8aQoZ4/sources/lib/ast-utils.js:104 |

## What would make the asks provable

### lib/rules/no-invalid-this.js · `hasJSDocThisTag`

- line 38, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 47, `unsupported-member`: property .leading is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 47, `ts-strict`: TS2339: Property 'leading' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 47, `callback-form`: the callback must be an arrow function
  do: [conditional: the function has no `this`, `arguments` or `new.target` in it and is never called with `new`] The callback must be an arrow function with plain parameters. A named function is read by name when its own parameters are plain; otherwise pass it the arguments JavaScript passes, `xs.map((x, i, a) => f(x, i, a))`, or only the ones it reads. An effectful callback may destructure its element or default it where the element type never holds undefined; name the fields you read instead of a rest element.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 9 = 9 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| ee78aa0074856a257ba57e274e235c0efbce038c1bbc40618340417f6a314d89 | lib/rules/no-invalid-this.js | text | 37+0 | 38+1 | unit: hasJSDocThisTag | new:hasJSDocThisTag |
| d4970ef8d96c4b8f2b8625fdcb26951e1c6b4e252f52e78ef7e05f4235a439c1 | lib/rules/no-invalid-this.js | text | 37+0 | 39+1 | unit: hasJSDocThisTag | new:hasJSDocThisTag |
| c6d19534f9d25a4dd96a7fdcb41940059cd91764222d86245f010fa471303424 | lib/rules/no-invalid-this.js | text | 37+0 | 40+1 | unit: hasJSDocThisTag | new:hasJSDocThisTag |
| b7d0f53960e4e704dbac8d819f3323adf6f90670d7cbd3a2a84a92740810f729 | lib/rules/no-invalid-this.js | text | 37+0 | 41+1 | unit: hasJSDocThisTag | new:hasJSDocThisTag |
| 0a069b84e78d469b4286a6741449bef57961b8f3629c5142222840747643de55 | lib/rules/no-invalid-this.js | text | 37+0 | 42+1 | unit: hasJSDocThisTag | new:hasJSDocThisTag |
| 2231666de9ed87c8d04f242bf92176624e3f844ec2cddb6b867c78e6d388447b | lib/rules/no-invalid-this.js | text | 37+0 | 43+1 | unit: hasJSDocThisTag | new:hasJSDocThisTag |
| 9d7fe0c7a103db212a3d9432eb458bd3df72eb68e01566250ebfb26baa404615 | lib/rules/no-invalid-this.js | text | 37+0 | 44+1 | unit: hasJSDocThisTag | new:hasJSDocThisTag |
| a1466314543559d1d9284e8e05ac3ae9e05a96f429adfe25189312fbe1dc36e5 | lib/rules/no-invalid-this.js | text | 37+0 | 45+1 | unit: hasJSDocThisTag | new:hasJSDocThisTag |
| 6070bbaa0de318f4cd516efe97c94a639c58050b290bf97c53843bd37d6bc291 | lib/rules/no-invalid-this.js | text | 37+0 | 46+1 | unit: hasJSDocThisTag | new:hasJSDocThisTag |

source: {"unit":["ee78aa0074856a257ba57e274e235c0efbce038c1bbc40618340417f6a314d89","d4970ef8d96c4b8f2b8625fdcb26951e1c6b4e252f52e78ef7e05f4235a439c1","c6d19534f9d25a4dd96a7fdcb41940059cd91764222d86245f010fa471303424","b7d0f53960e4e704dbac8d819f3323adf6f90670d7cbd3a2a84a92740810f729","0a069b84e78d469b4286a6741449bef57961b8f3629c5142222840747643de55","2231666de9ed87c8d04f242bf92176624e3f844ec2cddb6b867c78e6d388447b","9d7fe0c7a103db212a3d9432eb458bd3df72eb68e01566250ebfb26baa404615","a1466314543559d1d9284e8e05ac3ae9e05a96f429adfe25189312fbe1dc36e5","6070bbaa0de318f4cd516efe97c94a639c58050b290bf97c53843bd37d6bc291"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 2; terminal 2; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__173/run-8aQoZ4/terminal.json