# lean report: c4ac969c2c108644e9bd45300f39b7d6182db23d → aa0ddd9b1fe0c2f8a3301af08ed8767562511497

Identity: 63093ba00db822e5ea5ac3e0923eabc7e2d89d2b2114cb3c960bd1cbc128085e; lean 815fc01fec5f51af99003faa686f25330e7c33ad

6 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 6 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/prefer-destructuring.js | `(edit ce53264c8e07)` (112-112) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/prefer-destructuring.js | `(edit 52e1b88fa596)` (113-113) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/prefer-destructuring.js | `(edit 0161d58597ce)` (112-112) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/prefer-destructuring.js | `(edit 8bcff37149af)` (113-113) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/prefer-destructuring.js | `(edit ee4fc73921c3)` (114-114) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/prefer-destructuring.js | `(edit e4db9660255d)` (115-115) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 6 = 0 unit + 0 artifact + 6 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| ce53264c8e07f9cfe6005f0a0195ddddb78ab0d6b7ab38051342fcbb1cdc571a | lib/rules/prefer-destructuring.js | text | 112+1 | 112+0 | unassigned: object-literal member |  |
| 52e1b88fa59680dd2e76ab4da74a6d84ee1c68e55cb85c934b5d7bb556fd541d | lib/rules/prefer-destructuring.js | text | 113+1 | 112+0 | unassigned: object-literal member |  |
| 0161d58597ce9b18edac1b89f4fba8153c915cd325b8e70f3a6dcc8e6e54b204 | lib/rules/prefer-destructuring.js | text | 112+0 | 112+1 | unassigned: object-literal member |  |
| 8bcff37149afdf938b2f760e490ae012b591c9b03e725306508135ea2c6706dc | lib/rules/prefer-destructuring.js | text | 112+0 | 113+1 | unassigned: object-literal member |  |
| ee4fc73921c3589667052c1ce92f5f70c01d9371679de8a8319493a1a673d4a6 | lib/rules/prefer-destructuring.js | text | 112+0 | 114+1 | unassigned: object-literal member |  |
| e4db9660255d357d2800cdf94fc6dd19e252618ef489633ba68b8f9b0134b0a1 | lib/rules/prefer-destructuring.js | text | 112+0 | 115+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["ce53264c8e07f9cfe6005f0a0195ddddb78ab0d6b7ab38051342fcbb1cdc571a","52e1b88fa59680dd2e76ab4da74a6d84ee1c68e55cb85c934b5d7bb556fd541d","0161d58597ce9b18edac1b89f4fba8153c915cd325b8e70f3a6dcc8e6e54b204","8bcff37149afdf938b2f760e490ae012b591c9b03e725306508135ea2c6706dc","ee4fc73921c3589667052c1ce92f5f70c01d9371679de8a8319493a1a673d4a6","e4db9660255d357d2800cdf94fc6dd19e252618ef489633ba68b8f9b0134b0a1"]}

Task reconciliation: expected 6; terminal 6; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__180/run-jv7jyj/terminal.json