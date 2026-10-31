# A7b-types-enclosing-params: result

Branch `lane/A7b-types-enclosing-params`, from lean master 5f96f554. Commits: 59b397c4 (the red pair), 5edc50f7 (the
reading), 093e158c (the cases the census showed), e90440d9 (matching by declaration), and the docs commit with this
file.

## What was done and why

Form 2 of the types inventory: a unit that reads a type parameter of a declaration around it was refused with `type
parameter T is not one of this function's`. Examples are a method of `C<T>`, a constructor storing `D`, and a callback
inside a callback of `f<T>`. Such a unit is parametric in `T` exactly as `f<T>` is: each call fixes `T` once, so a
proof over an arbitrary `T` holds at each instance. The reading gives the unit those parameters as its own Dafny type
parameters, and the theorem quantifies them as it already did for a generic function.

The census showed the reading needs more than the parameter list. Each item below is a mechanism the generic reading
lacked. Some of them generic functions already hit on base.

1. **The parameter collection** (common.mjs `enclosingTypeParameters`, `unitTypeParameters`). The type parameters in
   scope are those of every enclosing function, method, arrow and function expression, and of the enclosing class
   unless the member is static. They are lexical for every unit. The earlier `lexicalGenerics` saw one level, and only
   from an arrow.
   - A unit takes only the ones it reads, outermost first, then its own. A unit reads a parameter when it is mentioned
     by the checker's type of one of its nodes, or by the type a name's symbol declares. A constructor also reads its
     class's instance field initialisers.
   - A parameter is matched by its declaration, never by its name, and `super` is not walked (as `this` is not).
   - Why only the ones it reads: a method of a generic class that never meets `T` keeps its reading, including its
     place in the heap core.
2. **The TypeParameter branch of `dtype`, and `unitTParams`.** Both read the collection. A unit that reads two
   parameters of one name is refused under `types` with `type parameter T hides another of the same name`, catalogued
   in readings.mjs. Without that refusal, the two types would be read as one Dafny `T`.
   - A call signature's own type parameter met in a value's type (a generic function held as a value) is read opaque:
     no Dafny arrow is polymorphic, and every call is instantiated where it is written.
3. **Declarations that name a unit's type parameter now declare it.**
   - A prelude helper (`Slice_T`, `Map_T_bool`) takes the clause an external takes.
   - A record instantiated at a type parameter (`Holder<D>`) is a datatype generic in it, and every reference passes it.
4. **A name or a `this` field held at a type parameter is read at it** (`typeOf`, `heldAtTypeParameter`). The checker
   types such a read at the constraint where a literal union is expected. The existing cast then converts it to the
   constraint where one is expected.
   - The base defect: `function up<T extends "a" | "b">(x: T): "a" | "b" { const y = x; return y; }` translated to
     `var y: T := x; y` for a `string` result. That is a Dafny resolution error, and it costs every unit of the file
     its proof. Nothing wrong was proved.
5. **A type parameter no argument names is passed by name.**
   - In theorem.py (`pass_type_args`), the lemma's calls of the unit's functions name the lemma's own parameters.
   - An external whose result alone names a parameter is called with the unit's parameters. Before, Dafny could not
     infer it ("type parameter could not be determined").
6. **heap.mjs and generators.mjs** ask `unitTypeParameters` whether a unit is generic.

Where the change sits, for the merge with A7a: in `dtype`, only the TypeParameter branch, plus `unitTParams`. Outside
`dtype` it touches `helper`, `external`, `recordType` (only its last lines: the datatype's type parameters and the
reference) and `typeOf`. A7a's depth and recursion branches are untouched. `recordType` is the one function both lanes
may edit.

## The pair

`langs/ts/tests/pairs/types_enclosing_params`: 15 lane A rows and 8 lane B rows (24 checks with the theorem row).
Expectations were written before each reading. Red at base for every row: the translator wrote no file, so the theorem
row failed.

