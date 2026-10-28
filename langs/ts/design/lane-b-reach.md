# Lane B reach: runtime representations, changed paths and schedules

Lane B draws inputs from the declared types (spec.mjs, gen.mjs). A TypeScript type names members, not how a value
holds them, so two versions that agree on every plain value of a type can still differ on a value the type admits.
Most false proofs found in October were invisible to lane B for that reason alone: it never drew the separating value
(an extra key, a prototype-name key, -0). This note describes four tiers that search for the separating input. None
of them changes what a verdict means: a WITNESS is still a concrete input on which the two observations differ, and a
PASS-bounded still states its bound.

## Tier 1: representation families (exec/repr.mjs)

A representation input reshapes the values the declared draw made. Its random streams are the draw's own, so every
other leaf keeps its value. The tier holds every REACH-th (4) generated input from the second period on: generated
inputs 5, 9, 13 and so on, outside the known phase (gen.mjs reachTurn). Every third turn holds every family the unit's
spec admits (repr.mjs applicableFamilies); the other turns hold one family alone, cycling through them. This keeps a
family that another family masks reachable on its own (accessor-key and non-enumerable-key take the same field when
both are on). Each family has its own switch (`LEAN_REACH`).

Two distributions (Semantic Assurance, section 9: report contract-respecting and semantic-adversarial inputs apart).
A contract family draws a value that a program can make with the declared type and no reflection: a wider object
(structural typing), any string as a key, a value of `any` or `unknown`, two names for one object, or the order in
which the caller and the event loop settle what the unit waits on. A reflection family draws a form that only
reflection or a cast makes: defineProperty, Object.create, delete, a symbol key, a hole, a key on an array, or a
thenable where a Promise is declared. The default (`LEAN_REACH` unset or `contract`) runs the contract families, and
their witnesses are lane B's verdict. The reflection families run when `LEAN_REACH` names them (`reflection`, `all`,
or a list). Their witnesses are differences on values the declared type does not promise. They are reported apart and
never move a default verdict: on the suite's pairs they moved 17 rows of units lane A proves (listed in the lane
report), which is evidence for the owner's open question on the input domain, not a default verdict.

| family | on | why it can separate two versions | class |
|---|---|---|---|
| extra-key | record | a spread, Object.assign, Object.keys, for-in and JSON.stringify carry an undeclared own key; fields copied one by one drop it | contract |
| inherited-key | record, dict | `in` and a read see a key on the prototype; Object.hasOwn, Object.keys, a spread and JSON.stringify do not | reflection |
| accessor-key | record, dict | a write to a getter-only field throws in strict code; a read sees its value | reflection |
| non-enumerable-key | record, dict | a read sees it; a spread, assign, keys, for-in and JSON.stringify skip it | reflection |
| symbol-key | record | a spread and assign copy an own symbol key; keys, for-in and JSON skip it | reflection |
| null-prototype | record, dict | `x.hasOwnProperty`, `String(x)` and a template literal throw; `instanceof Object` is false | reflection |
| proto-name-key | dict, string parameter | `k in d` and `d[k]` read Object.prototype where Object.hasOwn and a Map do not; `o[k] = v` with `__proto__` sets the prototype | contract |
| sparse-array | array | forEach, map, filter and for-in skip a hole; an index loop and for-of read undefined; length counts it | reflection |
| array-extra-property | array | for-in, Object.keys, Object.assign and a spread into an object carry it; for-of, map, forEach do not | reflection |
| shared-reference | 2 or more object positions | every position of one shape holds one object, and record fields link across shapes (cycles across arguments) | contract |
| coercion-hooks | any, unknown, bare type parameter | valueOf with toString, or Symbol.toPrimitive: `x + ""`, a template, String(x), `+x` and `==` take different hints | contract |
| thenable | input promise | `then` without `catch`: await accepts it, `.catch` throws, `instanceof Promise` is false, it settles later | reflection |
| settlement-order | input promises | tier 3, below | contract |
| timer-order | a file that arms timers | tier 3, below | contract |

