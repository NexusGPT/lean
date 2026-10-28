# lean report: 834f45d32ed322940dd185a32e5342193fdde914 → 73cda6f82bdc53a76f6aa1a24c675319444dc47f

Identity: fd30430425e45c545c2c69d64bc6b78304d10713e8ac51e68c2e07abbfdbfa0a; lean 815fc01fec5f51af99003faa686f25330e7c33ad

8 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 8 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-extra-boolean-cast.js | `(edit bc858a1d43a8)` (101-101) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-extra-boolean-cast.js | `(edit d034659ab6e8)` (102-102) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-extra-boolean-cast.js | `(edit 6dc75fa120e3)` (103-103) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-extra-boolean-cast.js | `(edit 34e5d144146b)` (104-104) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/no-extra-boolean-cast.js | `(edit 6730869a9d51)` (105-105) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-extra-boolean-cast.js | `(edit 18c1fe484f4a)` (106-106) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-extra-boolean-cast.js | `(edit 021cedf6fc58)` (107-107) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-extra-boolean-cast.js | `(edit c05bff1c1a20)` (108-108) | **ASK** | unassigned:whitespace |  |  | whitespace |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 8 = 0 unit + 0 artifact + 8 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| bc858a1d43a8a0c41066305c59a270106c6eb40d0031210c06a00d63a14e32dc | lib/rules/no-extra-boolean-cast.js | text | 100+0 | 101+1 | unassigned: object-literal member |  |
| d034659ab6e82e9ad828f04f401d263db3ec96040ddc6109a6ecada6c3df937a | lib/rules/no-extra-boolean-cast.js | text | 100+0 | 102+1 | unassigned: object-literal member |  |
| 6dc75fa120e3729bfb1919c41e7c19f39bf5de760929cca9df66cd1a4e932117 | lib/rules/no-extra-boolean-cast.js | text | 100+0 | 103+1 | unassigned: object-literal member |  |
| 34e5d144146b1ce857acc8f7553fb5a2d17d9aaf1b5f51a6bd366b20e94312af | lib/rules/no-extra-boolean-cast.js | text | 100+0 | 104+1 | unassigned: whitespace |  |
| 6730869a9d51c9cf40fd4aaa39e0def751c94649e490f50e16a41b8681728552 | lib/rules/no-extra-boolean-cast.js | text | 100+0 | 105+1 | unassigned: object-literal member |  |
| 18c1fe484f4a459b695c8ead7f877f7c6f97a886f6a5c46b67dc5b983ae3d058 | lib/rules/no-extra-boolean-cast.js | text | 100+0 | 106+1 | unassigned: object-literal member |  |
| 021cedf6fc58aeaddf469a4260fa7193ba4606232c735d3d0b66697a747e90cb | lib/rules/no-extra-boolean-cast.js | text | 100+0 | 107+1 | unassigned: object-literal member |  |
| c05bff1c1a20a9d593d9df589bb60123f1461ace0a68ae240adf747612d9c6f6 | lib/rules/no-extra-boolean-cast.js | text | 100+0 | 108+1 | unassigned: whitespace |  |

source: {"unit":[],"artifact":[],"unassigned":["bc858a1d43a8a0c41066305c59a270106c6eb40d0031210c06a00d63a14e32dc","d034659ab6e82e9ad828f04f401d263db3ec96040ddc6109a6ecada6c3df937a","6dc75fa120e3729bfb1919c41e7c19f39bf5de760929cca9df66cd1a4e932117","34e5d144146b1ce857acc8f7553fb5a2d17d9aaf1b5f51a6bd366b20e94312af","6730869a9d51c9cf40fd4aaa39e0def751c94649e490f50e16a41b8681728552","18c1fe484f4a459b695c8ead7f877f7c6f97a886f6a5c46b67dc5b983ae3d058","021cedf6fc58aeaddf469a4260fa7193ba4606232c735d3d0b66697a747e90cb","c05bff1c1a20a9d593d9df589bb60123f1461ace0a68ae240adf747612d9c6f6"]}

Task reconciliation: expected 8; terminal 8; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__24/run-2nhT04/terminal.json