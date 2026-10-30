# A2-ts-strict-at-any: result

## What was done and why

Strict mode stays forced. A strict-mode error about a value now means one thing to the proof: the code used that value
as a type the compiler could not confirm. So the value is read at the opaque `Any`, exactly as the type-assertion reading
already reads a value an `as` holds. The error stays visible as `ts-strict` advice with its code (`--advice`). It is no
longer a refusal.

There are three families (`common.mjs strictValue`). Each is decided from the diagnostic and the types, never from a name:

- **Possibly absent** (TS2531, 2532, 2533, 18047, 18048, 18049). The value held is the expression the error spans.
- **Assignability whose only cause is absence** (TS2322, 2345). It counts only when the source, with null and undefined
  removed, is assignable to the slot. The value held is the source: an initializer, the right side of `=`, a returned
  expression or an argument.
- **A member some members of a union declare** (TS2339, 2551 on a union receiver). The value held is the receiver.

`assertionHeld` holds every such value at Any. The lint and the translator both read through that one test, as they
already did for assertions. A held value that reaches a slot reading its declared type is refused as `type-assertion`,
the existing rule. What stays refused:

- a member no type declares (a name that does not resolve);
- a type mismatch that absence does not explain;
- a rejected cast, a missing initializer, a read before assignment.

The design note `langs/ts/design/strict-fixer.md` has a section dated 2026-10-30 with the soundness argument and the gap
below.

## Elements added and why

- `common.mjs`:
  - `fileDiagnostics(program, sf)` reads a file's diagnostics in one place and remembers them for the file. Every
    program lean builds over a file now goes through it: `loadProgram`, `loadMany`, the apply/call normalisation,
    `faithful.mjs` and `pr.mjs`. This lets `assertionHeld`, which only has the checker, see the same diagnostics as
    the lint.
  - `strictValue(checker, sf, d)` names the value a diagnostic is about. `ABSENT_CODES` lists the possibly-absent codes.
  - One line in `heldOf` holds a strict value at Any.
- `lint.mjs`:
  - A strict value's diagnostic is no longer a refusal. Under `--advice` it is an advisory `ts-strict` finding with the
    code.
  - `propAccess` reads a member on a receiver held at Any as an uninterpreted accessor. This is the same test the
    translator's `typeOf` makes. Without it `unsupported-member` refused the union read.
- `translate.mjs`, two existing defects exposed by held values of optional or union storage, both fixed at their
  mechanism:
  - `heldAtAny` in `narrowed`, `ident`, the module/static reads and the opaque accessor: a held read of optional storage
    is the option boxed whole. Before, it took the payload `.value`, which only a guard that tested it may take; it was
    also ill-typed, and it was boxed twice for a union.
  - A call whose `typeOf` is Any (a call on a held receiver) now declares its external result as Any. Before, it used
    the signature's type while its uses read Any, which is a Dafny type error. Any `as`-held receiver had the same latent
    defect.
- Pair `langs/ts/tests/pairs/ts_strict_values`: a proved row and a witnessed row for each of the three families.
- Escape `fixtures/escapes/ts/strict_value_unchecked_own.ts`: a member no type declares, and a mismatch absence does not
  explain, both still `ts-strict`.
- `fixtures/escapes/ts/strict_unfixable.ts`: the cast unit now comes first, and the comment is updated. The escape's
  "translate refuses" row reads the first function, `idOf`. That union read is now a strict value and translates. The
  cast is what still stays refused.
- Docs:
  - `subset.md`: a row in "What is uninterpreted", and the `ts-strict` row.
  - `implicit-any-policy.md`: the three new families, with the reason for each.
  - `strict-fixer.md`: the dated section.

## Numbers

**Pair.** Run with `JOBS=4 node langs/ts/tests/run.mjs --pair ts_strict_values`:

- After: 13 checks, all pass.
- Before (the same pair on a copy of 6421be639): the theorem fails because no parent.dfy is produced; the lint refuses
  `ts-strict`.

