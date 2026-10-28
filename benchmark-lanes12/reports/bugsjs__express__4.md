# lean report: d07c06363f00647ab0553ef227b9b65cb4a04ae9 → 3ac2d5e560eebed8d374728e6cee92da3482fa8e

Identity: a24b60fed0793aac6a205c995a87c12de02df360c5d1d10bdbbdd5c8d0d361c1; lean 815fc01fec5f51af99003faa686f25330e7c33ad

5 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 5 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/request.js | `(edit bab01cdb410c)` (16-16) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/request.js | `(edit 5251ae737ade)` (457-457) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/request.js | `(edit 63ad06aa666f)` (458-458) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/request.js | `(edit 644a30a537b1)` (459-459) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/request.js | `(edit 2c626d96a5f9)` (460-460) | **ASK** | unassigned:module-level statement |  |  | module-level statement |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 5 = 0 unit + 0 artifact + 5 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| bab01cdb410c50d0e6bd14643fe548cbdc9476e4d3fdd413fa87ff7765fdd63c | lib/request.js | text | 15+0 | 16+1 | unassigned: module-level statement |  |
| 5251ae737ade713f4077280032e49b1653d02230d07b5e4f29d52ddc843aed30 | lib/request.js | text | 457+1 | 458+0 | unassigned: module-level statement |  |
| 63ad06aa666f927ebe53bf2bbc55e08bf89539a9f28a0cbbeb87066e9f740a22 | lib/request.js | text | 457+0 | 458+1 | unassigned: module-level statement |  |
| 644a30a537b14235e3646a159236253a6c6771fa613c75e52d1755dff60e0614 | lib/request.js | text | 457+0 | 459+1 | unassigned: module-level statement |  |
| 2c626d96a5f97a5835e3da150c763ed319e8a2a347029dee464fbfef363328f9 | lib/request.js | text | 457+0 | 460+1 | unassigned: module-level statement |  |

source: {"unit":[],"artifact":[],"unassigned":["bab01cdb410c50d0e6bd14643fe548cbdc9476e4d3fdd413fa87ff7765fdd63c","5251ae737ade713f4077280032e49b1653d02230d07b5e4f29d52ddc843aed30","63ad06aa666f927ebe53bf2bbc55e08bf89539a9f28a0cbbeb87066e9f740a22","644a30a537b14235e3646a159236253a6c6771fa613c75e52d1755dff60e0614","2c626d96a5f97a5835e3da150c763ed319e8a2a347029dee464fbfef363328f9"]}

Task reconciliation: expected 5; terminal 5; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__express__4/run-WLAgXR/terminal.json