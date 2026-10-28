# lean report: 21be3668bb6bd041c3c736dbb4c4d3f48a504276 → e13ccea9404f1dea8399640ee27052373f035f80

Identity: 23d3a6c2db206b777e9ed4bb6252112797dc8a36349ac391472e835f73b540f4; lean 815fc01fec5f51af99003faa686f25330e7c33ad

6 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 6 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/quotes.js | `(edit 3fbd576dbbc4)` (260-260) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/quotes.js | `(edit c518f2c0bb66)` (260-260) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/quotes.js | `(edit 840f42dcb46c)` (261-261) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/quotes.js | `(edit c8f3c8c7268b)` (262-262) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/quotes.js | `(edit c94594a7f55f)` (263-263) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/quotes.js | `(edit 36d9473933e6)` (264-264) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 6 = 0 unit + 0 artifact + 6 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 3fbd576dbbc4806870624d7645c2533d7ff14d152d9c39cf14547fbb1b92d59a | lib/rules/quotes.js | text | 260+1 | 260+0 | unassigned: object-literal member |  |
| c518f2c0bb6620ac5b066f6575385ce06ba127dd5179223b5f841ceecb0f937d | lib/rules/quotes.js | text | 260+0 | 260+1 | unassigned: object-literal member |  |
| 840f42dcb46cad06a363df0f0076d21c79db78d0997b8ba90739f5bda920dfdc | lib/rules/quotes.js | text | 260+0 | 261+1 | unassigned: object-literal member |  |
| c8f3c8c7268b6401532d0eb044f7ee31c6348a8b080242b4442bad9332eeeb90 | lib/rules/quotes.js | text | 260+0 | 262+1 | unassigned: object-literal member |  |
| c94594a7f55ff6cfe65f897f9eaad645d6fc6a5db87df3696025488f552c895d | lib/rules/quotes.js | text | 260+0 | 263+1 | unassigned: object-literal member |  |
| 36d9473933e6e1d549de854f37e60473933dc8e916a6034da64d87cf3de916dd | lib/rules/quotes.js | text | 260+0 | 264+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["3fbd576dbbc4806870624d7645c2533d7ff14d152d9c39cf14547fbb1b92d59a","c518f2c0bb6620ac5b066f6575385ce06ba127dd5179223b5f841ceecb0f937d","840f42dcb46cad06a363df0f0076d21c79db78d0997b8ba90739f5bda920dfdc","c8f3c8c7268b6401532d0eb044f7ee31c6348a8b080242b4442bad9332eeeb90","c94594a7f55ff6cfe65f897f9eaad645d6fc6a5db87df3696025488f552c895d","36d9473933e6e1d549de854f37e60473933dc8e916a6034da64d87cf3de916dd"]}

Task reconciliation: expected 6; terminal 6; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__279/run-kud7zD/terminal.json