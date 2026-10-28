# lean report: 3004c1e2c561fe30389ae478bb4b18df324a1313 → 92fea310f3273be212c0378a50f9aad8cf548c6d

Identity: 18c1cda72b32d677f6c5178e65f94ff61af22a7936882a36302208571abd9357; lean 815fc01fec5f51af99003faa686f25330e7c33ad

5 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 5 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-useless-escape.js | `(edit bca495669925)` (28-28) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit c4e453a8a7ba)` (29-29) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit c65660cab737)` (28-28) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit ac8fd9d757aa)` (197-197) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 752c305071fb)` (196-196) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 5 = 0 unit + 0 artifact + 5 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| bca4956699250a9dbb66cd7ee58b4d1f4971cbc49bc3141537033335b6fa2bfb | lib/rules/no-useless-escape.js | text | 28+1 | 28+0 | unassigned: module-level statement |  |
| c4e453a8a7baac596f4b935f094664fc6f1e0cd8a316f04d54011a0d07f3ab7f | lib/rules/no-useless-escape.js | text | 29+1 | 28+0 | unassigned: module-level statement |  |
| c65660cab737da9bd79c2b4ef8b7a9201a6d60569aceb24c0114c281bffc6101 | lib/rules/no-useless-escape.js | text | 28+0 | 28+1 | unassigned: module-level statement |  |
| ac8fd9d757aa1e644e1b09858710da4d93965eacd774315e36c140ebf186f6cd | lib/rules/no-useless-escape.js | text | 197+1 | 196+0 | unassigned: object-literal member |  |
| 752c305071fb72160aea00d027f82d7f632a8a76fb6b9083345f4db4c7bc2a58 | lib/rules/no-useless-escape.js | text | 197+0 | 196+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["bca4956699250a9dbb66cd7ee58b4d1f4971cbc49bc3141537033335b6fa2bfb","c4e453a8a7baac596f4b935f094664fc6f1e0cd8a316f04d54011a0d07f3ab7f","c65660cab737da9bd79c2b4ef8b7a9201a6d60569aceb24c0114c281bffc6101","ac8fd9d757aa1e644e1b09858710da4d93965eacd774315e36c140ebf186f6cd","752c305071fb72160aea00d027f82d7f632a8a76fb6b9083345f4db4c7bc2a58"]}

Task reconciliation: expected 5; terminal 5; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__311/run-ZyR8SQ/terminal.json