# lean report: 263b7782438899240548d0020cf9a49c2bbe2b5c → b6052e52d113b1b7a6924a6ecee7754d55c135bc

Identity: f639cb4043b52a746bc3b4d15f551e732f64ab9d6c0881ea088a4bae69ff98e9; lean 815fc01fec5f51af99003faa686f25330e7c33ad

1 changed function(s): **0 in scope · 1 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/prefer-template.js | `hasNonLiteral` (30-38) | **WITNESS** | checked | WITNESS |  | input 0: trace; lib/rules/prefer-template.js:37 |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 5 = 5 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| b80a3d54c791d4717621051371ab53bc17542a1e8a6b73b65c2fb82e45fb9c37 | lib/rules/prefer-template.js | text | 34+1 | 34+0 | unit: hasNonLiteral | old:hasNonLiteral |
| 20e4f32ae0ae16be953cf88c2393de92ff1da012f7aefd36a5a51b089c7bc178 | lib/rules/prefer-template.js | text | 34+0 | 34+1 | unit: hasNonLiteral | new:hasNonLiteral |
| d1ac8cdd89a45cbbea13dc1697cd5d3f154368f35d22d94145046248ba82b25f | lib/rules/prefer-template.js | text | 34+0 | 35+1 | unit: hasNonLiteral | new:hasNonLiteral |
| 96a3fcf1375fbbcb307157920d5b0b5510c6cbdfa348448c51eb560d2d70efbc | lib/rules/prefer-template.js | text | 34+0 | 36+1 | unit: hasNonLiteral | new:hasNonLiteral |
| ebc8fd734a23b2cc9e05312cd9f3175f4094a6b3a89d0c6f301d8aac957beeba | lib/rules/prefer-template.js | text | 34+0 | 37+1 | unit: hasNonLiteral | new:hasNonLiteral |

source: {"unit":["b80a3d54c791d4717621051371ab53bc17542a1e8a6b73b65c2fb82e45fb9c37","20e4f32ae0ae16be953cf88c2393de92ff1da012f7aefd36a5a51b089c7bc178","d1ac8cdd89a45cbbea13dc1697cd5d3f154368f35d22d94145046248ba82b25f","96a3fcf1375fbbcb307157920d5b0b5510c6cbdfa348448c51eb560d2d70efbc","ebc8fd734a23b2cc9e05312cd9f3175f4094a6b3a89d0c6f301d8aac957beeba"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 1; terminal 1; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__3/run-PYxqDv/terminal.json