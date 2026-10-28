# lean report: e6004be5446e42aebb20cfe52ff19de798c44b7e → bc084a6191715f7fc647a79d47bfb3b7677fde18

Identity: 996dafa654b46b149ced43b46cad6e92abfb65f28a0be632b983265035bd92c8; lean 815fc01fec5f51af99003faa686f25330e7c33ad

7 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 7 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/cli-engine.js | `(edit edb09f257e6f)` (745-745) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/cli-engine.js | `(edit f2c7f83e6897)` (746-746) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/cli-engine.js | `(edit 258316dad508)` (745-745) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/cli-engine.js | `(edit f78ab79e037a)` (746-746) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/cli-engine.js | `(edit e4425b39faad)` (747-747) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/cli-engine.js | `(edit 45f2e95465ef)` (748-748) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/cli-engine.js | `(edit 3dbfa0e00db7)` (749-749) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 7 = 0 unit + 0 artifact + 7 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| edb09f257e6fa3d977a484fd019b3457f39b6f4c51532f28f1ba16e440fb6128 | lib/cli-engine.js | text | 745+1 | 745+0 | unassigned: object-literal member |  |
| f2c7f83e6897469a6894f59dcd7b19a9bf763903c71f4cbc91d3cfab8d3b4ea0 | lib/cli-engine.js | text | 746+1 | 745+0 | unassigned: object-literal member |  |
| 258316dad50862318bd45d25a219cac4b811516fe570aab5903f92f86c4ce9db | lib/cli-engine.js | text | 745+0 | 745+1 | unassigned: whitespace |  |
| f78ab79e037aef59c2ac03a0f20d3b11317feaae92df874f1fe5145c315d4902 | lib/cli-engine.js | text | 745+0 | 746+1 | unassigned: object-literal member |  |
| e4425b39faaddda6da6bd37edfc25776a928686714e9b1189b4493466057145e | lib/cli-engine.js | text | 745+0 | 747+1 | unassigned: object-literal member |  |
| 45f2e95465efd76da33a9917759321307f0ec9197bce67e2627f102e03a724ff | lib/cli-engine.js | text | 745+0 | 748+1 | unassigned: object-literal member |  |
| 3dbfa0e00db7b4e9397d95eff2ed12b2715dce3ac86f80638579608f14fa8e48 | lib/cli-engine.js | text | 745+0 | 749+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["edb09f257e6fa3d977a484fd019b3457f39b6f4c51532f28f1ba16e440fb6128","f2c7f83e6897469a6894f59dcd7b19a9bf763903c71f4cbc91d3cfab8d3b4ea0","258316dad50862318bd45d25a219cac4b811516fe570aab5903f92f86c4ce9db","f78ab79e037aef59c2ac03a0f20d3b11317feaae92df874f1fe5145c315d4902","e4425b39faaddda6da6bd37edfc25776a928686714e9b1189b4493466057145e","45f2e95465efd76da33a9917759321307f0ec9197bce67e2627f102e03a724ff","3dbfa0e00db7b4e9397d95eff2ed12b2715dce3ac86f80638579608f14fa8e48"]}

Task reconciliation: expected 7; terminal 7; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__233/run-teHBgV/terminal.json