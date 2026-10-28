# lean report: ee3bcea71fe8f826e7c0494f5388ad80542fbc35 → 3bba76497c18439184edf18a96654a08b3664ed2

Identity: 121f98d7b8c780c3b30b04b0366ca95fc49475a66c06addf95b490741072a8f6; lean 815fc01fec5f51af99003faa686f25330e7c33ad

165 changed function(s); 2 unchanged caller(s) checked through lane B, 0 with a WITNESS through a changed callee: **0 in scope · 1 WITNESS · 0 PASS-proved · 0 PASS-decided · 1 PASS-bounded · 163 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/eslint.js | `parseJsonConfig` (88-128) | **ASK** | refused:type-assertion | ASK |  | parent: unit parseJsonConfig not exported |
| lib/rules/no-useless-escape.js | `union` (18-23) | **ASK** | refused:unsupported-call | ASK |  | /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean |
| lib/rules/no-useless-escape.js | `parseRegExp` (92-115) | **ASK** | refused:callback-form | ASK |  | /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean |
| lib/util/glob-util.js | `processPath` (42-75) | **WITNESS** | refused:unresolved-module | WITNESS |  | input 0: outcome; lib/util/glob-util.js:65 [conditional] |
| lib/util/glob-util.js | `listFilesToProcess` (106-180) | **PASS-bounded** | refused:unresolved-module | PASS-bounded |  | TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try  |
| lib/ast-utils.js | `(edit de8c7d6d95fc)` (24-24) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/ast-utils.js | `(edit fc062d350129)` (24-24) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/config/config-file.js | `(edit 6b101db97c85)` (444-444) | **ASK** | artifact:config |  |  | config |
| lib/config/config-file.js | `(edit 4a0d4f58dc54)` (444-444) | **ASK** | artifact:config |  |  | config |
| lib/rules/arrow-body-style.js | `(edit 66c2832cb4ff)` (108-108) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/arrow-body-style.js | `(edit 5c1147cfb821)` (108-108) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/curly.js | `(edit 19e2c6ecf914)` (198-198) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/curly.js | `(edit df69f973d899)` (198-198) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/keyword-spacing.js | `(edit 130b0a0c54b8)` (19-19) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/keyword-spacing.js | `(edit b69b01503034)` (20-20) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/keyword-spacing.js | `(edit 2b46c91ee841)` (21-21) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/keyword-spacing.js | `(edit 3400579e817d)` (22-22) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/keyword-spacing.js | `(edit b3d840e54560)` (19-19) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/keyword-spacing.js | `(edit e35efdca6ab0)` (20-20) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/keyword-spacing.js | `(edit f8913500267b)` (21-21) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/keyword-spacing.js | `(edit 518f22b882fe)` (22-22) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-empty-character-class.js | `(edit 3a49a8920a65)` (24-24) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (module-level statement) |
| lib/rules/no-empty-character-class.js | `(edit 7fbef0c4e6de)` (24-24) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (module-level statement) |
| lib/rules/no-lonely-if.js | `(edit fb559c978f58)` (58-58) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (object-literal member) |
| lib/rules/no-lonely-if.js | `(edit 726882c992d6)` (58-58) | **ASK** | unassigned:untyped JavaScript file |  |  | untyped JavaScript file (object-literal member) |
| lib/rules/no-useless-escape.js | `(edit e41cf5a00db6)` (12-12) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/no-useless-escape.js | `(edit 5c3b44c4f820)` (13-13) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit b9449f5d5f7c)` (14-14) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit a9ba7b484593)` (15-15) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 0b3be84c95b5)` (16-16) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit b881980a0d6c)` (17-17) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 1364abb4f99a)` (24-24) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/no-useless-escape.js | `(edit ba5909012d41)` (26-26) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 3367f5c42f42)` (39-39) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit ae3795542208)` (28-28) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 9a8691fec7b4)` (29-29) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 75e259d7757e)` (30-30) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 05a2f8dc97c4)` (31-31) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 5d93f423aaae)` (32-32) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 62a22d96a3ba)` (33-33) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 507c99296447)` (34-34) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 2c79e4a468a4)` (35-35) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 255729473519)` (36-36) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 9ff60036f0ec)` (37-37) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit e1bed9e27356)` (38-38) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 98cd07227ffb)` (39-39) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 4922575b971a)` (40-40) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 8c7bad1a18d0)` (41-41) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 0b7a8f8be43e)` (43-43) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 5d447c985559)` (58-58) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit fbb2124e0b51)` (56-56) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 2deb15b89c2a)` (57-57) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit c3e03cd52266)` (58-58) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit f4836d0bf057)` (59-59) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit cff2bb5a2d6b)` (60-60) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 68700cbcfa0c)` (61-61) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 96b56b953acb)` (62-62) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit c4725ef5082f)` (63-63) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit b1be5c97ab1b)` (64-64) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 91cbd3c16f3e)` (65-65) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 7c9f74e890e4)` (66-66) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 869b644a1712)` (67-67) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 0dee6f746a6e)` (68-68) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit cf2b02208a51)` (69-69) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit daef592ba2e2)` (70-70) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 9307a9c9ea95)` (71-71) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit b016a1bfcf8a)` (72-72) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 9a77e9b8a7eb)` (73-73) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 121f58ae2a18)` (74-74) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/no-useless-escape.js | `(edit 1f80b91c6a74)` (75-75) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/no-useless-escape.js | `(edit 6cc00016ca74)` (76-76) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 2153ea141a0a)` (77-77) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 1f332479286c)` (78-78) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 1c4240f9be6f)` (79-79) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 1cd7bb232341)` (80-80) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit fbb2f78053ae)` (81-81) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit d333010d7ab7)` (82-82) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 3d10217b4197)` (83-83) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 637288a4bed2)` (84-84) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit c1e572c383d0)` (85-85) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit e52885b8554e)` (86-86) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit ad0fe4ea7e25)` (87-87) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 53839f9634dc)` (88-88) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 6e7e115a4b96)` (89-89) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 70227feaf54e)` (90-90) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit ace836b9456c)` (91-91) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/rules/no-useless-escape.js | `(edit 4bba34e3ae44)` (74-74) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 95c58a40a770)` (131-131) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit c0466260f6b3)` (132-132) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit ffb657fab7cc)` (133-133) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 608f4f05d9f9)` (134-134) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 28100abe7f7b)` (135-135) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 9c72f421a4f4)` (136-136) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 5c65351ac1ac)` (137-137) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 5ca8308710e6)` (138-138) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit e69cfb600940)` (139-139) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit e3305a50cd43)` (140-140) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 928e265856fc)` (141-141) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit a04fa41eb4ae)` (142-142) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit b74ebf7943fc)` (143-143) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 3c7c65d13275)` (144-144) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 13d2a39c0e94)` (145-145) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 20f1421fe6a4)` (146-146) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 291bcd77194c)` (147-147) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 29d486c2d854)` (148-148) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/no-useless-escape.js | `(edit e1352ad5950a)` (149-149) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/no-useless-escape.js | `(edit 1818d7f689a4)` (150-150) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 0b5d97b21a1c)` (82-82) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 3eb8fed1329f)` (158-158) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 669b0c2b34dd)` (108-108) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit c04064386ac6)` (109-109) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 30f090fb476e)` (110-110) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 098fb78bfe3f)` (111-111) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit d1301a08c7b2)` (112-112) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 1e1bc92250af)` (113-113) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit e9468f8f5ae6)` (114-114) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 6af7732b5b03)` (115-115) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit b66ed5135278)` (116-116) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit abf27b2920df)` (117-117) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 58af789348a1)` (118-118) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 72fdbfb28bea)` (184-184) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 63b1f1b2073c)` (132-132) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 2836a36eceee)` (133-133) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 42b49beef073)` (151-151) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 485a72bdc685)` (215-215) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 29f82ac50eae)` (216-216) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/no-useless-escape.js | `(edit fa5f118b8e67)` (217-217) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit c77215d90233)` (218-218) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 59cfe0201a32)` (219-219) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 2830ba1ed0ea)` (153-153) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 89a6b0069f2e)` (154-154) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit c44589f4b48e)` (155-155) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit dabad0179269)` (156-156) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit f9619442f698)` (221-221) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 37109864ad83)` (158-158) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 79c849350ade)` (159-159) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 47f521bc6669)` (223-223) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/no-useless-escape.js | `(edit 0c0cc0eac82a)` (224-224) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit b0da493d7e07)` (225-225) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit e651421ca258)` (226-226) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit b1cb18e1fc8c)` (227-227) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit b10c4afc8f38)` (228-228) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 888bf136516e)` (229-229) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 8389a1dcbbc8)` (230-230) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/no-useless-escape.js | `(edit 462531d34836)` (231-231) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/no-useless-escape.js | `(edit 88f5360933d4)` (232-232) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 52354abf739c)` (233-233) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 460ba177b951)` (234-234) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit abc4a7a01595)` (235-235) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 8d43c4170420)` (236-236) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 1dc29f03ec01)` (237-237) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 54b59c848072)` (238-238) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/no-useless-escape.js | `(edit d392fdac0a6f)` (239-239) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/no-useless-escape.js | `(edit 308233895174)` (240-240) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit d075f099c32a)` (241-241) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/no-useless-escape.js | `(edit 4ecd27cee295)` (242-242) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/no-useless-escape.js | `(edit 8be8b8186b1b)` (243-243) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 12d9f95a5e6d)` (244-244) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/no-useless-escape.js | `(edit 069224d4327e)` (245-245) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/no-useless-escape.js | `(edit 4e5fba6dedcd)` (246-246) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit fe9a7677ba9e)` (248-248) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/no-warning-comments.js | `(edit e4ea7591c4df)` (57-57) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-warning-comments.js | `(edit 5e54a23e6f3b)` (57-57) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/semi.js | `(edit d81f48155956)` (56-56) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/semi.js | `(edit a1fb181dcd1a)` (56-56) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

