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

## Classes (pair `tests/pairs/proof_hunt`; base 1e55e21; "hidden": lane A proved, lane B witnessed)

| # | class | units | state | site | fix shape |
|---|---|---|---|---|---|
| 1 | open key on a record with declared fields and an index signature | openKey, dotKey, inKey, keysH | open, proved, lane B never draws the extras | dtype (a datatype of the declared fields), translate.mjs:3260 open_key_read, :3140 accessor, :2491 in_record, :5354 Object_keys | the extras in the value (a dictionary carrier beside the fields), or refuse every open read (dot, `in`, for-in too, not only brackets) |
| 2 | an absent value asserted present (`x!`) | bang, bangS, bangType, mapGet, findBang | open, hidden | translate.mjs:2083 absent_T | the absent branch reads undefined (the Undef of the value's Option/Nullish), never a T; or refuse `!` the flow does not decide |
| 3 | a dictionary read of an Object.prototype name | protoLit, protoRead | closed on this base (not proved) | missingKey :3168 | kept as must-not-prove |
| 4 | a loop helper running on after a callee faults in a callback | lastOk | closed on this base | loop helpers | kept as must-not-prove |
| 5 | for-in over a record: creation order and key presence | keyOrder, keysOfParam, optKeys | open, hidden | :5354 `Object_keys(D)` of a datatype value | name the key list by the source (as `Object_<name>_source_<hash>` at :3489), or refuse for-in over a record type |
| 6 | a let read before any write | definite, definiteS, lateInit | open, hidden | :4856, :4911, :2223 uninit_T | refuse the read TypeScript does not vouch for (`let v!:`, a write only a closure makes), or read it as undefined |
| 7 | a module constant holding a function value | scaled, applied | open, hidden | :551 call_args_<name> (a callback), :1403 to :1416 call_args_<name> (a direct call) | key it by its declaration and reach (as :1985 should), or refuse a non-unit callable constant |
| 8 | the number envelope: exact int and real, no signed zero | negZero, bigInt; scratch `a + b - b + 0.5` (real file) | open; the envelope is documented (numbers-bitwise-nan.md); real rounding is witnessed | int and real readings | owner decision: claim the envelope in the certificate, or refuse results that can leave it |
| 9 | a module constant whose initializer calls a changed same-file function | cfgX | open, hidden | :712 `Module_file_get_<name>_<hash(decl text)>`, a module cell of the world named by its declaration's own text | name it by `iteratorProgram(decl)` (the same-file declarations it reaches), as Static_ does at :861 |
| 10 | a value of another runtime type asserted to T | anyAs, asCast, unknownAs, parsedA | open, hidden | :1719 to :1744 Any_as_T, cast_* | keep the source representation until a guard decides it, or refuse a narrowing `as` |
| 11 | a tagged template whose same-file tag function changed | tagged | open, hidden | :2069 `tag_<tag text>_<n>` | call the same-file tag as the unit it is (its lemma then required), or key by its declaration and reach |
| 12 | instanceof against a same-file class whose declaration changed | isBase | open, hidden | :2476 `instanceof_<right text>` (and the class named by its name) | key the test by the class declaration and its heritage, or decide it from both sides' declarations |

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
`LEAN_PAIRS=proof_hunt`: `| PROOF-HUNT TOTAL | 35 units read by both lanes | 20 HIDDEN FALSE PROOFS | 0 exempt ... |`,
`| TOTAL | 763 checks | 47 FAILED |`: the pair is red until the open classes are read soundly. Lane A on every other
pair crossed with its expect.b: no hidden false proof outside these six exempt units.
