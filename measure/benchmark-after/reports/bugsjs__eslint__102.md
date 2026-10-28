# lean report: 3c1dd6d8d3391b3568d6452e11d3d1336c629d5e → 8f85cbe579117913bf9827762ba92a0af5ab5ae4

Identity: 4b3185c49244e933cbaf5ea62d277fd64c16f6b804c9c8efdf6daf14d8aa5dde; lean 1c55a2c94d2d07e20053c70d24c38d6221e2c819

Values: undefined at undefined, sha256 undefined; lane B draws its listed values first, and each certificate names the file by this hash

1 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 1 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/config/plugins.js | `Plugins.loadAll` (161-174) | **PASS-bounded** | refused:unresolved-module | PASS-bounded |  | TS2304: Cannot find name 'Environments'. |

## What would make the asks provable

### lib/config/plugins.js · `Plugins.loadAll`

- line 31, `unresolved-module`: TS2304: Cannot find name 'Environments'.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 32, `unresolved-module`: TS2304: Cannot find name 'Rules'.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 55, `ts-strict`: TS2531: Object is possibly 'null'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 119, `ts-strict`: TS2339: Property 'messageTemplate' does not exist on type 'Error'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 120, `ts-strict`: TS2339: Property 'messageData' does not exist on type 'Error'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 133, `unresolved-module`: TS2591: Cannot find name 'require'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 173, `foreach`: forEach runs a callback for its effects; write `for (const x of xs)` so the state comes out of the loop, or pass an arrow with one parameter
  do: [migration] Write `for (const x of xs) { ... }`; a loop may update a local, a callback may not.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.