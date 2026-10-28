# lean report: e54598abcf97573bddb40238c535cd8f0e3ffdd5 → cd11ed404debd48862b4ff84ccd9190467081a96

Identity: ac4b8cb595ab2ff5e72f4943a2f62bd60d90b0d452bcf30cad9d9fe94b02ecee; lean 815fc01fec5f51af99003faa686f25330e7c33ad

10 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 10 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/vars-on-top.js | `(edit d2b297318176)` (58-58) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/rules/vars-on-top.js | `(edit e6f31895496a)` (58-58) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/rules/vars-on-top.js | `(edit 786183f8c63f)` (59-59) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/rules/vars-on-top.js | `(edit 5c8a45db8986)` (60-60) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/rules/vars-on-top.js | `(edit 2c359d34f5d3)` (109-109) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/vars-on-top.js | `(edit 7869bbd037e3)` (110-110) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/vars-on-top.js | `(edit 180feb583fbc)` (111-111) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/vars-on-top.js | `(edit f90105121dca)` (112-112) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/vars-on-top.js | `(edit 55a933763e3c)` (113-113) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/vars-on-top.js | `(edit 3dc65a8019ca)` (114-114) | **ASK** | unassigned:whitespace |  |  | whitespace |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 10 = 0 unit + 0 artifact + 10 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| d2b297318176b37e80b6e814222d6e59fed15a2b2c0d42c0daa7a14d8e2ad55e | lib/rules/vars-on-top.js | text | 58+1 | 58+0 | unassigned: exported property assignment |  |
| e6f31895496a3f940246a31bc8cb6859df458b3a4ae3a62b9f7d4f2ec50ae51c | lib/rules/vars-on-top.js | text | 58+0 | 58+1 | unassigned: exported property assignment |  |
| 786183f8c63f9f1ecfc675d5becfbeab6df9c8e7ee699432807027af7f6afab8 | lib/rules/vars-on-top.js | text | 58+0 | 59+1 | unassigned: exported property assignment |  |
| 5c8a45db8986a8156543e0724524450a6f395360c17a983dca299c0aa202e675 | lib/rules/vars-on-top.js | text | 58+0 | 60+1 | unassigned: exported property assignment |  |
| 2c359d34f5d36333a53ee31287da5c09c49a01e296bb7130af8ca899803cc302 | lib/rules/vars-on-top.js | text | 106+0 | 109+1 | unassigned: object-literal member |  |
| 7869bbd037e32b03ac829f140bb779b9685e4b4aa6fc36bbc8df77f8573bdde4 | lib/rules/vars-on-top.js | text | 106+0 | 110+1 | unassigned: object-literal member |  |
| 180feb583fbc2e85800a0579a68e9c219670cdf49cab38d401d58ed24b0a15bd | lib/rules/vars-on-top.js | text | 106+0 | 111+1 | unassigned: object-literal member |  |
| f90105121dcaff67a1912b5bde976af9df28d9cb1f89901f94a83c84b66b6596 | lib/rules/vars-on-top.js | text | 106+0 | 112+1 | unassigned: object-literal member |  |
| 55a933763e3cb72e12f2c8230583954be961ea7697f0f2ae630edb83536ee460 | lib/rules/vars-on-top.js | text | 106+0 | 113+1 | unassigned: object-literal member |  |
| 3dc65a8019ca8b5d84c651164ccdf97cff2202bbd8d9aafb9e28ea87d8c1716b | lib/rules/vars-on-top.js | text | 106+0 | 114+1 | unassigned: whitespace |  |

source: {"unit":[],"artifact":[],"unassigned":["d2b297318176b37e80b6e814222d6e59fed15a2b2c0d42c0daa7a14d8e2ad55e","e6f31895496a3f940246a31bc8cb6859df458b3a4ae3a62b9f7d4f2ec50ae51c","786183f8c63f9f1ecfc675d5becfbeab6df9c8e7ee699432807027af7f6afab8","5c8a45db8986a8156543e0724524450a6f395360c17a983dca299c0aa202e675","2c359d34f5d36333a53ee31287da5c09c49a01e296bb7130af8ca899803cc302","7869bbd037e32b03ac829f140bb779b9685e4b4aa6fc36bbc8df77f8573bdde4","180feb583fbc2e85800a0579a68e9c219670cdf49cab38d401d58ed24b0a15bd","f90105121dcaff67a1912b5bde976af9df28d9cb1f89901f94a83c84b66b6596","55a933763e3cb72e12f2c8230583954be961ea7697f0f2ae630edb83536ee460","3dc65a8019ca8b5d84c651164ccdf97cff2202bbd8d9aafb9e28ea87d8c1716b"]}

Task reconciliation: expected 10; terminal 10; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__260/run-8zPYKZ/terminal.json