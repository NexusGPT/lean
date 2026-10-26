# What "equal" means (lean-ts version 3)

The checker compares a parent and a candidate version of a function. It says PASS only under the definition below.

## Observation

One call of a function on one input observes:

1. **outcome**: the returned value or the thrown value;
2. **reachable mutation**: every object reachable from the arguments and the receiver before the call, field by field after the call;
3. **effect trace**: the ordered list of effect requests (operation, arguments) and the environment's responses;
4. **pending work**: promises returned unsettled, timers armed, jobs queued.

Two versions are **equal outside the scope S** when, for every input outside S and every environment history, their observations are identical up to the heap correspondence. Allocation addresses never count. Aliasing counts: two references to one object stay two references to one object.

## The world axiom

An effect is a transition of a world: `effect(w, op, args) = (w', result)`. The same operation on the same arguments in the same world gives the same result; in a different world it may not. Two reads of the clock are two transitions.

In the proof lane every effectful call takes the current world and returns the next one. A function with an effect takes `wld: World` first and returns `(World, R)`. The world is threaded in source order; a logical operand or conditional branch returns its world and value only when selected. The deciding operand is evaluated once. Conditional calls that update value-model arguments remain refused as `conditional-effect`; use an explicit `if` branch.

A parent and a candidate are compared under the same initial world. When one side asks the environment something the other never asked, no answer is invented for it: the world token makes the two histories different values, and equality is not provable.

## Equal by identity

A function whose text is identical on both sides (comments removed, whitespace folded, suffixes stripped) is the same function; the theorem aliases the candidate's definition to the parent's. No proof is needed for unchanged code.

## Scope

S is written by the requester as function names, input predicates over the parameters, and effect operations allowed to change. Nothing is inferred from the request text.

## Opaque blocks

A statement the proof lane does not model (try/catch, a `while` without a bound) is one uninterpreted transition of the world, named by the block's own text. It takes the locals the block reads and the receiver; it returns the locals the block assigns and, when the block may return, the function's result. The same text on both sides is the same transition. The name also lists the same-file functions the block calls; when one of them changed, the theorem refuses the block (ASK), because the same text no longer means the same transition.

## Recursion

A function on a recursive cycle (alone or with others) takes a fuel. Every call on the cycle passes one less; at zero the function yields an uninterpreted out-of-fuel value. A caller outside the cycle passes an uninterpreted starting fuel. The theorem quantifies over the fuel: equal for every fuel. A function whose text is identical on both sides but whose recursive sibling changed is not aliased, and its proof needs an induction the theorem does not yet write: ASK.

## Lane B (bounded execution)

Both versions run in one process, each in its own sandbox, against the same fakes: every import that leaves the package, every global that reaches the outside, every field of a receiver. A fake records what is asked of it; its answers come from the seed and the path, the same on both sides; a call made twice is two values. Clock requests are recorded in order and receive advancing seeded instants. Inputs come from the parameter types, boundary values first, recursive shapes unfolded to depth three. The observation is the one above; a difference on any input is a WITNESS with that input; none on n inputs is PASS-bounded, which states n, the seed, the fake policy and the time limit, and never becomes a proof.

## What stays outside

Assignment to a field of `this`, `super`, generators, closures that change an outer variable, mutation of a parameter, more than one asynchronous schedule, code the repository does not contain. Each is an ASK with its reason, never a PASS.

## A unit without a parent

A candidate-only unit has no equality proposition. Lane B links and loads its module under
recording fakes, then draws inputs using the paired input policy. It returns `NEW` with
`loaded`, `inputs`, `seed`, `fakes`, `faults`, `traceShape`, `bound` and `assumptions`.
Input throws are observations. Only local unresolved source or absent local named exports
are `REFUSE` with `kind: load`, the file and real loader error. Evaluation failures are
ASK with their environment class; generated output, external resolution failures and
test modules are ASK. Test modules are excluded before loading. Budgets are ASK. Neither `NEW` nor `REFUSE(load)`
is a PASS, and neither enters the proof lane. Declared packages are provided as fakes;
local and aliased imports link their source, and undeclared packages use Node resolution.
