# lean report: d727f17f4efc888ed0e59259a4e4cac01a42f0d9 → 0341cb87f3e7f76bc9514c7eb1ce0b3fac150bf1

Identity: a665a21c69009bfb4c5bd7bcf68a6065881d761d4c63bcae6b65d9ccdbaac211; lean 815fc01fec5f51af99003faa686f25330e7c33ad

13 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 13 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/config/config-validator.js | `(edit 6923db19964e)` (16-16) | **ASK** | artifact:config |  |  | config |
| lib/config/config-validator.js | `(edit c0999da81df3)` (16-16) | **ASK** | artifact:config |  |  | config |
| lib/config/config-validator.js | `(edit b2b11c5c8c9b)` (17-17) | **ASK** | artifact:config |  |  | config |
| lib/config/config-validator.js | `(edit f05c0108d639)` (86-86) | **ASK** | artifact:config |  |  | config |
| lib/config/config-validator.js | `(edit 2f3d0ddec0c5)` (87-87) | **ASK** | artifact:config |  |  | config |
| lib/config/config-validator.js | `(edit e27012b42474)` (88-88) | **ASK** | artifact:config |  |  | config |
| lib/config/config-validator.js | `(edit ee35b2d5be39)` (89-89) | **ASK** | artifact:config |  |  | config |
| lib/config/config-validator.js | `(edit 0ff21796c8cb)` (90-90) | **ASK** | artifact:config |  |  | config |
| lib/config/config-validator.js | `(edit b27e96db912e)` (100-100) | **ASK** | artifact:config |  |  | config |
| lib/config/config-validator.js | `(edit 2aee4cb2b843)` (104-104) | **ASK** | artifact:config |  |  | config |
| lib/config/config-validator.js | `(edit 74954dc81c51)` (105-105) | **ASK** | artifact:config |  |  | config |
| lib/config/config-validator.js | `(edit 6d74a9159539)` (106-106) | **ASK** | artifact:config |  |  | config |
| lib/config/config-validator.js | `(edit 7316ef4f50a3)` (107-107) | **ASK** | artifact:config |  |  | config |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 13 = 0 unit + 13 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 6923db19964eb2b139887d874a0326689d9c7e384df7fa850fa7ab72a6e95665 | lib/config/config-validator.js | text | 16+1 | 16+0 | artifact: config |  |
| c0999da81df36daa7f70ffbd557e84295e0399f3502ebc70a35bf958684909fb | lib/config/config-validator.js | text | 16+0 | 16+1 | artifact: config |  |
| b2b11c5c8c9b862124cff79a6ab65c47004c1bd36939e617a7a8669ec4d29cf6 | lib/config/config-validator.js | text | 16+0 | 17+1 | artifact: config |  |
| f05c0108d639526648682501a57f4797dce4dcb57993f2e6fcca0b5af1a4cd7a | lib/config/config-validator.js | text | 86+1 | 87+0 | artifact: config | old:validateRuleOptions |
| 2f3d0ddec0c59793ac2d6463a6619c86effa983cc68b1873920af0c3fdd60e2c | lib/config/config-validator.js | text | 86+0 | 87+1 | artifact: config | new:validateRuleOptions |
| e27012b424741c2fe9fe3ba6dfeec972ccfb7c0c61e316d701c01924d286214e | lib/config/config-validator.js | text | 86+0 | 88+1 | artifact: config | new:validateRuleOptions |
| ee35b2d5be39344f765344b0fbd968c0dc5e2cca90683f05a970bdda95669a66 | lib/config/config-validator.js | text | 86+0 | 89+1 | artifact: config | new:validateRuleOptions |
| 0ff21796c8cb794b8a699b8ad601cb6b26a8ef93040b44f589cbe01987b89e5d | lib/config/config-validator.js | text | 86+0 | 90+1 | artifact: config | new:validateRuleOptions |
| b27e96db912ed0d5c7d12f38917e213b9dc5ac8b2c6c4e1ee70de30823d45126 | lib/config/config-validator.js | text | 100+1 | 104+0 | artifact: config | old:validateRuleOptions |
| 2aee4cb2b84352ab6ebeb31ea7e3e10b9b49d1cae668ec739c206073f0e9f379 | lib/config/config-validator.js | text | 100+0 | 104+1 | artifact: config | new:validateRuleOptions |
| 74954dc81c514cd1cea01604bd9b22806c21a83b7dc82d7f1220c01a786d035f | lib/config/config-validator.js | text | 100+0 | 105+1 | artifact: config | new:validateRuleOptions |
| 6d74a91595392892fc8cebe76f46fa51d2b476be770502a0bbed918c5426b326 | lib/config/config-validator.js | text | 100+0 | 106+1 | artifact: config | new:validateRuleOptions |
| 7316ef4f50a381909a92fd20a5615c8efd006e434ec03d180b254c9435034185 | lib/config/config-validator.js | text | 100+0 | 107+1 | artifact: config | new:validateRuleOptions |

config: {"unit":[],"artifact":["6923db19964eb2b139887d874a0326689d9c7e384df7fa850fa7ab72a6e95665","c0999da81df36daa7f70ffbd557e84295e0399f3502ebc70a35bf958684909fb","b2b11c5c8c9b862124cff79a6ab65c47004c1bd36939e617a7a8669ec4d29cf6","f05c0108d639526648682501a57f4797dce4dcb57993f2e6fcca0b5af1a4cd7a","2f3d0ddec0c59793ac2d6463a6619c86effa983cc68b1873920af0c3fdd60e2c","e27012b424741c2fe9fe3ba6dfeec972ccfb7c0c61e316d701c01924d286214e","ee35b2d5be39344f765344b0fbd968c0dc5e2cca90683f05a970bdda95669a66","0ff21796c8cb794b8a699b8ad601cb6b26a8ef93040b44f589cbe01987b89e5d","b27e96db912ed0d5c7d12f38917e213b9dc5ac8b2c6c4e1ee70de30823d45126","2aee4cb2b84352ab6ebeb31ea7e3e10b9b49d1cae668ec739c206073f0e9f379","74954dc81c514cd1cea01604bd9b22806c21a83b7dc82d7f1220c01a786d035f","6d74a91595392892fc8cebe76f46fa51d2b476be770502a0bbed918c5426b326","7316ef4f50a381909a92fd20a5615c8efd006e434ec03d180b254c9435034185"],"unassigned":[]}

Task reconciliation: expected 13; terminal 13; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__22/run-3BSP5k/terminal.json