## What would make the asks provable

### lib/eslint.js · `parseJsonConfig`

- line 99, `type-assertion`: `items` holds a value whose type nothing checked (an `as` that narrows, or an any or unknown value), and this slot reads it as its declared type; test it first (`typeof x === "number"`, a field test), or keep it in a local, an operation or the result
- line 121, `unsupported-member`: property .start is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 121, `ts-strict`: TS2339: Property 'start' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 122, `unsupported-member`: property .start is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 122, `ts-strict`: TS2339: Property 'start' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.

### lib/rules/no-useless-escape.js · `union`

- line 19, `unsupported-call`: new Set(...) reads an array, a Map, a Set or one of their iterators; build the entries as an array first
  do: [migration] This method has no translation; see langs/ts/subset.md for the covered methods.

### lib/rules/no-useless-escape.js · `parseRegExp`

- line 95, `callback-form`: an effectful array callback takes the element (and an index), or the accumulator and the element; an extra parameter is outside the subset
  do: [conditional: the function has no `this`, `arguments` or `new.target` in it and is never called with `new`] The callback must be an arrow function with plain parameters. A named function is read by name when its own parameters are plain; otherwise pass it the arguments JavaScript passes, `xs.map((x, i, a) => f(x, i, a))`, or only the ones it reads. An effectful callback may destructure its element or default it where the element type never holds undefined; name the fields you read instead of a rest element.

### lib/util/glob-util.js · `processPath`

- line 43, `unresolved-module`: TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 46, `callback-form`: the callback must be an arrow function
  do: [conditional: the function has no `this`, `arguments` or `new.target` in it and is never called with `new`] The callback must be an arrow function with plain parameters. A named function is read by name when its own parameters are plain; otherwise pass it the arguments JavaScript passes, `xs.map((x, i, a) => f(x, i, a))`, or only the ones it reads. An effectful callback may destructure its element or default it where the element type never holds undefined; name the fields you read instead of a rest element.
- line 65, `callback-form`: the callback must be an arrow function
  do: [conditional: the function has no `this`, `arguments` or `new.target` in it and is never called with `new`] The callback must be an arrow function with plain parameters. A named function is read by name when its own parameters are plain; otherwise pass it the arguments JavaScript passes, `xs.map((x, i, a) => f(x, i, a))`, or only the ones it reads. An effectful callback may destructure its element or default it where the element type never holds undefined; name the fields you read instead of a rest element.

### lib/util/glob-util.js · `listFilesToProcess`

- line 111, `unresolved-module`: TS2591: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 127, `ts-strict`: TS18048: 'options' is possibly 'undefined'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 131, `ts-strict`: TS18048: 'options' is possibly 'undefined'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 145, `dynamic-key`: use a finite union of declared string keys, or a Record<string, T> dictionary
  do: [migration] Only array indices, string indices and declared keys are readable; a computed key needs a `Record<string, T>` type. An open key (a string, a number) on a plain record of data fields is read as an uninterpreted lookup; on a union, a class instance, a record with a method or a getter, or with a symbol or a key call, narrow the receiver, name the field, or bind the key first. In a literal whose type has declared keys, a computed key of literal type names its field and a union of literals is a case split on the key; a `string` key there needs a `Record<string, T>` type.
- line 148, `param-mutation`: push on `files`, which is not a local array
  do: [migration] This changes what the caller handed in through an alias or a callback. Change it through the parameter itself, or return a new value: `[...xs, v]`, `{ ...r, f: v }`. An array kept in a Map the function builds itself (`const m = new Map<K, T[]>()`, filled with array literals) takes `m.get(k)?.push(x)` while no other name holds its arrays.
- line 149, `index-assign`: write a record field by name, or use a local Record<string, T> dictionary
  do: [migration] Only a local array changes by index. Return a new array otherwise.
- line 153, `foreach`: forEach runs a callback for its effects; write `for (const x of xs)` so the state comes out of the loop, or pass an arrow with one parameter
  do: [migration] Write `for (const x of xs) { ... }`; a loop may update a local, a callback may not.