| Unit | What it holds | Lane A | Lane B |
| --- | --- | --- | --- |
| `Shelf.all` | method of `Shelf<T>`, the same values | proved | PASS-bounded |
| `Shelf.rest` | drops one more element of a `T[]` | not proved | WITNESS |
| `Shelf.both` | reorders its two `T`s | not proved | WITNESS |
| `Shelf.count<U>` | nested generic, commuted test in a loop | not proved (see below) | PASS-bounded |
| `Shelf.alike<T>` | its own `T` hides the class's, reads only its own | proved | |
| `Shelf.pick<U>` | nested generic, branches swapped | proved | PASS-bounded |
| `Holder.constructor` | stores `D` | proved | PASS-bounded |
| `marks`, `marks/rows.map()#0` | callback in `f<T>` | proved | PASS-bounded (marks) |
| `grid` and its two callbacks | callback in a callback in `f<T>`, `===` became `!==` | not proved | WITNESS (grid) |
| `Note.label` | `this.kind` of `abstract readonly kind: TKind` | proved | |
| `Reader.constructor` | stores a generic function value | proved | |
| `Bin.constructor` | runs `items: T[] = []` | proved | |

`marks` and its callback were admitted at base: the one-level `lexicalGenerics` covered an arrow directly in `f<T>`.
They are in the pair as the unchanged case beside `grid`.

**One expectation changed after the reading.** `shelf_count` was written "proved" and is now "not proved". This is my
own pair's row, not one from the list. The unit commutes `z === y` inside a loop. The same loop over `string[]`, with no
type parameter, is not proved either (checked by hand: `Equal_count` fails, and so does the heap core's
`EqualCanon_count_result`). Lane A proves no commuted test inside a loop from the bodies alone. So the row records that
limit, and `Shelf.pick<U>` was added as the nested generic's proved row.

## Checks (at e90440d9)

- The 27 pairs whose names contain `generic`, `type`, `class`, `callback` or `method`, plus `branded_keys` and
  `member_constraints` (the other pairs that declare generics): all green, 510 checks. Each with `JOBS=4 node
  langs/ts/tests/run.mjs --pair <p>`.

  | Pair | Checks | Pair | Checks |
  | --- | ---: | --- | ---: |
  | array_callback_cells | 9 | exported_object_methods | 13 |
  | blocker_optional_callback | 13 | generics | 7 |
  | blocker_unresolved_type | 9 | heap_methods | 10 |
  | branch_types | 14 | inherited_method | 27 |
  | callback_behaviour | 14 | in_prototype | 9 |
  | callback_behaviour_tree | 2 | named_callbacks | 17 |
  | callback_patterns | 11 | object_methods | 47 |
  | callbacks | 5 | open_datatype | 25 |
  | callback_units | 9 | throwing_callbacks | 11 |
  | class_new | 17 | type_assertions | 45 |
  | class_statics | 12 | types_enclosing_params | 24 |
  | class_super | 8 | type_tests | 59 |
  | effectful_callbacks | 29 | branded_keys | 11 |
  | empty_collection_type | 9 | member_constraints | 9 |
  | exception_callback | 35 | | |

- `python3 -I conformance/run.py`: `conformance: PASS, 341 of 341 checks passed, languages: py, ts, dfy`.
- No expectation in another pair changed.

## Census: before and after

Base is lean master 5f96f554, taken with `git archive 5f96f554c langs spec conformance | tar -x -C /tmp/a7b/base`.
Head is e90440d9, taken with `git archive e90440d9a langs spec | tar -x -C /tmp/a7b/head3`. Commands, run in each tree:

```
NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs /root/da/census/repos/langchainjs --out <tree>-langchainjs.json
NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs /root/da/census/repos/n8n --out <tree>-n8n.json
NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs /root/da/census/repos/nexus --include <dir>/ --out <tree>-nexus-<dir>.json   # 26 directories
node langs/ts/design/types-inventory.mjs <json>... --out <inventory.json>
node langs/ts/census.mjs --diff <base.json> <head.json>
```

A full nexus census ran past two hours on the inventory's run, so nexus was censused only in the 26 directories
(`apps/{backend,frontend}/src/<area>/<dir>`). These hold every form-2 finding of that run, as found in its journal
`/root/lanes/A3-types-inventory/census/nexus.json.records.jsonl`. The nexus row is those 8,475 units, not the root.

