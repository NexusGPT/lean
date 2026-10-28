# Spread outside callees and record rest

JavaScript evaluates a receiver, then arguments from left to right. A spread iterates its
operand now, inserting each element in order. It does not pass the array as one JS argument.
Object rest copies the remaining own enumerable fields into a fresh shallow object.

## Reading

An imported function or opaque method receives one sequence containing the complete argument
list: `f(a, ...xs, b)` becomes `ext_call_seq_f(wld, [a] + xs + [b])`.
The result is `(World, R)` for an effect, or `R` for an existing pure external.
The receiver is still a separate argument. Homogeneous arguments retain their element type;
heterogeneous arguments use elementwise opaque conversions to `Any`. Array-to-Any is not
used, since that would lose the argument list's length and concatenation structure.
Argument values are captured in order when their evaluation hoists a transition or update.
Spread and nonspread calls use disjoint `call_seq` / `call_args` name prefixes, so a function
named `f_seq` cannot collide with a spread call of `f`. Their signatures remain separate; equivalent spread grouping proves,
but a refactor to separate positional arguments may need another normalization pass.

`Math.max` and `Math.min` fold a nonempty numeric sequence, including every argument.
For example `MaxSeq_int(xs)` requires `|xs| > 0`, then recursively combines head and tail.
The ordinary two-argument helper is retained. One argument is itself. Sequence arguments
must have numeric types; opaque values needing JavaScript coercion stay `spread` refusals.
An explicit scalar argument or a nonspread element of an array literal guarantees nonemptiness.
A sole identifier spread can also be guarded in the immediately enclosing conditional
expression, for example `xs.length > 0 ? Math.max(...xs) : 0`.
The lint refuses other possibly empty forms as `math-empty`; `Math.max()` is negative infinity
and `Math.min()` positive infinity, neither representable by the existing int/real model.
The verifier still checks the fold precondition; no assumption encodes the guard.

Array literals `[...a, ...b]` already concatenate sequences. Statement-form `arr.push(...xs)`
already uses `arr := arr + xs`, including parameters through references layer 1.
The same reading now accepts multiple ordinary and spread arguments; `unshift` prepends.
Using push's numeric result remains refused. Alias and closure mutation gates remain in force.

A record rest with a known nonempty remainder constructs its inferred datatype from the
source's remaining fields, in canonical field order. For `{a, ...rest}` on `{a, b, c}`:
`var rest := Rec_bc(r.b, r.c);`. Renamed exclusions remove the source key, not the binding name.
Admission is deliberately restricted to plain fixed records whose fields are scalar values
(or optional scalars), static identifier/string keys, and no pattern defaults.
`record-rest` refuses dictionaries, unknown/union/class/accessor shapes, empty remainders,
nested reference fields and computed exclusions. These need keys, enumerability, or shallow
alias tracking that the datatype model cannot supply. It uses the existing closed record
value model: runtime properties absent from the declared shape are outside that model.

## Soundness and lanes

Identical operation, receiver, world and sequence denote the same call. A changed element,
length or order changes the argument term; no injectivity or equality axiom is imposed on the
external's result. Thus a changed request cannot be silently normalized to the old one.
Sequence concatenation gives exact argument placement even between other arguments.
Only ordinary arrays are admitted in calls; tuples, sets and custom iterators stay `spread`
refusals because iteration order, effects or their tuple representation differ.
Local function values, optional method spreads and exact builtins without sequence rules
also stay refused. A same-file call inside conditionally evaluated spread arguments is refused
as `spread`: conditional expressions do not return its mutated parameters. Use an if statement.
Spread array literals are flattened before consulting their tuple type.
Numeric folds inherit lean's exact-int/real axiom, not IEEE NaN, signed zero or rounding.
Record rest copies scalar values, so changing rest cannot mutate the source through an alias.
Lane B executes native spread/rest, records outside-call argument lists, and compares mutation.
Tests exercise empty arrays, guards, changed call traces, receivers, parameter mutation,
concatenation, mixed argument types and changed/unchanged remainder fields.

## Census instances inspected

Paths below are relative to the read-only census root
`/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos/`.
- `status/src/domain/latency-threshold.ts:261`: array copy and sort already enter.
- `nutshell/kits/ui/src/theme/derive-theme.ts:55`: unguarded min spread stays `math-empty`.
- `langchainjs/libs/langchain-classic/src/chains/conversational_retrieval_chain.ts:303`:
  options rest has defaults and reference fields, so stays `record-rest`.
- `nutshell/tools/proof-host/src/chat-sweep-notice-scenarios.ts:113`: dictionary rest stays refused.
- `langchainjs/libs/providers/langchain-anthropic/src/chat_models.ts:1582`:
  response rest needs a known scalar record shape; opaque/dictionary response stays refused.

The concept bench uses the harness stable crc32 seed for identical before/after samples.
