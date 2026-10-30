# top-blockers: the five largest construct buckets of the lean-v3 backlog

The backlog (`round7/lean-v3/improvements/BACKLOG.md`, 39 repositories, 23359 files) ranks construct buckets by the
files they block. This file holds one dated section per bucket of the top five: what lean read at `f3cb5b41`, what
changed, and the pair that shows it. Each probe ran the lint, `check.mjs` or `tests/run.mjs --pair` in this worktree.

## 2026-10-30 class-and-this: a call on an opaque value, then a read

**Ask.** The readers' most frequent sentence: "an external method call on an opaque parameter is a world transition
with no mutation claim". Their examples are event handlers: `e.preventDefault()` in a React handler, then a later
read. Lint finding today: `opaque-mutation`, `.preventDefault() on e may change it, and e is read later`.

**Finding at f3cb5b41.** The guard compares the receiver by its text and scans the whole unit for a later
`<same text>.field`. It refuses too much: in `ChatPanel.tsx` (blocks) the later `e.key` belongs to another arrow's own
`e`. It also misses real cases, and lane A then proves programs that JavaScript tells apart
(`design/opaque-receiver/`, rows in `rows-f3cb5b41.txt`):

| unit | parent | candidate | lane A | lane B |
|---|---|---|---|---|
| aliased | `const f = e; e.preventDefault(); return f.defaultPrevented` | the read moved before the call | proved | WITNESS |
| otherAny | `e.bump(); return g.x` (e, g any) | the read moved before the call | proved | WITNESS |
| typedAlias | `e.bump(); return p.x` (p a record) | the read moved before the call | proved | PASS-bounded |
| passed | `f(p); return p.x` (f a function parameter) | the read moved before the call | proved | PASS-bounded |

JavaScript can tell each of these pairs apart. Pass the same object as `e` and `g`, or as `e` and `p`, or pass an `f`
that writes `q.x`. SEMANTICS.md says equality observes "every object reachable from the arguments and the receiver
before the call, field by field after the call", aliases included. Lane A reads a field after a call as the value
it had before the call. Lane B gives PASS-bounded on the last two because it never makes two parameters one object,
and its fake functions never write their arguments.

**Why no reading today.** Admitting more calls on opaque values, which is what the readers ask for, would make this
gap wider. A tighter text guard cannot close it either: any value of an object type may share an object with the
receiver. The rule a sound reading needs:

- After a transition (a method call on an opaque or record value, or a call of a function value or an external with
  an object argument), every field read of an object the transition may reach is a world read.
- That means `ext_read_<field>(world, value)` after the transition, ordered like any other transition. A read moved
  across the call then changes the order of transitions, and the proof fails.
- The objects the transition may reach are its receiver, its arguments, and any value whose type can share an object
  with them. A record or `any` parameter shares one with any other record or `any` parameter.
- After that change, the `opaque-mutation` guard is no longer needed. Lane B then needs inputs where two parameters are
  one object (exec/korat.mjs already pools objects per shape, but not across an `any` and a record), and fakes for
  function parameters that write their arguments.

Estimated work: more than 90 minutes. It changes the read model in translate.mjs, used by every field read, and every
pair whose units read a field after a call.

## 2026-10-30 type-system: a parameter of a type the checkout cannot resolve

**Ask.** "treat an unresolved external type name as an opaque type"; "KeyboardEvent is a DOM type from an ambient
global". The names: type-only imports from external or unresolved packages (60, 53, 44, 25, 24 files).

**Finding at f3cb5b41.** The lint reports these names as `unresolved-module`, an environment finding (`env: true`).
The translator and the gate already filter that finding out. The parameter is typed `any` and read as the opaque
`Any`, as the implicit-any policy reads an untyped parameter (design/implicit-any-policy.md). `check.mjs` proves
`f(x: Foo, n) { return n + 1 }` against `1 + n` with `Foo` from a missing package. The gap was the doubles lane:
`smt-fp.mjs` refused every unit with a parameter that is not a number, boolean, string or record. A number-bearing
handler such as `(e: React.KeyboardEvent, n) => n * 2` against `n + n` stayed ASK doubles-unknown.

**Reading.** Such a parameter is now `Unread` (translate/smt-fp.mjs, encodeUnit). It has no symbol in the query and no
entry in the environment. A read of it anywhere, in the unit or in a callee it is passed to, refuses the unit with
"a read of a parameter that is not a number, boolean, string or record". A term that never names the parameter is the
same function for every value of it. The parameter lists must still be equal on both sides, sorts included. On sat,
the replay passes `undefined` for it, which the unit never reads.

**Pair** `blocker_unresolved_type`. Before: `Equal_key_score proved` FAIL and `Equal_negated proved` FAIL (ASK
doubles-unknown). After: all 9 rows pass. keyScore and negated are proved, shifted is a doubles witness, enterOnly reads
`e.key` and is refused by the doubles lane, and lane B witnesses it.

## 2026-10-30 callbacks-function-values: an optional call on a captured callback

