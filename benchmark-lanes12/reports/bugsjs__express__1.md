# lean report: 3387916efcac19302188151a24927a0405a373e8 → d0035f14e8c4c66e439db2dd44a3d692cbace5d8

Identity: 4bc65c8928d1de623278adbbbb82e1f68d9fbadc477a66c06e365596fe46a696; lean 815fc01fec5f51af99003faa686f25330e7c33ad

5 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 5 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/router/index.js | `appendMethods` (496-503) | **ASK** | refused:var | ASK |  | /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean |
| lib/router/index.js | `(edit af469789e5fd)` (210-210) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit ef95f2ec763c)` (210-210) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit b50045ef00b5)` (495-495) | **ASK** | unassigned:comment |  |  | comment |
| lib/router/index.js | `(edit 13fa71ea01a8)` (504-504) | **ASK** | unassigned:whitespace |  |  | whitespace |

## What would make the asks provable

### lib/router/index.js · `appendMethods`

- line 497, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 498, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 12 = 8 unit + 0 artifact + 4 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| af469789e5fdbf5d62996eaae1b4031ac574c79082bafc26e3d0ed9ff626243f | lib/router/index.js | text | 210+1 | 210+0 | unassigned: module-level statement |  |
| ef95f2ec763c5e3c9211841a1769f653670e744e6ba7003b503318a18e931008 | lib/router/index.js | text | 210+0 | 210+1 | unassigned: module-level statement |  |
| b50045ef00b589868b67cf53fc385d61e8e86a6ed0af41c577e92f65cc8e5529 | lib/router/index.js | text | 494+0 | 495+1 | unassigned: comment |  |
| 1795c22e3f678d4514e039412484f7272f6e91d0ba979ae2779cc3ccac854341 | lib/router/index.js | text | 494+0 | 496+1 | unit: appendMethods | new:appendMethods |
| 1e4997119f738851507a21de69d705f45b707d21b92b61a06dd8c7d22dc255ba | lib/router/index.js | text | 494+0 | 497+1 | unit: appendMethods | new:appendMethods |
| d59f51d882e4e4fbe6d7bac7f1a27d85bc81190933324e092d6b0d7a3da410c4 | lib/router/index.js | text | 494+0 | 498+1 | unit: appendMethods | new:appendMethods |
| 87948d3b737b2e50c209c6162b78c1253eebe9d77023f541ef368c24b2ce3bb6 | lib/router/index.js | text | 494+0 | 499+1 | unit: appendMethods | new:appendMethods |
| 06890eb4986198061e5d32f4c2d7080a7f11278187a4b1075b0ca85a009e8a0d | lib/router/index.js | text | 494+0 | 500+1 | unit: appendMethods | new:appendMethods |
| 78a73d6c62d2082043c06aad634bb1e285e39070ef062621cfd7e396adcc037d | lib/router/index.js | text | 494+0 | 501+1 | unit: appendMethods | new:appendMethods |
| 4d6bd20433f21b7656516b78000e8e1894a34eaf468614722757f4f9b8475772 | lib/router/index.js | text | 494+0 | 502+1 | unit: appendMethods | new:appendMethods |
| 24a67116ef8e5aeecf379fa20088433722f39d82434d6edd22cee0e645d5307e | lib/router/index.js | text | 494+0 | 503+1 | unit: appendMethods | new:appendMethods |
| 13fa71ea01a8aa5c05f08f43c3b1794b756d0f976af0efa831f184fd5a86b21e | lib/router/index.js | text | 494+0 | 504+1 | unassigned: whitespace |  |

source: {"unit":["1795c22e3f678d4514e039412484f7272f6e91d0ba979ae2779cc3ccac854341","1e4997119f738851507a21de69d705f45b707d21b92b61a06dd8c7d22dc255ba","d59f51d882e4e4fbe6d7bac7f1a27d85bc81190933324e092d6b0d7a3da410c4","87948d3b737b2e50c209c6162b78c1253eebe9d77023f541ef368c24b2ce3bb6","06890eb4986198061e5d32f4c2d7080a7f11278187a4b1075b0ca85a009e8a0d","78a73d6c62d2082043c06aad634bb1e285e39070ef062621cfd7e396adcc037d","4d6bd20433f21b7656516b78000e8e1894a34eaf468614722757f4f9b8475772","24a67116ef8e5aeecf379fa20088433722f39d82434d6edd22cee0e645d5307e"],"artifact":[],"unassigned":["af469789e5fdbf5d62996eaae1b4031ac574c79082bafc26e3d0ed9ff626243f","ef95f2ec763c5e3c9211841a1769f653670e744e6ba7003b503318a18e931008","b50045ef00b589868b67cf53fc385d61e8e86a6ed0af41c577e92f65cc8e5529","13fa71ea01a8aa5c05f08f43c3b1794b756d0f976af0efa831f184fd5a86b21e"]}

Task reconciliation: expected 5; terminal 5; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__express__1/run-EPUmoZ/terminal.json