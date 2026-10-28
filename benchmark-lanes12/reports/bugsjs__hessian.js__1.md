# lean report: 0ffc07587561da640bb52813d4b2399058c12924 → f1fee4d19d556afc214cf6b2f9de310fd7c68533

Identity: b0284b46380983a12b79c46e0e6399e380155c535c29d82334ea8355c1577a7c; lean 815fc01fec5f51af99003faa686f25330e7c33ad

12 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 1 PASS-bounded · 11 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/v2/encoder.js | `Encoder` (26-32) | **PASS-bounded** | refused:this | PASS-bounded |  | `this` outside a class method; a free function declares its receiver as a `this` parameter |
| lib/v2/encoder.js | `(edit 920e4a02e79b)` (500-500) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v2/encoder.js | `(edit 3bd301d12694)` (501-501) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v2/encoder.js | `(edit 062895a0f2f6)` (517-517) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v2/encoder.js | `(edit 7a0bb259d1eb)` (540-540) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v2/encoder.js | `(edit a37f547715ce)` (542-542) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v2/encoder.js | `(edit aafda53d39c8)` (543-543) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v2/encoder.js | `(edit 4ff707ac362c)` (548-548) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/v2/encoder.js | `(edit 416cbb33f8c6)` (558-558) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/v2/encoder.js | `(edit 74095f3a22c1)` (560-560) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| package.json | `(edit dbd25976d5bd)` (48-48) | **ASK** | artifact:config |  |  | config |
| package.json | `(edit ae26eeedcb1d)` (48-48) | **ASK** | artifact:config |  |  | config |

## What would make the asks provable

### lib/v2/encoder.js · `Encoder`

- line 27, `this`: `this` outside a class method; a free function declares its receiver as a `this` parameter
  do: [migration] `this` outside a class method has no receiver.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 12 = 1 unit + 2 artifact + 9 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 8a527fd6b21e32f38026c382f31792011d82222910aeafc6e57a5d89c6f63462 | lib/v2/encoder.js | text | 30+0 | 31+1 | unit: Encoder | new:Encoder |
| 920e4a02e79bb84e6027450d0bd435acf28aa499a2bb4ba81bed9635972c0031 | lib/v2/encoder.js | text | 500+1 | 501+0 | unassigned: module-level statement |  |
| 3bd301d12694ecb3f5384000fd0e7b1a04b297c69b8d0b62eaf4778d2548216e | lib/v2/encoder.js | text | 500+0 | 501+1 | unassigned: module-level statement |  |
| 062895a0f2f6fb7161102cbd792f29ffde2f7a73cc69b8746f06d73eb90b1eee | lib/v2/encoder.js | text | 515+0 | 517+1 | unassigned: module-level statement |  |
| 7a0bb259d1ebdc58e21963b6d6a848f28718f757d3cd09f17d5897704f3fb2e0 | lib/v2/encoder.js | text | 540+1 | 542+0 | unassigned: module-level statement |  |
| a37f547715ce5b4041508215fce42bdd9cbff587ed1af56dfabf675c728951c8 | lib/v2/encoder.js | text | 540+0 | 542+1 | unassigned: module-level statement |  |
| aafda53d39c85adc89d81e0d55df139b7e639e0078910e2f2c21a56209325fc0 | lib/v2/encoder.js | text | 543+1 | 544+0 | unassigned: module-level statement |  |
| 4ff707ac362cc1e24abc038e5b621ca6058f127888b4862129039b7372e0423a | lib/v2/encoder.js | text | 546+0 | 548+1 | unassigned: module-level statement |  |
| 416cbb33f8c6bee832e03a4d2980d7fa3b2ecfdb164740299e64efee32a7855b | lib/v2/encoder.js | text | 558+1 | 560+0 | unassigned: whitespace |  |
| 74095f3a22c177948cd3df86ac4031fb0fc19253ee4b4634e8ac2198348f9133 | lib/v2/encoder.js | text | 558+0 | 560+1 | unassigned: module-level statement |  |
| dbd25976d5bd8cf1390347c1a0c571a720632d4394b23956a574a2ac801a6fb0 | package.json | text | 48+1 | 48+0 | artifact: config |  |
| ae26eeedcb1d303a5ed605ab61d04f315338a163fd053d9986a95367b6fc5f9c | package.json | text | 48+0 | 48+1 | artifact: config |  |

source: {"unit":["8a527fd6b21e32f38026c382f31792011d82222910aeafc6e57a5d89c6f63462"],"artifact":[],"unassigned":["920e4a02e79bb84e6027450d0bd435acf28aa499a2bb4ba81bed9635972c0031","3bd301d12694ecb3f5384000fd0e7b1a04b297c69b8d0b62eaf4778d2548216e","062895a0f2f6fb7161102cbd792f29ffde2f7a73cc69b8746f06d73eb90b1eee","7a0bb259d1ebdc58e21963b6d6a848f28718f757d3cd09f17d5897704f3fb2e0","a37f547715ce5b4041508215fce42bdd9cbff587ed1af56dfabf675c728951c8","aafda53d39c85adc89d81e0d55df139b7e639e0078910e2f2c21a56209325fc0","4ff707ac362cc1e24abc038e5b621ca6058f127888b4862129039b7372e0423a","416cbb33f8c6bee832e03a4d2980d7fa3b2ecfdb164740299e64efee32a7855b","74095f3a22c177948cd3df86ac4031fb0fc19253ee4b4634e8ac2198348f9133"]}

config: {"unit":[],"artifact":["dbd25976d5bd8cf1390347c1a0c571a720632d4394b23956a574a2ac801a6fb0","ae26eeedcb1d303a5ed605ab61d04f315338a163fd053d9986a95367b6fc5f9c"],"unassigned":[]}

Task reconciliation: expected 12; terminal 12; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__hessian.js__1/run-okZTvo/terminal.json