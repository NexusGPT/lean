# lean report: cd9b774b4893f9dc53c1e9e9158fbb0d67e93ef5 → fe73dd6d0eee214d395a79471e5e88a563e77921

Identity: 7485fe28044e475ee5d6c4744ca2461c1e645e92f0375a327c34bc2048fdf641; lean 815fc01fec5f51af99003faa686f25330e7c33ad

10 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 10 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/object-shorthand.js | `(edit 23f7bd67ddf9)` (233-233) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/object-shorthand.js | `(edit d36617876cad)` (233-233) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/object-shorthand.js | `(edit 6cc22b5177c4)` (234-234) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/object-shorthand.js | `(edit 54d7c31eff18)` (235-235) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/object-shorthand.js | `(edit 6f7fb3b404cb)` (236-236) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/object-shorthand.js | `(edit c0a48e3bc6d9)` (241-241) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/object-shorthand.js | `(edit 77faad9a0e45)` (244-244) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/object-shorthand.js | `(edit 5eab1edbeb30)` (245-245) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/object-shorthand.js | `(edit b303f88dfc94)` (246-246) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/object-shorthand.js | `(edit b078432617ce)` (247-247) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 10 = 0 unit + 0 artifact + 10 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 23f7bd67ddf9905a790bc478786499ada3aa4b6592b4425c9b19df21236e8710 | lib/rules/object-shorthand.js | text | 233+1 | 233+0 | unassigned: object-literal member |  |
| d36617876cadc0268fb20e532d3dfa8d690905cdf47574ddf1ee58cc8c02b271 | lib/rules/object-shorthand.js | text | 233+0 | 233+1 | unassigned: object-literal member |  |
| 6cc22b5177c41e338116c4f532209d17e9cafeaf6811260f9225b0cc9ef0a3d7 | lib/rules/object-shorthand.js | text | 233+0 | 234+1 | unassigned: object-literal member |  |
| 54d7c31eff1848bfa8c1af0c1212ac818ae69dcd00113eabb41b4ec8c3a1306a | lib/rules/object-shorthand.js | text | 233+0 | 235+1 | unassigned: object-literal member |  |
| 6f7fb3b404cb2063d3e8231faee2a6879852beeaa6f7fea7315429c18ab28dff | lib/rules/object-shorthand.js | text | 233+0 | 236+1 | unassigned: object-literal member |  |
| c0a48e3bc6d9419c1f24bc7c6652f5e7cba2922da6fd168185e8d6fb6e1bf579 | lib/rules/object-shorthand.js | text | 241+1 | 244+0 | unassigned: object-literal member |  |
| 77faad9a0e453d86a708d62a6871a10734e41629e34581d5da2ac5cc56ad2e97 | lib/rules/object-shorthand.js | text | 241+0 | 244+1 | unassigned: object-literal member |  |
| 5eab1edbeb306f81709e8697abfc9b2f81102372c0467ab846edb782b4220a88 | lib/rules/object-shorthand.js | text | 241+0 | 245+1 | unassigned: object-literal member |  |
| b303f88dfc941640d6db2d3b7d53f7a63835fec4c684036906cafcf7952c7ede | lib/rules/object-shorthand.js | text | 241+0 | 246+1 | unassigned: object-literal member |  |
| b078432617ce27f97ab1ca2fb3dd7d32040da06b7f33206f0f54f69870fda5be | lib/rules/object-shorthand.js | text | 241+0 | 247+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["23f7bd67ddf9905a790bc478786499ada3aa4b6592b4425c9b19df21236e8710","d36617876cadc0268fb20e532d3dfa8d690905cdf47574ddf1ee58cc8c02b271","6cc22b5177c41e338116c4f532209d17e9cafeaf6811260f9225b0cc9ef0a3d7","54d7c31eff1848bfa8c1af0c1212ac818ae69dcd00113eabb41b4ec8c3a1306a","6f7fb3b404cb2063d3e8231faee2a6879852beeaa6f7fea7315429c18ab28dff","c0a48e3bc6d9419c1f24bc7c6652f5e7cba2922da6fd168185e8d6fb6e1bf579","77faad9a0e453d86a708d62a6871a10734e41629e34581d5da2ac5cc56ad2e97","5eab1edbeb306f81709e8697abfc9b2f81102372c0467ab846edb782b4220a88","b303f88dfc941640d6db2d3b7d53f7a63835fec4c684036906cafcf7952c7ede","b078432617ce27f97ab1ca2fb3dd7d32040da06b7f33206f0f54f69870fda5be"]}

Task reconciliation: expected 10; terminal 10; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__49/run-88SiJO/terminal.json