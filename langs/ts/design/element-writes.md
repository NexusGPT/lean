# Element writes: a field written through a parameter's element path

The construct: `rows[i].winner = v`, `rows[i]!.winner = v`, `(rows[i] as Row).winner = v`, `o.rows[i].qty = v`,
`lines[i].item.qty = 0` (and `+=`, `-=`, `*=`, `++`, `--`), and `o.rows.forEach((r) => { r.qty = 0; })`. Before, the lint refused the first as
`property-assign: ... which this function does not own`, and the only accepted rewrite, `rows[i] = { ...r, winner: v }`,
replaces the element, so lane B gives a true WITNESS on identity (pyka lane, finding 4).

## JavaScript meaning
ECMA-262 13.15.2: the left side `rows[i].winner` is evaluated first (`rows`, then `i`, then the element is read), then
the right side, then PutValue writes the field of the object read; an element that is `undefined` throws a TypeError at
the write. `!` and `as T` are TypeScript only: the emitted JavaScript has neither.

## The reading

The shared predicate `elementWritePath` (`common.mjs`) recognises the path for the lint and both translator lanes: from
the root name, data-field and array-element steps only, at least one element; each element indexes an array whose
element type is never null or undefined, by a number index whose expression calls, assigns and awaits nothing; `!` or
`as T` (T the element's own type) stand only directly on an element step; no step is optional or an accessor. The lint
admits the write when the root is a parameter of the unit itself (not a callback's or a local procedure's), not an
alias, as `p.f = v` is admitted.

Heap core (`translate/heap.mjs`): the receiver is the element, read once (its index marked when not kept in range by an
index loop), then the right side, then the store: the step `p.f = v` takes on a parameter's cell. Pair unit `bump`:

```dafny
var hw_ := Oob_A_R_fbf7bf84(hw_, items, 0);
var o0_ := Idx_A_R_fbf7bf84(hw_, items, 0);
var hw_ := Set_R_fbf7bf84_qty(hw_, o0_, (Get_R_fbf7bf84_qty(hw_, Idx_A_R_fbf7bf84(hw_, items, 0)) + v));
```

Value lane (`translate.mjs` `elementPathUpdate`, a unit outside the core): the root parameter is rebuilt along the path,
each index read once, and the parameter is an output (layer 1): `rows := (var ix0_ := i; rows[ix0_ := rows[ix0_].(winner := v)])`.

## What stays refused

`property-assign` (escape `fixtures/escapes/ts/element_write_call_index.ts`): an index that calls something
(`rows[rows.indexOf(r)]!.winner`: name the index first), a cast to another type, a `!` or `as` not on an element, a root
that is a local array, a local procedure's or a callback's parameter, or `this`. `alias-mutation`: a root that is another
name of an input. `index-assign` / `property-assign`: a tuple, a dictionary, an optional step. A mutator call on an
element (`rows[i].tags.push(x)`) is unchanged.

## Soundness

- Two indices may reach one object. The heap core reads one cell (probe: `rows[0].qty = 1; return rows[1].qty` against
  the read moved first: unproved, lane B WITNESS with `rows[0] === rows[1]`). The value lane reads trees, so a unit with
  an element write is exposed (`nested write through an input`) and its identity skeleton unreadable: the lemma is
  withheld unless the two Dafny texts are identical (pair unit `mark`).
- Identity: a replaced element is another object (pair unit `stamp`: WITNESS, withheld).
- Order: the element is read before the right side. Probe: `rows[0].qty = callee(rows, v)`, where the callee replaces
  `rows[0]`, against the call named first. Unproved, lane B WITNESS.
- An index out of range marks the world (`INRANGE`); the value lane's lemma is withheld.
- Callers. A same-file callee that writes through an argument writes through the caller's input. That write is not in
  the caller's text, so the guard now counts it (`writesThrough` in `heap.mjs`). A write through the element of a loop
  over an input (for-of, an array callback's parameter) counts as well. This closes a false proof that existed before
  this reading: `put(o) { o.x.n = 5 }` against `h(o) { put(o); return o.y.n }` with the read moved first. That case was
  proved, and lane B witnesses `o.x === o.y`; the lemma is now withheld.
- `as T` to another type would read another shape: refused by the predicate.

- The element a synchronous array callback receives (`o.rows.forEach((r) => { r.qty = 0; })`) is the same step on
  `o.rows[i]`. The heap core reads it (pair unit `zero`: against an empty body, unproved, lane B WITNESS). The value
  reading copied the element and dropped the write, so two Dafny texts could coincide and the theorem aliased them: a
  false proof at dcbc61c. The lint now admits such a write only for a field (`=`, `+=`, `-=`, `*=`, `++`, `--`) in a
  `forEach` statement of one parameter over a plain data record (`plainDataRecord`, common.mjs). Every other shape is
  refused as `alias-mutation` (escape `element_write_loop_callback`). The translator refuses by that name any unit
  outside the heap core that writes through a loop's element (`loopElementWriteOf`): a dropped write is never silent.

## Lane B
Lane B runs the JavaScript itself; korat draws arrays whose elements share one object (`[{$ref:0}, {$ref:0}]`), which
witnessed the alias probe, and its graph observation sees a replaced element (`stamp`).

## Instances

- pyka `src/engine/compare.ts` `summarise`, rewritten as `rows[i]!.winner = ...` (repro `p4.ts` `b`): enters.
- `apps-ui/src/lib/flowLayout.ts:1041` `c[j].cy = minY`: `c` is a local procedure's parameter: refused.
- `apps-ui/src/lib/flowLayout.ts:1716` `slot[k].x = ...`: a local array, in a callback: refused.
- `langchain-google-common/src/utils/gemini.ts:853` `parts[co].thoughtSignature = ...`: a local array: refused.
- `langchain-aws/src/utils/message_inputs.ts:605` `contentBlocks[contentBlocks.length - 1].text = ...`: local: refused.
- `odoo-unofficial-api/src/services/helpdesk.service.ts:133` `tickets[i].messages = ...`: a local array: refused.
- `snitch/infra/mock-api/src/cluster-fixtures.ts:685` `(plans[3] as ClusterPlan).dismissed = true`: local: refused.
Next: a local array the function built (every refused instance above) whose elements may be inputs, with the same guard.
