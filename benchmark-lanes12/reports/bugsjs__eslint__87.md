# lean report: 3c9ce093b94dbcb04d4395c33983d4cb3b0764ac → c6bbfb6e92f4b146f23a68e2480d22a5b0e3e2f4

Identity: 36c96695bd111ff6c8e3cd1ac9121cf73cd5c570797eb6a9689fff0fd15aa080; lean 815fc01fec5f51af99003faa686f25330e7c33ad

5 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 5 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/config/config-file.js | `(edit eaca3d2114a0)` (498-498) | **ASK** | artifact:config |  |  | config |
| lib/config/config-file.js | `(edit 9e53b266ed91)` (517-517) | **ASK** | artifact:config |  |  | config |
| lib/config/config-file.js | `(edit f8cf9178448a)` (516-516) | **ASK** | artifact:config |  |  | config |
| lib/config/config-file.js | `(edit a2ca63bcec8f)` (531-531) | **ASK** | artifact:config |  |  | config |
| lib/config/config-file.js | `(edit 4a5b284e6288)` (530-530) | **ASK** | artifact:config |  |  | config |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 5 = 0 unit + 5 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| eaca3d2114a03a82d646109e390ebf873d2e4467c93c9995f0e5c6cbafba6cdc | lib/config/config-file.js | text | 498+1 | 497+0 | artifact: config | old:load |
| 9e53b266ed916d072ce271eb2dd646ad9d74414c820009f31185b1950f5bc11a | lib/config/config-file.js | text | 517+1 | 516+0 | artifact: config | old:load |
| f8cf9178448a8fa1af70125e38d0f5c3b9694a6284292daeb704438af8ccec6b | lib/config/config-file.js | text | 517+0 | 516+1 | artifact: config | new:load |
| a2ca63bcec8f830a9e9725d6edd99d42a446e380e9754926bb2d631c8b2e5e6e | lib/config/config-file.js | text | 531+1 | 530+0 | artifact: config | old:load |
| 4a5b284e6288014cf0b482b1553bee8b50edccdb5f2e2fe72f46ea386e5ccf8c | lib/config/config-file.js | text | 531+0 | 530+1 | artifact: config | new:load |

config: {"unit":[],"artifact":["eaca3d2114a03a82d646109e390ebf873d2e4467c93c9995f0e5c6cbafba6cdc","9e53b266ed916d072ce271eb2dd646ad9d74414c820009f31185b1950f5bc11a","f8cf9178448a8fa1af70125e38d0f5c3b9694a6284292daeb704438af8ccec6b","a2ca63bcec8f830a9e9725d6edd99d42a446e380e9754926bb2d631c8b2e5e6e","4a5b284e6288014cf0b482b1553bee8b50edccdb5f2e2fe72f46ea386e5ccf8c"],"unassigned":[]}

Task reconciliation: expected 5; terminal 5; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__87/run-yJ7m7f/terminal.json