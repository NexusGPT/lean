# lean report: 031a35614f9353b57c072ba14aff16f930ab6520 → eda6079b4191072ee5ae022b39ccfb7617fbd1e8

Identity: 92218780207f8814a77a6c56d99dff09fd491c2bed1acc9b476e66a2200f19b2; lean 815fc01fec5f51af99003faa686f25330e7c33ad

22 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 22 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/util/npm-util.js | `checkPackageJson` (133-135) | **ASK** | failed:loader | ASK |  | /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean |
| lib/config/config-initializer.js | `(edit 6a29815ae580)` (49-49) | **ASK** | artifact:config |  |  | config |
| lib/config/config-initializer.js | `(edit 6a0fea9e69f3)` (321-321) | **ASK** | artifact:config |  |  | config |
| lib/config/config-initializer.js | `(edit 0554966b8e20)` (320-320) | **ASK** | artifact:config |  |  | config |
| lib/config/config-initializer.js | `(edit c9dfd2f9810b)` (321-321) | **ASK** | artifact:config |  |  | config |
| lib/config/config-initializer.js | `(edit 7b5745485210)` (345-345) | **ASK** | artifact:config |  |  | config |
| lib/config/config-initializer.js | `(edit e73a67db5356)` (345-345) | **ASK** | artifact:config |  |  | config |
| lib/config/config-initializer.js | `(edit c30579fd06bf)` (352-352) | **ASK** | artifact:config |  |  | config |
| lib/config/config-initializer.js | `(edit 5f44b761efa7)` (353-353) | **ASK** | artifact:config |  |  | config |
| lib/config/config-initializer.js | `(edit 40f4a0d43a2c)` (354-354) | **ASK** | artifact:config |  |  | config |
| lib/config/config-initializer.js | `(edit 91e319b57112)` (355-355) | **ASK** | artifact:config |  |  | config |
| lib/config/config-initializer.js | `(edit e88423d4af0f)` (356-356) | **ASK** | artifact:config |  |  | config |
| lib/util/npm-util.js | `(edit 3948ca073d0d)` (127-127) | **ASK** | unassigned:comment |  |  | comment |
| lib/util/npm-util.js | `(edit 1fb6ad32c9f9)` (128-128) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/util/npm-util.js | `(edit 4328551878a9)` (129-129) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/util/npm-util.js | `(edit 4bae76c4ac73)` (130-130) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/util/npm-util.js | `(edit 40924c69bf2a)` (131-131) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/util/npm-util.js | `(edit f6ed54f20d54)` (132-132) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/util/npm-util.js | `(edit 09391c43b3c0)` (136-136) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/util/npm-util.js | `(edit fdc3269cd0fe)` (134-134) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/util/npm-util.js | `(edit 17e7b757ec29)` (144-144) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/util/npm-util.js | `(edit ad8dcaf7d91c)` (145-145) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 24 = 3 unit + 11 artifact + 10 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 6a29815ae58076aec9b5b7651f8d5ceeedafa871c9c851f26cf6acedd8bf2fdf | lib/config/config-initializer.js | text | 49+1 | 48+0 | artifact: config | old:writeFile |
| 6a0fea9e69f3f684b2ed87e57e3822e46e6c3ff992f9702ba254fe8d59ee1c07 | lib/config/config-initializer.js | text | 321+1 | 320+0 | artifact: config | old:promptUser |
| 0554966b8e20650bf2054d0c4eab582c82d789e970ff2674febe4c4368de7735 | lib/config/config-initializer.js | text | 321+0 | 320+1 | artifact: config | new:promptUser |
| c9dfd2f9810b325de483fa503856ef5107ea6315a9b0c3238a89fef655002f16 | lib/config/config-initializer.js | text | 321+0 | 321+1 | artifact: config | new:promptUser |
| 7b57454852104f33d790b525f88d457cbc770977da12bf63c52bff0c399b812a | lib/config/config-initializer.js | text | 345+1 | 345+0 | artifact: config | old:promptUser |
| e73a67db5356a06c6a791c36cb7f21cd09a151e29496b3cb0cf80ea1a5047a72 | lib/config/config-initializer.js | text | 345+0 | 345+1 | artifact: config | new:promptUser |
| c30579fd06bfe334f48dd2e9b775870c785a0c2badae4d3a64ab852cf2aecb12 | lib/config/config-initializer.js | text | 351+0 | 352+1 | artifact: config | new:promptUser |
| 5f44b761efa768bf4bb940dc78fd111aafb53a75b705ccf32ebdfb0de9aafbb6 | lib/config/config-initializer.js | text | 351+0 | 353+1 | artifact: config | new:promptUser |
| 40f4a0d43a2c3d330980cd58e4e7af5d42ceaa3271170951f11b8a2a6f7a65ab | lib/config/config-initializer.js | text | 351+0 | 354+1 | artifact: config | new:promptUser |
| 91e319b571120971af63f0bb17dc557084daba8642441fee8e2e86d23160f038 | lib/config/config-initializer.js | text | 351+0 | 355+1 | artifact: config | new:promptUser |
| e88423d4af0fa529cebc94c53c2b5edb94c128ba04e5cba98980a9b7ec6c35d2 | lib/config/config-initializer.js | text | 351+0 | 356+1 | artifact: config | new:promptUser |
| 3948ca073d0df5f2e5203cbc95532097a86301a8d653518a352ea7420a2d490c | lib/util/npm-util.js | text | 126+0 | 127+1 | unassigned: comment |  |
| 1fb6ad32c9f906d0f0e8a806092e2b01c469c57787e870917a17f5b8f9b3612b | lib/util/npm-util.js | text | 126+0 | 128+1 | unassigned: module-level statement |  |
| 4328551878a9fc45dcea4d68374ff1fc0d4f149710a326d5ab41f21e0480a1ef | lib/util/npm-util.js | text | 126+0 | 129+1 | unassigned: module-level statement |  |
| 4bae76c4ac73c6e3ca75d146380e788519fd8cfe56aff4764eb6076633e64d34 | lib/util/npm-util.js | text | 126+0 | 130+1 | unassigned: module-level statement |  |
| 40924c69bf2aca81bb6716732f2854865d961eed0f0ada46e464864e2b62f6c8 | lib/util/npm-util.js | text | 126+0 | 131+1 | unassigned: module-level statement |  |
| f6ed54f20d54a60c3e823a51eb3bc74e1291fdf1e53206155997fd9d730fe870 | lib/util/npm-util.js | text | 126+0 | 132+1 | unassigned: module-level statement |  |
| 29dbf8180dafb5b4e39e9635bd11514f0359879a53ed775bfa22d82f858b2f75 | lib/util/npm-util.js | text | 126+0 | 133+1 | unit: checkPackageJson | new:checkPackageJson |
| f6ab714516ec1407ed59f09d437387bae998e9b58352976771b48999957b9d28 | lib/util/npm-util.js | text | 126+0 | 134+1 | unit: checkPackageJson | new:checkPackageJson |
| 3d885a6a0be681c958683649938a314cf18ae1f1ba76e9ac81b6e92c32492833 | lib/util/npm-util.js | text | 126+0 | 135+1 | unit: checkPackageJson | new:checkPackageJson |
| 09391c43b3c004dd686d454c67091b11f5f2802572b941b8c5b7257ea50516be | lib/util/npm-util.js | text | 126+0 | 136+1 | unassigned: whitespace |  |
| fdc3269cd0fe742a66e968c6c4fee9d7caf14b91f40152278b419822f8559319 | lib/util/npm-util.js | text | 134+1 | 144+0 | unassigned: object-literal member |  |
| 17e7b757ec29f54c0b3c845cc7367cda3241d80bc1539e866cad2fe53f12ecb9 | lib/util/npm-util.js | text | 134+0 | 144+1 | unassigned: object-literal member |  |
| ad8dcaf7d91cc68869f25731808f786936db7fedc5c0173a95da93e5c8291af4 | lib/util/npm-util.js | text | 134+0 | 145+1 | unassigned: object-literal member |  |

