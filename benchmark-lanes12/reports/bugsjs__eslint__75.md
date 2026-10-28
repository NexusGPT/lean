# lean report: 73815f6667855a3f60bac62254291e8f1e35fb29 → fff61d9fb12f774d7273ccfd08eabab86444c117

Identity: 457fab4f437792e6e43ec4cff64280c6a22e52755bf0812a5f7ee8e07a3a7943; lean 815fc01fec5f51af99003faa686f25330e7c33ad

3 changed function(s); 2 unchanged caller(s) checked through lane B, 0 with a WITNESS through a changed callee: **0 in scope · 1 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 2 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/linter.js | `isDisabledByReportingConfig` (410-424) | **WITNESS** | refused:unsupported-member | WITNESS |  | input 74: trace; lib/linter.js:416 [migration] |
| lib/linter.js | `(edit 59d9ad3da71e)` (407-407) | **ASK** | unassigned:module-level statement |  |  | module-level statement |
| lib/linter.js | `(edit 8341efa882a9)` (407-407) | **ASK** | unassigned:module-level statement |  |  | module-level statement |

## What would make the asks provable

### lib/linter.js · `isDisabledByReportingConfig`

- line 416, `unsupported-member`: property .rule is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 416, `ts-strict`: TS2339: Property 'rule' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 416, `unsupported-member`: property .rule is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 416, `ts-strict`: TS2339: Property 'rule' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 417, `unsupported-member`: property .line is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 417, `ts-strict`: TS2339: Property 'line' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 417, `unsupported-member`: property .start is not declared on Object
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 417, `ts-strict`: TS2339: Property 'start' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 6 = 4 unit + 0 artifact + 2 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 59d9ad3da71e8558632ac2978d603d24194cdc6ec885f4360281f5184c211cc8 | lib/linter.js | text | 407+1 | 407+0 | unassigned: module-level statement |  |
| 8341efa882a955a4a4838b1e034506176afe9028961d525ffe259edff7320d50 | lib/linter.js | text | 407+0 | 407+1 | unassigned: module-level statement |  |
| 2ca9b5e783f5f4449c4ffacedb8bd3a1f649e4f88b20ab67e74321d689e053e2 | lib/linter.js | text | 417+1 | 417+0 | unit: isDisabledByReportingConfig | old:isDisabledByReportingConfig |
| cee5648eca3fdee9d1f7fa1067f05cbd6d04cda4febb72ff71a648792f784b50 | lib/linter.js | text | 418+1 | 417+0 | unit: isDisabledByReportingConfig | old:isDisabledByReportingConfig |
| 37a34b8d94c5d0c64360dd397e123e12cc5ab7953365b3825e150ecacaf50be2 | lib/linter.js | text | 417+0 | 417+1 | unit: isDisabledByReportingConfig | new:isDisabledByReportingConfig |
| 2b7ded49f981535a59cb7633257c3a1a0d5f12da06731588498204b11f0b11ff | lib/linter.js | text | 417+0 | 418+1 | unit: isDisabledByReportingConfig | new:isDisabledByReportingConfig |

source: {"unit":["2ca9b5e783f5f4449c4ffacedb8bd3a1f649e4f88b20ab67e74321d689e053e2","cee5648eca3fdee9d1f7fa1067f05cbd6d04cda4febb72ff71a648792f784b50","37a34b8d94c5d0c64360dd397e123e12cc5ab7953365b3825e150ecacaf50be2","2b7ded49f981535a59cb7633257c3a1a0d5f12da06731588498204b11f0b11ff"],"artifact":[],"unassigned":["59d9ad3da71e8558632ac2978d603d24194cdc6ec885f4360281f5184c211cc8","8341efa882a955a4a4838b1e034506176afe9028961d525ffe259edff7320d50"]}

Task reconciliation: expected 5; terminal 5; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__75/run-uBh7kv/terminal.json