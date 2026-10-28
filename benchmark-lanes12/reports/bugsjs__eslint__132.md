# lean report: 8e1fee1986b38f3686a1f42bdb01f8dc51ed4a98 → 0d95715811863778cf1facb454440d79ef546ca7

Identity: 1e05daf80698f0da63071e6fedc886faecff80c5a96d32ec888ac53f3c2f87e8; lean 815fc01fec5f51af99003faa686f25330e7c33ad

2 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 2 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/ast-utils.js | `(edit cab906fe35e7)` (563-563) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-extra-parens.js | `(edit 583c08343409)` (590-590) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 2 = 0 unit + 0 artifact + 2 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| cab906fe35e7c0e1ab2ff00bb6d9a3dd5cafc583595498a2cd481c9808732dee | lib/ast-utils.js | text | 562+0 | 563+1 | unassigned: object-literal member |  |
| 583c083434094804ce0f66c57871bfee27a9e046dbbb88801239984b6808969f | lib/rules/no-extra-parens.js | text | 589+0 | 590+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["cab906fe35e7c0e1ab2ff00bb6d9a3dd5cafc583595498a2cd481c9808732dee","583c083434094804ce0f66c57871bfee27a9e046dbbb88801239984b6808969f"]}

Task reconciliation: expected 2; terminal 2; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__132/run-ud8EF2/terminal.json