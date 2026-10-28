# lean report: e51d864f0e4f620e1c0afdaee31902fae60a1476 → 93fa6be44969b58643d4b22fc3443987fc9e0f4c

Identity: d2d9d17c58e6f05bb3a7107178d4857ce40ccc3e3b7c5f65a238f71a4c2d0b9a; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 4 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-shadow.js | `(edit d0ab0aa1b8c6)` (42-42) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/no-shadow.js | `(edit 0722397e6fc2)` (43-43) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/rules/no-shadow.js | `(edit bba45ce29a25)` (42-42) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/no-shadow.js | `(edit dda9e157a688)` (43-43) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 0 unit + 0 artifact + 4 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| d0ab0aa1b8c663b6f387a6c3d735136bbe80e0860385db6545f112c5efe9788a | lib/rules/no-shadow.js | text | 42+1 | 42+0 | unassigned: comment |  |
| 0722397e6fc21d040e8ce9c2eb2277471dd15e301f6822b3b7e736dd355e4079 | lib/rules/no-shadow.js | text | 43+1 | 42+0 | unassigned: exported property assignment |  |
| bba45ce29a25d99bf23339aacb53bc3a00df36db7bdad995e557e8fa5ce51df1 | lib/rules/no-shadow.js | text | 42+0 | 42+1 | unassigned: comment |  |
| dda9e157a6886a4c08a08826915b6b4bece3bb72f1cb9b302e2a1c3fadbbbc65 | lib/rules/no-shadow.js | text | 42+0 | 43+1 | unassigned: exported property assignment |  |

source: {"unit":[],"artifact":[],"unassigned":["d0ab0aa1b8c663b6f387a6c3d735136bbe80e0860385db6545f112c5efe9788a","0722397e6fc21d040e8ce9c2eb2277471dd15e301f6822b3b7e736dd355e4079","bba45ce29a25d99bf23339aacb53bc3a00df36db7bdad995e557e8fa5ce51df1","dda9e157a6886a4c08a08826915b6b4bece3bb72f1cb9b302e2a1c3fadbbbc65"]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__214/run-xbAlsw/terminal.json