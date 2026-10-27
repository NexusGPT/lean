# Stage 5 rank 18: a fixed tuple spread into an outside call

The construct: `sink.send(...pair)` with `pair: [string, number]`, `sink.log(head, ...rest)`. Before this rank the lint
refused a call spread whose operand is not an ordinary array ("spread arguments need an ordinary array; tuples and
custom iterables are outside the subset", 44 findings on nexus).

## The reading

A tuple with a fixed number of required elements (no rest element, `minLength == fixedLength`) spreads as exactly those
elements, in order: `f(...pair)` is `f(pair[0], pair[1])` (ECMA-262 13.3.8.1, ArgumentListEvaluation over a known
iterator). The translator reads the tuple once into a temporary and passes its elements as positional arguments of the
outside call (`externalCall`), so the call takes the same `call_args` form, with the same parameter types, as the call
written by position; an array spread keeps the `call_seq` form (a sequence of unknown length). A tuple the translator
reads as a sequence (a literal list, a readonly table) is indexed as one. The lint admits the same tuples
(`spreadArray`); an open tuple, a set or a custom iterable stays out.

One Dafny unit of `sendPair(sink, pair)` returning `sink.send(...pair)` (pair unit `sendPair`):

```
var st0_: (string, int) := pair;
var (wld, t1_) := ext_call_args_Ext_Sink_send_World_Ext_Sink_string_int(wld, sink, st0_.0, st0_.1);
```

What stays refused, with an escape fixture (`fixtures/escapes/ts/tuple_spread_open.ts`), rule `spread`: an open tuple
`[string, ...number[]]`. The older escape `spread_tuple.ts` (a fixed pair spread into `console.log`) described the
construct this rank admits and is retired.

Met on the way and fixed generally: `outerParens` stripped the parentheses of a tuple literal bound by a declaration
(`var pair: (string, int) := k, (n + 1)`, a Dafny error); it now keeps parentheses around a top-level comma.

## Measurement

Pair `tuple_spread`: `sendPair` (the elements written by position, proved: the same positional call), `logWith`
(WITNESS), `sendBoth` (WITNESS), `maybeSend` (untouched). Census (`node langs/ts/census.mjs`, the rank 17 state as the base): nexus 23,774 to 23,774 of 26,520 (the 44 tuple-spread
findings sit in units other keys still hold); langchainjs 3,561 to 3,564 of 4,871. The stage 5 table predicted 16 and 4 alone.
