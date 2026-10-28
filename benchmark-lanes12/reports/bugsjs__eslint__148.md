# lean report: 47c3171a528eefe106fa51343240cab965f41836 → 9a18e30bf02c59162f8650041585aec27c471539

Identity: caa51e821153ca578706e16700ba1fb7d00a28d1e380bb523abc7628e0ed863a; lean 815fc01fec5f51af99003faa686f25330e7c33ad

8 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 8 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-useless-escape.js | `(edit 1114037dc643)` (150-150) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit dcaf8bd1497b)` (150-150) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 6bd64ba1e200)` (151-151) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit ea7da1fe206c)` (152-152) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 8f5ac3b6e7ab)` (153-153) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 1cea37bc6b26)` (154-154) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 77ea9d50ea2e)` (155-155) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 39a307c53bb1)` (156-156) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 8 = 0 unit + 0 artifact + 8 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 1114037dc643bd2802d54540dd0b9f825bdeba03d2be783cfa5ec356071eca74 | lib/rules/no-useless-escape.js | text | 150+1 | 150+0 | unassigned: object-literal member |  |
| dcaf8bd1497bcaf69d3bc2caa5fe80e9468c99339103bad66a9f78ca14524830 | lib/rules/no-useless-escape.js | text | 150+0 | 150+1 | unassigned: object-literal member |  |
| 6bd64ba1e20043477d8775f2a7ed358b962aed6d19266e5510453c5876ae59f8 | lib/rules/no-useless-escape.js | text | 150+0 | 151+1 | unassigned: object-literal member |  |
| ea7da1fe206cb9802ea3e8d65b3f01803d48dbacdf4ebcd658b9ac5e6bc94502 | lib/rules/no-useless-escape.js | text | 150+0 | 152+1 | unassigned: object-literal member |  |
| 8f5ac3b6e7abc28eebf4a6a68c6feda5f1b80904949e7d4e42dd2f5581982bb5 | lib/rules/no-useless-escape.js | text | 150+0 | 153+1 | unassigned: object-literal member |  |
| 1cea37bc6b2668d5a645dd4eacbbc2d922b75c0d74a73fd8fbd5411b8fcd4071 | lib/rules/no-useless-escape.js | text | 150+0 | 154+1 | unassigned: object-literal member |  |
| 77ea9d50ea2ed3e9c042610ce726d06371f3842a866d6c71ee00e6463f07d284 | lib/rules/no-useless-escape.js | text | 150+0 | 155+1 | unassigned: object-literal member |  |
| 39a307c53bb11a107148956f5bb0c4d21b432a7950c9c3c9c7fc0bc2699192f4 | lib/rules/no-useless-escape.js | text | 150+0 | 156+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["1114037dc643bd2802d54540dd0b9f825bdeba03d2be783cfa5ec356071eca74","dcaf8bd1497bcaf69d3bc2caa5fe80e9468c99339103bad66a9f78ca14524830","6bd64ba1e20043477d8775f2a7ed358b962aed6d19266e5510453c5876ae59f8","ea7da1fe206cb9802ea3e8d65b3f01803d48dbacdf4ebcd658b9ac5e6bc94502","8f5ac3b6e7abc28eebf4a6a68c6feda5f1b80904949e7d4e42dd2f5581982bb5","1cea37bc6b2668d5a645dd4eacbbc2d922b75c0d74a73fd8fbd5411b8fcd4071","77ea9d50ea2ed3e9c042610ce726d06371f3842a866d6c71ee00e6463f07d284","39a307c53bb11a107148956f5bb0c4d21b432a7950c9c3c9c7fc0bc2699192f4"]}

Task reconciliation: expected 8; terminal 8; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__148/run-uYBhQj/terminal.json