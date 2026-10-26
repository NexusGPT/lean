# Mixed logical values and conditional effects

JavaScript evaluates the left operand of `&&` or `||` once. `&&` returns that
value when falsy, otherwise the right operand. `||` returns it when truthy,
otherwise the right operand. Only the selected right operand runs. `?:` evaluates
its condition once and runs one arm. `??` selects on absence, preserving zero,
false and the empty string. Truthiness does not call an object's valueOf.

## Reading

A fresh binding holds the deciding operand. Its static representation supplies
truthiness: booleans directly, numeric zero, string length, absence constructors,
and sum-member payloads. Both alternatives lift into the expression's sum,
Option or Nullish type. A truthy optional left operand of `||` projects its
payload only under Some. Primitive sum widening retains each payload; boolean
true/false alternatives share a boolean member. Null and Undef remain distinct.
Numbers retain the existing finite int/real envelope. Special numeric forms keep
the numeric lane's opacity or refusal; this reading does not claim exact NaN.
Unknown, generic and opaque-handle truth tests use a predicate keyed by the
logical expression text. This conservative reading admits an ordinary object's
always-true interpretation without assuming facts about opaque representations.

An effectful arm returns `(World, value)` with its pending transitions inside
that arm. The world outside becomes the chosen world. A logical value used as
an if/ternary condition goes through the same expression reader, preventing
the condition reader from eagerly hoisting its right-side transitions.
The existing ternary branch-with-world form now inherits this condition fix.

Generated body for `on ? this.port.text() : "cached"`:
```dafny
var (wld, t13_) := if on then (
  var (wld, t12_) := ext_call_args_Ext_Port_text_World_Ext_Port(wld, ext_Ext_Service_port_Ext_Service(self));
  (wld, t12_)
) else (wld, "cached");
(wld, t13_)
```

## Boundaries and soundness

Re-reading an effectful left operand adds a transition even if its values happen
to agree. The single binding prevents that. Eagerly reading a right operand
changes the world on a skipped branch. Capturing its transitions inside the
chosen arm prevents that, including nested logical conditions. The pair has
negative controls for both mistakes and refactors to explicit if statements.
At baseline 03ec3bc, eagerCondition and leftDuplicate both proved equal despite
lane B witnesses. This reading fixes those soundness defects: both lemmas now
remain unproved, and the corresponding faithful refactors prove.
Sum conversion preserves the constructor's payload rather than inventing an
opaque cast that loses a provable relationship between branch values.

The new `conditional-effect` lint rule refuses same-file calls in conditional
arms or short-circuit right sides that mutate arguments, including indirect
calls. The expression pair has no output slot for these updated local values.
An explicit if carries them through the existing statement reader. Existing
`operator-value-context` still refuses assignment/update values in these arms.
Both refusals have escape fixtures. Unknown truthiness gains no refusal.

Lane B executes native JavaScript with recording port fakes. The pair checks
returned mixed values and ordered calls; typed scalar inputs reach zero and
the empty string. Nullable unions and both ternary arms are also exercised.
The bounded input generator can miss a scalar boundary within a nullable union,
so the two required defaulting witnesses use scalar parameter types directly.

## Real instances inspected

Paths are relative to the census repos under
`/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos`.
- `agent-nexus/packages/cli/src/util/body-satisfies-required.population.ts:35`,
  findJsonBodyOption: logical predicate values enter the reading.
- `langchainjs/libs/langchain-core/src/testing/matchers.ts:329`,
  toHaveBeenInterrupted: logical values present; unrelated `this` refusal remains.
- `langchainjs/libs/langchain-core/src/utils/zod-to-json-schema/parsers/nullable.ts:16`,
  parseNullableDef: logical guards present; unsupported return union remains.
- `nexus-linkedin-dashboard/lib/read-models/health.ts:933`, syncLogLine:
  coalescing and ternary values enter the existing tagged absence reading.
- `status/src/ui/incident-cards.ts:193`, effectCard: logical predicates and
  conditional values enter; reference-valued operations retain existing rules.
- `nutshell/core/claude-wire/src/claude-provider-notice-lines.ts:53`, splitOnce:
  pure ternary sequence values enter the existing branch reading.
