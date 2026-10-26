# React handlers and memo values

A render maps props and hook state to an element tree. A handler in that tree is
future behavior, not a call during render. Function address identity is outside
this value model; equality of handlers means equal behavior on invocation.

A synchronous zero-argument arrow containing a straight sequence of calls with
pure captured arguments is a symbolic ReactHandler, with ordered ReactCall steps.
Each step retains the callee, its receiver, deferred argument expressions, and whether its result is
returned. A pure final return is a ReactReturn. No call runs while constructing
this value. For example, a service handler has the shape:
`ReactHandler([ReactCall("import:service:save", [], [ReactExpr("get:id", [ReactAtom(ext_Any_of_Props_Props(props))])], true)])`.
A typed uninterpreted function turns this descriptor into the callable value.
Equal descriptors imply equal requests, results and faults in every invocation
world. Unequal descriptors need not be proved unequal, but cannot force equality.
Property reads and operators remain deferred, preserving reads after earlier calls.
Pure callbacks retain the existing lambda reading. Arbitrary function extensional
equality is not a decision procedure: storing a World -> (World, Unit) lambda
would require new application and equality rules, so this reading uses data.
The callable wrapper is an uninterpreted handle keyed by that data; equality
uses constructor congruence, not a guessed extensional-equality axiom. A focused
Dafny probe leaves equality of arbitrary `() -> Unit` values unproved.

Bodies with event parameters, branches, async work, local declarations, nested
calls or dependent results stay opaque by exact text AND captured values.
Opaque keys encode exact text and import origins as hex, avoiding hash collisions
and the theorem scanner treating source-string comments as Dafny comments.
Same-file callees are declared as dependencies so a changed callee invalidates
an opaque equality. Captured locals must not be reassigned or mutated by the
render or declared after closure creation; the named refusal is `react-handler-capture`. Existing closure mutation
rules still apply. Deferred callee application is a transition carrying its value.

React caches useMemo and useCallback across renders. Omitting a dependency can
preserve an old value or closure, so purity alone does not justify erasure.
For a zero-argument useMemo arrow with a pure scalar expression, and dependencies
covering its local captures, the value equals the current expression. Calls,
allocation and world reads are excluded from this exact case. The result uses
ordinary expression translation. Dependency evaluation must also be pure.
useCallback(f, deps) is f when f is an arrow (or a const arrow) and its captures
are covered. Other memo/callback forms remain transitions with opaque callbacks.
Only imports from react are recognized, including named and namespace aliases;
a local or unrelated function named useMemo retains its ordinary call meaning.

useEffect stays a scheduling transition carrying the body as an opaque value
with its captures. Its body runs after render; recording its registration during
render preserves the order of pending requests without executing the effect.
useState remains a world transition returning current state and a setter value.
The initial argument does not replace current state. Setter calls are deferred
world transitions on that captured setter, so hook slots and component instances
remain distinguished by the world-returned value.

Lane B supplies React hook semantics in the sandbox: memo computes a value,
callback returns its function, state supplies a value and recording setter, and
effects register pending work. Returned JSX handlers are exercised after render;
the observation includes their results and ordered service/setter requests.
This is a bounded mount-render observation, not a proof about React scheduling.
Props and records use the repository's existing value/heap assumptions. Functional
state updaters and event-argument handlers remain opaque, with captured values.

The pair covers rewiring a service argument, call order, captured locals, memo
changes, callback extraction, state reads/setters, effect registration and an
untouched component. Escape fixtures cover unsafe captured mutable locals.

Read-only census instances inspected (paths relative to the absolute census root
`/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos`):
- `nutshell/kits/ui/src/ToolCallRow/cards/demo.tsx:33`: Row enters; functional setter stays opaque with captures.
- `apps-ui/demo/src/sections/charts-page.tsx:65`: TimeSeriesDemo enters; functional setters stay opaque.
- `nutshell/modules/rail/src/rail-name-field.tsx:8`: event switch stays opaque; type nesting blocks the unit before this reading.
- `nutshell/extensions/nexus/src/browser/settings/nexus-page.tsx:132`: WhileInstalling enters; custom hook remains a transition.
- `nexus-learning/apps/web/components/app-shell-nav.tsx:49`: ClaudeCodeHint enters; custom hook remains a transition.

Measured commands and outputs: `results-bench/react-validation.md`.
Broader memo expressions, event parameters and render-history execution stay open.
