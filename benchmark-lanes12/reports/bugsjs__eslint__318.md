# lean report: 59e12db5963cb8a4a34d669cff28f83dd71bf3d6 → 8f60470f54c3d9ee5bf94a70b8aeea0738a1bc02

Identity: dbc797d324f2b239b765b91edb94caf85fab2faccbe63e73e4a469849d309f56; lean 815fc01fec5f51af99003faa686f25330e7c33ad

9 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 9 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/use-isnan.js | `(edit 91862a6e413f)` (4-4) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (module-level statement) |
| lib/rules/use-isnan.js | `(edit ef0d10803a49)` (5-5) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (module-level statement) |
| lib/rules/use-isnan.js | `(edit c8716773ccfa)` (10-10) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (exported property assignment) |
| lib/rules/use-isnan.js | `(edit 7cd59e917f96)` (12-12) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (exported property assignment) |
| lib/rules/use-isnan.js | `(edit cd1ecf441425)` (15-15) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (object-literal member) |
| lib/rules/use-isnan.js | `(edit eca0c720673d)` (16-16) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (whitespace) |
| lib/rules/use-isnan.js | `(edit 7ccf7ecb2bb7)` (17-17) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (object-literal member) |
| lib/rules/use-isnan.js | `(edit 32bcfe922cc4)` (17-17) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (object-literal member) |
| lib/rules/use-isnan.js | `(edit 07c3d7d7edb0)` (18-18) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (object-literal member) |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 9 = 0 unit + 0 artifact + 9 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 91862a6e413f2a7236082c849af07508586a50151f7289c4307d958bfea9da41 | lib/rules/use-isnan.js | text | 3+0 | 4+1 | unassigned: untyped JavaScript file |  |
| ef0d10803a49fce3664a95f4762d7d9e34f25da281cc30f1b7774f52729479da | lib/rules/use-isnan.js | text | 3+0 | 5+1 | unassigned: untyped JavaScript file |  |
| c8716773ccfac7d0088c6b938f2b9f10373f043e7ba985a03b4ab2ec64a2a7f8 | lib/rules/use-isnan.js | text | 10+1 | 12+0 | unassigned: untyped JavaScript file |  |
| 7cd59e917f96abf95566ca37254cfdca007819ea680436c3dbfa584772f2806a | lib/rules/use-isnan.js | text | 10+0 | 12+1 | unassigned: untyped JavaScript file |  |
| cd1ecf441425323c02f4b82ca04f8cce0b9eed3f312add33c55864e2c1b929a3 | lib/rules/use-isnan.js | text | 15+1 | 17+0 | unassigned: untyped JavaScript file |  |
| eca0c720673d55e089b893e4a296d64682f14dcaba8b1f4dbe089f60ec160d4c | lib/rules/use-isnan.js | text | 16+1 | 17+0 | unassigned: untyped JavaScript file |  |
| 7ccf7ecb2bb7d813621958dc073bf786ee35896cd2b6bdaddf8fedee9834095f | lib/rules/use-isnan.js | text | 17+1 | 17+0 | unassigned: untyped JavaScript file |  |
| 32bcfe922cc416d9ffb8663e27a92d5e861ba5e6b03c1cd155d809667ae91562 | lib/rules/use-isnan.js | text | 15+0 | 17+1 | unassigned: untyped JavaScript file |  |
| 07c3d7d7edb0585b8167d3c5076fdd13be2fd1c51d9910f87da481bf3e3e18cd | lib/rules/use-isnan.js | text | 15+0 | 18+1 | unassigned: untyped JavaScript file |  |

source: {"unit":[],"artifact":[],"unassigned":["91862a6e413f2a7236082c849af07508586a50151f7289c4307d958bfea9da41","ef0d10803a49fce3664a95f4762d7d9e34f25da281cc30f1b7774f52729479da","c8716773ccfac7d0088c6b938f2b9f10373f043e7ba985a03b4ab2ec64a2a7f8","7cd59e917f96abf95566ca37254cfdca007819ea680436c3dbfa584772f2806a","cd1ecf441425323c02f4b82ca04f8cce0b9eed3f312add33c55864e2c1b929a3","eca0c720673d55e089b893e4a296d64682f14dcaba8b1f4dbe089f60ec160d4c","7ccf7ecb2bb7d813621958dc073bf786ee35896cd2b6bdaddf8fedee9834095f","32bcfe922cc416d9ffb8663e27a92d5e861ba5e6b03c1cd155d809667ae91562","07c3d7d7edb0585b8167d3c5076fdd13be2fd1c51d9910f87da481bf3e3e18cd"]}

Task reconciliation: expected 9; terminal 9; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__318/run-OofCn0/terminal.json