# lean report: 1d6a9c0fac023a6220c9b8287a52d2321e653632 → 84d8f6739768afa1fd43f6c25aef1c690362cc85

Identity: aeb814a597214a5f3d1d189b33f0f0acb969acb269b825f42f93dc2f72a0f41a; lean 815fc01fec5f51af99003faa686f25330e7c33ad

10 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 10 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/formatters/junit.js | `(edit 397a9e0bf6a9)` (42-42) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/formatters/junit.js | `(edit 1f193ee633a7)` (43-43) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/formatters/junit.js | `(edit c85c173cba53)` (44-44) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/formatters/junit.js | `(edit 58eac598912c)` (45-45) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/formatters/junit.js | `(edit 573f3b4d7513)` (42-42) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/formatters/junit.js | `(edit 8a3a87d15612)` (60-60) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/formatters/junit.js | `(edit f37cb5261677)` (61-61) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/formatters/junit.js | `(edit d1506b644e41)` (62-62) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/formatters/junit.js | `(edit d92c91f2392d)` (63-63) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/formatters/junit.js | `(edit f2ce225c9619)` (57-57) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 10 = 0 unit + 0 artifact + 10 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 397a9e0bf6a94979435a5e213c84b29d0d72add16105f5c5bf7e1583750ebe33 | lib/formatters/junit.js | text | 42+1 | 42+0 | unassigned: exported property assignment |  |
| 1f193ee633a76ef4e915b6d7cef4698bdc4f9f718ec45e450bd5c466ba67cf4e | lib/formatters/junit.js | text | 43+1 | 42+0 | unassigned: exported property assignment |  |
| c85c173cba53498273e3cd25bc13c32a84864549455280e1c768bfd62685cdfa | lib/formatters/junit.js | text | 44+1 | 42+0 | unassigned: exported property assignment |  |
| 58eac598912cee516dbfe3569cae8fe96d8faee95463381c918767da62640c30 | lib/formatters/junit.js | text | 45+1 | 42+0 | unassigned: whitespace |  |
| 573f3b4d75133726081c49e700b6195ded84ef0e5414262bec42ad33911bc05e | lib/formatters/junit.js | text | 42+0 | 42+1 | unassigned: exported property assignment |  |
| 8a3a87d15612db4f73b686c69d663932131e79244a17df7daf5ab6222d0a30a7 | lib/formatters/junit.js | text | 60+1 | 57+0 | unassigned: whitespace |  |
| f37cb52616771d8d2689562b4ec252168541cfde3bd8f404b0a2f2733214d893 | lib/formatters/junit.js | text | 61+1 | 57+0 | unassigned: exported property assignment |  |
| d1506b644e4194b5011b46db4a8f23393d39734d574b70092722d7c9a9d7625e | lib/formatters/junit.js | text | 62+1 | 57+0 | unassigned: exported property assignment |  |
| d92c91f2392de0b88d49fc2fb62f0f88965417e3cb504a3b57b695919b537f94 | lib/formatters/junit.js | text | 63+1 | 57+0 | unassigned: exported property assignment |  |
| f2ce225c96192a9d61053512d4233372f9378ac46de41c3533c867debab6cef4 | lib/formatters/junit.js | text | 60+0 | 57+1 | unassigned: exported property assignment |  |

source: {"unit":[],"artifact":[],"unassigned":["397a9e0bf6a94979435a5e213c84b29d0d72add16105f5c5bf7e1583750ebe33","1f193ee633a76ef4e915b6d7cef4698bdc4f9f718ec45e450bd5c466ba67cf4e","c85c173cba53498273e3cd25bc13c32a84864549455280e1c768bfd62685cdfa","58eac598912cee516dbfe3569cae8fe96d8faee95463381c918767da62640c30","573f3b4d75133726081c49e700b6195ded84ef0e5414262bec42ad33911bc05e","8a3a87d15612db4f73b686c69d663932131e79244a17df7daf5ab6222d0a30a7","f37cb52616771d8d2689562b4ec252168541cfde3bd8f404b0a2f2733214d893","d1506b644e4194b5011b46db4a8f23393d39734d574b70092722d7c9a9d7625e","d92c91f2392de0b88d49fc2fb62f0f88965417e3cb504a3b57b695919b537f94","f2ce225c96192a9d61053512d4233372f9378ac46de41c3533c867debab6cef4"]}

Task reconciliation: expected 10; terminal 10; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__197/run-RAw0WG/terminal.json