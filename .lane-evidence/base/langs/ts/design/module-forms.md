# Module forms

JavaScript modules retain their bindings between calls. A const binding can still hold a
mutable Map, Set, array or object. Loading a module can execute code and return a shared
namespace or CommonJS export. Global properties can change between reads.

The current file is the logical module of a comparison, independent of the two input
filenames. Its state operations use `Module_file_get_counter` and
`Module_file_set_counter`; other modules remain outside handles. Declaration text is
part of the operation identity, so changing an initializer cannot silently alias a unit.
A scalar const literal is read as that literal; other primitive consts remain outside
constants. Module let/var and const collections are world fields. For example:

```dafny
var (wld, t0_) := ext_Module_file_get_counter_World(wld);
var (wld, t1_) := ext_Module_file_set_counter_World_int(wld, t0_ + 1);
```

The actual names also carry a declaration fingerprint. Even a mutable literal initializer
such as `let counter = 0` does not imply zero at entry: another unit may already have
changed it. The starting world is universally quantified, without an initial-state axiom.
Reads and writes are ordered transitions shared by all units in this logical module.
Collection method mutations are transitions on the world field; a later read sees the
next world. A local read-only snapshot permits exact Map has/get reasoning. An alias
that crosses an effect uses the existing opaque-block reading, rather than assuming the
snapshot cannot change. Optional global chains, global object aliases and deferred
module reads also use the opaque unit. Defaults and lazy expressions with world reads
use that fallback where eager expression translation would change evaluation order. Writes through aliases and nested module objects stay refused.

`await import(spec)` and synchronous `require(spec)` load an opaque `Ext_Module` through
a transition. The result is boxed into the existing TypeScript-facing opaque/record type;
member reads are accessors and calls are transitions. A nonliteral specifier is an
argument to the transition: no resolution guess is needed. A changed specifier or member
cannot disappear from the generated expression. Shadowed require remains an ordinary
call. Awaiting require has its own transition, preserving thenable assimilation.
Bare require and reflective properties keep the existing refusal. An unawaited dynamic import keeps the existing async refusal where applicable.

Property and element reads rooted at globalThis, global, window or process are world
transitions, including process.env.X. The receiver and computed key are evaluated in
source order. Shadowed names are ordinary locals. Assignments to globals remain refused
by property-assign, index-assign or global-mutation; prototype access stays refused.

Effectful initializers of newly admitted let/var remain toplevel-effect. Existing const
initializers keep their outside-value fallback, to preserve prior admission. Module-level
executable statements remain toplevel-effect. No initializer is run by the proof lane.

Lane B runs module initializers in fresh sandboxes, real Map operations, and relative
handler modules. It observes counter changes through returned values and repeated
same-file calls, and process.env through the recording proxy. It does not currently
observe every hidden module write or generate arbitrary historical module state; the
world-quantified proof covers more entry states than the bounded sandbox.

The pair binds a numeric Map once on each side before has/get versus get/null-check.
Thus both sides make one identical world read and differ only in pure Map reasoning.
Counter increments, module member selection, and environment variable selection are
negative controls. Additional loader and global-read controls cover synchronous require,
computed environment keys, module state shared by units, and unchanged code.

Instances inspected (paths relative to the read-only census/bench roots):
- census/repos/nexus-linkedin-dashboard/lib/landing/postgres.ts:73: awaited import,
  admitted loader; callbacks and typed library shapes can use the opaque unit fallback.
- work/bench/nexus/tree/packages/cli/src/commands/skills.ts:13: require of JSON,
  admitted loader and member accessor.
- census/repos/nexus-learning/apps/web/lib/clock.ts:30: computed globalThis read,
  world read or opaque fallback for the cast; writes on lines 36 and 42 remain refused.
- work/bench/n8n/tree/packages/cli/src/databases/entities/User.ts:141: a property
  named global, not a global root; retains the existing reading.
- census/repos/nutshell/apps/desktop/main/src/start.ts:98: process.platform read,
  a world transition before the existing notification call.

## A module const that reads another

`const B = A + 1` was an outside constant keyed by B's own text, so a candidate that changed only `A` read the same
constant and proved a changed result equal (pair `module_const_deps`: `limit` returns 2 against 3). The key now covers
the same-file declarations the initializer reads (`iteratorProgram`), and an initializer of literals and such consts
under `+`, `-`, `*` is read as its value, so `UNIT * 3` against `3 * UNIT` proves. Lane B runs each side's module, a
WITNESS for `limit`.

