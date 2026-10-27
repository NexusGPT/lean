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

## Equal up to allocation

In the proof lane the heap is a map from references to cells, and a fresh cell takes the next address. Two runs that allocate the same cells in another order, or allocate a cell nobody keeps, end in different heaps and the same observation. A heap-core unit therefore carries two readings of equality: the whole heap (`Equal_<f>`), and the canonical heap (`EqualCanon_<f>_*`, five parts): the initial cells agree, literally or after a renaming of fresh references; the fresh cells reached from the roots (the reference parameters, then the result) agree after renaming in first-reach order; the roots' names agree; no fresh reference stays unnamed on either side; a primitive result agrees. A fresh cell the walk cannot reach (hooked below an initial record that is not a root, or into an initial container) stays unnamed and the certificate fails: ASK, never a proof. Either reading proves the unit; `lanes.A.reading` names which. Definition and limits: `design/canonical-heap.md`.

## Equal by identity

A function whose text is identical on both sides (comments removed, whitespace folded, suffixes stripped) is the same function; the theorem aliases the candidate's definition to the parent's. No proof is needed for unchanged code.

## Scope

S is written by the requester as function names, input predicates over the parameters, and effect operations allowed to change. Nothing is inferred from the request text.

## Opaque blocks

A statement the proof lane does not model (try/catch, a `while` without a bound) is one uninterpreted transition of the world, named by the block's own text. It takes the locals the block reads and the receiver; it returns the locals the block assigns and, when the block may return, the function's result. The same text on both sides is the same transition. The name also lists the same-file functions the block calls; when one of them changed, the theorem refuses the block (ASK), because the same text no longer means the same transition.

## Recursion

A function on a recursive cycle (alone or with others) takes a fuel. Every call on the cycle passes one less; at zero the function yields an uninterpreted out-of-fuel value. A caller outside the cycle passes an uninterpreted starting fuel. The theorem quantifies over the fuel: equal for every fuel. A function whose text is identical on both sides but whose recursive sibling changed is not aliased, and its proof needs an induction the theorem does not yet write: ASK.

## Lane B (bounded execution)

Both versions run in one process, each in its own sandbox, against the same fakes: every import that leaves the package, every global that reaches the outside, every field of a receiver. A fake records what is asked of it; its answers come from the seed and the path, the same on both sides; a call made twice is two values. Clock requests are recorded in order and receive advancing seeded instants. Inputs come from the parameter types: first the small heaps of the record shapes, enumerated (every assignment of the reference fields and arguments over a pool of two objects per shape, so every sharing and every cycle, one input per non-isomorphic graph, `exec/korat.mjs`), then boundary values first, recursive shapes unfolded to depth three. The observation is the one above; a difference on any input is a WITNESS with that input; none on n inputs is PASS-bounded, which states n, the seed, the fake policy and the time limit, and never becomes a proof.

For a method of a class, programs run first: twelve seeded programs of one to five commands on one instance per side, built by the class's own constructor with drawn arguments; a command is a call of the method itself or of a method whose text is the same on both sides, with drawn arguments, and every program ends with the method itself. After each command the two sides' observations are compared; the first divergence is shrunk by deleting commands while a divergence stays, and the shrunk program is a WITNESS (`exec/programs.mjs`). A clean run states the program and command counts (`bound.programs`); it never becomes a proof.

For a free function, environment programs run after the single calls agree: what the environment may do later with what the unit handed it. The commands are a call of the unit, an invocation of a function it returned, a firing of a callback it handed to a fake, a tick of the timers it armed, a settling of the jobs it queued, and a step of a generator it returned (`next`, `throw`, `return`); each command runs on both sides and compares the outcome, the requests made since the previous command and the pending count, never the graph. The programs are drawn and shrunk by fast-check's model-based commands (vendored under `langs/ts/vendor`): a divergence is a WITNESS carrying the shrunk program, its seed, its run path and the commands' replay path, and the certificate reports the replay as run (`exec/program.mjs`). A clean run states the program count (`bound.environmentPrograms`); it never becomes a proof.

While the unit runs, every call of a library-table operation (`translate/library.json`: the array, Map, Set and Object.assign rows) made from the unit's own files is recorded with its receiver before and after, its arguments and its result, and checked against the row (`exec/transitions.mjs`). The certificate carries the counts per operation (`bound.library`). A record the row contradicts is a defect of the table, not of the unit: lane B's verdict stands, and the proof lane refuses the operation (`ASK:library-model`) until the row is corrected.

## Explicit operands

Four dynamic forms are read as explicit operands rather than refused. A free function's declared `this` parameter is its receiver operand, an ordinary first parameter; `f.call(o, a)` and `f.apply(o, [a])` on a same-file function are the call with that operand (a function without a `this` parameter ignores it); `bind` stays outside. `arguments[k]` with a literal `k` below the declared parameters is that parameter; `arguments.length` and every other use stay outside, since the actual vector is not the declared one. Loose equality between primitives (number, string, boolean, null, undefined) follows the ECMAScript coercion table member by member on a union, the string side converted by the one uninterpreted ToNumber that `Number(s)` uses; an object, bigint or symbol operand stays outside. `Object.create(null)` typed as a dictionary is the empty dictionary; every other prototype operation stays outside. A dictionary read states its missing-key result.

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
