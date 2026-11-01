# W1h: a parent for code without one (2026-11-01)

A unit no parent holds (a function of an added file, a function added to an existing file) was `NEW`: loaded and run on
drawn inputs, its faults counted, never compared (design/new-units.md). On the 44 AACR pull requests 98 of 470 human
notes sit on added files, and lean read none of them: `pr.mjs` answered every unit of an added file `ASK new file: no
parent to compare with` without running it. This lane reads such a unit against its **declaration**: what its author
wrote down about it, in a form a program can check.

## What the declaration is

- its parameter types as declared (exec/spec.mjs `declared`: the specs before lane B widens the draw with an Error
  option, a key list or the reads' shapes);
- its return type as written: the annotation, a JSDoc `@returns {T}` in a JavaScript file, or the type of the variable
  an arrow is assigned to. A return type the checker infers is the body's own and declares nothing;
- the throws it names: JSDoc `@throws {T}` (T and every class extending it, read off the thrown value's prototype chain
  by name, since the unit's realm is not lean's), any throw for a `@throws` without a type, an `asserts` predicate, a
  `never` return;
- the tests the pull request adds or changes that name the unit (`check.mjs --tests`, `pr.mjs` from the PR's own test
  files).

## The four records, and the claim each makes

| record | the claim | what it never claims |
|---|---|---|
| `new:fault` | on this input, which every declared parameter type admits, the unit threw or its promise rejected; the throw is not one the declaration names; the call asked nothing of lean's world | that the unit is wrong to throw, that any caller passes the input |
| `new:shape` | on this input (admitted, the call closed) the unit returned a value that is not one of its declared return type | anything about an inferred return type, a `void` one, or a type lean reads as opaque |
| `new:test` | this test, which the PR adds and which names the unit, fails against the candidate under lean's model of the vitest and jest API, the run asking nothing of the world | that the test is right, or that it fails under the real runner with the real world |
| `new:coverage` | the unit could not be loaded, drawn or tested so as to make the claims above, and why | anything about the unit's behaviour |

Each record names its input (`args`, rendered before the call may write into it), the parameter whose edge value it
took (`edge`), `wide: true` on a fault whose input is admitted only because a parameter is `any` or `unknown` (true,
and often a validator's intended rejection), and the count of inputs that showed the same outcome. Faults are one record per error name and message
template (the message with what it quotes and its numbers taken out); shapes one record per kind of value returned
outside the type; at most five records per kind, the rest counted. The records ride in the certificate as
`newUnit: { declaration, records, tests }` (check.mjs), in the `pr.mjs` row as `records`, and in the markdown report as
the section "New units against their declarations".

## Why a declaration is a parent, and why the claims are sound

A parent answers "what was this code supposed to do": with a parent the answer is the old code, and lean checks the new
code does the same. Without one, the only statement of intent is what the author declared. A type signature is a
contract the compiler enforces at every call site: a caller can only pass values of the parameter types (absent a cast),
and the body promises a value of the return type. So a throw on an admitted input is a behaviour some well-typed caller
can reach, and a returned value outside the return type is a broken promise, both facts about the code as written.

Each claim is sound only if every link holds. The links, and the mechanism that holds each:

1. **The input is admitted.** `exec/declared.mjs member(spec, value)` is three-valued (`yes`, `no`, `unknown`), and a
   fault needs `yes` for every argument. It is `unknown`, never `yes`, wherever the spec does not settle membership: an
   opaque type (an unresolved import, a depth cut), a type parameter, a tuple whose length differs (optional and rest
   elements are not in the spec), a property behind an accessor (reading it would run code), a service or record whose
   methods the spec names only partly, a branded primitive or a template literal type (`string & {__brand}`,
   `` `id-${string}` ``: exec/spec.mjs marks them `narrowed`, some values of the primitive only). `any` and `unknown`
   at a parameter's top admit everything (`all`). The project's own `strictNullChecks` decides whether null and
   undefined are values of every type, and `exactOptionalPropertyTypes` whether a present undefined is an absent field.
   An overloaded unit is admitted through its overloads, which this reading does not take one at a time: it is coverage.
   The generator's draws wider than the declaration (an Error for an `instanceof` test, a thenable for a Promise
   parameter) fail `yes` and make no claim. `LEAN_BREAK=admitted-input` removes the check.
2. **The value returned is outside the type.** A shape needs `no`, the other side of the same three values: an
   `unknown` claims nothing. The awaited value is read against `Promise<T>`'s T only when the unit returned a promise and
   the declaration says Promise; a rendered JSX element (lean's representation, not React's value) is never read.
   `LEAN_BREAK=declared-shape` removes the check.
3. **The call asked the world nothing.** lean's fakes answer every outside request with a handle, and a handle can be
   tested without a trap (`if (flag)`, `typeof window`), so an empty trace alone is not enough. A call is closed when
   (a) the module graph links no package lean fakes, (b) its loading asked nothing (its trace is empty), (c) the call's
   own trace is empty (every fake read, call, clock read and random read is a trace entry), and (d) no module of the
   graph names a global the sandbox answers with a handle (`window`, `globalThis`, `process`, `fetch`, `document`, ...).
   A record of a call that is not closed would rest on lean's world model, not on the declaration. `LEAN_BREAK=closed-call`
   removes the check.
4. **The throw is the unit's.** A throw the declaration names is its declared behaviour (`LEAN_BREAK=declared-throws`
   reads the tags no more). A `ReferenceError` for a global Node holds and the sandbox does not is lean's gap: coverage.
   A timeout, a budget, a stack overflow is the harness's: the unit's result is ASK with what was found before it.
