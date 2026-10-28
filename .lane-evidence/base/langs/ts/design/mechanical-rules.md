# Mechanical review rules

The research dossier is the source for this list. The review product documents are not present.
A label describes the proposed rewrite. It does not make a refused unit enter the proof lane.

| Item | Bin | Rule and label | Reading and reason |
| --- | --- | --- | --- |
| `var` | Already an entry | `var`, conditional | Replace with `let` under the stated scope and closure conditions. No hoisting read alone is insufficient. Repeated declarations and loop captures also matter. The lint does not prove these conditions. The existing refusal stays. |
| `==` | Already an entry | `loose-equality`, conditional or proved at the site | Replace with `===` only for operands of the same primitive type. The existing site analysis proves some cases. Other admitted primitive comparisons retain their coercion reading. |
| `eval` and `Function` | Already an entry | `dynamic-eval`, migration | Dynamic code has no reading. Replace it with explicit code whose meaning a person approves. Both call and constructor forms stay refused. |
| Prototype writes | Already an entry | `prototype`, migration | The prototype chain has no reading. Use own fields. This can change inherited lookup, so the existing refusal and label stay. |
| Nonliteral `innerHTML` and `outerHTML` assignments | New check | `inner-html`, migration, advice only | Choose `textContent` for plain text. HTML parsing and node replacement change. A property name alone does not establish a DOM receiver. No new refusal is justified by that name. |
| `document.write` | New check | `inner-html`, migration, advice only | Choose an element and set its `textContent`. The current reader treats the global call as a world transition. It does not prove HTML safety or model the browser tree. |
| Nested ternaries | New check | `nested-ternary`, proved, advice only | A conditional branch that is another conditional has an exact reading. Expand it into nested `if` statements with the same evaluation order. |
| `Promise.all` for independent awaits in loops | Existing entry completed, with a new advice site | `promise-all-order`, conditional | The awaited calls commute in the world. They must also be independent, use a fixed input and never throw or reject. The existing refusal covers unordered continuations. The new loop finding is advice only. |
| Hooks at the top level | Already an entry | `hook-order`, migration | Put calls at the top level of the component or custom hook before early returns. This does not mean module scope. Moving a call can change state and effects. The existing check covers React imports. |

None of these listed items is prose only. General readability and architectural preference stay outside lean.

## Advice controls

`lintFile` accepts `advisory: true` for the new mechanical findings. Its default is false.
The proof gate and census do not request it. A mechanical finding carries `advisory: true`.
The command line uses `--advice`. The ESLint rule enables `advisory` by default and calls these messages advice.
The separate `anyType` option and `--any-type` flag retain their existing meaning.
No quick fix is added. A person chooses where to place the statements or the target element.
The advice section of the suite passes `--advice` and keeps `--any-type` for its existing fixtures.

## What the checks see

The ternary check unwraps parentheses on each branch. A ternary used only as a condition does not trigger it.
A rewrite keeps each condition in its original branch and evaluates it once.
When the expression sits within another expression, preserve earlier evaluations and use a fresh local for its result.

The HTML check includes dot access and a literal bracket key. It excludes literal right sides.
It reports `document.write` even for literal text. It excludes a local binding named `document`.
The rule reports a syntactic sink. It does not claim that the value is user input or unsafe.
The current property write gate does not generally read a DOM setter as a browser transition.
It can read a field of an owned record as a record update. Writes through outside roots retain existing refusals.
This advice neither admits those writes nor claims that a record field and a DOM setter are equivalent.

The new loop check covers a synchronous `for...of` whose body is one awaited call statement.
It does not claim to prove independence. Other loop bodies need further analysis and receive no new finding.
The existing Promise.all refusal remains a refusal. Its new conditional label describes the proposed rewrite only.
Commutation alone does not preserve early failure: parallel work may start calls that a failing sequential loop never starts.

## Evidence

The new fixtures cover both ternary branch forms, dot and bracket HTML writes, document writes and awaited loops.
They also cover an existing Promise.all continuation refusal, `var`, dynamic code, prototype writes and hook order.
The existing equality fixtures cover the proved and conditional labels.

The pair `nested_ternary` has an equivalent `choose` function and a changed `wrong` function.
Both parent functions use nested ternaries. Both candidates use nested `if` statements.
The wrong candidate returns 30 instead of 3 at zero.
The pair expectation requires PASS-proved for `choose` and WITNESS for `wrong` through `check.mjs`.
No other rewrite gains a proved label in this change.

The lane report contains the measured census, fixture output, planted label failure and pair verdicts with log paths.
