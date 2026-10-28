# lean report: 6eda3b562ac0aa01704e1e9ca1cd25e15d944f16 → 3b6179d3854b3bbbf8ac226899db7a64de5cfadb

Identity: 319ac1cf13b7fcc023381db6fed73259d79c313334f2697cc6d565f042cb7b5e; lean 815fc01fec5f51af99003faa686f25330e7c33ad

24 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 24 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/config/config-rule.js | `(edit 9a5bcf1f45d0)` (226-226) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit 68e6c69dde8f)` (226-226) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit baef9eb87cfc)` (261-261) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit b27067af9f30)` (263-263) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit cb6b0391a566)` (264-264) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit 1eda64f16808)` (274-274) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit 64ba9ff5517a)` (277-277) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit 56a5f652f7c9)` (277-277) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit 85d180fa644c)` (278-278) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit ba143dff0c47)` (279-279) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit 6f8402566306)` (280-280) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit eeaefdb7b898)` (281-281) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit 884be689cb2f)` (280-280) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit 5391b46a827a)` (281-281) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit b0fe5bf7016a)` (282-282) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit fa39ec517066)` (283-283) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit aa65d9059b42)` (283-283) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit 1281c8bef99d)` (285-285) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit 4390d8c1df56)` (286-286) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit d755c3e265d7)` (285-285) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit 30fba4030f9c)` (288-288) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit 4a6a1a4abf04)` (289-289) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit ee06498ccff2)` (287-287) | **ASK** | artifact:config |  |  | config |
| lib/config/config-rule.js | `(edit 46cf2326cd27)` (291-291) | **ASK** | artifact:config |  |  | config |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 24 = 0 unit + 24 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 9a5bcf1f45d0669ce1ef1a7821e8c6186cf89920d68f65e8cac7637b447d47a5 | lib/config/config-rule.js | text | 226+1 | 226+0 | artifact: config |  |
| 68e6c69dde8fce9c2265f78ca8fd689cc1e96f7d5c0b4c91ffdc1db32ddadb89 | lib/config/config-rule.js | text | 226+0 | 226+1 | artifact: config |  |
| baef9eb87cfcceee7630d05431ab81c2cda930e72ef7cdfe360a0518614d5234 | lib/config/config-rule.js | text | 260+0 | 261+1 | artifact: config | new:RuleConfigSet.addObject |
| b27067af9f3009fc9069e922768c8eb35191dce4e6e59798b985f4adff10e2cc | lib/config/config-rule.js | text | 261+0 | 263+1 | artifact: config | new:RuleConfigSet.addObject |
| cb6b0391a56668acc0889e9ecfeea16886ab6a7a84cc0a81b96aec96e541f865 | lib/config/config-rule.js | text | 261+0 | 264+1 | artifact: config | new:RuleConfigSet.addObject |
| 1eda64f1680863402146706f37429582178add8bbf7dcd80883cf881b38bc2ff | lib/config/config-rule.js | text | 274+1 | 277+0 | artifact: config | old:generateConfigsFromSchema |
| 64ba9ff5517a599eaa1844e080f529be3a32453043ce9b2db6fce01eca801896 | lib/config/config-rule.js | text | 274+0 | 277+1 | artifact: config | new:generateConfigsFromSchema |
| 56a5f652f7c9cf75f154ae9801774d0677e9f68f13c07ec27f0fe157627ec4e3 | lib/config/config-rule.js | text | 277+1 | 280+0 | artifact: config | old:generateConfigsFromSchema |
| 85d180fa644c699656d4657da51ffbbe17f510f346b131267a1c9ce4af51038c | lib/config/config-rule.js | text | 278+1 | 280+0 | artifact: config | old:generateConfigsFromSchema |
| ba143dff0c47a9a52a8296a69972becdce096625f48b644aae9bff3aff171a59 | lib/config/config-rule.js | text | 279+1 | 280+0 | artifact: config | old:generateConfigsFromSchema |
| 6f8402566306363aca77ad401217563623848c4a2e8d56c72944958969684ac2 | lib/config/config-rule.js | text | 280+1 | 280+0 | artifact: config | old:generateConfigsFromSchema |
| eeaefdb7b898282fde2d796d28b36c5762f0a65364163a1dcbec3803b61f1009 | lib/config/config-rule.js | text | 281+1 | 280+0 | artifact: config | old:generateConfigsFromSchema |
| 884be689cb2f0e64f527dde41c21ff7d7bd004f511d0f74f824eca689d987c9a | lib/config/config-rule.js | text | 277+0 | 280+1 | artifact: config | new:generateConfigsFromSchema |
| 5391b46a827ace8b229607e162b5ccf33d48bdfe3985ba715344f260d9e9ad94 | lib/config/config-rule.js | text | 277+0 | 281+1 | artifact: config | new:generateConfigsFromSchema |
| b0fe5bf7016a45f0050c62fe86a46e3df9ea6a6f0a396dcfc49147a74edcdb69 | lib/config/config-rule.js | text | 277+0 | 282+1 | artifact: config | new:generateConfigsFromSchema |
| fa39ec517066f87b4d17c2f4049a4c002bafec715f8b31d05c040ffb54ff87e5 | lib/config/config-rule.js | text | 277+0 | 283+1 | artifact: config | new:generateConfigsFromSchema |
| aa65d9059b4289cdf4b7fd0ff3934d0c5b6787a98ba7164f6be62d8057da977d | lib/config/config-rule.js | text | 283+1 | 285+0 | artifact: config | old:generateConfigsFromSchema |
| 1281c8bef99d51e03352e1cdbaaf5409b4887a055cd45c664463e05f0c64e46c | lib/config/config-rule.js | text | 283+0 | 285+1 | artifact: config | new:generateConfigsFromSchema |
| 4390d8c1df560051d5800d8bf482011a7d7373655e021f7b067e3a137095a404 | lib/config/config-rule.js | text | 283+0 | 286+1 | artifact: config | new:generateConfigsFromSchema |
| d755c3e265d780a65016c1cd71ff9eeea34debc6fca17360402d05f95f466f03 | lib/config/config-rule.js | text | 285+1 | 288+0 | artifact: config | old:generateConfigsFromSchema |
| 30fba4030f9ca8cdf84eba40a6c4308a078ccae157eebe59519837d4a2b2288a | lib/config/config-rule.js | text | 285+0 | 288+1 | artifact: config | new:generateConfigsFromSchema |
| 4a6a1a4abf04df2ee73d940fc31e3f735f404bc4ba349d7b957c56155b679916 | lib/config/config-rule.js | text | 285+0 | 289+1 | artifact: config | new:generateConfigsFromSchema |
| ee06498ccff242afcd5f1a73010522dac16edf60a456ea9c5685a5e7abb058bd | lib/config/config-rule.js | text | 287+1 | 291+0 | artifact: config | old:generateConfigsFromSchema |
| 46cf2326cd278512607cd79f7698fe3145742a9980ed09ad47e846d49a907790 | lib/config/config-rule.js | text | 287+0 | 291+1 | artifact: config | new:generateConfigsFromSchema |

