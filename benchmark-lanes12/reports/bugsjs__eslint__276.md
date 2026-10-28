# lean report: 76c3bd7bba4f4dd7356c7f48c39247ce0cb01360 → 8f8b71f37f23bcc727454b5c70206d6459a83e78

Identity: 1be9ddcab1f60dd2cc1fa4f8169b85622eb69e1d9022d96e37f3d7ba999452ab; lean 815fc01fec5f51af99003faa686f25330e7c33ad

5 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 5 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/brace-style.js | `(edit d66c13d0cb43)` (67-67) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/rules/brace-style.js | `(edit b268a895d6dd)` (67-67) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/rules/brace-style.js | `(edit a1de30c413e8)` (68-68) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/rules/brace-style.js | `(edit b9f3eeea7ff4)` (71-71) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/rules/brace-style.js | `(edit 137f62ae9396)` (72-72) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 5 = 0 unit + 0 artifact + 5 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| d66c13d0cb43a7e8810fff65ce5c78c37820ae19c2f24fc761f590130b6bf2b3 | lib/rules/brace-style.js | text | 67+1 | 67+0 | unassigned: exported property assignment |  |
| b268a895d6dd50ccebf5e6e5cdfce0dfef618b4420488702bc5e1f6232049ce8 | lib/rules/brace-style.js | text | 67+0 | 67+1 | unassigned: exported property assignment |  |
| a1de30c413e8dce3c00b9146e0d7c2f87bef31bc41420e9716df45c04415172d | lib/rules/brace-style.js | text | 67+0 | 68+1 | unassigned: exported property assignment |  |
| b9f3eeea7ff4739be7177bf082860622fa2b419ce54ccc38952ba4922ca870df | lib/rules/brace-style.js | text | 71+1 | 72+0 | unassigned: exported property assignment |  |
| 137f62ae9396dd353de81c56a598aeb103707c9370791cc45b8dd2a81dfadc93 | lib/rules/brace-style.js | text | 71+0 | 72+1 | unassigned: exported property assignment |  |

source: {"unit":[],"artifact":[],"unassigned":["d66c13d0cb43a7e8810fff65ce5c78c37820ae19c2f24fc761f590130b6bf2b3","b268a895d6dd50ccebf5e6e5cdfce0dfef618b4420488702bc5e1f6232049ce8","a1de30c413e8dce3c00b9146e0d7c2f87bef31bc41420e9716df45c04415172d","b9f3eeea7ff4739be7177bf082860622fa2b419ce54ccc38952ba4922ca870df","137f62ae9396dd353de81c56a598aeb103707c9370791cc45b8dd2a81dfadc93"]}

Task reconciliation: expected 5; terminal 5; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__276/run-KQQhmv/terminal.json