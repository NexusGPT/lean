# lean report: 5b6093ef30108f09e94088081ea3db5f037f2cb2 → 7a2d3247c41117c2d3c8b90af9ba0efe46ef8f7b

Identity: d05c9e4aef3f6496814c7126fb4000f7ef68af78a777948784f15f8c2d26e3b9; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 4 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/indent.js | `(edit 39e775e6875c)` (1192-1192) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 51d2a14d15da)` (1194-1194) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 177a74746670)` (1195-1195) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 64ec7b3098ee)` (1196-1196) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 0 unit + 0 artifact + 4 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 39e775e6875c014497d7fd814cb76792d5716fe5c214fb306fc5bd9e34fe4fad | lib/rules/indent.js | text | 1191+0 | 1192+1 | unassigned: object-literal member |  |
| 51d2a14d15da8d1a080c637f80c4d3c083f7569668ff06eafd1df4443b634600 | lib/rules/indent.js | text | 1194+1 | 1195+0 | unassigned: object-literal member |  |
| 177a74746670af2686743bd54b70528b611172771f5385a2d2148c1b568667fd | lib/rules/indent.js | text | 1194+0 | 1195+1 | unassigned: object-literal member |  |
| 64ec7b3098eeed48613aab943c8bebcfecbd0f4031ed6079a3dd3a21d6993402 | lib/rules/indent.js | text | 1194+0 | 1196+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["39e775e6875c014497d7fd814cb76792d5716fe5c214fb306fc5bd9e34fe4fad","51d2a14d15da8d1a080c637f80c4d3c083f7569668ff06eafd1df4443b634600","177a74746670af2686743bd54b70528b611172771f5385a2d2148c1b568667fd","64ec7b3098eeed48613aab943c8bebcfecbd0f4031ed6079a3dd3a21d6993402"]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__78/run-cNa5oj/terminal.json