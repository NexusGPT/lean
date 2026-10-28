# Two small lint readings: the Infinity literal, and an emptiness exit before Math.min/max

Both came from a converter replay: the lint admitted `Number.POSITIVE_INFINITY` and refused `Infinity`, and it did not
see every emptiness exit that stands before a `Math.max(...xs)`.

## 1. The global Infinity is the value Number.POSITIVE_INFINITY is

JavaScript. `Infinity` is a property of the global object holding the Number value +infinity (ECMA-262, the global
value property Infinity), `Number.POSITIVE_INFINITY` and `Number.NEGATIVE_INFINITY` are the same two values (the Number
constructor's properties), and unary minus of +infinity is -infinity. A global can be shadowed: a local or an import named `Infinity` is another value.

Reading. `infinitySign` (common.mjs) gives +1 for the global `Infinity` and `Number.POSITIVE_INFINITY`, -1 for
`Number.NEGATIVE_INFINITY`, flips under a prefix minus, looks through parentheses, and gives 0 for everything else (a
shadowing local included). The lint admits the global through it (`checkIdent`), as it already admitted the member
spellings. The translator already read any unit naming an infinity as one opaque unit (a whole-unit uninterpreted
function keyed by the source of the unit and of what it reaches, `numericKey`); the key now takes the text with every
infinity spelling written one way (`infinityText`), so two units that differ only in the spelling of the value are one
function:

    function ext_number_special_<key>_seq_int(a0: seq<int>): int
    function lowest_c(xs: seq<int>): int
    { ext_number_special_<key>_seq_int(xs) }

(the same <key>, 64 hex digits, for `let best = Infinity;` and `let best = Number.POSITIVE_INFINITY;`, measured by translating the two files). A unit using a sentinel is
therefore inside the subset and proves against its other spelling; a changed body is another key, never proved.

Stays refused. Bare global `NaN` (`number-special`; escape `number_special.ts`). Arithmetic on the sentinel stays in
the opaque unit: lean does not prove a property of such a unit, only that two units are the same text up to spelling.

Soundness. The conflation is between spellings of one value only. `infinityText` rewrites a node only when
`infinitySign` resolves it to the global (a local `const Infinity = 3` has another origin and is not rewritten), and the
replacement is a primary expression of the same value, so two texts equal after rewriting parse to the same program up
to equal-valued operands. Lane B runs the real code, so a difference in behaviour is a WITNESS whatever lane A says.

## 2. An emptiness exit before Math.min/max

Reading. Math.min/max over a spread of a name (`xs`, `xs.map(f)`, `xs.slice()`, `[...xs]`) is read when a test of
`xs.length` dominates the call (`nonemptyMathArgs`, lint-misfires finding 9). At this base the forms `if (!xs.length)
return 0;`, `throw`, `continue` in a loop, `xs.length === 0`, `xs.length < 1`, `<= 0`, `== 0` and `0 === xs.length`
were already read. Two changes:

- A then-branch that is a block of several statements ending in an exit counts: `if (xs.length === 0) { n = 1; return
  n; }`. The statements before the last cannot reach the end of the block, so after the `if` the test is false.
- A loop around the call widens the "no write between" window to the end of the loop. The base looked only at the text
  between the test and the call, so `if (!xs.length) return 0; for (...) { Math.max(...xs); xs.pop(); }` was admitted
  although the second pass spreads a shorter list, which can be empty (escape `math_empty_loop_write.ts`).

Stays refused. A call whose spread is not the tested array (escape `math_empty_other_array.ts`), a write of the array
between the test and the call or anywhere in a loop around the call, a test that does not imply a nonempty list
(`xs.length > -1`).

Soundness. The exit forms are jumps (return, throw, break, continue): none completes normally, so the statements after
the `if` run only when its test was false (ECMA-262, the completion records of return, throw, break and continue). `break` and `continue` leave the
enclosing loop or switch, and the call is in the same statement list, so it stays below the exit.

## Lane B

Unchanged: it draws the infinities (design/special-numbers.md) and empty arrays. `lowestBad` (a sentinel of 1e9) is
witnessed on `[]`; `highestBad` (`xs.length > 1`) on a one-element array.

## Pair `tests/pairs/lint_small`

`lowest` (Infinity against Number.POSITIVE_INFINITY) proved; `lowestBad` witnessed; `highest` (exit against the length
test in a conditional) proved; `highestBad` witnessed; `untouched` proved. Advice fixtures `math_empty_guarded.ts` and
`infinity_sentinel.ts` carry a loose-equality finding as the label under check and `expect-none` for the rule that must
not fire.

## Instances (census repos, read in place)

- apps-ui/src/lib/hitTest.ts:66 `bandAt`: `let left = Infinity; let right = -Infinity;` min/max sentinels; refused
  `number-special` at the base, no longer.
- apps-ui/src/lib/flowLayout.ts:952: `let bestX = Infinity;` a best-so-far sentinel; same.
- apps-ui/src/lib/chartMath.ts:41 `domain`: `if (values.length === 0) return [0, 1];` then `Math.min(...values)`; read at
  the base and now.
- nexus-linkedin-dashboard/lib/booking/engine/local-time.ts:126: `if (valid.length > 0) return new Date(Math.min(...valid));`
  the if form; read at the base and now.
- snitch/apps/api/src/admin/overview.service.ts:198: `times.length === 0 ? null : new Date(Math.max(...times))`; the
  conditional form; read at the base and now.
- status/src/ui/detail.ts:71: `latencies.length === 0 ? null : Math.max(...latencies)`; same.
