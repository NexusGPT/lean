# A same-file reference is named by the code it reaches

The construct: four places where lane A reads a reference to code of this file as one bodiless function both sides
share, named by the reference's text: a module constant holding a function value, called by name or passed by name as a
callback (`call_args_<name>`); a module cell, a constant whose initializer calls a same-file function
(`Module_file_get_<name>_<hash of the declaration's text>`); a tagged template whose tag is a same-file function
(`tag_<tag text>_<n>`); and `instanceof` (`instanceof_<right text>`). A shared bodiless function is sound only when the
JavaScript value at that place is the same function of its arguments on both sides (design/proof-hunt.md, "The rule
behind a shared unknown"). The text leaves out the code the reference runs, so a changed callee, initializer argument,
tag body or class heritage proved equal: proof-hunt classes 7, 9, 11 and 12 (`scaled`, `applied`, `cfgX`, `tagged`,
`isBase`, each proved on 9d6229a while lane B witnessed).

## JavaScript meaning

Calling `scale(x)` runs the function object `scale` holds, which its initializer built (ECMA-262 10.2.1: a call runs the
callee's body with its captured environment), so its behaviour is the initializer and every function that initializer
and the built closure run. A module cell's first value is its initializer's result (16.2.1.6.4, the module is evaluated
once). A tagged template calls the tag (13.3.11). `v instanceof C` reads `C[Symbol.hasInstance]` or walks `v`'s
prototype chain for `C.prototype` (13.10.2, 7.3.22): the answer depends on `C` and its heritage and on the class that
made `v`.

## The reading

Each name carries the reach of the reference (`langs/ts/reach.mjs`, design/hash-keys.md): the texts of every
declaration evaluating it can execute (the binding's declaration with its initializer, the functions it calls, a class
with its base chain, decorators and members) and the code a value it touches may carry out (every class of this file the
value may be an instance of, by assignability). Two additions to reach.mjs: `reachOf.reachesFile(node)`, whether the
reference reaches any code of this file; `reachOf.keyText(node)`, the reach texts joined. The translator appends
`_<hash of keyText>` at the four sites when `reachesFile` holds:

- `namedStepCall` (a named callback) and `externalCall` (a direct call): `call_args_scale_<reach of scale>`;
- `moduleAccessor`: `Module_file_get_CFG_<reach of the declaration statement>`, one key for its get and its set;
- the tagged template: `tag_tag_<reach of the tag expression>_1`;
- `instanceof`: `instanceof_Base_<reach of the whole test>`, so the right's class and every class the left may be;
- `promiseHandlerBody` (a named `.then` handler): `call_args_<name>_<reach>`; the lint routes only a unit, an import or
  another file's function there, so a module constant (`.then(scale)`) never reaches it: the translator refuses it
  ("scale is a function value; call it", translate.mjs:1379), so it cannot prove;
- `numericKey` (an opaque numeric unit that reads module state) was the whole file's text: now the unit's reach, so an
  edit elsewhere in the file keeps its proof.

An import, a global or a local reaches no file code, so its name is unchanged (`sql\`...\``, `e instanceof Error` in a
file without classes): an edit to the import line does not cost a proof.

```dafny
// parent: const scale = makeScale(2)                    // candidate: makeScale(3)
var (wld, t0_) := ext_call_args_scale_1xe1sib_World_int(wld, x);   // ext_call_args_scale_1diztle_World_int
(wld, ext_instanceof_Base_17c3p4w_Any(b))                          // ext_instanceof_Base_122q1vk_Any: Child's heritage changed
```

## Soundness

The key must change whenever code the reference can run changes, and an unrelated edit must leave it. The reach is the
closure hash-keys.md argues for, plus the carried classes. Cases considered: the initializer's argument changes
(`makeScale(2)` to `makeScale(3)`: the declaration's text is in the reach); the closure's maker changes (`makeScale` is
reached from the initializer); a cell's initializer calls a changed `make` (reached); a tag's body changes (reached); a
class the left of `instanceof` may be an instance of drops its `extends` (the left typed `object` carries every class,
each with its heritage clause in its text, `headerOf`); `static [Symbol.hasInstance]` changes (a member of the reached
class). A `let` binding keeps the module-forms reading: its start state is the quantified world, the key adds the
initializer's reach. What stays coarse: an `instanceof` whose left is `unknown` or `object` keys on every class of the
file, so a member edit of any class costs that proof (sound, wider than the prototype chain alone). The constant key
`<name>_<iteratorProgram>` already covers its initializer (probed: a changed `Counter.next` gives two keys).

## Lint and lane B

The lint is unchanged: nothing new is admitted or refused, so no escape fixture. Lane B runs both modules: `scaled`,
`applied`, `cfgX`, `tagged`, `isBase` are WITNESS on its typed inputs; the unreachable-change units are PASS-bounded.

## Measurement

Pair `reach_keys` (17 units): on 9d6229a lane A proved the five must-not-prove units `scaled`, `applied`, `cfgX`,
`tagged`, `isBase`; now none is proved, and `shifted`, `moved`, `optsY`, `marked`, `isShape` (no changed code reached)
and `ratio` (`x / count`, numeric opaque: two keys on 9d6229a, one now) are proved. TOTAL line: the lane report.

Instances (census repos): `nexus-automations/scripts/seed-changelog.ts:56` `const rand = rng(...)`,
called by `chance` and `between` (enters: `call_args_rand_<reach>`); `langchainjs/libs/langchain-core/src/testing/
matchers.ts:118` `toBeHumanMessage = makeMessageTypeMatcher(...)` (enters the same way); `nexus-linkedin-dashboard/lib/
landing/postgres.ts:35` `e instanceof LandingWriteRefused`, a same-file class (enters: keyed by its reach);
`nexus-learning/packages/cli/src/errors.ts:393` `instanceof CliError` (enters); `nexus-learning/packages/content/src/
cli.ts:90` `instanceof UsageError` (enters); `linear-status-page/src/graphql/queries.ts:3` `gql\`...\`` (an import:
the name is unchanged). No same-file tag function (`TemplateStringsArray` parameter) appears in the census sources.
