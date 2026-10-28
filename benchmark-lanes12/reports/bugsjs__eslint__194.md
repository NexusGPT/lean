# lean report: 16db93a30dccf8877f39e83116de074256753fa0 → c7577f070effcd4de0e7411ca9f09404c02a0303

Identity: 5af1e8d41ab06ab3090b1860bbf8b7bd489705813dbc0e9238ecd74a1254178f; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 4 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-cond-assign.js | `(edit 68526480b2cd)` (7-7) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-cond-assign.js | `(edit 361f9ad3a565)` (8-8) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/no-cond-assign.js | `(edit fde1ca68eebf)` (62-62) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-cond-assign.js | `(edit fa6aa2284997)` (64-64) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 0 unit + 0 artifact + 4 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 68526480b2cd3007a3d64fc6dc2a3a73b9d1c5f2f7192faebb687f20c599aa7f | lib/rules/no-cond-assign.js | text | 6+0 | 7+1 | unassigned: module-level statement |  |
| 361f9ad3a565b4ba4a86f221afabf516bfafef66eacbb7163fba21a17c613e93 | lib/rules/no-cond-assign.js | text | 6+0 | 8+1 | unassigned: whitespace |  |
| fde1ca68eebf2b2cfb58f31dabe703e8854846f2a5175872486db84dcbae5224 | lib/rules/no-cond-assign.js | text | 62+1 | 64+0 | unassigned: object-literal member |  |
| fa6aa22849973b483ae8694cde14609719611389ca969852444a27058782ed09 | lib/rules/no-cond-assign.js | text | 62+0 | 64+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["68526480b2cd3007a3d64fc6dc2a3a73b9d1c5f2f7192faebb687f20c599aa7f","361f9ad3a565b4ba4a86f221afabf516bfafef66eacbb7163fba21a17c613e93","fde1ca68eebf2b2cfb58f31dabe703e8854846f2a5175872486db84dcbae5224","fa6aa22849973b483ae8694cde14609719611389ca969852444a27058782ed09"]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__194/run-n2ioCg/terminal.json