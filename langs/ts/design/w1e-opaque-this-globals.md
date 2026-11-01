# W1e: `this`, globals and the error-typed value read, not refused (2026-11-01)

Lane w1e of the opacity ladder (briefs/da-v4/w1-opacity.md). The rules: `this`, `implicit-this`, `static-this`, `class`,
`inheritance`, `global-read`, `global-mutation`, `toplevel-state`, `toplevel-effect`, `react-handler-capture`,
`hook-order`, `render-impure`, and the `ts-strict` and environment slots where a value's type is the checker's error
type. The census (R6, 39 roots) stopped 928 units on `ts-strict`, 488 on `this`, 214 on `global-read`, 77 on
`toplevel-effect` and under 50 on the rest; beside them, every unit reaching a name the checkout does not declare was set
aside as environment-blocked.

The workstream's tool is the opaque step (an uninterpreted world transition keyed by the construct's text). Measuring
what these rules stop showed that most of them refuse a construct lean already has a reading for; the refusal was a
gate left behind by an older reading, or a value no reading named. Each fix below restores an existing reading's reach;
none is an opaque step over source text, so the shared helper (translate/opaque.mjs, lane w1a) is not needed for them.

## 1. The lexical receiver (`this`)

An arrow function has no `this` of its own (ECMA-262 10.2.1: an arrow's `[[ThisMode]]` is lexical): it reads the `this`
of the nearest enclosing function that is not an arrow. A callback unit (design/callback-units.md) under an instance
member of a class is therefore read with the member's receiver, a binding that is never reassigned. common.mjs
`lexicalClass` already gave such a callback the class (`cls`) and the translator already read it with the member's
`self`; the lint alone checked the callback with no class (`currentClass = null`) and refused `this` outside a class
method. The census found 488 units so refused, the commonest shape `xs.map((x) => this.f(x))` in a method.

- `receiverScope` walks out through every arrow between the callback and the member, so a callback inside a callback
  (`xs.map((x) => ys.map((y) => this.f(x, y)))`) reads the same receiver.
- The lint checks the callback's `this` against that class (lint.mjs, the callback-unit loop).
- Soundness: the receiver is a captured input that never changes, exactly as a captured `const` is
  (callbackEnvironment); the callback's lemma quantifies over it. A static member's arrow reads the class the call
  named (a subclass too): still refused, as `static-this` is. A function expression binds its own `this`: still refused.

## 2. A member of an incomplete type (`ts-strict` TS2339/2551)

A class or interface whose declaration reaches the error type (a base from a module that does not resolve:
`class PrismaService extends PrismaClient` with the client not generated) has members the checker cannot list. A
member it does not find is unknown, not absent. library-rows.mjs `incompleteType` already reads such a member as the
accessor of the opaque value (rule `unsupported-member` admits it on the read path); the compiler's TS2339 on the same
read still refused it `ts-strict`. The lint now drops that diagnostic under the same condition the member check uses:
the receiver's type is incomplete, the access is not on a write path, and no unit around it writes through an
incomplete value (`writesThroughIncomplete`). A write keeps the error (escape `incomplete_base_write.ts`).

## 3. A global the checkout does not declare (`global-read`, the environment)

A global the lib or an @types package declares is read from the world (design/lib-globals.md): `global_read_<name>`,
a path rooted at it `global_get_` on `global_handle_<name>`, a call a transition. Without the declarations installed
(`console` without the dom lib, `process` and `Buffer` without @types/node, `chrome` without @types/chrome) the same name
has the checker's error type. It was either refused (`chrome`: global-read, cannot be resolved) or, for the names with
a reading of their own (`console`, `process`), passed the lint and was written by the translator as a bare Dafny
identifier, a resolution error that fails the whole file's theorem.

lint.mjs `unresolvedGlobal` names such a read: an identifier in value position with no symbol and the error type.
`libGlobalRoot` answers yes for it, so it takes the lib-globals reading at the opaque type Any: the world value keyed by
its name. Soundness: a global's value is the environment's; the reading assumes nothing of it (every member an
uninterpreted accessor or transition, every read a world read in order), which is weaker than what the lib reading
assumes when the name resolves. Installing the declarations only gives the value a type. `eval`, `Function`, `Reflect`,
`Proxy` keep their refusals; `require` keeps its loader reading.

## 4. The census: an environment handle grades its unit

The lint marks an `unresolved-module` finding `handle: true` when its name is read as an opaque handle: an unresolved
global in value position (section 3), or a type name in a type annotation whose type is the error type (read as the
opaque type Any, as tests/pairs/blocker_unresolved_type already shows). The finding stays an environment finding,
reported as before. The census no longer sets its unit aside: the unit's lowering (lint, readings, and the translator's
emission) decides it, and `environment.handles` counts the units reading a handle and those of them entered. A name in
a heritage clause (an unknown base) or anywhere else keeps the unit environment-blocked, as does a refusal judged on an
error-typed value (`unresolvedTypes`).

## 5. A module let with an effectful initializer (`toplevel-effect`)

A module `let`/`var` is a world field whose value at entry is the world's (design/module-forms.md: the starting world is
quantified, with no initial-state axiom), keyed by its declaration text, so a changed initializer is another field. The
reading never uses the initializer, effectful or not; the refusal of a unit that reads or writes a field with an
effectful initializer guarded nothing. It is lifted; the initializer's load-time effect stays the module's
(`toplevel-effect` at module level, the module unit of lane w1f).

## What stays refused, by design

`super` as a value (`none`), a static member's `this`/`super` with a destructured parameter, a function expression's
own `this`, an anonymous class, global assignment, module state binding patterns, executable module statements, the
React rules (hook order, render purity, handler captures). The React rules are Rules of React findings: their readings
(hook slots, handler descriptors) depend on the order and purity they state.

## The breaks

`LEAN_BREAK=<mechanism>` switches one mechanism off: `lexical-this`, `incomplete-member`, `unresolved-global`,
`environment-handle`, `effectful-cell`. `node langs/ts/tests/w1e-opaque-this-globals.mjs --break` runs each pair with its
mechanism off and fails unless the pair goes red.

## Measurement

See lane/w1e-opaque-this-globals-result.md for every number and its command.