5. **A test's failure is the code's.** The test file is loaded by the unit's own loader in the same sandbox, with lean's
   runner model for `vitest`, `@jest/globals`, `bun:test`, `node:test` and `node:assert` (exec/new-tests.mjs). A file that
   replaces a module, a global or the clock (`vi.mock`, `jest.spyOn`, `vi.useFakeTimers`, ...) is coverage before it
   loads; a matcher or runner feature the model does not hold raises a gap and is coverage, never a failure; a test that
   does not settle within its bound is coverage. A file's tests run in order, sharing its module state as the runners do;
   once anything (the load, a hook, an earlier test) reached the world, every later failure is coverage. Only a test
   whose own body, a hook around it, or a helper of the file it reaches names the unit's import is reported.
   Equality is the runners' (toEqual ignores undefined members, toStrictEqual counts them and the class) and realm-blind
   (tags, not constructors), so a value made in the sandbox is not unequal for being made there.
   `LEAN_BREAK=pr-tests` stops running the tests; `LEAN_BREAK=closed-test` drops the world check.

## The draw

Lane B's generator draws boundary values first (exec/gen.mjs). A declaration admits more than the unit's own literals
suggest, and the values that break code written without a parent are the ones the type admits and the author did not
think of: the absent value (an optional parameter, a `| undefined`), the empty one (`''`, `[]`, `{}`), zero and the
special numbers (`-0`, `NaN`, the infinities, `2^53`, `Number.MIN_VALUE`), and malformed text (whitespace only, a lone
surrogate, NUL, a truncated percent-encoding, truncated JSON, `NaN`/`-0`/`1e999` as text, a very long string), a
record with its optional fields absent and each field at its edges. `edgePlan` gives one parameter at a time each of its
edge values, kept only where `member` says `yes`, the parameters taking turns; the edge inputs come first and take at
most half of the inputs, the generator's draws the rest (each edge input keeps the generator's draw for the other
parameters). `encodeURIComponent` on a lone surrogate is the pair's case: the generator never draws one
(`LEAN_BREAK=declared-edges`).

## pr.mjs

A unit of an added file runs through `check()` with no parent, so lane B reads it candidate-only and the row is `NEW`
with its records (its lint findings, an equality question, do not refuse it). The PR's test files (added or changed,
`*.test.*`, `*.spec.*`, `__tests__/`) are handed to every unit no parent holds, read at their checkout path when that
path holds the head's bytes, so their relative imports resolve to the candidate; a test whose import resolves to a file
whose bytes are not the candidate's names no unit. The rows' cache key includes the tests' text.

## Tests

`tests/pairs/new_unit_fault`, `new_unit_shape`, `new_unit_test` (candidate-only rows with `records` and `absent` in
expect.json, read by tests/run.mjs), and `tests/w1h-new-units.mjs [--break]`: every pair green; under `--break` each of
the seven mechanisms turns its pair red. Each pair was red before the mechanism existed (the result file). A break is a
change outside the mechanism's own input: the pair's unit and its input stay the same, the switched-off reading of the
declaration is the only difference (A1, A6).

## Limits

- A record is about the declaration, not about callers: a declaration may admit inputs no caller passes. DA's requester
  renders the claim beside the record.
- The closed-call rule is coarse: a file that imports any package lean fakes gets no record, though a unit may never
  touch the import. A static reach (the unit's free names, through the file's functions, to the imports) would widen it.
- The runner model holds the matchers the census roots' tests use (toBe, toEqual, toContain, toBeGreaterThan, toBeNull,
  toHaveLength, toBeCloseTo, toMatch, toThrow, ...), not snapshots, spies or mocks: those are coverage.
- A unit's own JSDoc prose (`@param x must be non-empty`) is not read: only types and `@throws` types are.