config: {"unit":[],"artifact":["9a5bcf1f45d0669ce1ef1a7821e8c6186cf89920d68f65e8cac7637b447d47a5","68e6c69dde8fce9c2265f78ca8fd689cc1e96f7d5c0b4c91ffdc1db32ddadb89","baef9eb87cfcceee7630d05431ab81c2cda930e72ef7cdfe360a0518614d5234","b27067af9f3009fc9069e922768c8eb35191dce4e6e59798b985f4adff10e2cc","cb6b0391a56668acc0889e9ecfeea16886ab6a7a84cc0a81b96aec96e541f865","1eda64f1680863402146706f37429582178add8bbf7dcd80883cf881b38bc2ff","64ba9ff5517a599eaa1844e080f529be3a32453043ce9b2db6fce01eca801896","56a5f652f7c9cf75f154ae9801774d0677e9f68f13c07ec27f0fe157627ec4e3","85d180fa644c699656d4657da51ffbbe17f510f346b131267a1c9ce4af51038c","ba143dff0c47a9a52a8296a69972becdce096625f48b644aae9bff3aff171a59","6f8402566306363aca77ad401217563623848c4a2e8d56c72944958969684ac2","eeaefdb7b898282fde2d796d28b36c5762f0a65364163a1dcbec3803b61f1009","884be689cb2f0e64f527dde41c21ff7d7bd004f511d0f74f824eca689d987c9a","5391b46a827ace8b229607e162b5ccf33d48bdfe3985ba715344f260d9e9ad94","b0fe5bf7016a45f0050c62fe86a46e3df9ea6a6f0a396dcfc49147a74edcdb69","fa39ec517066f87b4d17c2f4049a4c002bafec715f8b31d05c040ffb54ff87e5","aa65d9059b4289cdf4b7fd0ff3934d0c5b6787a98ba7164f6be62d8057da977d","1281c8bef99d51e03352e1cdbaaf5409b4887a055cd45c664463e05f0c64e46c","4390d8c1df560051d5800d8bf482011a7d7373655e021f7b067e3a137095a404","d755c3e265d780a65016c1cd71ff9eeea34debc6fca17360402d05f95f466f03","30fba4030f9ca8cdf84eba40a6c4308a078ccae157eebe59519837d4a2b2288a","4a6a1a4abf04df2ee73d940fc31e3f735f404bc4ba349d7b957c56155b679916","ee06498ccff242afcd5f1a73010522dac16edf60a456ea9c5685a5e7abb058bd","46cf2326cd278512607cd79f7698fe3145742a9980ed09ad47e846d49a907790"],"unassigned":[]}

Task reconciliation: expected 24; terminal 24; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__273/run-De3Iyc/terminal.json