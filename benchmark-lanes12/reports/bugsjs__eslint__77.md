# lean report: f90462efe568d83f3bf66544c06dd0529c80b49c → 0b4282e55e66ef126ae1e3e4edbcade03d6d8a33

Identity: c1dc64df0cf7532f25ebfcf73dd0b9d46dab5bb100649d246635b223795a82c0; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 4 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/prefer-destructuring.js | `(edit 6bd249937821)` (161-161) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/prefer-destructuring.js | `(edit d4f14b959228)` (161-161) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/prefer-destructuring.js | `(edit d2a5d40c8e00)` (162-162) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/prefer-destructuring.js | `(edit dc58a1b69d86)` (163-163) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 0 unit + 0 artifact + 4 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 6bd249937821a5f362593540319a604aff1135224e041cd4c1e1ca084ad91e79 | lib/rules/prefer-destructuring.js | text | 161+1 | 161+0 | unassigned: object-literal member |  |
| d4f14b959228af84b59a7b36e4fbffcb51bc8f5853931a2272a9ddb35ec195d9 | lib/rules/prefer-destructuring.js | text | 161+0 | 161+1 | unassigned: object-literal member |  |
| d2a5d40c8e0055f1d5cbf24b1ba1d108cb773aa825816670f1301122944bb28d | lib/rules/prefer-destructuring.js | text | 161+0 | 162+1 | unassigned: object-literal member |  |
| dc58a1b69d8682c7dd22821397c6e12f688d435518f9b727bcba933470ba0568 | lib/rules/prefer-destructuring.js | text | 161+0 | 163+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["6bd249937821a5f362593540319a604aff1135224e041cd4c1e1ca084ad91e79","d4f14b959228af84b59a7b36e4fbffcb51bc8f5853931a2272a9ddb35ec195d9","d2a5d40c8e0055f1d5cbf24b1ba1d108cb773aa825816670f1301122944bb28d","dc58a1b69d8682c7dd22821397c6e12f688d435518f9b727bcba933470ba0568"]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__77/run-OUFas9/terminal.json