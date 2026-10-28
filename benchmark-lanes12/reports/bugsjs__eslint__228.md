# lean report: 350a72cd452cd5130d6d67e1abfaab80496c85fa → 93312e0d8b415e93ce6dea105e1d6c94f1024448

Identity: 7d0480c8581a125ad3ca6337f73f6a1764df6c6f642af59ca89bb1241f95a0e2; lean 815fc01fec5f51af99003faa686f25330e7c33ad

12 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 12 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/cli.js | `(edit 3c5483e3aa3d)` (147-147) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/cli.js | `(edit f59e409dd22b)` (148-148) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/cli.js | `(edit cc622a88e8c3)` (156-156) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/cli.js | `(edit b891e6876338)` (158-158) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/cli.js | `(edit d8eac5675b29)` (167-167) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/cli.js | `(edit d9e67831c554)` (169-169) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/cli.js | `(edit b9d90efc4021)` (173-173) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/cli.js | `(edit 870aa7264cad)` (175-175) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/cli.js | `(edit c5636c6a65c7)` (180-180) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/cli.js | `(edit a52448d354d8)` (182-182) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/cli.js | `(edit 63dd463b7dd4)` (187-187) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/cli.js | `(edit 9f695007b4d1)` (189-189) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 12 = 0 unit + 0 artifact + 12 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 3c5483e3aa3db2b42c97bd823ef6005eb58610e4cf9332182b966e3acb27e023 | lib/cli.js | text | 146+0 | 147+1 | unassigned: object-literal member |  |
| f59e409dd22b59dbbd9b953c7718641b44d3bea2dea211b8bcfa8e9952f11a34 | lib/cli.js | text | 146+0 | 148+1 | unassigned: whitespace |  |
| cc622a88e8c31dad4704a02ed2723d751c29f95c115f142fcb3d68c7ae83ad0e | lib/cli.js | text | 156+1 | 158+0 | unassigned: object-literal member |  |
| b891e6876338e4106527e53381e9f3643a1ae35dc8ad1854bacc1fd719a5ba32 | lib/cli.js | text | 156+0 | 158+1 | unassigned: object-literal member |  |
| d8eac5675b2923c1a947500599e53ee5ce62c5a8fb84f3f3272b48733c656655 | lib/cli.js | text | 167+1 | 169+0 | unassigned: object-literal member |  |
| d9e67831c5546c71484dd0d301dfda71b1a0a04721acffd7bdd64f69ef70e1b5 | lib/cli.js | text | 167+0 | 169+1 | unassigned: object-literal member |  |
| b9d90efc4021dcb7263f6595f6b1389dbf759f3009f2f197068facc8af92e64f | lib/cli.js | text | 173+1 | 175+0 | unassigned: object-literal member |  |
| 870aa7264cad35d94d4fdfe52de1f2b7cbbc07860c4b0fb76295dabf8ba9192f | lib/cli.js | text | 173+0 | 175+1 | unassigned: object-literal member |  |
| c5636c6a65c766858b606ffdeec3b3a0a713dea8af58f0d8c7d481f092edd943 | lib/cli.js | text | 180+1 | 182+0 | unassigned: object-literal member |  |
| a52448d354d83282a6684f3c56735e78b9f49a4d67076b0d6215dd81522b2511 | lib/cli.js | text | 180+0 | 182+1 | unassigned: object-literal member |  |
| 63dd463b7dd49b1fc3879958fa8559d56b88b340698ef733e9f58603edf64dbe | lib/cli.js | text | 187+1 | 189+0 | unassigned: object-literal member |  |
| 9f695007b4d1c1d54daa18c7914f29e2998453478a02e9e83cd4c85fa0634210 | lib/cli.js | text | 187+0 | 189+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["3c5483e3aa3db2b42c97bd823ef6005eb58610e4cf9332182b966e3acb27e023","f59e409dd22b59dbbd9b953c7718641b44d3bea2dea211b8bcfa8e9952f11a34","cc622a88e8c31dad4704a02ed2723d751c29f95c115f142fcb3d68c7ae83ad0e","b891e6876338e4106527e53381e9f3643a1ae35dc8ad1854bacc1fd719a5ba32","d8eac5675b2923c1a947500599e53ee5ce62c5a8fb84f3f3272b48733c656655","d9e67831c5546c71484dd0d301dfda71b1a0a04721acffd7bdd64f69ef70e1b5","b9d90efc4021dcb7263f6595f6b1389dbf759f3009f2f197068facc8af92e64f","870aa7264cad35d94d4fdfe52de1f2b7cbbc07860c4b0fb76295dabf8ba9192f","c5636c6a65c766858b606ffdeec3b3a0a713dea8af58f0d8c7d481f092edd943","a52448d354d83282a6684f3c56735e78b9f49a4d67076b0d6215dd81522b2511","63dd463b7dd49b1fc3879958fa8559d56b88b340698ef733e9f58603edf64dbe","9f695007b4d1c1d54daa18c7914f29e2998453478a02e9e83cd4c85fa0634210"]}

Task reconciliation: expected 12; terminal 12; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__228/run-vqXkNr/terminal.json