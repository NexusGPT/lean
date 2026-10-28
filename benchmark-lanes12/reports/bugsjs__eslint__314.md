# lean report: 8b78697f1c2f20fda8a4ec53819be76be3de2193 → e7da0ba8de64300d1daed2a1f9404b511972a25d

Identity: ce4aede0de62a2b219c16951e87ac7e6965ff0fb812649b352cb9c34e39fb923; lean 815fc01fec5f51af99003faa686f25330e7c33ad

1 changed function(s): **0 in scope · 1 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-return-assign.js | `isEnclosedInParens` (19-24) | **WITNESS** | refused:ts-strict | WITNESS |  | input 10: outcome; lib/rules/no-return-assign.js:23 |

## What would make the asks provable

### lib/rules/no-return-assign.js · `isEnclosedInParens`

- line 19, `ts-strict`: TS2502: 'sourceCode' is referenced directly or indirectly in its own type annotation.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 20, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 21, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 2 = 2 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| b38be27a8b243859547f2485b5ba7ea10925dc2e2d69432340b833b19645ea52 | lib/rules/no-return-assign.js | text | 23+1 | 23+0 | unit: isEnclosedInParens | old:isEnclosedInParens |
| 59aac9ceaef352bae9f6fc793cfd2efac40044706515b7b16dcdf9424e6def2c | lib/rules/no-return-assign.js | text | 23+0 | 23+1 | unit: isEnclosedInParens | new:isEnclosedInParens |

source: {"unit":["b38be27a8b243859547f2485b5ba7ea10925dc2e2d69432340b833b19645ea52","59aac9ceaef352bae9f6fc793cfd2efac40044706515b7b16dcdf9424e6def2c"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 1; terminal 1; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__314/run-yJ5kgs/terminal.json