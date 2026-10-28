# A ref cell write inside a function React holds: a cell step of the handler

The construct: `const r = useRef(0)` in a component, and `r.current = v` as a statement of a function React holds: a
JSX attribute value (`onClick={() => { r.current = props.id; }}`), an effect argument, a `useCallback` argument, or a
`const` arrow every reference of which is held so. Before this reading the lint admitted such a write (`cellWrite`,
except inside a `useCallback` argument), lane B's interpreter stepped the cell, and lane A kept the whole handler as
one function value keyed by its text and captures: a reorder of two writes was PASS-bounded, never proved.

## The meaning

`useRef` returns the same object on every render; `r.current = v` writes its property and triggers no re-render (React
docs, "useRef": "changing a ref does not trigger a re-render"). A held function runs later than the render, when React
calls it (an event, an effect after commit), with the render's captures. Its statements run in order over the world
(ECMA-262 10.2.1): a write puts the next value in the box, a later `r.current` reads what the box holds then.

## The reading

A held function whose statements are a straight list (calls with pure arguments, slot setter calls, `const` locals, a
return, and cell writes `r.current = v` with `v` pure) is read as its steps, the same descriptor lane B's interpreter
reads (`handlers.mjs` `readHandler` with `cellSteps`), so the translator and the interpreter step the same list. A cell
write is the step `ReactCall("ref:set", [ReactAtom(r)], [v], false)`: the box, then its next value; a read `r.current`
in a later step stays `ReactExpr("get:current", [ReactAtom(r)])`, read when that step runs. The handler value is the
uninterpreted `react_handler_<T>(ReactHandler(steps))`, so equal step lists are equal handlers and nothing else is.
Effects and `useCallback` arguments holding a cell write join (`cellWriter` in `translate.mjs`: `heldFunction` plus a
statement that `cellWrite` admits, the lint's own predicate); an effect without one keeps its text key, as before.
Pair unit `WriteReorder`, parent side:

    ReactHandler([ReactCall("ref:set", [ReactAtom(ext_Any_of_Rec_1t4f5ik_Rec_1t4f5ik(id))], [ReactExpr("get:id", ...)], false),
                  ReactCall("ref:set", [ReactAtom(ext_Any_of_Rec_1t4f5ik_Rec_1t4f5ik(label_))], [ReactExpr("get:label", ...)], false)])

Commuting writes: a run of adjacent cell steps on pairwise distinct cells, no value of the run reading (directly or
through a handler local) a cell the run writes, is put in the order of the cells' hook ordinals (the n-th `useRef`
call of the unit, `captureKind`'s `at`). Two ordinals are two `useRef` calls, so two distinct objects of one render:
each step writes its own box and reads none the others write, so every order of the run leaves the same boxes. The
candidate's other order then renders the same step list and the lemma proves.

## Soundness

- A dropped write, another written value, another cell: another step list; the atom of a cell is the value of its own
  `useRef` transition, which the prover cannot equate with another cell's. Not proved (`WriteRead`, `WriteValue`).
- A write whose value reads a cell another write of the run writes (`a.current = x; b.current = a.current`): the run
  keeps its order, so the other order is another list (`ChainReorder`, not proved, lane B WITNESS).
- Two writes of one cell: the run keeps its order (the last write wins).
- A cell write never moves past a call, a setter or a return: only adjacent cell steps are reordered.
- A handler local read after a cell step that writes a cell the local's initializer reads would read the new content
  in its place: `readHandler` refuses it (`handler-read-moved-past-call`), and the handler stays one text-keyed value.
- A cell handed elsewhere has no capture entry (`refCell`: only `.current`, a `ref` attribute, a dependency), so no
  other code holds the box during the handler's own steps.

## Stays refused

A write during the render, or inside `useMemo` (which runs during the render): `react-handler-capture` (escape
`handler_capture_unknown`, `renderWrite` and `memoWrite`). A held function whose statements are not a straight list
(a branch, a loop, `await`) keeps the text-keyed reading: a dropped or reordered write there is never proved equal.
A `useCallback` argument is no longer refused: the reading above reads it as it reads a JSX handler.

## Lint

The closure-mutation branch of a record field write admits `r.current = v` by `cellWrite` (lint.mjs, the condition
beside `ownedHere`); `cellWrite` no longer excludes a `useCallback` argument, since the translator reads it.

## Lane B

Unchanged: the interpreter steps the same descriptor. `HeldReorder` (a `useCallback` handler) fires 24 handlers, none
interpretable (measured by `exec/run.mjs`), PASS-bounded; `WriteReorder` 24 of 24 agreed.
