# lean report: b938f1f81c7ef809697f9b2026e5a134cf1fd218 → 978d9c469e835f1749220462d89d0bdd3f9a01ba

Identity: b57c1970020c0517366bfa28fb2540f343d1dbb88573e4a4b51c971b3716c466; lean 815fc01fec5f51af99003faa686f25330e7c33ad

10 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 10 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/consistent-return.js | `isClassConstructor` (41-46) | **ASK** | failed:loader | ASK |  | /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean |
| lib/rules/consistent-return.js | `(edit 99cdadf1614b)` (36-36) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/consistent-return.js | `(edit 699dc586e317)` (37-37) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/consistent-return.js | `(edit baec30c5c5fe)` (38-38) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/consistent-return.js | `(edit 9c0e86cead6a)` (39-39) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/consistent-return.js | `(edit bda6ebd02f84)` (40-40) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/consistent-return.js | `(edit a459b552caf1)` (47-47) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/consistent-return.js | `(edit ba9958b8ff09)` (80-80) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/consistent-return.js | `(edit f840432c2b3c)` (92-92) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/consistent-return.js | `(edit aa30b09e0f54)` (93-93) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 15 = 6 unit + 0 artifact + 9 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 99cdadf1614b56a8c72e770926065479128823bf7fd8c9b0b236814c06872e0a | lib/rules/consistent-return.js | text | 35+0 | 36+1 | unassigned: comment |  |
| 699dc586e317002f6979d05b708292cc825b3c15d92df7ee68e70c9eef14c059 | lib/rules/consistent-return.js | text | 35+0 | 37+1 | unassigned: module-level statement |  |
| baec30c5c5fe9b298da073a308ecf87d9b3523646a4f8c2254829427eda41f29 | lib/rules/consistent-return.js | text | 35+0 | 38+1 | unassigned: module-level statement |  |
| 9c0e86cead6a1adc8b8b8f80d2f21ffdf39038fc5488902d11d215548c3473d4 | lib/rules/consistent-return.js | text | 35+0 | 39+1 | unassigned: module-level statement |  |
| bda6ebd02f844b02b44c3e70ea972cc718dd240f0a7acf09ff74a2d14baa2815 | lib/rules/consistent-return.js | text | 35+0 | 40+1 | unassigned: module-level statement |  |
| 5ae9d345f46363546da6550049c406185ee637cd1b999abba115db76a1773693 | lib/rules/consistent-return.js | text | 35+0 | 41+1 | unit: isClassConstructor | new:isClassConstructor |
| 073ae3fb58957797c348014d6fb1a0bf8c3e8bec9c32ae3aa313fba605479791 | lib/rules/consistent-return.js | text | 35+0 | 42+1 | unit: isClassConstructor | new:isClassConstructor |
| 2050ecdfca14dc83f82531d7f19f9540225414d0fd3d1e77c357bd5566ef6e1c | lib/rules/consistent-return.js | text | 35+0 | 43+1 | unit: isClassConstructor | new:isClassConstructor |
| 72a985fbad2434b6df39ef71ef933ed37dc19e2b760701de3b2caa17f95b0d6e | lib/rules/consistent-return.js | text | 35+0 | 44+1 | unit: isClassConstructor | new:isClassConstructor |
| 4fa14cdf253c0b00d7867700ac09f87680d5c9346eef2c5799e3dab612276b4d | lib/rules/consistent-return.js | text | 35+0 | 45+1 | unit: isClassConstructor | new:isClassConstructor |
| c1fe0c03868dd40245b25db65c2e11ec3eaeb77102256d6a1a0ad79f66a04d43 | lib/rules/consistent-return.js | text | 35+0 | 46+1 | unit: isClassConstructor | new:isClassConstructor |
| a459b552caf1de0c90c9bc72771f7c1179f8cfab1b8c872e1859810b18301d7e | lib/rules/consistent-return.js | text | 35+0 | 47+1 | unassigned: whitespace |  |
| ba9958b8ff09323487f44c6b225bbafa12f9f80c36d08b48365b360dabafef75 | lib/rules/consistent-return.js | text | 80+1 | 92+0 | unassigned: object-literal member |  |
| f840432c2b3cf480f7d558983ceb505a183ed68445c73e2b76daf9e646ca450e | lib/rules/consistent-return.js | text | 80+0 | 92+1 | unassigned: object-literal member |  |
| aa30b09e0f54e7ace081d67818a326b05f0fb9b6e913bec914a7dfd76ee21adc | lib/rules/consistent-return.js | text | 80+0 | 93+1 | unassigned: object-literal member |  |

source: {"unit":["5ae9d345f46363546da6550049c406185ee637cd1b999abba115db76a1773693","073ae3fb58957797c348014d6fb1a0bf8c3e8bec9c32ae3aa313fba605479791","2050ecdfca14dc83f82531d7f19f9540225414d0fd3d1e77c357bd5566ef6e1c","72a985fbad2434b6df39ef71ef933ed37dc19e2b760701de3b2caa17f95b0d6e","4fa14cdf253c0b00d7867700ac09f87680d5c9346eef2c5799e3dab612276b4d","c1fe0c03868dd40245b25db65c2e11ec3eaeb77102256d6a1a0ad79f66a04d43"],"artifact":[],"unassigned":["99cdadf1614b56a8c72e770926065479128823bf7fd8c9b0b236814c06872e0a","699dc586e317002f6979d05b708292cc825b3c15d92df7ee68e70c9eef14c059","baec30c5c5fe9b298da073a308ecf87d9b3523646a4f8c2254829427eda41f29","9c0e86cead6a1adc8b8b8f80d2f21ffdf39038fc5488902d11d215548c3473d4","bda6ebd02f844b02b44c3e70ea972cc718dd240f0a7acf09ff74a2d14baa2815","a459b552caf1de0c90c9bc72771f7c1179f8cfab1b8c872e1859810b18301d7e","ba9958b8ff09323487f44c6b225bbafa12f9f80c36d08b48365b360dabafef75","f840432c2b3cf480f7d558983ceb505a183ed68445c73e2b76daf9e646ca450e","aa30b09e0f54e7ace081d67818a326b05f0fb9b6e913bec914a7dfd76ee21adc"]}

Task reconciliation: expected 10; terminal 10; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__55/run-ECMTrr/terminal.json