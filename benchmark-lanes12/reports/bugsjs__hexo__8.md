# lean report: 1da7ad5c920fb16e182342c4acda7d8a94af31f9 → dd501b7f2d5a8365964f795ae9c7924e7f4a064d

Identity: 3089f7f2d03fb741a1a4284c65c8f984827ffe6a1433f6786c524961641404a4; lean 815fc01fec5f51af99003faa686f25330e7c33ad

5 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 5 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/plugins/helper/open_graph.js | `(edit 2eac9bfd54a8)` (88-88) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (module-level statement) |
| lib/plugins/helper/open_graph.js | `(edit e08481d769d8)` (89-89) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (module-level statement) |
| lib/plugins/helper/open_graph.js | `(edit a6c1a7cef7f6)` (88-88) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (comment) |
| lib/plugins/helper/open_graph.js | `(edit e5633219454b)` (89-89) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (comment) |
| lib/plugins/helper/open_graph.js | `(edit 6277809af310)` (90-90) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (module-level statement) |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 5 = 0 unit + 0 artifact + 5 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 2eac9bfd54a8dbb1ce0a162033181f8809ebb87be4a3cab28c12d7833a930d7b | lib/plugins/helper/open_graph.js | text | 88+1 | 88+0 | unassigned: untyped JavaScript file | old:openGraphHelper |
| e08481d769d854f1c636f64312c4cc841d19bf8b640341ec4df130d6a7dacd6b | lib/plugins/helper/open_graph.js | text | 89+1 | 88+0 | unassigned: untyped JavaScript file | old:openGraphHelper |
| a6c1a7cef7f606ff9c3311290070be8eed03fd59e9202410ef5277c5c8d8c04a | lib/plugins/helper/open_graph.js | text | 88+0 | 88+1 | unassigned: untyped JavaScript file | new:openGraphHelper |
| e5633219454b29066a436401cce89a043239590d56e63036d8b24d131d6c963e | lib/plugins/helper/open_graph.js | text | 88+0 | 89+1 | unassigned: untyped JavaScript file | new:openGraphHelper |
| 6277809af310603f9bc16dd92d05409b667d91a12a7a23bb396d125de2244088 | lib/plugins/helper/open_graph.js | text | 88+0 | 90+1 | unassigned: untyped JavaScript file | new:openGraphHelper |

source: {"unit":[],"artifact":[],"unassigned":["2eac9bfd54a8dbb1ce0a162033181f8809ebb87be4a3cab28c12d7833a930d7b","e08481d769d854f1c636f64312c4cc841d19bf8b640341ec4df130d6a7dacd6b","a6c1a7cef7f606ff9c3311290070be8eed03fd59e9202410ef5277c5c8d8c04a","e5633219454b29066a436401cce89a043239590d56e63036d8b24d131d6c963e","6277809af310603f9bc16dd92d05409b667d91a12a7a23bb396d125de2244088"]}

Task reconciliation: expected 5; terminal 5; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__hexo__8/run-nhDnEs/terminal.json