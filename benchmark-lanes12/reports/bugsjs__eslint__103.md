# lean report: c147b97729313f7021c84cbc91c2d83a8f17e7f3 → 0dbf54e385dfd334c495a26830107b2726c43053

Identity: d835776541d5037181d10dfc7837c2cfec5c8368e03e67261ce1425512463e68; lean 815fc01fec5f51af99003faa686f25330e7c33ad

10 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 10 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/indent.js | `(edit 461c1f887394)` (805-805) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 43a6484fb038)` (806-806) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/indent.js | `(edit f9e02e67f228)` (807-807) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/indent.js | `(edit 9a33058963ae)` (808-808) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 67d6ca5b9605)` (809-809) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 64f3b5d9a9cb)` (811-811) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/indent.js | `(edit 5892c33c8f83)` (808-808) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 834ca507beac)` (814-814) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/indent.js | `(edit 261187c6d3d8)` (815-815) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/indent.js | `(edit efdb177a720f)` (816-816) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 10 = 0 unit + 0 artifact + 10 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 461c1f887394178e829f9894107dee6a13c2e7f8700066fb335ebaf1b1aee297 | lib/rules/indent.js | text | 804+0 | 805+1 | unassigned: object-literal member |  |
| 43a6484fb038bdff8d65c85e20e29c9a161ed350481ca03a827735e4b9bea592 | lib/rules/indent.js | text | 804+0 | 806+1 | unassigned: whitespace |  |
| f9e02e67f2289748ca860de47cb5a3469c4e9b52e6d75f04562896254ceb0afb | lib/rules/indent.js | text | 804+0 | 807+1 | unassigned: comment |  |
| 9a33058963aeeab94d1cbc67a93242efad15ef875829638d7b04c7751dc6d67e | lib/rules/indent.js | text | 804+0 | 808+1 | unassigned: object-literal member |  |
| 67d6ca5b960513af990eb5a6bed4695acf0fcd3d773762935a901871a229982f | lib/rules/indent.js | text | 804+0 | 809+1 | unassigned: object-literal member |  |
| 64f3b5d9a9cbd75783ffda47c5225bdddce4ae35dd1918ef6ffe85f8115d03b2 | lib/rules/indent.js | text | 805+0 | 811+1 | unassigned: whitespace |  |
| 5892c33c8f8336522a2ecf3652d9d8c27fbcad3552f80e3d88fe0cc63f3a99fa | lib/rules/indent.js | text | 808+1 | 814+0 | unassigned: object-literal member |  |
| 834ca507beac3db80663a37ac9ead2b78250cf777ea897a0b3cced670a18dc8f | lib/rules/indent.js | text | 808+0 | 814+1 | unassigned: whitespace |  |
| 261187c6d3d81129299052ad6c5cc9d1702d989c931ba44fb07688b43e6edea3 | lib/rules/indent.js | text | 808+0 | 815+1 | unassigned: comment |  |
| efdb177a720f8003da1fe4dbd01d8714edfebcd179292aae3e1a66768b47f1f4 | lib/rules/indent.js | text | 808+0 | 816+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["461c1f887394178e829f9894107dee6a13c2e7f8700066fb335ebaf1b1aee297","43a6484fb038bdff8d65c85e20e29c9a161ed350481ca03a827735e4b9bea592","f9e02e67f2289748ca860de47cb5a3469c4e9b52e6d75f04562896254ceb0afb","9a33058963aeeab94d1cbc67a93242efad15ef875829638d7b04c7751dc6d67e","67d6ca5b960513af990eb5a6bed4695acf0fcd3d773762935a901871a229982f","64f3b5d9a9cbd75783ffda47c5225bdddce4ae35dd1918ef6ffe85f8115d03b2","5892c33c8f8336522a2ecf3652d9d8c27fbcad3552f80e3d88fe0cc63f3a99fa","834ca507beac3db80663a37ac9ead2b78250cf777ea897a0b3cced670a18dc8f","261187c6d3d81129299052ad6c5cc9d1702d989c931ba44fb07688b43e6edea3","efdb177a720f8003da1fe4dbd01d8714edfebcd179292aae3e1a66768b47f1f4"]}

Task reconciliation: expected 10; terminal 10; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__103/run-P30Ma2/terminal.json