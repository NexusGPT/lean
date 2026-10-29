# Doubles: lane A reads a number-bearing unit as IEEE-754 binary64

## The construct

A JavaScript number is a binary64 double (ECMA-262 6.1.6.1): one NaN, +0 and -0, two infinities, subnormals, and
round-to-nearest-even on every arithmetic operation. Lane A's Dafny reading takes a number as an exact real or integer.
In that reading `a + b - b + 0.5` equals `a + 0.5`, `x + 1 - 1` equals `x`, and `x === 0 ? 0 : x` equals `x`; in doubles
each pair differs (a = 1e9 and b = 2^53 - 1; x = 2^54 - 2; x = -0).

## The reading

Lane A keeps Dafny for control and structure. A number-bearing unit is also read by `translate/smt-fp.mjs` as one SMT-LIB
term over `(_ FloatingPoint 11 53)`, RNE on every operation, and `solve/fp.mjs` asks Z3 `(assert (not (= old new)))`.
SMT `=` on this sort is SameValue (7.2.10): every NaN one value, +0 and -0 apart.

- `unsat`: the two results are the same value for every input. The unit is PASS-proved, whatever the real lemma said
  (it is recorded beside).
- `sat`: the model's bit vectors decode into a Float64Array, and the input is replayed through lane B's runner (exec/run.mjs:
  sandbox, pickUnit, observe). If the replay differs, the result is a WITNESS with that input. If the replay agrees and
  every operation was encoded exactly, the ENCODING is wrong: a named finding, never a witness. If an operation was read
  uninterpreted, its model is free, so the lemma is unknown.
- `unknown`, a timeout (60 s per query), or a unit the emitter does not read whole: the lemma is unproved, and the unit
  is PASS-bounded at best.

There is no new top-level verdict. The certificate's `lanes.A.doubles` names the predicate's hit, the solver, its version,
the seconds, the timeout, the operations encoded exactly, those read uninterpreted, the query file and, on sat, the input.

## Number-bearing

`numberBearing` (smt-fp.mjs) holds when the unit, or a same-file unit it reaches, performs one of these:
- arithmetic: `+ - * / % **`, unary minus and plus, `++ --`, compound assignment;
- a bitwise operator;
- a comparison with a number operand, relational or equality, because NaN is unordered (7.2.13) and `===` makes -0 equal
  0 (7.2.15), so a test reads a -0 or NaN input;
- ToBoolean of a number (7.1.2), since NaN and -0 are false;
- `Object.is`;
- a Math call;
- a conversion: Number, String, parseInt, parseFloat, a number method such as toFixed, a template hole, or string `+`.

The brief's predicate named only comparisons of a computed number. With that predicate, `x === 0 ? 0 : x` against `x`
(proof_hunt_8) is not number-bearing, so it was widened to every number comparison.

## The emitter (one table, no per-pair code)

