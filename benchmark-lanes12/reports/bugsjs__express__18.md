# lean report: 3d2ecdd5fabf697c9e3d212356b557cbba618fe3 → 8341317e9b50e71c739ab82fcfb5ec04564ba9d4

Identity: 198e725ef3198fc57d2cc1516c98e7ca5e8dbc2b7d588563a5955426828e6590; lean 815fc01fec5f51af99003faa686f25330e7c33ad

3 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 3 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/router/index.js | `(edit f93e97ad01c0)` (360-360) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit c577048d4e5e)` (360-360) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit fc645ba8c279)` (361-361) | **ASK** | unassigned:module-level statement |  |  | module-level statement |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 3 = 0 unit + 0 artifact + 3 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| f93e97ad01c024d9e8967b46d57623134a99fad2d1d947ecf9601a8d3f5cc9c6 | lib/router/index.js | text | 360+1 | 360+0 | unassigned: module-level statement |  |
| c577048d4e5ed6200f5ff5837fffc0c33cc7b864b7ae7fbc7bf48610db7f8302 | lib/router/index.js | text | 360+0 | 360+1 | unassigned: module-level statement |  |
| fc645ba8c27999a871fd4fdf2b78c6ab855bdd586e84789d566da2a0645a5fb0 | lib/router/index.js | text | 360+0 | 361+1 | unassigned: module-level statement |  |

source: {"unit":[],"artifact":[],"unassigned":["f93e97ad01c024d9e8967b46d57623134a99fad2d1d947ecf9601a8d3f5cc9c6","c577048d4e5ed6200f5ff5837fffc0c33cc7b864b7ae7fbc7bf48610db7f8302","fc645ba8c27999a871fd4fdf2b78c6ab855bdd586e84789d566da2a0645a5fb0"]}

Task reconciliation: expected 3; terminal 3; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__express__18/run-b7VwAe/terminal.json