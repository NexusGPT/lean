# lean report: ed7f966a31c448a62a1414f26196b342631925bb → 1f8a0728229397f32380a8ee38ed9fab7ed4daed

Identity: c17132401bebeb9830f06ef91e85bfdd79dd7278b68d1b2aa26a19091e26b293; lean 815fc01fec5f51af99003faa686f25330e7c33ad

12 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 12 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/v1/decoder.js | `(edit 3ac401f259d8)` (421-421) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v1/decoder.js | `(edit f80cfb48a26b)` (430-430) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v1/decoder.js | `(edit 52752ecc6a67)` (431-431) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v1/decoder.js | `(edit e5f1d520834d)` (429-429) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v2/decoder.js | `(edit d8ed63f46f02)` (728-728) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v2/decoder.js | `(edit 8a28b1a5b9f9)` (733-733) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v2/decoder.js | `(edit 0ca45e12a011)` (734-734) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/v2/decoder.js | `(edit ead36a82c8dd)` (735-735) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v2/decoder.js | `(edit 27d135328549)` (736-736) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v2/decoder.js | `(edit 430981bba0b0)` (737-737) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v2/decoder.js | `(edit 27cbe40dbfee)` (732-732) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/v2/decoder.js | `(edit 5708acf111b6)` (733-733) | **ASK** | unassigned:module-level statement |  |  | module-level statement |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 12 = 0 unit + 0 artifact + 12 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 3ac401f259d872a79204be0ff91e53861650a08741cce94be4cf122bfe844953 | lib/v1/decoder.js | text | 421+1 | 420+0 | unassigned: module-level statement |  |
| f80cfb48a26b11d6b905981da13129158976d92f9946b2c825c2bd5ae9933f00 | lib/v1/decoder.js | text | 430+1 | 429+0 | unassigned: module-level statement |  |
| 52752ecc6a674e9de1cf0aa737330f1696a36ec31622b80ef59dd8b62f34e254 | lib/v1/decoder.js | text | 431+1 | 429+0 | unassigned: module-level statement |  |
| e5f1d520834de0dbf26524375a17c30a28c43902250edda7b82cf7aab1377bac | lib/v1/decoder.js | text | 430+0 | 429+1 | unassigned: module-level statement |  |
| d8ed63f46f028606218ef84c7710e6cab5c28708b4e1ffd7fea44421cc72b8d8 | lib/v2/decoder.js | text | 728+1 | 727+0 | unassigned: module-level statement |  |
| 8a28b1a5b9f9c210b84412b234c619c31da3c6cb573df37f3eb6f72e5d7c8b86 | lib/v2/decoder.js | text | 733+1 | 732+0 | unassigned: module-level statement |  |
| 0ca45e12a01103923566c2381a88c386fd3d8f008335111b8ec916588855b846 | lib/v2/decoder.js | text | 734+1 | 732+0 | unassigned: whitespace |  |
| ead36a82c8dd37782273262b1166b11e67a45164a7bb0d5d12034277e8026569 | lib/v2/decoder.js | text | 735+1 | 732+0 | unassigned: module-level statement |  |
| 27d135328549ea113a26a18ad30cfa39e5ab58ca08009ff27350acf529936b70 | lib/v2/decoder.js | text | 736+1 | 732+0 | unassigned: module-level statement |  |
| 430981bba0b0adefbb8f08ad35f4e14c08956f78035703d4bfc4df4341d24597 | lib/v2/decoder.js | text | 737+1 | 732+0 | unassigned: module-level statement |  |
| 27cbe40dbfee451c717584dbeac5b93db789cd6db4259e6c0b473876563b3007 | lib/v2/decoder.js | text | 733+0 | 732+1 | unassigned: whitespace |  |
| 5708acf111b65f83a663f37a96eacb18dfd81f40b208546d593641f66308bf9c | lib/v2/decoder.js | text | 733+0 | 733+1 | unassigned: module-level statement |  |

source: {"unit":[],"artifact":[],"unassigned":["3ac401f259d872a79204be0ff91e53861650a08741cce94be4cf122bfe844953","f80cfb48a26b11d6b905981da13129158976d92f9946b2c825c2bd5ae9933f00","52752ecc6a674e9de1cf0aa737330f1696a36ec31622b80ef59dd8b62f34e254","e5f1d520834de0dbf26524375a17c30a28c43902250edda7b82cf7aab1377bac","d8ed63f46f028606218ef84c7710e6cab5c28708b4e1ffd7fea44421cc72b8d8","8a28b1a5b9f9c210b84412b234c619c31da3c6cb573df37f3eb6f72e5d7c8b86","0ca45e12a01103923566c2381a88c386fd3d8f008335111b8ec916588855b846","ead36a82c8dd37782273262b1166b11e67a45164a7bb0d5d12034277e8026569","27d135328549ea113a26a18ad30cfa39e5ab58ca08009ff27350acf529936b70","430981bba0b0adefbb8f08ad35f4e14c08956f78035703d4bfc4df4341d24597","27cbe40dbfee451c717584dbeac5b93db789cd6db4259e6c0b473876563b3007","5708acf111b65f83a663f37a96eacb18dfd81f40b208546d593641f66308bf9c"]}

Task reconciliation: expected 12; terminal 12; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__hessian.js__2/run-HgBxfx/terminal.json