**Ask.** "a rule for optional calls f?.() that translates to a null test then a call". The top names are optional calls
on a callback prop or a possibly undefined function value (13, 10, 8, 6 files).

**Finding at f3cb5b41.** `p.onClick?.(n)` and `onDone?.(n)` in the unit's own body were already admitted. The same call
inside a callback was refused: `xs.forEach((x) => { onDone?.(x); })`, `setTimeout(() => { onClear?.(); }, 0)`, or a
handler passed to a registration. The lint said "an optional call reads a local function value". The callback is a
unit of its own (design/callback-units.md), and its captured bindings are its inputs, so the plain call `onDone(x)`
was admitted there. `optionalCallShape` (lower.mjs) reads locality through common.mjs `originOf`, which does not know
callback inputs, and called the capture `module-mutable`.

**Reading.** When the callee of an optional call is an immutable captured input of the callback unit, the lint and
the translator give `optionalCallShape` the function that declares it as the scope to read locality against
(`optionalScope`, lint.mjs and translate.mjs). The callee is then `local`, and the translator reads it as the
callback's own input: `var oc := onItem; if oc.Some? then invoke(world, oc.value, x)`. That is the reading the unit's
own body already had. A mutable capture stays refused (`captured-mutable`). A function field of a captured record
(`p.onDone?.(n)` inside a callback) stays refused too ("reads a function field of a record held in a local or a
parameter"); that one goes through the record path of optionalCallShape and is not changed here.

**A second blocker, in spec/theorem.py.** No unit with a function-typed parameter can be proved today.
`split_top` (spec/theorem.py:104) counts the `>` of the Dafny arrow `->` as a closing bracket, so every parameter
after a function-typed one is glued to it. The lemma then calls the function with too few arguments, and Dafny does
not resolve it (ASK translation-defect). An unchanged `xs.forEach((x) => { onItem(x); })` fails this way too. The fix
is one line, in a file this lane does not own:

    -    for ch in s:
    +    for i, ch in enumerate(s):
             if ch in '(<[{':
                 depth += 1
    -        elif ch in ')>]}':
    +        elif ch in ')>]}' and not (ch == '>' and i > 0 and s[i - 1] == '-'):

**Pair** `blocker_optional_callback`. Before: the lint refused parent.ts, so no theorem was generated. After, with the
theorem.py fix applied locally and then reverted: `Equal_notify_all`, `Equal_notify_named` and `Equal_notify_later`
proved, notifyNext not proved, and lane B rows as expected (9 of 9). Without the fix, the three proof rows fail with
the arity error. The pair is red until that line is merged.

## 2026-10-30 async-await: awaited port calls and a handed async arrow

**Ask.** "Accept async callbacks passed to an external as a lambda whose awaited calls are modelled as uninterpreted
externals sequenced in source order". The top names are an async function with awaited port calls (147 files) and an
async arrow passed to an external registration (58, 23, 22 files).

**Finding at f3cb5b41.** Both are already read. Each `await` of a port call is a world transition, in source order.
An async arrow handed to an outside call is an opaque value keyed by its text, so a change inside it is not proved and
lane B sees the registered value. The bucket's examples in blocks (FileTree.tsx `handleDrop`) are blocked by the
class-and-this cause above: `e.preventDefault()` and then `e.dataTransfer`. `top-level await` and `for await` at module
scope are outside by design (toplevel-effect).

**Pair** `blocker_async_port`. It records the reading. All 9 rows pass before and after this lane's changes: bump and
guarded are proved, copyBoth (two loads swapped) and wire (x + 1 against x + 2 inside the handed arrow) are not proved,
and lane B witnesses both.

## 2026-10-30 imports-externals: import.meta properties and barrels

**Ask.** The top names are re-export barrels (`export * from`, 92, 51, 43, 21 files), `import.meta` property access (49
files), and unresolved external modules.

**Finding at f3cb5b41.** A barrel (`export * from './x'`, `export { a as b } from './x'`) lints clean. It has no unit to
prove, so it blocks nothing in lean. An unresolved module is an environment finding already (type-system above).
`import.meta.url`, `dirname` and `filename` were refused as `ts-strict` TS2339, a defect of the code. The real cause is
that lib es2022 declares `ImportMeta` with no properties, and the host's types (`@types/node`, `vite/client`) are not
in the checkout.

**Reading.** ECMA-262 lets the host define the properties of `import.meta` (HostGetImportMetaProperties). TS2339 on a
property of `import.meta` is now an environment finding (`unresolved-module`, `env: true`), as an unresolved import is
(lint.mjs, the compiler-diagnostics loop). `import.meta.env` stays refused, because it is injected at build time. The
translator already reads `import.meta.x` as a world read, `global_read_import_meta_x(world)`, typed `Any` when its type
is unknown.

**Pair** `blocker_import_meta`. Before: the lint refused parent.ts, so no theorem was generated. After: all 7 rows pass.
`here` (the url converted to a string in a local first) and `folder` (dirname read, `n + 1` against `1 + n`) are proved.
`which` (filename in place of url) is witnessed by lane B. Lane A withholds that lemma, because its result is the
opaque value itself.
