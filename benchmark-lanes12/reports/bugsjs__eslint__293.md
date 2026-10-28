# lean report: 973adeb6e77cfb954bfb73f6bce9909b7c873502 → 834f401cfa3b04a5633622d75f0d7cfb6b377f0e

Identity: a0e5110d765d2bc8d715f9e446c6e5b28b111a61902c047ab6409267fc0726d1; lean 815fc01fec5f51af99003faa686f25330e7c33ad

7 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 7 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/indent.js | `(edit e00ecdae9d5f)` (701-701) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/indent.js | `(edit b28ce276c607)` (702-702) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 406182f7426c)` (703-703) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/indent.js | `(edit d47b057a8926)` (704-704) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/indent.js | `(edit fe0b9d7bc0e4)` (705-705) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 4d0d56cd5976)` (706-706) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 1996af3343cb)` (707-707) | **ASK** | unassigned:whitespace |  |  | whitespace |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 7 = 0 unit + 0 artifact + 7 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| e00ecdae9d5f8c2773904fd2ce0054f075a006ca5403ec667fe177f399975280 | lib/rules/indent.js | text | 700+0 | 701+1 | unassigned: whitespace |  |
| b28ce276c607805f6bd268280291dab4d9ccd56403defbc20d36249c17d31121 | lib/rules/indent.js | text | 700+0 | 702+1 | unassigned: object-literal member |  |
| 406182f7426cba97a3d41b05335d284675e8abbc2a2a7d0244064c69e026ede2 | lib/rules/indent.js | text | 700+0 | 703+1 | unassigned: whitespace |  |
| d47b057a8926f372ad52b57e5a0fdd3e253d3065989276f328c29335f960326e | lib/rules/indent.js | text | 700+0 | 704+1 | unassigned: comment |  |
| fe0b9d7bc0e4759c8795afa3a80bdd6c19ed33e2f425ab15d9d3d26713d125f4 | lib/rules/indent.js | text | 700+0 | 705+1 | unassigned: object-literal member |  |
| 4d0d56cd59762015675d2a99e3ef92b9cd97e66171f8208f2e2fb66dd09ce99b | lib/rules/indent.js | text | 700+0 | 706+1 | unassigned: object-literal member |  |
| 1996af3343cb67c731e3a65c615ab9d0a06e4417e2e5c9bce7118e814bd9045a | lib/rules/indent.js | text | 700+0 | 707+1 | unassigned: whitespace |  |

source: {"unit":[],"artifact":[],"unassigned":["e00ecdae9d5f8c2773904fd2ce0054f075a006ca5403ec667fe177f399975280","b28ce276c607805f6bd268280291dab4d9ccd56403defbc20d36249c17d31121","406182f7426cba97a3d41b05335d284675e8abbc2a2a7d0244064c69e026ede2","d47b057a8926f372ad52b57e5a0fdd3e253d3065989276f328c29335f960326e","fe0b9d7bc0e4759c8795afa3a80bdd6c19ed33e2f425ab15d9d3d26713d125f4","4d0d56cd59762015675d2a99e3ef92b9cd97e66171f8208f2e2fb66dd09ce99b","1996af3343cb67c731e3a65c615ab9d0a06e4417e2e5c9bce7118e814bd9045a"]}

Task reconciliation: expected 7; terminal 7; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__293/run-qkopth/terminal.json