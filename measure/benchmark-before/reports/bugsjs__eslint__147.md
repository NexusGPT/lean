# lean report: 8f6546cda9ca86e5091255dfe7f7985ec3a545d2 → ab940c5905761e61190d37c44bd2c70b0dfddfed

Identity: 86cea4b014fe2bd78deaa35e0a6a34ac5d874b269b2d3967d3ff9b1961d997af; lean fea80f883efbce3d83436d19a1a4b6778e4914a5

Values: undefined at undefined, sha256 undefined; lane B draws its listed values first, and each certificate names the file by this hash

1 changed function(s); 2 unchanged caller(s) checked through lane B, 1 with a WITNESS through a changed callee: **0 in scope · 2 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/linter.js | `modifyConfigsFromComments` (292-379) | **WITNESS** | refused:type-assertion | WITNESS |  | input 0: trace; lib/linter.js:304 |
| lib/linter.js | `Linter.verify` (691-935) | **WITNESS** | checked | WITNESS |  | input 32: through modifyConfigsFromComments (changed; its own row is WITNESS); this function's text is unchanged; lib/linter.js:304 |

## What would make the asks provable

### lib/linter.js · `modifyConfigsFromComments`

- line 307, `type-assertion`: `value` holds a value whose type nothing checked (an `as` that narrows, or an any or unknown value), and this slot reads it as its declared type; test it first (`typeof x === "number"`, a field test), or keep it in a local, an operation or the result
- line 310, `unsupported-member`: `.index` of a match is read for a match of a non-global regular expression literal bound to a const (`const m = /re/.exec(s)`, `s.match(/re/)`), or take the first position with `s.search(/re/)`; a match from a global pattern, an exec loop or matchAll depends on lastIndex
  do: [migration] This property is not declared on the type; declare it or narrow the type. A member of a type parameter is read through its constraint when that is one record declaring it; an indexed `this` type reads as an opaque value; `never` is unreachable.
- line 315, `assign-target`: `Object.assign` writes into its first argument; pass a fresh literal `{}` as the target or spread the sources into a new object
  do: [migration] As a statement on a plain record the function owns or was handed (`Object.assign(t, s)`), the target is rebuilt with the sources' declared fields and a parameter target becomes an output. Anywhere else, copy into a fresh object: `Object.assign({}, a, b)` or `{ ...a, ...b }`.
- line 315, `type-assertion`: `value` holds a value whose type nothing checked (an `as` that narrows, or an any or unknown value), and this slot reads it as its declared type; test it first (`typeof x === "number"`, a field test), or keep it in a local, an operation or the result
- line 320, `assign-target`: `Object.assign` writes into its first argument; pass a fresh literal `{}` as the target or spread the sources into a new object
  do: [migration] As a statement on a plain record the function owns or was handed (`Object.assign(t, s)`), the target is rebuilt with the sources' declared fields and a parameter target becomes an output. Anywhere else, copy into a fresh object: `Object.assign({}, a, b)` or `{ ...a, ...b }`.
- line 320, `type-assertion`: `value` holds a value whose type nothing checked (an `as` that narrows, or an any or unknown value), and this slot reads it as its declared type; test it first (`typeof x === "number"`, a field test), or keep it in a local, an operation or the result
- line 324, `assign-target`: `Object.assign` writes into its first argument; pass a fresh literal `{}` as the target or spread the sources into a new object
  do: [migration] As a statement on a plain record the function owns or was handed (`Object.assign(t, s)`), the target is rebuilt with the sources' declared fields and a parameter target becomes an output. Anywhere else, copy into a fresh object: `Object.assign({}, a, b)` or `{ ...a, ...b }`.
- line 324, `type-assertion`: `value` holds a value whose type nothing checked (an `as` that narrows, or an any or unknown value), and this slot reads it as its declared type; test it first (`typeof x === "number"`, a field test), or keep it in a local, an operation or the result


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.