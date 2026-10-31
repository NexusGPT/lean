# Bitwise lemmas: the low bits and the remainder (2026-10-31)

Lane fix-clearlow-lemma, from the row of lane core-arithmetic: the unit `clearlow` of pair `arithmetic_core`
(`x & ~1` against `(x >> 1) << 1` on a field) was unproved because Z3 stopped on `bv2int`, and `xs.length & 1` against
`xs.length % 2` needed a lemma. The reading below proves both. It is one mechanism of the bitwise reading
(`translate.mjs bitwiseOf`, shared by both lanes) and the prelude it calls. It names no unit and no file.

## What Z3 4.12.1 (the pinned solver) does not decide

Each was measured on a file of its own (Dafny 4.11, the suite's options). Each item states the shape that fails and the
shape that proves:

1. **A conversion visible in the query.** `(a % 2^32) as bv32` (int2bv) or `v as int` (bv2int) of a symbolic term.
   Even `(c as bv32) as int == c` for `0 <= c < 2^31` times out. The int-to-bv direction proves when it is the whole
   goal: `((y % 2) as bv32) == (y as bv32) & 1` and `((y / 2) as bv32) == (y as bv32) >> 1` for `0 <= y < 2^32`.
2. **A bv32 literal passed to a function.** Dafny boxes it (`$Unbox(Lit($Box(1bv32))))`), and as a standalone value
   (the right side of an `==`, `!1`). An operand of an operator next to a non-literal stays a plain constant.
   `S(u & !1) == S((u >> 1) << 1)` gives `unknown`; the same query with the box replaced by `#x00000001` gives `unsat`.
3. **The arithmetic shift as a branch.** `if u < 2^31 then u >> k else !((!u) >> k)` with a variable count times out
   inside an assertion. `(u >> k) | ((0 - (u >> 31)) & !(0xFFFFFFFF >> k))` proves. The two were checked equal against
   Node on 2 million random (u, k) and on the edge values.
4. **The well-formedness of the old shift helpers.** `(bv as int) % 32` as a shift count: `JsShl_int` and `JsShr_int`
   timed out on their own well-formedness. The count is now `bits & 31`, in bv32.
5. **Two bit terms equal only through their bits, under an uninterpreted function.** With `m == 268435455` assumed,
   `u & m == u & 268435455` proves, but `S(u & m) == S(u & 268435455)` times out for every mask of 20 bits or more
   (15, 255, ..., 65535 prove). With relevancy off the query is `unsat`. So the bits are equated in a goal of their own,
   and ToInt32 meets only terms that are already equal.
6. **A remainder by a literal against a remainder by a term equal to it.** `a % JsPow2(31)` against `a % 2147483648`.
   The lemmas take the power as a parameter (`requires p == JsPow2(k)`), so an instance states its literal divisor.
7. **Many unfoldings of a bit function in one query.** `JsMask(k)` at a literal k unrolls k times. `JsMask` is opaque,
   unfolded one step by `JsMaskStep`. At a literal k the steps are one lemma each, `JsMaskAnd_i`.

## The reading

- **A chain is one inline bv32 term.** `bitwiseOf` reads a maximal tree of `& | ^ ~ << >> >>>` as bits. An operand
  that is not bitwise enters as `JsUint32_A(x)` (its ToUint32; ToInt32 has the same 32 bits). A literal enters as its
  32 bits (`c >>> 0`), a constant subtree is folded, a shift count is its low five bits, and `>>` is written as in (3).
  `x | 0`, `0 | x`, `x ^ 0`, `0 ^ x`, `~~x` and a shift by a literal count of low five bits 0 are the bits of x, so
  both sides meet in one term. The top converts back once: `JsSigned_bv32` (ToInt32), or `JsUnsigned_bv32` for `>>>`;
  in a real file `as real`. Nothing in the chain passes a bv literal to a function (2).
- **The round trip is a postcondition.** `JsSigned_bv32(v)` ensures `-2^31 <= r < 2^31 && JsUint32_int(r) == v`, and
  `JsUnsigned_bv32(v)` ensures `0 <= r < 2^32 && JsUint32_int(r) == v`. Each is proved once in the prelude from the
  int-to-bv facts of (1). A bitwise value that goes through a local, a field or a parameter (`const m = x & 255;
  m >> 4`) meets its bits again by this equality, never through bv2int. `JsUint32_real(a)` is
  `JsUint32_int(JsTrunc_real(a))`, so the round trip serves a real file too.
- **The low bits of an integer are its remainder.** `JsLowBitsLib`:
  `JsLowBitsNat(y, k)`: for `0 <= y < 2^32`, `JsBits(y) & JsMask(k) == JsBits(y % 2^k)`. It is proved by induction
  on k from the one-bit and halving facts and `y % 2p` against `(y / 2) % p`; `JsBits` (int2bv) is opaque there.
  `JsLowBitsInt(a, k)`: for every integer a and `0 <= k <= 31`, `ToInt32(a) & (2^k - 1) == a % 2^k` (Dafny's
  Euclidean remainder). Its parts: `(a % 2^32) % 2^k == a % 2^k` (2^k divides 2^32), the injectivity of int2bv below
  2^32 (by halving), and `ToInt32(c) == c` for `0 <= c < 2^31`.
  `JsLowBitsBv(a, k, p)` is the same in bits at a given power.
- **The reading uses the lemma.** `x & m` at the top of a chain, m a literal `2^k - 1` (`1 <= k <= 31`) on either side
  and x not bitwise, is `JsLowBits_<A>_<k>(x)`. That function is the chain `ToInt32(ToUint32(x) & m)` (in a real file,
  of the truncation of x), with the postcondition `r == x % 2^k`. Its proof (`JsLowBitsAt_k`) equates the literal mask
  with `JsMask(k)` in bits only, then calls `JsSignedSmall`. A postcondition reaches the unit's callers; a lemma called
  inside the unit's own body does not (measured: the parity unit did not prove that way).
- **The remainder of two naturals is Dafny's remainder.** Here the reading of `%` meets the lemma. `RemT_int`,
  `RemT_real` (heap core), `JsRem` and `JsRealRem` (ordinary lane) ensure, for a dividend >= 0 and a divisor > 0, both
  integral, that the value is `a % b` (in a real file `(a.Floor % b.Floor) as real`). The real case is proved by
  `RemT_nat` / `JsRemNat_real`.

Soundness: each helper computes JavaScript's operator on the 32 bits (ECMA-262 6.1.6.1). The executable checks of
`tests/numbers_bits` (190, every operator on the edge values and shift counts 32, 33, -1 and 63) run the emitted code
against Node. Every lemma is proved in the prelude of the file it serves; none is an axiom. No unit carries a hint.

## Pairs

`arithmetic_core` (a real file), with the expectations written before the reading (a624b0991): `clearlow` proved, and
the new unit `lenparity` (`xs.length & 1` against `xs.length % 2`) proved. Red: 33 checks, 2 failed. Green at
1baa08ed9: 33 checks, ALL PASS. The real lemmas of `nibble`, `uint` and `shift`, which the doubles decision proved and
the real lemma did not, are proved now too. Measured beside the pair (scratch files, not in the suite): `& 7` against
`% 8`, `& 0xFFFF`, `& 0x3FFFFFFF`, `& 0xFFFFFFF` and `& 0x7FFFFFFF` against their remainders, in an int file, in both
lanes. Every lemma of those files verifies.

## What stays out

- `x & m` when x is itself bitwise (`(x >> 4) & 15`) stays an inline chain: the lemma is about an integer's ToInt32.
  Such a chain compares with another chain bit for bit.
- A mask that is not `2^k - 1`, a shift by a count that is not a literal against its remainder form, and `&` with a
  negative operand against `%`: JavaScript's `%` keeps the dividend's sign, so these differ there, and the remainder
  postconditions say nothing about a negative dividend.
