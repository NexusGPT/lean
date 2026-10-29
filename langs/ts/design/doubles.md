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

## The open choice

A sound way to keep the real proofs of units the emitter cannot read is a translator mode in which every JavaScript
number operation is an uninterpreted Dafny function, the same on both sides. A proof there uses congruence only, and
IEEE doubles are a model of it. Comparing the multiset of number-operation texts on the two sides is not enough:
`return (a + b) - b` against `const t = (a + b) - b; return a` has the same sites and differs in doubles.

## The faithful-number rule (C): designed, not built

The lead's rule (29 Oct): the reading is exact where the model is provably faithful, FP where the unit is pure numeric,
and opaque where the model forgets. (A), the FP reading, is built. (D), the fallback, is built: a number-bearing unit
the doubles reading does not prove is PASS-bounded, and its certificate says `lanes.A.numberModel: "unproved"` with the
reason "number model: unproved (doubles ...)". (C) is designed here, measured over the 305 expected-proved rows the
emitter cannot read whole (/private/tmp/claude-501/dbl/drop.mjs).

### What makes an integer reading faithful, and what it costs
An int-typed Dafny operation equals the double operation only when all three of these hold:
1. **Integral operands.** A double input may be 0.5, NaN or an infinity. signed_zero `positive` (`n > 0` against
   `n >= 1`) differs at 0.5, though the integer reading proved it. An operand is integral only when it is built from
   literals, lengths (`.length`, below 2^32 by ECMA-262 23.1.2 and 22.1.3, the axiom `|s| < 4294967296` on every
   translated sequence), index results (`indexOf`, `findIndex`) and counters over these. Measured: 236 of the 305 rows
   carry a number input into an operation, so at most 69 can keep an exact integer reading.
2. **The range.** `|r| <= 2^53`, discharged by Dafny from the context. It is emitted as a `requires` on a helper
   `SafeInt(r)` at each operation site. A failure anywhere in the unit's functions, not only inside the lemma's span,
   makes the unit unproved; check.mjs and the pair step read only lemma spans today, so both need the function spans too.
3. **The sign of zero.** An integral operand still makes a -0: `-(xs.length)` on an empty array, `0 * -k`, `-k % k`.
   Either the reading carries a sign bit on zero results, or an operation that can make a -0 stays out of the exact
   reading. The second is the signed-zero predicate this lane removed, restored for the exact integer reading alone.

### The congruence reading for everything else
Every JavaScript number operation becomes an uninterpreted Dafny function, the same symbol on both sides
(`JsAdd(a, b): N` over an opaque `type N`). Doubles are a model of it, so a proof there is sound. The cost is one switch
at each of about 40 operator emission sites in translate.mjs and heap.mjs, with N replacing real/int in signatures.
Loop and index reasoning that rests on arithmetic (`i < |xs|`, `i + 1`) then needs the faithful-integer reading of
condition 1, or that proof falls.

### The executable model
The conformance step runs the Dafny model and compares it with Node. Lane reach-absent reproduced three
disagreements: opaque_values flowFixed, opaque_values mapPresent and proof_hunt_2 bang, where the model answers 0 and
Node answers -0. The FP reading decides proofs but does not change the executable model. An executable model that
agrees with Node needs a number type that carries -0 (the congruence type N, made executable with a double
representation), or a refusal where a -0 can reach the result.
