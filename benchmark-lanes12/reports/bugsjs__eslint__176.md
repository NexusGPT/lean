# lean report: 3767cda2f58472ed3397ac188a71262a7b111c4b → 04776ce91bd9ea02438be9e58f97e45187913218

Identity: 1126da24255d039ba1e8a15d1957c5fefc696323b4449e360e28ffcf41b7eeec; lean 815fc01fec5f51af99003faa686f25330e7c33ad

10 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 10 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/indent.js | `(edit f6b0f5e0ca71)` (1033-1033) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit d7a9fb2b9a7f)` (1033-1033) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 4aadc1134a69)` (1328-1328) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit b2d0092fda77)` (1328-1328) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit e2dd4175b35d)` (1331-1331) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 822d3b67b6b8)` (1332-1332) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 1edcf48a627d)` (1333-1333) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 89d34b7efa79)` (1331-1331) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit e44c699d6647)` (1332-1332) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 3d829ac77729)` (1333-1333) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 10 = 0 unit + 0 artifact + 10 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| f6b0f5e0ca716c33d9b1c9db3617729c96bc4dbecd088d1b210bfdfd7df2f984 | lib/rules/indent.js | text | 1033+1 | 1033+0 | unassigned: object-literal member |  |
| d7a9fb2b9a7f69594ca44a5c9e7cd60717a6e103481c6690904cec8235c6cf3e | lib/rules/indent.js | text | 1033+0 | 1033+1 | unassigned: object-literal member |  |
| 4aadc1134a69c7f26b899208e619970e3147c060f69da6acd3ba436beee691b0 | lib/rules/indent.js | text | 1328+1 | 1328+0 | unassigned: object-literal member |  |
| b2d0092fda77eae42d87c90c3e5c9952836a94160b8a7e867a6d52d01986ac69 | lib/rules/indent.js | text | 1328+0 | 1328+1 | unassigned: object-literal member |  |
| e2dd4175b35dd6365617eeaf5b1d83bdb5954676d84e830977a5d3d1afa32bdc | lib/rules/indent.js | text | 1331+1 | 1331+0 | unassigned: object-literal member |  |
| 822d3b67b6b81ffea63d713f4dbeccb3236f765e2c5e68df697c358a378e3e15 | lib/rules/indent.js | text | 1332+1 | 1331+0 | unassigned: object-literal member |  |
| 1edcf48a627d73044ce9352270ed9c5758425495c899e2445274bce94644cae9 | lib/rules/indent.js | text | 1333+1 | 1331+0 | unassigned: object-literal member |  |
| 89d34b7efa79385389d4f5107e6a2c3d95c904e6f42c8b58120b5c538b43c521 | lib/rules/indent.js | text | 1331+0 | 1331+1 | unassigned: object-literal member |  |
| e44c699d6647437fee05a9698fd8aad0e1c1422e378998644204917bfd74e9ac | lib/rules/indent.js | text | 1331+0 | 1332+1 | unassigned: object-literal member |  |
| 3d829ac77729505ec0ded1e6a0a0ef0d7a406c904e9710c53930f29063cbc4d5 | lib/rules/indent.js | text | 1331+0 | 1333+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["f6b0f5e0ca716c33d9b1c9db3617729c96bc4dbecd088d1b210bfdfd7df2f984","d7a9fb2b9a7f69594ca44a5c9e7cd60717a6e103481c6690904cec8235c6cf3e","4aadc1134a69c7f26b899208e619970e3147c060f69da6acd3ba436beee691b0","b2d0092fda77eae42d87c90c3e5c9952836a94160b8a7e867a6d52d01986ac69","e2dd4175b35dd6365617eeaf5b1d83bdb5954676d84e830977a5d3d1afa32bdc","822d3b67b6b81ffea63d713f4dbeccb3236f765e2c5e68df697c358a378e3e15","1edcf48a627d73044ce9352270ed9c5758425495c899e2445274bce94644cae9","89d34b7efa79385389d4f5107e6a2c3d95c904e6f42c8b58120b5c538b43c521","e44c699d6647437fee05a9698fd8aad0e1c1422e378998644204917bfd74e9ac","3d829ac77729505ec0ded1e6a0a0ef0d7a406c904e9710c53930f29063cbc4d5"]}

Task reconciliation: expected 10; terminal 10; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__176/run-OB7v1N/terminal.json