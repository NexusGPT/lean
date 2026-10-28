# lean report: 474e444bf85d63f11a76a9169440561976914641 → 46305b4b8606fd5dd9bb04ccf362ebf08a612ab6

Identity: f72f1ff0540ec7e1c7e7ef6400071870f4c6e16a589686bba41f26d7c916a112; lean 815fc01fec5f51af99003faa686f25330e7c33ad

6 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 6 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/quotes.js | `(edit d6c0a6bdb028)` (261-261) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/quotes.js | `(edit dc2fd37714f2)` (261-261) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/quotes.js | `(edit da89521bf5a2)` (262-262) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/quotes.js | `(edit e907a291398e)` (263-263) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/quotes.js | `(edit 82f79a8945fa)` (264-264) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/quotes.js | `(edit c25e1af74311)` (265-265) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 6 = 0 unit + 0 artifact + 6 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| d6c0a6bdb02871137bf3f8f9282ca16cfbef69aa2beb8b3bbac20da380d0028d | lib/rules/quotes.js | text | 261+1 | 261+0 | unassigned: object-literal member |  |
| dc2fd37714f2c755ff68e8f62a9752e0280d39d6c43af0c56396d15a5e55dda0 | lib/rules/quotes.js | text | 261+0 | 261+1 | unassigned: comment |  |
| da89521bf5a253208e4928fcb5be215ea389baeab69480a12db6480445622fa2 | lib/rules/quotes.js | text | 261+0 | 262+1 | unassigned: object-literal member |  |
| e907a291398e1403a8f0971eb9c9e225e23be29d7a963cc39a5fd994146cd662 | lib/rules/quotes.js | text | 261+0 | 263+1 | unassigned: object-literal member |  |
| 82f79a8945fa0f8466ad3e136f9596bc78817bbb72259ae41c2182f9759f3508 | lib/rules/quotes.js | text | 261+0 | 264+1 | unassigned: object-literal member |  |
| c25e1af74311ab4ec4dcfbe200651eb591148cd160d9b7c0fe7890162dfe549d | lib/rules/quotes.js | text | 261+0 | 265+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["d6c0a6bdb02871137bf3f8f9282ca16cfbef69aa2beb8b3bbac20da380d0028d","dc2fd37714f2c755ff68e8f62a9752e0280d39d6c43af0c56396d15a5e55dda0","da89521bf5a253208e4928fcb5be215ea389baeab69480a12db6480445622fa2","e907a291398e1403a8f0971eb9c9e225e23be29d7a963cc39a5fd994146cd662","82f79a8945fa0f8466ad3e136f9596bc78817bbb72259ae41c2182f9759f3508","c25e1af74311ab4ec4dcfbe200651eb591148cd160d9b7c0fe7890162dfe549d"]}

Task reconciliation: expected 6; terminal 6; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__329/run-zIsZja/terminal.json