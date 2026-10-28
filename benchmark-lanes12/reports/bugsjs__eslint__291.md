# lean report: 67916b9bde7a2790490a44d0191a5983bc9351d0 → d441c73db6400d6b2db0d925017c9045cda8a706

Identity: 810c4f8c42a55a164fbf25ebf6aaa9e57045cbf6dfeb491d8e41a045bb641276; lean 815fc01fec5f51af99003faa686f25330e7c33ad

1 changed function(s): **0 in scope · 1 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/ast-utils.js | `isES5Constructor` (57-62) | **WITNESS** | checked | WITNESS |  | input 0: outcome; lib/ast-utils.js:58 |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 2 = 2 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| d3a0b6a4941de23893baef19e11741d2c683d3a614e7341d2462882c2827b968 | lib/ast-utils.js | text | 60+1 | 60+0 | unit: isES5Constructor | old:isES5Constructor |
| 316f9d6f6b29ac576603c1f461750f1aea1e06475b570cf4dec4e80da600e89d | lib/ast-utils.js | text | 60+0 | 60+1 | unit: isES5Constructor | new:isES5Constructor |

source: {"unit":["d3a0b6a4941de23893baef19e11741d2c683d3a614e7341d2462882c2827b968","316f9d6f6b29ac576603c1f461750f1aea1e06475b570cf4dec4e80da600e89d"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 1; terminal 1; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__291/run-0RRGsk/terminal.json