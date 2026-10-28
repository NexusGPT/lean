# lean report: 3e8b70a44cf8cf5d914682980ca13f6140f2bdde → e20d89f8dd8552ffebe013c392ddc081623df83c

Identity: f2fa95cdef0e0fd4a5dc2f71e7aca049255eb1c0f166cc4c6f8231e3b341611a; lean 815fc01fec5f51af99003faa686f25330e7c33ad

1 changed function(s); 1 unchanged caller(s) checked through lane B, 0 with a WITNESS through a changed callee: **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 1 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/linter.js | `Linter.verify` (798-1034) | **ASK** | refused:ts-strict | ASK |  | input 93: parent budget: more than 20000 environment operations |

## What would make the asks provable

### lib/linter.js · `Linter.verify`

- line 794, `ts-strict`: TS8032: Qualified name 'filenameOrOptions.allowInlineConfig' is not allowed without a leading '@param {object} filenameOrOptions'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 813, `unsupported-member`: property .filename is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 813, `ts-strict`: TS2339: Property 'filename' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 814, `unsupported-member`: property .allowInlineConfig is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 814, `ts-strict`: TS2339: Property 'allowInlineConfig' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 815, `unsupported-member`: property .saveState is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 815, `ts-strict`: TS2339: Property 'saveState' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 825, `type-assertion`: `text` holds a value whose type nothing checked (an `as` that narrows, or an any or unknown value), and this slot reads it as its declared type; test it first (`typeof x === "number"`, a field test), or keep it in a local, an operation or the result


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 33 = 33 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| c21031ea7558aae92a232bbf58c2ac0164a7ef371b377368bd19383e5c1d8ac8 | lib/linter.js | text | 893+1 | 893+0 | unit: Linter.verify | old:Linter.verify |
| da9f5c6aa48659f9784e52e4f59c7a55df8fc24b4982ae2a14e9fd3c13726380 | lib/linter.js | text | 893+0 | 893+1 | unit: Linter.verify | new:Linter.verify |
| 2f9e6c941832996e276b15e55d7015745c274179725549ad0ac0b055c3d3a4ef | lib/linter.js | text | 893+0 | 894+1 | unit: Linter.verify | new:Linter.verify |
| 6d231cc07fb6e1bdffa654b5f8588802711d1081b2c47a2d75a06c55a8921b61 | lib/linter.js | text | 893+0 | 895+1 | unit: Linter.verify | new:Linter.verify |
| c79ace8130594cb211d7550ec475bab975cf4c67d02db2935f0a0aa32b1a32c0 | lib/linter.js | text | 893+0 | 896+1 | unit: Linter.verify | new:Linter.verify |
| b79dff5ab91da7a8efd48fe30a6198f1644cca863b770625f6c27292210c95d3 | lib/linter.js | text | 893+0 | 897+1 | unit: Linter.verify | new:Linter.verify |
| d1551fa251974493abdd759ff84db459bb348e397c2d7a511b6c742c5e2ad8d4 | lib/linter.js | text | 893+0 | 898+1 | unit: Linter.verify | new:Linter.verify |
| bc748ee2c1b00c977edc7ab6ca04ce52220236c0fa2707fe7bf504a1a4795abe | lib/linter.js | text | 893+0 | 899+1 | unit: Linter.verify | new:Linter.verify |
| 78d4276bf462a4afe2ea3af8575c5d42bcc8c30be74ca4d8e947983a4814f692 | lib/linter.js | text | 893+0 | 900+1 | unit: Linter.verify | new:Linter.verify |
| 65cfe9c1b862ae1a321fe09b057fc26972436e359cc8555e601d179bd7f9c2cb | lib/linter.js | text | 893+0 | 901+1 | unit: Linter.verify | new:Linter.verify |
| fff526d390e356d804f71d4885bb1ee1239646f21fb9b095a732eaa6f65bf551 | lib/linter.js | text | 893+0 | 902+1 | unit: Linter.verify | new:Linter.verify |
| 09c6552a2e4cf6fcc31dcdff9d86b64364b0031424e3beb190ff7734585e12f1 | lib/linter.js | text | 893+0 | 903+1 | unit: Linter.verify | new:Linter.verify |
| 4a6dd82a27ecc733a0a43ef6f2cdb20ced4bb1bd7ff2625235abac5e2d6728ab | lib/linter.js | text | 893+0 | 904+1 | unit: Linter.verify | new:Linter.verify |
| 2c60d33980e7a575afecc2d7c97d9e593da9103eb685849632774cc1fd1276c8 | lib/linter.js | text | 893+0 | 905+1 | unit: Linter.verify | new:Linter.verify |
| 2fe0434aff103d662bb1f15bf6df5daa8b39cfde99ce94cf0d38aab22f2ff367 | lib/linter.js | text | 893+0 | 906+1 | unit: Linter.verify | new:Linter.verify |
| 31c1af7e3790937438d6a4af490a029a2cb29d3252f34d7e28e29747f53ad3eb | lib/linter.js | text | 928+0 | 942+1 | unit: Linter.verify | new:Linter.verify |
| dd086f758fb76a171e7059fc31217ca7489298de8334776fbc7a268bbf5b3054 | lib/linter.js | text | 928+0 | 943+1 | unit: Linter.verify | new:Linter.verify |
| dd686f34a1ff8d5ecfb92fa83ca14984a9e8d66c572e7e8940c3f8200ef39623 | lib/linter.js | text | 928+0 | 944+1 | unit: Linter.verify | new:Linter.verify |
| e41b6ab8916b9fb2d23571e92f80cbb46cd7e4f944fb266d8f814e015aa9c9ff | lib/linter.js | text | 928+0 | 945+1 | unit: Linter.verify | new:Linter.verify |
| f2794f1b7f245991a737cad615d2a36c9640e1f732632864013e9ce644c56172 | lib/linter.js | text | 928+0 | 946+1 | unit: Linter.verify | new:Linter.verify |
| 48d7f2a58ec472a679d3087c6bd837406ea952e43f6dde954e66e4c681b15f91 | lib/linter.js | text | 928+0 | 947+1 | unit: Linter.verify | new:Linter.verify |
| c3f71d0de71614fcd7709b39ab243e82238148ec6625d808134185880b27b1f7 | lib/linter.js | text | 928+0 | 948+1 | unit: Linter.verify | new:Linter.verify |
| 8178328447d013709105ddd608fc66f82315f73a7ea45644e233b900d2731764 | lib/linter.js | text | 928+0 | 949+1 | unit: Linter.verify | new:Linter.verify |
| 6cff32d9809c0ae9e9aaeda93edad1962b09255320245427f892391c765d28f7 | lib/linter.js | text | 928+0 | 950+1 | unit: Linter.verify | new:Linter.verify |
| 734ea3756bb561d06429b0034cebd106659a4b48737b96c75bb283fa689d579e | lib/linter.js | text | 928+0 | 951+1 | unit: Linter.verify | new:Linter.verify |
| e1958ad3b2f8fb38348e764a7d6faaa918f863bf43d00791c1e74c9775fb14d2 | lib/linter.js | text | 928+0 | 952+1 | unit: Linter.verify | new:Linter.verify |
| c73412a8bdb39424111435047643e3158a1e43df0722ca51df93791d562d6c9a | lib/linter.js | text | 928+0 | 953+1 | unit: Linter.verify | new:Linter.verify |
| 71bfee8cbc48b9c374c60686bebc80c74d69e29bc965c512398d9195e16a3ca2 | lib/linter.js | text | 928+0 | 954+1 | unit: Linter.verify | new:Linter.verify |
| 3591e2933e2aa1454e7874e34a0aa46184131995b73b31ae2cebab8b11bac977 | lib/linter.js | text | 928+0 | 955+1 | unit: Linter.verify | new:Linter.verify |
| 2e2a58674f8801eaf3a6390b59c562831caf77fbd7888e7fad553fe9c00e17f7 | lib/linter.js | text | 928+0 | 956+1 | unit: Linter.verify | new:Linter.verify |
| d244455d89ba3d35ceb6d83595a5ff5ff2581a49717806a07f8b4e80b060226e | lib/linter.js | text | 928+0 | 957+1 | unit: Linter.verify | new:Linter.verify |
| 62861f81287712f3efae946cfd5e94ccc7c8f7da90176836896fb39f98347e0c | lib/linter.js | text | 928+0 | 958+1 | unit: Linter.verify | new:Linter.verify |
| ccb6b6f598e3629c54e88dba8bf6ba4c7e0110a9ab36eb8f86489da078b4293a | lib/linter.js | text | 928+0 | 959+1 | unit: Linter.verify | new:Linter.verify |

