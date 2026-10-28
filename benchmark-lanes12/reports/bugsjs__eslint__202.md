# lean report: 23b00e02b81fcc0f64dbba3b22384661bbd3d7b5 → c2cdb95f9a995c1974df81c12164277968327271

Identity: f6ad492cb7df119cbf8a794f811d418d291a4db229a715686a36d69abf56751c; lean 815fc01fec5f51af99003faa686f25330e7c33ad

8 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 8 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/config/autoconfig.js | `(edit 3d5a161118a1)` (313-313) | **ASK** | artifact:config |  |  | config |
| lib/config/autoconfig.js | `(edit 47a003854bd6)` (313-313) | **ASK** | artifact:config |  |  | config |
| lib/config/autoconfig.js | `(edit cbc3451e765a)` (314-314) | **ASK** | artifact:config |  |  | config |
| lib/config/autoconfig.js | `(edit d32e03a136d9)` (315-315) | **ASK** | artifact:config |  |  | config |
| lib/config/autoconfig.js | `(edit 141bee345b09)` (316-316) | **ASK** | artifact:config |  |  | config |
| lib/config/autoconfig.js | `(edit 1ab4e3d8073a)` (317-317) | **ASK** | artifact:config |  |  | config |
| lib/config/autoconfig.js | `(edit 215630b2648f)` (318-318) | **ASK** | artifact:config |  |  | config |
| lib/config/autoconfig.js | `(edit f0519eb4c7b0)` (319-319) | **ASK** | artifact:config |  |  | config |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 8 = 0 unit + 8 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 3d5a161118a142b3a778f32982eabbfbab452d97dcabd9c08d1f42aaa6d4e020 | lib/config/autoconfig.js | text | 313+1 | 313+0 | artifact: config |  |
| 47a003854bd6b58d6ffe6deb0bd6ee95ea6cefa8b972d29107beaa2eb4b4ae40 | lib/config/autoconfig.js | text | 313+0 | 313+1 | artifact: config |  |
| cbc3451e765aa4e1a18eb02fa051e57f837b38b09c1bab8cf2ee1525959ce994 | lib/config/autoconfig.js | text | 313+0 | 314+1 | artifact: config |  |
| d32e03a136d9106711894e5edebcfa798e2c37e3fb6b40622389305aa0395a6c | lib/config/autoconfig.js | text | 313+0 | 315+1 | artifact: config |  |
| 141bee345b0936ab203c9dffc50884eb836c61d6a09b3fdcbcfad32352924b4b | lib/config/autoconfig.js | text | 313+0 | 316+1 | artifact: config |  |
| 1ab4e3d8073a89c34374c75e93af6e0bbf54c60a011449f60b278a7f99d594a2 | lib/config/autoconfig.js | text | 313+0 | 317+1 | artifact: config |  |
| 215630b2648f3ef1618b8bbf185d4ae07c17859087c5579d246b7181aaa49515 | lib/config/autoconfig.js | text | 313+0 | 318+1 | artifact: config |  |
| f0519eb4c7b05ee429d3d330d82529c9dc69ac290d1757f3b7fb8248b1662336 | lib/config/autoconfig.js | text | 313+0 | 319+1 | artifact: config |  |

config: {"unit":[],"artifact":["3d5a161118a142b3a778f32982eabbfbab452d97dcabd9c08d1f42aaa6d4e020","47a003854bd6b58d6ffe6deb0bd6ee95ea6cefa8b972d29107beaa2eb4b4ae40","cbc3451e765aa4e1a18eb02fa051e57f837b38b09c1bab8cf2ee1525959ce994","d32e03a136d9106711894e5edebcfa798e2c37e3fb6b40622389305aa0395a6c","141bee345b0936ab203c9dffc50884eb836c61d6a09b3fdcbcfad32352924b4b","1ab4e3d8073a89c34374c75e93af6e0bbf54c60a011449f60b278a7f99d594a2","215630b2648f3ef1618b8bbf185d4ae07c17859087c5579d246b7181aaa49515","f0519eb4c7b05ee429d3d330d82529c9dc69ac290d1757f3b7fb8248b1662336"],"unassigned":[]}

Task reconciliation: expected 8; terminal 8; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__202/run-mWH1B3/terminal.json