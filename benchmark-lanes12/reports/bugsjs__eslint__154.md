# lean report: 804abd88a3aa92469292b0c95b661f0f74d9dc41 → b556fff9ff0c3c0e654099e324b32734e42353f5

Identity: 7d790b0f3e80b9d77cf0ace3f0e64841f8b6908e18c1808df4c8cf89212410ba; lean 815fc01fec5f51af99003faa686f25330e7c33ad

3 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 3 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-extend-native.js | `(edit b3a444919901)` (71-71) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (object-literal member) |
| lib/rules/no-extend-native.js | `(edit fc7a34c77a5f)` (72-72) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (whitespace) |
| lib/rules/no-extend-native.js | `(edit db5ba08bd855)` (71-71) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (object-literal member) |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 3 = 0 unit + 0 artifact + 3 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| b3a444919901f40d073d149269cfab250dcfcbf02b92fbbdbfa01170adc25503 | lib/rules/no-extend-native.js | text | 71+1 | 71+0 | unassigned: untyped JavaScript file |  |
| fc7a34c77a5fa76e67feb74bfc8b266d0ed066d9e1496764ea48346672b117aa | lib/rules/no-extend-native.js | text | 72+1 | 71+0 | unassigned: untyped JavaScript file |  |
| db5ba08bd855a9b78ad656893f7db23540696d0664177dc1816b0f38bc198b7a | lib/rules/no-extend-native.js | text | 71+0 | 71+1 | unassigned: untyped JavaScript file |  |

source: {"unit":[],"artifact":[],"unassigned":["b3a444919901f40d073d149269cfab250dcfcbf02b92fbbdbfa01170adc25503","fc7a34c77a5fa76e67feb74bfc8b266d0ed066d9e1496764ea48346672b117aa","db5ba08bd855a9b78ad656893f7db23540696d0664177dc1816b0f38bc198b7a"]}

Task reconciliation: expected 3; terminal 3; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__154/run-EmCRUF/terminal.json