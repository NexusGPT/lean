# lean report: 92171ccc8f06cd26aa75c9510af3c1605629c7b2 → 9b143b8a0dcb036cce127289997c5e4cbda8767c

Identity: 6e9d7f9a1f852c5bfd8e464789eed5062acbfb406cbd564ac83ab34e83167e80; lean 815fc01fec5f51af99003faa686f25330e7c33ad

3 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 3 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/space-in-parens.js | `(edit c11c30607c9a)` (48-48) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/space-in-parens.js | `(edit 3ce324ce375f)` (49-49) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/space-in-parens.js | `(edit 4ab2e6603248)` (48-48) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 3 = 0 unit + 0 artifact + 3 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| c11c30607c9a8ac91ec8e25000a4bff6a5b7b687eb699ebb4496d1ddcafc8960 | lib/rules/space-in-parens.js | text | 48+1 | 48+0 | unassigned: whitespace |  |
| 3ce324ce375f01bdbd6bd1a12e30257665d77132ec43e250d77228b7204cac1f | lib/rules/space-in-parens.js | text | 49+1 | 48+0 | unassigned: object-literal member |  |
| 4ab2e6603248180ad59690d7e09e5c513aeadb5db0a2997b37ae64cd50b13b85 | lib/rules/space-in-parens.js | text | 48+0 | 48+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["c11c30607c9a8ac91ec8e25000a4bff6a5b7b687eb699ebb4496d1ddcafc8960","3ce324ce375f01bdbd6bd1a12e30257665d77132ec43e250d77228b7204cac1f","4ab2e6603248180ad59690d7e09e5c513aeadb5db0a2997b37ae64cd50b13b85"]}

Task reconciliation: expected 3; terminal 3; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__290/run-GlLddX/terminal.json