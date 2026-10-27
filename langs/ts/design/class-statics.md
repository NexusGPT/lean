# Class statics: a static member of a same-file class

**Construct.** `C.m(x)`, `C.K` and `C.K = v` where `C` is a class declared at the top of the same file. The lint
resolved `C` as module state (`originOf` gives `module-mutable` for a class) and refused with `global-read`, although
a static method is already a unit (`classMethodUnits` names it `C.m`).

**JavaScript meaning.** A class declaration binds `C` once (TypeScript refuses `C = ...`). A static method is a function
on the constructor; `C.m(x)` calls it with `this` bound to `C`, `Sub.m(x)` with `this` bound to `Sub`. A static field is
a property of the constructor, set when the class is defined (fields in order, then static blocks); any code holding
`C` may write it later.

**Reading.**
- `C.m(x)`, an own static method: the unit `C.m`, called as a top-level unit is (argument count and async checks too).
- `C.K`, an own static field, is a module cell of its declaration, as a module `let` is. A world cell
  (`Module_file_get/set_C_K_<hash>`) when the file writes it (`=`, `+=`, `-=`, `*=`, `++`, `--` statements, `this.K = v`
  in a static member, a mutator on it), when it holds an object, or when it is not readonly and outside code may reach
  the class (exported, or its name used as a value). Otherwise a constant: its literal, else a bodiless constant keyed
  by the declaration and its same-file dependencies (`iteratorProgram`).
- A static method whose body names `this` or `super` is one opaque transition keyed by the file's text, as a static
  accessor naming `this` already was: `this` is whichever class the call went through.

From the pair `tests/pairs/class_statics`, `Pricing.calls = Pricing.calls + n; return Pricing.calls;`:

    var (wld, t0_) := ext_Module_file_get_Pricing_calls_1wc0124_World(wld);
    var (wld, t1_) := ext_Module_file_set_Pricing_calls_1wc0124_World_int(wld, t0_ + n);
    var (wld, t2_) := ext_Module_file_get_Pricing_calls_1wc0124_World(wld);
    (wld, t2_)

and `n * Pricing.RATE` with `static readonly RATE = 3` is `(n * 3)`. A static cell joins `moduleUnitShape` (an object
cell aliased across an effect takes the opaque module reading) and an opaque loop block's identity.

**Stays refused.** A static method as a value, a function-valued field, an in-place mutator on a static as a value
(`global-read`; as a statement `param-mutation`); an inherited static (`Sub.twice()`, `global-read`); every static of a
class with a static block (`global-read`: the block sets statics on import, outside every unit); a member read through
`this.constructor`, casts included (`prototype`; `.name` and passing it on stay admitted as before); `this` in a static
method with a destructured parameter (`static-this`, new: the opaque reading names each parameter); a write to a
static of another file's class (`property-assign`); static accessors and `#` statics. Escapes: `fixtures/escapes/ts/
class_statics_*.ts`.

**Soundness.** (1) A constant read twice around an outside call that writes the field would prove a reorder equal; the
constant reading is used only when no code can write the field, and the probe `Box.peek` (read, call, return against
call, read) is not proved for a world cell. (2) A constant keyed by its own text would hide a changed dependency
(`static readonly base = Box.size * 2`); the key covers same-file declarations (`Box.deep`, not proved). (3) `this.g()`
in a static method was read as `C.g()` before this lane, which differs through a subclass that overrides `g`, and
`this.n` emitted an unresolved `self`; the opaque reading proves `A.f` only against an identical file. (4) A member read
through `this.constructor` was an uninterpreted read with no world; with static writes admitted it could miss a write,
so it is refused. (5) A static block changes an initial value without changing the declaration; such classes stay out.

**Lint.** `sameFileStatic`, `staticFieldRead`, `staticThis`; advice `static-this` conditional (no call through a subclass).

**Lane B.** `exec/run.mjs` finds `Pricing.fee` and the other static units (no change in `exec/`): `Pricing.fee` WITNESS
(420: 1261 against 1681); `Pricing.total`, `Pricing.track`, `Pricing.describe`, `quote` PASS-bounded at n 30.

**Instances** (`units.jsonl`, refused by `global-read:same-file-class` alone; entered = inside the subset after):
- nexus `_common/services/resource-sync-bridge.service.ts:96` `ResourceSyncBridge.handlePlatformEvent`: enters.
- nexus `_common/validators/email.validator.ts:45` `EmailValidator.isValid` (`EmailValidator.validate(email)`): enters.
- langchainjs `langchain-classic/src/agents/chat/index.ts:157` `ChatAgent.fromLLMAndTools`: enters.
- nexus `live-durable-stream-producer.ts:227` `markTurnSettled`: out, `noopSink` is a function-valued static field.
- langchainjs `agents/openai_functions/index.ts:163` `OpenAIAgent.validateTools`: out, inherited from another class.