source: {"unit":["c21031ea7558aae92a232bbf58c2ac0164a7ef371b377368bd19383e5c1d8ac8","da9f5c6aa48659f9784e52e4f59c7a55df8fc24b4982ae2a14e9fd3c13726380","2f9e6c941832996e276b15e55d7015745c274179725549ad0ac0b055c3d3a4ef","6d231cc07fb6e1bdffa654b5f8588802711d1081b2c47a2d75a06c55a8921b61","c79ace8130594cb211d7550ec475bab975cf4c67d02db2935f0a0aa32b1a32c0","b79dff5ab91da7a8efd48fe30a6198f1644cca863b770625f6c27292210c95d3","d1551fa251974493abdd759ff84db459bb348e397c2d7a511b6c742c5e2ad8d4","bc748ee2c1b00c977edc7ab6ca04ce52220236c0fa2707fe7bf504a1a4795abe","78d4276bf462a4afe2ea3af8575c5d42bcc8c30be74ca4d8e947983a4814f692","65cfe9c1b862ae1a321fe09b057fc26972436e359cc8555e601d179bd7f9c2cb","fff526d390e356d804f71d4885bb1ee1239646f21fb9b095a732eaa6f65bf551","09c6552a2e4cf6fcc31dcdff9d86b64364b0031424e3beb190ff7734585e12f1","4a6dd82a27ecc733a0a43ef6f2cdb20ced4bb1bd7ff2625235abac5e2d6728ab","2c60d33980e7a575afecc2d7c97d9e593da9103eb685849632774cc1fd1276c8","2fe0434aff103d662bb1f15bf6df5daa8b39cfde99ce94cf0d38aab22f2ff367","31c1af7e3790937438d6a4af490a029a2cb29d3252f34d7e28e29747f53ad3eb","dd086f758fb76a171e7059fc31217ca7489298de8334776fbc7a268bbf5b3054","dd686f34a1ff8d5ecfb92fa83ca14984a9e8d66c572e7e8940c3f8200ef39623","e41b6ab8916b9fb2d23571e92f80cbb46cd7e4f944fb266d8f814e015aa9c9ff","f2794f1b7f245991a737cad615d2a36c9640e1f732632864013e9ce644c56172","48d7f2a58ec472a679d3087c6bd837406ea952e43f6dde954e66e4c681b15f91","c3f71d0de71614fcd7709b39ab243e82238148ec6625d808134185880b27b1f7","8178328447d013709105ddd608fc66f82315f73a7ea45644e233b900d2731764","6cff32d9809c0ae9e9aaeda93edad1962b09255320245427f892391c765d28f7","734ea3756bb561d06429b0034cebd106659a4b48737b96c75bb283fa689d579e","e1958ad3b2f8fb38348e764a7d6faaa918f863bf43d00791c1e74c9775fb14d2","c73412a8bdb39424111435047643e3158a1e43df0722ca51df93791d562d6c9a","71bfee8cbc48b9c374c60686bebc80c74d69e29bc965c512398d9195e16a3ca2","3591e2933e2aa1454e7874e34a0aa46184131995b73b31ae2cebab8b11bac977","2e2a58674f8801eaf3a6390b59c562831caf77fbd7888e7fad553fe9c00e17f7","d244455d89ba3d35ceb6d83595a5ff5ff2581a49717806a07f8b4e80b060226e","62861f81287712f3efae946cfd5e94ccc7c8f7da90176836896fb39f98347e0c","ccb6b6f598e3629c54e88dba8bf6ba4c7e0110a9ab36eb8f86489da078b4293a"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 2; terminal 2; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__29/run-W1Tt4p/terminal.json