| Root | Units | Form 2 | Stopped by `types` | Language-refused | `types` reading refused (diff) | Readings that lose a unit |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| langchainjs | 6,709 | 152 → 0 | 270 → 124 | 3,232 → 3,127 | 377 → 233 | none |
| n8n | 9,610 | 27 → 0 | 434 → 407 | 5,247 → 5,229 | 856 → 829 | none |
| nexus (26 directories) | 8,475 | 110 → 0 | 422 → 314 | 2,885 → 2,791 | (per directory) | none in any directory |

Units that moved to another refusal, by their new rule (the unit's refusal at head, its first finding):

| Root | Admitted | `copied-argument` | `read-after-call` | `this` of a class (form 4) | symbol union (form 5) | `reference-key` | `names` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| langchainjs (152) | 105 | 20 | 16 | 6 | | 2 | 3 |
| n8n (27) | 18 | 4 | 5 | | | | |
| nexus (110) | 94 | 10 | 3 | | 2 | | 1 |

Per unit: `/tmp/a7b/census/moved-<root>.tsv` on this machine (made by `/tmp/a7b/moved.py`). On langchainjs, form 4
grows from 53 to 59: these 6 units read their class's type parameter, which stopped them first at base.

The form-2 numbers at base differ slightly from the inventory's (151 langchainjs, 120 nexus, 28 n8n), which was taken
at another head (9557ce56b) and, for nexus, a partial run.

## Elements added

- `common.mjs`:
  - `enclosingTypeParameters`, `unitTypeParameters`: the collection described above.
  - `typeMentions`, `typeParameterKey`: the walk, matching a parameter by its declaration.
  - `lexicalGenerics` removed. A callback unit's `generics` is its own, as for every other unit.
- `translate.mjs`:
  - The TypeParameter branch: enclosing parameters, the hiding refusal, a signature's own parameter read opaque.
  - `unitTParams` reads the collection.
  - `recordTParams` and `recordType`'s generic datatype.
  - `helper`'s and `external`'s type-parameter clause, and naming at the call.
  - `typeOf` / `heldAtTypeParameter`.
- `heap.mjs`, `generators.mjs`: "generic" asks `unitTypeParameters`.
- `readings.mjs`: the `types` entry catalogues `type parameter .* hides another of the same name`.
- `spec/theorem.py`: `pass_type_args`.
- `tests/pairs/types_enclosing_params`.
- `design/types-inventory.md`: the dated section "Form 2, read (2026-10-30)", linked from form 2. `subset.md`: the
  Types row.

## Left, and defects met

- **The implicit constructor of a generic class.** When a class declares no constructor, a unit that builds it
  (`const s = new Shelf<number>()`) reads the class's field initialisers (`items: T[] = []`) in its own context, with
  `T` uninstantiated. It is still refused with the form-2 message: `type parameter T is not one of this function's
  (raised at line 2, outside this unit: a field it initialises)`. Checked on a small file; at base the class's methods
  were refused too, and at head only the building unit is. None of the three roots has such a unit (form 2 is 0 on
  them). The reading it needs: the initialisers read at the instance's type arguments.
- **Callers.** A caller that holds the instance as a parameter calls a method of a generic class through an opaque
  external (`ext_call_args_Ext_Shelf_first_...`), so no unit call needs a type argument there (checked: the file
  resolves). A same-file unit call whose callee names a type parameter only in its body or result would need explicit
  type arguments at the call. The lemma names them (theorem.py), but the translator's unit calls do not. I found no
  path that reaches it: the fresh-instance call above stops at the initialisers first.
- **Form 4 is untouched.** The polymorphic `this` still carries the form-2 message, and the inventory script counts it
  as form 4 (langchainjs 59, n8n 31, nexus directories 20 at head).
- **No loop-commutation proof.** A commuted test inside a loop is not proved from the bodies alone, with or without a
  type parameter (`shelf_count`).
- **A stale table.** `design/admission-contract.md`'s refusal table lists translate.mjs line numbers from an older
  head. The new message was not added there; readings.mjs is the catalogue the lint reads.
- **Generic edits.** theorem.py's edit lemmas (`Post_`, `Edit_`, used when a unit is inside the edit scope) take no
  type parameters, on base as now. A generic unit inside an edit scope would not resolve. No pair uses it.