| Operation | Reading |
|---|---|
| Literal | `((_ to_fp 11 53) RNE <exact decimal>)`, checked bit for bit against Node on 24 literals (numbers_doubles, literals row) |
| `+ - * /`, unary minus | `fp.add` / `fp.sub` / `fp.mul` / `fp.div` RNE, and `fp.neg` |
| `< <= > >=` | `fp.lt` / `fp.leq` / `fp.gt` / `fp.geq`, false on NaN |
| `===`, `!==` on numbers | `fp.eq`; on booleans and strings, `=` |
| `Object.is` | `=` |
| `%` | `js.rem`: `fp.rem`, the IEEE remainder, plus one correction of the divisor's magnitude toward the dividend's sign (LifeJacket's shape); zero results take the dividend's sign |
| `Math.round` | `js.round`: floor of x, plus one when `x - floor(x) >= 0.5`, then -0 for a negative x rounding to zero |
| `Math.floor` / `ceil` / `trunc` | `fp.roundToIntegral` RTN / RTP / RTZ |
| `Math.sqrt` / `abs` | `fp.sqrt RNE` / `fp.abs` |
| `Math.min` / `max` | `ite`: NaN wins, -0 sorts below +0 (21.3.2.24-25) |
| `Math.sign`, `Math.fround`, `Math.imul` | exact |
| ToInt32 / ToUint32 | `js.bits`: NaN and infinities give 0; truncate; a magnitude of 2^84 or more gives 0; otherwise the low 32 bits of the exact 85-bit integer. The operators `& \| ^ ~ << >> >>>` work on these bits, with the shift count masked to 5 bits |
| Truthiness | `js.truthy`: neither NaN nor a zero |
| Conditionals, `&&`, `\|\|`, if and return paths, `const`/`let` locals, assignments to locals | `ite` and substitution |
| A same-file call | inlined, at most 8 deep |
| A record parameter | each scalar leaf read is its own parameter `\|p0.a.b\|`; the replay rebuilds the object |
| A returned object or array literal | compared field by field |
| `**`, `Math.pow`, `sin`, `cos`, `exp`, `log` and the other approximated Math functions; `Number::toString`, `toFixed` and the other number methods; `Number(string)`, `parseInt`, `parseFloat`; a string's `.length` (UTF-16 units, which no SMT string operator counts) | uninterpreted functions, keyed by operation name and arity, the same symbol on both sides |
| Anything else (loops, arrays, the heap, throws, calls outside the file, writes outside locals) | not read: the reason is named, and the lemma is unknown |

Each multi-operator seam (`%`, `Math.round`, `Math.min`/`max`, ToInt32/ToUint32) is checked against Node on 46 edge
doubles: every unary case and every pair, 6,486 evaluations in one Z3 call. This is the seams row of numbers_doubles.

## The four seams, named

- `%`: with both operands free, `fp.rem` can time out. `x % y` against `x % -y` is unknown at 60 s, by design.
- `Math.round`: an exact `ite` encoding, differentially tested.
- Conversions and approximated Math: uninterpreted, so the reading is sound but lossy. A sat whose replay agrees is
  unknown, never a witness.
- ToInt32: encoded exactly, and it agrees with Node on the edge set, so it is not read uninterpreted.

## Second solver

Set `LEAN_FP_CROSS=bitwuzla` or `LEAN_FP_CROSS=cvc5` with the binary on PATH. The same query file then runs on that
solver too, and an unsat against a sat is a finding. Neither solver is installed on this machine; enabling the
cross-check means putting its release binary on PATH for the run.

## What the pair suite reads (measured over tests/pairs, every `equal` row)

There are 649 number-bearing lemmas. The emitter reads 108 of them whole: median 0.068 s, p90 7.0 s, max 60.1 s. The
rest touch loops, arrays, class members, throws or calls outside the file, so their doubles reading is unknown. An
expected-proved row of that kind carries `real-only` in expect.json: the real lemma still proves and stays under test,
but lane A does not prove the unit. The doubles reading found 6 rows the real reading had proved and that differ in
Node: three at -0, two at 0 < n < 1 where the integer reading equated `n > 0` with `n >= 1`, and one at NaN. 33 rows
expected not proved now carry `witness`, each a replayed counterexample.

## The faithful-number rule (C), built (translate/faithful.mjs)

The decision of 29 Oct: the reading is exact where the model is provably faithful, FP where the unit is pure numeric,
and opaque where the model forgets. A number is read exactly, as a Dafny int or real holding its value, only under two
discharged obligations:
1. **Integrality.** The value is built from integral sources: an integer literal, `.length` of a string, array or
   tuple, an index result (`indexOf`, `findIndex`, `search`), a counter, a bitwise result, Math.trunc/floor/ceil/round
   of such a value, `+` and `-` of such values, `*` when both are nonnegative or one is a positive literal, `%` with a
   nonnegative dividend and a divisor that is never 0, `floor(a / b)` with a >= 0 and b > 0.
2. **The safe range.** `|v| <= 2^53`, discharged by interval arithmetic over those sources. A length lies below 2^32,
   the lead's axiom (ECMA-262: an array length is a Uint32). A counter is bounded by the iteration bounds of the loops
   around its step: a for-of 2^32, a counter loop its range, an array callback 2^32, while/do unbounded. A value whose
   bound is not shown is not exact.

Neither obligation admits a -0 or a NaN: unary minus only of a value never 0, `*` only as above, `%` only with a
nonnegative dividend.

Every other number is a double the model does not compute. The translator (`--core`, lane A's equivalence path) first
rewrites the source in memory, line for line, as `common.mjs normaliseApplyCalls` does. Each operation on such a number
becomes an uninterpreted function `Math.__lean_<op>` (declared in `lean-number.d.ts`). The translator reads it as a
pure external keyed by name and types, the same symbol on both sides. The rewritten operations:
- arithmetic, bitwise, relational and equality operators;
- unary minus and `~`;
- truthiness (`Math.__lean_truthy`): a condition, `!`, `&&`, `||`;
- the exact Math functions over an opaque argument;
- a compound assignment or an update statement, rewritten as `x = Math.__lean_add(x, 1)`.

A proof uses exact integers and congruence only; IEEE doubles are a model of it, so the proof is sound.

**Pinned equalities.** An equality stays interpreted when one side is a nonzero exact value or a literal of another
type: the one double equal to a nonzero integer is that integer, with no -0 and no NaN.

**Placement.** A number the model does not hold must reach only places the rewrite makes opaque, or places that carry
the value: a return, a local, a field, an array element, a template, a conversion, the argument of a same-file unit,
of an imported function or of a function value, `Map.set`'s value, `push`, `Object.is` (SameValue is identity). The unit
is UNPLACED when such a number reaches any of these:
- an index, or a computed key;
- an argument a default-library operation reads as a number (`splice`, `new Date`, `includes`'s position,
  `Number.isInteger`, `isNaN`);
- a switch;
- an update whose value is used;
- an equality or truth test over a union that holds number, unless the equality is pinned.

The translator writes `// NUMBERS <unit>: {"placed", "congruence", "reasons"}` for each unit, its same-file callees
included.

**Decision** (check.mjs, the pair step, `numberDecision` for harness/proof_hunt.py):
- a unit with no number operation keeps its lemma;
- a number-bearing unit is decided by the FP reading (unsat proves, a replayed counterexample refutes);
- when the FP reading is unknown, the lemma proves the unit only if both sides are placed;
- otherwise the unit is PASS-bounded with "number model: unproved".

**Spec proofs keep the exact reading.** A proof of one program against its own ensures (no `--core`, or
`--exact-numbers`, which conformance.json passes) keeps the exact reading. Its claims, such as `result >= 0`, are
statements about the exact model, not equivalences.

### What the rule does not cover yet
- **Non-bearing units.** An input number read as an integer by a modelled library operation in a unit with no number
  operation (`splice(i)`, `new Date(n)`, `setFullYear(y)`, `includes(s, pos)`, `Number.isFinite`), or a truth or
  equality test over a union holding number. These are 14 rows of the pair suite,
  named in the report. They keep their lemma, because the number-bearing test does not select them.
- **Distinct non-exact literals.** Two different literals that round to the same double, such as 9007199254740993 and
  9007199254740992, are different constants in the model. The reading is incomplete there, never unsound.

### The executable model
The conformance step runs the Dafny model and compares it with Node. Lane reach-absent reproduced three
disagreements: opaque_values flowFixed, opaque_values mapPresent and proof_hunt_2 bang, where the model answers 0 and
Node answers -0. The FP reading decides proofs but does not change the executable model. An executable model that
agrees with Node needs a number type that carries -0 (the congruence type N, made executable with a double
representation), or a refusal where a -0 can reach the result.