**Related pairs.** I ran the 41 pairs whose expect.json mentions strict, assertion, held or implicit, with the same
command. All pass except three:

- `any_equality`: lane B rows `selfEq` and `switchSelf` give WITNESS. They fail identically on the base copy.
- `void_promise`: no candidate.dfy is produced. It fails identically on the base copy.
- `strict_fixer`: the `candidateOnly` rows `nameLength` and `cityOf` now give PASS-proved where PASS-bounded is
  expected. Those units are unchanged between parent and candidate (the converter lists absent reads; it does not
  rewrite them), and they now sit inside the subset. This is a raise, not a regression. I did not edit those rows,
  because my brief does not name them. The lead decides; the change would be the two verdicts, plus a sentence in the
  pair's "why".

**Escapes and translations.**

- Escapes: 250 of 250 pass the lint and translate checks the suite makes (run by a script that replays those checks).
- Translations: I ran `translate.mjs --core --heap --no-project` on 454 files (every pair parent and candidate, plus
  `fixtures/shared` and `fixtures/cleans`), base against mine. They are byte-identical apart from `ts_strict_values`.

**Census.** Command: `NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs /root/da/census/repos/<tree>
--out <json>`, run with the base copy and with this branch.

| tree | entered, before / after | `ts-strict` units, before / after | first refusal, before / after | `type-assertion` first refusal, before / after |
|---|---:|---:|---:|---:|
| driftbench | 2,135 / 2,136 | 78 / 66 | 44 / 34 | 491 / 500 |
| apps-starter | 73 / 73 | 2 / 2 | 0 / 0 | 46 / 46 |
| blog-studio-lambda | 329 / 329 | 9 / 9 | 6 / 6 | 84 / 84 |

- On driftbench, every possibly-absent finding is gone (TS18048 in 7 units, TS2532 in 5), and TS2345 falls from 24 units
  to 19. Most of the freed units meet their next refusal, often `type-assertion`.
- apps-starter and blog-studio-lambda do not move. Their strict errors are JSX props objects that have a possibly-absent
  member (the error is on the whole object, and a props slot reads its declared type), plus `this.props` where the
  checkout lacks React types. Neither is a strict value.
- All three trees declare `"strict": true`. The plan's 10.8 percent describes non-strict trees, so the census the brief
  names cannot show it.

**`--advice`.** `lint.mjs packages/cli/src/commands/perturb.ts --advice` on driftbench lists `ts-strict TS18048: 'def'
is possibly 'undefined'. (the value is read at Any ...)` with `advisory: true`. Without `--advice` those lines are gone.

## What is left, and the defects met

- **The gap, documented and not fixed.** An accessor on Any is total. A read through an absent value throws a TypeError,
  so a candidate that drops such a read, or moves it past an outside call, proves in lane A while the parent throws.
  - Every any value already has this gap: on the base head, `const n = x.length; return k` proves equal to `return k`
    for an untyped `x`.
  - Lane B draws absent fields: the absent case of the same shape, `dropRead`, gives WITNESS.
  - The structural fix would read a held absent value through a may-fault transition ordered with the world. It is not
    done here. The `x!` payload reading is sound, but it keys the absent outcome by the unit's whole text, so it proves
    only unchanged units.
- **The `strict_fixer` rows** above: for the lead.
- **Defect (not mine, not fixed).** On the base head, `u.tag?.length` on an optional string translates to
  `np0_.value.length` instead of `|np0_.value|`, which is a Dafny resolution error, so the whole file's theorem fails. The
  pair avoids it (`longTag` tests `=== undefined`).
- **Defects, pre-existing on base:** `any_equality` (lane B, two rows) and `void_promise` (no candidate translation).
- **Not covered:** TS2322 on a JSX element whose props object has a possibly-absent member. Holding the member would
  only move the unit to `type-assertion`, because a props slot reads its declared type.

## Commits

- ff6458774: the mechanism, the pair and the escape.
- 4d6e98f98: the design notes, the subset rows and the `strict_unfixable` order.
- The last commit adds this file.
