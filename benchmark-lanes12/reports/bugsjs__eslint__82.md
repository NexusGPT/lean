# lean report: 3146167a9c1dafa15ba991155ae8b76344eab2ab → 954866dfb98d1787e0780c4558cae63c5f491e33

Identity: 6a93f57a487562b146cc999fa0cd571158142710c436ac20403646cd3fcf1b84; lean 815fc01fec5f51af99003faa686f25330e7c33ad

7 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 7 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-extra-parens.js | `(edit 072e12c9738a)` (348-348) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-extra-parens.js | `(edit fe5cf4128020)` (349-349) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/no-extra-parens.js | `(edit 71471d0ce903)` (350-350) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-extra-parens.js | `(edit bfcf6197d7f1)` (351-351) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-extra-parens.js | `(edit 1af8ee1bf067)` (352-352) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-extra-parens.js | `(edit d332b9677f5c)` (484-484) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-extra-parens.js | `(edit dc8589a97f99)` (489-489) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 7 = 0 unit + 0 artifact + 7 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 072e12c9738a397434c606fe22ada839dfc323e91973f970fdadd39d08d8eced | lib/rules/no-extra-parens.js | text | 347+0 | 348+1 | unassigned: object-literal member |  |
| fe5cf4128020ebffce781cd9b3068bf1099eb5eec230176208ffdb8ebd289d44 | lib/rules/no-extra-parens.js | text | 347+0 | 349+1 | unassigned: whitespace |  |
| 71471d0ce9031482bb1485accef0ddd0e694193794f341fac65d1a818f079a1d | lib/rules/no-extra-parens.js | text | 347+0 | 350+1 | unassigned: object-literal member |  |
| bfcf6197d7f12150accbb24fd4ac1514052579ff1ec56f165a2db24c81943775 | lib/rules/no-extra-parens.js | text | 347+0 | 351+1 | unassigned: object-literal member |  |
| 1af8ee1bf0672435c0540300baa92f177df0f9a65efaddaef7b2e37339af0782 | lib/rules/no-extra-parens.js | text | 347+0 | 352+1 | unassigned: object-literal member |  |
| d332b9677f5c365f5a95c6ba81038c354cca9a196c75f7ab30c58ba8a8b5dbe2 | lib/rules/no-extra-parens.js | text | 484+1 | 489+0 | unassigned: object-literal member |  |
| dc8589a97f994655676543580841f456fd51c9ff02d7eae6afd3450c6cdbb4b5 | lib/rules/no-extra-parens.js | text | 484+0 | 489+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["072e12c9738a397434c606fe22ada839dfc323e91973f970fdadd39d08d8eced","fe5cf4128020ebffce781cd9b3068bf1099eb5eec230176208ffdb8ebd289d44","71471d0ce9031482bb1485accef0ddd0e694193794f341fac65d1a818f079a1d","bfcf6197d7f12150accbb24fd4ac1514052579ff1ec56f165a2db24c81943775","1af8ee1bf0672435c0540300baa92f177df0f9a65efaddaef7b2e37339af0782","d332b9677f5c365f5a95c6ba81038c354cca9a196c75f7ab30c58ba8a8b5dbe2","dc8589a97f994655676543580841f456fd51c9ff02d7eae6afd3450c6cdbb4b5"]}

Task reconciliation: expected 7; terminal 7; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__82/run-8at6EP/terminal.json