# lean report: e0d4b19028addac2413e30b94bd045b10e45cedb → a7802d09312cb2b7aae210c64d787b3274acb115

Identity: f2fbf4790f4ebdfbecad848f907373205ccfb2293210a1e68b9eb7c434707103; lean 815fc01fec5f51af99003faa686f25330e7c33ad

3 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 1 PASS-bounded · 2 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/cli-engine.js | `CLIEngine` (435-473) | **PASS-bounded** | refused:global-read | PASS-bounded |  | `lodash` is module state that can change; the subset reads constants only |
| lib/cli-engine.js | `(edit ed3649431fa8)` (664-664) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/cli-engine.js | `(edit 6ac38a6ad2e0)` (665-665) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

## What would make the asks provable

### lib/cli-engine.js · `CLIEngine`

- line 437, `global-read`: `lodash` is module state that can change; the subset reads constants only
  do: [migration] This name cannot be resolved in the project; a proof needs its type. A global the lib or an @types package declares (`navigator`, `location`, `btoa`) is read from the world; a global only the project declares (a build-time define, a `declare` in its own .d.ts) has no lib meaning: import it from a module, or pass it in as an argument.
- line 438, `prototype`: `Object.create(null)` makes an object without a prototype; a plain object's reads and `in` go through Object.prototype and the ordinary lane has one dictionary for both; write `{}` and test own keys with `Object.prototype.hasOwnProperty.call(d, k)`
  do: [migration] The prototype chain has no mathematical reading. Use the object's own fields.
- line 440, `unresolved-module`: TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 450, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 450, `unsupported-member`: property .cacheLocation is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 450, `ts-strict`: TS2339: Property 'cacheLocation' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 450, `unsupported-member`: property .cacheFile is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 450, `ts-strict`: TS2339: Property 'cacheFile' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 6 = 4 unit + 0 artifact + 2 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 95510fcee27d625c44bdbfa253b33c92462a78e4caa16431ea668c1d6218e9e1 | lib/cli-engine.js | text | 460+1 | 459+0 | unit: CLIEngine | old:CLIEngine |
| 310d15b96528a5bad8ab90488a9f788cadbe4ff582b3099ac8ca8b38f09d35c9 | lib/cli-engine.js | text | 461+1 | 459+0 | unit: CLIEngine | old:CLIEngine |
| e016b5379edbcd0f5cbebbba109b2013441d7093815fc8b4f2fede1c98141e7b | lib/cli-engine.js | text | 462+1 | 459+0 | unit: CLIEngine | old:CLIEngine |
| ce071ddf4b68269054d3c82c4962d46972792d57a51ef862d4b1a338d7baec8e | lib/cli-engine.js | text | 463+1 | 459+0 | unit: CLIEngine | old:CLIEngine |
| ed3649431fa81fa9c75204e2ac570d2c0d8ab1371066555d895c7dda433fe349 | lib/cli-engine.js | text | 667+0 | 664+1 | unassigned: object-literal member |  |
| 6ac38a6ad2e0a6f4edb520622f8e77ee75974465da5ba162e791ebf5b0d0e47f | lib/cli-engine.js | text | 667+0 | 665+1 | unassigned: object-literal member |  |

source: {"unit":["95510fcee27d625c44bdbfa253b33c92462a78e4caa16431ea668c1d6218e9e1","310d15b96528a5bad8ab90488a9f788cadbe4ff582b3099ac8ca8b38f09d35c9","e016b5379edbcd0f5cbebbba109b2013441d7093815fc8b4f2fede1c98141e7b","ce071ddf4b68269054d3c82c4962d46972792d57a51ef862d4b1a338d7baec8e"],"artifact":[],"unassigned":["ed3649431fa81fa9c75204e2ac570d2c0d8ab1371066555d895c7dda433fe349","6ac38a6ad2e0a6f4edb520622f8e77ee75974465da5ba162e791ebf5b0d0e47f"]}

Task reconciliation: expected 3; terminal 3; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__274/run-T3XNA1/terminal.json