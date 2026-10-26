# Finite numbers, bitwise coercion and special-value boundaries

The exact reading retains the existing per-file integer/real arithmetic envelope.
It does not claim IEEE rounding, overflow, underflow or signed-zero arithmetic.
Numeric parameters and outside numeric answers in that envelope are finite values.

For finite x, ToUint32(x) is truncation toward zero, modulo 4294967296.
The resulting integer is in [0, 4294967296), so conversion to bv32 is total.
ToInt32 uses that same word: u below 2147483648 is u, otherwise u - 4294967296.
Thus the direct cast `(x as bv32)` needs integral x in the unsigned range;
the emitted modulo/truncation helpers discharge that requirement for all finite x.
`& | ^ ~ << >>` return signed int32; `>>>` returns an unsigned integer.
Shift counts are ToUint32(y) modulo 32. Arithmetic right shift preserves the sign.
Example: `JsSigned_bv32(JsUint32_real(x) & JsUint32_real(y)) as real`.
`x | 0` and `~~x` are ToInt32, not unrestricted Math.trunc: they wrap at 2^31.
The pair proves these two idioms equal; Math.trunc equivalence needs an int32 bound.
BigInt bitwise operations and coercions of opaque operands remain `bitwise` refusals.

Choice (ii): keep finite int/real, with an opaque fallback for previously admitted
special-producing forms. A partial Num datatype would be unsafe unless numeric
fields, sequences, callbacks, external answers and all their observers migrated too.
Bare global NaN/Infinity had no reading and remain refused, now `number-special`.
Already admitted Number.NaN/Number.POSITIVE_INFINITY/Number.NEGATIVE_INFINITY,
explicit -0, parsing, string-to-number conversion and possibly-zero divisors retain
admission through a whole-unit uninterpreted reading keyed by source and dependencies.
Same-file users of such units are also opaque: a caller must not simplify n === n
when n could be NaN. The key includes reachable same-file bodies, callbacks and referenced module initializers.
The complete signature retains the world, receiver and mutated parameter outputs.
Nullable defaults and optional parameters retain the merged Nullish input tags.
Units reading module state use the complete file as their opaque identity.
Opaque numeric results are never inspected by a translated same-file caller.
This is deliberately conservative even for a guarded variable divisor.
Finite, nonzero literal divisors retain exact arithmetic; real remainder is
`a - b * trunc(a / b)`. Zero is never substituted for a division-by-zero result.
In JavaScript 0/0 is NaN and nonzero/0 is signed infinity; in Dafny division needs
a nonzero divisor. A failed helper precondition alone is insufficient here because
the current theorem runner reports individual equality lemmas separately.
The opaque fallback prevents a changed zero-divisor branch from proving equal.

Number.isNaN, Number.isFinite and coercing global isNaN/isFinite stay uninterpreted.
Under a future extended datatype, isNaN is the NaN constructor test, isFinite the
Finite constructor test; NaN comparisons are false and NaN !== NaN is true.
That future datatype must also distinguish negative zero, which Finite(real) alone
cannot do. Its IEEE arithmetic must handle infinity cancellation, zero times infinity,
zero/zero, infinity/infinity, signed zero divisors and unordered comparisons.
Number.MAX_SAFE_INTEGER is exactly 9007199254740991.
Number(number) and unary + on a number are identities; boolean conversion is 0/1.
Unary + on strings and parseInt/parseFloat/Number on strings remain uninterpreted:
prefix parsing, radix, whitespace, exponent spelling and overflow need a parser.
parseInt on a number is not identity or general truncation: parseInt(1e21) is 1
because it first stringifies. General parsing retains its uninterpreted fallback.
Math.floor/ceil/trunc/round/sign/abs/min/max are exact in the finite arithmetic
envelope, with round ties toward positive infinity and trunc toward zero.
Explicit negative zero takes the opaque path, except literal template stringification.
General signed-zero arithmetic is a gap.

The lint admits number bitwise operands and number/string/boolean unary +;
it preserves every previous admitted fallback. No new blanket division refusal.
Lane B executes JavaScript, including zero/fractional/large-number generated inputs.
Its renderer distinguishes NaN, both infinities and negative zero in outcomes/traces.
Concrete helper probes cover sign bits, wraparound, negative fractions and shift masks.

Inspected instances (absolute paths, read-only):
- /Users/assem/Documents/GitHub/nexus/apps/backend/src/admin-panel/domain/permission.constants.ts:50
  canDelete enters the exact bitwise reading; the module mask remains an external.
- /Users/assem/Documents/GitHub/nexus-landing/app/dieteren-workshop/Hundred.tsx:36
  mulberry still has captured parameter mutation and compound bitwise assignment gaps.
- /Users/assem/Documents/GitHub/driftbench/packages/sandbox/src/folder.ts:139
  writeInside has exact numeric flag OR; unrelated lint findings still decide admission.
- /Users/assem/Documents/GitHub/nexus/apps/frontend/src/common/utils/text.utils.ts:13
  formatBytes gains numeric unary +; parsing and division use the opaque fallback.
- /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos/apps-ui/src/blocks/fx/LiquidGroup.tsx:612
  cssMs keeps admission through opacity because parsing may produce NaN.
- /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos/langchainjs/libs/langchain-core/src/structured_query/utils.ts:31
  isInt keeps the parsing fallback; it is not justified by replacing isNaN with false.
