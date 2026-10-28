# lean report: 2f36f92e1c8d7000252f905c0a90764ff06e7249 → e100017fef43bc4fa134dc259bd9e5c01f986415

Identity: 600d076c32013be7c774b8d57fd9b098fc53cffbe9768b175cac370bc4a2d952; lean 815fc01fec5f51af99003faa686f25330e7c33ad

15 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 15 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/init-declarations.js | `isInitialized` (18-26) | **ASK** | refused:var | ASK |  | /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean |
| lib/rules/init-declarations.js | `(edit 6d24f888c147)` (9-9) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/init-declarations.js | `(edit 69d8d9a72e4d)` (10-10) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/init-declarations.js | `(edit 644cce4941fc)` (11-11) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/init-declarations.js | `(edit 6862f7da4238)` (12-12) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/init-declarations.js | `(edit 786dfe91e347)` (13-13) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/init-declarations.js | `(edit ebcf9a83a4d8)` (14-14) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/init-declarations.js | `(edit a00ff76cba13)` (15-15) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/init-declarations.js | `(edit 1f121a380977)` (16-16) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/init-declarations.js | `(edit 1cf844f958d9)` (17-17) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/init-declarations.js | `(edit 32eedad1fcc9)` (27-27) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/init-declarations.js | `(edit c205b5a8b679)` (25-25) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (object-literal member) |
| lib/rules/init-declarations.js | `(edit c07456e6615e)` (44-44) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/init-declarations.js | `(edit abc05a251081)` (33-33) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (object-literal member) |
| lib/rules/init-declarations.js | `(edit 1d23473a3efb)` (52-52) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

## What would make the asks provable

### lib/rules/init-declarations.js · `isInitialized`

- line 19, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 20, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 23 = 9 unit + 0 artifact + 14 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 6d24f888c1471f23808ce04bfc6fe68f0ef24888b0cf0aa8dacc9513725354b1 | lib/rules/init-declarations.js | text | 8+0 | 9+1 | unassigned: comment |  |
| 69d8d9a72e4da3f15713fc295b858fc319c994e988983ba801eebe8df27df097 | lib/rules/init-declarations.js | text | 8+0 | 10+1 | unassigned: comment |  |
| 644cce4941fcc5731f3342c8e477b0d8cb11a317a4006b8339895bce427ddf4f | lib/rules/init-declarations.js | text | 8+0 | 11+1 | unassigned: comment |  |
| 6862f7da4238fce27e291371c637f4e542debb08c8271802c4ef905d0fb57268 | lib/rules/init-declarations.js | text | 8+0 | 12+1 | unassigned: whitespace |  |
| 786dfe91e3472a1f4a2534186e554e5a9779053a2c105a7ac1349480564ca274 | lib/rules/init-declarations.js | text | 8+0 | 13+1 | unassigned: comment |  |
| ebcf9a83a4d8c6d14ea89d0c32c8f70dcb7b48557de7b1130056322283b8f527 | lib/rules/init-declarations.js | text | 8+0 | 14+1 | unassigned: module-level statement |  |
| a00ff76cba13826753920150629fc11d09ef43bbd975064cc511d316d9029700 | lib/rules/init-declarations.js | text | 8+0 | 15+1 | unassigned: module-level statement |  |
| 1f121a38097729a0977710661f0bca2eb7746fb52fa25b378794b14607b5222b | lib/rules/init-declarations.js | text | 8+0 | 16+1 | unassigned: module-level statement |  |
| 1cf844f958d9376ec2858168fa3f9f11954f55c1bc92365442aaceeef725d31f | lib/rules/init-declarations.js | text | 8+0 | 17+1 | unassigned: module-level statement |  |
| 6d66be3e296d30cad90e53b4f109eda4252fcf0e10b0a4d8d989b9b717f8d567 | lib/rules/init-declarations.js | text | 8+0 | 18+1 | unit: isInitialized | new:isInitialized |
| e38af45c50e2ba57121658d4f3d7c31fa845e725e4a9268e0403f772609c4d83 | lib/rules/init-declarations.js | text | 8+0 | 19+1 | unit: isInitialized | new:isInitialized |
| 0e0841e348289eec35f7ad5ba1a34e673d9b8e0abe2b242f19ed4a62ee66c105 | lib/rules/init-declarations.js | text | 8+0 | 20+1 | unit: isInitialized | new:isInitialized |
| 20ff4caafebcffc2c051624f45b46486cca1e2fb15687a9d6cd022425b281700 | lib/rules/init-declarations.js | text | 8+0 | 21+1 | unit: isInitialized | new:isInitialized |
| 8dd0ad896bc03b60567722a327730775e1698006d2a2c590a924571a43f3890a | lib/rules/init-declarations.js | text | 8+0 | 22+1 | unit: isInitialized | new:isInitialized |
| e33e43b201d463ea78afb5ea858e4d141f10bf5b332436c43a69cf6370f8fd5f | lib/rules/init-declarations.js | text | 8+0 | 23+1 | unit: isInitialized | new:isInitialized |
| 6a86f56839f4caf031c372995dbc85155900a568fe26bf9b75e6d40c696e8a2e | lib/rules/init-declarations.js | text | 8+0 | 24+1 | unit: isInitialized | new:isInitialized |
| 341064249262a73bd53b594b6ccc770e1cc53050d1c49d533f3c1afb41383278 | lib/rules/init-declarations.js | text | 8+0 | 25+1 | unit: isInitialized | new:isInitialized |
| 1b43a995ef70f46f74e0ffe3bcdcc3da13a73fbaf25c576f60aad4946fa98ebd | lib/rules/init-declarations.js | text | 8+0 | 26+1 | unit: isInitialized | new:isInitialized |
| 32eedad1fcc92714a5aa01b5ddd3de8aa71ab8ddc007fdcbf2d4869581eb95b4 | lib/rules/init-declarations.js | text | 8+0 | 27+1 | unassigned: whitespace |  |
| c205b5a8b679ec857876e56e35479a26ccd8d68d0a7afb75ee8e6ff90bee8962 | lib/rules/init-declarations.js | text | 25+1 | 44+0 | unassigned: untyped JavaScript file |  |
| c07456e6615e87f1ed02066ef0ecc64f1543da677a8babb6ef560aa7ad7dde4a | lib/rules/init-declarations.js | text | 25+0 | 44+1 | unassigned: object-literal member |  |
| abc05a2510815c130a7abe0587b2f3ef2ab0d25e52470f7e52b89778043cc9d9 | lib/rules/init-declarations.js | text | 33+1 | 52+0 | unassigned: untyped JavaScript file |  |
| 1d23473a3efbc65b26157e4fb9ad566de5e0a52b2cbac0cbd04773ebdcf51045 | lib/rules/init-declarations.js | text | 33+0 | 52+1 | unassigned: object-literal member |  |

