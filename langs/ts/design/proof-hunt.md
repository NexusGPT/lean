# Proof hunt: lane A beside lane B, and the places where both sides share one unknown

check.mjs answers lane B first, and a WITNESS ends the question, so a lane A proof of two different behaviours is
hidden whenever lane B witnesses. Four such classes were found by chance on 28 October (an open key on a record with
declared fields and an index signature; `x!` on an absent value; a dictionary read of an Object.prototype name; a loop
helper that ran on after a callee faulted). This note holds the step that now reads both lanes, and the hunt for the
rest.

## The step

`tests/run.mjs`, after the pairs: for every unit a pair runs through lane B, lane A's reading of its lemma (every
lemma of the pair, listed in `expect.equal` or not) is read beside lane B's verdict. A unit lane A proved and lane B
witnessed fails the step, except through two doors: the pair declares an adapter for it (the adapted claim
`f_candidate(A(x)) == f_parent(x)` is not the raw same-input comparison lane B ran), or every witness input holds NaN
or an infinity (lane A's number model is finite: `design/special-numbers.md`; lane B keeps at most three witnesses, so
the door trusts that a finite difference shows among them). Its own line:
`| PROOF-HUNT TOTAL | N units read by both lanes | NO HIDDEN FALSE PROOF | E exempt by a door (adapter, special numbers) |`.
The harness row R11 (`harness/proof_hunt.py`, floor zero) reads that line, runs lane A the way check.mjs runs it (the
heap core agreed, the theorem, Dafny, no WITNESS cut-off) on every planted mutant of the fixed soundness cohort that
lane B witnessed, and crosses the corpus results of the run.

## The rule behind a shared unknown

A bodiless function the two sides share, `F(args)`, is sound when the JavaScript value at that place is the same
function of what `args` carry on both sides. It proves different behaviours equal when either fails: the name or the
arguments leave out something that changed (a body, a declaration, a creation order), or the model gives the value a
type the runtime value lacks (an absent value read as a T: `+ 0`, `typeof`, `=== undefined` then answer for a T).

## Classes, grouped by the invariant their structural fix restores (pairs `tests/pairs/proof_hunt_<n>`, base 1e55e21)

"hidden": lane A proved, lane B witnessed; "unseen": lane A proved, lane B draws nothing that differs. A refusal is
named only as the interim, where the structure cannot carry the construct yet.

**I1. A shared name covers every piece of code that decides the value.** Fix: name each shared unknown by the reach
of the code that decides it (`iteratorProgram` or `reachOf` of its declaration: the same-file declarations, imports and
accessors it reaches), never by a bare name or the declaration's own text; or read it as the unit it is, so the
theorem requires its lemma. Interim refusal: none needed.
| # | class | units | state | site |
|---|---|---|---|---|
| 7 | a module constant holding a function value, called or passed by name | scaled, applied | open, hidden | :551, :1403 to :1416 `call_args_<name>` |
| 9 | a module cell whose initializer calls a changed same-file function | cfgX | open, hidden | :712 `Module_file_<kind>_<name>_<hash(decl text)>` |
| 11 | a tagged template whose same-file tag changed | tagged | open, hidden | :2069 `tag_<tag text>_<n>` |
| 12 | instanceof against a same-file class whose heritage changed | isBase | open, hidden | :2476 `instanceof_<right text>`, the class named by its name |

