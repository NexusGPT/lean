# lean report: cd1b0574f1af79d189259f4e1a255230d24b37ee → d456ed94b29f794116c51de37faf44a2453ea1a8

Identity: 3b0c7d75eec527af47aa4cc8e686df55af66995bcbf661c9350a8215f1b70aad; lean 815fc01fec5f51af99003faa686f25330e7c33ad

3 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 3 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/object-shorthand.js | `(edit 2c5fdc11cf45)` (112-112) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/object-shorthand.js | `(edit 4969eddf44ad)` (112-112) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/object-shorthand.js | `(edit 692efa3351a0)` (139-139) | **ASK** | unassigned:whitespace |  |  | whitespace |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 3 = 0 unit + 0 artifact + 3 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 2c5fdc11cf45f939af0e480a1ff4f8e0298546b7572e3e421b07592c9ff0a2cb | lib/rules/object-shorthand.js | text | 112+1 | 112+0 | unassigned: object-literal member |  |
| 4969eddf44ad9e1dfbcdf7cbe55402afaedc87d43f7f1f29b0260c129385975c | lib/rules/object-shorthand.js | text | 112+0 | 112+1 | unassigned: object-literal member |  |
| 692efa3351a01627e0cb8274d9eed8b3b28f701e15d6ea5e922956e22f253202 | lib/rules/object-shorthand.js | text | 139+1 | 138+0 | unassigned: whitespace |  |

source: {"unit":[],"artifact":[],"unassigned":["2c5fdc11cf45f939af0e480a1ff4f8e0298546b7572e3e421b07592c9ff0a2cb","4969eddf44ad9e1dfbcdf7cbe55402afaedc87d43f7f1f29b0260c129385975c","692efa3351a01627e0cb8274d9eed8b3b28f701e15d6ea5e922956e22f253202"]}

Task reconciliation: expected 3; terminal 3; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__309/run-4itSae/terminal.json