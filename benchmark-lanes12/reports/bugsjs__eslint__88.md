# lean report: 7ea3e4ba09f1ef5857f17dc80313a1fd68dbbea5 → 3c25d9ab2dca9c877c03ae70fe12f592d8d37b18

Identity: 587c8754901b5a0d0f24f581aecff2ba24e02b6d5f026b4d2344f28e7267db4d; lean 815fc01fec5f51af99003faa686f25330e7c33ad

5 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 5 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/prefer-arrow-callback.js | `(edit bb0a3e48faaa)` (278-278) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/prefer-arrow-callback.js | `(edit e43d27e43c02)` (283-283) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/prefer-arrow-callback.js | `(edit 64d44e074c03)` (284-284) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/prefer-arrow-callback.js | `(edit 9fc64832e397)` (287-287) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/prefer-arrow-callback.js | `(edit ff129c6b44ff)` (288-288) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 5 = 0 unit + 0 artifact + 5 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| bb0a3e48faaaf7cf5c1cd19664f6b1fda21e139aa95267998f0ab3dd76a9daaa | lib/rules/prefer-arrow-callback.js | text | 277+0 | 278+1 | unassigned: object-literal member |  |
| e43d27e43c02a65c7a720a345193b8220b9245a24c61ece1c67707895d7b0ea4 | lib/rules/prefer-arrow-callback.js | text | 283+1 | 284+0 | unassigned: object-literal member |  |
| 64d44e074c03407714b19de20cf45586708d8bcac94cbafb4621e80c44556b1a | lib/rules/prefer-arrow-callback.js | text | 283+0 | 284+1 | unassigned: object-literal member |  |
| 9fc64832e397b5c413f2740d81c1943a4f58049dc7c81b0f7348f96f6b995545 | lib/rules/prefer-arrow-callback.js | text | 287+1 | 288+0 | unassigned: object-literal member |  |
| ff129c6b44ffa2b63775f83397cb6f96307bba77753dea28b0d6d6d96b835572 | lib/rules/prefer-arrow-callback.js | text | 287+0 | 288+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["bb0a3e48faaaf7cf5c1cd19664f6b1fda21e139aa95267998f0ab3dd76a9daaa","e43d27e43c02a65c7a720a345193b8220b9245a24c61ece1c67707895d7b0ea4","64d44e074c03407714b19de20cf45586708d8bcac94cbafb4621e80c44556b1a","9fc64832e397b5c413f2740d81c1943a4f58049dc7c81b0f7348f96f6b995545","ff129c6b44ffa2b63775f83397cb6f96307bba77753dea28b0d6d6d96b835572"]}

Task reconciliation: expected 5; terminal 5; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__88/run-SpiK9b/terminal.json