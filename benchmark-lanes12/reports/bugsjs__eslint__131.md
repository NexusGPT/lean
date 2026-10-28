# lean report: c00f3f6dd342dd03b23278fd742601aa72747775 → e60f91817cf9c425502a1377bd9ef53eef27268b

Identity: 0bd819cf2d31ccd9949c38ad91405fb382a3e4d9f8d98e1bec9650d995123002; lean 815fc01fec5f51af99003faa686f25330e7c33ad

6 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 6 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-empty.js | `(edit 27583be68488)` (5-5) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (module-level statement) |
| lib/rules/no-empty.js | `(edit ec354981924e)` (12-12) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (exported property assignment) |
| lib/rules/no-empty.js | `(edit 7e9845ae9450)` (13-13) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (whitespace) |
| lib/rules/no-empty.js | `(edit ce112005da5b)` (14-14) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (whitespace) |
| lib/rules/no-empty.js | `(edit 7a4b36745622)` (19-19) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (object-literal member) |
| lib/rules/no-empty.js | `(edit 070cc0cfee71)` (19-19) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (object-literal member) |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 6 = 0 unit + 0 artifact + 6 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 27583be68488ba124ab8397593f3fc49e9bea52f583b6aaa776e105c349104b6 | lib/rules/no-empty.js | text | 4+0 | 5+1 | unassigned: untyped JavaScript file |  |
| ec354981924e57dc67431b9fe00e6a11ef8596fcea64fcfb9d3a91f512e4b512 | lib/rules/no-empty.js | text | 12+1 | 12+0 | unassigned: untyped JavaScript file |  |
| 7e9845ae94506e0f60fabd80b75348b639f6eda45f6ae4f481f33412f9a02ef1 | lib/rules/no-empty.js | text | 13+1 | 12+0 | unassigned: untyped JavaScript file |  |
| ce112005da5b3c666ef862a12d3b00988468abbb0e331f5610784196094bf548 | lib/rules/no-empty.js | text | 14+0 | 14+1 | unassigned: untyped JavaScript file |  |
| 7a4b3674562282d9c0add35ecec843b25390faf536eac80fadb077cdf40ab206 | lib/rules/no-empty.js | text | 19+1 | 19+0 | unassigned: untyped JavaScript file |  |
| 070cc0cfee712d9c4a1f3896e5c2d1512fab8c6fa396544c0914431df4ab42fd | lib/rules/no-empty.js | text | 19+0 | 19+1 | unassigned: untyped JavaScript file |  |

source: {"unit":[],"artifact":[],"unassigned":["27583be68488ba124ab8397593f3fc49e9bea52f583b6aaa776e105c349104b6","ec354981924e57dc67431b9fe00e6a11ef8596fcea64fcfb9d3a91f512e4b512","7e9845ae94506e0f60fabd80b75348b639f6eda45f6ae4f481f33412f9a02ef1","ce112005da5b3c666ef862a12d3b00988468abbb0e331f5610784196094bf548","7a4b3674562282d9c0add35ecec843b25390faf536eac80fadb077cdf40ab206","070cc0cfee712d9c4a1f3896e5c2d1512fab8c6fa396544c0914431df4ab42fd"]}

Task reconciliation: expected 6; terminal 6; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__131/run-8GQdqh/terminal.json