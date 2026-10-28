# lean report: 4070dabe532ecb799445920cf9756eb6625a0254 → 33508e0c756094f3cf465e29f78782102fa59bfb

Identity: 2ceb58a09805ab19be50fb7ad600266be407e99b6c3ac8c1e68e85afa62e4ec6; lean 815fc01fec5f51af99003faa686f25330e7c33ad

7 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 7 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/router/index.js | `sendOptionsResponse` (573-581) | **ASK** | refused:var | ASK |  | /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean |
| lib/router/index.js | `(edit 2151ffbf4491)` (155-155) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/router/index.js | `(edit 8d2818def7bb)` (156-156) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit 5e66e0137a1d)` (157-157) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit e431809e8013)` (155-155) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit 2f14bd854045)` (572-572) | **ASK** | unassigned:comment |  |  | comment |
| lib/router/index.js | `(edit d142e0691a2f)` (582-582) | **ASK** | unassigned:whitespace |  |  | whitespace |

## What would make the asks provable

### lib/router/index.js · `sendOptionsResponse`

- line 575, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 15 = 9 unit + 0 artifact + 6 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 2151ffbf4491b4470152e0f70db2cc037f30e9fb6b3bcd0d7c5cd0f203bb428f | lib/router/index.js | text | 155+1 | 155+0 | unassigned: whitespace |  |
| 8d2818def7bb9283b9aa39bdd7ebd1dd1d88d86fbba60d20e1c7878956f9fde3 | lib/router/index.js | text | 156+1 | 155+0 | unassigned: module-level statement |  |
| 5e66e0137a1d75530b5c990be8a07320166e5da3138107e05c1c75fadc2afd66 | lib/router/index.js | text | 157+1 | 155+0 | unassigned: module-level statement |  |
| e431809e801338845e61c02338715ecf4c59cd78f970f61fb664e4ce3a5bc6fd | lib/router/index.js | text | 155+0 | 155+1 | unassigned: module-level statement |  |
| 2f14bd854045f7b19de441214bc3da9d1faeb49af906de2bf57db474ddb4453d | lib/router/index.js | text | 573+0 | 572+1 | unassigned: comment |  |
| fb9ea6f47a7ed7abfa3d85ca7aa97229a0f559bf23f39e2693a83e4efa95c971 | lib/router/index.js | text | 573+0 | 573+1 | unit: sendOptionsResponse | new:sendOptionsResponse |
| 2a45d2d59ece300bdc904bc6ebdd38611c6fc0c0d791e8043e88afbf5f01107a | lib/router/index.js | text | 573+0 | 574+1 | unit: sendOptionsResponse | new:sendOptionsResponse |
| a6bacc114342b1cf032472c0c5084361f2846c964d3d724c71f83ebfa1c18cfe | lib/router/index.js | text | 573+0 | 575+1 | unit: sendOptionsResponse | new:sendOptionsResponse |
| 96368cb431d207a0a980b06799dad58ccd329bb4e7d8828a6115d28705630438 | lib/router/index.js | text | 573+0 | 576+1 | unit: sendOptionsResponse | new:sendOptionsResponse |
| 6f3d995944d5ef47a93a63a7c080977d921fc8f6e68081645d1555a72e8d19c3 | lib/router/index.js | text | 573+0 | 577+1 | unit: sendOptionsResponse | new:sendOptionsResponse |
| 22cb9ccc7f1799e799d0a79fa42e7aab23984be2ab7e863a1431bac8e983ed66 | lib/router/index.js | text | 573+0 | 578+1 | unit: sendOptionsResponse | new:sendOptionsResponse |
| c6c6bd1cf02effdcaca7898a61292b8cfd05d1764cb1ecbbc23bd115b24aa4ff | lib/router/index.js | text | 573+0 | 579+1 | unit: sendOptionsResponse | new:sendOptionsResponse |
| 704e8b27eeb442adb040560883cc07575970f2cd8a9fd48b850cec3f9e97aa67 | lib/router/index.js | text | 573+0 | 580+1 | unit: sendOptionsResponse | new:sendOptionsResponse |
| e46f425a8db1ec79b8e9df1b3119222f2518e959992751ec62eb07552c763711 | lib/router/index.js | text | 573+0 | 581+1 | unit: sendOptionsResponse | new:sendOptionsResponse |
| d142e0691a2fe63108ba92618f6a5ab5539c698d4d7dee0716b26dfcf5d6efdc | lib/router/index.js | text | 573+0 | 582+1 | unassigned: whitespace |  |

source: {"unit":["fb9ea6f47a7ed7abfa3d85ca7aa97229a0f559bf23f39e2693a83e4efa95c971","2a45d2d59ece300bdc904bc6ebdd38611c6fc0c0d791e8043e88afbf5f01107a","a6bacc114342b1cf032472c0c5084361f2846c964d3d724c71f83ebfa1c18cfe","96368cb431d207a0a980b06799dad58ccd329bb4e7d8828a6115d28705630438","6f3d995944d5ef47a93a63a7c080977d921fc8f6e68081645d1555a72e8d19c3","22cb9ccc7f1799e799d0a79fa42e7aab23984be2ab7e863a1431bac8e983ed66","c6c6bd1cf02effdcaca7898a61292b8cfd05d1764cb1ecbbc23bd115b24aa4ff","704e8b27eeb442adb040560883cc07575970f2cd8a9fd48b850cec3f9e97aa67","e46f425a8db1ec79b8e9df1b3119222f2518e959992751ec62eb07552c763711"],"artifact":[],"unassigned":["2151ffbf4491b4470152e0f70db2cc037f30e9fb6b3bcd0d7c5cd0f203bb428f","8d2818def7bb9283b9aa39bdd7ebd1dd1d88d86fbba60d20e1c7878956f9fde3","5e66e0137a1d75530b5c990be8a07320166e5da3138107e05c1c75fadc2afd66","e431809e801338845e61c02338715ecf4c59cd78f970f61fb664e4ce3a5bc6fd","2f14bd854045f7b19de441214bc3da9d1faeb49af906de2bf57db474ddb4453d","d142e0691a2fe63108ba92618f6a5ab5539c698d4d7dee0716b26dfcf5d6efdc"]}

Task reconciliation: expected 7; terminal 7; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__express__24/run-gqpW7g/terminal.json