# lean report: b8aa0718c88774f7ef59b5b1ca22e1478a09b1e6 → 647b65c92b6732d57ffe6576bb952d0a19e603ce

Identity: 4e34e2c20e161195499cddc673af4b01f6ed2af6bf33a660558c8b7a549084cd; lean 815fc01fec5f51af99003faa686f25330e7c33ad

9 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 9 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-var.js | `isGlobal` (23-25) | **ASK** | failed:loader | ASK |  | /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean |
| lib/rules/no-var.js | `(edit 8d8dfd6ab6ef)` (18-18) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/no-var.js | `(edit b32791bbe08d)` (19-19) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-var.js | `(edit 085ccf2ba97d)` (20-20) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-var.js | `(edit 0192c5b308cc)` (21-21) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-var.js | `(edit 4557dd30e613)` (22-22) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-var.js | `(edit 7d82f89f2829)` (26-26) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/no-var.js | `(edit 117880077980)` (215-215) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-var.js | `(edit a53b80753a5d)` (269-269) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 11 = 3 unit + 0 artifact + 8 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 8d8dfd6ab6efcebb185d26e0f132e62a97de20eb4c68cb3268ce5a81767286c2 | lib/rules/no-var.js | text | 17+0 | 18+1 | unassigned: comment |  |
| b32791bbe08db36f626f7616775da46e33a9654823fd3ba2638dc9f57a3ee769 | lib/rules/no-var.js | text | 17+0 | 19+1 | unassigned: module-level statement |  |
| 085ccf2ba97db372fed5a72922446ec6f502f29b750a7f8130304bc52a4d4ef3 | lib/rules/no-var.js | text | 17+0 | 20+1 | unassigned: module-level statement |  |
| 0192c5b308ccfe9f5c6f4c4ca875ae133e638cf2807c51729492c4088fdd64e9 | lib/rules/no-var.js | text | 17+0 | 21+1 | unassigned: module-level statement |  |
| 4557dd30e613e6d54ef39276c2883b599e954d6080e90bba352bea0adae589f1 | lib/rules/no-var.js | text | 17+0 | 22+1 | unassigned: module-level statement |  |
| e8bac756b7b4d73da7a2d96e551bf1dd0d7fa151e1972038ede5a44ed39ab4aa | lib/rules/no-var.js | text | 17+0 | 23+1 | unit: isGlobal | new:isGlobal |
| 60723096930e24b8426e74819e5679a0be6bd5ffedba644f1e42d38af114103d | lib/rules/no-var.js | text | 17+0 | 24+1 | unit: isGlobal | new:isGlobal |
| 1b59301f0f045333886d56dfdefed64f0871447095dba4f9ad3818ff531728fe | lib/rules/no-var.js | text | 17+0 | 25+1 | unit: isGlobal | new:isGlobal |
| 7d82f89f2829957831fdc5479c8e7645eef68d82bae33e429263c5378bdd2b5b | lib/rules/no-var.js | text | 17+0 | 26+1 | unassigned: whitespace |  |
| 117880077980514d37e3f2d05fb6809985b77194a8f8d30beeeff548d5ee2952 | lib/rules/no-var.js | text | 205+0 | 215+1 | unassigned: object-literal member |  |
| a53b80753a5da1acdaf15c354afb214bfcfe44726ae0ac02369668bac145eb14 | lib/rules/no-var.js | text | 258+0 | 269+1 | unassigned: object-literal member |  |

source: {"unit":["e8bac756b7b4d73da7a2d96e551bf1dd0d7fa151e1972038ede5a44ed39ab4aa","60723096930e24b8426e74819e5679a0be6bd5ffedba644f1e42d38af114103d","1b59301f0f045333886d56dfdefed64f0871447095dba4f9ad3818ff531728fe"],"artifact":[],"unassigned":["8d8dfd6ab6efcebb185d26e0f132e62a97de20eb4c68cb3268ce5a81767286c2","b32791bbe08db36f626f7616775da46e33a9654823fd3ba2638dc9f57a3ee769","085ccf2ba97db372fed5a72922446ec6f502f29b750a7f8130304bc52a4d4ef3","0192c5b308ccfe9f5c6f4c4ca875ae133e638cf2807c51729492c4088fdd64e9","4557dd30e613e6d54ef39276c2883b599e954d6080e90bba352bea0adae589f1","7d82f89f2829957831fdc5479c8e7645eef68d82bae33e429263c5378bdd2b5b","117880077980514d37e3f2d05fb6809985b77194a8f8d30beeeff548d5ee2952","a53b80753a5da1acdaf15c354afb214bfcfe44726ae0ac02369668bac145eb14"]}

Task reconciliation: expected 9; terminal 9; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__278/run-phIk5L/terminal.json