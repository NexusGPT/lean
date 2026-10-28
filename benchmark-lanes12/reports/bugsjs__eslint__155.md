# lean report: 1d0d61d81959d9897a71f5196c9d4804f0437d85 → 7334ad0a2cb7cb74cda291cd283ede671030f554

Identity: 82d995031c12e3c9bce67f726417158722ca5ee99957f66baa9760bdaa76565b; lean 815fc01fec5f51af99003faa686f25330e7c33ad

1 changed function(s); 1 unchanged caller(s) checked through lane B, 1 with a WITNESS through a changed callee: **0 in scope · 2 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/prefer-const.js | `getIdentifierIfShouldBeConst` (89-147) | **WITNESS** | checked | WITNESS |  | input 1: trace; lib/rules/prefer-const.js:101 |
| lib/rules/prefer-const.js | `groupByDestructuring` (186-220) | **WITNESS** | checked | WITNESS |  | input 1: through getIdentifierIfShouldBeConst (changed; its own row is WITNESS); this function's text is unchanged; lib/rules/prefer-const.js:101 |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 11 = 11 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 96f751889cd717966b05b46659b4f6182b7655488db58eec2f6f2d137cee6d3a | lib/rules/prefer-const.js | text | 93+0 | 94+1 | unit: getIdentifierIfShouldBeConst | new:getIdentifierIfShouldBeConst |
| 778fc8aca15c28ba93198ca12a5aeac8ff2acdfe571c6c442f36385ac898bf37 | lib/rules/prefer-const.js | text | 93+0 | 95+1 | unit: getIdentifierIfShouldBeConst | new:getIdentifierIfShouldBeConst |
| 83cd8f2de3025e70aed45d31c70d3b9da9785c4c2a8d4015356e1e17fa3ed395 | lib/rules/prefer-const.js | text | 93+0 | 96+1 | unit: getIdentifierIfShouldBeConst | new:getIdentifierIfShouldBeConst |
| 5cde1968317f6aab25443d03b1963c140e7194b1e6d6f2505695cbdb69fbc189 | lib/rules/prefer-const.js | text | 93+0 | 97+1 | unit: getIdentifierIfShouldBeConst | new:getIdentifierIfShouldBeConst |
| 5d42d50bf6e089c7a2c3c970f32bba8d907b75f5b13490ee8fb523de3a7fcc59 | lib/rules/prefer-const.js | text | 93+0 | 98+1 | unit: getIdentifierIfShouldBeConst | new:getIdentifierIfShouldBeConst |
| c0b0a728ce253e89942bc9844df60bef28179818157e27efc849e27dfc7d50a8 | lib/rules/prefer-const.js | text | 93+0 | 99+1 | unit: getIdentifierIfShouldBeConst | new:getIdentifierIfShouldBeConst |
| 75703c8d49352a118d6962546fcdd1385ef2ad710157950f6176f0a991b80210 | lib/rules/prefer-const.js | text | 93+0 | 100+1 | unit: getIdentifierIfShouldBeConst | new:getIdentifierIfShouldBeConst |
| 69c02d9c10feac77b03e68e0dc61baba4c9a419dec84d0f94e2d1dcef51d316f | lib/rules/prefer-const.js | text | 93+0 | 101+1 | unit: getIdentifierIfShouldBeConst | new:getIdentifierIfShouldBeConst |
| a790150c312cb29f361732e9f50967860651363c8bb5b4521601842ec4ad137a | lib/rules/prefer-const.js | text | 93+0 | 102+1 | unit: getIdentifierIfShouldBeConst | new:getIdentifierIfShouldBeConst |
| c5209eaa025e3658eda60f752b629c931972b57a0234b8b3b8c54d6916c4b1ea | lib/rules/prefer-const.js | text | 93+0 | 103+1 | unit: getIdentifierIfShouldBeConst | new:getIdentifierIfShouldBeConst |
| af58967c07c0b1a63760cdb6f5597a36293b5b3e6d5e53d458c660b83f4091c6 | lib/rules/prefer-const.js | text | 93+0 | 104+1 | unit: getIdentifierIfShouldBeConst | new:getIdentifierIfShouldBeConst |

source: {"unit":["96f751889cd717966b05b46659b4f6182b7655488db58eec2f6f2d137cee6d3a","778fc8aca15c28ba93198ca12a5aeac8ff2acdfe571c6c442f36385ac898bf37","83cd8f2de3025e70aed45d31c70d3b9da9785c4c2a8d4015356e1e17fa3ed395","5cde1968317f6aab25443d03b1963c140e7194b1e6d6f2505695cbdb69fbc189","5d42d50bf6e089c7a2c3c970f32bba8d907b75f5b13490ee8fb523de3a7fcc59","c0b0a728ce253e89942bc9844df60bef28179818157e27efc849e27dfc7d50a8","75703c8d49352a118d6962546fcdd1385ef2ad710157950f6176f0a991b80210","69c02d9c10feac77b03e68e0dc61baba4c9a419dec84d0f94e2d1dcef51d316f","a790150c312cb29f361732e9f50967860651363c8bb5b4521601842ec4ad137a","c5209eaa025e3658eda60f752b629c931972b57a0234b8b3b8c54d6916c4b1ea","af58967c07c0b1a63760cdb6f5597a36293b5b3e6d5e53d458c660b83f4091c6"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 2; terminal 2; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__155/run-05fxFe/terminal.json