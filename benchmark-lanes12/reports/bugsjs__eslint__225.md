# lean report: 51c8cf057a56f87d0b6416006da672ea8cb48315 → 69ccd1641f7b666a3bc07585a72ff76fef791498

Identity: 3a7e9ddf6e7d5ebac278bfe2108c8e0aa723ef1c3590ba3bd727c08fdf09b2a8; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 4 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/config/config-validator.js | `(edit c79b2618504c)` (92-92) | **ASK** | artifact:config |  |  | config |
| lib/config/config-validator.js | `(edit 26d36099549b)` (92-92) | **ASK** | artifact:config |  |  | config |
| lib/config/config-validator.js | `(edit e1edfbeb69b9)` (93-93) | **ASK** | artifact:config |  |  | config |
| lib/config/config-validator.js | `(edit 1fe05bc0bfc9)` (94-94) | **ASK** | artifact:config |  |  | config |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 0 unit + 4 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| c79b2618504cc01af03ef8e73e7605ddd76259e692a625495480f2e3aaa7d1f9 | lib/config/config-validator.js | text | 92+1 | 92+0 | artifact: config | old:validateRuleSchema |
| 26d36099549b472eca89b78dadc43612cd853283ba9aaf68b6f9081f84aa487f | lib/config/config-validator.js | text | 92+0 | 92+1 | artifact: config | new:validateRuleSchema |
| e1edfbeb69b9cd2097e6053ca87debd0eb713fa0cdafce406a705e9a732648ad | lib/config/config-validator.js | text | 92+0 | 93+1 | artifact: config | new:validateRuleSchema |
| 1fe05bc0bfc9d7e291778201a2236e7977f4c5079f11abf8de2fd9d7da731adc | lib/config/config-validator.js | text | 92+0 | 94+1 | artifact: config | new:validateRuleSchema |

config: {"unit":[],"artifact":["c79b2618504cc01af03ef8e73e7605ddd76259e692a625495480f2e3aaa7d1f9","26d36099549b472eca89b78dadc43612cd853283ba9aaf68b6f9081f84aa487f","e1edfbeb69b9cd2097e6053ca87debd0eb713fa0cdafce406a705e9a732648ad","1fe05bc0bfc9d7e291778201a2236e7977f4c5079f11abf8de2fd9d7da731adc"],"unassigned":[]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__225/run-xFDEXo/terminal.json