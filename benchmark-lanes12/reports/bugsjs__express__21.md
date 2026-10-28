# lean report: 746044b6c2886c6bc6d60c38ef423b5a7e9e8f54 → 9ea3112f92260c8b8fb16d19da70aa2d0b00b090

Identity: c79f3328283629809d1e526db0d92b8e43a22adec279afc359d116dccb295f4c; lean 815fc01fec5f51af99003faa686f25330e7c33ad

22 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 22 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/router/index.js | `restore` (445-462) | **ASK** | refused:var | ASK |  | /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean |
| lib/router/index.js | `wrap` (465-470) | **ASK** | refused:callback-form | ASK |  | /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean |
| lib/router/index.js | `(edit 2be3b0f8a653)` (135-135) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit 137bae220034)` (137-137) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit 32fe95b980e1)` (138-138) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit 0592afeb44f7)` (139-139) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit 37615fa75383)` (140-140) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit 4a65accb2f6f)` (141-141) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit 3a09afa3a531)` (136-136) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit a55ffbfbb7a5)` (137-137) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/router/index.js | `(edit 48819892a3d9)` (138-138) | **ASK** | unassigned:comment |  |  | comment |
| lib/router/index.js | `(edit 4dd20018b7e8)` (263-263) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/router/index.js | `(edit fe459a0e8a40)` (264-264) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit 1574fc088972)` (265-265) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit b4dd49b5b67d)` (266-266) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit 57b6cc8de615)` (267-267) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit 666173789037)` (268-268) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit b8774104b8e6)` (269-269) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/router/index.js | `(edit f46127ff90dd)` (443-443) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/router/index.js | `(edit 6a81413c19d0)` (444-444) | **ASK** | unassigned:comment |  |  | comment |
| lib/router/index.js | `(edit c8a3419a93ea)` (463-463) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/router/index.js | `(edit c86cdad869e1)` (464-464) | **ASK** | unassigned:comment |  |  | comment |

## What would make the asks provable

### lib/router/index.js · `restore`

- line 446, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 446, `arguments`: `arguments` is the actual argument vector, not the declared one; name the parameter, or declare a rest parameter
  do: [migration] `arguments` is the actual argument vector, not the declared one; name the parameter, or declare a rest parameter (`...args`) and read `args.length` and `args[k]`.
- line 447, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 447, `arguments`: `arguments` is the actual argument vector, not the declared one; name the parameter, or declare a rest parameter
  do: [migration] `arguments` is the actual argument vector, not the declared one; name the parameter, or declare a rest parameter (`...args`) and read `args.length` and `args[k]`.
- line 449, `var`: `var` is outside the subset; use let or const
  do: [conditional: the binding is inside a function, has one declaration, every use follows it in the same block, and no closure inside a loop captures it] Replace var with let only under the precondition. Hoisting, repeated declarations and loop closures can change the result.
- line 450, `arguments`: `arguments` is the actual argument vector, not the declared one; name the parameter, or declare a rest parameter
  do: [migration] `arguments` is the actual argument vector, not the declared one; name the parameter, or declare a rest parameter (`...args`) and read `args.length` and `args[k]`.
- line 454, `callback-form`: the callback must be an arrow function
  do: [conditional: the function has no `this`, `arguments` or `new.target` in it and is never called with `new`] The callback must be an arrow function with plain parameters. A named function is read by name when its own parameters are plain; otherwise pass it the arguments JavaScript passes, `xs.map((x, i, a) => f(x, i, a))`, or only the ones it reads. An effectful callback may destructure its element or default it where the element type never holds undefined; name the fields you read instead of a rest element.
- line 460, `implicit-this`: TS2683: `this` the function does not declare; declare the receiver as a `this` parameter
  do: [conditional: the declared type covers every receiver the function is called with] Declare the receiver as the first parameter, `function f(this: T, ...)`: a type annotation, the emitted JavaScript is the same, and a declared receiver is read as the function's first operand.

### lib/router/index.js · `wrap`

- line 466, `callback-form`: the callback must be an arrow function
  do: [conditional: the function has no `this`, `arguments` or `new.target` in it and is never called with `new`] The callback must be an arrow function with plain parameters. A named function is read by name when its own parameters are plain; otherwise pass it the arguments JavaScript passes, `xs.map((x, i, a) => f(x, i, a))`, or only the ones it reads. An effectful callback may destructure its element or default it where the element type never holds undefined; name the fields you read instead of a rest element.
