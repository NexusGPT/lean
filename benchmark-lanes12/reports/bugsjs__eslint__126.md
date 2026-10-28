# lean report: f71937af3046584fdec8cc928ed222e1f0b8f11d → a257b3eb4c49e9278dcc4dd6610b0057cc542282

Identity: e9c299d18cb9191cac18ffe1a2310a8eaf94afda4d14d5a6b4462d74d77d07f9; lean 815fc01fec5f51af99003faa686f25330e7c33ad

6 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 6 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/valid-typeof.js | `(edit b6748821dcfe)` (61-61) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/valid-typeof.js | `(edit 553d244f4f6f)` (62-62) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/valid-typeof.js | `(edit 9b75b65b2829)` (61-61) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/valid-typeof.js | `(edit 3319f43c504a)` (62-62) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/valid-typeof.js | `(edit c03287b6ce20)` (63-63) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/valid-typeof.js | `(edit 8feb5c179a8b)` (64-64) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 6 = 0 unit + 0 artifact + 6 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| b6748821dcfebe75833c3e01855a95fa3f990a98d5c711b21b5de74db9495af1 | lib/rules/valid-typeof.js | text | 61+1 | 61+0 | unassigned: object-literal member |  |
| 553d244f4f6fc881f862be284c10f045e40ed927095866c2c969a77ec4770ab4 | lib/rules/valid-typeof.js | text | 62+1 | 61+0 | unassigned: object-literal member |  |
| 9b75b65b28298174715a5f4999dcb7ec5d8e496481560bb14229caa2400ff9e5 | lib/rules/valid-typeof.js | text | 61+0 | 61+1 | unassigned: object-literal member |  |
| 3319f43c504a8e23a2d50701278fbccb67a81100afab1ad738a01e02bd6eccb9 | lib/rules/valid-typeof.js | text | 61+0 | 62+1 | unassigned: object-literal member |  |
| c03287b6ce202c26c163dc16205062538bc05a0a2f9ad6894cfc43276d753123 | lib/rules/valid-typeof.js | text | 61+0 | 63+1 | unassigned: whitespace |  |
| 8feb5c179a8bd2687b3e236f73789e6a19ca334792002c940545096ef0dd59ed | lib/rules/valid-typeof.js | text | 61+0 | 64+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["b6748821dcfebe75833c3e01855a95fa3f990a98d5c711b21b5de74db9495af1","553d244f4f6fc881f862be284c10f045e40ed927095866c2c969a77ec4770ab4","9b75b65b28298174715a5f4999dcb7ec5d8e496481560bb14229caa2400ff9e5","3319f43c504a8e23a2d50701278fbccb67a81100afab1ad738a01e02bd6eccb9","c03287b6ce202c26c163dc16205062538bc05a0a2f9ad6894cfc43276d753123","8feb5c179a8bd2687b3e236f73789e6a19ca334792002c940545096ef0dd59ed"]}

Task reconciliation: expected 6; terminal 6; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__126/run-sua3bN/terminal.json