# lean report: 5e3bca7cd8cfa8bc2e8b597ba9641cb11daa9d8c → 9122c8d96281671b824c0dcf4da0c7e7be8cae30

Identity: 10902608600241bf04a79ee4b9e2e6b00a73d6226ac9df60a5abf48c52db9505; lean 815fc01fec5f51af99003faa686f25330e7c33ad

2 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 2 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/operator-assignment.js | `(edit 56867ebffdb8)` (138-138) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/operator-assignment.js | `(edit ceb4c177abf8)` (138-138) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 2 = 0 unit + 0 artifact + 2 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 56867ebffdb81c77d7015f4d24e9606da79895cb18671806732335925f53692c | lib/rules/operator-assignment.js | text | 138+1 | 138+0 | unassigned: object-literal member |  |
| ceb4c177abf89dc83ce2556e9247ab4c8bcbbc4c82372cf5cdbaef902aa19e70 | lib/rules/operator-assignment.js | text | 138+0 | 138+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["56867ebffdb81c77d7015f4d24e9606da79895cb18671806732335925f53692c","ceb4c177abf89dc83ce2556e9247ab4c8bcbbc4c82372cf5cdbaef902aa19e70"]}

Task reconciliation: expected 2; terminal 2; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__83/run-gccs3o/terminal.json