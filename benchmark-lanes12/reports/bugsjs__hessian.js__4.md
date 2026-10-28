# lean report: d996501c087a3cecc5ce3e470106ebdb90657ca9 → 63bb627b99267577e85c117008e8d896103b69c6

Identity: 6335ef63e02c3a00126c0c68d0018123f6ca1d0c61506b0809aeb3174d4b9fd0; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 4 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/v1/encoder.js | `(edit 4a964fdc2d5e)` (302-302) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v1/encoder.js | `(edit c1f740295a1a)` (302-302) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v1/encoder.js | `(edit 282f664a9f0f)` (303-303) | **ASK** | unassigned:comment |  |  | comment |
| lib/v1/encoder.js | `(edit 4a1370700cbd)` (304-304) | **ASK** | unassigned:module-level statement |  |  | module-level statement |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 0 unit + 0 artifact + 4 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 4a964fdc2d5e36f7589197d9e23ad250c077317882d2636433567b8e6c9aed0a | lib/v1/encoder.js | text | 302+1 | 302+0 | unassigned: module-level statement |  |
| c1f740295a1a8f93aaa96296441240bd8cdebfc4b6ea28a9e462c356a44228db | lib/v1/encoder.js | text | 302+0 | 302+1 | unassigned: module-level statement |  |
| 282f664a9f0f1fca89da516f389c8ab95c8c6eef46f917470289d9a35f1864d8 | lib/v1/encoder.js | text | 302+0 | 303+1 | unassigned: comment |  |
| 4a1370700cbd0151f71ed34293a6af39b7767d5c9d90932149f27c44b30d8b08 | lib/v1/encoder.js | text | 302+0 | 304+1 | unassigned: module-level statement |  |

source: {"unit":[],"artifact":[],"unassigned":["4a964fdc2d5e36f7589197d9e23ad250c077317882d2636433567b8e6c9aed0a","c1f740295a1a8f93aaa96296441240bd8cdebfc4b6ea28a9e462c356a44228db","282f664a9f0f1fca89da516f389c8ab95c8c6eef46f917470289d9a35f1864d8","4a1370700cbd0151f71ed34293a6af39b7767d5c9d90932149f27c44b30d8b08"]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__hessian.js__4/run-agLoik/terminal.json