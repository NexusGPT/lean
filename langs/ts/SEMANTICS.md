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

In the proof lane every effectful call takes the current world and returns the next one. A function with an effect takes `wld: World` first and returns `(World, R)`. The world is threaded in source order; an effect under a condition that a value decides (`a && f()`, `c ? f() : g()`, a callback) is refused, because its position in the order is not fixed by the translation.

A parent and a candidate are compared under the same initial world. When one side asks the environment something the other never asked, no answer is invented for it: the world token makes the two histories different values, and equality is not provable.

## Equal by identity

A function whose text is identical on both sides (comments removed, whitespace folded, suffixes stripped) is the same function; the theorem aliases the candidate's definition to the parent's. No proof is needed for unchanged code.

## Scope

S is written by the requester as function names, input predicates over the parameters, and effect operations allowed to change. Nothing is inferred from the request text.

## What stays outside

Unbounded loops without a readable bound, recursion without a readable measure, inheritance, generators, more than one asynchronous schedule, code the repository does not contain. Each is an ASK with its reason, never a PASS.
