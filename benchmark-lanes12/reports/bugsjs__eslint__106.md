# lean report: d90ca46b0645a592c748051a79da18c35ac71003 → c7c4b3997df618325304c5827942dae3293899b6

Identity: 02dbe10752f70270ef119c5bc125135473d1a345fedbc242f101c678008d931a; lean 815fc01fec5f51af99003faa686f25330e7c33ad

9 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 9 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/quotes.js | `(edit 747d4d93233b)` (271-271) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/quotes.js | `(edit df86386a9f86)` (272-272) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/quotes.js | `(edit eebd397e9302)` (273-273) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/quotes.js | `(edit df7c731d8fbd)` (274-274) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/quotes.js | `(edit 093695d725c7)` (275-275) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/quotes.js | `(edit 8f816df23990)` (276-276) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/quotes.js | `(edit adb43ea5ecd3)` (277-277) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/quotes.js | `(edit df3df1b6e3dc)` (278-278) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/quotes.js | `(edit 8cb7fe29ace4)` (279-279) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 9 = 0 unit + 0 artifact + 9 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 747d4d93233bb46e3679e0b0db4e2cd668e8b6f22d4d78eb39b26853655feda9 | lib/rules/quotes.js | text | 270+0 | 271+1 | unassigned: object-literal member |  |
| df86386a9f86b3eeea949add943ba2937bfc16ace009b208f48cfd7ebf236ca7 | lib/rules/quotes.js | text | 270+0 | 272+1 | unassigned: whitespace |  |
| eebd397e930286ff105729c10f23055f4529ef3a57d64a211c059025609cfbf1 | lib/rules/quotes.js | text | 270+0 | 273+1 | unassigned: comment |  |
| df7c731d8fbd4f3674e0fa3ef0d6f410e6a88ed7436c0e8e191ca796b5abc8ee | lib/rules/quotes.js | text | 270+0 | 274+1 | unassigned: object-literal member |  |
| 093695d725c785660b1e9ddfdaedc46365c5467ff925c921c01b1d91dcabe94e | lib/rules/quotes.js | text | 270+0 | 275+1 | unassigned: object-literal member |  |
| 8f816df2399000fdbe4dcb245e6670d8e5ad2619078086c897509e21de0c9644 | lib/rules/quotes.js | text | 270+0 | 276+1 | unassigned: object-literal member |  |
| adb43ea5ecd3485583906ebde53a13365522440bec48904cfbd9d740a566f560 | lib/rules/quotes.js | text | 270+0 | 277+1 | unassigned: object-literal member |  |
| df3df1b6e3dcd24f6ebdf76571daf109d4c0355dff8a87745d9aea6a32da5658 | lib/rules/quotes.js | text | 270+0 | 278+1 | unassigned: object-literal member |  |
| 8cb7fe29ace4ad34287c54eb21384f5da7d7440846dcd2449853eb759c32b0a8 | lib/rules/quotes.js | text | 270+0 | 279+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["747d4d93233bb46e3679e0b0db4e2cd668e8b6f22d4d78eb39b26853655feda9","df86386a9f86b3eeea949add943ba2937bfc16ace009b208f48cfd7ebf236ca7","eebd397e930286ff105729c10f23055f4529ef3a57d64a211c059025609cfbf1","df7c731d8fbd4f3674e0fa3ef0d6f410e6a88ed7436c0e8e191ca796b5abc8ee","093695d725c785660b1e9ddfdaedc46365c5467ff925c921c01b1d91dcabe94e","8f816df2399000fdbe4dcb245e6670d8e5ad2619078086c897509e21de0c9644","adb43ea5ecd3485583906ebde53a13365522440bec48904cfbd9d740a566f560","df3df1b6e3dcd24f6ebdf76571daf109d4c0355dff8a87745d9aea6a32da5658","8cb7fe29ace4ad34287c54eb21384f5da7d7440846dcd2449853eb759c32b0a8"]}

Task reconciliation: expected 9; terminal 9; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__106/run-nEhe74/terminal.json