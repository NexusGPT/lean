# lean report: a421897db7d1d2f0f5fe3f5c39d0eb5b7657b3cd → 5c6506f28320d81f421ecad40e14cba39189a962

Identity: 0cbf9b1ec31afcd61aa3c9c6539fc5b99150f99f73b29639b493f36182f9c8bf; lean 815fc01fec5f51af99003faa686f25330e7c33ad

11 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 11 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/padded-blocks.js | `(edit e7e35946a085)` (191-191) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/padded-blocks.js | `(edit d2e02c49ad43)` (192-192) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/padded-blocks.js | `(edit 98655ee8f8bc)` (193-193) | **ASK** | unassigned:comment |  |  | comment |
| lib/util/source-code-fixer.js | `(edit 235bdaa1918a)` (111-111) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/util/source-code-fixer.js | `(edit b7686b2ec947)` (111-111) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/util/source-code-fixer.js | `(edit 99391753378d)` (112-112) | **ASK** | unassigned:comment |  |  | comment |
| lib/util/source-code-fixer.js | `(edit 9545f0fd1319)` (113-113) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/util/source-code-fixer.js | `(edit 28fb64457d1d)` (114-114) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/util/source-code-fixer.js | `(edit 63fe6cccde55)` (115-115) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/util/source-code-fixer.js | `(edit 74ddeb35b626)` (116-116) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/util/source-code-fixer.js | `(edit b8a9305d14c3)` (117-117) | **ASK** | unassigned:module-level statement |  |  | module-level statement |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 11 = 0 unit + 0 artifact + 11 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| e7e35946a08574184802a13a29cbcea5bc3d70b0e3ef2ce74a48cf4035adf376 | lib/rules/padded-blocks.js | text | 190+0 | 191+1 | unassigned: whitespace |  |
| d2e02c49ad43cd812af8e3a6489aa2ccdc504068d743fe429ff35094de86551e | lib/rules/padded-blocks.js | text | 190+0 | 192+1 | unassigned: comment |  |
| 98655ee8f8bc77513ee3ec7dc98ee44e89f6614bf7629a68489c87f927d8e694 | lib/rules/padded-blocks.js | text | 190+0 | 193+1 | unassigned: comment |  |
| 235bdaa1918aa883c32503f805f3dd87965352ed811ca825df8a5c2efcb3d67b | lib/util/source-code-fixer.js | text | 111+1 | 111+0 | unassigned: module-level statement |  |
| b7686b2ec94726077826a8771ea07edde248d6cd692236b77c09fbf84b9552da | lib/util/source-code-fixer.js | text | 111+0 | 111+1 | unassigned: whitespace |  |
| 99391753378d1fada705db5a885d0600368769b2abcfe0f54b1461943d984281 | lib/util/source-code-fixer.js | text | 111+0 | 112+1 | unassigned: comment |  |
| 9545f0fd1319c8135b70e7041eb55b24361b172c62c768e6dd9ca9e44ea6c400 | lib/util/source-code-fixer.js | text | 111+0 | 113+1 | unassigned: module-level statement |  |
| 28fb64457d1de92ace322de5b493cfaf8c3abecea5ae16bbf552cbfa3aeb5446 | lib/util/source-code-fixer.js | text | 111+0 | 114+1 | unassigned: module-level statement |  |
| 63fe6cccde5578e8ea1f49167bf48ba1dff6ce6955222a69b249d4cb94cad478 | lib/util/source-code-fixer.js | text | 111+0 | 115+1 | unassigned: module-level statement |  |
| 74ddeb35b6262f59c8cb4e4362fd84afcdc0e58734104e15b436d8dd964fe112 | lib/util/source-code-fixer.js | text | 111+0 | 116+1 | unassigned: module-level statement |  |
| b8a9305d14c35935d7361232164ec662b8f1a1173ac65f0c52674bc59a1898bf | lib/util/source-code-fixer.js | text | 111+0 | 117+1 | unassigned: module-level statement |  |

source: {"unit":[],"artifact":[],"unassigned":["e7e35946a08574184802a13a29cbcea5bc3d70b0e3ef2ce74a48cf4035adf376","d2e02c49ad43cd812af8e3a6489aa2ccdc504068d743fe429ff35094de86551e","98655ee8f8bc77513ee3ec7dc98ee44e89f6614bf7629a68489c87f927d8e694","235bdaa1918aa883c32503f805f3dd87965352ed811ca825df8a5c2efcb3d67b","b7686b2ec94726077826a8771ea07edde248d6cd692236b77c09fbf84b9552da","99391753378d1fada705db5a885d0600368769b2abcfe0f54b1461943d984281","9545f0fd1319c8135b70e7041eb55b24361b172c62c768e6dd9ca9e44ea6c400","28fb64457d1de92ace322de5b493cfaf8c3abecea5ae16bbf552cbfa3aeb5446","63fe6cccde5578e8ea1f49167bf48ba1dff6ce6955222a69b249d4cb94cad478","74ddeb35b6262f59c8cb4e4362fd84afcdc0e58734104e15b436d8dd964fe112","b8a9305d14c35935d7361232164ec662b8f1a1173ac65f0c52674bc59a1898bf"]}

Task reconciliation: expected 11; terminal 11; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__333/run-0bghd1/terminal.json