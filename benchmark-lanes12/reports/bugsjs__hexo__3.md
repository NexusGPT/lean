# lean report: 7c7674ef214ae4217991b2dce13421e057721133 → 7cf6ce477709590a0f75e5ba2b7f29424cb6db91

Identity: 3eea667b22ac2247bdd4fcfc41deee661d117660003d505903978be52a9ba4b9; lean 815fc01fec5f51af99003faa686f25330e7c33ad

8 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 8 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/plugins/helper/is.js | `(edit cd09bf38e5ed)` (25-25) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (module-level statement) |
| lib/plugins/helper/is.js | `(edit 6c97db5ebbc6)` (26-26) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (whitespace) |
| lib/plugins/helper/is.js | `(edit 12148f719584)` (26-26) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (module-level statement) |
| lib/plugins/helper/is.js | `(edit 2a6efd9be904)` (28-28) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (module-level statement) |
| lib/plugins/helper/is.js | `(edit dcfcc55f16ae)` (32-32) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (module-level statement) |
| lib/plugins/helper/is.js | `(edit 8c0415f17506)` (34-34) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (module-level statement) |
| lib/plugins/helper/is.js | `(edit 71085232e649)` (35-35) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (module-level statement) |
| lib/plugins/helper/is.js | `(edit 431042379920)` (37-37) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (module-level statement) |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 8 = 0 unit + 0 artifact + 8 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| cd09bf38e5eddf5b71376cc3dc6eaac904e42b178258c74c21d01569a5769e63 | lib/plugins/helper/is.js | text | 24+0 | 25+1 | unassigned: untyped JavaScript file | new:isHomeHelper |
| 6c97db5ebbc6b45d95b99345c181c083456b062966ba774dac6ba70289162d82 | lib/plugins/helper/is.js | text | 24+0 | 26+1 | unassigned: untyped JavaScript file | new:isHomeHelper |
| 12148f7195846acace983da39a4791565584aad114338a3a646b66b0c1588722 | lib/plugins/helper/is.js | text | 26+1 | 28+0 | unassigned: untyped JavaScript file | old:isHomeHelper |
| 2a6efd9be9046da016f2d5666f1de8d3d3fa300da69ec6205b2a092a6c048105 | lib/plugins/helper/is.js | text | 26+0 | 28+1 | unassigned: untyped JavaScript file | new:isHomeHelper |
| dcfcc55f16ae4984ad8aa7c0cf6ed77156362b7748b2ffb50a710b0447860483 | lib/plugins/helper/is.js | text | 32+1 | 34+0 | unassigned: untyped JavaScript file | old:isHomeHelper |
| 8c0415f1750609fc07a306340631c3db1bab9482581a1786819a9d5155ed9e8e | lib/plugins/helper/is.js | text | 32+0 | 34+1 | unassigned: untyped JavaScript file | new:isHomeHelper |
| 71085232e649071c219a9d014dd49f09843a4295248e698a34eab7dd3cc0fd55 | lib/plugins/helper/is.js | text | 35+1 | 37+0 | unassigned: untyped JavaScript file | old:isHomeHelper |
| 43104237992036af479e0c8db2510ce3ca51084aa7a974590e1e789af1a4c54d | lib/plugins/helper/is.js | text | 35+0 | 37+1 | unassigned: untyped JavaScript file | new:isHomeHelper |

source: {"unit":[],"artifact":[],"unassigned":["cd09bf38e5eddf5b71376cc3dc6eaac904e42b178258c74c21d01569a5769e63","6c97db5ebbc6b45d95b99345c181c083456b062966ba774dac6ba70289162d82","12148f7195846acace983da39a4791565584aad114338a3a646b66b0c1588722","2a6efd9be9046da016f2d5666f1de8d3d3fa300da69ec6205b2a092a6c048105","dcfcc55f16ae4984ad8aa7c0cf6ed77156362b7748b2ffb50a710b0447860483","8c0415f1750609fc07a306340631c3db1bab9482581a1786819a9d5155ed9e8e","71085232e649071c219a9d014dd49f09843a4295248e698a34eab7dd3cc0fd55","43104237992036af479e0c8db2510ce3ca51084aa7a974590e1e789af1a4c54d"]}

Task reconciliation: expected 8; terminal 8; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__hexo__3/run-fG9sGv/terminal.json