**I2. An unknown value stays opaque and is never coerced to a type it may not hold.** Fix: an asserted or unchecked
value keeps its source representation (the Option or Nullish of `x!` with its Undef, the Any of an `any`, `unknown`
or `JSON.parse`, the union before an `as`, the Undef of a let not yet written); every operation on it reads through
that representation (the Any operations, the Option's Undef branch), and it becomes a T only where a guard the
model decides narrows it. Interim refusal: a `!` or a narrowing `as` the flow does not decide, `let v!:`, a let
written only by a closure.
| # | class | units | state | site |
|---|---|---|---|---|
| 2 | an absent value asserted present (`x!`, `m.get(k)!`, `find()!`) | bang, bangS, bangType, mapGet, findBang | open, hidden | :2083 absent_T |
| 6 | a let read before its write | definite, definiteS, lateInit | open, hidden | :2223, :4856, :4911 uninit_T |
| 10 | a value of another runtime type asserted to T (`as`, an `any` or `unknown` narrowed, `JSON.parse(s) as R`) | anyAs, asCast, unknownAs, parsedA | open, hidden | :1719 to :1744 Any_as_T, cast_* |

**I3. A record from the outside carries an opaque rest and an opaque key order.** Fix: a record value is its declared
fields plus an opaque rest (the keys its type does not declare) plus an opaque key order; a declared field reads
exactly, while an open key, `in`, for-in, a spread, `Object.assign` and the key lists read through functions of the
whole value, rest and order included; a record the unit builds from a literal has an empty rest and the literal's
order, so its reads stay exact. Interim refusal: the rule `key-order` (for-in over an outside record) and the open
reads lane dynamic-key refuses.
| # | class | units | state | site |
|---|---|---|---|---|
| 1 | an open key on a record with declared fields and an index signature (bracket, dot, `in`, for-in) | openKey, dotKey, inKey, keysH | open, unseen | dtype, :3260, :3140, :2491, :5354 |
| 5 | for-in over a record: creation order and key presence | keyOrder; escape proof_hunt_key_order (keysOfParam, optKeys) | open, hidden | :5354 `Object_keys(D)` |
| 13 | a spread or `Object.assign` of a record-typed value (structural typing lets it carry undeclared keys) | spreadCopy, assignInto | open, unseen | the core's spread reading; Object.assign |

**I4. A prototype name is a function of the key.** Fix: a missing key that names an Object.prototype member reads
`proto_member(key)`, never one value for every name. Class 3 (protoLit, protoRead): closed on the base.

**I5. A fault is read after every call that can raise it.** Fix: a loop helper tests the fault after each step, as a
statement sequence does. Class 4 (lastOk): closed on the base.

**I6. The number model either is JavaScript's or says where it is not.** Class 8 (negZero, bigInt unseen; a real-file
`a + b - b + 0.5` witnessed at finite inputs): the exact int and real envelope is documented, so the fix is the
owner's choice: a float64 reading, or a proof that marks or refuses where a value may leave the envelope (as the heap
core marks a negative zero).

## Every shared-unknown site and its answer (can the two sides differ at run time while it is shared?)