config: {"unit":[],"artifact":["6a29815ae58076aec9b5b7651f8d5ceeedafa871c9c851f26cf6acedd8bf2fdf","6a0fea9e69f3f684b2ed87e57e3822e46e6c3ff992f9702ba254fe8d59ee1c07","0554966b8e20650bf2054d0c4eab582c82d789e970ff2674febe4c4368de7735","c9dfd2f9810b325de483fa503856ef5107ea6315a9b0c3238a89fef655002f16","7b57454852104f33d790b525f88d457cbc770977da12bf63c52bff0c399b812a","e73a67db5356a06c6a791c36cb7f21cd09a151e29496b3cb0cf80ea1a5047a72","c30579fd06bfe334f48dd2e9b775870c785a0c2badae4d3a64ab852cf2aecb12","5f44b761efa768bf4bb940dc78fd111aafb53a75b705ccf32ebdfb0de9aafbb6","40f4a0d43a2c3d330980cd58e4e7af5d42ceaa3271170951f11b8a2a6f7a65ab","91e319b571120971af63f0bb17dc557084daba8642441fee8e2e86d23160f038","e88423d4af0fa529cebc94c53c2b5edb94c128ba04e5cba98980a9b7ec6c35d2"],"unassigned":[]}

source: {"unit":["29dbf8180dafb5b4e39e9635bd11514f0359879a53ed775bfa22d82f858b2f75","f6ab714516ec1407ed59f09d437387bae998e9b58352976771b48999957b9d28","3d885a6a0be681c958683649938a314cf18ae1f1ba76e9ac81b6e92c32492833"],"artifact":[],"unassigned":["3948ca073d0df5f2e5203cbc95532097a86301a8d653518a352ea7420a2d490c","1fb6ad32c9f906d0f0e8a806092e2b01c469c57787e870917a17f5b8f9b3612b","4328551878a9fc45dcea4d68374ff1fc0d4f149710a326d5ab41f21e0480a1ef","4bae76c4ac73c6e3ca75d146380e788519fd8cfe56aff4764eb6076633e64d34","40924c69bf2aca81bb6716732f2854865d961eed0f0ada46e464864e2b62f6c8","f6ed54f20d54a60c3e823a51eb3bc74e1291fdf1e53206155997fd9d730fe870","09391c43b3c004dd686d454c67091b11f5f2802572b941b8c5b7257ea50516be","fdc3269cd0fe742a66e968c6c4fee9d7caf14b91f40152278b419822f8559319","17e7b757ec29f54c0b3c845cc7367cda3241d80bc1539e866cad2fe53f12ecb9","ad8dcaf7d91cc68869f25731808f786936db7fedc5c0173a95da93e5c8291af4"]}

Task reconciliation: expected 22; terminal 22; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__74/run-vEEJ7x/terminal.json