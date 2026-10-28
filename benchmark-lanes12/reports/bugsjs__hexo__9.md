# lean report: 683fd0a19c4f94216dcc13c35970135d7a6ef03e → 692b399665ba9627163d4803b45ba5821681b9d3

Identity: 0f61b5a5db7156729e4d9ef0ff9f6a3af686c3684a99638dc379a70b0fdac59b; lean 815fc01fec5f51af99003faa686f25330e7c33ad

6 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 6 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/plugins/helper/paginator.js | `(edit e1633bf51bc7)` (7-7) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (module-level statement) |
| lib/plugins/helper/paginator.js | `(edit 1d72ce124585)` (8-8) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (module-level statement) |
| lib/plugins/helper/paginator.js | `(edit b678010d5abc)` (7-7) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (module-level statement) |
| lib/plugins/helper/paginator.js | `(edit cb6d992acd3c)` (8-8) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (module-level statement) |
| lib/plugins/helper/paginator.js | `(edit bc1bd03a8465)` (22-22) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (module-level statement) |
| lib/plugins/helper/paginator.js | `(edit b8f46b18fa54)` (23-23) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (whitespace) |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 6 = 0 unit + 0 artifact + 6 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| e1633bf51bc79808c64d6b9a4faea46ec79f587c413977bdb2000619c42e9a92 | lib/plugins/helper/paginator.js | text | 7+1 | 7+0 | unassigned: untyped JavaScript file | old:paginatorHelper |
| 1d72ce124585335197c2ca470d4fdec9da64f6cd79a8dabc6bac25104e154d2b | lib/plugins/helper/paginator.js | text | 8+1 | 7+0 | unassigned: untyped JavaScript file | old:paginatorHelper |
| b678010d5abc5ff80337ca2e4c058ba722557f42c15857ab24cd10ef8ffee2a9 | lib/plugins/helper/paginator.js | text | 7+0 | 7+1 | unassigned: untyped JavaScript file | new:paginatorHelper |
| cb6d992acd3c5b04ec0804cbd261d7f03b996de7c8b7bb5ca9ba1704f71269f9 | lib/plugins/helper/paginator.js | text | 7+0 | 8+1 | unassigned: untyped JavaScript file | new:paginatorHelper |
| bc1bd03a8465eaaae589dc9ed2bfbb2e442d4aed60c0aeb45ec3fea385750619 | lib/plugins/helper/paginator.js | text | 21+0 | 22+1 | unassigned: untyped JavaScript file | new:paginatorHelper |
| b8f46b18fa541c3f46679675ee4819beaab78452afb9540379f0fea9ac7c0519 | lib/plugins/helper/paginator.js | text | 21+0 | 23+1 | unassigned: untyped JavaScript file | new:paginatorHelper |

source: {"unit":[],"artifact":[],"unassigned":["e1633bf51bc79808c64d6b9a4faea46ec79f587c413977bdb2000619c42e9a92","1d72ce124585335197c2ca470d4fdec9da64f6cd79a8dabc6bac25104e154d2b","b678010d5abc5ff80337ca2e4c058ba722557f42c15857ab24cd10ef8ffee2a9","cb6d992acd3c5b04ec0804cbd261d7f03b996de7c8b7bb5ca9ba1704f71269f9","bc1bd03a8465eaaae589dc9ed2bfbb2e442d4aed60c0aeb45ec3fea385750619","b8f46b18fa541c3f46679675ee4819beaab78452afb9540379f0fea9ac7c0519"]}

Task reconciliation: expected 6; terminal 6; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__hexo__9/run-NMSWbp/terminal.json