# lean report: 03213bb2b76f53008fe104c473542e71066aafcc → 619fd45239ce489b64732ee62f38e222fd106da9

Identity: e9f1dadbb3fb9cae9fce5ea01e0993f238a18b190db0c199f35c733cf0a1d983; lean 815fc01fec5f51af99003faa686f25330e7c33ad

8 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 8 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/config.js | `(edit 06fcee2ceacb)` (69-69) | **ASK** | artifact:config |  |  | config |
| lib/config.js | `(edit db3c908d6403)` (70-70) | **ASK** | artifact:config |  |  | config |
| lib/config.js | `(edit 30033e231b85)` (75-75) | **ASK** | artifact:config |  |  | config |
| lib/config/config-file.js | `(edit 56f955b82128)` (563-563) | **ASK** | artifact:config |  |  | config |
| lib/config/config-file.js | `(edit c83c1da2d334)` (566-566) | **ASK** | artifact:config |  |  | config |
| lib/config/config-file.js | `(edit 8c2e39b4f627)` (567-567) | **ASK** | artifact:config |  |  | config |
| lib/config/config-file.js | `(edit 3dcf3199278a)` (567-567) | **ASK** | artifact:config |  |  | config |
| lib/config/config-file.js | `(edit dd0c10248e4f)` (568-568) | **ASK** | artifact:config |  |  | config |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 8 = 0 unit + 8 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 06fcee2ceacbc62fed9210cf419148b5433ea9c8445b5e2a826309526ba1f1b3 | lib/config.js | text | 68+0 | 69+1 | artifact: config | new:Config.constructor |
| db3c908d6403e18a7b9aac9c808aec4cca4dcde70be4b89d5afe3efe8429a719 | lib/config.js | text | 68+0 | 70+1 | artifact: config | new:Config.constructor |
| 30033e231b8524593d952251315f9dd77e4f9e591c507fa2bb0744a006dc1059 | lib/config.js | text | 75+1 | 76+0 | artifact: config | old:Config.constructor |
| 56f955b82128ec93bdc2078ab94866ae89552c5a5a9790b02e92c26225f9737e | lib/config/config-file.js | text | 562+0 | 563+1 | artifact: config |  |
| c83c1da2d334c964466448683cb28e26ece70b7b4aba51b44705412bce5991bb | lib/config/config-file.js | text | 566+1 | 567+0 | artifact: config | old:loadObject |
| 8c2e39b4f627d0d16061b3141ae2a5312e9595d45f6d55fd85393987a46ef3c1 | lib/config/config-file.js | text | 567+1 | 567+0 | artifact: config | old:loadObject |
| 3dcf3199278a05ade21ec2dc301a39048ac0613f4ffaa4a90af0d6ea640429ad | lib/config/config-file.js | text | 566+0 | 567+1 | artifact: config | new:loadObject |
| dd0c10248e4f81c7910fd4f7721e9756d7ac8358190580b5458f027b15022d47 | lib/config/config-file.js | text | 566+0 | 568+1 | artifact: config | new:loadObject |

config: {"unit":[],"artifact":["06fcee2ceacbc62fed9210cf419148b5433ea9c8445b5e2a826309526ba1f1b3","db3c908d6403e18a7b9aac9c808aec4cca4dcde70be4b89d5afe3efe8429a719","30033e231b8524593d952251315f9dd77e4f9e591c507fa2bb0744a006dc1059","56f955b82128ec93bdc2078ab94866ae89552c5a5a9790b02e92c26225f9737e","c83c1da2d334c964466448683cb28e26ece70b7b4aba51b44705412bce5991bb","8c2e39b4f627d0d16061b3141ae2a5312e9595d45f6d55fd85393987a46ef3c1","3dcf3199278a05ade21ec2dc301a39048ac0613f4ffaa4a90af0d6ea640429ad","dd0c10248e4f81c7910fd4f7721e9756d7ac8358190580b5458f027b15022d47"],"unassigned":[]}

Task reconciliation: expected 8; terminal 8; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__10/run-0yprD0/terminal.json