Three families replace a leaf: proto-name-key replaces a string parameter, coercion-hooks replaces an unread value, and
thenable replaces an input promise. The replacement settles to the same value where one exists. A coercion object
replaces only a value the unit converts: an unread value whose members or elements the unit reads (a union that
usage.mjs shaped into an array or a record) keeps its fake, which answers those reads. The other families
only add structure. The shared-reference family forces the sharing that aliasInputs draws at random, and adds links
across shapes. The enumerated heaps (korat.mjs) already draw every sharing of the record shapes, so this family adds
certainty, not reach: the pair unit sharedReference is WITNESS on the base too.

Known limit of the observation, not the draw: render and the heap graph read Object.keys, so a symbol key or a
non-enumerable key that reaches the outcome is seen only through a derived value (a count, a read).

## Tier 2: changed paths (spec.mjs changedTargets, gen.mjs changedTurn)

For a unit whose two versions differ, spec.mjs reads the comparisons (<, <=, >, >=, ===, !==, ==, !=) that one
version holds and the other does not, by text. It also reads every comparison inside a condition whose text changed:
a negated condition, a swapped one or a rewritten one. A side that is a parameter path (`p`, `p.a.b`, `p.xs.length`,
or a local const holding one) becomes a target. The other side gives the values:
- a constant (a literal, or a module constant or static field the candidate's checker resolves) gives itself and its
  integer neighbours (a string gives itself, itself plus "x", and "");
- another parameter path gives a copy of that path's drawn value, plus 0, 1 or -1.

Both versions are read, so the constants on both sides of a changed comparison are drawn. A target keeps only the
values its leaf's declared type admits (a neighbour of a literal type's member is not a value of it), and a copied
value is written only where the target's type admits it. The tier holds generated
inputs 2, 6, 10 and so on, when the unit has targets. A `.length` target cuts or extends its string or array. Syntax
only: a side computed by a call, by arithmetic or from the receiver is no target. A concolic step would cover those
sides (see the measurement: the misses that remain are listed with their changed condition).

## Tier 3: schedules

- settlement-order (repr.mjs settleLater): the caller decides when its promises settle. On a turn of this family the
  input promises stay pending until the unit first subscribes to one. Then they settle one per host macrotask, in an
  order the turn picks among every order of up to four promises (beyond four, the reverse order). They are real
  promises (a subclass), so `instanceof Promise` still holds.
- timer-order (run.mjs runTimers, `legal`): the timers due at one instant fire in another order, but only one that
  the event loop allows. A timer may run before an earlier-armed one of a different kind, for example an immediate
  before a timeout. Two timeouts or intervals keep their arm order: Node fires equal delays in arm order, and the
  queue does not keep the delay, so lean cannot tell when a swap would be legal. The JSX schedule explorer passes no
  flag and keeps every order of the ties, as before.
- The promises the world answers are the race explorer's (design/schedules.md), not this tier's.

run.mjs lines touched: the observe call of runTimers (the timer-order permutation and the legal flag) and runTimers
(mayPrecede and the legal pick). Nothing else in run.mjs changes.

## Tier 4: minimisation (repr.mjs minimizeWitness, minimizeFamilies)

A witness on a representation input carries every family of its turn. `node exec/repr.mjs --minimize --parent p
--candidate c --unit u --input i` re-runs lane B on inputs 0 to i. It switches off one family at a time with
LEAN_REACH, and keeps a removal while input i still witnesses (Hypothesis: shrink the generating decisions, and keep a
step only when the same difference reproduces). It has a budget of its own (16 runs by default), and reports
`before`, `after`, `runs` and `seconds`.

## Soundness

A tier only adds inputs that the declared type admits at run time: a structural value, a value of an unread type, or
an order the event loop allows. So a WITNESS it finds is a real difference of the two versions on such an input.
Generated input i stays the same draw except for the leaves its tier reshapes, so a replay with the same seed draws the
same input. A reshaped input can move which input witnesses first; the measurement checks that no row lost a WITNESS.

## Measurement

See the lane report (harness/lanes/lane-b-reach.md) for the counts before and after on the 143 planted mutants, the
pairs, and the clean units.
