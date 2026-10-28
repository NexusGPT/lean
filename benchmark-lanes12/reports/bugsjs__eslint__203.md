# lean report: 60d61932cd8f8d7b051cf29811954e2406e8995d → 0cbb591f74099fbc0ca8c4a6461bb7e928a3d835

Identity: 20d85ddccec7c180b94f67a5f39bc6129662339135e12edc683f70d1189e65c6; lean 815fc01fec5f51af99003faa686f25330e7c33ad

6 changed function(s): **0 in scope · 1 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 5 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/cli-engine.js | `processPath` (308-334) | **WITNESS** | refused:var | WITNESS |  | input 0: outcome; lib/cli-engine.js:325 [conditional] |
| lib/cli-engine.js | `(edit 16b59a8c7644)` (496-496) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/cli-engine.js | `(edit 7b3eb637454b)` (506-506) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/cli-engine.js | `(edit 0df986d94bf0)` (507-507) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/cli-engine.js | `(edit 762382dc9e06)` (562-562) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/cli-engine.js | `(edit 786e617cd317)` (563-563) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

## What would make the asks provable

### lib/cli-engine.js · `processPath`

- line 309, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 325, `callback-form`: the callback must be an arrow function
  do: [conditional: the function has no `this`, `arguments` or `new.target` in it and is never called with `new`] The callback must be an arrow function with plain parameters. A named function is read by name when its own parameters are plain; otherwise pass it the arguments JavaScript passes, `xs.map((x, i, a) => f(x, i, a))`, or only the ones it reads. An effectful callback may destructure its element or default it where the element type never holds undefined; name the fields you read instead of a rest element.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 7 = 2 unit + 0 artifact + 5 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 9f198c4b637ebc2c1c5c70f1b6fcd9d438478ae36d85ef77e94dc732268aae86 | lib/cli-engine.js | text | 332+1 | 332+0 | unit: processPath | old:processPath |
| daafb8b74a7e037f616203bd3d88ea9669f1a61d0d9742fb8278cf0c0c2e9c92 | lib/cli-engine.js | text | 332+0 | 332+1 | unit: processPath | new:processPath |
| 16b59a8c7644d61f4b78e326f913893d36d1c91333852eb37ad74afc136a3e06 | lib/cli-engine.js | text | 496+1 | 495+0 | unassigned: object-literal member |  |
| 7b3eb637454b71cf333328069a16701fdee12bdc0d2dd176f463abbb00c32d1b | lib/cli-engine.js | text | 506+0 | 506+1 | unassigned: object-literal member |  |
| 0df986d94bf0803b13ebd3c8ed3b9a48a4448afa4bd7808507ba0c098b498d01 | lib/cli-engine.js | text | 506+0 | 507+1 | unassigned: whitespace |  |
| 762382dc9e06257971e8028a8385cded252486796fae0e0c94b815f052824cd1 | lib/cli-engine.js | text | 562+1 | 563+0 | unassigned: object-literal member |  |
| 786e617cd317585de88a81fe87004b280718102fd0e4b4154e74e003c12f9385 | lib/cli-engine.js | text | 562+0 | 563+1 | unassigned: object-literal member |  |

source: {"unit":["9f198c4b637ebc2c1c5c70f1b6fcd9d438478ae36d85ef77e94dc732268aae86","daafb8b74a7e037f616203bd3d88ea9669f1a61d0d9742fb8278cf0c0c2e9c92"],"artifact":[],"unassigned":["16b59a8c7644d61f4b78e326f913893d36d1c91333852eb37ad74afc136a3e06","7b3eb637454b71cf333328069a16701fdee12bdc0d2dd176f463abbb00c32d1b","0df986d94bf0803b13ebd3c8ed3b9a48a4448afa4bd7808507ba0c098b498d01","762382dc9e06257971e8028a8385cded252486796fae0e0c94b815f052824cd1","786e617cd317585de88a81fe87004b280718102fd0e4b4154e74e003c12f9385"]}

Task reconciliation: expected 6; terminal 6; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__203/run-SsKyhQ/terminal.json