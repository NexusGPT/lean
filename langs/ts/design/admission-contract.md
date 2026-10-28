# The admission contract: one lowering per unit, read by the lint and the translator

Two deciders answered the same question, "what does lean admit", each by its own code: the lint (`lint/lint.mjs`) and the
translator (`translate/translate.mjs`). Where they disagreed a function was advised as fine and then refused, or admitted
by one and read differently by the other, one of the four causes of false proofs (research brief 20, section 2). The
contract removes the second decider: one catalogue of readings (`readings.mjs`), one lowering per unit (`lower.mjs`)
that consults it once, and both deciders read the lowering's record.

## The audit: every decision site

Every place lint.mjs or translate.mjs decides that a construct is refused, read off their source by
`node langs/ts/lower.mjs --audit` (the compiler parses both files; a site is a call of the lint's `v`, `refuse` or
`note`, a pushed finding, a call of the translator's `fail`, or a `throw new Unsupported`). Each row names the reading
of the catalogue the site's refusal belongs to, by the same lookup the lowering makes at run time
(`readingOfFinding` for a lint rule and its message, `readingOfRefusal` for a translator message). A site whose rule is
computed (`shape.rule`, `named.rule`, the EFFECT_GLOBALS table) has one row per rule it can name. A message written as
an expression (`<...>`) is resolved by its rule here and by its text at run time. `advice` rows never refuse.

| site | kind | rule | reading | message |
| --- | --- | --- | --- | --- |
| lint/lint.mjs:252 | lint-refuse | prototype | prototype | `Object.create(null)` makes an object without a prototype; a plain object's reads and `in` go through Object.p |
| lint/lint.mjs:253 | lint-refuse | prototype | prototype | `Object.${}` reaches the prototype chain or the property descriptors; no transition models it |
| lint/lint.mjs:254 | lint-refuse | freeze | prototype | `Object.${}` makes a later write throw in strict code; the value reading has no fault for that write, so no tr |
| lint/lint.mjs:255 | lint-refuse | assign-target | record-copy | `Object.assign` writes into its first argument; pass a fresh literal `{}` as the target or spread the sources  |
| lint/lint.mjs:256 | lint-refuse | spread-source | record-copy | `Object.assign` onto a literal copies every own key of `${}`: ${}; the call is read as a function of its argum |
| lint/lint.mjs:435 | lint-refuse | unsupported-type | types | type ${} is not translatable |
| lint/lint.mjs:443 | lint-refuse | arguments | names | `arguments` is the actual argument vector, not the declared one; name the parameter, or declare a rest paramet |
| lint/lint.mjs:446 | lint-refuse | exception-callback | exceptions | call the throwing unit directly, or pass it to a call; a stored function value has no fault channel |
| lint/lint.mjs:447 | lint-refuse | generator-use | generators | consume a pure generator directly in for-of, spread, Array.from or yield* |
| lint/lint.mjs:448 | lint-refuse | object-method-mutation | object-literal-methods | pass a fresh literal handler or keep calls on the local object; sharing a named method object needs a heap |
| lint/lint.mjs:452 | lint-refuse | toplevel-effect | module-state | move the effectful module initializer into a function |
| lint/lint.mjs:455 | lint-refuse | global-read | names | `${}` is module state that can change; the subset reads constants only |
| lint/lint.mjs:457 | lint-refuse | number-special | numbers | the finite number model has no NaN or infinity; use lane B for special-value arithmetic |
| lint/lint.mjs:458 | lint-refuse | dynamic-eval | names | `${}` is outside the subset |
| lint/lint.mjs:458 | lint-refuse | prototype | prototype | `${}` is outside the subset |
| lint/lint.mjs:461 | lint-refuse | global-read | names | global `${}` is outside the subset |
| lint/lint.mjs:462 | lint-refuse | global-read | names | `${}` cannot be resolved |
| lint/lint.mjs:486 | lint-refuse | static-this | classes | `${}` in a static method is the class the call names, a subclass too; name the class itself, or give the metho |
| lint/lint.mjs:494 | lint-refuse | global-read | names | `${}` holds a function; call a static method of the class instead |
| lint/lint.mjs:496 | lint-refuse | global-read | names | `.${}()` changes the static `${}` in place; assign a new value to the field instead |
| lint/lint.mjs:618 | lint-refuse | var | declarations | `var` is outside the subset; use let or const |
| lint/lint.mjs:619 | lint-refuse | definite-assignment | declarations | `let v!: T` may be read before its first assignment, where it is undefined; assign it first or give it a start |
| lint/lint.mjs:627 | lint-refuse | bare-return | control-flow | return needs a value |
| lint/lint.mjs:632 | lint-refuse | destructuring | destructuring | for-of binds one name or one pattern |
| lint/lint.mjs:634 | lint-refuse | for-of-non-array | loops | for-of runs over arrays, strings, sets, maps and iterable values |
| lint/lint.mjs:649 | lint-refuse | for-in | loops | for-in takes `const k` |
| lint/lint.mjs:650 | lint-refuse | key-order | loops | a for-in visits the own keys in creation order (ECMA-262 14.7.5.9, 10.1.11), and the order of this object is n |
| lint/lint.mjs:651 | lint-refuse | for-in-delete | loops | a for-in skips a key deleted before its visit (ECMA-262 14.7.5.9), and the reading visits the keys the object  |
| lint/lint.mjs:654 | lint-refuse | break-continue | control-flow | break outside a loop or switch |
| lint/lint.mjs:655 | lint-refuse | break-continue | control-flow | continue outside a loop |
| lint/lint.mjs:657 | lint-refuse | exception-callback | exceptions | move the throw to a same-file unit and call it directly |
| lint/lint.mjs:662 | lint-refuse | destructuring | destructuring | catch binds one name |
| lint/lint.mjs:668 | lint-refuse | label | control-flow | a label must name a loop; replace a labelled block with conditional control |
| lint/lint.mjs:672 | lint-refuse | generator | local-functions | generators are outside the subset |
| lint/lint.mjs:674 | lint-refuse | param-form | declarations | rest parameters are outside the subset |
| lint/lint.mjs:683 | lint-refuse | class | classes | classes are outside the subset |
| lint/lint.mjs:684 | lint-refuse | unsupported-syntax | unread-syntax | statement ${} is outside the subset |
| lint/lint.mjs:732 | lint-refuse | object-method-mutation | object-literal-methods | read named fields on the literal object; copying accessors or detached methods needs a receiver |
| lint/lint.mjs:735 | lint-refuse | record-rest | destructuring | record rest needs a parameter of a plain record with written keys, or a fixed nonempty scalar record without d |
| lint/lint.mjs:846 | lint-refuse | uninitialised | destructuring | a pattern needs an initial value |
| lint/lint.mjs:928 | lint-refuse | alias-mutation | mutation | `${}` is the accumulator `reduce` hands its callback: it holds the array's first element when the call passes  |
| lint/lint.mjs:929 | lint-refuse | alias-mutation | mutation | `${}` is the element `${}` hands its callback; a field written through it (`=`, `+=`, `-=`, `*=`, `++`, `--`)  |
| lint/lint.mjs:937 | lint-refuse | object-method-mutation | object-literal-methods | literal method fields are immutable; use a class for mutable receiver state |
| lint/lint.mjs:947 | lint-refuse | global-mutation | mutation | assignment to `${}`, which this function does not own |
| lint/lint.mjs:948 | lint-refuse | render-impure | react | a render function writes `${}`, a variable outside it; move the write into an event handler or an effect |
| lint/lint.mjs:949 | lint-refuse | param-assign | mutation | <why> |
| lint/lint.mjs:950 | lint-refuse | closure-mutation | mutation | `${}` is declared outside this callback; a callback cannot change it |
| lint/lint.mjs:955 | lint-refuse | index-assign | mutation | index assignment into `${}`, which this function does not own |
| lint/lint.mjs:956 | lint-refuse | alias-mutation | mutation | <aliasMsg(l.expression.text, o.decl)> |
| lint/lint.mjs:957 | lint-refuse | closure-mutation | mutation | a callback cannot change an outer ${} |
| lint/lint.mjs:958 | lint-refuse | index-assign | mutation | compound assignment on an element is outside the subset |
| lint/lint.mjs:959 | lint-refuse | dynamic-key | keys | a dictionary key is a string |
| lint/lint.mjs:960 | lint-refuse | prototype | prototype | a key that may be '__proto__' with an object or null value replaces the dictionary's prototype (the setter of  |
| lint/lint.mjs:964 | lint-refuse | global-read | names | `${}` holds a function; call a static method of the class instead |
| lint/lint.mjs:965 | lint-refuse | property-assign | mutation | only =, +=, -=, *= on a static field |
| lint/lint.mjs:968 | lint-refuse | object-method-mutation | object-literal-methods | literal methods keep immutable data fields; use a class for mutable receiver state |
| lint/lint.mjs:968 | lint-refuse | receiver-mutation | mutation | a receiver path needs nonoptional data records; assign a field itself for class or opaque handles |
| lint/lint.mjs:968 | lint-refuse | receiver-mutation | mutation | only =, +=, -=, *= on a field of `this` |
| lint/lint.mjs:969 | lint-refuse | receiver-write | mutation | <RECEIVER_WRITE> |
| lint/lint.mjs:971 | lint-refuse | object-method-mutation | object-literal-methods | literal method fields are immutable; use a class for mutable receiver state |
| lint/lint.mjs:976 | lint-refuse | property-assign | mutation | a field of `${}` is written by a plain `=` statement; read the old value into a local first |
| lint/lint.mjs:977 | lint-refuse | property-assign | mutation | a function installed into `${}` is called by the outside later; no transition reads that call |
| lint/lint.mjs:986 | lint-refuse | property-assign | mutation | assignment into `${}`, an element of `${}`, which is not a parameter of this function; write an element of a p |
| lint/lint.mjs:987 | lint-refuse | alias-mutation | mutation | <aliasMsg(ep.root.text, po.decl)> |
| lint/lint.mjs:988 | lint-refuse | closure-mutation | mutation | a callback cannot change an outer record |
| lint/lint.mjs:989 | lint-refuse | property-assign | mutation | only =, +=, -=, *= on a field |
| lint/lint.mjs:994 | lint-refuse | property-assign | mutation | only =, +=, -=, *= on a field |
| lint/lint.mjs:995 | lint-refuse | property-assign | mutation | only =, +=, -=, *= on a field |
| lint/lint.mjs:996 | lint-refuse | property-assign | mutation | assignment into `${}`: a field of an element is written when the path from a parameter takes field and array-e |
| lint/lint.mjs:997 | lint-refuse | property-assign | mutation | assignment into `${}`, which this function does not own; records it owns are updated in place |
| lint/lint.mjs:998 | lint-refuse | alias-mutation | mutation | <aliasMsg(root.text, o.decl)> |
| lint/lint.mjs:999 | lint-refuse | closure-mutation | mutation | a callback cannot change an outer record |
| lint/lint.mjs:1000 | lint-refuse | property-assign | mutation | only =, +=, -=, *= on a field |
| lint/lint.mjs:1003 | lint-refuse | index-assign | mutation | compound assignment on an element is outside the subset |
| lint/lint.mjs:1004 | lint-refuse | dynamic-key | keys | a dictionary key is a string |
| lint/lint.mjs:1005 | lint-refuse | prototype | prototype | a key that may be '__proto__' with an object value replaces the dictionary's prototype (the setter of Object.p |
| lint/lint.mjs:1009 | lint-refuse | index-assign | mutation | compound assignment on an element is outside the subset |
| lint/lint.mjs:1010 | lint-refuse | dynamic-key | keys | a dictionary key is a string |
| lint/lint.mjs:1013 | lint-refuse | index-assign | mutation | write a record field by name, or use a local Record<string, T> dictionary |
| lint/lint.mjs:1014 | lint-refuse | unsupported-syntax | unread-syntax | assignment target |
| lint/lint.mjs:1017 | lint-refuse | division | numbers | compound division is outside the subset |
| lint/lint.mjs:1018 | lint-refuse | unsupported-operator | mutation | assignment operator is outside the subset |
| lint/lint.mjs:1021 | lint-refuse | object-method-mutation | object-literal-methods | literal method fields are immutable; use a class for mutable receiver state |
| lint/lint.mjs:1021 | lint-refuse | receiver-mutation | mutation | a receiver path needs nonoptional data records |
| lint/lint.mjs:1021 | lint-refuse | receiver-write | mutation | <RECEIVER_WRITE> |
| lint/lint.mjs:1025 | lint-refuse | property-assign | mutation | update of a field of `${}`, which this function does not own |
| lint/lint.mjs:1026 | lint-refuse | unsupported-syntax | unread-syntax | increment of a non-name |
| lint/lint.mjs:1029 | lint-refuse | global-mutation | mutation | update of `${}`, which this function does not own |
| lint/lint.mjs:1030 | lint-refuse | render-impure | react | a render function updates `${}`, a variable outside it; move the write into an event handler or an effect |
| lint/lint.mjs:1031 | lint-refuse | param-assign | mutation | <why> |
| lint/lint.mjs:1032 | lint-refuse | closure-mutation | mutation | a callback cannot change an outer variable |
| lint/lint.mjs:1047 | lint-refuse | assign-target | record-copy | `Object.assign` copies every own key of its source, and a value of a record type may carry keys its type does  |
| lint/lint.mjs:1062 | lint-refuse | alias-mutation | mutation | <aliasMsg(r.text, declOf(r).decl)> |
| lint/lint.mjs:1073 | lint-refuse | opaque-mutation | mutation | .${}() on `${}` may change it, and `${}` is read later; read it before the call or through a method |
| lint/lint.mjs:1076 | lint-refuse | opaque-mutation | mutation | .${}() as a statement on an opaque value may mutate it; name the receiver first |
| lint/lint.mjs:1082 | lint-refuse | receiver-write | mutation | <RECEIVER_WRITE> |
| lint/lint.mjs:1083 | lint-refuse | alias-mutation | mutation | <aliasMsg(pr.text, declOf(pr).decl)> |
| lint/lint.mjs:1086 | lint-refuse | param-mutation | mutation | ${} on `${}`, which is not a local array${} |
| lint/lint.mjs:1091 | lint-refuse | param-mutation | mutation | ${} on `${}`, which is not a local array |
| lint/lint.mjs:1092 | lint-refuse | unsupported-call | library | pop takes no argument |
| lint/lint.mjs:1093 | lint-refuse | unsupported-call | library | sort as a statement needs one comparator, an arrow of two parameters; with the default order write `xs = [...x |
| lint/lint.mjs:1094 | lint-refuse | unsupported-call | library | ${} takes no argument |
| lint/lint.mjs:1095 | lint-refuse | unsupported-call | library | splice as a statement needs a start, a count and plain items |
| lint/lint.mjs:1098 | lint-refuse | param-mutation | mutation | set mutation on a non-local |
| lint/lint.mjs:1099 | lint-refuse | param-mutation | mutation | map mutation on a non-local |
| lint/lint.mjs:1103 | lint-refuse | unsupported-syntax | unread-syntax | only assignments, ++/--, calls, and await may stand as statements |
| lint/lint.mjs:1110 | lint-refuse | var | declarations | `var` is outside the subset; use let or const |
| lint/lint.mjs:1166 | lint-refuse | promise-handler | promises | <named.message> |
| lint/lint.mjs:1166 | lint-refuse | promise-thenable | promises | <named.message> |
| lint/lint.mjs:1168 | lint-refuse | promise-handler | promises | inline a handler that mutates so its state is visible |
| lint/lint.mjs:1172 | lint-refuse | promise-handler | promises | use an arrow with plain parameters |
| lint/lint.mjs:1181 | lint-refuse | promise-handler | promises | inline a same-file call that throws or mutates so its fault and state are visible |
| lint/lint.mjs:1182 | lint-refuse | promise-handler | promises | use declarations, conditionals, calls, return and throw in an inline promise body |
| lint/lint.mjs:1189 | lint-refuse | promise-thenable | promises | use a plain value or a statically typed native Promise; custom thenable adoption is not read |
| lint/lint.mjs:1193 | lint-refuse | promise-pending | promises | await or return the promise directly; a dangling or stored continuation leaves observable pending work |
| lint/lint.mjs:1196 | lint-refuse | promise-executor | promises | <shape.message> |
| lint/lint.mjs:1196 | lint-refuse | promise-executor-escape | promises | <shape.message> |
| lint/lint.mjs:1196 | lint-refuse | promise-unsettled | promises | <shape.message> |
| lint/lint.mjs:1200 | lint-refuse | promise-executor | promises | a callback bridge must call an outside API |
| lint/lint.mjs:1207 | lint-refuse | promise-handler | promises | Promise.resolve and Promise.reject take at most one value |
| lint/lint.mjs:1211 | lint-refuse | promise-handler | promises | use one explicit handler per link; use catch for rejection |
| lint/lint.mjs:1217 | lint-refuse | async | promises | `await` outside an async function |
| lint/lint.mjs:1231 | lint-refuse | async | promises | awaited callee form is outside the subset |
| lint/lint.mjs:1235 | lint-refuse | string-code-unit | strings | use BMP scalar literals within the string model; astral and surrogate strings need lane B |
| lint/lint.mjs:1246 | lint-refuse | operator-value-context | operators-as-values | move this value step into an explicit statement and conditional branch |
| lint/lint.mjs:1257 | lint-refuse | operator-value-context | operators-as-values | write this mutating method call as a separate statement |
| lint/lint.mjs:1266 | lint-refuse | update-expression | operators-as-values | increment a numeric local or numeric field |
| lint/lint.mjs:1266 | lint-refuse | assignment-expression | operators-as-values | increment a numeric local or numeric field |
| lint/lint.mjs:1267 | lint-refuse | update-expression | operators-as-values | write this assignment as a statement |
| lint/lint.mjs:1267 | lint-refuse | assignment-expression | operators-as-values | write this assignment as a statement |
| lint/lint.mjs:1268 | lint-refuse | update-expression | operators-as-values | use numeric compound assignment or string += with a string value |
| lint/lint.mjs:1268 | lint-refuse | assignment-expression | operators-as-values | use numeric compound assignment or string += with a string value |
| lint/lint.mjs:1287 | lint-refuse | operator-value-context | operators-as-values | keep the target root unchanged while evaluating the assignment reference and right side |
| lint/lint.mjs:1292 | lint-refuse | operator-value-context | operators-as-values | keep the target root unchanged while evaluating an enclosing assignment |
| lint/lint.mjs:1298 | lint-refuse | update-expression | operators-as-values | narrow optional paths before assigning |
| lint/lint.mjs:1298 | lint-refuse | assignment-expression | operators-as-values | narrow optional paths before assigning |
| lint/lint.mjs:1306 | lint-refuse | type-assertion | type-assertion | <why> |
| lint/lint.mjs:1315 | lint-refuse | template | tagged-template | the tag must be a name |
| lint/lint.mjs:1327 | lint-refuse | non-null-assertion | non-null-assertion | `x!` on a value that may be null or undefined checks nothing at run time; test it (`if (x === undefined) ...`) |
| lint/lint.mjs:1332 | lint-refuse | bitwise | bitwise | bitwise operands must be numbers; BigInt and opaque coercions need lane B |
| lint/lint.mjs:1334 | lint-refuse | unary-coercion | numbers | unary + coerces; it is outside the subset |
| lint/lint.mjs:1340 | lint-refuse | delete | mutation | `delete` is a statement, not a value |
| lint/lint.mjs:1341 | lint-refuse | receiver-write | mutation | <RECEIVER_WRITE> |
| lint/lint.mjs:1341 | lint-refuse | delete | mutation | delete on `${}`, which this function does not own |
| lint/lint.mjs:1341 | lint-refuse | alias-mutation | mutation | <aliasMsg(root.text, o.decl, false)> |
| lint/lint.mjs:1341 | lint-refuse | dynamic-key | keys | a dictionary key is a string |
| lint/lint.mjs:1342 | lint-refuse | delete | mutation | delete of a field of this is outside the subset; assign undefined |
| lint/lint.mjs:1342 | lint-refuse | delete | mutation | delete on `${}`, which this function does not own |
| lint/lint.mjs:1342 | lint-refuse | alias-mutation | mutation | <aliasMsg(root.text, o.decl, false)> |
| lint/lint.mjs:1343 | lint-refuse | delete | mutation | delete of this target is outside the subset |
| lint/lint.mjs:1345 | lint-refuse | void | unread-syntax | `void` is outside the subset |
| lint/lint.mjs:1349 | lint-refuse | generator-use | generators | yield is a statement; sent values need a step reading |
| lint/lint.mjs:1350 | lint-refuse | this | classes | `this` outside a class method; a free function declares its receiver as a `this` parameter |
| lint/lint.mjs:1351 | lint-refuse | class | classes | `super` is read only as `super.m(...)` or `super(...)` in a constructor, a call of the parent's method |
| lint/lint.mjs:1352 | lint-refuse | class | classes | classes are outside the subset |
| lint/lint.mjs:1356 | lint-refuse | unsupported-call | library | new ${}(...) reads an array, a Map, a Set or one of their iterators; build the entries as an array first |
| lint/lint.mjs:1358 | lint-refuse | dynamic-eval | names | `new Function` is outside the subset |
| lint/lint.mjs:1360 | lint-refuse | async | promises | `new Promise` inside an opaque promise call has no reading |
| lint/lint.mjs:1363 | lint-refuse | dynamic-eval | names | `new ${}` is outside the subset |
| lint/lint.mjs:1363 | lint-refuse | prototype | prototype | `new ${}` is outside the subset |
| lint/lint.mjs:1371 | lint-refuse | unsupported-syntax | unread-syntax | `new.target` reads how the function was called; it is outside the subset |
| lint/lint.mjs:1373 | lint-refuse | unsupported-syntax | unread-syntax | `import.meta.env` is injected at build time; read it outside the subset |
| lint/lint.mjs:1379 | lint-refuse | spread | arrays | spread works on arrays, sets, maps and their keys(), values() and entries() |
| lint/lint.mjs:1380 | lint-refuse | unsupported-syntax | unread-syntax | array holes are outside the subset |
| lint/lint.mjs:1385 | lint-refuse | unsupported-syntax | unread-syntax | literal getters need fixed named fields; use a class for spread or computed accessors |
| lint/lint.mjs:1386 | lint-refuse | spread-source | record-copy | <why> |
| lint/lint.mjs:1388 | lint-refuse | object-method-mutation | object-literal-methods | spreading a method object rebinds its receiver and evaluates getters; copy data fields explicitly |
| lint/lint.mjs:1388 | lint-refuse | spread-source | record-copy | `{ ...${} }` copies every own key: ${} (escape spread_source) |
| lint/lint.mjs:1391 | lint-refuse | prototype | prototype | `__proto__:` in a literal sets the object's prototype, not a key; the value reading has only plain objects (pr |
| lint/lint.mjs:1395 | lint-refuse | dynamic-key | keys | <why> |
| lint/lint.mjs:1400 | lint-refuse | iterator-protocol | object-literal-methods | custom iterator protocol methods need a step reading; use a generator or an array |
| lint/lint.mjs:1407 | lint-refuse | closure-mutation | mutation | a literal method cannot change a captured binding; use a class for shared state |
| lint/lint.mjs:1408 | lint-refuse | object-method-mutation | object-literal-methods | literal this reads scalar fields; reference-valued receiver state needs a class |
| lint/lint.mjs:1409 | lint-refuse | object-method-mutation | object-literal-methods | keep literal this as a direct data-field read; use a class for aliases or rebinding |
| lint/lint.mjs:1410 | lint-refuse | object-method-mutation | object-literal-methods | literal method fields are immutable; use a class for mutable receiver state |
| lint/lint.mjs:1411 | lint-refuse | object-method-mutation | object-literal-methods | literal method fields are immutable; use a class for mutable receiver state |
| lint/lint.mjs:1417 | lint-refuse | object-method-capture | object-literal-methods | a literal method needs stable captured bindings; use a class for shared changing state |
| lint/lint.mjs:1426 | lint-refuse | object-method-capture | object-literal-methods | a literal method captures an unchanging value; copy mutable data before capturing it |
| lint/lint.mjs:1430 | lint-refuse | unsupported-syntax | unread-syntax | literal setters and computed methods need a class accessor or a named method |
| lint/lint.mjs:1433 | lint-refuse | spread | arrays | spread is allowed in array and record literals only |
| lint/lint.mjs:1435 | lint-refuse | unsupported-syntax | unread-syntax | expression ${} is outside the subset |
| lint/lint.mjs:1443 | lint-refuse | prototype | prototype | <po.refuse> |
| lint/lint.mjs:1447 | lint-refuse | division | numbers | `/` on numbers is real division; write Math.floor(a / b) for integer division |
| lint/lint.mjs:1452 | lint-refuse | bitwise | bitwise | bitwise operands must be numbers; BigInt and opaque coercions need lane B |
| lint/lint.mjs:1460 | lint-refuse | loose-equality | equality | use === and !== with an object, bigint or symbol operand; between primitives == follows the coercion table |
| lint/lint.mjs:1464 | lint-refuse | instanceof-constructor | instanceof | use a named ordinary constructor for instanceof; dynamic constructors may run effects |
| lint/lint.mjs:1467 | lint-refuse | instanceof-constructor | instanceof | use a class declaration for instanceof; a constructor value needs a runtime identity |
| lint/lint.mjs:1474 | lint-refuse | instanceof-constructor | instanceof | a custom Symbol.hasInstance may run effects; use an ordinary constructor |
| lint/lint.mjs:1479 | lint-refuse | prototype | prototype | this file makes an object whose prototype is not Object.prototype (line ${}), and ${}; `in` reads the prototyp |
| lint/lint.mjs:1480 | lint-refuse | dynamic-key | keys | <why> |
| lint/lint.mjs:1484 | lint-refuse | bitwise | bitwise | bitwise and shift operators are outside the subset |
| lint/lint.mjs:1490 | lint-refuse | mixed-types | equality | + adds two numbers or joins to a string |
| lint/lint.mjs:1492 | lint-refuse | string-order | strings | compare two strings, or convert both operands explicitly |
| lint/lint.mjs:1501 | lint-refuse | mixed-types | equality | a value that is sometimes a primitive and sometimes a record or array compares with === only against a literal |
| lint/lint.mjs:1502 | lint-refuse | reference-equality | equality | === on arrays and records compares references; compare fields |
| lint/lint.mjs:1546 | lint-refuse | conditional-effect | logic-values | move a call that changes its arguments into an explicit if branch so the updated values leave the branch |
| lint/lint.mjs:1595 | lint-refuse | generator-bound | generators | <shape.message> |
| lint/lint.mjs:1595 | lint-refuse | generator-effect | generators | <shape.message> |
| lint/lint.mjs:1595 | lint-refuse | generator-use | generators | <shape.message> |
| lint/lint.mjs:1597 | lint-refuse | hook-order | react | a hook is called under a branch, a loop, a nested function or after an early return; hooks run at the top of t |
| lint/lint.mjs:1604 | lint-refuse | prototype | prototype | <ok.refuse> |
| lint/lint.mjs:1605 | lint-refuse | optional-chain | optional-chain | <why> |
| lint/lint.mjs:1612 | lint-refuse | unsupported-call | calls | ${} takes ${} arguments |
| lint/lint.mjs:1613 | lint-refuse | generator-use | generators | consume a pure generator directly in for-of, spread, Array.from or yield* |
| lint/lint.mjs:1614 | lint-refuse | async | promises | an async unit is called without await |
| lint/lint.mjs:1616 | lint-refuse | spread | arrays | a spread argument goes to a rest parameter, as the last argument |
| lint/lint.mjs:1616 | lint-refuse | function-value | calls | a same-file function takes values, not callbacks |
| lint/lint.mjs:1623 | lint-refuse | this | classes | `this` outside a class method |
| lint/lint.mjs:1625 | lint-refuse | bound-function | calls | `bind` fixes a receiver for a later call; call the function with its receiver instead |
| lint/lint.mjs:1626 | lint-refuse | unsupported-call | calls | `call` and `apply` take the receiver first |
| lint/lint.mjs:1627 | lint-refuse | unsupported-call | calls | `apply` takes its arguments as one array literal |
| lint/lint.mjs:1634 | lint-refuse | math-empty | library | Math.min/max need a nonempty list; use xs.length > 0 ? Math.max(...xs) : a fallback |
| lint/lint.mjs:1635 | lint-refuse | spread | arrays | Math sequence arguments must be numbers; narrow opaque values before spreading |
| lint/lint.mjs:1645 | lint-refuse | unsupported-call | calls | ${}.${} takes ${} arguments |
| lint/lint.mjs:1646 | lint-refuse | generator-use | generators | consume a static generator through a top-level generator function |
| lint/lint.mjs:1647 | lint-refuse | async | promises | an async unit is called without await |
| lint/lint.mjs:1654 | lint-refuse | opaque-mutation | mutation | .${}() on `${}`, an opaque value${}, used as a value: the call may mutate it |
| lint/lint.mjs:1654 | lint-refuse | param-mutation | mutation | .${}() on `${}`, an opaque value${}, used as a value: the call may mutate it |
| lint/lint.mjs:1663 | lint-refuse | async-predicate | callbacks | ${} does not await its predicate: a Promise is truthy even when it resolves false; await values with Promise.a |
| lint/lint.mjs:1664 | lint-refuse | async-reduce | callbacks | reduce passes a Promise accumulator without waiting; use a for-of loop with await |
| lint/lint.mjs:1665 | lint-refuse | async-callback | callbacks | ${} does not await its callbacks; use await Promise.all(xs.${}(...)) |
| lint/lint.mjs:1666 | lint-refuse | callback-form | callbacks | a callback thisArg is outside the subset; capture the receiver in an arrow |
| lint/lint.mjs:1669 | lint-refuse | callback-result | callbacks | an effectful type-predicate callback needs an explicit for-of loop with a type guard |
| lint/lint.mjs:1670 | lint-refuse | callback-result | callbacks | a thenable callback needs an async arrow with an explicit await |
| lint/lint.mjs:1671 | lint-refuse | callback-result | callbacks | an effectful flatMap callback returns either arrays on every path or scalar values on every path; use a for-of |
| lint/lint.mjs:1674 | lint-refuse | callback-form | callbacks | an effectful array callback takes the element (and an index), or the accumulator and the element; an extra par |
| lint/lint.mjs:1676 | lint-refuse | callback-form | callbacks | <bad> |
| lint/lint.mjs:1678 | lint-refuse | promise-all-order | promises | Promise.all does not order work after await; use a for-of loop with await for ordered effects |
| lint/lint.mjs:1681 | lint-refuse | callback-form | callbacks | Promise.all callback loops take one element name and an optional index name |
| lint/lint.mjs:1695 | lint-refuse | foreach | callbacks | forEach does not wait for an async callback: the function returns before the steps finish; write `for (const x |
| lint/lint.mjs:1699 | lint-refuse | foreach | callbacks | forEach is read as a statement; put it in a block before returning a value |
| lint/lint.mjs:1706 | lint-refuse | foreach | callbacks | forEach runs a callback for its effects; write `for (const x of xs)` so the state comes out of the loop, or pa |
| lint/lint.mjs:1710 | lint-refuse | in-place-mutation | library | ${} changes `${}` in place; write `${} = [...${}].${}(...)` |
| lint/lint.mjs:1710 | lint-refuse | param-mutation | mutation | ${} changes `${}` in place; write `${} = [...${}].${}(...)` |
| lint/lint.mjs:1713 | lint-refuse | param-mutation | mutation | push is a statement on a local only |
| lint/lint.mjs:1717 | lint-refuse | unsupported-call | library | ${} needs a callback |
| lint/lint.mjs:1719 | lint-refuse | unsupported-call | library | reduce needs a callback and an initial value |
| lint/lint.mjs:1722 | lint-refuse | function-value | calls | unexpected callback |
| lint/lint.mjs:1726 | lint-refuse | unsupported-call | library | Set.forEach is outside the subset; write for (const x of s) |
| lint/lint.mjs:1726 | lint-refuse | collection-iterator | library | s.${}() is an iterator its first read uses up; spread it, loop over it with for-of or pass it to Array.from wh |
| lint/lint.mjs:1727 | lint-refuse | unsupported-call | library | Map.forEach is outside the subset; write for (const [k, v] of m) |
| lint/lint.mjs:1727 | lint-refuse | collection-iterator | library | m.${}() is an iterator its first read uses up; spread it, loop over it with for-of or pass it to Array.from wh |
| lint/lint.mjs:1734 | lint-refuse | unsupported-call | library | .toString() on ${} reads Object.prototype.toString or the object's own toString, a prototype this unit does no |
| lint/lint.mjs:1735 | lint-refuse | unsupported-call | library | method .${}() on ${} is outside the subset; narrow the union with typeof or Array.isArray first so the call ha |
| lint/lint.mjs:1736 | lint-refuse | unsupported-call | calls | method .${}() on ${} is outside the subset |
| lint/lint.mjs:1740 | lint-refuse | unsupported-call | calls | calls through computed callees are outside the subset |
| lint/lint.mjs:1749 | lint-refuse | update-expression | operators-as-values | <msg> |
| lint/lint.mjs:1749 | lint-refuse | assignment-expression | operators-as-values | <msg> |
| lint/lint.mjs:1752 | lint-refuse | unsupported-call | library | splice as a value takes plain arguments |
| lint/lint.mjs:1753 | lint-refuse | unsupported-call | library | .${}() in an optional chain changes a receiver that may be absent; check it first |
| lint/lint.mjs:1757 | lint-refuse | unsupported-call | library | .${}() as a value changes `${}`; call it on a local array or on a fresh one |
| lint/lint.mjs:1758 | lint-refuse | param-mutation | mutation | .${}() as a value changes the parameter `${}`; copy it to a local first |
| lint/lint.mjs:1759 | lint-refuse | alias-mutation | mutation | `${}` is another name for a value this function was handed; copy it first |
| lint/lint.mjs:1760 | lint-refuse | closure-mutation | mutation | .${}() as a value inside a callback changes `${}`; use a for-of loop |
| lint/lint.mjs:1762 | lint-refuse | mutator-value | library | .${}() as a value runs only on some paths here (a condition, a short circuit, a loop header); bind it to a con |
| lint/lint.mjs:1763 | lint-refuse | mutator-value | library | `${}` is read again in the statement that calls .${}() on it; read it in its own statement |
| lint/lint.mjs:1767 | lint-refuse | unsupported-call | library | fill takes a value and an optional start and end |
| lint/lint.mjs:1768 | lint-refuse | in-place-mutation | library | fill changes its receiver in place and returns it; fill a fresh array (`new Array(n).fill(v)`, `[...xs].fill(v |
| lint/lint.mjs:1772 | lint-refuse | unsupported-call | library | toReversed takes no argument |
| lint/lint.mjs:1773 | lint-refuse | unsupported-call | library | toSorted takes one comparator |
| lint/lint.mjs:1774 | lint-refuse | callback-form | callbacks | the comparator of toSorted is a pure function of two elements |
| lint/lint.mjs:1779 | lint-refuse | unsupported-call | library | ${} takes one callback |
| lint/lint.mjs:1780 | lint-refuse | callback-form | callbacks | the callback of ${} takes the element only (an index counts from the end); use a for loop over the indices |
| lint/lint.mjs:1781 | lint-refuse | callback-form | callbacks | the callback of ${} is a pure predicate; an effect needs a for loop |
| lint/lint.mjs:1785 | lint-refuse | unsupported-call | library | lastIndexOf takes one value (a start index stays out) |
| lint/lint.mjs:1787 | lint-refuse | unsupported-call | library | lastIndexOf compares by identity; on objects it is outside the subset |
| lint/lint.mjs:1790 | lint-refuse | unsupported-call | library | toString on an array takes no argument |
| lint/lint.mjs:1791 | lint-refuse | unsupported-call | library | toString with a radix is read on numbers only |
| lint/lint.mjs:1795 | lint-refuse | unsupported-call | library | .${}() reads the host's locale (a world read); call it in a map, filter, find, findIndex, some, every, flatMap |
| lint/lint.mjs:1796 | lint-refuse | unsupported-call | library | .${}() takes plain arguments |
| lint/lint.mjs:1799 | lint-refuse | unsupported-call | library | substr takes a numeric start and an optional numeric length |
| lint/lint.mjs:1802 | lint-refuse | unsupported-call | library | matchAll takes one pattern |
| lint/lint.mjs:1803 | lint-refuse | unsupported-call | library | matchAll needs the g flag; without it the call throws a TypeError |
| lint/lint.mjs:1806 | lint-refuse | unsupported-call | library | matchAll needs the g flag (and not y); without it the call throws a TypeError |
| lint/lint.mjs:1808 | lint-refuse | unsupported-call | library | matchAll starts at its pattern's lastIndex, which another call may have moved; pass a regular expression liter |
| lint/lint.mjs:1810 | lint-refuse | unsupported-call | library | search takes one pattern |
| lint/lint.mjs:1822 | lint-refuse | callback-form | callbacks | ${} is read as a callback only through an arrow; write `(x) => ${}(x)` with the arguments it reads |
| lint/lint.mjs:1823 | lint-refuse | callback-form | callbacks | ${} as a callback is read for map${}; write an inline arrow for ${} |
| lint/lint.mjs:1827 | lint-refuse | async-callback | callbacks | Promise.all over the named async function `${}` needs an inline async arrow so its awaits are read in order |
| lint/lint.mjs:1833 | lint-refuse | callback-form | callbacks | a class method passed as a callback loses its receiver; write an inline arrow |
| lint/lint.mjs:1834 | lint-refuse | async | promises | an async function cannot be a callback |
| lint/lint.mjs:1835 | lint-refuse | callback-form | callbacks | a generator passed as a callback returns its iterator; write an inline arrow |
| lint/lint.mjs:1836 | lint-refuse | callback-form | callbacks | `${}` is generic; pass it through an inline arrow so its type arguments are fixed |
| lint/lint.mjs:1837 | lint-refuse | callback-form | callbacks | a named effectful callback takes plain parameters, at most ${} (what ${} passes); write an inline arrow |
| lint/lint.mjs:1838 | lint-refuse | callback-form | callbacks | `${}` changes its argument, which here is the array's element; write an inline arrow that copies it |
| lint/lint.mjs:1842 | lint-refuse | callback-form | callbacks | a named effectful callback takes plain parameters, at most ${} (what ${} passes); write an inline arrow |
| lint/lint.mjs:1843 | lint-refuse | callback-form | callbacks | an effectful array callback needs an inline arrow so its world transitions are read in array order |
| lint/lint.mjs:1845 | lint-refuse | callback-result | callbacks | an effectful type-predicate callback needs an explicit for-of loop with a type guard |
| lint/lint.mjs:1846 | lint-refuse | callback-result | callbacks | an effectful flatMap callback returns either arrays on every path or scalar values on every path; use a for-of |
| lint/lint.mjs:1848 | lint-refuse | unsupported-call | library | reduce needs a callback and an initial value |
| lint/lint.mjs:1962 | lint-refuse | callback-control | exceptions | try, throw or a return from an inner loop in a callback needs an explicit for-of loop |
| lint/lint.mjs:1972 | lint-refuse | callback-form | callbacks | a class method cannot be passed as a callback |
| lint/lint.mjs:1972 | lint-refuse | async | promises | an async function cannot be a callback |
| lint/lint.mjs:1972 | lint-refuse | callback-form | callbacks | the callback takes at most ${} plain parameter(s) |
| lint/lint.mjs:1974 | lint-refuse | callback-form | callbacks | a callback is an arrow function, a same-file function or a local function value |
| lint/lint.mjs:1976 | lint-refuse | callback-form | callbacks | the callback must be an arrow function |
| lint/lint.mjs:1978 | lint-refuse | async | promises | async callbacks are outside the subset |
| lint/lint.mjs:1979 | lint-refuse | callback-form | callbacks | the callback takes at most ${} plain parameter(s); a default is read only where the parameter's type never hol |
| lint/lint.mjs:2010 | lint-refuse | react-handler-capture | react | a React closure captures a changing local; capture a const value or use a state setter |
| lint/lint.mjs:2018 | lint-refuse | unsupported-syntax | unread-syntax | a local component value must be a string tag name or a named component |
| lint/lint.mjs:2019 | lint-refuse | unsupported-syntax | unread-syntax | tag form ${} is outside the subset |
| lint/lint.mjs:2024 | lint-refuse | callback-form | callbacks | a handler is an arrow function |
| lint/lint.mjs:2035 | lint-refuse | spread | arrays | spread arguments need an ordinary array or a fixed tuple; open tuples and custom iterables are outside the sub |
| lint/lint.mjs:2045 | lint-refuse | spread | arrays | bind same-file call arguments inside an if statement before spreading; conditional expressions do not return p |
| lint/lint.mjs:2126 | lint-refuse | spread | arrays | spread arguments need an outside callee or a supported sequence operation |
| lint/lint.mjs:2131 | lint-refuse | object-method-mutation | object-literal-methods | call a literal method on its object; detached methods need an explicit receiver |
| lint/lint.mjs:2135 | lint-refuse | prototype | prototype | `this.constructor` is the run-time class of the receiver, a subclass too; name the class to read its statics |
| lint/lint.mjs:2138 | lint-refuse | prototype | prototype | `.${}` reaches the prototype chain |
| lint/lint.mjs:2139 | lint-refuse | global-read | names | `${}` is a static method used as a value; call it, or pass an arrow that calls it |
| lint/lint.mjs:2158 | lint-refuse | unsupported-member | members | property .${} on ${}: constrain the type parameter to one record declaring it |
| lint/lint.mjs:2161 | lint-refuse | unsupported-member | members | `.${}` called through apply or call is not the direct call here: ${}; call it on the array: `a.${}(...b)` or ` |
| lint/lint.mjs:2162 | lint-refuse | unsupported-member | members | <memberRow(name === 'index' ? 'match-index' : 'match-groups')> |
| lint/lint.mjs:2163 | lint-refuse | unsupported-member | members | property .${} on ${} is outside the subset |
| lint/lint.mjs:2165 | lint-refuse | dynamic-key | keys | <w.why> |
| lint/lint.mjs:2165 | lint-refuse | prototype | prototype | <w.why> |
| lint/lint.mjs:2166 | lint-refuse | unsupported-member | members | property .${} is not declared on ${} |
| lint/lint.mjs:2197 | lint-refuse | arguments | names | `arguments` is the actual argument vector, not the declared one; name the parameter, or declare a rest paramet |
| lint/lint.mjs:2206 | lint-refuse | prototype | prototype | this bracket key reaches the prototype chain; read a declared data field |
| lint/lint.mjs:2214 | lint-refuse | dynamic-key | keys | narrow the record receiver before indexing it |
| lint/lint.mjs:2220 | lint-refuse | dynamic-key | keys | <w.why> |
| lint/lint.mjs:2220 | lint-refuse | prototype | prototype | <w.why> |
| lint/lint.mjs:2220 | lint-refuse | dynamic-key | keys | bind the computed key before reading the record; a key call may mutate its receiver |
| lint/lint.mjs:2221 | lint-refuse | dynamic-key | keys | <why> |
| lint/lint.mjs:2225 | lint-refuse | dynamic-key | keys | bind the computed key before reading the record; a key call may mutate its receiver |
| lint/lint.mjs:2226 | lint-refuse | dynamic-key | keys | read a literal getter by its declared property name |
| lint/lint.mjs:2228 | lint-refuse | dynamic-key | keys | <w.why> |
| lint/lint.mjs:2228 | lint-refuse | prototype | prototype | <w.why> |
| lint/lint.mjs:2229 | lint-refuse | dynamic-key | keys | <INDEX_WHY> |
| lint/lint.mjs:2230 | lint-refuse | dynamic-key | keys | key ${} is not declared on ${} |
| lint/lint.mjs:2231 | lint-refuse | dynamic-key | keys | call a method by its declared name; computed record reads select data fields |
| lint/lint.mjs:2235 | lint-refuse | dynamic-key | keys | index an array or string by a number, or a record by declared string keys |
| lint/lint.mjs:2245 | lint-refuse | promise | promises | a Promise-returning function must return a promise or be async |
| lint/lint.mjs:2247 | lint-refuse | promise | promises | a promise built with new Promise is not a handle; make the function async |
| lint/lint.mjs:2251 | lint-refuse | promise | promises | a same-file async function runs on after its first await; return it from an async function with await |
| lint/lint.mjs:2252 | lint-refuse | promise | promises | a promise read out of a collection has no identity in the reading; return the call that made it |
| lint/lint.mjs:2257 | lint-refuse | promise | promises | a held promise of this result type has no identity in the reading; return the call itself |
| lint/lint.mjs:2260 | lint-refuse | promise | promises | return the promise from a call, a name or a conditional, or make the function async |
| lint/lint.mjs:2281 | lint-refuse | this-param | classes | <why> |
| lint/lint.mjs:2282 | lint-refuse | promise-executor | promises | <shape.message> |
| lint/lint.mjs:2282 | lint-refuse | promise-executor-escape | promises | <shape.message> |
| lint/lint.mjs:2282 | lint-refuse | promise-unsettled | promises | <shape.message> |
| lint/lint.mjs:2283 | lint-refuse | unsupported-syntax | unread-syntax | function without a body |
| lint/lint.mjs:2290 | lint-refuse | param-form | declarations | a rest parameter is an array |
| lint/lint.mjs:2304 | lint-refuse | toplevel-state | module-state | bind module state to a plain name |
| lint/lint.mjs:2305 | lint-refuse | toplevel-effect | module-state | move the effectful module initializer into a function |
| lint/lint.mjs:2312 | lint-refuse | class | classes | an anonymous class is outside the subset |
| lint/lint.mjs:2319 | lint-refuse | promise-executor | promises | <shape.message> |
| lint/lint.mjs:2319 | lint-refuse | promise-executor-escape | promises | <shape.message> |
| lint/lint.mjs:2319 | lint-refuse | promise-unsettled | promises | <shape.message> |
| lint/lint.mjs:2326 | lint-refuse | param-form | declarations | a rest parameter is an array |
| lint/lint.mjs:2339 | lint-refuse | toplevel-effect | module-state | code at module level runs on import; it is outside the subset |
| lint/lint.mjs:2351 | lint-refuse | exception-binding | exceptions | use a distinct name for a local that shadows a value read by finally |
| lint/lint.mjs:2356 | lint-refuse | exception-return | exceptions | return a primitive or copy the value; finally can change the returned alias |
| lint/lint.mjs:2404 | lint-refuse | implicit-this | classes | TS${}: `this` the function does not declare; declare the receiver as a `this` parameter |
| lint/lint.mjs:2422 | lint-refuse | update-expression | operators-as-values | <msg> |
| lint/lint.mjs:2422 | lint-refuse | assignment-expression | operators-as-values | <msg> |
| lint/lint.mjs:2440 | lint-advice | nested-ternary | advice | a branch contains another conditional expression; nested if statements preserve its evaluation order |
| lint/lint.mjs:2443 | lint-advice | inner-html | advice | this HTML property receives a value that is not a literal; use textContent if the intent is plain text |
| lint/lint.mjs:2448 | lint-advice | inner-html | advice | document.write parses HTML and changes the document; choose an element for textContent |
| lint/lint.mjs:2455 | lint-advice | promise-all-order | advice | this loop awaits one call per element; Promise.all needs independent calls that commute in the world |
| lint/lint.mjs:2479 | lint-refuse | any-type | advice | any-type could not read this file: ${} |
| translate/translate.mjs:85 | translate-throw |  | proof-shape | no top-level function named ${} in ${} |
| translate/translate.mjs:86 | translate-throw |  | proof-shape | --fn is required unless --core is given |
| translate/translate.mjs:151 | translate-refuse |  | proof-shape | no top-level function or class method named ${} |
| translate/translate.mjs:175 | translate-throw |  | translator-internal | outside the subset: ${} |
| translate/translate.mjs:516 | translate-refuse |  | callbacks | ${} has no call signature to read as a callback |
| translate/translate.mjs:550 | translate-refuse |  | callbacks | ${} returns a promise; an async callback needs an inline arrow under Promise.all |
| translate/translate.mjs:554 | translate-refuse |  | calls | callee ${} was not translated |
| translate/translate.mjs:555 | translate-refuse |  | callbacks | ${} changes its argument; a callback's argument is the array's element |
| translate/translate.mjs:556 | translate-refuse |  | callbacks | ${} is generic; pass it through an inline arrow |
| translate/translate.mjs:582 | translate-refuse |  | callbacks | parseInt reads the index JavaScript passes as its radix |
| translate/translate.mjs:583 | translate-refuse |  | callbacks | ${} has no reading as a callback |
| translate/translate.mjs:769 | translate-refuse | property-assign | mutation | property-assign: a function value installed into the outside is not read |
| translate/translate.mjs:843 | translate-refuse | this-param | classes | this-param: ${} |
| translate/translate.mjs:844 | translate-refuse | this | classes | this: `this` outside a class method; a free function declares its receiver as a `this` parameter |
| translate/translate.mjs:898 | translate-refuse | internal | translator-internal | internal: a static cell read in a pure unit |
| translate/translate.mjs:1060 | translate-refuse |  | types | type nesting too deep |
| translate/translate.mjs:1072 | translate-refuse |  | types | type parameter ${} is not one of this function's |
| translate/translate.mjs:1093 | translate-refuse |  | types | array-like type ${} has no element type |
| translate/translate.mjs:1094 | translate-refuse | reference-key | types | reference-key: a ${} by ${} compares by reference (SameValueZero); the value reading would equate two objects  |
| translate/translate.mjs:1111 | translate-refuse |  | types | type ${} is not translatable |
| translate/translate.mjs:1289 | translate-refuse |  | types | union type ${} is not translatable |
| translate/translate.mjs:1328 | translate-refuse |  | types | a field named ${} or ${} is the open record's own slot |
| translate/translate.mjs:1367 | translate-refuse |  | translator-internal | ${} reads or writes a metadata cell of the world in a unit not marked effectful |
| translate/translate.mjs:1419 | translate-refuse | promise-handler | promises |  |
| translate/translate.mjs:1419 | translate-refuse | promise-thenable | promises |  |
| translate/translate.mjs:1420 | translate-refuse |  | names | ${} is a function value; call it |
| translate/translate.mjs:1426 | translate-refuse | internal | translator-internal | internal: an effect in a unit not marked effectful (${}) |
| translate/translate.mjs:1493 | translate-refuse |  | arrays | spread arguments need an ordinary array |
| translate/translate.mjs:1694 | translate-refuse |  | translator-internal | no helper ${} |
| translate/translate.mjs:1703 | translate-refuse | number-special | numbers | number-special: a non-finite literal needs the opaque numeric reading |
| translate/translate.mjs:1705 | translate-refuse |  | numbers | number literal ${} is not an integer; use --real |
| translate/translate.mjs:1731 | translate-refuse |  | promises | a promise a same-file async unit returns, stored as a handle: the call reads its settled value, so no term nam |
| translate/translate.mjs:1764 | translate-refuse | type-assertion | type-assertion | type-assertion: ${} |
| translate/translate.mjs:1812 | translate-refuse | string-code-unit | strings | string-code-unit: use BMP scalar literals within the string model |
| translate/translate.mjs:1908 | translate-refuse |  | operators-as-values | value updates need --core |
| translate/translate.mjs:1921 | translate-refuse |  | mutation | assignment value needs a named array or dictionary |
| translate/translate.mjs:1928 | translate-refuse | assignment-expression | operators-as-values | assignment-expression: write this assignment as a statement |
| translate/translate.mjs:1953 | translate-refuse | prototype | prototype | prototype: a key that may be '__proto__' with an object or null value replaces the prototype |
| translate/translate.mjs:2000 | translate-refuse | internal | translator-internal | internal: an effect in a conditional branch of a pure unit |
| translate/translate.mjs:2052 | translate-refuse |  | names | ${} is a function value; call it |
| translate/translate.mjs:2118 | translate-refuse |  | classes | `this` outside a class method |
| translate/translate.mjs:2158 | translate-refuse | non-null-assertion | non-null-assertion | non-null-assertion: `x!` on a value that may be null or undefined |
| translate/translate.mjs:2174 | translate-refuse |  | names | new.target is not translated |
| translate/translate.mjs:2195 | translate-refuse |  | unread-syntax | expression ${} is not translated |
| translate/translate.mjs:2210 | translate-refuse |  | promises | an opaque promise call requires an effectful unit |
| translate/translate.mjs:2298 | translate-refuse | definite-assignment | declarations | definite-assignment: `let v!: T` may be read before its first assignment |
| translate/translate.mjs:2314 | translate-refuse | promise-handler | promises | promise-handler: this statement has no inline continuation reading |
| translate/translate.mjs:2329 | translate-refuse | promise-handler | promises | promise-handler: a promise returned from an opaque block of a throwing handler is not read |
| translate/translate.mjs:2339 | translate-refuse | promise-handler | promises |  |
| translate/translate.mjs:2339 | translate-refuse | promise-thenable | promises |  |
| translate/translate.mjs:2348 | translate-refuse | promise-handler | promises | promise-handler: a named handler mutates its argument |
| translate/translate.mjs:2382 | translate-refuse | promise-pending | promises | promise-pending: await or return the promise directly |
| translate/translate.mjs:2383 | translate-refuse |  | promises | promise forms require an effectful core unit |
| translate/translate.mjs:2400 | translate-refuse | generator-bound | generators |  |
| translate/translate.mjs:2400 | translate-refuse | generator-effect | generators |  |
| translate/translate.mjs:2400 | translate-refuse | generator-use | generators |  |
| translate/translate.mjs:2403 | translate-refuse | promise-unsettled | promises | promise-unsettled: an executor path does not settle |
| translate/translate.mjs:2405 | translate-refuse | promise-combinator | promises | promise-combinator: completion order is not read |
| translate/translate.mjs:2433 | translate-refuse | internal | translator-internal | internal: await in a unit not marked effectful |
| translate/translate.mjs:2441 | translate-refuse | internal | translator-internal | internal: await in a unit not marked effectful |
| translate/translate.mjs:2464 | translate-refuse | prototype | prototype |  |
| translate/translate.mjs:2556 | translate-refuse | conditional-effect | logic-values | conditional-effect: move the effect into an explicit if statement |
| translate/translate.mjs:2570 | translate-refuse | prototype | prototype | prototype: this file makes an object whose prototype is not Object.prototype (line ${}), and ${}; `in` reads t |
| translate/translate.mjs:2571 | translate-refuse | dynamic-key | keys | dynamic-key: ${} |
| translate/translate.mjs:2618 | translate-refuse |  | equality | loose equality on a non-primitive operand is not translated |
| translate/translate.mjs:2721 | translate-refuse | prototype | prototype | prototype: `__proto__:` in a literal sets the prototype, not a key |
| translate/translate.mjs:2722 | translate-refuse | spread-source | record-copy | spread-source: ${} |
| translate/translate.mjs:2799 | translate-refuse |  | keys | a computed key on a record with declared keys is a literal or a union of literals |
| translate/translate.mjs:2817 | translate-refuse | spread-source | record-copy | spread-source: ${} |
| translate/translate.mjs:2825 | translate-refuse | spread-source | record-copy | spread-source: a method or a function value beside a later spread is not read |
| translate/translate.mjs:2843 | translate-refuse |  | keys | the fields of a computed key union have different types |
| translate/translate.mjs:3081 | translate-refuse |  | callbacks | ${} is not a function |
| translate/translate.mjs:3087 | translate-refuse |  | callbacks | ${} has effects; it cannot be a callback |
| translate/translate.mjs:3092 | translate-refuse |  | callbacks | ${} is not a same-file function or a local function value |
| translate/translate.mjs:3094 | translate-refuse |  | callbacks | an effect inside a callback; the order of its world transitions is not defined |
| translate/translate.mjs:3108 | translate-refuse |  | callbacks | callback path ends without a return |
| translate/translate.mjs:3119 | translate-refuse |  | react | a hook result is taken apart field by field |
| translate/translate.mjs:3119 | translate-refuse |  | react | ${} is not a field the hook table declares for ${} |
| translate/translate.mjs:3130 | translate-refuse |  | destructuring | record rest needs a typed source record |
| translate/translate.mjs:3132 | translate-refuse |  | destructuring | a computed key in a record rest pattern is not translated |
| translate/translate.mjs:3176 | translate-refuse |  | destructuring | a rest element of a tuple or an opaque value is not translated |
| translate/translate.mjs:3184 | translate-refuse |  | destructuring | pattern is not translated |
| translate/translate.mjs:3205 | translate-refuse |  | names | ${}.${} is a function; call it |
| translate/translate.mjs:3210 | translate-refuse | internal | translator-internal | internal: a world field read in a pure method |
| translate/translate.mjs:3215 | translate-refuse | internal | translator-internal | internal: a world field read in a pure unit |
| translate/translate.mjs:3244 | translate-refuse |  | members | property .${} on ${}: the constraint declares no such member |
| translate/translate.mjs:3246 | translate-refuse |  | optional-chain | ?. on a type parameter is not translated |
| translate/translate.mjs:3385 | translate-refuse | absent-number | absence | absent-number: ${} of a local that holds a dictionary read typed without undefined and may change; bind the re |
| translate/translate.mjs:3420 | translate-refuse |  | keys | an absent key reads undefined, which this value type leaves out |
| translate/translate.mjs:3445 | translate-refuse | prototype | prototype | prototype: ${} names a member of Object.prototype, which an open record reads through its prototype, not its o |
| translate/translate.mjs:3447 | translate-refuse | dynamic-key | keys | dynamic-key: ${} |
| translate/translate.mjs:3459 | translate-refuse |  | keys | tuple index must be a literal |
| translate/translate.mjs:3482 | translate-refuse |  | keys | key ${} is not a declared data field |
| translate/translate.mjs:3523 | translate-refuse | internal | translator-internal | internal: a same-file constructor called from a pure unit |
| translate/translate.mjs:3527 | translate-refuse |  | calls | the constructor of ${} was not translated |
| translate/translate.mjs:3563 | translate-refuse |  | library | .${}() as a value needs a local array or a fresh one |
| translate/translate.mjs:3617 | translate-refuse |  | arrays | a spread among other arguments is not translated |
| translate/translate.mjs:3634 | translate-refuse |  | calls | ${} needs ${} arguments |
| translate/translate.mjs:3671 | translate-refuse |  | proof-shape | unknown record enumeration needs the world; use --core |
| translate/translate.mjs:3720 | translate-refuse |  | calls | callee ${} was not translated |
| translate/translate.mjs:3730 | translate-refuse |  | calls | callee ${} was not translated |
| translate/translate.mjs:3731 | translate-refuse |  | proof-shape | ${} loops, so it is a Dafny method and cannot be called inside an expression |
| translate/translate.mjs:3736 | translate-refuse |  | calls | the argument for `${}`, which ${} changes, must be a name or a fresh literal |
| translate/translate.mjs:3738 | translate-refuse | internal | translator-internal | internal: effectful callee in a pure unit |
| translate/translate.mjs:3748 | translate-refuse | internal | translator-internal | internal: effectful callee in a pure unit |
| translate/translate.mjs:3763 | translate-refuse | optional-chain | optional-chain | optional-chain: an optional call beside an assignment, update or comma is not read |
| translate/translate.mjs:3769 | translate-refuse | optional-chain | optional-chain | optional-chain: the callee is not a local function value |
| translate/translate.mjs:3798 | translate-refuse | optional-chain | optional-chain | optional-chain: the callee is not a declared field |
| translate/translate.mjs:3818 | translate-refuse | optional-chain | optional-chain | optional-chain: a computed callee is not read |
| translate/translate.mjs:3821 | translate-refuse | optional-chain | optional-chain | optional-chain: an overloaded or generic optional callee is not read |
| translate/translate.mjs:3862 | translate-refuse |  | react | a lazy initializer with more than a return is not read |
| translate/translate.mjs:3890 | translate-refuse |  | calls | `apply` takes its arguments as one array literal |
| translate/translate.mjs:3891 | translate-refuse |  | calls | `call` and `apply` take the receiver first |
| translate/translate.mjs:3896 | translate-refuse |  | calls | an array method called through ${} is not the direct call here: ${} |
| translate/translate.mjs:3899 | translate-refuse |  | translator-internal | hook ${} is a world transition in a unit not marked effectful |
| translate/translate.mjs:3905 | translate-refuse |  | translator-internal | hook ${} is a world transition in a unit not marked effectful |
| translate/translate.mjs:3911 | translate-refuse | prototype | prototype |  |
| translate/translate.mjs:3915 | translate-refuse | prototype | prototype | prototype: `Object.create(null)` makes an object without a prototype; a plain object reads through Object.prot |
| translate/translate.mjs:3933 | translate-refuse |  | calls | call through a computed callee is not translated |
| translate/translate.mjs:3980 | translate-refuse | internal | translator-internal | internal: effectful method called from a pure method |
| translate/translate.mjs:4002 | translate-refuse |  | calls | callee ${} was not translated |
| translate/translate.mjs:4006 | translate-refuse | internal | translator-internal | internal: effectful method called from a pure unit |
| translate/translate.mjs:4045 | translate-refuse | math-empty | library | math-empty: provide a nonempty argument list |
| translate/translate.mjs:4127 | translate-refuse |  | library | array method .${}() is not translated |
| translate/translate.mjs:4185 | translate-refuse |  | library | Set.${}() is not translated as an expression |
| translate/translate.mjs:4198 | translate-refuse |  | library | Map.${}() is not translated as an expression |
| translate/translate.mjs:4218 | translate-refuse |  | control-flow | bare return |
| translate/translate.mjs:4359 | translate-refuse |  | control-flow | a case declaration shadows a name the switch head assigns |
| translate/translate.mjs:4405 | translate-refuse |  | control-flow | a path ends without a return |
| translate/translate.mjs:4422 | translate-refuse |  | control-flow | statement ${} cannot be an expression |
| translate/translate.mjs:4440 | translate-refuse |  | exceptions | throw is translated in --core mode only |
| translate/translate.mjs:4494 | translate-refuse |  | unread-syntax | statement ${} is not translated |
| translate/translate.mjs:4514 | translate-refuse | receiver-write | mutation | receiver-write: a free function writes a nonoptional data record receiver |
| translate/translate.mjs:4517 | translate-refuse | receiver-mutation | mutation | receiver-mutation: a receiver path needs nonoptional data records |
| translate/translate.mjs:4519 | translate-refuse | alias-mutation | mutation | alias-mutation: `${}` is the element a loop or an array callback walks; this reading copies it, so a write thr |
| translate/translate.mjs:4530 | translate-refuse |  | mutation | field ${} is not a declared field of a record |
| translate/translate.mjs:4542 | translate-refuse |  | mutation | assignment through an optional field is not translated |
| translate/translate.mjs:4567 | translate-refuse |  | mutation | an element write through a value that is not an array |
| translate/translate.mjs:4574 | translate-refuse |  | mutation | field ${} is not a declared field of a record |
| translate/translate.mjs:4583 | translate-refuse |  | mutation | assignment through an optional field is not translated |
| translate/translate.mjs:4619 | translate-refuse |  | module-state | a logical module assignment uses the opaque unit reading |
| translate/translate.mjs:4630 | translate-refuse |  | module-state | a logical static assignment is outside the reading |
| translate/translate.mjs:4639 | translate-refuse | prototype | prototype | prototype: a key that may be '__proto__' with an object or null value replaces the prototype |
| translate/translate.mjs:4647 | translate-refuse |  | mutation | index assignment on a non-array |
| translate/translate.mjs:4660 | translate-refuse | internal | translator-internal | internal: an outside write in a pure unit |
| translate/translate.mjs:4664 | translate-refuse | internal | translator-internal | internal: a world field written in a pure unit |
| translate/translate.mjs:4684 | translate-refuse |  | mutation | a compound assignment on an optional field is not translated |
| translate/translate.mjs:4685 | translate-refuse |  | mutation | assignment operator is not translated |
| translate/translate.mjs:4697 | translate-refuse | internal | translator-internal | internal: a world field written in a pure method |
| translate/translate.mjs:4701 | translate-refuse |  | mutation | delete of a field of this is not translated; assign undefined |
| translate/translate.mjs:4702 | translate-refuse |  | mutation | delete of `${}`, a field that is not optional |
| translate/translate.mjs:4704 | translate-refuse |  | mutation | delete target is not translated |
| translate/translate.mjs:4707 | translate-refuse |  | mutation | element write through a path: the heap core reads it, the value reading does not |
| translate/translate.mjs:4730 | translate-refuse |  | proof-shape | a push through a bucket map is read in --core mode |
| translate/translate.mjs:4765 | translate-refuse |  | library | .${}() is not translated here |
| translate/translate.mjs:4768 | translate-refuse |  | control-flow | statement expression is not translated |
| translate/translate.mjs:4770 | translate-refuse |  | control-flow | a bare await statement has no effect in the core |
| translate/translate.mjs:4776 | translate-refuse |  | loops | in --real mode a for-loop counter starts at an integer literal |
| translate/translate.mjs:4823 | translate-refuse |  | control-flow | an abrupt exit has no enclosing loop or switch |
| translate/translate.mjs:5073 | translate-refuse | definite-assignment | declarations | definite-assignment: `let v!: T` may be read before its first assignment |
| translate/translate.mjs:5130 | translate-refuse | definite-assignment | declarations | definite-assignment: `let v!: T` may be read before its first assignment |
| translate/translate.mjs:5169 | translate-refuse |  | local-functions | a nested function needs a name |
| translate/translate.mjs:5186 | translate-refuse |  | control-flow | break or continue outside a loop |
| translate/translate.mjs:5189 | translate-refuse |  | unread-syntax | statement ${} is not translated |
| translate/translate.mjs:5228 | translate-refuse | internal | translator-internal | internal: an opaque block in a unit not marked effectful |
| translate/translate.mjs:5337 | translate-refuse |  | proof-shape | effectful callbacks need --core |
| translate/translate.mjs:5349 | translate-refuse |  | exceptions | a throwing callback here has no fault channel; call the array method in a statement of the unit |
| translate/translate.mjs:5416 | translate-refuse |  | loops | async iterator abrupt completion needs an opaque loop |
| translate/translate.mjs:5548 | translate-refuse |  | exceptions | a throwing callback here has no fault channel; call the array method in a statement of the unit |
| translate/translate.mjs:5558 | translate-refuse |  | loops | an effect in a for header |
| translate/translate.mjs:5609 | translate-refuse | key-order | loops | key-order: a for-in over an object whose key order the function does not fix (a parameter, a spread, a class i |
| translate/translate.mjs:5655 | translate-refuse |  | loops | while needs `// @decreases <expr>` |
| translate/translate.mjs:5670 | translate-refuse |  | control-flow | a labelled exit lacks its completion channel |
| translate/translate.mjs:5670 | translate-refuse | internal | translator-internal | internal: return in a loop without the return shape |
| translate/translate.mjs:5886 | translate-refuse | param-assign | mutation | param-assign: parameter `${}` is rebound and also changed in place |
| translate/translate.mjs:6006 | translate-refuse | alias-mutation | mutation | alias-mutation: `${}` is the element a loop or an array callback walks; this reading copies it, so the write w |
| translate/translate.mjs:6010 | translate-refuse |  | generators | async generators need --core |
| translate/translate.mjs:6011 | translate-refuse |  | generators | generators need --core |
| translate/translate.mjs:6035 | translate-refuse |  | control-flow | a path ends without a return |
| translate/translate.mjs:6060 | translate-refuse |  | decorators | the route wrapper is not read: ${} |
| translate/translate.mjs:6066 | translate-refuse |  | decorators | a piped parameter is a plain required name |
| translate/translate.mjs:6105 | translate-throw |  | numbers | internal: an integer division was not placed under Math.floor |
