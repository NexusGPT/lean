# Exact type tests

JavaScript `instanceof` asks whether a constructor's prototype occurs in the value's
prototype chain (or invokes a custom Symbol.hasInstance). `Array.isArray` tests the
array brand. `typeof` reports a runtime tag. `in` includes inherited properties.

The old representation erases record and mixed unions to Any, including narrowed
branch reads. This reading adds a sum datatype for records with distinct literal
tags and for disjoint primitive/array alternatives. Each constructor carries its
member's value. Narrowed identifiers project that payload; common field reads
branch on the constructor. Literal tag reads use the member's declared literal.
Overlapping, generic and untagged class unions retain Any.

`instanceof` is exact for nominal instances of ordinary same-file classes: a private,
protected or #field makes a class nominal. Public structural class types admit
plain records and therefore never establish prototype membership. A nominal
member is certainly an instance of itself and every base in its ancestry, even a public base. A test
is constant true only if every possible member satisfies that rule. Testing a
base-typed value against a subclass is not constant false. A member is certainly
outside a nominal target when their literal tags conflict; other cases stay
uninterpreted. A represented union combines these decisions with constructor
tests. Custom membership hooks and dynamic constructor expressions are refused.
Unknown catch values, including `e instanceof HttpError`, stay uninterpreted.

Array tests are exact for arrays and primitive non-arrays, including their sum.
Structural records may describe arrays, so no negative array fact follows.
Optional opaque unions require every present member to agree; generic T may be an array.
`typeof` uses the sum constructor where every member has a known runtime tag.
An Option with only null absent reports "object"; with only undefined absent it
reports "undefined". Both absences together retain an uninterpreted reading.
Nullish narrowing continues to use Option; null versus undefined remains the
existing model limitation, outside this reading.

A required field makes `"k" in x` true. A missing declaration cannot make it false:
TypeScript records are open and may carry extra or inherited keys. On a record
union the required branches are true and other branches are uninterpreted tests
of their payloads. Optional presence is not the same as a non-undefined value.
Thus a key decides a member only when all alternatives have justified presence
facts; a missing-key record alone supplies no such fact.

The lint retains opaque types (`never`, `object`, symbols), admits the sum shapes,
and refuses dynamic/custom constructors and constructor values as `instanceof-constructor`.
A strict absence comparison on a mixed primitive/array union is admitted.
`type-test-cast` refuses assertions that invent nominal, array, sum or literal-tag facts;
otherwise a cast from unknown could incorrectly make a runtime test constant.
Lane B executes real JavaScript and generates all record/array alternatives.
Its class parameter generator supplies plain records without prototypes, a known
gap: the class branch-swap witness tests false branches; local `new` probes test
real nominal instances. No nominal input axiom is added for public classes.

The pair proves a refactor from a local nominal-instance test to the input record's
literal tag, with identical construction transitions on both sides. `tagRead`
proves branch-specific field reads (the old Any reading was not exact).
Generated examples from the pair (constructor names are stable type hashes):
```dafny
datatype Union_3765p6 = Union_3765p6_0(item0: A) | Union_3765p6_1(item1: B)
// classChange branches on this constructor decision
// (if u_3t25.Union_3765p6_0? then true else false)
function unknown_test_parent(e: Any): bool { ext_instanceof_Error_Any(e) }
```
`never`, `object` and symbol values retain Any; symbol typeof tags remain exact.
Unrepresented unions, arbitrary casts and mutation of a narrowed union are not
made exact by this reading. Generic T | T[] can overlap and remains opaque.
The negative controls keep structural-class and open-key refactors unproved.

Census instances read (all paths start at the read-only census root
`/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos`):
- `nutshell/extensions/nexus/src/node/agents/remove-agent.ts:104`, removeFile:
  unknown catch instanceof stays uninterpreted; no nominal fact.
- `nutshell/adapters/claude-cli/src/sessions/background-task-output.ts:10`, isNotThere:
  unknown error membership and undeclared code presence stay uninterpreted.
- `agent-nexus/packages/cli/src/util/mcp-rpc.bridge.ts:66`, createBridgeForwarder:
  unknown catch instanceof stays uninterpreted.
- `nutshell/adapters/project-records/src/json-values.ts:15`, errorCodeOf:
  unknown typeof and record key presence stay uninterpreted.
- `apps-ui/src/hooks/useFlipScan.ts:89`, normSkip:
  string/array/undefined sum, truthiness and array membership enter the exact reading.
See `results-bench/type-tests-validation.md` and the stable benchmark artifacts.
A direct sandbox probe supplies new A/new B/new Derived and a record with an extra
key; their observations confirm the negative controls beyond generated inputs.
