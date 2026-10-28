# lean report: 9abc6f719aed91fdbd7672f44c166a3251d44eea → b9a8996f3506d2f6ec81f84e65bedab3918a370b

Identity: e45b2076d65b914f983059e4d1a5bebbe401b68000b44a7e5aa37b306bb62a11; lean 815fc01fec5f51af99003faa686f25330e7c33ad

6 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 6 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/indent.js | `(edit f470e6bfa1da)` (1212-1212) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 58a18cea6f4a)` (1213-1213) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 46c10035128e)` (1212-1212) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 130384b30fd6)` (1213-1213) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit d1da88c7510c)` (1214-1214) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 34c505d67db4)` (1215-1215) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 6 = 0 unit + 0 artifact + 6 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| f470e6bfa1da4256b241d7a772b00b39c2bb5b8681017630da381221da2bb03c | lib/rules/indent.js | text | 1212+1 | 1212+0 | unassigned: object-literal member |  |
| 58a18cea6f4a19a1b4dfac619b1ca85f6db0f8f1f62251e350c19661016e6c09 | lib/rules/indent.js | text | 1213+1 | 1212+0 | unassigned: object-literal member |  |
| 46c10035128e05da5e4b8a7336eb9ff8ee67d3a265d4a07a7918f146784b3fb4 | lib/rules/indent.js | text | 1212+0 | 1212+1 | unassigned: object-literal member |  |
| 130384b30fd60338ea1f0553196be7e2ba9594caff58c0ea2219cc3e0d04bf4e | lib/rules/indent.js | text | 1212+0 | 1213+1 | unassigned: object-literal member |  |
| d1da88c7510cf3adfa2d6f55a012015ecc6975b25f670dd80eace1b39dc001d5 | lib/rules/indent.js | text | 1212+0 | 1214+1 | unassigned: object-literal member |  |
| 34c505d67db4fc6c513efacf14b09eddb37e19af9a72e725effa273e22f95924 | lib/rules/indent.js | text | 1212+0 | 1215+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["f470e6bfa1da4256b241d7a772b00b39c2bb5b8681017630da381221da2bb03c","58a18cea6f4a19a1b4dfac619b1ca85f6db0f8f1f62251e350c19661016e6c09","46c10035128e05da5e4b8a7336eb9ff8ee67d3a265d4a07a7918f146784b3fb4","130384b30fd60338ea1f0553196be7e2ba9594caff58c0ea2219cc3e0d04bf4e","d1da88c7510cf3adfa2d6f55a012015ecc6975b25f670dd80eace1b39dc001d5","34c505d67db4fc6c513efacf14b09eddb37e19af9a72e725effa273e22f95924"]}

Task reconciliation: expected 6; terminal 6; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__32/run-ElvbTq/terminal.json