source: {"unit":["6d66be3e296d30cad90e53b4f109eda4252fcf0e10b0a4d8d989b9b717f8d567","e38af45c50e2ba57121658d4f3d7c31fa845e725e4a9268e0403f772609c4d83","0e0841e348289eec35f7ad5ba1a34e673d9b8e0abe2b242f19ed4a62ee66c105","20ff4caafebcffc2c051624f45b46486cca1e2fb15687a9d6cd022425b281700","8dd0ad896bc03b60567722a327730775e1698006d2a2c590a924571a43f3890a","e33e43b201d463ea78afb5ea858e4d141f10bf5b332436c43a69cf6370f8fd5f","6a86f56839f4caf031c372995dbc85155900a568fe26bf9b75e6d40c696e8a2e","341064249262a73bd53b594b6ccc770e1cc53050d1c49d533f3c1afb41383278","1b43a995ef70f46f74e0ffe3bcdcc3da13a73fbaf25c576f60aad4946fa98ebd"],"artifact":[],"unassigned":["6d24f888c1471f23808ce04bfc6fe68f0ef24888b0cf0aa8dacc9513725354b1","69d8d9a72e4da3f15713fc295b858fc319c994e988983ba801eebe8df27df097","644cce4941fcc5731f3342c8e477b0d8cb11a317a4006b8339895bce427ddf4f","6862f7da4238fce27e291371c637f4e542debb08c8271802c4ef905d0fb57268","786dfe91e3472a1f4a2534186e554e5a9779053a2c105a7ac1349480564ca274","ebcf9a83a4d8c6d14ea89d0c32c8f70dcb7b48557de7b1130056322283b8f527","a00ff76cba13826753920150629fc11d09ef43bbd975064cc511d316d9029700","1f121a38097729a0977710661f0bca2eb7746fb52fa25b378794b14607b5222b","1cf844f958d9376ec2858168fa3f9f11954f55c1bc92365442aaceeef725d31f","32eedad1fcc92714a5aa01b5ddd3de8aa71ab8ddc007fdcbf2d4869581eb95b4","c205b5a8b679ec857876e56e35479a26ccd8d68d0a7afb75ee8e6ff90bee8962","c07456e6615e87f1ed02066ef0ecc64f1543da677a8babb6ef560aa7ad7dde4a","abc05a2510815c130a7abe0587b2f3ef2ab0d25e52470f7e52b89778043cc9d9","1d23473a3efbc65b26157e4fb9ad566de5e0a52b2cbac0cbd04773ebdcf51045"]}

Task reconciliation: expected 15; terminal 15; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__190/run-z5EwuJ/terminal.json