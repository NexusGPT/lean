# lean report: 23062e2ed8c654acdb54811624592715e087593a → c2d43210af038cedb765d1748246f86a4f77c9e7

Identity: f2df16107127048a721aa21b93e255f22a9a1fd75030ef716fab0493707987d1; lean 815fc01fec5f51af99003faa686f25330e7c33ad

2 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 2 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-extra-parens.js | `(edit 5de90a05a933)` (512-512) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-extra-parens.js | `(edit 5555feef2b8a)` (512-512) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 2 = 0 unit + 0 artifact + 2 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 5de90a05a933784de5defa75e14fe8679dc34c652038bed66a30957c2038b395 | lib/rules/no-extra-parens.js | text | 512+1 | 512+0 | unassigned: object-literal member |  |
| 5555feef2b8aa5ce23c2862e8fc95925cef560558ecca260562d6559eaf0074a | lib/rules/no-extra-parens.js | text | 512+0 | 512+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["5de90a05a933784de5defa75e14fe8679dc34c652038bed66a30957c2038b395","5555feef2b8aa5ce23c2862e8fc95925cef560558ecca260562d6559eaf0074a"]}

Task reconciliation: expected 2; terminal 2; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__65/run-3eYJum/terminal.json