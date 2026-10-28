# lean report: bd0514ca9bc9dbb5dafb27085cf9e554573610b0 → 599393fc4d7d585f9a277f24e208c626685318e3

Identity: ee2ce8f99b8493656af7cb20a19bc1ae35cec2c6099be8cef8ee9cca698a8bec; lean 815fc01fec5f51af99003faa686f25330e7c33ad

13 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 13 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/indent.js | `(edit fe7a1838d0ef)` (258-258) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit f4e7da056740)` (258-258) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit fcf0ec12ad5e)` (265-265) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit ca266d420814)` (266-266) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/indent.js | `(edit ba59f60b6c46)` (270-270) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit d2978d335429)` (271-271) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit f2a48069bd11)` (268-268) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 5a60087d7e28)` (269-269) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 9d2e10cbe0b4)` (409-409) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 66f36b2c61b0)` (415-415) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 94de4abf2ed6)` (436-436) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 3a42b0c22082)` (437-437) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit dba69f9209a9)` (432-432) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 13 = 0 unit + 0 artifact + 13 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| fe7a1838d0ef844d3b0e80906b2df5a8f77a6bb921139b1f001eccbc13b11619 | lib/rules/indent.js | text | 258+1 | 258+0 | unassigned: object-literal member |  |
| f4e7da0567401d422a6ca1e3dc9ac8845311c37355275e9b30f675f0feec2b2c | lib/rules/indent.js | text | 258+0 | 258+1 | unassigned: object-literal member |  |
| fcf0ec12ad5eba5d93ee5c9fcbbf4d53919eacead07963c4a0a09f705919b1d0 | lib/rules/indent.js | text | 265+1 | 264+0 | unassigned: object-literal member |  |
| ca266d420814ebca8f7d512f535e4633e3629a2062ae0d19915928a9349a310b | lib/rules/indent.js | text | 266+1 | 264+0 | unassigned: whitespace |  |
| ba59f60b6c46a667bcc495419db5d75e4fe32c8f0d2c3dedfe49f8af2669e21c | lib/rules/indent.js | text | 270+1 | 268+0 | unassigned: object-literal member |  |
| d2978d335429b0db67cbe6317d383b655728d822b3b52ac5762b1e8fb0b4c5c3 | lib/rules/indent.js | text | 271+1 | 268+0 | unassigned: object-literal member |  |
| f2a48069bd11afd7faa68660eda223004ef3ca01fe9690b5ce3489c998293d5e | lib/rules/indent.js | text | 270+0 | 268+1 | unassigned: object-literal member |  |
| 5a60087d7e282ee74da33115794647e45b350178b7f7e859518a7a9956766f05 | lib/rules/indent.js | text | 270+0 | 269+1 | unassigned: object-literal member |  |
| 9d2e10cbe0b408269bc43537541ca1268880e373fa85158400fa34b107a55924 | lib/rules/indent.js | text | 409+1 | 406+0 | unassigned: object-literal member |  |
| 66f36b2c61b0e3a253aa3d7fa0e7e944175cbf0c70646fcf6ea00f7967ab67d5 | lib/rules/indent.js | text | 415+1 | 411+0 | unassigned: object-literal member |  |
| 94de4abf2ed67215934670affb7decb871a05134737082b2ba98ae79a65dc0dd | lib/rules/indent.js | text | 436+1 | 432+0 | unassigned: object-literal member |  |
| 3a42b0c22082dabb7d3e76de9cfa6a26a14f7116db9c9e4601075b23b50b6a1b | lib/rules/indent.js | text | 437+1 | 432+0 | unassigned: object-literal member |  |
| dba69f9209a91b803dbda60260e446cff0c9fb245ffc87291129764b32e54343 | lib/rules/indent.js | text | 436+0 | 432+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["fe7a1838d0ef844d3b0e80906b2df5a8f77a6bb921139b1f001eccbc13b11619","f4e7da0567401d422a6ca1e3dc9ac8845311c37355275e9b30f675f0feec2b2c","fcf0ec12ad5eba5d93ee5c9fcbbf4d53919eacead07963c4a0a09f705919b1d0","ca266d420814ebca8f7d512f535e4633e3629a2062ae0d19915928a9349a310b","ba59f60b6c46a667bcc495419db5d75e4fe32c8f0d2c3dedfe49f8af2669e21c","d2978d335429b0db67cbe6317d383b655728d822b3b52ac5762b1e8fb0b4c5c3","f2a48069bd11afd7faa68660eda223004ef3ca01fe9690b5ce3489c998293d5e","5a60087d7e282ee74da33115794647e45b350178b7f7e859518a7a9956766f05","9d2e10cbe0b408269bc43537541ca1268880e373fa85158400fa34b107a55924","66f36b2c61b0e3a253aa3d7fa0e7e944175cbf0c70646fcf6ea00f7967ab67d5","94de4abf2ed67215934670affb7decb871a05134737082b2ba98ae79a65dc0dd","3a42b0c22082dabb7d3e76de9cfa6a26a14f7116db9c9e4601075b23b50b6a1b","dba69f9209a91b803dbda60260e446cff0c9fb245ffc87291129764b32e54343"]}

Task reconciliation: expected 13; terminal 13; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__5/run-JXzxyG/terminal.json