- line 165, `ts-strict`: TS2339: Property 'dotfiles' does not exist on type '{ cwd?: string | undefined; ignore?: boolean | undefined; ignorePath?: string | undefined; ignorePattern?: string | undefined; }'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 196 = 36 unit + 2 artifact + 158 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| de8c7d6d95fcfd4cd19d95e487f04570da0f2905b45d18deb5897b9c4af28daa | lib/ast-utils.js | text | 24+1 | 24+0 | unassigned: module-level statement |  |
| fc062d3501298daebb8160aff7d791cde80d6ccbe8ea34db621c7bf4077da5e1 | lib/ast-utils.js | text | 24+0 | 24+1 | unassigned: module-level statement |  |
| 6b101db97c85212c020cb8c1422f8e6ced1578e65342f51ff923d3f57deba4e0 | lib/config/config-file.js | text | 444+1 | 444+0 | artifact: config | old:normalizePackageName |
| 4a0d4f58dc54c540b0b2a94bec1bcfbe5b15fe0230ac838778d6c0a0df623d28 | lib/config/config-file.js | text | 444+0 | 444+1 | artifact: config | new:normalizePackageName |
| 110954ba949588d6acf8d188983234155a42f991abd4301a409daeef1fb48b65 | lib/eslint.js | text | 110+1 | 110+0 | unit: parseJsonConfig | old:parseJsonConfig |
| b62a0b6894af1bebf44d9e39ca9cca82f7f7ebd7fff02eb0749bf90e4f87f8fa | lib/eslint.js | text | 110+0 | 110+1 | unit: parseJsonConfig | new:parseJsonConfig |
| 66c2832cb4ffde067d1cec8e0acfd4524d35aa430f6627a1ba308a0d4542768e | lib/rules/arrow-body-style.js | text | 108+1 | 108+0 | unassigned: object-literal member |  |
| 5c1147cfb8213c27c56ad144f3cfda246b54aea409513a750ee4b7f4a4cac99a | lib/rules/arrow-body-style.js | text | 108+0 | 108+1 | unassigned: object-literal member |  |
| 19e2c6ecf9148396c7c258069db3caeed6165579e5b4b9728a3279b8d565803a | lib/rules/curly.js | text | 198+1 | 198+0 | unassigned: object-literal member |  |
| df69f973d8997195372f20f9d4225fc7f372b0a16ff58cdcb3b0a55f54a72686 | lib/rules/curly.js | text | 198+0 | 198+1 | unassigned: object-literal member |  |
| 130b0a0c54b805c3c1792f8690034ffe18231cf73d1f45d5bb649ac20a76209f | lib/rules/keyword-spacing.js | text | 19+1 | 19+0 | unassigned: module-level statement |  |
| b69b0150303453841cc242397fc82cb734219925734702a89ac5255118f25b3c | lib/rules/keyword-spacing.js | text | 20+1 | 19+0 | unassigned: module-level statement |  |
| 2b46c91ee84117da87248ae028a54f3d4d1ee0cb08e0d7df9f71be29b104eef6 | lib/rules/keyword-spacing.js | text | 21+1 | 19+0 | unassigned: module-level statement |  |
| 3400579e817d8a29ad233458189ff8d5c206629126f64368aa9c6957a9cd46ad | lib/rules/keyword-spacing.js | text | 22+1 | 19+0 | unassigned: module-level statement |  |
| b3d840e545606e1544ad6752b6465fc59febbcd1b4e59cf858b8885b6d3750f4 | lib/rules/keyword-spacing.js | text | 19+0 | 19+1 | unassigned: module-level statement |  |
| e35efdca6ab0479879a46d0f4e2481d5ab9c79becb8736f869464689a3916e6a | lib/rules/keyword-spacing.js | text | 19+0 | 20+1 | unassigned: module-level statement |  |
| f8913500267b61664ab8c7054e78696062bba2016fe1065f85ae68386bf3edd0 | lib/rules/keyword-spacing.js | text | 19+0 | 21+1 | unassigned: module-level statement |  |
| 518f22b882fe3c5a94426517b76977ca05ae1435da4da9a3fd7da4951ceb26d8 | lib/rules/keyword-spacing.js | text | 19+0 | 22+1 | unassigned: module-level statement |  |
| 3a49a8920a6556691848384ddd750860275230bae5aa49117f0a752bca33c176 | lib/rules/no-empty-character-class.js | text | 24+1 | 24+0 | unassigned: untyped JavaScript file |  |
| 7fbef0c4e6def447a3986bf50af0fa0e6e8d9f3ed49f8c2a27b6c93aaaa0eafd | lib/rules/no-empty-character-class.js | text | 24+0 | 24+1 | unassigned: untyped JavaScript file |  |
| fb559c978f58d30dec98b5214271f4c1af7f13703125bcb763dacb09aa8f13a2 | lib/rules/no-lonely-if.js | text | 58+1 | 58+0 | unassigned: untyped JavaScript file |  |
| 726882c992d61ce9dd69140246952136459081a07a309554c0125d8747a92bf8 | lib/rules/no-lonely-if.js | text | 58+0 | 58+1 | unassigned: untyped JavaScript file |  |
| e41cf5a00db6807697b864db2f96ad33db3fa8474ff5a54dd82b5040a070a783 | lib/rules/no-useless-escape.js | text | 11+0 | 12+1 | unassigned: comment |  |
| 5c3b44c4f8200f092c7e9c5b9ea3e371124f01a4b770e2f9589ea31a0e0d959d | lib/rules/no-useless-escape.js | text | 11+0 | 13+1 | unassigned: module-level statement |  |
| b9449f5d5f7cf08089ab943115ababaddfd4d4c70a3b2bbf96996f3906ecc62b | lib/rules/no-useless-escape.js | text | 11+0 | 14+1 | unassigned: module-level statement |  |
| a9ba7b48459330d85cd0b6b36ae0873017523dc9beb511f411ed3af853b7a7a3 | lib/rules/no-useless-escape.js | text | 11+0 | 15+1 | unassigned: module-level statement |  |
| 0b3be84c95b51d90a72bed663a5207e1bf3bc923e752b487947eba8ea886f873 | lib/rules/no-useless-escape.js | text | 11+0 | 16+1 | unassigned: module-level statement |  |
| b881980a0d6c24be74a32f3be19454c3fc0095a1615348494f891e644a4bb721 | lib/rules/no-useless-escape.js | text | 11+0 | 17+1 | unassigned: module-level statement |  |
| 608b77347a78592804aa6bf5a6f5214947635baac3883b64cbe0bdb7ac2a9a3a | lib/rules/no-useless-escape.js | text | 11+0 | 18+1 | unit: union | new:union |
| a74ca068668892a51cbb5ae9850ccfee92bdada3ba9868292d821197f77de8be | lib/rules/no-useless-escape.js | text | 11+0 | 19+1 | unit: union | new:union |
| ee897562319dd489aa0408b1bd6b28c0bf537f2852bf8f3115c05aa0d3aa3cfb | lib/rules/no-useless-escape.js | text | 11+0 | 20+1 | unit: union | new:union |
| 12e2639a7c26a2095022c0202c8c7fc85d81fc56c766e8bb462127dfc0e5baa5 | lib/rules/no-useless-escape.js | text | 11+0 | 21+1 | unit: union | new:union |
| a9704331f7fd4ec547ca0152aa66cc49893ed982df6f9d926841be75f73deca6 | lib/rules/no-useless-escape.js | text | 11+0 | 22+1 | unit: union | new:union |
| 222f193107875fc413f5c39c013bc3b717c6e4e7f50dedad85cf8d1ac947dc2a | lib/rules/no-useless-escape.js | text | 11+0 | 23+1 | unit: union | new:union |
| 1364abb4f99ab4bd99883b7694d27e26ebbd872d08a0e8eeb2b8601bca54373a | lib/rules/no-useless-escape.js | text | 11+0 | 24+1 | unassigned: whitespace |  |
| ba5909012d41bf36cdbe2aa89d67ed4fc7ac974703548b8b0d1468652011603f | lib/rules/no-useless-escape.js | text | 26+1 | 39+0 | unassigned: module-level statement |  |
| 3367f5c42f42e608ff927b378c99301b61b0085d0c02f64c8a7b899e9a638429 | lib/rules/no-useless-escape.js | text | 26+0 | 39+1 | unassigned: module-level statement |  |
| ae3795542208c829d59b7696a64cfb58a0526d401e6cd367799ef6065ba6502a | lib/rules/no-useless-escape.js | text | 28+1 | 40+0 | unassigned: module-level statement |  |
| 9a8691fec7b4dc0b04d80e39274b65a2f7c0791d1d80c0d8953b4a6b69327c44 | lib/rules/no-useless-escape.js | text | 29+1 | 40+0 | unassigned: module-level statement |  |
| 75e259d7757e88d6c9ebba7dc4fb045538558dc19c97920dd507aca0aa69ec2f | lib/rules/no-useless-escape.js | text | 30+1 | 40+0 | unassigned: module-level statement |  |
| 05a2f8dc97c4e0909f92b8c41feb9932d37dc6c7fdf2c3400c81d6d6166927b9 | lib/rules/no-useless-escape.js | text | 31+1 | 40+0 | unassigned: module-level statement |  |
| 5d93f423aaae83c0a5b94ce3971967e7a3d9ab3ceaaad902c97b445af198665a | lib/rules/no-useless-escape.js | text | 32+1 | 40+0 | unassigned: module-level statement |  |
| 62a22d96a3bacf54c6353e73506f4e3450c4dc1ebb6a89aba9a94ab4c9376bee | lib/rules/no-useless-escape.js | text | 33+1 | 40+0 | unassigned: module-level statement |  |
| 507c99296447f3b20fa8a9ba6f825588ec969e1ab00babab5a34192c9c35909e | lib/rules/no-useless-escape.js | text | 34+1 | 40+0 | unassigned: module-level statement |  |
| 2c79e4a468a454158d74a7dc9e902fb47e6b87c3595972f7c0cee4002e37f170 | lib/rules/no-useless-escape.js | text | 35+1 | 40+0 | unassigned: module-level statement |  |
| 255729473519e83655c7268c8c7f20143352a77623883ca7b7ef8d86e23e77f7 | lib/rules/no-useless-escape.js | text | 36+1 | 40+0 | unassigned: module-level statement |  |
| 9ff60036f0ec5a79a4a3872705cbfa4c95cbe01980c9c36c2dc0cdc18aa10687 | lib/rules/no-useless-escape.js | text | 37+1 | 40+0 | unassigned: module-level statement |  |
| e1bed9e27356bf852f91d87e4b36d38d2acff16fc2df2cd09b930e82deb8e96e | lib/rules/no-useless-escape.js | text | 38+1 | 40+0 | unassigned: module-level statement |  |
| 98cd07227ffb4d139a78a4ca68309e0996a8fdc0981559bc55b1dd572b425b58 | lib/rules/no-useless-escape.js | text | 39+1 | 40+0 | unassigned: module-level statement |  |
| 4922575b971a64ce316a33d36b37452162164eeeb54894f411de1fccda14dd59 | lib/rules/no-useless-escape.js | text | 40+1 | 40+0 | unassigned: module-level statement |  |
| 8c7bad1a18d0d8ed22274e8b59a3ec68c6ec4b0c45323167972d655879422d22 | lib/rules/no-useless-escape.js | text | 41+1 | 40+0 | unassigned: module-level statement |  |
| 0b7a8f8be43e8c8f722c30b74d4c8f8dd5bfd89724e186b05309a3c99b63385c | lib/rules/no-useless-escape.js | text | 43+1 | 41+0 | unassigned: module-level statement |  |
| 5d447c985559ca643741759d0411873320e7f6ea70fe383d8e30b67c53b2f41b | lib/rules/no-useless-escape.js | text | 58+1 | 56+0 | unassigned: module-level statement |  |
| fbb2124e0b5133087423895190e36c9c9698db5cbc0dca9ac20c47d2158ce79d | lib/rules/no-useless-escape.js | text | 58+0 | 56+1 | unassigned: module-level statement |  |
| 2deb15b89c2a2d4d9db117079bc0a273e691ef9a4ecbcc3c7a3fe9e08db9aba0 | lib/rules/no-useless-escape.js | text | 58+0 | 57+1 | unassigned: module-level statement |  |
| c3e03cd52266fe0a9d8fd8ea5ca0ecd2837f269d456fa74b0ec20d3c456a59ab | lib/rules/no-useless-escape.js | text | 58+0 | 58+1 | unassigned: module-level statement |  |
| f4836d0bf057f08f1e69cc2bb6d195b1ab0d3f867e8b01ed78d0216c56c7d0d5 | lib/rules/no-useless-escape.js | text | 58+0 | 59+1 | unassigned: module-level statement |  |
| cff2bb5a2d6bb1b913862308f2f4567df56aa795a5ddee4098394f3f0cb49d39 | lib/rules/no-useless-escape.js | text | 58+0 | 60+1 | unassigned: module-level statement |  |
| 68700cbcfa0c1312c06fbe5c092a8788e56ec5fcf90fb1ef9cf1e6a628ff9aa9 | lib/rules/no-useless-escape.js | text | 58+0 | 61+1 | unassigned: module-level statement |  |
| 96b56b953acb60c78673c2cf3485f66742cfe67079989c28df2459a973519566 | lib/rules/no-useless-escape.js | text | 58+0 | 62+1 | unassigned: module-level statement |  |
| c4725ef5082f06b9446be94a8334f7f8a83261512495e6b1be117fe0e9ec82ed | lib/rules/no-useless-escape.js | text | 58+0 | 63+1 | unassigned: module-level statement |  |
| b1be5c97ab1bb7af6492685613578c55699a560d4d93459849348bd28725644d | lib/rules/no-useless-escape.js | text | 58+0 | 64+1 | unassigned: module-level statement |  |
| 91cbd3c16f3e7dca952311bb95f9b74110cbf3ceefcdd43fb58766e5b34bd43b | lib/rules/no-useless-escape.js | text | 58+0 | 65+1 | unassigned: module-level statement |  |
| 7c9f74e890e428f6897dfee4d34d5f6ec6055b280d46b7f5e1d99f7c6e39b9d9 | lib/rules/no-useless-escape.js | text | 58+0 | 66+1 | unassigned: module-level statement |  |
| 869b644a171255149eb2898f9c9790c27b587ae1c020c234a3f1dfad60225b35 | lib/rules/no-useless-escape.js | text | 58+0 | 67+1 | unassigned: module-level statement |  |
| 0dee6f746a6ed9d9687125ee2b96f347ff1cd43014604101346449dcf3d35a74 | lib/rules/no-useless-escape.js | text | 58+0 | 68+1 | unassigned: module-level statement |  |
| cf2b02208a5179a0917f44d577f35e7c37692615d7c028ce9829f0260c0a4376 | lib/rules/no-useless-escape.js | text | 58+0 | 69+1 | unassigned: module-level statement |  |
| daef592ba2e28ae34340cda79d5253782340a01f8f13c74629bcdecca87fd546 | lib/rules/no-useless-escape.js | text | 58+0 | 70+1 | unassigned: module-level statement |  |
| 9307a9c9ea950b68ac31b47e9721b91d49a18495d15102e1c05124a66f555d3d | lib/rules/no-useless-escape.js | text | 58+0 | 71+1 | unassigned: module-level statement |  |
| b016a1bfcf8a0ee24368ea2fff512e671a0c498bc3257f53ce2115dcecc7ff76 | lib/rules/no-useless-escape.js | text | 58+0 | 72+1 | unassigned: module-level statement |  |
| 9a77e9b8a7eb6cc1651a4e81fedf19987ce06383895aa9372ba5eb1a7cc4015f | lib/rules/no-useless-escape.js | text | 58+0 | 73+1 | unassigned: module-level statement |  |
| 121f58ae2a187998bc4ed5dc3fb576c73c23b9a45a2987d1e7ab0c5ede41c7d9 | lib/rules/no-useless-escape.js | text | 58+0 | 74+1 | unassigned: whitespace |  |
| 1f80b91c6a74ef4fe54acf91535601b006ae0c00472cdd8da1e3fecf1c7932de | lib/rules/no-useless-escape.js | text | 58+0 | 75+1 | unassigned: comment |  |
| 6cc00016ca7414c6a22cc14400d266aeba8b20668e19fadbf04919fbc8c576dd | lib/rules/no-useless-escape.js | text | 58+0 | 76+1 | unassigned: module-level statement |  |
| 2153ea141a0a5e3a756e07e78ed70c314676688e94a8c83c1b13ad3ddda96b2e | lib/rules/no-useless-escape.js | text | 58+0 | 77+1 | unassigned: module-level statement |  |
| 1f332479286c072decc704b8b26591f3b0fe45071262f28c00397d0f04a88d1a | lib/rules/no-useless-escape.js | text | 58+0 | 78+1 | unassigned: module-level statement |  |
| 1c4240f9be6f432c7f96f7d9811153f1500b4e57a743e78bd5cbb6eaea773cca | lib/rules/no-useless-escape.js | text | 58+0 | 79+1 | unassigned: module-level statement |  |
| 1cd7bb2323415886839bf775b2c869431feb2ba4cea6a305a619a960314e8b42 | lib/rules/no-useless-escape.js | text | 58+0 | 80+1 | unassigned: module-level statement |  |
| fbb2f78053ae3f69a431abe3b67579a4f3ed58081145a7a2c5daecde9eace230 | lib/rules/no-useless-escape.js | text | 58+0 | 81+1 | unassigned: module-level statement |  |
| d333010d7ab750d71c676a2491e9b88552745b26f2ee732a9005a40b90e3e0c3 | lib/rules/no-useless-escape.js | text | 58+0 | 82+1 | unassigned: module-level statement |  |
| 3d10217b4197c388cf1bffce0f73bac6cf438be8015272aaa686cfd695ea93a0 | lib/rules/no-useless-escape.js | text | 58+0 | 83+1 | unassigned: module-level statement |  |
| 637288a4bed27947fdd22c3c67f431b5c5f12c72111aaa101b1add14506faf73 | lib/rules/no-useless-escape.js | text | 58+0 | 84+1 | unassigned: module-level statement |  |
| c1e572c383d087a912bd02cf5455400b66086bc60f920f95a3de55a007c75613 | lib/rules/no-useless-escape.js | text | 58+0 | 85+1 | unassigned: module-level statement |  |
| e52885b8554e78a8d191ca352893b9b0a61509ca1a196f7943e63118e6346892 | lib/rules/no-useless-escape.js | text | 58+0 | 86+1 | unassigned: module-level statement |  |
| ad0fe4ea7e2575814ed6855154a059d7ea480a130dc27b62cfea45870ec100f7 | lib/rules/no-useless-escape.js | text | 58+0 | 87+1 | unassigned: module-level statement |  |
| 53839f9634dc4835454121c2704b6081465325823eb5e3bb299cb70d466f8f5a | lib/rules/no-useless-escape.js | text | 58+0 | 88+1 | unassigned: module-level statement |  |
| 6e7e115a4b9649b7fad4631aabadb34139bfb8a360a6d2bcc36e868e06c0daec | lib/rules/no-useless-escape.js | text | 58+0 | 89+1 | unassigned: module-level statement |  |
| 70227feaf54ee37fb7098a2179343baab9fb2932d99dfaadbf304ef8ab9c621e | lib/rules/no-useless-escape.js | text | 58+0 | 90+1 | unassigned: module-level statement |  |
| ace836b9456cd105b7da764bef995ce3cee70ac351bc9665362b8610ba31055c | lib/rules/no-useless-escape.js | text | 58+0 | 91+1 | unassigned: module-level statement |  |
| 15a4e2307fbfc72351dce09f5216d35238e74801eed61d700fe8a0b81618c85a | lib/rules/no-useless-escape.js | text | 58+0 | 92+1 | unit: parseRegExp | new:parseRegExp |
| 48d1d6c27f930190bdb06f805359e3330fa068e0abc3c75149047ce3a47759f2 | lib/rules/no-useless-escape.js | text | 58+0 | 93+1 | unit: parseRegExp | new:parseRegExp |
| 2bb3471e1943cf8029a42bd3dfb55589a6d36c0b511799243988438e07d0ec75 | lib/rules/no-useless-escape.js | text | 58+0 | 94+1 | unit: parseRegExp | new:parseRegExp |
| 4ce2fe3a2a63c4d3f91529498b47149a616ac9e84d8503dea47443f7f51fc609 | lib/rules/no-useless-escape.js | text | 58+0 | 95+1 | unit: parseRegExp | new:parseRegExp |
| b480e1ef1d778aa795e74cdc9185fe2f793fd749a6af75a980979c7a1a8d914c | lib/rules/no-useless-escape.js | text | 58+0 | 96+1 | unit: parseRegExp | new:parseRegExp |
| 2259b0d84aea82963decb181665cd39330f321d13d4f589a455569ff596dfb85 | lib/rules/no-useless-escape.js | text | 58+0 | 97+1 | unit: parseRegExp | new:parseRegExp |
| 2b236acf75aae477e06b6239a9883219eb9f13d7acdf9750c946c6ccfdeef33d | lib/rules/no-useless-escape.js | text | 58+0 | 98+1 | unit: parseRegExp | new:parseRegExp |
| f7654a39d385819d044e272c7335d3ea1d94b7e00a763593a4217aa7430b8437 | lib/rules/no-useless-escape.js | text | 58+0 | 99+1 | unit: parseRegExp | new:parseRegExp |
| 5a1435ad0a19f47ae20acde53f15684c9a6654c51d0b2d2a6f8f54f43f8ba8fe | lib/rules/no-useless-escape.js | text | 58+0 | 100+1 | unit: parseRegExp | new:parseRegExp |
| 3041ea1c3942a54528ce5f05b402dcb4b158b489649a375ab388333d9183b8c5 | lib/rules/no-useless-escape.js | text | 58+0 | 101+1 | unit: parseRegExp | new:parseRegExp |
| 77657f7c7bb44761fc712958dec5e5b4e43ff8822d364419167b6582005426db | lib/rules/no-useless-escape.js | text | 58+0 | 102+1 | unit: parseRegExp | new:parseRegExp |
| 8f033efb1c653980c4e83f2d8dd89acc9b3904629db987c9958fd0bbc81a1b36 | lib/rules/no-useless-escape.js | text | 58+0 | 103+1 | unit: parseRegExp | new:parseRegExp |
| f0b28ca10ed62144d965afc8c98f9309840870481e94ea2764dd823869da0d43 | lib/rules/no-useless-escape.js | text | 58+0 | 104+1 | unit: parseRegExp | new:parseRegExp |
| 176b3f42ab36986a6f225792a7bd26b201185d62c403b6345f46852c5031e951 | lib/rules/no-useless-escape.js | text | 58+0 | 105+1 | unit: parseRegExp | new:parseRegExp |
| aebd1193916d2b29392525158b58f378ee78b734bcff48eec1d88f5347414352 | lib/rules/no-useless-escape.js | text | 58+0 | 106+1 | unit: parseRegExp | new:parseRegExp |
| e04a6262bb91bc8b3e4b1dcaa557247c12e28646c30a833288a44592b7a927af | lib/rules/no-useless-escape.js | text | 58+0 | 107+1 | unit: parseRegExp | new:parseRegExp |
| ef983298f2653e1bbbdd3fe127bfe157c1fdb28ac45189529b4f835719470195 | lib/rules/no-useless-escape.js | text | 58+0 | 108+1 | unit: parseRegExp | new:parseRegExp |
| 2de4993f6b7f9a6fd3a97654d5649feda24e6859660c09c9fb48d6e445ca1a78 | lib/rules/no-useless-escape.js | text | 58+0 | 109+1 | unit: parseRegExp | new:parseRegExp |
| e2af72c49f4115aef510d40c01e7e1b41f2910569abd834e5d1849d6655e542f | lib/rules/no-useless-escape.js | text | 58+0 | 110+1 | unit: parseRegExp | new:parseRegExp |
| bc1e38f44c3d492104a4fe05fbdbd6c1e97f08a2a2f01ca46456936750de0fcc | lib/rules/no-useless-escape.js | text | 58+0 | 111+1 | unit: parseRegExp | new:parseRegExp |
| e2c38d1e23b75ecca4c7b6d84b87b86d872ceb1554932761580499e8d358e79a | lib/rules/no-useless-escape.js | text | 58+0 | 112+1 | unit: parseRegExp | new:parseRegExp |
| f695fd79d80f71fad40309b91f15b1f5714cfd51fc1109f88c2925ce63b9aa16 | lib/rules/no-useless-escape.js | text | 58+0 | 113+1 | unit: parseRegExp | new:parseRegExp |
| c4ca2547b502bfe8c037715ac91113ea43d85167bc682b1893a50416668e23fd | lib/rules/no-useless-escape.js | text | 58+0 | 114+1 | unit: parseRegExp | new:parseRegExp |
| d2dda4b377df4f78d98abef3523b02c76dfe5e29348cf6468ee10ab2ff7470ef | lib/rules/no-useless-escape.js | text | 58+0 | 115+1 | unit: parseRegExp | new:parseRegExp |
| 4bba34e3ae4489a7c74bb37b205803158899235c7d5c580a610011873d538377 | lib/rules/no-useless-escape.js | text | 74+1 | 131+0 | unassigned: object-literal member |  |
| 95c58a40a770e05d05ae6d4a14350bad2a004d86fdb0b74ea1bfc26b80c7bcd7 | lib/rules/no-useless-escape.js | text | 74+0 | 131+1 | unassigned: object-literal member |  |
| c0466260f6b3979c4ee1850081268292866f7024280a30b22182ea7aa6c8f498 | lib/rules/no-useless-escape.js | text | 74+0 | 132+1 | unassigned: object-literal member |  |
| ffb657fab7cc3b20a56363ea6b6e9eec29d210aa1ffcd9c61f4f6963c1277c37 | lib/rules/no-useless-escape.js | text | 74+0 | 133+1 | unassigned: object-literal member |  |
| 608f4f05d9f9bed7e8d31bddfdd73c92c556906dd3e347ba425ab0681e3e3c0f | lib/rules/no-useless-escape.js | text | 74+0 | 134+1 | unassigned: object-literal member |  |
| 28100abe7f7b84e1e7ef605caedbaed95021c4e2f843f5043861686ad10948a9 | lib/rules/no-useless-escape.js | text | 74+0 | 135+1 | unassigned: object-literal member |  |
| 9c72f421a4f4b57068d9e6990d68f7f9e3eeb556df8b3cc3591004dbbf68eac2 | lib/rules/no-useless-escape.js | text | 74+0 | 136+1 | unassigned: object-literal member |  |
| 5c65351ac1ac528daf43f2b70c73a94a4e8651ce133db333911afbb86578b99b | lib/rules/no-useless-escape.js | text | 74+0 | 137+1 | unassigned: object-literal member |  |
| 5ca8308710e63983544a41eb0f18407168ddd104f6a3fc6c251fd08e74459948 | lib/rules/no-useless-escape.js | text | 74+0 | 138+1 | unassigned: object-literal member |  |
| e69cfb600940d88a6ec7560948fef3bf5c83284121fc57db719ec4af8051ee80 | lib/rules/no-useless-escape.js | text | 74+0 | 139+1 | unassigned: object-literal member |  |
| e3305a50cd4305fb63655e87d2d06289a55bce9d01ee0e649bc0aa8eedc3c926 | lib/rules/no-useless-escape.js | text | 74+0 | 140+1 | unassigned: object-literal member |  |
| 928e265856fc27015b59411b8f31078dc94c0c4a3a458ef59d25c95599566d12 | lib/rules/no-useless-escape.js | text | 74+0 | 141+1 | unassigned: object-literal member |  |
| a04fa41eb4aeb1e7a1ff56cc7bd74fff4ccc369fddb13207e47da6604aa861ec | lib/rules/no-useless-escape.js | text | 74+0 | 142+1 | unassigned: object-literal member |  |
| b74ebf7943fc9434bb9a46076896e0fc72fb68427d2d30f996c9b86d13926997 | lib/rules/no-useless-escape.js | text | 74+0 | 143+1 | unassigned: object-literal member |  |
| 3c7c65d132755efd0b9beb2876805acf1933580ade2c7d31d30aeffbc4b82a87 | lib/rules/no-useless-escape.js | text | 74+0 | 144+1 | unassigned: object-literal member |  |
| 13d2a39c0e940acbccb54cace63cf98cebaf48a3c1e4ddc19a451cafc859cc0f | lib/rules/no-useless-escape.js | text | 74+0 | 145+1 | unassigned: object-literal member |  |
| 20f1421fe6a441a5da70835448f8e239ba9c91cc8b76a34fd25c8a42973983b9 | lib/rules/no-useless-escape.js | text | 74+0 | 146+1 | unassigned: object-literal member |  |
| 291bcd77194c3a20e1e9bcb588d5debd55cc56d09a72f6f1f7e6746094b2996e | lib/rules/no-useless-escape.js | text | 74+0 | 147+1 | unassigned: object-literal member |  |
| 29d486c2d85400cb1cd4e857df1cf71740cde86689f936005aa5ca24b3b45554 | lib/rules/no-useless-escape.js | text | 74+0 | 148+1 | unassigned: whitespace |  |
| e1352ad5950aec1c65a851340455d28eb144bddad438142e624761c922eedd95 | lib/rules/no-useless-escape.js | text | 74+0 | 149+1 | unassigned: comment |  |
| 1818d7f689a47b0f0149865986d5a6518b3348b2c6e7a2b84c4232335865e8b7 | lib/rules/no-useless-escape.js | text | 74+0 | 150+1 | unassigned: object-literal member |  |
| 0b5d97b21a1cfc1d3acb3dd41a03c154da192e96178a021761414ecf801badc6 | lib/rules/no-useless-escape.js | text | 82+1 | 158+0 | unassigned: object-literal member |  |
| 3eb8fed1329f1060cb6fe4e78568246cf5d9c922a2c4dbd6355dbd303eef381a | lib/rules/no-useless-escape.js | text | 82+0 | 158+1 | unassigned: object-literal member |  |
| 669b0c2b34dd638a08107abd8b846230a405b19dcf2bb27b9a374d164660e7a5 | lib/rules/no-useless-escape.js | text | 108+1 | 184+0 | unassigned: object-literal member |  |
| c04064386ac64567dccb1f8c9a873294c156919f07425dd4fc6b58660015a7df | lib/rules/no-useless-escape.js | text | 109+1 | 184+0 | unassigned: object-literal member |  |
| 30f090fb476ecf87d85c07f4bba095769debe88c5ac874c62f826ae96b5453a3 | lib/rules/no-useless-escape.js | text | 110+1 | 184+0 | unassigned: object-literal member |  |
| 098fb78bfe3f31656a16896ce71ccd4abfa624af467c45a9eebe2f133816a4cb | lib/rules/no-useless-escape.js | text | 111+1 | 184+0 | unassigned: object-literal member |  |
| d1301a08c7b212eda597ac0486f8900fee494a374483c4ca6f7e08fd666a033f | lib/rules/no-useless-escape.js | text | 112+1 | 184+0 | unassigned: object-literal member |  |
| 1e1bc92250af5c36590dc43bee4e8ee370b39f1d6a7a133342f1c2e48b2efb94 | lib/rules/no-useless-escape.js | text | 113+1 | 184+0 | unassigned: object-literal member |  |
| e9468f8f5ae64767166e2a7c0e502bd44adeba8b87c4c2e55123e414dd34bd7c | lib/rules/no-useless-escape.js | text | 114+1 | 184+0 | unassigned: object-literal member |  |
| 6af7732b5b030cbc21177f1bfca397ab43353d405bb30ca844d77ff3ca4e19fa | lib/rules/no-useless-escape.js | text | 115+1 | 184+0 | unassigned: object-literal member |  |
| b66ed5135278adedd0d6d8633334233a3c8fc16aa83b0464ff50f59c67472277 | lib/rules/no-useless-escape.js | text | 116+1 | 184+0 | unassigned: object-literal member |  |
| abf27b2920df4331988f4959a0581b947f2be970fc1c77d672595c1b88fd2bbe | lib/rules/no-useless-escape.js | text | 117+1 | 184+0 | unassigned: object-literal member |  |
| 58af789348a169941468693241c1e86fcfe9629222474be16362a12f723b2d2a | lib/rules/no-useless-escape.js | text | 118+1 | 184+0 | unassigned: object-literal member |  |
| 72fdbfb28bea461acb4be393f659c9682a2ec028f73e8ec82298aaec91a9d206 | lib/rules/no-useless-escape.js | text | 108+0 | 184+1 | unassigned: object-literal member |  |
| 63b1f1b2073c087eb0b5b466fb5b811e487b856675470670a458d9a13f68f667 | lib/rules/no-useless-escape.js | text | 132+1 | 197+0 | unassigned: object-literal member |  |
| 2836a36eceee2ccd4f06755aaac1c2ac42a6e0b9bf15dec23c278a058c557b1d | lib/rules/no-useless-escape.js | text | 133+1 | 197+0 | unassigned: object-literal member |  |
| 42b49beef073d7b274a320856c2a33c3fafb5ad1098d0e99eab690793afc6a02 | lib/rules/no-useless-escape.js | text | 151+1 | 215+0 | unassigned: object-literal member |  |
| 485a72bdc685201709cd260b54ae738079e26fbba884a4ba971e28fe7a9fd84e | lib/rules/no-useless-escape.js | text | 151+0 | 215+1 | unassigned: object-literal member |  |
| 29f82ac50eae3e9ab21fa738a84c84854b7c396f11d8192f2130dea222ac9b38 | lib/rules/no-useless-escape.js | text | 151+0 | 216+1 | unassigned: whitespace |  |
| fa5f118b8e678d870fc9f2e25c9cb2dcdbf09a9ec442c5cc3ec68dd3d5ca8f36 | lib/rules/no-useless-escape.js | text | 151+0 | 217+1 | unassigned: object-literal member |  |
| c77215d9023323ff9b37d39ee19c90ce10089b7c9f56520c934ee20eab6cbf05 | lib/rules/no-useless-escape.js | text | 151+0 | 218+1 | unassigned: object-literal member |  |
| 59cfe0201a320f2dcf93acfdfa5b1c4afa8f6df93b06bccd32a5eb68eac4e1e1 | lib/rules/no-useless-escape.js | text | 151+0 | 219+1 | unassigned: object-literal member |  |
| 2830ba1ed0ea8234b1319b521f1b4029393564be119bc37e6f083c7c1ace31d9 | lib/rules/no-useless-escape.js | text | 153+1 | 221+0 | unassigned: object-literal member |  |
| 89a6b0069f2ef158c1c50f5e8d5a4ceed1b24230df0204572ea7e550b7c64ecb | lib/rules/no-useless-escape.js | text | 154+1 | 221+0 | unassigned: object-literal member |  |
| c44589f4b48e1e6ff933c16b47b87b1c7772c724ef98467174a60eeffaa1c3a8 | lib/rules/no-useless-escape.js | text | 155+1 | 221+0 | unassigned: object-literal member |  |
| dabad0179269d12c59c9d2a7202f1f874b8835bb76ca10d88d15d170400a68b0 | lib/rules/no-useless-escape.js | text | 156+1 | 221+0 | unassigned: object-literal member |  |
| f9619442f6987e6ed0f8d6c3661febb0388a6db23b406f9685f0e831cb767819 | lib/rules/no-useless-escape.js | text | 153+0 | 221+1 | unassigned: object-literal member |  |
| 37109864ad83e5a12d91805924fc89ad332d621ea66144789906dc89cfda0337 | lib/rules/no-useless-escape.js | text | 158+1 | 223+0 | unassigned: object-literal member |  |
| 79c849350adec85f1278631f79b2e7388e415b3bce4976c352e89052812d2063 | lib/rules/no-useless-escape.js | text | 159+1 | 223+0 | unassigned: object-literal member |  |
| 47f521bc666902e3b823fc2e0e2c2857779b9dbf2c4d2854ebe82ca52fc3eb80 | lib/rules/no-useless-escape.js | text | 158+0 | 223+1 | unassigned: comment |  |
| 0c0cc0eac82ab727222a435acd6780068a443123371a380c8912caa02f9cb23a | lib/rules/no-useless-escape.js | text | 158+0 | 224+1 | unassigned: object-literal member |  |
| b0da493d7e076156416c8352ddda388ce032f8d1e7a40236edc5a80bf26f60a8 | lib/rules/no-useless-escape.js | text | 158+0 | 225+1 | unassigned: object-literal member |  |
| e651421ca2584d53abfb379ec6a8ebcee57382a44bb59816a535a26b1dcf5b3f | lib/rules/no-useless-escape.js | text | 158+0 | 226+1 | unassigned: object-literal member |  |
| b1cb18e1fc8c2dec1e0f19d922ed7c0cf11d16126563ef2174945a2601b38759 | lib/rules/no-useless-escape.js | text | 158+0 | 227+1 | unassigned: object-literal member |  |
| b10c4afc8f38123528b8f5e8f94367dc67718ff63b0e41c043e59fc09bb9d224 | lib/rules/no-useless-escape.js | text | 158+0 | 228+1 | unassigned: object-literal member |  |
| 888bf136516e15577a2c7787b99ec94895a9478c09c16fbe6676943a581239eb | lib/rules/no-useless-escape.js | text | 158+0 | 229+1 | unassigned: object-literal member |  |
| 8389a1dcbbc809189769bf1771b646cffa24baa92ac3d8a850ea6d526e22a8f2 | lib/rules/no-useless-escape.js | text | 158+0 | 230+1 | unassigned: whitespace |  |
| 462531d34836eae5b5f91023162449e99de07ab8d378f3a03aa33ed6aadeb104 | lib/rules/no-useless-escape.js | text | 158+0 | 231+1 | unassigned: comment |  |
| 88f5360933d42169ddac2670903fe76a759a0e1963eabdac1a9b58043fac1043 | lib/rules/no-useless-escape.js | text | 158+0 | 232+1 | unassigned: object-literal member |  |
| 52354abf739c4a6d96897893b5209f9416323a6306cba3fff452bcbf7fef96ab | lib/rules/no-useless-escape.js | text | 158+0 | 233+1 | unassigned: object-literal member |  |
| 460ba177b951021045c871d043d0d90ab32bb69befe6dafe300a00aac2e66e94 | lib/rules/no-useless-escape.js | text | 158+0 | 234+1 | unassigned: object-literal member |  |
| abc4a7a015950ca6ec6a66971639ef313d67ab9eecd28cc2efece866a1032609 | lib/rules/no-useless-escape.js | text | 158+0 | 235+1 | unassigned: object-literal member |  |
| 8d43c4170420f85b957e8eed13a4943df82af83830cd5aba071a53e7b6fce2cc | lib/rules/no-useless-escape.js | text | 158+0 | 236+1 | unassigned: object-literal member |  |
| 1dc29f03ec01c29c3e4b1c832fc50f11b1c3801997af767af29f2bb8e2b3b84a | lib/rules/no-useless-escape.js | text | 158+0 | 237+1 | unassigned: object-literal member |  |
| 54b59c848072cfc79af5541cb0e082e77f641c97026652190faf93861f49ae91 | lib/rules/no-useless-escape.js | text | 158+0 | 238+1 | unassigned: whitespace |  |
| d392fdac0a6f311e2b04af0d2291c606af28efe4d0c5518c82bccd1dc8bb462b | lib/rules/no-useless-escape.js | text | 158+0 | 239+1 | unassigned: comment |  |
| 3082338951745c2a8e5085c428ab1506cc076355cde305fec8542ea2c119609c | lib/rules/no-useless-escape.js | text | 158+0 | 240+1 | unassigned: object-literal member |  |
| d075f099c32a92e27eaa2d9c1ce26e04dfc1af87f43bc0a577fb2d01e638c507 | lib/rules/no-useless-escape.js | text | 158+0 | 241+1 | unassigned: whitespace |  |
| 4ecd27cee2951a4154e522d145d45dbb07ae4b5e001ea89d256750ce099523cb | lib/rules/no-useless-escape.js | text | 158+0 | 242+1 | unassigned: comment |  |
| 8be8b8186b1b880cc1b11b6af3e58d744ccc0abdfeedfe5565359b31c46e052c | lib/rules/no-useless-escape.js | text | 158+0 | 243+1 | unassigned: object-literal member |  |
| 12d9f95a5e6d5ec93a456b97f23a235882f9e0898f890bcf4ae3273796b75f92 | lib/rules/no-useless-escape.js | text | 158+0 | 244+1 | unassigned: whitespace |  |
| 069224d4327ef266a60a9c00e715be80d31a09f6e0cde269881dce03224f7e31 | lib/rules/no-useless-escape.js | text | 158+0 | 245+1 | unassigned: comment |  |
| 4e5fba6dedcd14da1dba6851b48fe88c823ea5637af14c16ef0b6c05a24e8609 | lib/rules/no-useless-escape.js | text | 158+0 | 246+1 | unassigned: object-literal member |  |
| fe9a7677ba9ea74cd2f265dc99fd593d74be1e716b70b02e8e4ef04dd7372fba | lib/rules/no-useless-escape.js | text | 160+0 | 248+1 | unassigned: whitespace |  |
| e4ea7591c4df30439db213f4a02cc9013f14031d071ab814a41e1ea68dfe1a54 | lib/rules/no-warning-comments.js | text | 57+1 | 57+0 | unassigned: object-literal member |  |
| 5e54a23e6f3bef5ccda5acaa179512a976904ef4aeb3da59ad33bcdd48caee53 | lib/rules/no-warning-comments.js | text | 57+0 | 57+1 | unassigned: object-literal member |  |
| d81f48155956f79521dcdc0531c4a86f6c5a46438ad72837fe775c3ec975a647 | lib/rules/semi.js | text | 56+1 | 56+0 | unassigned: object-literal member |  |
| a1fb181dcd1a35aad36392d74e4f51010a0a14515f37ab53fa186c57a383c156 | lib/rules/semi.js | text | 56+0 | 56+1 | unassigned: object-literal member |  |
| 55dded8d4806c170802d25f365a43a5ac7cd4c297a518eb0472f529284f5a379 | lib/util/glob-util.js | text | 70+1 | 70+0 | unit: processPath | old:processPath |
| 1852fd7fbb63b404090d828019aa9901aa5cbb12527bd399ca9c3bdb21b2cb23 | lib/util/glob-util.js | text | 70+0 | 70+1 | unit: processPath | new:processPath |
| cf81082fcc52f34c401296609d430495b4cc08e68117832a115e1c885fb4d507 | lib/util/glob-util.js | text | 163+1 | 163+0 | unit: listFilesToProcess | old:listFilesToProcess |
| c958f2d9d0e6ca41190501a2169712461c8e8f8954016f95b1fe07064d0d22d9 | lib/util/glob-util.js | text | 163+0 | 163+1 | unit: listFilesToProcess | new:listFilesToProcess |

