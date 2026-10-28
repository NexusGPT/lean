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
