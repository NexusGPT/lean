# lean report: 1153955e41aca7f900a2ad0ce3dbf9ca12ae8053 → 4f0e0d57bdbcbafe6752b167ac08917f7de52285

Identity: 1e8a7d34ebb46aadd6d3d0b779debbe93ed6f790426098c7eb91fddbaa4a1d75; lean 815fc01fec5f51af99003faa686f25330e7c33ad

8 changed function(s); 1 unchanged caller(s) checked through lane B, 1 with a WITNESS through a changed callee: **0 in scope · 2 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 7 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/prefer-const.js | `getIdentifierIfShouldBeConst` (89-136) | **WITNESS** | checked | WITNESS |  | input 1: trace; lib/rules/prefer-const.js:90 |
| lib/rules/prefer-const.js | `(edit 5602e2991152)` (73-73) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/prefer-const.js | `(edit e8ca55fda1a5)` (73-73) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/prefer-const.js | `(edit 2cd351a1b837)` (76-76) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/prefer-const.js | `(edit 8d57c11c5378)` (77-77) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/prefer-const.js | `(edit 88daaef453b0)` (78-78) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/prefer-const.js | `(edit 88372848366c)` (79-79) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/prefer-const.js | `(edit 337759a94d7d)` (80-80) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/prefer-const.js | `groupByDestructuring` (175-209) | **WITNESS** | checked | WITNESS |  | input 1: through getIdentifierIfShouldBeConst (changed; its own row is WITNESS); this function's text is unchanged; lib/rules/prefer-const.js:90 |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 9 = 2 unit + 0 artifact + 7 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 5602e2991152f102b1f9d4838a92ce2123a4a54ad104f258d84de9a1cef98646 | lib/rules/prefer-const.js | text | 73+1 | 73+0 | unassigned: module-level statement |  |
| e8ca55fda1a53bfd75d75c57c1a032ccaf545738b2374e60c8c74276f41d60e5 | lib/rules/prefer-const.js | text | 73+0 | 73+1 | unassigned: module-level statement |  |
| 2cd351a1b83743ae27b23134de95ba3fcb0b8ca9ba0ccf3547cca8fa5160b261 | lib/rules/prefer-const.js | text | 75+0 | 76+1 | unassigned: module-level statement |  |
| 8d57c11c53788b3fd61e84c209db7bfd23c56ff95ee38443d84e059688ae8b68 | lib/rules/prefer-const.js | text | 75+0 | 77+1 | unassigned: module-level statement |  |
| 88daaef453b0690c45cb4018c053f7564c918598a80e2ee94ac5fe667dff98b2 | lib/rules/prefer-const.js | text | 75+0 | 78+1 | unassigned: module-level statement |  |
| 88372848366cc44931b92079129e5b5be6765b74a80bbf12c48f4a589c0eb92e | lib/rules/prefer-const.js | text | 75+0 | 79+1 | unassigned: module-level statement |  |
| 337759a94d7d52e773cebe183b9fc55d3bb31cf1b648facdc085192e3818de93 | lib/rules/prefer-const.js | text | 75+0 | 80+1 | unassigned: module-level statement |  |
| 4dd6fc64e92fdf3c8ffd5374fb80b54ed363692a1b04eee55ead63eaf01b646d | lib/rules/prefer-const.js | text | 85+1 | 90+0 | unit: getIdentifierIfShouldBeConst | old:getIdentifierIfShouldBeConst |
| 7f058728a01429721845707302a94d5c05cb75b9d08350561927b1da097e5e01 | lib/rules/prefer-const.js | text | 85+0 | 90+1 | unit: getIdentifierIfShouldBeConst | new:getIdentifierIfShouldBeConst |

source: {"unit":["4dd6fc64e92fdf3c8ffd5374fb80b54ed363692a1b04eee55ead63eaf01b646d","7f058728a01429721845707302a94d5c05cb75b9d08350561927b1da097e5e01"],"artifact":[],"unassigned":["5602e2991152f102b1f9d4838a92ce2123a4a54ad104f258d84de9a1cef98646","e8ca55fda1a53bfd75d75c57c1a032ccaf545738b2374e60c8c74276f41d60e5","2cd351a1b83743ae27b23134de95ba3fcb0b8ca9ba0ccf3547cca8fa5160b261","8d57c11c53788b3fd61e84c209db7bfd23c56ff95ee38443d84e059688ae8b68","88daaef453b0690c45cb4018c053f7564c918598a80e2ee94ac5fe667dff98b2","88372848366cc44931b92079129e5b5be6765b74a80bbf12c48f4a589c0eb92e","337759a94d7d52e773cebe183b9fc55d3bb31cf1b648facdc085192e3818de93"]}

Task reconciliation: expected 9; terminal 9; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__254/run-0Jl7lm/terminal.json