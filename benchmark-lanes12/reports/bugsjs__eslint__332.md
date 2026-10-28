# lean report: c5066cee21e6a091ba40da11199efba0d7bb3e5d → 629c42f453fa885154dec033f14caaa2434dec2d

Identity: a0beea8ec82da9af20be509e047870057ceacfc9906282b79e8c908dc58806cf; lean 815fc01fec5f51af99003faa686f25330e7c33ad

1 changed function(s): **0 in scope · 1 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/operator-assignment.js | `isNonCommutativeOperatorWithShorthand` (29-31) | **WITNESS** | checked | WITNESS |  | input 19: outcome; lib/rules/operator-assignment.js:30 |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 2 = 2 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| b18c9e6b868809d763c4541b5c2ab77bbccc30ff50808793116da371643b605d | lib/rules/operator-assignment.js | text | 30+1 | 30+0 | unit: isNonCommutativeOperatorWithShorthand | old:isNonCommutativeOperatorWithShorthand |
| c870b513b9cee5ba74b9da2840cc11104587b07276442b24eca7f48e7e006c1f | lib/rules/operator-assignment.js | text | 30+0 | 30+1 | unit: isNonCommutativeOperatorWithShorthand | new:isNonCommutativeOperatorWithShorthand |

source: {"unit":["b18c9e6b868809d763c4541b5c2ab77bbccc30ff50808793116da371643b605d","c870b513b9cee5ba74b9da2840cc11104587b07276442b24eca7f48e7e006c1f"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 1; terminal 1; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__332/run-ij5y5o/terminal.json