- line 468, `implicit-this`: TS2683: `this` the function does not declare; declare the receiver as a `this` parameter
  do: [conditional: the declared type covers every receiver the function is called with] Declare the receiver as the first parameter, `function f(this: T, ...)`: a type annotation, the emitted JavaScript is the same, and a declared receiver is read as the function's first operand.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 44 = 24 unit + 0 artifact + 20 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 2be3b0f8a65380f5578ee8094439bbb2bde58c0b35a7d244acffbbff518e881c | lib/router/index.js | text | 135+1 | 134+0 | unassigned: module-level statement |  |
| 137bae220034c30fb60b6a77ec51244f55dda5c0c033729c71a409a182ab20f0 | lib/router/index.js | text | 137+1 | 136+0 | unassigned: module-level statement |  |
| 32fe95b980e10292fa97a7fbbc6af8f3f6935c705dd5b32df210c7e21ed303a6 | lib/router/index.js | text | 138+1 | 136+0 | unassigned: module-level statement |  |
| 0592afeb44f7aba8d0f51e88df91f9930a58a0d5774bb4b9f61d692b52884b30 | lib/router/index.js | text | 139+1 | 136+0 | unassigned: module-level statement |  |
| 37615fa753838db95d24b0ef5dc62738ecb9a324ba4c377e2280c45e6d84f665 | lib/router/index.js | text | 140+1 | 136+0 | unassigned: module-level statement |  |
| 4a65accb2f6f7076b2b3bd34192295b2893340b473cd4efca917b9e337dcdcf2 | lib/router/index.js | text | 141+1 | 136+0 | unassigned: module-level statement |  |
| 3a09afa3a531303278e4334fb2af17370dd964068f0d59c39c8f2e0a77af0717 | lib/router/index.js | text | 137+0 | 136+1 | unassigned: module-level statement |  |
| a55ffbfbb7a58a56248ec0572959d0bf6e8d31dcfd27d4c94d0af0152c1a4ba3 | lib/router/index.js | text | 137+0 | 137+1 | unassigned: whitespace |  |
| 48819892a3d993148b5cc29a6e2842060f7f2783a31937a6b7828acd5ea4d9bc | lib/router/index.js | text | 137+0 | 138+1 | unassigned: comment |  |
| 4dd20018b7e883df5264c3edc4f826637a41779823f4aaa587a108952fa40f92 | lib/router/index.js | text | 263+1 | 259+0 | unassigned: whitespace |  |
| fe459a0e8a4020cd1ad4ee036d33845e783eb4886b6d6c392d1d65ea98f18295 | lib/router/index.js | text | 264+1 | 259+0 | unassigned: module-level statement |  |
| 1574fc08897221f587de2086b925785e826aca645dcff36b86a8e9e84a045565 | lib/router/index.js | text | 265+1 | 259+0 | unassigned: module-level statement |  |
| b4dd49b5b67dcc6c78fd7abfb190fdf10270e84b361dd67fbe7dfaf7a732c638 | lib/router/index.js | text | 266+1 | 259+0 | unassigned: module-level statement |  |
| 57b6cc8de6156b100efc7ecce27267a895e85c03f5a625791b0ce0c1a7951110 | lib/router/index.js | text | 267+1 | 259+0 | unassigned: module-level statement |  |
| 666173789037a5570ecb067c0dbbec9aa626aa659fad3164d021bb4cd3f7e852 | lib/router/index.js | text | 268+1 | 259+0 | unassigned: module-level statement |  |
| b8774104b8e6231dc7dbcd041828f7a6d12c94240b52f063d3abe7adc13df754 | lib/router/index.js | text | 269+1 | 259+0 | unassigned: module-level statement |  |
| f46127ff90ddc280c67177f791a72eb2a63a04a24ff6e838c63a8744204001e4 | lib/router/index.js | text | 452+0 | 443+1 | unassigned: whitespace |  |
| 6a81413c19d0df4af122e8bd44a63a869134c194a52f55835723596462cde995 | lib/router/index.js | text | 452+0 | 444+1 | unassigned: comment |  |
| c6a148346173e8429fea9f3781848abf98c804c38335e8956ddcd140bd5ff4eb | lib/router/index.js | text | 452+0 | 445+1 | unit: restore | new:restore |
| 1f043c96d1ff9a9a891adc96d05c9d18c882aa8d2ec604664c96bd2a1cd58522 | lib/router/index.js | text | 452+0 | 446+1 | unit: restore | new:restore |
| 150f26b2ec89780c60bf70504cd8d5c3859aa6e40c24981cf04174b6588c9a2c | lib/router/index.js | text | 452+0 | 447+1 | unit: restore | new:restore |
| c900be5c264352ae3adeb94c88f36d588c6cf28701f7f994dc2e4d01240cf5a3 | lib/router/index.js | text | 452+0 | 448+1 | unit: restore | new:restore |
| 7cb6a438605f333c6a024202263edbe662dd4f1a07daa0c58944b60e3f8d1a71 | lib/router/index.js | text | 452+0 | 449+1 | unit: restore | new:restore |
| 027c46c054f75ac137b8d6236069ae635f43ca31a620d37ea578a473f6e7f26b | lib/router/index.js | text | 452+0 | 450+1 | unit: restore | new:restore |
| 241b288ff46c8394830f7be1e885acae116f8436f3f13895a748b7669d29d497 | lib/router/index.js | text | 452+0 | 451+1 | unit: restore | new:restore |
| da5b30810ef9c01f9056865162070970b5345d868c2cc23fbf8a1ab22ac3dced | lib/router/index.js | text | 452+0 | 452+1 | unit: restore | new:restore |
| 836b9f0660aa8ae1e4b0e9fad3691279d3f1575c7f7348fc50c6fb16c5e0ac81 | lib/router/index.js | text | 452+0 | 453+1 | unit: restore | new:restore |
| 395c67b94585c3ad6e3fd1cc3e9cc6bef0d5b21e0f5420ddd4172dbed005cb7b | lib/router/index.js | text | 452+0 | 454+1 | unit: restore | new:restore |
| 15b5dfcd115cdfc725c9586b58b424d8f8574278aceb65dd86191b31e35e4ac4 | lib/router/index.js | text | 452+0 | 455+1 | unit: restore | new:restore |
| 93fbfe09ac89291abbc175736be3324ae4ecdb0194c415e8777ec864529a523a | lib/router/index.js | text | 452+0 | 456+1 | unit: restore | new:restore |
| 1f5e44d4f5f6e4fbea65fc03f98a42c13b696c362f5e0c59816884cf935a48cc | lib/router/index.js | text | 452+0 | 457+1 | unit: restore | new:restore |
| 34fd6224c0f73aa723e4df8ed05dfacebb30538c825c7af63a1b04d790a79773 | lib/router/index.js | text | 452+0 | 458+1 | unit: restore | new:restore |
| d6d1ddf866cb8320e5ac99431dbac416b370989e2e342d285690b1b99f4a5002 | lib/router/index.js | text | 452+0 | 459+1 | unit: restore | new:restore |
| c984a34547d883492f4bab97b1a9c147521790319a63f0e387bd6276663ba05e | lib/router/index.js | text | 452+0 | 460+1 | unit: restore | new:restore |
| b2fb52ba986976832bab27b3ef974092eb01c3a6a13d04ec3a90f6b7092858a4 | lib/router/index.js | text | 452+0 | 461+1 | unit: restore | new:restore |
| 58cf8140da6a449e50cbf3101d1d5bdababb106b41ffe122a30ee7d003f165bc | lib/router/index.js | text | 452+0 | 462+1 | unit: restore | new:restore |
| c8a3419a93eaeafa8160fa5bb574877d8936330779ea8cb129849efa272aa869 | lib/router/index.js | text | 452+0 | 463+1 | unassigned: whitespace |  |
| c86cdad869e1c447d6b7cde9014e1165230ecd62aa3c6368e05998d99d0211c5 | lib/router/index.js | text | 452+0 | 464+1 | unassigned: comment |  |
| 1125e4693350645e95dd843f980cdfba0896aa44782a1de80110174b75acd24c | lib/router/index.js | text | 452+0 | 465+1 | unit: wrap | new:wrap |
| 67d37255f50cbb3e1b0920e76788b97be35712a633af14d2b4ff229f3cadfba6 | lib/router/index.js | text | 452+0 | 466+1 | unit: wrap | new:wrap |
| 54567d169cad2d344a2fd271f69464fb98c567cb3bd4cf2b955db8220a87c850 | lib/router/index.js | text | 452+0 | 467+1 | unit: wrap | new:wrap |
| e5d8bfac142ebf0ee4f8fa35bb33e825d12ad123555d47dcb2a72592e6928848 | lib/router/index.js | text | 452+0 | 468+1 | unit: wrap | new:wrap |
| 7197c3eef1cd175c7159972af492b13bf9cf4b8e40cde018990d307ef7e585ff | lib/router/index.js | text | 452+0 | 469+1 | unit: wrap | new:wrap |
| ff9e1d72d007fd047173ef68361548dcaa96f39141abfe179fbb095a1f64df09 | lib/router/index.js | text | 452+0 | 470+1 | unit: wrap | new:wrap |

