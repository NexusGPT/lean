# lean report: 3141872bb36f7aafd1802018c978ef401f76cea4 → 01c2e82a3aa7ca9b4e57a49cf58c74c2ca38f835

Identity: 244e98be9bef3ed509bdc3de904ef07f4e9e6803725b0e8becd8bc002e4f189e; lean 815fc01fec5f51af99003faa686f25330e7c33ad

1 changed function(s): **0 in scope · 1 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/padding-line-between-statements.js | `isBlockLikeStatement` (81-104) | **WITNESS** | checked | WITNESS |  | input 3: outcome; lib/rules/padding-line-between-statements.js:100 |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 2 = 2 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| ad6552af074bad5a32d7161748df0ab01ec0a0c29b0f7e778c827ae401685889 | lib/rules/padding-line-between-statements.js | text | 96+1 | 96+0 | unit: isBlockLikeStatement | old:isBlockLikeStatement |
| c1f5fbbe09892eff957edece703ade1d06be15568c62285adea3ed4692049c94 | lib/rules/padding-line-between-statements.js | text | 96+0 | 96+1 | unit: isBlockLikeStatement | new:isBlockLikeStatement |

source: {"unit":["ad6552af074bad5a32d7161748df0ab01ec0a0c29b0f7e778c827ae401685889","c1f5fbbe09892eff957edece703ade1d06be15568c62285adea3ed4692049c94"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 1; terminal 1; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__259/run-ZbMv9e/terminal.json