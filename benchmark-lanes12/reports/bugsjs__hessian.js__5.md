# lean report: be3ad2dd39d9667b48f22bece4069f5033016ce6 → bf6c42d4de25ba8e6637bf6fd875f5681bcf3790

Identity: 842871379e9ebe1859a4e86e515cfd0efc95383eb4999e5732f1e2b6e9004fca; lean 815fc01fec5f51af99003faa686f25330e7c33ad

9 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 9 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/v2/encoder.js | `(edit eb57bce6434d)` (22-22) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v2/encoder.js | `(edit 2b38f485fbae)` (78-78) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v2/encoder.js | `(edit c318cef024dc)` (145-145) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v2/encoder.js | `(edit 592b368989ee)` (146-146) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v2/encoder.js | `(edit 8fc34cd0ad2f)` (147-147) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v2/encoder.js | `(edit 96c502ba6cad)` (148-148) | **ASK** | unassigned:whitespace |  |  | whitespace |
| package.json | `(edit ba9d8f33fea4)` (34-34) | **ASK** | artifact:config |  |  | config |
| package.json | `(edit 71acd5c2709d)` (34-34) | **ASK** | artifact:config |  |  | config |
| package.json | `(edit b7e42f7a1687)` (35-35) | **ASK** | artifact:config |  |  | config |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 9 = 0 unit + 3 artifact + 6 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| eb57bce6434d2b459e211fd9bf98af25667689eeda810a93c88398aa28d79ddf | lib/v2/encoder.js | text | 21+0 | 22+1 | unassigned: module-level statement |  |
| 2b38f485fbae2eb64f63a400e631831d9e80e77e70e1c92cf11725d4e65dc003 | lib/v2/encoder.js | text | 76+0 | 78+1 | unassigned: module-level statement |  |
| c318cef024dc7dd088033b346e925d199d94a4c22475cc229617318d98defa41 | lib/v2/encoder.js | text | 142+0 | 145+1 | unassigned: module-level statement |  |
| 592b368989eeb52d4c68795329e0061bec194d79c7675d60696e00a50f831c3c | lib/v2/encoder.js | text | 142+0 | 146+1 | unassigned: module-level statement |  |
| 8fc34cd0ad2fceefe8953548b167378211db26f8cf0f2e9075c6c5f6cf2ff399 | lib/v2/encoder.js | text | 142+0 | 147+1 | unassigned: module-level statement |  |
| 96c502ba6cada7e0c2975fe8e01071f7702baa6253ab387ed5557dd71f4728b7 | lib/v2/encoder.js | text | 142+0 | 148+1 | unassigned: whitespace |  |
| ba9d8f33fea4636909ea929888ead56b00af9d7ff682e25749098a35c92ff6ca | package.json | text | 34+1 | 34+0 | artifact: config |  |
| 71acd5c2709d2eea4681304024092e6bb4a477ed7ae0c8648d109ed391e22c12 | package.json | text | 34+0 | 34+1 | artifact: config |  |
| b7e42f7a16872666c20661704232e8cd1e31768cda0e29b1b0f04a3609c82f0b | package.json | text | 34+0 | 35+1 | artifact: config |  |

source: {"unit":[],"artifact":[],"unassigned":["eb57bce6434d2b459e211fd9bf98af25667689eeda810a93c88398aa28d79ddf","2b38f485fbae2eb64f63a400e631831d9e80e77e70e1c92cf11725d4e65dc003","c318cef024dc7dd088033b346e925d199d94a4c22475cc229617318d98defa41","592b368989eeb52d4c68795329e0061bec194d79c7675d60696e00a50f831c3c","8fc34cd0ad2fceefe8953548b167378211db26f8cf0f2e9075c6c5f6cf2ff399","96c502ba6cada7e0c2975fe8e01071f7702baa6253ab387ed5557dd71f4728b7"]}

config: {"unit":[],"artifact":["ba9d8f33fea4636909ea929888ead56b00af9d7ff682e25749098a35c92ff6ca","71acd5c2709d2eea4681304024092e6bb4a477ed7ae0c8648d109ed391e22c12","b7e42f7a16872666c20661704232e8cd1e31768cda0e29b1b0f04a3609c82f0b"],"unassigned":[]}

Task reconciliation: expected 9; terminal 9; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__hessian.js__5/run-0fjiEL/terminal.json