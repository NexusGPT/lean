# Handler identity: a function the tree holds is its descriptor, not its text

The construct: a function value a rendered unit puts in its element tree and lane B never fires, a JSX attribute not
named `on[A-Z]` (`<Row select={() => { setPicked(props.id); save(props.id); }} />`, a `close`, a `next`, a `setOpen`
handed to a child). JavaScript gives such a value no identity a caller can use beyond what it does when called: the
child calls it with some arguments, and it makes requests, sets slots and returns a value.

## The ground (measured on dcbc61c)

Lane B fires every `on[A-Z]` function of the tree on a fake event and observes the slots it leaves and what it returned
(`observeJsx`), and the command sequences and the finite lane erase every function prop to `fn`. A rewritten `on[A-Z]`
handler is therefore never compared by text: `onClick` with a renamed local and a hoisted const gave PASS-proved, and
with a branch or a for-of in place of a forEach PASS-bounded (`check.mjs --no-project --n 30`). The text key bit only on a function the tree holds
unfired: `render()` (`exec/fake.mjs`) writes it as `{ $fn, src }`, the hash of its source text. So a held handler
rewritten in place was a WITNESS by construction (pair `handler_identity`, Picker, at dcbc61c: WITNESS; lane A
already proved it), and two held handlers of the same text were equal whatever they captured (probe SameText,
`const k = props.id + 1` against `+ 2`, both `select={() => save(k)}`: PASS-bounded at dcbc61c).

## The reading (`exec/handlers-interp.mjs`, `keyHandlers`, `handlerKey`)

After the render settles and before lane B fires anything, each held function of the unit's own elements is replaced
by its key. The descriptor is the one the proof lane reads (`handlers.mjs readHandler`), met at the attribute's
source position (the loader now marks every JSX attribute value, `exec/run.mjs leanMarks`). Each node of a step becomes
a term: a literal or a capture (a state value, a prop binding, a render `const`, a module `const`) is the value the
closure holds now, read by the interpreter's evaluator; a use of the handler's own parameter is `{param: k}`; a
handler `const` stands for its initializer; a property read of an object is deferred, `{get, of}` (the field is read
when the handler runs), of a primitive is read now; an operator over fixed primitives is computed, else kept as a
term. Steps: `{call, recv, args, returns}` for a request; the setter calls between two requests are one block of
slots, each slot keeping its calls in order (`{sets: [[slot, [{next} | {updater}]]]}`); a return; the body ends at the
first step that returns. The key is `{ $fn: 'handler', descriptor: <the steps as one JSON string> }`, so the tree's
depth bound never cuts it. Example, `handler_identity` PickerSetter, candidate:

    [{"sets":[[0,[{"next":{"get":"id","of":{"v":{"count":0,"id":9007199254740991,"label":"a"}}}}]],[1,[{"next":{"v":0}}]]]},
     {"call":"import:service:save","recv":[],"args":[{"get":"id","of":{"v":{...}}}],"returns":false}]

A WITNESS whose trees differ in a held function carries `where.handler` (`handlerDifference`): the prop and the first
differing step, e.g. `step 1: the candidate also sets slot 1 to 0`, or `keyed by text: ... (handler-statement:IfStatement)`.

## What stays a text key, by escape name

`readHandler` now names why it stops (`ctx.escape`, read by no one else): `handler-not-an-arrow`, `handler-async`,
`handler-parameter-pattern`, `handler-not-held-by-react`, `handler-let-or-several-declarations`,
`handler-local-not-pure`, `handler-read-moved-past-call`, `handler-statement:<kind>` (a branch, a loop, a try),
`handler-expression:<kind>` (an assignment, `void`), `handler-unit-call`, `handler-callee`, `handler-receiver`,
`handler-argument-not-pure`. The key adds `handler-not-an-attribute-value`, `handler-outside-the-unit` (a child's own
attribute under `--deep`, which closes over the child's frame), and `handler-capture: <why>` (a capture the evaluator
does not read, a call of a local function value, a draw from a fake). Such a function keeps `{ $fn, src }` plus its
`escape`. Its text is now the function's own text: the loader's marks are left out of the hash (`compileWithSites`),
since their positions move with the lines above.

## Soundness

Two different behaviours must never share a key. The steps are the reader's (the interpreter checks them against the
real fire, `ASK:handler-model`); a capture is the value the closure holds when the tree is observed, so two closures of
one text with different captures now differ; a deferred read keeps its path, so `save(props.id)` (read when called)
and `const id = props.id; save(id)` (read at render) differ, as in lane A; a request may fault, so no set moves across
one; two slots are independent in the hook runtime (a setter writes its own slot), so their order inside a block is
dropped, and one slot's calls keep their order (`setA(1); setA(2)` against `setA(2); setA(1)`: WITNESS). Values are
rendered by `render()`, so a captured object deeper than its six levels is cut as the rest of the tree is. A key
difference is a descriptor difference: the function values differ, though an input on which the two calls give the
same result may exist (`props.id` against `props.count` when both are equal). Lane A is unchanged (`translate.mjs`
renders the same steps in order, so the reordered TwoSlots stays unproved).

## The pair `handler_identity`

Picker: the held `select` hoisted into `const choose` with a local, PASS-proved (lane B PASS-bounded: the child is a
handle at depth 0, nothing fires, the keys agree on 30 inputs; lane A proves the descriptors equal). PickerSetter:
WITNESS, `step 1: the candidate also sets slot 1 to 0`. PickerProp: WITNESS, `props.count` for `props.id`.
PickerBranch: braces around an `if` body, WITNESS keyed by text, `handler-statement:IfStatement`. TwoSlots: two sets
swapped before the request, PASS-bounded (lane A ASK:unproved). Row and Caption untouched, PASS-proved.

## Measured (`count-held.mjs`, the lane's scratch script: JSX attribute values whose arrow `arrowOf` finds, per unit)

pyka `src` (120 .tsx): 261 fired `on[A-Z]`, 22 held, 11 held readable; escapes of the other 11: handler-expression 6,
handler-local-not-pure 3, handler-async 1, handler-argument-not-pure 1. Readable held instances: views/compare/Compare.tsx:424
`edit` and `next`, :428 `nameOf`, :433 `subOf`, views/map/FilterBar.tsx:63 `setOpen`. The nexus bench tree (2,650
.tsx): 4,019 fired, 486 held, 126 held readable; escapes: handler-argument-not-pure 183, handler-statement 57,
handler-local-not-pure 35, handler-async 31, handler-expression 28, handler-parameter-pattern 26. Readable held
instances: apps/embed/src/components/EmbedChatView.tsx:237 `addFiles`, apps/frontend/src/common/components/Chat/
ChatMessage/RenderChatMessage.tsx:226 `deleteMessage`, .../SchemaInput/index.tsx:120 `setSelected`.
