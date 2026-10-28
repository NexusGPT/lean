# lean report: 995554cfac870b82e64881a8b6ba2f1422c0bacc → 0506eca8f4127e2981724880e671cb9fc625adce

Identity: a20309103666184602996762e8754fdb10978e6fc18e63e6457dcf05825b7353; lean 815fc01fec5f51af99003faa686f25330e7c33ad

1 changed function(s): **0 in scope · 1 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/ast-utils.js | `getLineIndices` (290-315) | **WITNESS** | refused:unsupported-member | WITNESS |  | input 1: outcome; lib/ast-utils.js:314 |

## What would make the asks provable

### lib/ast-utils.js · `getLineIndices`

- line 308, `unsupported-member`: `.index` of a match is read for a match of a non-global regular expression literal bound to a const (`const m = /re/.exec(s)`, `s.match(/re/)`), or take the first position with `s.search(/re/)`; a match from a global pattern, an exec loop or matchAll depends on lastIndex
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 19 = 19 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| e96debdb373033dde63593056d3a7cac5c18c094c6a5bc3bef07e899a3cf1aec | lib/ast-utils.js | text | 293+1 | 293+0 | unit: getLineIndices | old:getLineIndices |
| 5f5a55a9ec3bf2aafc6bfa1e27e1de34dcf5b1c2fffdbfd2a8f70c360baf6a7e | lib/ast-utils.js | text | 294+1 | 293+0 | unit: getLineIndices | old:getLineIndices |
| 4caa8f6529862208d1528efedd5738393e06db597c46a86c0f03210c05c879b3 | lib/ast-utils.js | text | 293+0 | 293+1 | unit: getLineIndices | new:getLineIndices |
| ab95fe93b5043d5e80b27252fe819c1903c6b81165069d886dd8e9aa4bf38dde | lib/ast-utils.js | text | 293+0 | 294+1 | unit: getLineIndices | new:getLineIndices |
| 2462c248f642b5759c2937c619dd4c7e431df33c895dfe6d525937c1f08c656b | lib/ast-utils.js | text | 293+0 | 295+1 | unit: getLineIndices | new:getLineIndices |
| 28adcca0aef34d6ecb17fd0badcb7b10d5d9f5639253ab6b0602e8d9a6c45f80 | lib/ast-utils.js | text | 293+0 | 296+1 | unit: getLineIndices | new:getLineIndices |
| 1b77e85ff849e9eaeb63749e4a647fa3d7998e64955d0aa1d034cf5b0fe9a520 | lib/ast-utils.js | text | 293+0 | 297+1 | unit: getLineIndices | new:getLineIndices |
| 22e4740f3f7e08288b26770b1c9c498cb65519e6814e9f7253dcb59ea1f83eda | lib/ast-utils.js | text | 293+0 | 298+1 | unit: getLineIndices | new:getLineIndices |
| 33cf962b54ad94fefe4fe85bb748c43aee2a0c648f2b906b443dabe07ccb50d0 | lib/ast-utils.js | text | 293+0 | 299+1 | unit: getLineIndices | new:getLineIndices |
| f2555cae7f87cc99ca82adacf3cef431a6801eb4a79e6b94053b4312151649c0 | lib/ast-utils.js | text | 293+0 | 300+1 | unit: getLineIndices | new:getLineIndices |
| 3dee3212f48167ad9d6cc54861c53bcb899e7e2c3e4dfd5ddf851197cd1d04ad | lib/ast-utils.js | text | 293+0 | 301+1 | unit: getLineIndices | new:getLineIndices |
| 287062258b6f07103b7e718e8eb7a666ee08b71a71e77a57cdcb68d437017133 | lib/ast-utils.js | text | 293+0 | 302+1 | unit: getLineIndices | new:getLineIndices |
| ad9b530dd9e402b269f1ed292f6de1cdb29981c4373ac84211f0b64096e5be58 | lib/ast-utils.js | text | 293+0 | 303+1 | unit: getLineIndices | new:getLineIndices |
| 692d341be2e4fc1729961d95ce4234b63b090d15eedcad8939790c11360e862e | lib/ast-utils.js | text | 293+0 | 304+1 | unit: getLineIndices | new:getLineIndices |
| c61320a23b268f6a7001f8ae2f61f65f94fcbf59cf52be97cdc87c7677bc5d9a | lib/ast-utils.js | text | 293+0 | 305+1 | unit: getLineIndices | new:getLineIndices |
| 7bf1de86d35755b1ed7a866898cd324ea81975b39c9966717b33caaeca45ee9d | lib/ast-utils.js | text | 293+0 | 306+1 | unit: getLineIndices | new:getLineIndices |
| f05d8a70d101107bc5f5c598d5f971341da79c899f918959ba99861001eb14d2 | lib/ast-utils.js | text | 293+0 | 307+1 | unit: getLineIndices | new:getLineIndices |
| f4a9f84ab37d5296d0b18784ef9a77d65c9e799cfa760a9a537655834b8dfc4d | lib/ast-utils.js | text | 293+0 | 308+1 | unit: getLineIndices | new:getLineIndices |
| d1214d26d7138ac3884f012bb080c8c0ff7e7ca464f6bb89a2338f7be2412c30 | lib/ast-utils.js | text | 293+0 | 309+1 | unit: getLineIndices | new:getLineIndices |

source: {"unit":["e96debdb373033dde63593056d3a7cac5c18c094c6a5bc3bef07e899a3cf1aec","5f5a55a9ec3bf2aafc6bfa1e27e1de34dcf5b1c2fffdbfd2a8f70c360baf6a7e","4caa8f6529862208d1528efedd5738393e06db597c46a86c0f03210c05c879b3","ab95fe93b5043d5e80b27252fe819c1903c6b81165069d886dd8e9aa4bf38dde","2462c248f642b5759c2937c619dd4c7e431df33c895dfe6d525937c1f08c656b","28adcca0aef34d6ecb17fd0badcb7b10d5d9f5639253ab6b0602e8d9a6c45f80","1b77e85ff849e9eaeb63749e4a647fa3d7998e64955d0aa1d034cf5b0fe9a520","22e4740f3f7e08288b26770b1c9c498cb65519e6814e9f7253dcb59ea1f83eda","33cf962b54ad94fefe4fe85bb748c43aee2a0c648f2b906b443dabe07ccb50d0","f2555cae7f87cc99ca82adacf3cef431a6801eb4a79e6b94053b4312151649c0","3dee3212f48167ad9d6cc54861c53bcb899e7e2c3e4dfd5ddf851197cd1d04ad","287062258b6f07103b7e718e8eb7a666ee08b71a71e77a57cdcb68d437017133","ad9b530dd9e402b269f1ed292f6de1cdb29981c4373ac84211f0b64096e5be58","692d341be2e4fc1729961d95ce4234b63b090d15eedcad8939790c11360e862e","c61320a23b268f6a7001f8ae2f61f65f94fcbf59cf52be97cdc87c7677bc5d9a","7bf1de86d35755b1ed7a866898cd324ea81975b39c9966717b33caaeca45ee9d","f05d8a70d101107bc5f5c598d5f971341da79c899f918959ba99861001eb14d2","f4a9f84ab37d5296d0b18784ef9a77d65c9e799cfa760a9a537655834b8dfc4d","d1214d26d7138ac3884f012bb080c8c0ff7e7ca464f6bb89a2338f7be2412c30"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 1; terminal 1; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__85/run-T1qTV1/terminal.json