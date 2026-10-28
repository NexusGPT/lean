# lean report: 6a718ba6444a0d455035df2c6a010d9926920cf5 → e9e74edd3c84ffdddae4ae48008e7432b25c52b6

Identity: e4d81d67f68a5f71797216b20895ade620ee01f81c6dbac1d58799d76b149acc; lean 815fc01fec5f51af99003faa686f25330e7c33ad

9 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 9 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-else-return.js | `(edit afc620eeb63f)` (12-12) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-else-return.js | `(edit a69ad8942faa)` (202-202) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/no-else-return.js | `(edit 2de4f9ebe1fa)` (203-203) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/no-else-return.js | `(edit d6eb8412817c)` (204-204) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-else-return.js | `(edit 9caf44d4fa87)` (203-203) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/no-else-return.js | `(edit 0f50869a81d5)` (204-204) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-else-return.js | `(edit a59ad377b37f)` (205-205) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-else-return.js | `(edit 6fbae3f26293)` (206-206) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-else-return.js | `(edit 5874de1c502a)` (207-207) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 9 = 0 unit + 0 artifact + 9 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| afc620eeb63f98a81a955b835a0f40ae04f36052ff3f90fb062edf59bcd722f0 | lib/rules/no-else-return.js | text | 11+0 | 12+1 | unassigned: module-level statement |  |
| a69ad8942faabd0b32c14f16ec5e53697f2ed546e1a2ab6a0476d95247736e25 | lib/rules/no-else-return.js | text | 202+1 | 203+0 | unassigned: comment |  |
| 2de4f9ebe1fafac237a6a51b8724d3e4b5a44b92e97f4fc71b7e2591a4eb7863 | lib/rules/no-else-return.js | text | 203+1 | 203+0 | unassigned: comment |  |
| d6eb8412817c6c63232df9e02fd0947ce29488d334746b26e6373eb9fbee339e | lib/rules/no-else-return.js | text | 204+1 | 203+0 | unassigned: object-literal member |  |
| 9caf44d4fa878c487c783eccbf20cc0dacf84de4e7037f35aee4874415def677 | lib/rules/no-else-return.js | text | 202+0 | 203+1 | unassigned: comment |  |
| 0f50869a81d5ff615e0d7c5725924bbcd3a21acfa97ba12d044ca881fc1ad57c | lib/rules/no-else-return.js | text | 202+0 | 204+1 | unassigned: object-literal member |  |
| a59ad377b37fec616c7645919eafb9efacbaf8043e480821370a1fc02868cdc8 | lib/rules/no-else-return.js | text | 202+0 | 205+1 | unassigned: object-literal member |  |
| 6fbae3f2629303fd05597f3c41915e65fa744d253fb8dc7ccd5dadbaa4bf70b8 | lib/rules/no-else-return.js | text | 202+0 | 206+1 | unassigned: object-literal member |  |
| 5874de1c502abff808a3c369693129f19c5dbffa81f65115449d05db6ba1b635 | lib/rules/no-else-return.js | text | 202+0 | 207+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["afc620eeb63f98a81a955b835a0f40ae04f36052ff3f90fb062edf59bcd722f0","a69ad8942faabd0b32c14f16ec5e53697f2ed546e1a2ab6a0476d95247736e25","2de4f9ebe1fafac237a6a51b8724d3e4b5a44b92e97f4fc71b7e2591a4eb7863","d6eb8412817c6c63232df9e02fd0947ce29488d334746b26e6373eb9fbee339e","9caf44d4fa878c487c783eccbf20cc0dacf84de4e7037f35aee4874415def677","0f50869a81d5ff615e0d7c5725924bbcd3a21acfa97ba12d044ca881fc1ad57c","a59ad377b37fec616c7645919eafb9efacbaf8043e480821370a1fc02868cdc8","6fbae3f2629303fd05597f3c41915e65fa744d253fb8dc7ccd5dadbaa4bf70b8","5874de1c502abff808a3c369693129f19c5dbffa81f65115449d05db6ba1b635"]}

Task reconciliation: expected 9; terminal 9; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__265/run-jmWtgE/terminal.json