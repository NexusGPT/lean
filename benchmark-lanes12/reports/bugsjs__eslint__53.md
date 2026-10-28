# lean report: 97251462cd699fe5f383fbaf52e121a2e6055f69 → 48cd9c501656171c52f3c5a12221e4754833a855

Identity: 559fe5820c8b5315f681f013e56ffa78cc701f05dba632a4d4a049cea0fd974b; lean 815fc01fec5f51af99003faa686f25330e7c33ad

5 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 5 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/multiline-comment-style.js | `(edit b8ee6c95979d)` (274-274) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/multiline-comment-style.js | `(edit 34cac4ee67cd)` (275-275) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/multiline-comment-style.js | `(edit db8c4471cc22)` (277-277) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/multiline-comment-style.js | `(edit ccb0fa31b492)` (279-279) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/multiline-comment-style.js | `(edit c4298793cb3b)` (280-280) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 5 = 0 unit + 0 artifact + 5 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| b8ee6c95979d70f90522a2498028d39d6077227dae85d775df125f9161309e60 | lib/rules/multiline-comment-style.js | text | 273+0 | 274+1 | unassigned: object-literal member |  |
| 34cac4ee67cdd5b577c34b29ddb279cabe30bc9d7a6f107b8e60a6cec1fc495a | lib/rules/multiline-comment-style.js | text | 273+0 | 275+1 | unassigned: whitespace |  |
| db8c4471cc22c1a1e94daaf3779a1f9844ca41182a9c44f1ada347dd1855e275 | lib/rules/multiline-comment-style.js | text | 277+1 | 279+0 | unassigned: object-literal member |  |
| ccb0fa31b4924201959371ee79e1e721d91e6c88fcbed553794c52fd7dfa6da8 | lib/rules/multiline-comment-style.js | text | 277+0 | 279+1 | unassigned: object-literal member |  |
| c4298793cb3bfe89684356ceff6c82fdb2d475d2480daaef3b950301041c3fb7 | lib/rules/multiline-comment-style.js | text | 277+0 | 280+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["b8ee6c95979d70f90522a2498028d39d6077227dae85d775df125f9161309e60","34cac4ee67cdd5b577c34b29ddb279cabe30bc9d7a6f107b8e60a6cec1fc495a","db8c4471cc22c1a1e94daaf3779a1f9844ca41182a9c44f1ada347dd1855e275","ccb0fa31b4924201959371ee79e1e721d91e6c88fcbed553794c52fd7dfa6da8","c4298793cb3bfe89684356ceff6c82fdb2d475d2480daaef3b950301041c3fb7"]}

Task reconciliation: expected 5; terminal 5; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__53/run-5NkSYx/terminal.json