# lean report: e8159b4b86080d39157102766c6cfe955add83ff → 80d89cdb9c16511231615c209e800d3042a94859

Identity: 6785436154cc8aa94aecf25f94a2321121573eee2b25098f9262e0d1d266d842; lean 815fc01fec5f51af99003faa686f25330e7c33ad

5 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 5 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/camelcase.js | `(edit 6b9cbeaa4a69)` (41-41) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/camelcase.js | `(edit 1c42773e9374)` (121-121) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/camelcase.js | `(edit 8b28755def33)` (122-122) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/camelcase.js | `(edit 5e3cfe5bd90e)` (134-134) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/camelcase.js | `(edit d7f0c0a502f4)` (135-135) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 5 = 0 unit + 0 artifact + 5 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 6b9cbeaa4a69abbb2233d86b1f0eadd40056460bc5f1020fc083805218d5fd63 | lib/rules/camelcase.js | text | 40+0 | 41+1 | unassigned: object-literal member |  |
| 1c42773e93746705e461b6a44dd55035119c34f683eeba1dc7379074080edf19 | lib/rules/camelcase.js | text | 121+1 | 122+0 | unassigned: object-literal member |  |
| 8b28755def339ad9e67338203379f0ea42609787f7230631e3bcf347229f1421 | lib/rules/camelcase.js | text | 121+0 | 122+1 | unassigned: object-literal member |  |
| 5e3cfe5bd90e1e35d14923071d9a36d33aa6f1b5646d85879d51737eeb88907d | lib/rules/camelcase.js | text | 134+1 | 135+0 | unassigned: object-literal member |  |
| d7f0c0a502f438b3cda4882d6d0d9013a12188d363df539ed2334d3f3ac47023 | lib/rules/camelcase.js | text | 134+0 | 135+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["6b9cbeaa4a69abbb2233d86b1f0eadd40056460bc5f1020fc083805218d5fd63","1c42773e93746705e461b6a44dd55035119c34f683eeba1dc7379074080edf19","8b28755def339ad9e67338203379f0ea42609787f7230631e3bcf347229f1421","5e3cfe5bd90e1e35d14923071d9a36d33aa6f1b5646d85879d51737eeb88907d","d7f0c0a502f438b3cda4882d6d0d9013a12188d363df539ed2334d3f3ac47023"]}

Task reconciliation: expected 5; terminal 5; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__168/run-Ecj8iQ/terminal.json