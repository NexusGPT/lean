# lean report: ff0c050cbd6a320784c038f1fc125a15bc73e447 → ee4e271ada7fc9f45a52a3417dea63556d81b2b5

Identity: 5b01b2495f0b936bb1c3f56b9ed89b1dc4c206c186f5f03e39b15fa90d4b3997; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 4 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/semi.js | `(edit 006079908ff9)` (56-56) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/semi.js | `(edit b5f684012050)` (56-56) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/semi.js | `(edit 2acddf8408ad)` (130-130) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/semi.js | `(edit 97eb827033a7)` (130-130) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 0 unit + 0 artifact + 4 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 006079908ff9268a603f873d2c33e3af6b2d89f888be6b4a384e0a28203b7ac8 | lib/rules/semi.js | text | 56+1 | 56+0 | unassigned: object-literal member |  |
| b5f6840120502f2d0aa7c93a79c05ceae6e45bf32cf9b7129d72268e46f6ec71 | lib/rules/semi.js | text | 56+0 | 56+1 | unassigned: object-literal member |  |
| 2acddf8408ad48873738e1221327b21a7072bc2f84ca46715b219b8777475338 | lib/rules/semi.js | text | 130+1 | 130+0 | unassigned: object-literal member |  |
| 97eb827033a73f917fb3493b9289c651ee36e052d4f92a3d2a405b018569871a | lib/rules/semi.js | text | 130+0 | 130+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["006079908ff9268a603f873d2c33e3af6b2d89f888be6b4a384e0a28203b7ac8","b5f6840120502f2d0aa7c93a79c05ceae6e45bf32cf9b7129d72268e46f6ec71","2acddf8408ad48873738e1221327b21a7072bc2f84ca46715b219b8777475338","97eb827033a73f917fb3493b9289c651ee36e052d4f92a3d2a405b018569871a"]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__123/run-trcz3B/terminal.json