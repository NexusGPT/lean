# lean report: 2a7e5f14aaf20959d07b28fda091391243dff98f → 012e54c9a2c0ea5a1716744ae50dc9937e6449d7

Identity: acbc57752407af9d31e9934b7e034d5f81c22ed6cb7cb150ff581c076eef5651; lean 815fc01fec5f51af99003faa686f25330e7c33ad

6 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 6 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/config.js | `(edit 8614ade26f35)` (86-86) | **ASK** | artifact:config |  |  | config |
| lib/config.js | `(edit 9eacab1028d4)` (86-86) | **ASK** | artifact:config |  |  | config |
| lib/config.js | `(edit 761fecc91cb8)` (87-87) | **ASK** | artifact:config |  |  | config |
| lib/config.js | `(edit 6b6ff218d362)` (88-88) | **ASK** | artifact:config |  |  | config |
| lib/config.js | `(edit f128f17977a5)` (89-89) | **ASK** | artifact:config |  |  | config |
| lib/config.js | `(edit 648565d04fb8)` (90-90) | **ASK** | artifact:config |  |  | config |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 6 = 0 unit + 6 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 8614ade26f3535859c4c6ff15a0f56f24b4b35c8e6c573b81ca687361217d447 | lib/config.js | text | 86+1 | 86+0 | artifact: config | old:loadConfig |
| 9eacab1028d4c53e1f4ed6f5e033c5b9a9c07ecfe82cd620654444ce1f390a6b | lib/config.js | text | 86+0 | 86+1 | artifact: config | new:loadConfig |
| 761fecc91cb8aa37d716a5d4d65d30c2cf2e011f11258c112737161addb92c36 | lib/config.js | text | 86+0 | 87+1 | artifact: config | new:loadConfig |
| 6b6ff218d362d495733cd64a30c9339ab2c16e6d18835a2360b8f4badd23a9cd | lib/config.js | text | 86+0 | 88+1 | artifact: config | new:loadConfig |
| f128f17977a5e2958604f5d019b8c88e589578d5dca7d0f110e361a6a8dcc7e2 | lib/config.js | text | 86+0 | 89+1 | artifact: config | new:loadConfig |
| 648565d04fb8eabe4d72f5f3e200dc52a85e896650c135a93f27d3d9a317cf7a | lib/config.js | text | 86+0 | 90+1 | artifact: config | new:loadConfig |

config: {"unit":[],"artifact":["8614ade26f3535859c4c6ff15a0f56f24b4b35c8e6c573b81ca687361217d447","9eacab1028d4c53e1f4ed6f5e033c5b9a9c07ecfe82cd620654444ce1f390a6b","761fecc91cb8aa37d716a5d4d65d30c2cf2e011f11258c112737161addb92c36","6b6ff218d362d495733cd64a30c9339ab2c16e6d18835a2360b8f4badd23a9cd","f128f17977a5e2958604f5d019b8c88e589578d5dca7d0f110e361a6a8dcc7e2","648565d04fb8eabe4d72f5f3e200dc52a85e896650c135a93f27d3d9a317cf7a"],"unassigned":[]}

Task reconciliation: expected 6; terminal 6; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__201/run-eOdWsN/terminal.json