source: {"unit":["110954ba949588d6acf8d188983234155a42f991abd4301a409daeef1fb48b65","b62a0b6894af1bebf44d9e39ca9cca82f7f7ebd7fff02eb0749bf90e4f87f8fa","608b77347a78592804aa6bf5a6f5214947635baac3883b64cbe0bdb7ac2a9a3a","a74ca068668892a51cbb5ae9850ccfee92bdada3ba9868292d821197f77de8be","ee897562319dd489aa0408b1bd6b28c0bf537f2852bf8f3115c05aa0d3aa3cfb","12e2639a7c26a2095022c0202c8c7fc85d81fc56c766e8bb462127dfc0e5baa5","a9704331f7fd4ec547ca0152aa66cc49893ed982df6f9d926841be75f73deca6","222f193107875fc413f5c39c013bc3b717c6e4e7f50dedad85cf8d1ac947dc2a","15a4e2307fbfc72351dce09f5216d35238e74801eed61d700fe8a0b81618c85a","48d1d6c27f930190bdb06f805359e3330fa068e0abc3c75149047ce3a47759f2","2bb3471e1943cf8029a42bd3dfb55589a6d36c0b511799243988438e07d0ec75","4ce2fe3a2a63c4d3f91529498b47149a616ac9e84d8503dea47443f7f51fc609","b480e1ef1d778aa795e74cdc9185fe2f793fd749a6af75a980979c7a1a8d914c","2259b0d84aea82963decb181665cd39330f321d13d4f589a455569ff596dfb85","2b236acf75aae477e06b6239a9883219eb9f13d7acdf9750c946c6ccfdeef33d","f7654a39d385819d044e272c7335d3ea1d94b7e00a763593a4217aa7430b8437","5a1435ad0a19f47ae20acde53f15684c9a6654c51d0b2d2a6f8f54f43f8ba8fe","3041ea1c3942a54528ce5f05b402dcb4b158b489649a375ab388333d9183b8c5","77657f7c7bb44761fc712958dec5e5b4e43ff8822d364419167b6582005426db","8f033efb1c653980c4e83f2d8dd89acc9b3904629db987c9958fd0bbc81a1b36","f0b28ca10ed62144d965afc8c98f9309840870481e94ea2764dd823869da0d43","176b3f42ab36986a6f225792a7bd26b201185d62c403b6345f46852c5031e951","aebd1193916d2b29392525158b58f378ee78b734bcff48eec1d88f5347414352","e04a6262bb91bc8b3e4b1dcaa557247c12e28646c30a833288a44592b7a927af","ef983298f2653e1bbbdd3fe127bfe157c1fdb28ac45189529b4f835719470195","2de4993f6b7f9a6fd3a97654d5649feda24e6859660c09c9fb48d6e445ca1a78","e2af72c49f4115aef510d40c01e7e1b41f2910569abd834e5d1849d6655e542f","bc1e38f44c3d492104a4fe05fbdbd6c1e97f08a2a2f01ca46456936750de0fcc","e2c38d1e23b75ecca4c7b6d84b87b86d872ceb1554932761580499e8d358e79a","f695fd79d80f71fad40309b91f15b1f5714cfd51fc1109f88c2925ce63b9aa16","c4ca2547b502bfe8c037715ac91113ea43d85167bc682b1893a50416668e23fd","d2dda4b377df4f78d98abef3523b02c76dfe5e29348cf6468ee10ab2ff7470ef","55dded8d4806c170802d25f365a43a5ac7cd4c297a518eb0472f529284f5a379","1852fd7fbb63b404090d828019aa9901aa5cbb12527bd399ca9c3bdb21b2cb23","cf81082fcc52f34c401296609d430495b4cc08e68117832a115e1c885fb4d507","c958f2d9d0e6ca41190501a2169712461c8e8f8954016f95b1fe07064d0d22d9"],"artifact":[],"unassigned":["de8c7d6d95fcfd4cd19d95e487f04570da0f2905b45d18deb5897b9c4af28daa","fc062d3501298daebb8160aff7d791cde80d6ccbe8ea34db621c7bf4077da5e1","66c2832cb4ffde067d1cec8e0acfd4524d35aa430f6627a1ba308a0d4542768e","5c1147cfb8213c27c56ad144f3cfda246b54aea409513a750ee4b7f4a4cac99a","19e2c6ecf9148396c7c258069db3caeed6165579e5b4b9728a3279b8d565803a","df69f973d8997195372f20f9d4225fc7f372b0a16ff58cdcb3b0a55f54a72686","130b0a0c54b805c3c1792f8690034ffe18231cf73d1f45d5bb649ac20a76209f","b69b0150303453841cc242397fc82cb734219925734702a89ac5255118f25b3c","2b46c91ee84117da87248ae028a54f3d4d1ee0cb08e0d7df9f71be29b104eef6","3400579e817d8a29ad233458189ff8d5c206629126f64368aa9c6957a9cd46ad","b3d840e545606e1544ad6752b6465fc59febbcd1b4e59cf858b8885b6d3750f4","e35efdca6ab0479879a46d0f4e2481d5ab9c79becb8736f869464689a3916e6a","f8913500267b61664ab8c7054e78696062bba2016fe1065f85ae68386bf3edd0","518f22b882fe3c5a94426517b76977ca05ae1435da4da9a3fd7da4951ceb26d8","3a49a8920a6556691848384ddd750860275230bae5aa49117f0a752bca33c176","7fbef0c4e6def447a3986bf50af0fa0e6e8d9f3ed49f8c2a27b6c93aaaa0eafd","fb559c978f58d30dec98b5214271f4c1af7f13703125bcb763dacb09aa8f13a2","726882c992d61ce9dd69140246952136459081a07a309554c0125d8747a92bf8","e41cf5a00db6807697b864db2f96ad33db3fa8474ff5a54dd82b5040a070a783","5c3b44c4f8200f092c7e9c5b9ea3e371124f01a4b770e2f9589ea31a0e0d959d","b9449f5d5f7cf08089ab943115ababaddfd4d4c70a3b2bbf96996f3906ecc62b","a9ba7b48459330d85cd0b6b36ae0873017523dc9beb511f411ed3af853b7a7a3","0b3be84c95b51d90a72bed663a5207e1bf3bc923e752b487947eba8ea886f873","b881980a0d6c24be74a32f3be19454c3fc0095a1615348494f891e644a4bb721","1364abb4f99ab4bd99883b7694d27e26ebbd872d08a0e8eeb2b8601bca54373a","ba5909012d41bf36cdbe2aa89d67ed4fc7ac974703548b8b0d1468652011603f","3367f5c42f42e608ff927b378c99301b61b0085d0c02f64c8a7b899e9a638429","ae3795542208c829d59b7696a64cfb58a0526d401e6cd367799ef6065ba6502a","9a8691fec7b4dc0b04d80e39274b65a2f7c0791d1d80c0d8953b4a6b69327c44","75e259d7757e88d6c9ebba7dc4fb045538558dc19c97920dd507aca0aa69ec2f","05a2f8dc97c4e0909f92b8c41feb9932d37dc6c7fdf2c3400c81d6d6166927b9","5d93f423aaae83c0a5b94ce3971967e7a3d9ab3ceaaad902c97b445af198665a","62a22d96a3bacf54c6353e73506f4e3450c4dc1ebb6a89aba9a94ab4c9376bee","507c99296447f3b20fa8a9ba6f825588ec969e1ab00babab5a34192c9c35909e","2c79e4a468a454158d74a7dc9e902fb47e6b87c3595972f7c0cee4002e37f170","255729473519e83655c7268c8c7f20143352a77623883ca7b7ef8d86e23e77f7","9ff60036f0ec5a79a4a3872705cbfa4c95cbe01980c9c36c2dc0cdc18aa10687","e1bed9e27356bf852f91d87e4b36d38d2acff16fc2df2cd09b930e82deb8e96e","98cd07227ffb4d139a78a4ca68309e0996a8fdc0981559bc55b1dd572b425b58","4922575b971a64ce316a33d36b37452162164eeeb54894f411de1fccda14dd59","8c7bad1a18d0d8ed22274e8b59a3ec68c6ec4b0c45323167972d655879422d22","0b7a8f8be43e8c8f722c30b74d4c8f8dd5bfd89724e186b05309a3c99b63385c","5d447c985559ca643741759d0411873320e7f6ea70fe383d8e30b67c53b2f41b","fbb2124e0b5133087423895190e36c9c9698db5cbc0dca9ac20c47d2158ce79d","2deb15b89c2a2d4d9db117079bc0a273e691ef9a4ecbcc3c7a3fe9e08db9aba0","c3e03cd52266fe0a9d8fd8ea5ca0ecd2837f269d456fa74b0ec20d3c456a59ab","f4836d0bf057f08f1e69cc2bb6d195b1ab0d3f867e8b01ed78d0216c56c7d0d5","cff2bb5a2d6bb1b913862308f2f4567df56aa795a5ddee4098394f3f0cb49d39","68700cbcfa0c1312c06fbe5c092a8788e56ec5fcf90fb1ef9cf1e6a628ff9aa9","96b56b953acb60c78673c2cf3485f66742cfe67079989c28df2459a973519566","c4725ef5082f06b9446be94a8334f7f8a83261512495e6b1be117fe0e9ec82ed","b1be5c97ab1bb7af6492685613578c55699a560d4d93459849348bd28725644d","91cbd3c16f3e7dca952311bb95f9b74110cbf3ceefcdd43fb58766e5b34bd43b","7c9f74e890e428f6897dfee4d34d5f6ec6055b280d46b7f5e1d99f7c6e39b9d9","869b644a171255149eb2898f9c9790c27b587ae1c020c234a3f1dfad60225b35","0dee6f746a6ed9d9687125ee2b96f347ff1cd43014604101346449dcf3d35a74","cf2b02208a5179a0917f44d577f35e7c37692615d7c028ce9829f0260c0a4376","daef592ba2e28ae34340cda79d5253782340a01f8f13c74629bcdecca87fd546","9307a9c9ea950b68ac31b47e9721b91d49a18495d15102e1c05124a66f555d3d","b016a1bfcf8a0ee24368ea2fff512e671a0c498bc3257f53ce2115dcecc7ff76","9a77e9b8a7eb6cc1651a4e81fedf19987ce06383895aa9372ba5eb1a7cc4015f","121f58ae2a187998bc4ed5dc3fb576c73c23b9a45a2987d1e7ab0c5ede41c7d9","1f80b91c6a74ef4fe54acf91535601b006ae0c00472cdd8da1e3fecf1c7932de","6cc00016ca7414c6a22cc14400d266aeba8b20668e19fadbf04919fbc8c576dd","2153ea141a0a5e3a756e07e78ed70c314676688e94a8c83c1b13ad3ddda96b2e","1f332479286c072decc704b8b26591f3b0fe45071262f28c00397d0f04a88d1a","1c4240f9be6f432c7f96f7d9811153f1500b4e57a743e78bd5cbb6eaea773cca","1cd7bb2323415886839bf775b2c869431feb2ba4cea6a305a619a960314e8b42","fbb2f78053ae3f69a431abe3b67579a4f3ed58081145a7a2c5daecde9eace230","d333010d7ab750d71c676a2491e9b88552745b26f2ee732a9005a40b90e3e0c3","3d10217b4197c388cf1bffce0f73bac6cf438be8015272aaa686cfd695ea93a0","637288a4bed27947fdd22c3c67f431b5c5f12c72111aaa101b1add14506faf73","c1e572c383d087a912bd02cf5455400b66086bc60f920f95a3de55a007c75613","e52885b8554e78a8d191ca352893b9b0a61509ca1a196f7943e63118e6346892","ad0fe4ea7e2575814ed6855154a059d7ea480a130dc27b62cfea45870ec100f7","53839f9634dc4835454121c2704b6081465325823eb5e3bb299cb70d466f8f5a","6e7e115a4b9649b7fad4631aabadb34139bfb8a360a6d2bcc36e868e06c0daec","70227feaf54ee37fb7098a2179343baab9fb2932d99dfaadbf304ef8ab9c621e","ace836b9456cd105b7da764bef995ce3cee70ac351bc9665362b8610ba31055c","4bba34e3ae4489a7c74bb37b205803158899235c7d5c580a610011873d538377","95c58a40a770e05d05ae6d4a14350bad2a004d86fdb0b74ea1bfc26b80c7bcd7","c0466260f6b3979c4ee1850081268292866f7024280a30b22182ea7aa6c8f498","ffb657fab7cc3b20a56363ea6b6e9eec29d210aa1ffcd9c61f4f6963c1277c37","608f4f05d9f9bed7e8d31bddfdd73c92c556906dd3e347ba425ab0681e3e3c0f","28100abe7f7b84e1e7ef605caedbaed95021c4e2f843f5043861686ad10948a9","9c72f421a4f4b57068d9e6990d68f7f9e3eeb556df8b3cc3591004dbbf68eac2","5c65351ac1ac528daf43f2b70c73a94a4e8651ce133db333911afbb86578b99b","5ca8308710e63983544a41eb0f18407168ddd104f6a3fc6c251fd08e74459948","e69cfb600940d88a6ec7560948fef3bf5c83284121fc57db719ec4af8051ee80","e3305a50cd4305fb63655e87d2d06289a55bce9d01ee0e649bc0aa8eedc3c926","928e265856fc27015b59411b8f31078dc94c0c4a3a458ef59d25c95599566d12","a04fa41eb4aeb1e7a1ff56cc7bd74fff4ccc369fddb13207e47da6604aa861ec","b74ebf7943fc9434bb9a46076896e0fc72fb68427d2d30f996c9b86d13926997","3c7c65d132755efd0b9beb2876805acf1933580ade2c7d31d30aeffbc4b82a87","13d2a39c0e940acbccb54cace63cf98cebaf48a3c1e4ddc19a451cafc859cc0f","20f1421fe6a441a5da70835448f8e239ba9c91cc8b76a34fd25c8a42973983b9","291bcd77194c3a20e1e9bcb588d5debd55cc56d09a72f6f1f7e6746094b2996e","29d486c2d85400cb1cd4e857df1cf71740cde86689f936005aa5ca24b3b45554","e1352ad5950aec1c65a851340455d28eb144bddad438142e624761c922eedd95","1818d7f689a47b0f0149865986d5a6518b3348b2c6e7a2b84c4232335865e8b7","0b5d97b21a1cfc1d3acb3dd41a03c154da192e96178a021761414ecf801badc6","3eb8fed1329f1060cb6fe4e78568246cf5d9c922a2c4dbd6355dbd303eef381a","669b0c2b34dd638a08107abd8b846230a405b19dcf2bb27b9a374d164660e7a5","c04064386ac64567dccb1f8c9a873294c156919f07425dd4fc6b58660015a7df","30f090fb476ecf87d85c07f4bba095769debe88c5ac874c62f826ae96b5453a3","098fb78bfe3f31656a16896ce71ccd4abfa624af467c45a9eebe2f133816a4cb","d1301a08c7b212eda597ac0486f8900fee494a374483c4ca6f7e08fd666a033f","1e1bc92250af5c36590dc43bee4e8ee370b39f1d6a7a133342f1c2e48b2efb94","e9468f8f5ae64767166e2a7c0e502bd44adeba8b87c4c2e55123e414dd34bd7c","6af7732b5b030cbc21177f1bfca397ab43353d405bb30ca844d77ff3ca4e19fa","b66ed5135278adedd0d6d8633334233a3c8fc16aa83b0464ff50f59c67472277","abf27b2920df4331988f4959a0581b947f2be970fc1c77d672595c1b88fd2bbe","58af789348a169941468693241c1e86fcfe9629222474be16362a12f723b2d2a","72fdbfb28bea461acb4be393f659c9682a2ec028f73e8ec82298aaec91a9d206","63b1f1b2073c087eb0b5b466fb5b811e487b856675470670a458d9a13f68f667","2836a36eceee2ccd4f06755aaac1c2ac42a6e0b9bf15dec23c278a058c557b1d","42b49beef073d7b274a320856c2a33c3fafb5ad1098d0e99eab690793afc6a02","485a72bdc685201709cd260b54ae738079e26fbba884a4ba971e28fe7a9fd84e","29f82ac50eae3e9ab21fa738a84c84854b7c396f11d8192f2130dea222ac9b38","fa5f118b8e678d870fc9f2e25c9cb2dcdbf09a9ec442c5cc3ec68dd3d5ca8f36","c77215d9023323ff9b37d39ee19c90ce10089b7c9f56520c934ee20eab6cbf05","59cfe0201a320f2dcf93acfdfa5b1c4afa8f6df93b06bccd32a5eb68eac4e1e1","2830ba1ed0ea8234b1319b521f1b4029393564be119bc37e6f083c7c1ace31d9","89a6b0069f2ef158c1c50f5e8d5a4ceed1b24230df0204572ea7e550b7c64ecb","c44589f4b48e1e6ff933c16b47b87b1c7772c724ef98467174a60eeffaa1c3a8","dabad0179269d12c59c9d2a7202f1f874b8835bb76ca10d88d15d170400a68b0","f9619442f6987e6ed0f8d6c3661febb0388a6db23b406f9685f0e831cb767819","37109864ad83e5a12d91805924fc89ad332d621ea66144789906dc89cfda0337","79c849350adec85f1278631f79b2e7388e415b3bce4976c352e89052812d2063","47f521bc666902e3b823fc2e0e2c2857779b9dbf2c4d2854ebe82ca52fc3eb80","0c0cc0eac82ab727222a435acd6780068a443123371a380c8912caa02f9cb23a","b0da493d7e076156416c8352ddda388ce032f8d1e7a40236edc5a80bf26f60a8","e651421ca2584d53abfb379ec6a8ebcee57382a44bb59816a535a26b1dcf5b3f","b1cb18e1fc8c2dec1e0f19d922ed7c0cf11d16126563ef2174945a2601b38759","b10c4afc8f38123528b8f5e8f94367dc67718ff63b0e41c043e59fc09bb9d224","888bf136516e15577a2c7787b99ec94895a9478c09c16fbe6676943a581239eb","8389a1dcbbc809189769bf1771b646cffa24baa92ac3d8a850ea6d526e22a8f2","462531d34836eae5b5f91023162449e99de07ab8d378f3a03aa33ed6aadeb104","88f5360933d42169ddac2670903fe76a759a0e1963eabdac1a9b58043fac1043","52354abf739c4a6d96897893b5209f9416323a6306cba3fff452bcbf7fef96ab","460ba177b951021045c871d043d0d90ab32bb69befe6dafe300a00aac2e66e94","abc4a7a015950ca6ec6a66971639ef313d67ab9eecd28cc2efece866a1032609","8d43c4170420f85b957e8eed13a4943df82af83830cd5aba071a53e7b6fce2cc","1dc29f03ec01c29c3e4b1c832fc50f11b1c3801997af767af29f2bb8e2b3b84a","54b59c848072cfc79af5541cb0e082e77f641c97026652190faf93861f49ae91","d392fdac0a6f311e2b04af0d2291c606af28efe4d0c5518c82bccd1dc8bb462b","3082338951745c2a8e5085c428ab1506cc076355cde305fec8542ea2c119609c","d075f099c32a92e27eaa2d9c1ce26e04dfc1af87f43bc0a577fb2d01e638c507","4ecd27cee2951a4154e522d145d45dbb07ae4b5e001ea89d256750ce099523cb","8be8b8186b1b880cc1b11b6af3e58d744ccc0abdfeedfe5565359b31c46e052c","12d9f95a5e6d5ec93a456b97f23a235882f9e0898f890bcf4ae3273796b75f92","069224d4327ef266a60a9c00e715be80d31a09f6e0cde269881dce03224f7e31","4e5fba6dedcd14da1dba6851b48fe88c823ea5637af14c16ef0b6c05a24e8609","fe9a7677ba9ea74cd2f265dc99fd593d74be1e716b70b02e8e4ef04dd7372fba","e4ea7591c4df30439db213f4a02cc9013f14031d071ab814a41e1ea68dfe1a54","5e54a23e6f3bef5ccda5acaa179512a976904ef4aeb3da59ad33bcdd48caee53","d81f48155956f79521dcdc0531c4a86f6c5a46438ad72837fe775c3ec975a647","a1fb181dcd1a35aad36392d74e4f51010a0a14515f37ab53fa186c57a383c156"]}

config: {"unit":[],"artifact":["6b101db97c85212c020cb8c1422f8e6ced1578e65342f51ff923d3f57deba4e0","4a0d4f58dc54c540b0b2a94bec1bcfbe5b15fe0230ac838778d6c0a0df623d28"],"unassigned":[]}

Task reconciliation: expected 167; terminal 167; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__245/run-tfIVpR/terminal.json