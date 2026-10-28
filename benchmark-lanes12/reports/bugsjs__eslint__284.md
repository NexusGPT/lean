# lean report: f8176b3fbc94ebbd74b74a21c925f21e7b0a3994 → e74f60883edad94a632ccec98b6b64455a11e14f

Identity: dff2e108d65c1df431d0d5d1a49a6ee71cee2bbe2ef791f3c2ac9fbb6a781a60; lean 815fc01fec5f51af99003faa686f25330e7c33ad

9 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 9 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-param-reassign.js | `(edit aee0cdb78b0d)` (99-99) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-param-reassign.js | `(edit 1533d0e64ab1)` (99-99) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/no-param-reassign.js | `(edit 66bb6ee92a2d)` (100-100) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-param-reassign.js | `(edit f52d978f2142)` (101-101) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-param-reassign.js | `(edit 0ab14b3a60c4)` (102-102) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-param-reassign.js | `(edit 6ce5e49c11a3)` (103-103) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-param-reassign.js | `(edit 8d24c5478cd4)` (104-104) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/no-param-reassign.js | `(edit bae89c8fe40a)` (106-106) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/no-param-reassign.js | `(edit 9b4c5803a54b)` (107-107) | **ASK** | unassigned:comment |  |  | comment |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 9 = 0 unit + 0 artifact + 9 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| aee0cdb78b0df3be941428073b70e00e0deabec3902fdbcb92e72a466ed93d42 | lib/rules/no-param-reassign.js | text | 99+1 | 99+0 | unassigned: object-literal member |  |
| 1533d0e64ab1da9a33351ce03765a76da83bc185a2a4aaa8f26f74a177cb978c | lib/rules/no-param-reassign.js | text | 99+0 | 99+1 | unassigned: comment |  |
| 66bb6ee92a2d5781a5a44b9ad3cf6c286fa6deb94d62077e78c31c0833d0ad0b | lib/rules/no-param-reassign.js | text | 99+0 | 100+1 | unassigned: object-literal member |  |
| f52d978f2142e450b2421f499ed67d0dfdc77f1e3cfe037ba4a98f1e54512ba2 | lib/rules/no-param-reassign.js | text | 99+0 | 101+1 | unassigned: object-literal member |  |
| 0ab14b3a60c44e28f50ed83599e421e7a18a7b434943313ff2bd064b1a8fa89a | lib/rules/no-param-reassign.js | text | 99+0 | 102+1 | unassigned: object-literal member |  |
| 6ce5e49c11a36d63afcfe6a55b2e7762e902a41c1121d4c591b7baa023f8ce89 | lib/rules/no-param-reassign.js | text | 99+0 | 103+1 | unassigned: object-literal member |  |
| 8d24c5478cd498da572034b77123cbf21bc2d79cd7ffb4080d196e25dd44f814 | lib/rules/no-param-reassign.js | text | 99+0 | 104+1 | unassigned: whitespace |  |
| bae89c8fe40a619cbb9a5e5e5d7b764304b2eb3566a905fce6b466f11148341e | lib/rules/no-param-reassign.js | text | 100+0 | 106+1 | unassigned: whitespace |  |
| 9b4c5803a54b2134015d52c888ba617958a94ce92da6fa89510f0ef44cbdfca3 | lib/rules/no-param-reassign.js | text | 100+0 | 107+1 | unassigned: comment |  |

source: {"unit":[],"artifact":[],"unassigned":["aee0cdb78b0df3be941428073b70e00e0deabec3902fdbcb92e72a466ed93d42","1533d0e64ab1da9a33351ce03765a76da83bc185a2a4aaa8f26f74a177cb978c","66bb6ee92a2d5781a5a44b9ad3cf6c286fa6deb94d62077e78c31c0833d0ad0b","f52d978f2142e450b2421f499ed67d0dfdc77f1e3cfe037ba4a98f1e54512ba2","0ab14b3a60c44e28f50ed83599e421e7a18a7b434943313ff2bd064b1a8fa89a","6ce5e49c11a36d63afcfe6a55b2e7762e902a41c1121d4c591b7baa023f8ce89","8d24c5478cd498da572034b77123cbf21bc2d79cd7ffb4080d196e25dd44f814","bae89c8fe40a619cbb9a5e5e5d7b764304b2eb3566a905fce6b466f11148341e","9b4c5803a54b2134015d52c888ba617958a94ce92da6fa89510f0ef44cbdfca3"]}

Task reconciliation: expected 9; terminal 9; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__284/run-UOd3by/terminal.json