source: {"unit":["c6a148346173e8429fea9f3781848abf98c804c38335e8956ddcd140bd5ff4eb","1f043c96d1ff9a9a891adc96d05c9d18c882aa8d2ec604664c96bd2a1cd58522","150f26b2ec89780c60bf70504cd8d5c3859aa6e40c24981cf04174b6588c9a2c","c900be5c264352ae3adeb94c88f36d588c6cf28701f7f994dc2e4d01240cf5a3","7cb6a438605f333c6a024202263edbe662dd4f1a07daa0c58944b60e3f8d1a71","027c46c054f75ac137b8d6236069ae635f43ca31a620d37ea578a473f6e7f26b","241b288ff46c8394830f7be1e885acae116f8436f3f13895a748b7669d29d497","da5b30810ef9c01f9056865162070970b5345d868c2cc23fbf8a1ab22ac3dced","836b9f0660aa8ae1e4b0e9fad3691279d3f1575c7f7348fc50c6fb16c5e0ac81","395c67b94585c3ad6e3fd1cc3e9cc6bef0d5b21e0f5420ddd4172dbed005cb7b","15b5dfcd115cdfc725c9586b58b424d8f8574278aceb65dd86191b31e35e4ac4","93fbfe09ac89291abbc175736be3324ae4ecdb0194c415e8777ec864529a523a","1f5e44d4f5f6e4fbea65fc03f98a42c13b696c362f5e0c59816884cf935a48cc","34fd6224c0f73aa723e4df8ed05dfacebb30538c825c7af63a1b04d790a79773","d6d1ddf866cb8320e5ac99431dbac416b370989e2e342d285690b1b99f4a5002","c984a34547d883492f4bab97b1a9c147521790319a63f0e387bd6276663ba05e","b2fb52ba986976832bab27b3ef974092eb01c3a6a13d04ec3a90f6b7092858a4","58cf8140da6a449e50cbf3101d1d5bdababb106b41ffe122a30ee7d003f165bc","1125e4693350645e95dd843f980cdfba0896aa44782a1de80110174b75acd24c","67d37255f50cbb3e1b0920e76788b97be35712a633af14d2b4ff229f3cadfba6","54567d169cad2d344a2fd271f69464fb98c567cb3bd4cf2b955db8220a87c850","e5d8bfac142ebf0ee4f8fa35bb33e825d12ad123555d47dcb2a72592e6928848","7197c3eef1cd175c7159972af492b13bf9cf4b8e40cde018990d307ef7e585ff","ff9e1d72d007fd047173ef68361548dcaa96f39141abfe179fbb095a1f64df09"],"artifact":[],"unassigned":["2be3b0f8a65380f5578ee8094439bbb2bde58c0b35a7d244acffbbff518e881c","137bae220034c30fb60b6a77ec51244f55dda5c0c033729c71a409a182ab20f0","32fe95b980e10292fa97a7fbbc6af8f3f6935c705dd5b32df210c7e21ed303a6","0592afeb44f7aba8d0f51e88df91f9930a58a0d5774bb4b9f61d692b52884b30","37615fa753838db95d24b0ef5dc62738ecb9a324ba4c377e2280c45e6d84f665","4a65accb2f6f7076b2b3bd34192295b2893340b473cd4efca917b9e337dcdcf2","3a09afa3a531303278e4334fb2af17370dd964068f0d59c39c8f2e0a77af0717","a55ffbfbb7a58a56248ec0572959d0bf6e8d31dcfd27d4c94d0af0152c1a4ba3","48819892a3d993148b5cc29a6e2842060f7f2783a31937a6b7828acd5ea4d9bc","4dd20018b7e883df5264c3edc4f826637a41779823f4aaa587a108952fa40f92","fe459a0e8a4020cd1ad4ee036d33845e783eb4886b6d6c392d1d65ea98f18295","1574fc08897221f587de2086b925785e826aca645dcff36b86a8e9e84a045565","b4dd49b5b67dcc6c78fd7abfb190fdf10270e84b361dd67fbe7dfaf7a732c638","57b6cc8de6156b100efc7ecce27267a895e85c03f5a625791b0ce0c1a7951110","666173789037a5570ecb067c0dbbec9aa626aa659fad3164d021bb4cd3f7e852","b8774104b8e6231dc7dbcd041828f7a6d12c94240b52f063d3abe7adc13df754","f46127ff90ddc280c67177f791a72eb2a63a04a24ff6e838c63a8744204001e4","6a81413c19d0df4af122e8bd44a63a869134c194a52f55835723596462cde995","c8a3419a93eaeafa8160fa5bb574877d8936330779ea8cb129849efa272aa869","c86cdad869e1c447d6b7cde9014e1165230ecd62aa3c6368e05998d99d0211c5"]}

Task reconciliation: expected 22; terminal 22; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__express__21/run-nedYXA/terminal.json