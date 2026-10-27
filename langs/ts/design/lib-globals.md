# Lib globals: a name the lib or an @types package declares is a world read

The construct: a global name the program does not declare, outside the tables the lint already reads (`console`,
`Math`, `JSON`, `Date`, `process`, `window`, `document` and the rest of `EFFECT_WORLD` and `PURE_GLOBALS`):
`navigator.language`, `location.href`, `getComputedStyle(el)`, `AbortSignal.timeout(ms)`, `btoa(s)`, `confirm(m)`,
`__dirname`, `Uint8Array.BYTES_PER_ELEMENT`. JavaScript resolves the name on the global object of the realm the code
runs in: its value is whatever the host put there at that moment. A browser, a worker, Node and a test runner put
different things there, or nothing (`typeof navigator` is `"undefined"` in a Node without a navigator global), and a property such as
`navigator.onLine` or `location.href` changes while the program runs.

## The reading

`libGlobalRoot` (`lint/lint.mjs`) is the one test both lanes use: the identifier resolves to a global, every
declaration of it is a global declaration (a script's top level or `declare global`) in a default lib file or an
@types package, at least one of them a value, and the name is not one with its own reading, not `require`.

- a read of the name is `global_read_<name>(world)`; a property or element path rooted at it is the existing
  `global_get_` transition on `global_handle_<name>` and the key, the reading `window` and `globalThis` have;
- `typeof <name>` is `global_typeof_<name>(world)`: whether the global exists is a fact of the world, never of its
  declaration (the lib declares `navigator`, the realm may not hold it);
- a call `btoa(s)` or `AbortSignal.timeout(ms)` stays a transition; `new` and `x instanceof Response` keep their
  readings; a name in a type is not a read.

For `if (typeof navigator === 'undefined') return 'en'; return navigator.language;` (pair unit `language`):

    var (wld, t2_) := ext_global_typeof_navigator_World(wld);
    if t2_ == "undefined" then (wld, "en")
    else (var (wld, t3_) := ext_global_get_string_World_Any_string(wld, ext_global_handle_navigator(), "language"); (wld, t3_))

## What stays refused

- a write into a lib global (`location.href = url`: `property-assign`; `name = v`: `global-mutation`); lane B's
  sandbox would not observe it (escape `fixtures/escapes/ts/lib_global_write.ts`);
- a global no lib or @types package declares (a build-time define, a `declare` in the project's own .d.ts):
  `global-read`; it has no lib meaning to trust (escape `lib_global_undeclared.ts`); `require` keeps its reading.

## Soundness

- A value that changes: a read is a transition on the world, so a read moved past a call is another order of
  transitions (pair `visit`, not proved), and two reads around an await are two reads, never one value.
- Presence: dropping `typeof navigator !== 'undefined'` drops a world read (pair `guardedLanguage`, not proved); two
  globals are two handles (`Uint8Array` against `Int16Array`, pair `byteWidth`, not proved).
- Inherited, not new: a member of an opaque value a transition returned (`getComputedStyle(el).width`) is the existing
  pure accessor of that value; a presence test below the root (`typeof navigator.clipboard`) is read through the
  lib's declared type, as every outside value's declared type is trusted; a synchronous throw of a call
  (`btoa("é")`) is not on the fault channel, as for every outside call.

## Lane B

The sandbox (`exec/run.mjs`) gives the ECMAScript intrinsics of its context (`Uint8Array`, `escape`) and no DOM or
Node host names: `typeof navigator` is `"undefined"` and a read throws ReferenceError on both sides. The pair's DOM
units are WITNESS where the two sides differ in that absent world (`guardedLanguage`, `visit` through the console
trace) and PASS-bounded otherwise; a recording fake per host name is an exec change outside this lane.

## Instances (`architecture/estate-coverage/units.jsonl`, refused by global-read alone)

- nexus `apps/frontend/src/common/components/Chat/AskUserQuestion/getAuqHintItems.ts:11` `navigator`
- nexus `apps/frontend/src/modules/EmbedChat/utils/cssVariableValidator.ts:68` `getComputedStyle`
- nexus `apps/backend/src/admin-agent/infrastructure/controllers/admin-agent-proposals.controller.ts:53` `AbortSignal`
- nutshell `modules/chat/src/timeline/timeline-cursor.ts:49` `btoa`
- langchainjs `libs/langchain-core/src/messages/content/data.ts:372` `Uint8Array`
