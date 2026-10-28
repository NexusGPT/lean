# lean report: 27616a81ff0636f94e2ea15c977b56e7c7e23a19 → d0fb38929a95273568c717de150b38fb06adde87

Identity: 15a751d3aeffe2adbfbcf2f5be9d722c20f3fc115c4c0b2ad5fab368d1cdd884; lean fea80f883efbce3d83436d19a1a4b6778e4914a5

Values: undefined at undefined, sha256 undefined; lane B draws its listed values first, and each certificate names the file by this hash

1 changed function(s): **0 in scope · 1 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/util/glob-util.js | `resolveFileGlobPatterns` (85-90) | **WITNESS** | refused:callback-form | WITNESS |  | input 59: outcome; lib/util/glob-util.js:89 [conditional] |

## What would make the asks provable

### lib/util/glob-util.js · `resolveFileGlobPatterns`

- line 89, `callback-form`: an effectful array callback needs an inline arrow so its world transitions are read in array order
  do: [conditional: the function has no `this`, `arguments` or `new.target` in it and is never called with `new`] The callback must be an arrow function with plain parameters. A named function is read by name when its own parameters are plain; otherwise pass it the arguments JavaScript passes, `xs.map((x, i, a) => f(x, i, a))`, or only the ones it reads. An effectful callback may destructure its element or default it where the element type never holds undefined; name the fields you read instead of a rest element.
- line 89, `ts-strict`: TS2345: Argument of type 'Function' is not assignable to parameter of type '(value: string, index: number, array: string[]) => string'.   Type 'Function' provides no match for the signature '(value: string, index: number, array: string[]): string'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.