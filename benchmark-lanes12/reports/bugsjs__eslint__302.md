# lean report: af1fde1867384e71c641592552f3967761836a45 → 22e2ed2aa69970cbeb8b57cacac9551cf8ee54c8

Identity: b7b5517a27ca68ca1c94579813f58fa9f14acaf53fa2a801eb5c1f38caf3c4ab; lean 815fc01fec5f51af99003faa686f25330e7c33ad

7 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 7 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/curly.js | `(edit ac66d10c4eda)` (77-77) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/curly.js | `(edit 57937a2d6063)` (78-78) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/curly.js | `(edit 9b6ce3f0d3b6)` (77-77) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/curly.js | `(edit 42e0dc6e5fad)` (78-78) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/curly.js | `(edit 59717bc593dd)` (79-79) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/curly.js | `(edit 59ff8a909aa7)` (80-80) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/curly.js | `(edit d9f996266a2c)` (81-81) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 7 = 0 unit + 0 artifact + 7 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| ac66d10c4edad4e9dab72aef529149ce93e077c836b150efdce1a0153da0e369 | lib/rules/curly.js | text | 77+1 | 77+0 | unassigned: object-literal member |  |
| 57937a2d60637181d54c1b47dec6c1a4bea7024f7d09f1e9ad92260613afbc4a | lib/rules/curly.js | text | 78+1 | 77+0 | unassigned: object-literal member |  |
| 9b6ce3f0d3b66067330b9113b00e69286fb1217d0aedd6be9850f936eb371a1c | lib/rules/curly.js | text | 77+0 | 77+1 | unassigned: object-literal member |  |
| 42e0dc6e5fad6fbf8697454660a1dbd7c8d71c11e66286c686b3cdfe6c7a91a6 | lib/rules/curly.js | text | 77+0 | 78+1 | unassigned: object-literal member |  |
| 59717bc593dd685a312a0c689f365021765445f57300a1034c89e48c7f7dac74 | lib/rules/curly.js | text | 77+0 | 79+1 | unassigned: object-literal member |  |
| 59ff8a909aa7baf5a2abd6ac725535e67e313a3452d419baa9f3e010cf32db86 | lib/rules/curly.js | text | 80+1 | 81+0 | unassigned: object-literal member |  |
| d9f996266a2cbb161e5eb7539951e7ed4682f86a38ba9f5a26c1a13aff430ef9 | lib/rules/curly.js | text | 80+0 | 81+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["ac66d10c4edad4e9dab72aef529149ce93e077c836b150efdce1a0153da0e369","57937a2d60637181d54c1b47dec6c1a4bea7024f7d09f1e9ad92260613afbc4a","9b6ce3f0d3b66067330b9113b00e69286fb1217d0aedd6be9850f936eb371a1c","42e0dc6e5fad6fbf8697454660a1dbd7c8d71c11e66286c686b3cdfe6c7a91a6","59717bc593dd685a312a0c689f365021765445f57300a1034c89e48c7f7dac74","59ff8a909aa7baf5a2abd6ac725535e67e313a3452d419baa9f3e010cf32db86","d9f996266a2cbb161e5eb7539951e7ed4682f86a38ba9f5a26c1a13aff430ef9"]}

Task reconciliation: expected 7; terminal 7; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__302/run-wYDHsC/terminal.json