| site (translate.mjs unless named) | value | answer |
|---|---|---|
| 2083 absent_T (`x!`) | the absent value as a T | yes: class 2 |
| 2420, 3133, 3283, 3285, 5371 absent_V (dictionary typed without absence) | a missing key as a V | guarded (untracedDictValue, missingKey); dictTruth, dictUndef, protoLit, protoRead not proved |
| 3260 open_key_read_to_T, 3140 `<T>_<name>`, 2491 in_record | a read of a declared-fields datatype | yes: class 1 |
| 2223, 4856, 4911 uninit_T | a let before its write | yes: class 6 |
| 3677 uninit_T (useState() without an argument) | the first state | no by reading: its state type holds undefined, so the shared value is an Option the lemma never decides (unprobed) |
| 4909 uninit_Any | undefined as Any | no: Any claims no type |
| 5354 Object_keys(D), 5357 `<T>_to_seq` | the keys of a record value | yes: class 5 (`_to_seq` same shape, unprobed) |
| 551, 2262 call_args_<name>; 1408, 1409, 1416 external <calleeName> | a named callee outside the units | yes for a module constant (class 7); no for an import or a lib global (the world) |
| 549 call_args_invoke | a local function value, passed as its Dafny value | no |
| 1985 `<name>_<hash(iteratorProgram)>` | a module constant read as a value | no: iteratorProgram holds the same-file declarations it reaches (modConst not proved) |
| 712 Module_file_<kind>_<name>_<hash(decl text)> | a module cell of the world (a let, a constant whose initializer calls) | yes: class 9, the declaration's text leaves out the bodies its initializer calls |
| 846, 861 Module_file and Static_<class>_<field>_<hash> | a static field | no on the probe (staticBase not proved) |
| 1719, 1739, 1740, 1744, 2053 Any_as_T, Any_of_T, cast_* | a narrowing or widening conversion | yes for a narrowing assertion: class 10 |
| 1743 cast record to dictionary, 3489 Object_<name>_source | keyed by the whole file text | no (conservative) |
| 2659 lit_<T>_<hash(names)> | an object literal of an opaque type | yes in principle (a getter's body is not an argument); on the probe the reading fails to resolve, so not proved |
| 2625 method_value, 2915 fn_<T>(Fn(code, env)), 2875 react_handler_<T> | a function value: its text, imports, accessors, captures, same-file calls checked by the theorem | no on the probes (a closure over a changed module constant handed to an import: not proved) |
| 2476 instanceof_<right text> | the test against a class named by text | yes: class 12 |
| 2069 tag_<tag text> | a tagged template named by its tag's text | yes: class 11 |
| 1210, 2077 typeof; 1211 strict_eq; 1783, 1784, 1823, 1829 truthy, logic_truth; 2393, 2405, 764, 971 is_null/is_undefined; 2481, 2484, 2493 in_Any/in_object; 2541 op_*_Any; 3274 Any_index; 3079, 3081 Any_<prop>; 2989, 2992, 3022 Any_<prop>_or, Any_at; 2979 rest_*; 3750 Array_isArray; 2795 props_of; 1733 node_of_Any; 2126 Any_to_seq | a function of the represented value | no where the value is faithful; yes when the value came through classes 1, 2, 6, 10 (bangType: typeof of an absent value) |
| 560 to 564, 1651, 2518, 2019, 2028, 1731 call_args_Boolean/String/Number/parseFloat/parseInt, number_of, to_string, text_of_number | a conversion of the value | no, inside the number envelope (class 8) |
| 2072 regex_<hash>, 3033 regex_index, 2377 pow, 3910, 3915, 4551 sort_*, 1531 str_toLowerCase | a library function of its arguments | no |
| 719 to 737, 1979, 1980, 2074, 2095, 2098 global_*, 706, 863 field accessors, 1315, 1317 md_*, 1393 lookup_*, 3341 alloc_*, 3041 get_literal, 3681 setter_, 3697 module_import, 3715, 3721 hook_*, 2158 to 2355 and 3655 promises and await_value, 2287 block_promise_<program>, 5144 to 5179 async iterators | a transition of the world, the same input on both sides | no |
| 3422 fuel_start, 5179 async_iterator_fuel, 5805 fuel_out | an arbitrary bound | no: the lemma holds for every value of it |
| 606 no_fault_value, 2164 throw_R, 4788 fault_result_R | the result beside a fault | no (thrower: a changed message is not proved) |
| 5578 absent_number_/number_special_<numericKey> | an opaque unit keyed by its source | no |
| 5710 Module_file_block_<hash(reach)>, 5765 accessor_<text> | an opaque block keyed by its reach or text | no |
| 5796 to 5802 pipe_, guard_, route_denied_ | a decorator named by its key | no by reading: the key is decorators.mjs closureKey (the guard or pipe expression with its same-file closure; a pipe adds the parameter type); unprobed |
| heap.mjs:386, 396 Call_/HCall_<import>_<hash(types, code)> | an outside call of the heap world | no (the world) |

## Measured (base 1e55e21)

`LEAN_PAIRS=adapters,special_numbers,bare_return_void,loop_chain,null_undefined node langs/ts/tests/run.mjs`:
`| PROOF-HUNT TOTAL | 43 units read by both lanes | NO HIDDEN FALSE PROOF | 6 exempt by a door (adapter, special numbers) |`
(adapters pick and pad by their adapter; Gate.constructor, positives, andAbsence and clamp by NaN witnesses).
`LEAN_PAIRS=proof_hunt` (the single pair before the split per class): `| PROOF-HUNT TOTAL | 35 units read by both lanes | 20 HIDDEN FALSE PROOFS | 0 exempt ... |`,
`| TOTAL | 763 checks | 47 FAILED |`: the pair is red until the open classes are read soundly. Lane A on every other
pair crossed with its expect.b: no hidden false proof outside these six exempt units.
