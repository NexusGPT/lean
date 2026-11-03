# w9aj: the conversions a body applies, in the draws, the input search and the world search (2026-11-03)

The miss class: `numeric-conversion` on the hard set (bench/hard, 12 ids). The mutator (exec/mutate-hard.mjs) swaps
one conversion for another of its family: `Number` ↔ `parseFloat`, `parseInt(x, r)` → `Number(x)`, `Math.floor`,
`ceil`, `round` ↔ `trunc`, `isNaN` ↔ `Number.isNaN`, `isFinite` ↔ `Number.isFinite`, `a || <number>` → `a ?? <number>`.

## What the runs show (read, not assumed)

The brief's hypothesis was that lane B's draws rarely hold the values on which two conversions differ. It holds only
for shapes the earlier readings miss:

- On 9873874f64, 11 of 12 small probe pairs of the kind already WITNESS: Number/parseFloat/parseInt on a string
  parameter, a property path and a number; floor/ceil/round/trunc and `~~` on a number expression; isNaN/isFinite on
  `any`/`unknown`; `||` → `??` on an optional field. Lane w9o's `CONVERTED_TEXT` (a string handed straight to a
  conversion), the fractional draws and the special-number inputs (NaN, ±Infinity, -0) cover them.
- The ones that stay PASS-bounded are the shapes no reading saw: the converted value is a **derived local** (`const t =
  s.trim(); Number(t)`, `(q.offset ?? "").toLowerCase()`), a **conversion of a conversion** (`Math.floor(parseFloat(s))`,
  where no drawn text is a negative fraction), and a conversion of a **world answer** (`registry.get(k) || 0` from a
  faked package: the world answers a handle or nothing, both versions agree, no draw infects, so the w9l climb never
  starts).
- On the 12 ids, lean alone on the mutated unit (hard_check.py) holds WITNESS on 3 of 12 on 9873874f64 (Checkmate#3288,
  three.js#34734, n8n#41890). The other nine are not draw misses. Five are equivalent on the inputs the code can reach:
  gemini-cli#29612 (`Math.max(5, …) / 4` is never negative), n8n#42608 (`isFinite` of a value already a Number),
  n8n#42766 (`isNaN` of `Date#getTime()`), n8n#41940 (trunc and floor differ only below 0, where both throw), and
  three.js#34978 (a WeakMap count is undefined or an integer, never NaN). Four need a reach lean does not have:
  immich#32498 (`event instanceof KeyboardEvent` in a callback), n8n#41825 (a middleware callback lean cannot drive,
  ASK), n8n#41943 (deep in a loop over execution data), three.js#34309 (for-in keys of a value under a regex-matched
  key).
- At the record level (the DA run: pr.mjs over the whole pull request, parent = the PR's merge base) none of the 12
  holds a WITNESS on the unit for this kind's own reasons. 34734, 41890 and 41825 sit in **units the PR adds**: the
  parent has no such unit, so lean gives NEW (no differential is possible). Checkmate's module fails to load
  (`z.email is not a function` at module evaluation, a faked zod). 29612 and 34978 time out. immich and 42608 hold
  WITNESSes from the PR's own change, away from the edit.

## The mechanism (exec/conversions.mjs)

- **The families** (`FAMILY_VALUES`): `parse` (Number, parseInt, parseFloat, Number.parse*, unary `+`), `round`
  (Math.floor/ceil/round/trunc, `~~x`, `x | 0`, `x >> 0`), `nan` (isNaN, isFinite and Number's own; isInteger and
  isSafeInteger have no converting twin and are not in it), `fallback` (`x || <number>`). One list per family. Each
  value carries the pair it separates (`'12px'`: the parsers keep the prefix, Number is NaN; `-1.5`: floor -2,
  trunc -1; `NaN`: `NaN || d` is d, `NaN ?? d` is NaN; ...).
- **The reads a conversion takes** (`flowsInto`): its argument and, through arithmetic, `??`/`||`, a conditional's
  branches, a text kept but for its case or blanks (`trim`, `toLowerCase`, `String(x)`, `${x}`), another conversion's
  argument and a local's initializer, the reads that flow into it. Syntax only.
- **The draws** (usage.mjs `converts`, spec.mjs `boundaryOf`): a leaf a conversion takes carries the family, and its
  boundary holds the family's values its declared type admits (a string leaf the texts, a number leaf the numbers),
  after its compared literals, as w9o's texts were. Both versions are read (mergeUsage). `same` keeps NaN and -0 apart
  from null and 0. LEAN_BREAK=w9aj-conversions: no family (w9o's reading as before).
- **The input search** (search.mjs `leafValues`): the leaf changes of such a leaf hold the family's values. A leaf the
  two versions convert differently (`convChanged`: `Number(s)` on one side, `parseInt(s)` on the other) has them at
  tier 0 (with a target condition's literals), any other at tier 1. Same budget, same order.
  LEAN_BREAK=w9aj-conversion-changes.
- **The world** (compared.mjs rows with `conv`, `changedConversions`; search.mjs `searchWorld` `worldInfect`): a read a
  conversion on a changed line takes (the member's or the call's key, as w9ac's table keys it) is set, on a draw no
  difference reached, to each of the family's answers (`WORLD_PICK`, at most four per family; `num:NaN`, `num:-0` for
  the numbers JSON cannot hold, fake.mjs). This runs when the leaf changes are spent, within the infection's half of
  the budget. A diff is a witness (replayed as every world witness is), and an infected run is climbed with that
  answer kept. LEAN_BREAK=w9aj-world-conversions.

Nothing reads the mutation, the truth or a bench file. Every choice is syntax of both versions, the run's own answers
and the seeded draw, the same on both sides.

## Checks

- Pairs (red on 9873874f64, WITNESS after): `conversion_flow` (pageSize: Number → parseInt through a trimmed local;
  offsetOf: through a field lowered behind a default), `conversion_round` (bucketOf: floor → trunc of a parsed text;
  shiftOf: of a field parsed, scaled and divided back), `conversion_world` (Renders.depthOf: `|| 0` → `?? 0` on a
  faked package's answer). Their break rows: tests/lib-break.mjs.
- tests/w9aj-numeric-conversion.mjs: the syntax, the reading, the boundary, the tier-0 leaf changes, the world rows
  and a synthetic world search. `--break` fails, and each name alone fails its own part.
