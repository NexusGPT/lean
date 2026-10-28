# lean report: 5003b1cf6f37c1a89e8dedf446576ab892579173 → 24d3d1c7bd567d99c20826e3719522302fa12d0f

Identity: f1a842fb5b9c7ea3d39a07ecb63961e54138bc5bc118733969d14c8ecec0242f; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 4 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/curly.js | `(edit 76cc93762472)` (293-293) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/curly.js | `(edit 363e30b62029)` (293-293) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/curly.js | `(edit 890144ff5b50)` (294-294) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/curly.js | `(edit abe12673577e)` (295-295) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 0 unit + 0 artifact + 4 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 76cc937624721c0494d646218ee1aad058fc5771a5edec202df34f566b3f0a18 | lib/rules/curly.js | text | 293+1 | 293+0 | unassigned: object-literal member |  |
| 363e30b62029634656277b2777d3125b11ebccf4c88090dc5297687fd6ad3491 | lib/rules/curly.js | text | 293+0 | 293+1 | unassigned: object-literal member |  |
| 890144ff5b500918656c5dbb35e1edd34ff2154770ef94d92a8271e889443cc9 | lib/rules/curly.js | text | 293+0 | 294+1 | unassigned: whitespace |  |
| abe12673577e992f913ea873d6900d17e63ff0f8aff5625b34088c7f6ccc261c | lib/rules/curly.js | text | 293+0 | 295+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["76cc937624721c0494d646218ee1aad058fc5771a5edec202df34f566b3f0a18","363e30b62029634656277b2777d3125b11ebccf4c88090dc5297687fd6ad3491","890144ff5b500918656c5dbb35e1edd34ff2154770ef94d92a8271e889443cc9","abe12673577e992f913ea873d6900d17e63ff0f8aff5625b34088c7f6ccc261c"]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__11/run-7PIX0s/terminal.json