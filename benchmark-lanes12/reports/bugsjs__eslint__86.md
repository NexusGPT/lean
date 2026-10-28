# lean report: 6e61070a682538af5bbaa7c9bd5e284f05720350 → 38cf0cbc43f46a8cfa991679965d241541a9a9c0

Identity: 22927e47d065eaadbded8f7454589b47e390ba8b136ac827e2cc61dda80fc43d; lean 815fc01fec5f51af99003faa686f25330e7c33ad

9 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 9 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/func-call-spacing.js | `(edit 97eb840c9fd8)` (123-123) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/func-call-spacing.js | `(edit 0f4bfd5f3afe)` (123-123) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/func-call-spacing.js | `(edit 6208e642ae21)` (124-124) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/func-call-spacing.js | `(edit f444ebe9dcd1)` (125-125) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/func-call-spacing.js | `(edit 10654d940ea9)` (126-126) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/func-call-spacing.js | `(edit 3f2868041e61)` (127-127) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/func-call-spacing.js | `(edit 97627d6ec1a9)` (128-128) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/func-call-spacing.js | `(edit fb5be5b06773)` (129-129) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/func-call-spacing.js | `(edit 123f1204d978)` (130-130) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 9 = 0 unit + 0 artifact + 9 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 97eb840c9fd8d85f1d7dbab6894e02671f3fcdcf7b4d41d7f3ce256cead097f7 | lib/rules/func-call-spacing.js | text | 123+1 | 123+0 | unassigned: object-literal member |  |
| 0f4bfd5f3afee059a7cfc622d9a81448e41191b37fa3e27c24f6a104294268c9 | lib/rules/func-call-spacing.js | text | 123+0 | 123+1 | unassigned: whitespace |  |
| 6208e642ae2167e2159fa7ab626bb87d160b6e9ecb96e118cce7229a1b24a28f | lib/rules/func-call-spacing.js | text | 123+0 | 124+1 | unassigned: comment |  |
| f444ebe9dcd104f66e368fb8b660a3619f4627d4193d41e624e565cc6b2d3d4c | lib/rules/func-call-spacing.js | text | 123+0 | 125+1 | unassigned: comment |  |
| 10654d940ea9ba0ceabd68d30049d27eb76ed9debaceb93449e3241b8e2b9d30 | lib/rules/func-call-spacing.js | text | 123+0 | 126+1 | unassigned: object-literal member |  |
| 3f2868041e61a6d28a743545698bbc88a8e673e6fb22d015be7d62384eb0eb12 | lib/rules/func-call-spacing.js | text | 123+0 | 127+1 | unassigned: object-literal member |  |
| 97627d6ec1a9ccad0ac6ad1cdba3ecb9212f36d74b7dc38a78dad75204e8d317 | lib/rules/func-call-spacing.js | text | 123+0 | 128+1 | unassigned: object-literal member |  |
| fb5be5b0677375b5c1744f215edaf55f97c0d1648542faf6a417bf23f499fc8d | lib/rules/func-call-spacing.js | text | 123+0 | 129+1 | unassigned: whitespace |  |
| 123f1204d978b3ce1b2b9d393f95294e9cc8f6647bb0b35ca160d1c642b3e8ef | lib/rules/func-call-spacing.js | text | 123+0 | 130+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["97eb840c9fd8d85f1d7dbab6894e02671f3fcdcf7b4d41d7f3ce256cead097f7","0f4bfd5f3afee059a7cfc622d9a81448e41191b37fa3e27c24f6a104294268c9","6208e642ae2167e2159fa7ab626bb87d160b6e9ecb96e118cce7229a1b24a28f","f444ebe9dcd104f66e368fb8b660a3619f4627d4193d41e624e565cc6b2d3d4c","10654d940ea9ba0ceabd68d30049d27eb76ed9debaceb93449e3241b8e2b9d30","3f2868041e61a6d28a743545698bbc88a8e673e6fb22d015be7d62384eb0eb12","97627d6ec1a9ccad0ac6ad1cdba3ecb9212f36d74b7dc38a78dad75204e8d317","fb5be5b0677375b5c1744f215edaf55f97c0d1648542faf6a417bf23f499fc8d","123f1204d978b3ce1b2b9d393f95294e9cc8f6647bb0b35ca160d1c642b3e8ef"]}

Task reconciliation: expected 9; terminal 9; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__86/run-JlD4sr/terminal.json