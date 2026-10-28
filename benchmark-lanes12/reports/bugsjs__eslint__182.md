# lean report: b12cff891af70269c0547127b1724494466ddd98 → cc700474b3b12e1ecdfa25af18e69327362ba44f

Identity: 447ac3b99c449849ae0a72048054bd9fd1e349dd632096742c87798866fca9c8; lean 815fc01fec5f51af99003faa686f25330e7c33ad

10 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 10 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/multiline-comment-style.js | `(edit 9c6f97862f28)` (128-128) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/multiline-comment-style.js | `(edit 1cbd66fe69e8)` (129-129) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/multiline-comment-style.js | `(edit 0053232fee73)` (130-130) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/multiline-comment-style.js | `(edit 9e9b1d9f37e1)` (131-131) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/multiline-comment-style.js | `(edit c0dadb0f0804)` (128-128) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/multiline-comment-style.js | `(edit 481d2fdbfcb9)` (129-129) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/multiline-comment-style.js | `(edit 03fb24a63d26)` (130-130) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/multiline-comment-style.js | `(edit 192b98de6223)` (131-131) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/multiline-comment-style.js | `(edit d9cd16faad37)` (132-132) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/multiline-comment-style.js | `(edit 360d7ff83050)` (133-133) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 10 = 0 unit + 0 artifact + 10 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 9c6f97862f28bd47b0038e5babee26c0d6288a8fdb4e653f7b7a7ca59e26266a | lib/rules/multiline-comment-style.js | text | 128+1 | 128+0 | unassigned: object-literal member |  |
| 1cbd66fe69e8528cbc301a054849c382e50c37bbdf6d26e482d74e6563d54c23 | lib/rules/multiline-comment-style.js | text | 129+1 | 128+0 | unassigned: object-literal member |  |
| 0053232fee73055ee706848952f29fec69aac2883bc2aa6c767269b00ea2c732 | lib/rules/multiline-comment-style.js | text | 130+1 | 128+0 | unassigned: object-literal member |  |
| 9e9b1d9f37e1c09ce5a08f567a3480c01fb6ef2d30b7260ab3fcf51c1f7f873c | lib/rules/multiline-comment-style.js | text | 131+1 | 128+0 | unassigned: object-literal member |  |
| c0dadb0f0804974fccce96fac384d694d1c66ad6ff753efeb3ad805a63020a42 | lib/rules/multiline-comment-style.js | text | 128+0 | 128+1 | unassigned: object-literal member |  |
| 481d2fdbfcb9c220857e7c0e18934d77a59c3bf567e3247e95da94cf3d447b3b | lib/rules/multiline-comment-style.js | text | 128+0 | 129+1 | unassigned: object-literal member |  |
| 03fb24a63d26526b983d2aeca73e1dfb7328d67e4332e803c98ef6e2da2188e0 | lib/rules/multiline-comment-style.js | text | 128+0 | 130+1 | unassigned: whitespace |  |
| 192b98de6223acdd4ee9bed9e385088c123e716481fc83e8faaf557a6353d459 | lib/rules/multiline-comment-style.js | text | 128+0 | 131+1 | unassigned: object-literal member |  |
| d9cd16faad37590e139a6cad5884d8314a931da3e78348dcd7d79fd4573ba8c7 | lib/rules/multiline-comment-style.js | text | 128+0 | 132+1 | unassigned: object-literal member |  |
| 360d7ff8305014c8c994ea068e774a56ad4abfa8492bbd9f2c29329137b565b3 | lib/rules/multiline-comment-style.js | text | 128+0 | 133+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["9c6f97862f28bd47b0038e5babee26c0d6288a8fdb4e653f7b7a7ca59e26266a","1cbd66fe69e8528cbc301a054849c382e50c37bbdf6d26e482d74e6563d54c23","0053232fee73055ee706848952f29fec69aac2883bc2aa6c767269b00ea2c732","9e9b1d9f37e1c09ce5a08f567a3480c01fb6ef2d30b7260ab3fcf51c1f7f873c","c0dadb0f0804974fccce96fac384d694d1c66ad6ff753efeb3ad805a63020a42","481d2fdbfcb9c220857e7c0e18934d77a59c3bf567e3247e95da94cf3d447b3b","03fb24a63d26526b983d2aeca73e1dfb7328d67e4332e803c98ef6e2da2188e0","192b98de6223acdd4ee9bed9e385088c123e716481fc83e8faaf557a6353d459","d9cd16faad37590e139a6cad5884d8314a931da3e78348dcd7d79fd4573ba8c7","360d7ff8305014c8c994ea068e774a56ad4abfa8492bbd9f2c29329137b565b3"]}

Task reconciliation: expected 10; terminal 10; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__182/run-zuOJrc/terminal.json