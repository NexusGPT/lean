# lean report: 3f206dd1074842fe4554bd50091b234475560ba6 → f420a353ceb032bf8652f681a928c45435da1b50

Identity: 7a5b9b2076d63dd7b358d33c101c33871cf4e7fefca15fe7aee8ceaafd1ced5c; lean 815fc01fec5f51af99003faa686f25330e7c33ad

16 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 16 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/func-names.js | `isFunctionName` (13-15) | **ASK** | failed:loader | ASK |  | /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean |
| lib/rules/func-names.js | `(edit 23ae2bbbbb36)` (8-8) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/func-names.js | `(edit 604a88b72a54)` (9-9) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/func-names.js | `(edit 5b1f7cacabaf)` (10-10) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/func-names.js | `(edit eff05cb70a60)` (11-11) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/func-names.js | `(edit ce364592dcb1)` (12-12) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/func-names.js | `(edit b8669763fd92)` (16-16) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/func-names.js | `(edit 010c118e7fb7)` (48-48) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/func-names.js | `(edit 1717bb13278a)` (57-57) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/func-names.js | `(edit 0356d45af275)` (58-58) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/func-names.js | `(edit c5fd7fff9b4b)` (59-59) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/func-names.js | `(edit 52e9e8d03e37)` (60-60) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/func-names.js | `(edit 23b84c493a16)` (61-61) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/func-names.js | `(edit dab4d7bce43e)` (62-62) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/func-names.js | `(edit a556fc18464b)` (63-63) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/func-names.js | `(edit 96f52541c7ea)` (64-64) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 18 = 3 unit + 0 artifact + 15 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 23ae2bbbbb36549b58a173d93ac2fb0bff01524b377d5979e663f545965aa602 | lib/rules/func-names.js | text | 7+0 | 8+1 | unassigned: comment |  |
| 604a88b72a54ccf473bf812a1e12f85b33944f1911862b5de4e2381a7d49d8f3 | lib/rules/func-names.js | text | 7+0 | 9+1 | unassigned: module-level statement |  |
| 5b1f7cacabaf7a22af3b0bd7c04e6267c705b8db73b1089f5e7a8eca378ad456 | lib/rules/func-names.js | text | 7+0 | 10+1 | unassigned: module-level statement |  |
| eff05cb70a602784e5ff972f84ac1f24eeab4ec93aff48be5a245a082146d768 | lib/rules/func-names.js | text | 7+0 | 11+1 | unassigned: module-level statement |  |
| ce364592dcb1cd9fbafd41c642ea4fa798a679e480937dc72a7d6f52ac546b25 | lib/rules/func-names.js | text | 7+0 | 12+1 | unassigned: module-level statement |  |
| 6f06fb82b5b1d5022c3f4c8868b4c1906d8442cee5999786480d36f8ba652c20 | lib/rules/func-names.js | text | 7+0 | 13+1 | unit: isFunctionName | new:isFunctionName |
| 3a0f078d3456b9851b1d41ed520a0c022e03f2ee5eb641e5ed3ded449028aae5 | lib/rules/func-names.js | text | 7+0 | 14+1 | unit: isFunctionName | new:isFunctionName |
| 42b1e967a6218ce42534f7c780999d6b21a5f5263531a932f2eb09c3d8f7eb3c | lib/rules/func-names.js | text | 7+0 | 15+1 | unit: isFunctionName | new:isFunctionName |
| b8669763fd92be16f3ba3fd9c7def36a08b08acf42b92f78084116ecf2322c8e | lib/rules/func-names.js | text | 7+0 | 16+1 | unassigned: whitespace |  |
| 010c118e7fb775fb86d663f47f01acb06f3e4517c57da9c77816cbfdf7c541b4 | lib/rules/func-names.js | text | 48+1 | 57+0 | unassigned: object-literal member |  |
| 1717bb13278a58d0cf3e63b9a8e12c350564c0a085578b0dddfc8be34c86d0e1 | lib/rules/func-names.js | text | 48+0 | 57+1 | unassigned: object-literal member |  |
| 0356d45af275ab808d12e6fd9bbe11100964eff9e8f5db4bfbadfcf8aea5fba3 | lib/rules/func-names.js | text | 48+0 | 58+1 | unassigned: whitespace |  |
| c5fd7fff9b4bb06e53d8f7c75bb0be3699a6b231d2b48f7dc329de8f3530d2d3 | lib/rules/func-names.js | text | 48+0 | 59+1 | unassigned: comment |  |
| 52e9e8d03e3779e58aba17c2115d3bdaa603a4593dac7945dec778d8fb2cf03a | lib/rules/func-names.js | text | 48+0 | 60+1 | unassigned: object-literal member |  |
| 23b84c493a16f1000809b05fa9b33920e2793f87a3d5d87c70ce0d00768c48f0 | lib/rules/func-names.js | text | 48+0 | 61+1 | unassigned: whitespace |  |
| dab4d7bce43e444417be789134d6d6f0acd0115768a797fdfc2275ebdb85da85 | lib/rules/func-names.js | text | 48+0 | 62+1 | unassigned: object-literal member |  |
| a556fc18464b13ada217948d1c78ca8c4851594ca63da2c55c267135526d76d1 | lib/rules/func-names.js | text | 48+0 | 63+1 | unassigned: object-literal member |  |
| 96f52541c7eadfd14ba6393341d727cd2095b143079a8464ad2d7f3763e992de | lib/rules/func-names.js | text | 48+0 | 64+1 | unassigned: object-literal member |  |

source: {"unit":["6f06fb82b5b1d5022c3f4c8868b4c1906d8442cee5999786480d36f8ba652c20","3a0f078d3456b9851b1d41ed520a0c022e03f2ee5eb641e5ed3ded449028aae5","42b1e967a6218ce42534f7c780999d6b21a5f5263531a932f2eb09c3d8f7eb3c"],"artifact":[],"unassigned":["23ae2bbbbb36549b58a173d93ac2fb0bff01524b377d5979e663f545965aa602","604a88b72a54ccf473bf812a1e12f85b33944f1911862b5de4e2381a7d49d8f3","5b1f7cacabaf7a22af3b0bd7c04e6267c705b8db73b1089f5e7a8eca378ad456","eff05cb70a602784e5ff972f84ac1f24eeab4ec93aff48be5a245a082146d768","ce364592dcb1cd9fbafd41c642ea4fa798a679e480937dc72a7d6f52ac546b25","b8669763fd92be16f3ba3fd9c7def36a08b08acf42b92f78084116ecf2322c8e","010c118e7fb775fb86d663f47f01acb06f3e4517c57da9c77816cbfdf7c541b4","1717bb13278a58d0cf3e63b9a8e12c350564c0a085578b0dddfc8be34c86d0e1","0356d45af275ab808d12e6fd9bbe11100964eff9e8f5db4bfbadfcf8aea5fba3","c5fd7fff9b4bb06e53d8f7c75bb0be3699a6b231d2b48f7dc329de8f3530d2d3","52e9e8d03e3779e58aba17c2115d3bdaa603a4593dac7945dec778d8fb2cf03a","23b84c493a16f1000809b05fa9b33920e2793f87a3d5d87c70ce0d00768c48f0","dab4d7bce43e444417be789134d6d6f0acd0115768a797fdfc2275ebdb85da85","a556fc18464b13ada217948d1c78ca8c4851594ca63da2c55c267135526d76d1","96f52541c7eadfd14ba6393341d727cd2095b143079a8464ad2d7f3763e992de"]}

Task reconciliation: expected 16; terminal 16; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__257/run-pcEiW3/terminal.json