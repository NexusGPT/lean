# lean report: 3b11d3f1b39801019acd236639a656f8db07c251 → 623836c8c770421d9c396746db59ba37aa2ce9c7

Identity: c9627e21e647c28fff6efe81f67e8d17b0a7cf0229ff316158ed5251dfabbf87; lean 815fc01fec5f51af99003faa686f25330e7c33ad

3 changed function(s): **0 in scope · 1 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 2 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/comma-dangle.js | `isTrailingCommaAllowed` (22-27) | **WITNESS** | checked | WITNESS |  | input 1: trace; lib/rules/comma-dangle.js:23 |
| lib/rules/comma-dangle.js | `(edit 0c00b817ecfe)` (16-16) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/comma-dangle.js | `(edit 94d89c6e8b73)` (16-16) | **ASK** | unassigned:module-level statement |  |  | module-level statement |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 7 = 5 unit + 0 artifact + 2 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 0c00b817ecfe29d9c436adf3a423abb3ed181bac64c4c38e2f2af71e3e7dc9e8 | lib/rules/comma-dangle.js | text | 16+1 | 16+0 | unassigned: module-level statement |  |
| 94d89c6e8b733926df6f09a9fd65265854f996916489d7f6fb8d801fe4e9d4eb | lib/rules/comma-dangle.js | text | 16+0 | 16+1 | unassigned: module-level statement |  |
| 796557bf9db62a3c91a0026b93dbf9e20ab643f4c14ea1684220dd741abf2c2e | lib/rules/comma-dangle.js | text | 23+1 | 23+0 | unit: isTrailingCommaAllowed | old:isTrailingCommaAllowed |
| a28c0642a7ed39f5ef64214269ba1304935656b83a78cf5058b07cd370e4960b | lib/rules/comma-dangle.js | text | 23+0 | 23+1 | unit: isTrailingCommaAllowed | new:isTrailingCommaAllowed |
| 6e5847ee003650ee0cf7fbcd7a90b60b984b87d875e4281ee31bf8af532313c5 | lib/rules/comma-dangle.js | text | 23+0 | 24+1 | unit: isTrailingCommaAllowed | new:isTrailingCommaAllowed |
| 5132b7dd5cb8e30fc9ae8a5cd06115a72a15b635e21d774290e1020a1a8a7779 | lib/rules/comma-dangle.js | text | 23+0 | 25+1 | unit: isTrailingCommaAllowed | new:isTrailingCommaAllowed |
| 8ee08425104bf683fab0eac67595b9bb001209e8cb26bea7739f099fb6bf8f46 | lib/rules/comma-dangle.js | text | 23+0 | 26+1 | unit: isTrailingCommaAllowed | new:isTrailingCommaAllowed |

source: {"unit":["796557bf9db62a3c91a0026b93dbf9e20ab643f4c14ea1684220dd741abf2c2e","a28c0642a7ed39f5ef64214269ba1304935656b83a78cf5058b07cd370e4960b","6e5847ee003650ee0cf7fbcd7a90b60b984b87d875e4281ee31bf8af532313c5","5132b7dd5cb8e30fc9ae8a5cd06115a72a15b635e21d774290e1020a1a8a7779","8ee08425104bf683fab0eac67595b9bb001209e8cb26bea7739f099fb6bf8f46"],"artifact":[],"unassigned":["0c00b817ecfe29d9c436adf3a423abb3ed181bac64c4c38e2f2af71e3e7dc9e8","94d89c6e8b733926df6f09a9fd65265854f996916489d7f6fb8d801fe4e9d4eb"]}

Task reconciliation: expected 3; terminal 3; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__96/run-7xEQuw/terminal.json