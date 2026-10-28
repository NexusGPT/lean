# lean report: 0a7936dc1b4bc0a01a654b2eaa7d788c367f5a05 → 4433acd118ec3c90268b6f104bba1ae4ec64e957

Identity: f108fd6f35b19d0fbfecb08adc310d513d999278f8469e11802a7c21173c9d12; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 4 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-useless-rename.js | `(edit 340a70cc1d1c)` (87-87) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-rename.js | `(edit 63abba8a9eec)` (87-87) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-rename.js | `(edit c0c2b1029ff3)` (97-97) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-rename.js | `(edit 3c79d236fe65)` (97-97) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 0 unit + 0 artifact + 4 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 340a70cc1d1c2dd37d3890df30bad64a44a77a72e1f5dc1b11e17b4e4b265195 | lib/rules/no-useless-rename.js | text | 87+1 | 87+0 | unassigned: object-literal member |  |
| 63abba8a9eec064562bb878faf5b15103a789a5cbf6dca0599680281bed9ee73 | lib/rules/no-useless-rename.js | text | 87+0 | 87+1 | unassigned: object-literal member |  |
| c0c2b1029ff35e3fb30d7bdbad6296aa495b622c64a77582eb67fae6d54800a3 | lib/rules/no-useless-rename.js | text | 97+1 | 97+0 | unassigned: object-literal member |  |
| 3c79d236fe65896f584b346acab4c47fe1875ae5a81cf2b675294cecda30c4c6 | lib/rules/no-useless-rename.js | text | 97+0 | 97+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["340a70cc1d1c2dd37d3890df30bad64a44a77a72e1f5dc1b11e17b4e4b265195","63abba8a9eec064562bb878faf5b15103a789a5cbf6dca0599680281bed9ee73","c0c2b1029ff35e3fb30d7bdbad6296aa495b622c64a77582eb67fae6d54800a3","3c79d236fe65896f584b346acab4c47fe1875ae5a81cf2b675294cecda30c4c6"]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__27/run-x6CU6G/terminal.json