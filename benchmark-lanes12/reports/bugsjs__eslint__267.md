# lean report: 705d88f7fd3f7dd525e31ddbab35b6ab45e43d6f → 5f875c26a7d745518b626f398f991173463d118e

Identity: 4337773bc7474368764e1b2795d28daee738bf9a141d1042e7b7492d8f6b1b0c; lean 815fc01fec5f51af99003faa686f25330e7c33ad

2 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 2 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/config/config-ops.js | `(edit 2771e50a428d)` (178-178) | **ASK** | artifact:config |  |  | config |
| lib/config/config-ops.js | `(edit 20acf4ccd36c)` (178-178) | **ASK** | artifact:config |  |  | config |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 2 = 0 unit + 2 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 2771e50a428dc5234208dc4d1d36aa5832f3c25e284dbed0ac9f96c5e6b3fe04 | lib/config/config-ops.js | text | 178+1 | 178+0 | artifact: config |  |
| 20acf4ccd36c70430f9807ff171e5db85862ffcac6c255ba9b3b9d150237a836 | lib/config/config-ops.js | text | 178+0 | 178+1 | artifact: config |  |

config: {"unit":[],"artifact":["2771e50a428dc5234208dc4d1d36aa5832f3c25e284dbed0ac9f96c5e6b3fe04","20acf4ccd36c70430f9807ff171e5db85862ffcac6c255ba9b3b9d150237a836"],"unassigned":[]}

Task reconciliation: expected 2; terminal 2; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__267/run-1lhmzw/terminal.json