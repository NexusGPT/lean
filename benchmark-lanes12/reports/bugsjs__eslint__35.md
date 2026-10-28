# lean report: 1e0a65295e4d24217188133a35d89475778b1004 → e2d91c8cc79bde1a04dbdd0241c8ee896039b563

Identity: 1cafeda87ee3eb39452b94dbfd52e95762585b312896ceb082f3f18d9d6baf86; lean 815fc01fec5f51af99003faa686f25330e7c33ad

6 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 6 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/cli-engine.js | `(edit 378d2d961f66)` (71-71) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/cli-engine.js | `(edit 19871f8b430d)` (72-72) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/cli-engine.js | `(edit 0de391deeb16)` (526-526) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/cli-engine.js | `(edit aa8f9fd63deb)` (528-528) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/cli-engine.js | `(edit f9bc210ca375)` (529-529) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/cli-engine.js | `(edit ca30c405fd09)` (530-530) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 6 = 0 unit + 0 artifact + 6 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 378d2d961f6677a1095ec4390c35d53fd2e19d52ed7a1f6dc8d97c769388f359 | lib/cli-engine.js | text | 70+0 | 71+1 | unassigned: module-level statement |  |
| 19871f8b430dbc3948462122f0014c56fe60af14ab2311dabcd8c8f42254ef5e | lib/cli-engine.js | text | 70+0 | 72+1 | unassigned: module-level statement |  |
| 0de391deeb16922750a8160651f689738256ec10429c3c12f287424c552a5cc4 | lib/cli-engine.js | text | 526+1 | 528+0 | unassigned: object-literal member |  |
| aa8f9fd63deb608100cd0ab06a93a66612a10ce250c1c034f1849d62a3e970e4 | lib/cli-engine.js | text | 526+0 | 528+1 | unassigned: object-literal member |  |
| f9bc210ca375708d24b9c48d2187ce5f27888a0f16d0965cfe2bb3489bdcdabb | lib/cli-engine.js | text | 526+0 | 529+1 | unassigned: object-literal member |  |
| ca30c405fd09ad957cf9ad5080b6a2f2b85bd85a109d6e0210dbff7a91237609 | lib/cli-engine.js | text | 526+0 | 530+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["378d2d961f6677a1095ec4390c35d53fd2e19d52ed7a1f6dc8d97c769388f359","19871f8b430dbc3948462122f0014c56fe60af14ab2311dabcd8c8f42254ef5e","0de391deeb16922750a8160651f689738256ec10429c3c12f287424c552a5cc4","aa8f9fd63deb608100cd0ab06a93a66612a10ce250c1c034f1849d62a3e970e4","f9bc210ca375708d24b9c48d2187ce5f27888a0f16d0965cfe2bb3489bdcdabb","ca30c405fd09ad957cf9ad5080b6a2f2b85bd85a109d6e0210dbff7a91237609"]}

Task reconciliation: expected 6; terminal 6; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__35/run-8HM4FS/terminal.json