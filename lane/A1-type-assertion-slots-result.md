# A1-type-assertion-slots: result

## What was done and why

`design/type-assertions.md` named four slots where a held value (a value whose type an assertion, or an any or
unknown value, gave without a check) was refused because the slot's reading holds the declared Dafny type. Each now
gets the reading the note sketched. The decision is in `common.mjs` (one test for the lint and the translator);
`translate.mjs` emits it.

1. **A field of a literal.** A literal whose field holds a held value, or an any/unknown value where the field's type
   names another, is itself held. Its real type is its own record type, and each held field is read at its real type.
   The translator builds it as a datatype `Held_<hash>` (named by the real field types) with the held field `Any`.
   It reaches the declared type only where a held value is carried (the unit's result, an outside call), through one
   uninterpreted cast that both sides apply.
2. **A same-file callee's parameter.** The callee is read a second time for that call, with the parameters that get a
   held value read at Any. That reading is emitted as `<callee>_held_<i..>[_r]`.
3. **A call of a same-file unit whose result is held.** The same second reading. The call's result has its real type:
   the one held literal type every return gives, or else Any.
4. **A compound write to a local.** `t += v` is a write of `t + v`. When either operand is held, the local's real
   type is Any and the write uses the uninterpreted operator over Any (`+=`, `-=`, `*=`).

Soundness: in each slot the value keeps its real type, so every operation on it is the uninterpreted operation on
Any, and `v` and `v + 0` stay different terms. A conversion to the declared type happens only as a unit's own result
or into an outside call, where both sides apply the same uninterpreted function.

Still refused (reasons are in the design note):
- array elements, callback results and indexes;
- held spreads and destructurings of a held literal;
- field writes;
- literals with methods, accessors or computed keys;
- callees that are not plain leaves;
- arguments to a call on a local value that is not an import.

## Elements added

- `common.mjs`:
  - `heldLiteral`, `heldRecord`, `heldField`, `opaqueInTypedSlot`, `memberValue`: the held literal and its fields.
  - `heldVariantUnit`, `heldCall`, `withHeldParams`, `heldResultType`: the second reading of a callee for one call.
  - `heldOf` changes:
    - object literals;
    - field reads on a held literal;
    - calls read a second time;
    - compound writes;
    - parameters held under `withHeldParams`;
    - shorthand names read through the local's own symbol.
  - `writesOf`: compound writes count as writes.
  - `carried`: a literal field, a compound write to a local, and an argument to a callee read a second time.
  - `typeAssertion`: a held-result callee that can be read a second time is no longer refused.
- `translate.mjs`:
  - `recordType`: held fields at their real type, under the name `Held_…`.
  - `objectLit`: builds a held literal at its own type, then converts it through `convertToD`.
  - `heldCompound`: the compound write over Any.
  - `heldVariantCall`, with `variantMode` read by `emitUnit` and `retType`: emits the second reading of a callee and
    calls it.
- `lint.mjs`: not edited. It reads `typeAssertion`, so the rule now refuses only what stays refused.
- Pair `type_assertions`: eight rows, one must-prove and one must-witness per slot:
  - field: `fieldHeld` / `fieldBumped`;
  - callee parameter: `paramHeld` / `paramKept`;
  - held result: `resultHeld` / `resultBumped`;
  - compound write: `compoundHeld` / `compoundBumped`.

  `paramHeld`, `resultHeld` and `compoundHeld` are real-only, like the existing `twice`: the doubles reading does not
  encode Any. Those six rows return a template string, because a number read from Any may be the input object itself
  and the identity guard withholds such a result (as it does for `anyAs`).
- `design/type-assertions.md`: a section dated 2026-10-30.

## Numbers

Pair:
- Before: `node langs/ts/lint/lint.mjs langs/ts/tests/pairs/type_assertions/parent.ts` gives 8 violations
  (`type-assertion`, one per new parent unit). The translator then produces no parent file, so the pair fails at
  "theorem generated".
- After: `JOBS=4 node langs/ts/tests/run.mjs --pair type_assertions` gives 39 checks, ALL PASS.

Census: `NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs /root/da/census/repos/<root> --out
lane/census-<root>-{before,after}.json`. Before was run on a detached worktree at 6421be639; after on the lane head.

| tree | type-assertion before | after | entered before | after |
|---|---:|---:|---:|---:|
| agent-nexus | 193 | 189 | 1,635 | 1,643 |
| blocks | 17 | 18 | 247 | 247 |
| apps-ui | 169 | 162 | 861 | 860 |

Per-unit changes:
- **blocks +1:** a unit already refused (`callback-units`) now has `type-assertion` as its first refusal. No unit left
  the entered set.
- **apps-ui `GalleryView`, entered → refused:** this is the shorthand hole being closed. Before, a held local in a
  shorthand field was silently converted to the field's declared type. Its callee returns such a literal.
- **agent-nexus `bundle-delta.ts renderSettings/keys.filter()#0`, entered → refused:** a precision loss.
  `parseSettings` returns two different literals and `null`, so its held result is read as Any. That makes `b.rest`
  opaque, even though its type is right.

Why the overall fall is small: in agent-nexus, 500 of the 600 refused nodes were literal fields. Most of those
literals are passed to a method of a local made by an imported factory (`client.x.y({ ... })`). The literal is now
held, but the refusal moves up to that call argument, which `importRooted` does not carry. After the change, 180
refused nodes in agent-nexus are such call arguments. Carrying a held value into a callee declared outside the file
(and not a library reading's) is the next lever. It is outside these four slots and left for a follow-up.

## Defects met

- **`translate/faithful.mjs` (the doubles lane; not edited, reported to the lead).** `isNum` uses the checker's
  type, not `assertionHeld`. So `(x as number) + 1` with `x: any` becomes the commutative `Math.__lean_add`, and
  lane A reads `1 + (x as number)` as the same term, where JavaScript gives "a1" and "1a". Lane B witnesses it, so
  `check.mjs` answers WITNESS. The lane A reading is still wrong. The fix: `isNum` reads
  `assertionHeld(checker, n) ?? type`.
- **Shorthand members (fixed here).** A held local in `{ n }` was invisible to `assertionHeld`, because the shorthand
  name resolves to the property's symbol.
- **Stack overflow (fixed before the final census).** The first after-census overflowed the stack on three files. A
  write cycle through a call (`x = f(x)`) re-entered `heldCall` with a fresh `seen` map. The caller's map is now
  threaded through `heldCall`, `heldRecord` and `heldField`.
- **Pre-existing failures, identical on the base worktree at 6421be639:**
  - `any_equality`: lane B `selfEq` and `switchSelf` give WITNESS where PASS-bounded is expected.
  - `void_promise`: the candidate is refused with `copied-argument` at candidate.ts:57.

## Left

- The outside-call carry for a call on a local value that is not an import (the dominant remaining census pattern).
- A held result made of several different literals is read as Any. Its unheld fields could stay exact.
- The callee read a second time must be a leaf: no same-file calls, not effectful, not recursive.
- Elements, callback results and indexes still refuse.
- The `faithful.mjs` fix belongs to the doubles lane.
