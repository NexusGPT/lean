# lean report: c3ee46b5aba721f666586338d2c2196b417e6c3a → a386f557e53ae03a5161b7a51aa8f8c1b5b6ec90

Identity: 474276aa8cb660a39c41cc082b8a441965ddd500b1602c4bfd55cd20d1503764; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 4 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/config/config-file.js | `(edit 72f60fb004f3)` (549-549) | **ASK** | artifact:config |  |  | config |
| lib/config/config-file.js | `(edit 7d698c82d526)` (549-549) | **ASK** | artifact:config |  |  | config |
| lib/config/config-validator.js | `(edit ba907e29453e)` (192-192) | **ASK** | artifact:config |  |  | config |
| lib/config/config-validator.js | `(edit b2c920314166)` (192-192) | **ASK** | artifact:config |  |  | config |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 0 unit + 4 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 72f60fb004f37c6419d948703a5bb9676688d42891da32c3c12e69ea94811842 | lib/config/config-file.js | text | 549+1 | 549+0 | artifact: config | old:loadFromDisk |
| 7d698c82d5266c65c42498435d05e7f2092742430c9e7e8b10dfd9319971f915 | lib/config/config-file.js | text | 549+0 | 549+1 | artifact: config | new:loadFromDisk |
| ba907e29453efa8dc526a70efcde138be02c67d3887b653af0fbc51fe3015d5c | lib/config/config-validator.js | text | 192+1 | 192+0 | artifact: config | old:validateConfigSchema |
| b2c92031416604e13a1db21615c84630b4187f287c9ecff7dc811d9587898d42 | lib/config/config-validator.js | text | 192+0 | 192+1 | artifact: config | new:validateConfigSchema |

config: {"unit":[],"artifact":["72f60fb004f37c6419d948703a5bb9676688d42891da32c3c12e69ea94811842","7d698c82d5266c65c42498435d05e7f2092742430c9e7e8b10dfd9319971f915","ba907e29453efa8dc526a70efcde138be02c67d3887b653af0fbc51fe3015d5c","b2c92031416604e13a1db21615c84630b4187f287c9ecff7dc811d9587898d42"],"unassigned":[]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__268/run-kEz4Uc/terminal.json