# lean report: 8b6dc6ceec1b36e74ee9c6d362aa04e46237c227 → 40144c0b5af0ff2b19ec40fde4fc83c339f0a3c7

Identity: c9f115d5d3b50e4ea9f141efca970da2cf4c211b5e37fcd9320f06bfa4a93ea0; lean 815fc01fec5f51af99003faa686f25330e7c33ad

11 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 11 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/router/index.js | `(edit 4c5b51fb3754)` (283-283) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit c1b7e272cf09)` (284-284) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit 50ecfc0b0778)` (285-285) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/router/index.js | `(edit 9ffac794405a)` (286-286) | **ASK** | unassigned:comment |  |  | comment |
| lib/router/index.js | `(edit 853b23a0b31b)` (287-287) | **ASK** | unassigned:comment |  |  | comment |
| lib/router/index.js | `(edit bb49bbbccc90)` (284-284) | **ASK** | unassigned:comment |  |  | comment |
| lib/router/index.js | `(edit 1c506c4ab59a)` (285-285) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit 0ff989e63476)` (286-286) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit 1ebffd95ce7d)` (287-287) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/router/index.js | `(edit 13e7fc2b5cda)` (288-288) | **ASK** | unassigned:comment |  |  | comment |
| lib/router/index.js | `(edit c339ac911196)` (289-289) | **ASK** | unassigned:comment |  |  | comment |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 11 = 0 unit + 0 artifact + 11 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 4c5b51fb3754f4d0a4596443d5616e1e4119b5b0c0295b2e1223006d85367876 | lib/router/index.js | text | 283+1 | 282+0 | unassigned: module-level statement |  |
| c1b7e272cf09fbcc06b4edf4918b4697416b17329df42bdd8f36b6361e1d2e93 | lib/router/index.js | text | 284+1 | 282+0 | unassigned: module-level statement |  |
| 50ecfc0b07782c58ad583242a772043bef9d11c9a5fa0e7727ab30fb7a693c38 | lib/router/index.js | text | 285+1 | 282+0 | unassigned: whitespace |  |
| 9ffac794405a609bdc429c869af9675a04b8799353f9d28585ce073abf42ce30 | lib/router/index.js | text | 286+1 | 282+0 | unassigned: comment |  |
| 853b23a0b31b3745863db1fbaecc9f68c3ea10c686ec466276000de04f9422ca | lib/router/index.js | text | 287+1 | 282+0 | unassigned: comment |  |
| bb49bbbccc904440eb4e33179dbdf8c4cb45afcf302c7611757ad607c1ec6a8a | lib/router/index.js | text | 288+0 | 284+1 | unassigned: comment |  |
| 1c506c4ab59ae86a4a0530de5eb9aa9d6f88921e912000239d9bf62810987e35 | lib/router/index.js | text | 288+0 | 285+1 | unassigned: module-level statement |  |
| 0ff989e634760da60bf9aa1a1c9d5fa512b162cd068dd2a59a8b50076c26ecd5 | lib/router/index.js | text | 288+0 | 286+1 | unassigned: module-level statement |  |
| 1ebffd95ce7d03401266f779f88a8dfe89e8dc0d83cd47c48ceb311cbd6e4a8b | lib/router/index.js | text | 288+0 | 287+1 | unassigned: whitespace |  |
| 13e7fc2b5cdae4ea56eea34af6a03eac0d4b2f46fa6674c769f1965a19351ebb | lib/router/index.js | text | 288+0 | 288+1 | unassigned: comment |  |
| c339ac911196f9b684136bd804ae8dfbc9c5c09aa65810550d7882b0b242231a | lib/router/index.js | text | 288+0 | 289+1 | unassigned: comment |  |

source: {"unit":[],"artifact":[],"unassigned":["4c5b51fb3754f4d0a4596443d5616e1e4119b5b0c0295b2e1223006d85367876","c1b7e272cf09fbcc06b4edf4918b4697416b17329df42bdd8f36b6361e1d2e93","50ecfc0b07782c58ad583242a772043bef9d11c9a5fa0e7727ab30fb7a693c38","9ffac794405a609bdc429c869af9675a04b8799353f9d28585ce073abf42ce30","853b23a0b31b3745863db1fbaecc9f68c3ea10c686ec466276000de04f9422ca","bb49bbbccc904440eb4e33179dbdf8c4cb45afcf302c7611757ad607c1ec6a8a","1c506c4ab59ae86a4a0530de5eb9aa9d6f88921e912000239d9bf62810987e35","0ff989e634760da60bf9aa1a1c9d5fa512b162cd068dd2a59a8b50076c26ecd5","1ebffd95ce7d03401266f779f88a8dfe89e8dc0d83cd47c48ceb311cbd6e4a8b","13e7fc2b5cdae4ea56eea34af6a03eac0d4b2f46fa6674c769f1965a19351ebb","c339ac911196f9b684136bd804ae8dfbc9c5c09aa65810550d7882b0b242231a"]}

Task reconciliation: expected 11; terminal 11; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__express__10/run-3PW50o/terminal.json