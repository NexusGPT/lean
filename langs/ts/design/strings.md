# Strings

JavaScript strings are sequences of UTF-16 code units. Length, indexing and relational
comparison use those units; iteration instead visits code points. Dafny 4.11.0 uses
Unicode scalars by default; the suite supplies no unicode-char override.

We retain Dafny `string` to preserve every existing record, array, external and JSX
signature. The model axiom is that all string values, including outside results and
intermediate values, contain only BMP scalars (U+0000..U+FFFF excluding surrogates).
Within this envelope scalar count, indexing, iteration and code-unit order agree.
Literal astral characters and lone surrogates are refused as `string-code-unit`.
The paper must call PASS-proved conditional on this BMP envelope, never an all-Unicode
JavaScript guarantee. Outside strings cannot be checked statically; this restriction
is a model assumption, not a validated precondition. Full UTF-16 remains future work.

Trim walks either end using ECMAScript WhiteSpace plus LineTerminator: U+0009..000D,
0020, 00A0, 1680, 2000..200A, 2028, 2029, 202F, 205F, 3000, FEFF. U+0085, 180E
and 200B are not whitespace. TrimStart and TrimEnd use the corresponding walk.
ASCII casing maps A..Z or a..z. A symbolic `IsAscii(s)` guard tests every character;
Dafny can discharge it for literals or proven ASCII sequences. The non-ASCII branch
is a bodiless function of the whole string. No identity assumption is made for É,
ß or context-dependent Unicode case mappings; outside inputs retain both branches.

Split with a literal separator returns a sequence of strings. Empty separator returns
one string per code unit; empty input gives [] for empty separator and [""] otherwise.
Nonempty separators consume non-overlapping matches and preserve empty fields.
An explicit split limit stays uninterpreted, including ToUint32 semantics.
PadStart and PadEnd repeat and truncate the pad to the missing length, default space;
empty pad or an already-long string is unchanged; target length is capped at 2^53 - 1. Allocation exhaustion is outside
this mathematical sequence model, as for the existing concatenation/repeat reading.
Literal-pattern replace replaces the first match; replaceAll uses non-overlapping
matches, including every boundary for an empty pattern. Replacement strings interpret
$$, $&, $`, $' using the original string; nonexistent capture references stay literal.
Regex and callback replacement stay uninterpreted. LastIndexOf clamps its position;
EndsWith clamps its end position. String-array join already has an exact helper;
other element types must use an external rather than a string-only helper.

StrLt compares the first different character numerically, then proper-prefix length.
The other three operators reverse or negate StrLt, never use Dafny sequence ordering.
Example: `a < b` becomes `StrLt_string(a, b)`.
Boolean template holes are exact true/false strings. Numeric literal holes use their
JavaScript string spelling. Nonliteral numbers remain uninterpreted because decimal
and exponent formatting must agree with the numeric model before becoming exact.
Explicit String on unknown stays distinct from a template conversion: symbols differ.
LocaleCompare stays uninterpreted because locale/collation is outside the model;
normalize stays uninterpreted because Unicode normalization tables are not encoded.

Soundness requires fallback calls to retain every argument and method identity. In
particular an ASCII-only map is never silently used on arbitrary Unicode, split limits
are never discarded, and replacement dollar tokens are never treated as raw text.
The lint lifts string-order for two string operands, retaining it for mixed operands.
The code-unit refusal is checked on literal fragments, including template fragments.
Lane B executes native JavaScript with strings from its typed generator: empty,
spaces, mixed case, accented BMP, Japanese, separators and length boundaries. Pair
checks cover slug separator changes, equivalent padding, reversed maximum selection,
an unchanged unit, and a refactor preserving effectful argument order. Separate helper probes assert boundary cases in Dafny.

## Corpus instances

The census has no string-method domain. The matching existing domains are
`template string` and `< > comparison`; the latter also includes numeric comparisons.
The stable harness sample is run before and after, with its broad-domain limitation
reported explicitly. These corpus expressions were read in place (C is the absolute
`/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos`):
- C/workday-unofficial-api/src/services/jobs.service.ts:62: trim and guarded lower enter.
- C/car-select-api/src/services/scheduler.ts:83: padStart enters; line 65 literal split enters.
- C/apps-ui/src/record-core/views/grid/cells.ts:65: literal replaceAll enters.
- C/nutshell/apps/cli/src/verb-help.ts:17: literal replaceAll with a backslash enters.
- C/snitch/apps/desktop/src/i18n/index.ts:26: dynamic template pattern stays uninterpreted.
These are expression entry decisions; surrounding units may have unrelated lint rules.
