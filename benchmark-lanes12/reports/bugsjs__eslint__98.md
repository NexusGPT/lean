# lean report: a2090cb2df2d45996b86fc019311d22457cab71f → b9816b2a5b85ba94c11287f29b4ce5e3ccdb1690

Identity: c64e936b98c6642b65cd38e8d03d1881d7298051788a1fcb30d44785151b98c1; lean 815fc01fec5f51af99003faa686f25330e7c33ad

10 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 1 PASS-bounded · 9 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-use-before-define.js | `isInInitializer` (103-134) | **PASS-bounded** | refused:var | PASS-bounded |  | `var` is outside the subset; use let or const |
| lib/rules/no-use-before-define.js | `(edit 0d8d11a58cf2)` (13-13) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-use-before-define.js | `(edit ffbb03731424)` (91-91) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-use-before-define.js | `(edit 661f7e563575)` (92-92) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-use-before-define.js | `(edit 7bf04b1c7e00)` (93-93) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-use-before-define.js | `(edit b4e7e2117ff7)` (94-94) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-use-before-define.js | `(edit d92b2ac05287)` (95-95) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-use-before-define.js | `(edit dbae9ccbe046)` (96-96) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-use-before-define.js | `(edit b5aa9a8de6ec)` (97-97) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-use-before-define.js | `(edit fb2ab81b8e78)` (98-98) | **ASK** | unassigned:module-level statement |  |  | module-level statement |

## What would make the asks provable

### lib/rules/no-use-before-define.js · `isInInitializer`

- line 108, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 109, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 14 = 5 unit + 0 artifact + 9 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 0d8d11a58cf2648033929775493da94462dc1ff2d5c384b75a9b6f8fe6a1032a | lib/rules/no-use-before-define.js | text | 12+0 | 13+1 | unassigned: module-level statement |  |
| ffbb0373142441acb5f4c485e6b6a60687c4a80a25a4f55ff137f39210e166af | lib/rules/no-use-before-define.js | text | 89+0 | 91+1 | unassigned: module-level statement |  |
| 661f7e5635752479fd9a0e86d60618cf887fbb2c2803ce430fc8f2f8bba9d0b7 | lib/rules/no-use-before-define.js | text | 89+0 | 92+1 | unassigned: module-level statement |  |
| 7bf04b1c7e00ade1a56894d4880cbf8c98f5195cd851c76e35edcaee9d885c2e | lib/rules/no-use-before-define.js | text | 89+0 | 93+1 | unassigned: module-level statement |  |
| b4e7e2117ff7d12b87cf033bc5b1f84dc6285c4cc7fb40b5a3610729976fb2bf | lib/rules/no-use-before-define.js | text | 89+0 | 94+1 | unassigned: module-level statement |  |
| d92b2ac052879122729769971f3e01f1f5f3eb74d5118e7df19c7fbb923bf8c3 | lib/rules/no-use-before-define.js | text | 89+0 | 95+1 | unassigned: module-level statement |  |
| dbae9ccbe04660ece9a45295c04abf16ca7a440aab1d42bd1b500068f9f781da | lib/rules/no-use-before-define.js | text | 89+0 | 96+1 | unassigned: module-level statement |  |
| b5aa9a8de6ec36d99def5724845f1bb0c8a5bc780d923709eb915b8da3f540b3 | lib/rules/no-use-before-define.js | text | 89+0 | 97+1 | unassigned: module-level statement |  |
| fb2ab81b8e787cbf38f632e7a8f9010667f7b7b72c839919dc7c7462aa8a444e | lib/rules/no-use-before-define.js | text | 89+0 | 98+1 | unassigned: module-level statement |  |
| a787ae556d89a771b55b85b771076639127efbdba86025f493061e90b359acf3 | lib/rules/no-use-before-define.js | text | 106+0 | 116+1 | unit: isInInitializer | new:isInInitializer |
| f6cb26c7c3b384718faee7c66482e93fd3d09a2f5ad36f372696dcdb81a17a41 | lib/rules/no-use-before-define.js | text | 106+0 | 117+1 | unit: isInInitializer | new:isInInitializer |
| 94f6169a1f71350a9dbb7c06a010a5586da97619f6c393a624f6813a31847555 | lib/rules/no-use-before-define.js | text | 106+0 | 118+1 | unit: isInInitializer | new:isInInitializer |
| d253c8a7bf6793fb15ec56e5effe7f90b08c533baf6be8ad4f5690fad837c1d7 | lib/rules/no-use-before-define.js | text | 106+0 | 119+1 | unit: isInInitializer | new:isInInitializer |
| 17b4ec670c949dc132e01bb0677606b3f7add76dfd760c2163ff9585ffa132f7 | lib/rules/no-use-before-define.js | text | 106+0 | 120+1 | unit: isInInitializer | new:isInInitializer |

source: {"unit":["a787ae556d89a771b55b85b771076639127efbdba86025f493061e90b359acf3","f6cb26c7c3b384718faee7c66482e93fd3d09a2f5ad36f372696dcdb81a17a41","94f6169a1f71350a9dbb7c06a010a5586da97619f6c393a624f6813a31847555","d253c8a7bf6793fb15ec56e5effe7f90b08c533baf6be8ad4f5690fad837c1d7","17b4ec670c949dc132e01bb0677606b3f7add76dfd760c2163ff9585ffa132f7"],"artifact":[],"unassigned":["0d8d11a58cf2648033929775493da94462dc1ff2d5c384b75a9b6f8fe6a1032a","ffbb0373142441acb5f4c485e6b6a60687c4a80a25a4f55ff137f39210e166af","661f7e5635752479fd9a0e86d60618cf887fbb2c2803ce430fc8f2f8bba9d0b7","7bf04b1c7e00ade1a56894d4880cbf8c98f5195cd851c76e35edcaee9d885c2e","b4e7e2117ff7d12b87cf033bc5b1f84dc6285c4cc7fb40b5a3610729976fb2bf","d92b2ac052879122729769971f3e01f1f5f3eb74d5118e7df19c7fbb923bf8c3","dbae9ccbe04660ece9a45295c04abf16ca7a440aab1d42bd1b500068f9f781da","b5aa9a8de6ec36d99def5724845f1bb0c8a5bc780d923709eb915b8da3f540b3","fb2ab81b8e787cbf38f632e7a8f9010667f7b7b72c839919dc7c7462aa8a444e"]}

Task reconciliation: expected 10; terminal 10; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__98/run-OGUw3h/terminal.json