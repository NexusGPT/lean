# The TypeScript subset (version 3)

A function inside the subset is read as mathematics: every value is a mathematical value (a number, a string, a
record, a sequence, a set, a map, an optional), every call into the outside world is a **transition of an explicit
world** (`ext_f(world, args): (world', result)`), and every block the translator cannot model is an **opaque block**,
one uninterpreted transition named by the block's own text. The proof then means: on every input and in every world,
the parent and the candidate return the same value and make the same transitions in the same order.
`lint/lint.mjs` enforces the rules below; `translate/translate.mjs` is the program that gives them meaning, and the
two cannot disagree because the translator runs the lint before it writes a line.

The lint reads the file with the TypeScript compiler, inside its project when a `tsconfig.json` is found above the
file (imports and types resolve through the project; a workspace package resolves to its source in the same tree), and
reports compiler errors inside the checked functions (rule `ts-strict`). A module the project cannot resolve is
reported as `unresolved-module`; its values are opaque and the finding is an environment finding, not a refusal.

The measured reach of this version on code written before it existed: 60.0 percent of 48,696 functions and methods
across 39 repositories, 83.4 percent of the nexus backend (`langs/ts/census.mjs` prints the share and the blocking
rules per package).

## Verdicts and units without a parent

| Verdict | Meaning |
|---|---|
| `WITNESS` | a paired execution differs on a recorded input |
| `PASS-proved` | paired observations are equal under the proof's stated model |
| `PASS-decided` | a finite component (state and props declared finite by its types) agreed on every event sequence; the product of both state spaces was explored to the end |
| `PASS-bounded` | paired observations agreed on the drawn inputs |
| `ASK` | the requested check remains undecided; `ASK:interface` when the TypeScript signature as written (parameter types, decorators, the return type) differs between the two sides, whatever the Dafny signature says |
| `REFUSE` | a local source link failed; `kind: load` names the file and real loader error |
| `NEW` | the candidate-only unit loaded and ran; input count, seed, fakes, faults and trace shapes are recorded |

`check.mjs`, `exec/run.mjs` and `lint/lint.mjs` accept `--candidate file --unit name`
without `--parent`. A parent file that lacks the unit has the same reading. The harness leaves a missing
candidate undecided. `NEW` never means equality, correctness or absence of faults.
There is no Dafny equality lemma without a parent. Input throws count as faults in `NEW`;
every evaluation failure is `ASK` with its environment class, as are budgets and timeouts.
Test modules are `ASK(test module)` before loading. Ordinary proof lint and translation are unchanged.

Declared external packages are recording fakes even without installed dependencies. Local
and aliased source imports use TypeScript resolution and Node's module linker. Undeclared
packages use Node resolution; missing external packages, generated output and build assets are ASK. A literal dynamic import is resolved before input generation,
even on a branch not drawn. Computed imports resolve only when executed. These assumptions
are carried by every candidate-only result. See [the design](design/new-units.md).

## What is exact

| Part | Allowed | Example |
|---|---|---|
| Types | `number` (an exact `int`, or an exact `real` in a file with a float literal or a bare `/`), `bigint`, `boolean`, `string`, literal unions, enums, type parameters of the function | `function id<T>(x: T): T` |
| Arrays | `T[]`, `readonly T[]`, `as const` lists, tuples, array-like interfaces (a match result) | `xs: readonly number[]` |
| Records | any object type the compiler can list, from any file; an intersection; two types with the same fields are one datatype; disjoint literal-tag record unions retain each member in a sum datatype | `type Account = { readonly id: number; readonly balance: number }` |
| Dictionaries | `{ [k: string]: V }`, `Record<string, V>` as the ordered carrier `OMap<string, V>(keys, m)`, its keys held in property order (array indices first, ascending, then the other keys in creation order: a new key takes its place when it is written, an old one keeps it, `delete` removes it); read by a string key; assigned by key on a local; a literal and a spread build it in source order; `Object.keys/values/entries`, `for...in` and a spread read the held order, and `for (const [k, v] of Object.entries(d))` with a body that never names `d` is the for-in over `d` with `const v = d[k]`; a record read as a dictionary is a conversion named by the source text, and the heap core leaves that unit out ([design](design/dict-order.md)) | `d['b'] = 1; d['2'] = 2; Object.keys(d)` is `["2", "b"]` |
| Sets and maps | `Set<T>`, `Map<K, V>` with primitive keys as ordered carriers `OSet<T>(items)` and `OMap<K, V>(keys, m)`: insertion order is a fact of the value (`set` appends a new key, keeps an old one in place; `delete` removes it); `has`, `get`, `size`, `keys`, `values`, `entries` read in order; `add`/`set`/`delete`/`clear` on a local; `new Set(xs)` and `new Map(es)` fold `add` and `set`; a spread, a for-of or `Array.from` of a Map, a Set or their `keys()`/`values()`/`entries()` reads the sequence ([design](design/ordered-collections.md)) | `[...new Set(xs)]`, `for (const [k, v] of m)` |
| Optionals | single-absence unions retain `Option<T>`; unions allowing both null and undefined use `Nullish<T>`; strict tests distinguish the tags, `== null` and `??` test both; `?.` returns Undef on either absent receiver; an `any` operand of `??` or `?.` is tested for null and undefined, never read as present | `x: number \| null \| undefined` |
| Optional calls | `f?.(x)` on a local function value, `r.m?.(x)` and `r?.m?.(x)` on a function field of a record path from a local, `this.m?.(x)` on a function field of a class: the callee is read once as an Option, and the arguments and the call run only when it is present; a data record's call is the ordinary method call, an opaque receiver's or `this`'s applies the value it read ([design](design/optional-call.md)) | `callbacks.onMessage?.(text)` |
| Declarations | `let`, `const`, `let x: T;` assigned before any read, `let x;` (an Option of its first assigned type, absent until then), destructuring patterns with defaults on object patterns, a nested `function f() {}` (a local function value); a declaration ends with its block (a bare block, an if, loop, try, catch or finally body, a case block, a for header): a name it shadows is saved before the block and rebound after it ([lint-misfires](design/lint-misfires.md)) | `const { a = 1, b } = r;` |
| Control | `if`/`else`, `switch` on scalar values (first matching case, default in source position, fall-through), early `return`, a bare `return;` in a constructor or where the result admits `undefined` (`T | undefined`, `void`, an inferred union, `any`, `unknown`; it yields `undefined`), `return` inside a loop, `break`, `continue`, `throw`, `void f()` | `switch (kind) { case "a": return 1; default: return 0; }` |
| Loops | `for...of` over an array, string, set, map or iterable; `for (let i = a; i < b; i += k)` up or down by a constant step; `while` with an inferred stable integer counter bound or `// @decreases`; guarded `while (true)` and `for (;;)` with such a bound; `do..while` with `// @decreases`; loop labels with named break/continue across nested helpers; `for..in` over uninterpreted object keys; `xs.forEach((x) => body)` with a sync arrow (a `return` ends one step); `await Promise.all(xs.map((x) => body))`, collecting in input order when no observable continuation runs after suspension; async `flatMap` under `Promise.all` collects each resolved value without flattening it | `for (let i = n - 1; i >= 0; i--)` |
| Guard and push loops | a `for...of` over an array (or a `forEach` statement) whose body is only guards (`if (c) continue;`, `if (c) return;` in the callback, or `if (p) { ... }` around the rest), `const` declarations and one final `acc.push(v)` into a local array nothing else reads or writes, every expression pure and no name a guard narrows read at a narrowed type: `acc + Map(Filter(xs, p), f)`, the reading `xs.filter(p).map(f)` gets; the theorem states the filter's congruence where both sides filter, so the loop, its chain and a reshaped loop prove against each other; any other loop keeps its helper ([design](design/loop-chain.md)) | `for (const e of es) { if (e.a !== a) continue; out.push(e.n * 2); }` |
| Operators | `+ - * %`, `Math.floor(a / b)`, `Math.trunc(a / b)`, `Math.min`, `Math.max`, `Math.abs`, unary `-`, `! && \|\| ??`, `=== !==`, `< <= > >=`, `?:`, `typeof`, `instanceof`, `in`; `&&`, `\|\|` and `??` as values of any types (both sides lifted to the result type); the left operand is evaluated once; a transition inside a `?:` branch or on the right of `&&`/`\|\|` happens only when that side runs, including when the result is a condition | `Math.floor(n / 2)` |
| Type tests | nominal class ancestry and disjoint tagged class unions for `instanceof`; static and sum-constructor tags for `typeof`; array/primitive alternatives for `Array.isArray`; `in` on a plain object (a dictionary or a record) as an own key or a name of Object.prototype (a prelude set; `design/in-prototype.md`), required record keys true, `in` on a Map uninterpreted, and `in` refused (`prototype`) in a unit an object with another prototype made in the file can reach (it is made there, passed in, returned or held by a module cell; the whole file when it leaves what the file can follow; `design/narrow-in.md`); narrowed sum payload reads | `if (r.kind === "a") return r.left` |
| Mixed union against a literal | `===`/`!==` between a literal (string, number, negated number, boolean) and a primitive-or-record union: true only on the literal's primitive arm holding its value, never through the coercion table; a sum arm exactly, an opaque value through its typeof tag and its conversion ([design](design/mixed-vs-literal.md)) | `result === "ok"` on `"ok" \| { error: E }` |
| Assignment | `=`, `+=`, `-=`, `*=`, `++`, `--` on a local, or on a parameter of the unit itself in its own body, branches and bounded loops included (a local that starts as the argument; [design/param-rebind.md](design/param-rebind.md)); `x.f = v`, `x.f += v`, `x.f++`, `xs[i] = v`, `x.f.push(v)` on a local or on a PARAMETER (a mutated parameter is an output of the function, returned beside the result; a caller that passed a name takes the new value back); `this.f = v`, `this.f += v`, `this.f++` on a field of the receiver | `user.tags.push(t);`; `Object.assign(t, s)` as a statement on a plain record rebuilds `t` with every declared field of `s` (a parameter `t` is an output); `structuredClone(v)` of plain data is the value itself (the heap core allocates a fresh cell of a flat record, array, Set, Map or Date); `new Date(n)`, `getTime`, `valueOf` and the UTC getters are exact in the heap core; a Date setter is a method call like any other, a world transition (the Date's state lives in the world), so `d.setFullYear(y)` needs no refusal and no rebinding |
| Operators as values | `x++`, `++x`, `x--`, `--x`, `=`, `+=`, `-=`, `*=` on owned locals, module bindings and supported paths; postfix yields the old value, other forms the stored value; comma evaluates left to right; earlier operands and call arguments are captured before updates; bounded while conditions run their bindings and transitions in the helper head | `arr[i++]`, `a = b = 0`, `while ((c = it.next()) !== null)` |
| Arrays at work | `xs[i]`, `.length`, `[...a, ...b]`, statement-form `push`/`unshift` with ordinary and spread arguments on a local or parameter (including record paths), statement-form `shift`/`reverse`/`splice`/`pop`, and `sort((a, b) => …)` as a statement (an uninterpreted stable reorder by the comparator; the heap core reads it from the library table), `includes`, `indexOf`, `slice`, `concat`, `join`, `flat`, `at`, `some`, `every`, `find`, `findIndex`, `map`, `filter`, `flatMap`, `reduce`, with index callbacks | `xs.map((x, i) => x * i)` |
| Effectful array callbacks | sync inline arrows with element/index names in `map`, `filter`, `find`, `findIndex`, `some`, `every`, `flatMap`; `reduce` with accumulator/element names and an initial value; each body threads the world, and find/some/every stop before visiting later elements | `xs.filter(x => svc.ok(x))` |
| Named effectful callbacks | a named function passed to one of those methods is the arrow JavaScript calls, `xs.map(f)` as `xs.map((x, i, a) => f(x, i, a))` (reduce passes the accumulator first), read by the same loop: a same-file function or a local arrow with plain parameters takes the arguments it declares; an import, a module value or a function-typed parameter takes every argument JavaScript passes, one transition per element in array order ([design](design/named-callbacks.md)) | `ids.map(toApiRow)` |
| Strings | literals, template literals, `+` (a non-string side is converted), `===`, `.length`, `s[i]`, `includes`, `startsWith`, `endsWith`, `indexOf`, `slice`, `substring`, `charAt`, `at`, `concat`, `repeat` | `` `${name}: ${n}` `` |
| Strings (BMP model envelope) | `trim`, `trimStart`, `trimEnd`, ASCII-guarded case conversion, literal `split` without limit, `padStart`/`padEnd`, literal-pattern `replace`/`replaceAll` with string replacement, `lastIndexOf`, lexicographic `< <= > >=`; literals, template literals, `+` (a non-string side is converted), `===`, `.length`, `s[i]`, `includes`, `startsWith`, `endsWith`, `indexOf`, `slice`, `substring`, `charAt`, `at`, `concat`, `repeat` | `` `${name}: ${n}` `` |
| Finite numeric operations | number bitwise `& \| ^ ~ << >> >>>`, with ToInt32/ToUint32 and masked shifts; `Math.ceil/round/sign`, corrected real `Math.trunc`; real remainder with a nonzero literal divisor; `Number.MAX_SAFE_INTEGER`; numeric and boolean `Number` and unary `+` | `x >>> 0`, `~~x` |
| Numbers | `toFixed`, `toString`, `toPrecision`, `toExponential` as uninterpreted functions of the number; `a ** b` as an uninterpreted power of both sides | `n.toFixed(2)` |
| Library rows (stage 5) | rows of `translate/library.json` marked `lane: ordinary` (design/library-rows.md): `pop`, `shift`, `splice` used as values (on a fresh array the removed element or run; on an owned local array, where the call runs on every path of its statement and the statement reads the array nowhere else, the array is rebound before the statement); `fill` on a fresh array; `toReversed`; `findLast`, `findLastIndex` with a pure one-parameter callback; `lastIndexOf` on primitives; `toString()` on an array (its `join()`), and on a string, boolean, bigint or a union of those and numbers (ToString, the template literal's function, also under `?.`); `substr` | `path.split("/").pop() ?? ""` |
| Record rest | `{ a, ...rest } = r` builds a datatype of remaining fields; fixed scalar records, static keys, no defaults, nonempty remainder | `const { a: ignored, ...rest } = r` |
| Record rest of a parameter, any field types | `function C({ a, b: c = d, ...rest }: P)`: `rest` is `ext_rest_<keys>_<hash>_to_<T>(source)`, one bodiless function per sorted list of excluded keys, so equal sources give equal remainders and a changed list is never proved equal; the source is a plain record, an intersection of plain records or untyped (`any`, an unresolved import); keys are written names; defaults allowed; `rest` is an alias of the source (a write through it is `alias-mutation`); a field default of an untyped source is a bodiless function of the source and the default (design/record-rest-any.md) | `function Card({ title, ...rest }: CardProps) { return <div {...rest} />; }` |
| Numeric spread | `Math.min`/`Math.max` fold every argument; nonemptiness follows from a scalar argument, literal element, or a spread of a name (`xs`, `xs.map(f)`, `xs.slice()`, `[...xs]`) under a test of `xs.length` that dominates the call: `?:`, `if`, `&&`/`\|\|`, or an earlier `if (...) return` in the same list, in any equivalent form (`xs.length`, `> 0`, `>= 1`, `!== 0`, `!xs.length` on the other branch), with no write of `xs` between ([lint-misfires](design/lint-misfires.md)) | `xs.length ? Math.max(...xs.map(f)) : 0` |
| Records at work | `{ f: v }`, `{ ...r, f: v }`, `r.f`, `r["f"]`, `r[k]` with a finite union of declared data-field string keys (including `keyof`), or a string on a dictionary; `r[k]` with an open key (a string, a number, a template) on one plain record of data fields, an uninterpreted lookup of the record value and the key ([open-key-read](design/open-key-read.md)); `{ [k]: v, ...m }` when the literal is a dictionary; `delete r.f` on an optional field of a local or parameter record; `delete m[k]` on a dictionary | `{ ...a, balance: a.balance + n }` |
| Record enumeration | `Object.keys/values/entries` on a plain immediate record literal or an enumeration-only const literal; integer-index keys first, then insertion order | `Object.keys({ b: 2, a: 1 })` is `["b", "a"]` |
| Calls | top-level functions of the same file, recursion included (a fuel bounds the unfolding; the theorem holds for every fuel), default arguments (only undefined runs the initializer; nullable inputs retain Null), a function-typed parameter or local, a local lambda `const f = (x) => ...` | `double(double(x))` |
| Generators | top-level pure scalar generators with finite counted loops; statement yield appends and yield* concatenates; direct for-of, spread and one-argument Array.from consume the sequence | `function* g(n: number) { yield n; yield n + 1; }` |
| Functions | `function` declarations, `const f = (...) => ...`, `async` functions (the result type is unwrapped), generic functions, same-file functions named as callback values; `Boolean`, `String`, `Number`, `parseInt` (the index is its radix) and `parseFloat` named as callback values read as their direct calls | `xs.map(double)`, `xs.filter(Boolean)` |
| JSX | an element is a value tree: `JsxElem(tag, props, children)`, `JsxText`, `JsxNothing` for `false`/`null`/`undefined`, `JsxList` for an array child; a handler is a pure lambda or a symbolic descriptor with captured values (straight-line calls, slot sets and `const` locals; an event parameter is the atom `ReactParam(k)`, a set that reads it is `ReactSetExpr`); other bodies are opaque by text and captures; `cond && <X/>`, `cond ? <A/> : <B/>`, `{xs.map((x) => <li/>)}`, fragments, spread attributes (merged in order) | `<li key={i.id} onClick={() => pick(i.id)}>{i.label}</li>` |
| React memo values | `useMemo(() => e, deps)` is a pure scalar `e`, and `useCallback(f, deps)` is `f`, when a literal dependency list covers local captures (or dependencies are omitted); other forms remain transitions | `useMemo(() => props.id + 1, [props.id])` |
| Object methods | immutable literals have function fields: exact scalar return methods close over data fields, broader bodies are opaque by text and captures; calls apply the lambda or transition the world; fixed literal getters defer the same operation until property read | `const s = { n, run(x: number) { return this.n + x; } }; s.run(2)` |
| Receiver record paths | nested named fields of `this` read the world field once, rebuild a declared data-record path, then write the field | `this.stats.deep.n += 1` |
| Free function receivers | a free function that declares `this: T` as its first parameter takes the receiver as an explicit first operand, read as a whole value (`return this`, `const self = this`) or through its fields; `f.call(o, a)` and `f.apply(o, [a])` on a same-file function pass `o` as that operand; a class method's receiver stays its class. A write through that `this` (`this.n = v`, `+=`, `++`, a path `this.a.b = v`, `this.xs.push(v)`) when the receiver and every container on the path are nonoptional data records: the receiver is a changed parameter, an output returned beside the result, and a caller passing a name through `call` or `apply` (in a loop too) takes the new value back ([design](design/receiver-write.md)) | `function scaled(this: Ctx, n: number) { return n * this.k; } scaled.call(o, 2)`; `function bump(this: Tally) { this.n++; } bump.call(t)` |
| Class accessors | getter and setter units, called by property reads and writes; unreadable bodies retain opaque source-sensitive units | `get total() { return this.a + this.b; }` |
| Classes | methods and static methods; a constructor that stores injected ports; fields read through `this`; a field any method assigns lives in the world (each read and write is a transition); a method of `this` called from a method; `super.m(...)` and `super(...)` as transitions on the receiver; `new C(args)` of a class in the same file: a fresh handle from the world, then C's constructor as a unit on it (initialisers, parameter properties, the body as writes); a method called on that instance is the file's own unit, and a field its methods write is read through the world | `class Svc { constructor(private readonly repo: Repo) {} async find(id: string) { return this.repo.find(id); } }` |

## What is a transition of the world

Each of these becomes a bodiless Dafny function that takes the world and returns the next world with its result. Two
calls of the same operation are two transitions; two reads of a clock are two values. A candidate that makes a
transition the parent did not make, or makes it with another argument or in another order, is not provably equal.

| Part | Example | Modelled as |
|---|---|---|
| Locale reads (stage 5 library rows) | `n.toLocaleString()`, `s.toLocaleLowerCase()` | a transition `<T>_toLocaleString(world, x, args)` (`bigint_…`, `str_…`): the host's locale data decides the text (ECMA-402); outside callbacks only |
| Async iteration | `for await (const x of it)` | iterator open and next transitions, with consumer work between next calls; fuel exhaustion has a source-sensitive opaque continuation; abrupt consumers are opaque whole loops |
| Async generators | scalar inputs or scalar async iterator handles, scalar yields | a source-and-dependency-sensitive suspended program handle in World; its body runs through next transitions, not at creation |
| React state and effects | `useState(initial)`, `useEffect(body, deps)` | a state read returns current state and a setter value; a setter call is a transition; an effect registers deferred work with an opaque body and its captures |
| An imported function, a method of an imported object, a value from another file | `isRequiredUuid(id)` | `ext_isRequiredUuid(wld, id)` |
| Spread to an outside callee, including opaque methods | `f(a, ...xs, b)` | `ext_f_seq(wld, [a] + xs + [b])`; a pure library external keeps the same sequence without the world |
| `await f(x)`, `await p` | `await repo.find(id)` | `ext_await_Repo_find(wld, repo, id)` |
| A method of a record, a class instance, an `any` | `date.getTime()` | `ext_Ext_Date_getTime(wld, date)` |
| A method of a field of `this`, a method-call statement on any receiver | `this.items.push(x)` | a transition on the field's value |
| A clock, randomness, the environment, a console, a fetch | `Date.now()`, `new Date()`, `performance.now()`, `process.hrtime()`, `Math.random()`, `console.log(x)` | ordered world transitions; lane B records clock requests and supplies seeded instants; `new Date(x)` stays a value conversion |
| `new X(...)` for any `X` but `Set`, `Map`, `Error`, `Date`, `Array`, typed arrays | `new Client(cfg)` | `ext_new_Client(wld, cfg)` |
| consumed `.then`, `.catch`, `.finally` on a native promise | `return p.then(r => r.value)` in an async unit | inline arrow continuation or named same-file/imported call; catch reads and clears the fault; finally runs on both paths and preserves the outcome unless it faults; other forms keep the outside-call reading with opaque handlers |
| consumed `new Promise` | `await new Promise<number>(resolve => resolve(n))` | synchronous terminal settlement bodies return the resolve value or raise the reject fault; a single outside callback bridge is opaque by text, captures and callees; so is one outside call handed the resolver itself (`setTimeout(resolve, ms)`) ([lint-misfires](design/lint-misfires.md)) |
| consumed `Promise.resolve`, `Promise.reject` | `return Promise.resolve(n)` | plain value/adoption, or raise the world fault when eligible; otherwise the existing outside call |
| other promise calls | stored/dangling/loop chains; `Promise.race`, `Promise.allSettled`, `Promise.any`; stored `Promise.resolve` | outside transition on the receiver and supplied values; handlers are opaque values by text, with captures and dependencies retained |
| a promise handle: a non-async unit returning a promise it did not build | `function f(c: Client): Promise<User> { return c.get(id); }`; a Promise static, a chain, a held name, a conditional of these | the handle is the returned transition's value, never settled inside the unit (its chains keep the outside-call reading); the signature carries `handle`, so an async rewrite is an interface change (design/promise-handle.md) |
| a held handle stored into its optional slot | `this.last = a` with `last: Promise<undefined> \| null`; `slots.last = a` on an interface with methods | `Some(handle)` (`Nullish.Some` when the slot admits null and undefined), never the absent constant its settled value reads as; a field of an opaque record is written by an uninterpreted update `ext_<R>_set_<f>(r, v)`; a promise a same-file async unit returns cannot be held this way and its unit is not translated (design/promise-field.md) |
| Unknown record enumeration | `Object.keys/values/entries(r)` for a parameter, escaped or mutated record | source-sensitive transition; own keys/order cannot be recovered from the structural datatype |

## What is uninterpreted

Each of these becomes a bodiless Dafny function of its arguments, the same on both sides.

| Part | Example | Modelled as |
|---|---|---|
| Other Object operations | `Object.assign/freeze/fromEntries` | existing pure uninterpreted calls; no new exact mutation or freezing claim |
| Numeric special boundary | variable or zero divisors, parsing, string numeric coercions, Number special constants, explicit -0, and performance/hrtime observers in integer files | complete unit opaque by source and reachable same-file dependencies; callers also opaque; previously admitted forms remain admitted |
| Numeric predicates | `Number.isNaN`, `Number.isFinite`, global `isNaN/isFinite` | pure uninterpreted predicates; no blanket finite answer |
| Module constants, enum members | `LIMITS.max` | `ext_LIMITS_max()` |
| `any`, `unknown`, overlapping or unclassified unions, `never`, `object`, symbols | `node.type`, `x === y` | the opaque type `Any`; accessor and operator externals; `==` on `Any` |
| A value only strict mode types `any` or `unknown` (the implicit-any policy: TS7005, 7006, 7008, 7010, 7011, 7015, 7018, 7019, 7022, 7023, 7024, 7031, 7034, 7053; TS18046 on a catch binding, on a value typed unknown by its source, or under a guard the checkout cannot resolve) | `catch (e) { return e.message; }`, `function f(...xs)` | the opaque type `Any`, as above; the code is admitted, never refused, and `--any-type` proposes the value's type ([design](design/implicit-any-policy.md)) |
| Library calls with no exact rule: non-ASCII case conversion, split with limit or dynamic separator, regex/callback replacement, `localeCompare`, `normalize`, `JSON`, general numeric `String`, `Buffer`, non-string-array `join` | `s.normalize()` | a pure function of all arguments |
| Regular expressions, `new RegExp`, `.test`, `.replace(re, …)` | `/a+/.test(s)` | an opaque constant per literal, externals for the operations; `m.index` and `m.input` of `const m = re.exec(s)` or `s.match(re)` with `re` a literal without g and y and `s` a literal or a name the unit never writes: `regex_index(re, s)` (one bodiless function of the pattern and the string) and `s` ([lint-misfires](design/lint-misfires.md)) |
| Library rows (stage 5), uninterpreted | `xs.toSorted(cmp)`, `s.search(re)`, `s.matchAll(/a/g)` | `toSorted` is the same `sort_<E>` (or `sort_default_<E>`) as `[...xs].sort(...)`; `search` a function of the string and the pattern (lastIndex is restored); `matchAll` with a `g` literal or a string pattern a function of both, its for-of the iterator's `to_seq`; a named pattern stays out (its lastIndex may have moved) |
| A callback passed to an external, stored in a record, or an async callback | `[...xs].sort((a, b) => a - b)` | an opaque function value named by its exact text and captured values; same-file callees are checked dependencies |
| A callback with an effect inside | `xs.map(async (x) => await f(x))` | a symbolic deferred sequence for supported zero-argument arrows, otherwise an opaque value with its captures |
| Effectful callbacks handed to an outside library | `register(x => svc.log(x))` | an opaque function value by its text |
| `as T`, `<T>x` | a compatible assertion or opaque conversion | identity when Dafny types agree, else `ext_cast_A_B(x)`; tests of assertion-derived values remain uninterpreted |
| Undecided type tests | assertion-derived values, unknown catch values, public structural class instances, optional or undeclared record keys | uninterpreted membership/tag functions of their values; an undeclared key is not known absent |
| Tagged templates | ``sql`select ${id}` `` | `ext_tag_sql_1(["select ", ""], id)` |
| `let x: T;` without a value | `let out: string;` | `ext_uninit_T()`, never observed (TypeScript checks the assignment comes first); an untyped `let x;` is `None` of the Option of its first assigned type, every narrowed read takes `.value` |

## What is a fault

An uncaught `throw e` raises a concrete optional fault in the returned world and ends the unit;
the ordinary result slot is unused. A same-file exception call propagates that outcome before using
its result. Throwing functions and their callers need the world; ordinary callees keep their reading.

Inside an exact try, transition checkpoints abort evaluation before the next expression and catch
binds and clears the fault. Outside method lookup precedes arguments. Finally runs on normal,
return and throw paths, preserving the saved completion unless cleanup returns or throws.
General transition checkpoints do not spread through the whole unit or its callees.
`JSON.parse/stringify`, `new URL/RegExp`, `BigInt` and URI codecs are may-fault transitions;
other implicit library exceptions remain a gap. Lane B executes the actual JavaScript.

## What is an opaque block

A try containing loops, callbacks, unsafe expression sequencing or duplicate bindings retains a
text-keyed opaque transition, including complex finally statements and object-valued completions.
A loop containing an explicit throw or exception call uses an opaque completion too. Ordinary loops
and callbacks keep their existing reading. A loop without a hint or an inferred bound remains opaque.
The transition takes the locals read and returns the locals assigned, the world and any result.
A statement that cannot fall through has a terminal result. Changed block text cannot silently
prove equal, and same-file callee dependency guards catch changes hidden behind the block.
Reference/unknown switch discriminants also stay opaque, preserving reference identity.
Bound inference accepts one integer local stepped unconditionally by a positive literal
toward an integer constant or an unchanged array/string length. Calls, nested loops,
continue, additional counter writes and other shapes keep the opaque reading.
An unconditional loop without a break can only complete through its return channel.

## Module state and loaders

| Construct | Reading |
|---|---|
| Module `let`/`var`, const Map/Set/array/object | World fields of the paired logical file, keyed by binding and declaration text; unknown initial value even for mutable literals. Reads and scalar writes are transitions; Map/Set/array statement mutations write the field. |
| Primitive module const | A literal value when written literally; its value when the initializer is literals and other such consts under `+`, `-`, `*`; otherwise an outside constant keyed by its declaration and the same-file declarations it reads, so `const B = A + 1` changes when `A` does ([design](design/module-forms.md)). |
| Static member of a same-file class (`C.m(x)`, `C.K`, `C.K = v`) | A static method called by the class name is the unit `C.m`. A static field is a module cell of its declaration: a world field (`Module_file_get/set_C_K_<hash>`) when the file writes it, it holds an object, or it is not readonly and the class is exported or used as a value; otherwise a constant (its literal, else a bodiless constant keyed by the declaration and its same-file dependencies). Writes are statements with `=`, `+=`, `-=`, `*=`, `++`, `--`. A static method naming `this` or `super` is one opaque transition keyed by the file's text ([design](design/class-statics.md)). Refused: a static method as a value, a function-valued field, an in-place mutator on a static, an inherited static, every static of a class with a static block (`global-read`); `this` in a static method with a destructured parameter (`static-this`); a member read through `this.constructor` (`prototype`). |
| `await import(spec)`, `require(spec)` | A loader transition returns `Ext_Module`, boxed to the resolved TypeScript-facing type. Member reads are accessors; calls are transitions. Nonliteral specifiers remain explicit arguments. |
| `globalThis`, `global`, `window`, `process.env` reads | Ordered world transitions; property names and computed keys are explicit arguments. |
| A global the lib or an @types package declares (`navigator`, `location`, `getComputedStyle`, `btoa`, `AbortSignal`, `__dirname`), outside the tables above | A read of the name is `global_read_<name>(world)`, a property or element path rooted at it the `global_get_` transition on `global_handle_<name>`, `typeof <name>` the world read `global_typeof_<name>` (whether it exists is a fact of the world), a call a transition ([design](design/lib-globals.md)). Writes keep `property-assign` or `global-mutation`; `require` keeps its loader reading. |
| `process.exitCode = v`, `process.env.K = v` as statements | One world transition on the `process` handle, the field name and the value, after the receiver path is read and the value is evaluated ([design](design/process-write.md)); compound writes, writes used as values, installed functions and the other outside roots keep `property-assign`. |
| Module object alias across an effect, or a combination without a direct reading | One opaque unit transition keyed by the complete source, with world, receiver and parameters. |

See [module forms](design/module-forms.md). Effectful initializers on newly admitted
module let/var remain `toplevel-effect`; existing const initializers retain their outside
fallback. No initializer is executed or assumed by the proof lane.

## What is refused

| Rule | Refused | Example that is refused |
|---|---|---|
| `mutator-value` | `pop`, `shift`, `splice` used as a value on an owned local under a condition, a short circuit, an optional chain or a loop header, or in a statement that reads the array again (advice: conditional) | `` const n = `${xs.shift()}:${xs.length}` `` |
| `dynamic-key` | open keys on a record holding a method or an accessor, on a class instance or a number-indexed receiver; symbol keys; missing fields; method values or calls inside the key; optional/union receivers must first be narrowed; since stage 5 rank 14 a computed key in a literal whose type has declared keys is admitted when the key's type is a literal or a union of literals (an enum member, a const): one member names the field, several are a case split on the key ([design](design/computed-literal-keys.md)); a `string` key on such a type, a key call, a member not declared on the type, members whose fields differ in type, or a literal holding a method stays refused | `r[k]` with `k: string` and `r: { a: number; run(): number }` |
| `index-assign` | dynamic writes to records | `r[k] = v` with `k: "a" \| "b"` |
| `instanceof-constructor` | dynamic constructor expressions, constructor values and custom `Symbol.hasInstance` hooks | `x instanceof chooseConstructor()` |
| `exception-callback` | a throwing unit stored as a value, or a throw inside a callback that is neither a loop body nor handed to an outside call; since stage 5 rank 20 a throw inside a synchronous array-method callback is the unit's throw (the statement one opaque block, as a loop statement with a throw) and a throwing unit or arrow handed to an outside call is the opaque value it already is ([design](design/throwing-callbacks.md)) | `const f = throwingUnit; return f;` |
| `exception-binding` | a try local shadows a binding read by its finally | `try { const x = 1; return x; } finally { x += 1; }` |
| `exception-return` | a returned object alias directly referenced by its finally | `try { return xs; } finally { xs.push(1); }` |
| `dynamic-eval` | `eval`, `Function`, `new Function` | `eval(code)` |
| `delete` | `delete` of a field of `this`, of a required field, or as a value | `delete this.cache.x` |
| `freeze` | `Object.freeze`, `seal`, `preventExtensions`: a later write to the object throws in strict code and the value reading has no fault for it | `Object.freeze(config)` |
| `prototype` | `.prototype`, `.constructor`, `__proto__`, `Reflect`, `Proxy`, `Object.getPrototypeOf`, `Object.setPrototypeOf`, `Object.create`, `Object.defineProperty`, `Object.defineProperties`, `Object.getOwnPropertyDescriptor(s)`; a dictionary write `d[k] = v` whose key may be `'__proto__'` with a value that may be an object or null (the setter of Object.prototype replaces the prototype; a primitive there is ignored, so that write is skipped on that key; [design](design/proto-write.md)); `in` in a unit such an object can reach ([design](design/narrow-in.md)) | `Object.getPrototypeOf(x)`, `d[k] = { n }` |
| `assign-target` | `Object.assign` used as a value, or with a target that is not a plain record the function owns or was handed, or with a source that has a field the target does not declare; as a statement on such a record the target is rebuilt with every declared field of each source and a parameter target becomes an output | `const u = Object.assign(user, patch)` |
| `class`, `inheritance` | `super` as a value (`const f = super.m`, `super.x`); `super.m(...)` as a call is read as a transition on the receiver | `const f = super.m` |
| `this` | `this` outside a class method, a literal method, or a free function that declares a `this` parameter | `function self() { return this; }` |
| `implicit-this` | a `this` a free function does not declare (TS2683, TS7041): the receiver is an input the function does not name; declare it as a `this` parameter ([design](design/implicit-any-policy.md)) | `function label() { return this.label; }` |
| `receiver-mutation` | a nested receiver path through a class instance, optional value or opaque handle | `this.client.state.n += 1` when `client` is a class instance |
| `receiver-write` | a write through the declared `this` of a free function when the receiver or a container on the path is a class instance, an array, a dictionary, an optional value or a record holding functions ([design](design/receiver-write.md)) | `function advance(this: Meter, by: number) { this.reading += by; }` when `Meter` is a class |
| `object-method-capture` | a method or getter captures a changing local binding | `let n = 0; const o = { read() { return n; } }; n++` |
| `object-method-mutation` | mutation of a literal with methods, including its methods writing `this`; detached/copied methods, shared named handlers and reference-valued literal receiver fields | `const o = { n: 0, read() { return this.n; } }; o.n++` |
| `global-mutation`, `global-read`, `toplevel-state`, `toplevel-effect` | unresolved globals, globals only the project declares (a build-time define), global assignment, module state binding patterns, effectful let/var initializers and executable module statements | `let counter = Date.now()` |
| `static-this` | `this` or `super` in a static method that has a destructured parameter (with plain parameters the method is one opaque unit): they name the class the call went through, a subclass too ([class statics](design/class-statics.md)) | `static scaled({ k }: Opts) { return this.base * k; }` |
| `alias-mutation` | changing a value through a local that is another name for a parameter's object (`const u = user`, `const t = user.tags`, `const x = xs[i]`), or for an element a for-of binds, or for whatever a built-in returns that its [library table](translate/library.json) row does not call fresh (`rs.find(..)`, `rs.at(i)`, `m.get(k)`, `Promise.resolve(x)`, `Object.assign(t, s)`), or for whatever a same-file call returned (`const s = this.held()`, `const t = tagsOf(user)`) unless every return of the callee is fresh: a primitive, a literal of fresh parts, `new` of fresh arguments, a copy of primitives, a fresh same-file call or a local built that way ([alias-result](design/alias-result.md)); a value that is one of its operands (`m.get(k) ?? []`, `a \|\| b`, `c ? a : b`) holds what either operand holds; a change after the name was rebound to a fresh value (`flat = []`) with no write in between, and no rebinding in a loop around the change, goes to the fresh value; a bucket local of a Map the unit built (`const l = m.get(k)`, `?? [..]`) is read as the Map's array, and on a Map of any values `const s = m.get(k) ?? new Set()` changed and then stored back by `m.set(k, s)` in the same list (no jump, no other use of the Map between) is read as a copy written back ([lint-misfires](design/lint-misfires.md)); the [heap reading](design/heap-layer.md) is a design and verified toy only | `const t = user.tags; t.push(1)`, `const s = this.held(); s.add(x)` |
| `param-assign`, `param-mutation`, `property-assign`, `index-assign`, `in-place-mutation` | rebinding a parameter (`p = v`) inside a callback or a `forEach` body, a callback's own parameter, a rest parameter, a generator's parameter, a parameter also changed in place (an output), or one a closure reads before a later write; a field or slot of what the function does not own (a module object, a cast, a value from the world; on `process` only a compound write, a write used as a value or an installed function); `sort`/`reverse` on a named array used as a value (as a statement with a comparator, `xs.sort((a, b) => a - b);` is a stable reorder of `xs`, uninterpreted in the comparator's order); a push into an array a Map holds, except `m.get(k)?.push(x)` on a Map the unit built with `new Map()` and fills with array literals while no other name holds its arrays, read as `m := if k in m then m[k := m[k] + [x]] else m` ([lint-misfires](design/lint-misfires.md)) | `(x as any).f = 1` |
| `react-handler-capture` | a React closure captures a local that changes during render or is declared later; a captured record mutated by the render | `let n = 0; const f = useCallback(() => save(n), [n]); n++;` |
| `hook-order` | a React hook called under a branch, a loop, a logical operator, a nested function, or after an earlier return of the render: hooks run at the top in a fixed order (Rules of React) | `if (open) { const [x] = useState(0); }` |
| `render-impure` | a render function (a unit that calls a hook) writes a module variable: a render only computes its tree (Rules of React) | `let renders = 0; function C() { const [s] = useState(0); renders++; … }` |
| `closure-mutation`, `foreach` | a callback (not a loop body) changing a variable declared outside it; since stage 5 rank 19 a synchronous array-method callback (`map`, `filter`, `reduce`, `some`, `every`, `find`, `findIndex`, `flatMap`, as `forEach` already) that writes a local, an array or a record of the enclosing function is read as the loop body it is, the cell its state ([design](design/array-callback-cells.md)); a callback handed to an outside call, a timer or an event stays refused; since stage 5 rank 21 a local procedure (a const arrow with a block body or a nested function used only as the callee of plain call statements, with no return value, throw, try, await or yield) is read as its body spliced at each call ([design](design/local-procedures.md)); a parameter or local named like a unit binding ends with the call, and a defaulted parameter a call leaves out binds its default; a call that passes a defaulted parameter a value that may be undefined keeps the function a callback ([lint-misfires](design/lint-misfires.md)); `forEach` with an async callback, which the function does not wait for | `xs.forEach(async (x) => { await f(x); })` |
| `opaque-mutation` | a mutating method on an opaque value used as a value, or as a statement when a field of the same receiver is read later | `const n = list.push(x)` |
| `function-value` | a callback passed to a same-file function (a same-file function takes values; a function value anywhere else is a pure lambda or an opaque value keyed by its text) | `twice((y) => y + 1, x)` |
| `division` | `/=`, `%=`; a bare `/` in an integer file (a file with no float literal and no `/` outside `Math.floor`) | `x /= 2` |
| `loose-equality` | `==` and `!=` except against `null`/`undefined` | `a == b` |
| `reference-equality` | `===` on arrays and records | `xs === ys` |
| `mixed-types` | `===` between a primitive-or-record union and a non-literal value (narrow it first); `+` that is neither two numbers nor a string join | `x === y` with `x: string \| Opts` |
| `string-order` | mixed string/non-string ordering | explicitly convert both operands |
| `string-code-unit` | astral and surrogate literal fragments | `"\u{1F600}".length` |
| `for-in-delete` | a `delete` in a for-in body that may remove a key of the iterated object other than the current one, or a call there of a same-file function that deletes and is handed the object or reads it by closure: the loop skips a key deleted before its visit, the reading visits the keys held at the start ([design](design/dict-order.md)) | `for (const k in d) { delete d['b']; }` |
| `for-in`, `label`, `loop-form` | unsupported for-in bindings, a label on a non-loop block; since stage 5 rank 15 every for header is read: the counted form `let i = a; i < b; i++` (and its mirror forms, the counter never assigned in the body) as a counted loop, any other header as `init; while (cond) { body; step }` with `continue` running the step ([design](design/for-desugar.md)); while/do/empty-header and such desugared for loops without a known bound (a derived one from the counter, the limit and a literal step, or a `// @decreases` hint) stay opaque; a `var` counter is refused as `var` | `exit: { break exit; }` |
| `optional-chain` | optional calls through an imported, global, computed, opaque, generic or overloaded callee, a field of a same-file class instance or of a union receiver, or beside an assignment, update or comma in one expression | `handlers[key]?.()` |
| `async-predicate`, `async-reduce` | promises are truthy predicates; reduce does not await its accumulator | `xs.filter(async x => svc.ok(x))` |
| `async-callback`, `promise-all-order` | async map/flatMap without direct awaited Promise.all; multiple suspensions or observable work after suspension | `xs.map(async x => { await f(x); log(x); })` |
| `callback-control`, `callback-result` | callback try, or return from an inner loop (a throw inside a synchronous array callback is admitted since stage 5 rank 20); effectful type guards, mixed flatMap results or PromiseLike callbacks | `xs.map(x => { for (;;) return svc.get(x); })` |
| `async`, `promise` | `await` outside an async function; a non-async Promise-returning function whose returned promise is not a handle: built by `new Promise`, from a same-file async function, read out of a collection or a field, or a held name of a result type with no identity (void) | `function f() { return new Promise((r) => r(1)); }` |
| `promise-pending` | unconsumed or loop-contained constructors, which had no earlier reading | `new Promise(resolve => resolve(1));` |
| `promise-unsettled`, `promise-executor-escape`, `promise-executor` | missing settlement paths, statements after settlement, saved resolvers or resolvers passed beside other statements, nonterminal settlement or async executors | `new Promise(resolve => { if (ok) resolve(1); })` |
| `promise-handler`, `promise-thenable` | unsupported bodies or unknown/custom thenable adoption in newly admitted executors; existing chains fall back to opaque calls | `await new Promise(resolve => resolve(unknownValue))` |
| `generator`, `generator-effect`, `generator-bound`, `generator-use` | nested generators; effectful sync producers, mutable captures/yields, unbounded sync loops, sent values or escaping pure iterators | `function* g() { while (true) yield 1; }` |
| `iterator-protocol` | custom Symbol.iterator / Symbol.asyncIterator methods in object literals | `{ [Symbol.iterator]() { ... } }` |
| `union-type` | a union the translator cannot name (two different arrays) | `number[] \| string[]` |
| `destructuring`, `param-form`, `uninitialised` | unsupported binding forms, rest parameters in nested declarations, a pattern with no initial value | `let { a };` |
| `record-rest` | a local pattern of a dictionary, class, accessor or reference-bearing record, with defaults or an empty remainder; in a parameter, a class, accessor, symbol-keyed, dictionary or type-parameter source, or a computed exclusion | `const { a, ...rest } = dictionary` |
| `math-empty` | possibly empty min/max argument lists no dominating length test covers | `Math.max(...xs)` without a guard |
| `number-special` | bare global NaN and Infinity (previously global-read refusals) | `return NaN` |
| `bitwise`, `unary-coercion` | bitwise on BigInt/opaque values; unary + on object/opaque/BigInt values | `x & 1n`, `+object` |
| `update-expression`, `assignment-expression` | non-numeric updates, logical assignment values, unsupported compound values and targets | `return (x ??= f())` |
| `conditional-effect` | a same-file call in a conditional arm or short-circuit right side that changes its arguments; branch expressions return world and value, not parameter updates | `on && change(xs)`; use an explicit `if` |
| `operator-value-context` | updates/sequences in conditional arms, short-circuit right sides, optional chains, constructor/tag callees, binding defaults, case labels, for headers, JSX or expressions constructing callbacks; a target root changed during reference/RHS evaluation; discarded container mutators in a comma | `flag && x++` |
| `callback-form` | a callback that is not an arrow function, a named function or a local function value; a method reference (`xs.map(o.m)`, it loses its receiver); a named effectful callback that is generic, changes its argument, takes an optional, defaulted, rest or `this` parameter or more than the arguments passed, or is a local function value built in the unit; a global other than `Boolean`, `String`, `Number`, `parseInt`, `parseFloat`; since stage 5 rank 13 an effectful arrow callback may destructure its element (an object or array pattern, no rest element) or carry a default its element type never holds ([design](design/callback-patterns.md)); a rest parameter, an optional parameter, a nested rest, a default the element may take, or a third parameter stays refused | `xs.map(function (x) { return x; })` |
| `spread` | array-literal spreads of a string, an opaque value or an iterator held in a name (since stage 5 rank 22 a Map, a Set and their `keys()`, `values()`, `entries()` spread in insertion order, [design](design/ordered-collections.md)); call spreads of open tuples (a rest element), sets or custom iterables (since stage 5 rank 18 a fixed tuple spread into an outside call is its elements in order, positional arguments, [design](design/tuple-spread.md)); local function values, optional methods, constructors or exact builtins without a sequence reading; same-file call arguments inside conditional sequence calls (use an if statement) | `callback(...xs)` |
| `collection-iterator`, `reference-key` | a Map or Set iterator (`m.keys()`, `m.values()`, `m.entries()`) held in a name or passed on: its first read uses it up; read it where it is made, in a spread, a for-of, `Array.from` or a Map or Set constructor. `reference-key` (the ordinary-lane translator; the heap core reads these by identity): a Map keyed or a Set of items by a record, an array or an opaque value, compared by reference; `Map.forEach` and `Set.forEach` stay `unsupported-call` ([design](design/ordered-collections.md)) | `const it = m.keys(); [...it]` |
| `unsupported-syntax`, `unsupported-call`, `unsupported-member`, `unsupported-operator`, `unsupported-type` | a statement form, a method with no rule, a property the type does not declare, an operator or a type with no reading; since stage 5 rank 16 a type alias or an interface declared inside a function is admitted (erased at run time, its uses read through the checker) and `import.meta` is a world read ([design](design/local-declarations.md)); a local `enum`, `new.target` and `import.meta.env` (injected at build time) stay refused; since stage 5 rank 17 a member read on a type parameter goes through its declared constraint (one record declaring the member: one uninterpreted field read, generic in the parameter), a read on an indexed `this` type takes the opaque path, and a read on `never` is unreachable ([design](design/member-constraints.md)); a type parameter constrained to a primitive or to no record stays refused | `x ** 2` |
| `ts-strict` | a compiler error in strict mode, except the implicit-any policy's codes (admitted as opaque, above); a read of an `unknown` the unit wrote on the binding with no unresolved guard stays here (TypeScript without strict refuses it as TS2339) | a type mismatch; `function f(v: unknown) { return v.length; }` |
| `any-type` | not a refusal: an advisory finding, reported only with `--any-type` (and in the editor rule, with the annotation as a quick fix), that never changes a verdict. Every parameter, local, bound name, field (of a class, an interface or a type literal) and unit return in the file typed `any` or `unknown`, at its declaration, with a type proposed from its uses, callers and callees: `conditional` with the evidence (a record, a primitive or another type), `migration` on conflicting evidence or a run-time type test, `flag-only` when no evidence exists. An `any` from an unresolved import stays `unresolved-module`; `catch` bindings, rejection reasons and interface fields written `unknown` are not reported ([design](design/any-type.md), [where and labels](design/any-advice.md)) | `function title(node: any)` reading `node.kind === "h"` and `node.text.trim()` |

## Proof hints

The proof hints are comments just before a loop, written in Dafny syntax with the TypeScript variable names:

```ts
// @invariant steps + i == n
// @decreases i
while (i > 0) { ... }
```

A hint is untrusted. Dafny checks it, and a wrong hint only makes a proof fail. A `for` loop needs no bound: the
translator derives it.

## What the translator writes

- `--core` writes pure Dafny functions, as `conformance/run.py` and `spec/theorem.py` expect. A loop becomes a
  recursive helper function with `decreases`; a `return` inside a loop makes the helper return `(Option<R>, state)`;
  a loop helper that reads `this` takes the receiver. An effectful function takes the world first and returns
  `(World, result)`. A recursive function takes a fuel. With `--prelude <file>` the shared declarations (datatypes,
  helpers with bodies, bodiless externals) go to that file and the main file `include`s it; `spec/theorem.py` merges
  the parent's and the candidate's preludes and refuses when a block of the same name differs.
- The default shape writes one `method` per function with a loop, so the loop keeps `invariant` and `decreases`
  lines. It covers the exact subset only (no externals), for the fixtures.

## Modelling axioms

- All string values, including outside results and intermediate values, contain only BMP Unicode scalars, excluding
  surrogates. Dafny scalar length, indexing and lexicographic ordering then agree with JavaScript UTF-16 code units.
  Known astral/surrogate literals are refused; external values are assumed in-envelope, not statically validated.
  A string PASS-proved is conditional on this envelope. Case conversion additionally uses an `IsAscii` guard:
  ASCII is exact; the whole non-ASCII string goes to an uninterpreted case function, never an identity mapping.
  Template booleans and numeric literals convert exactly; other numbers remain uninterpreted. Allocation exhaustion
  is outside the mathematical sequence model. See [strings design](design/strings.md).

- `number` is an exact integer (`int`) in a file with no float literal and no bare `/`; a file with either is a real
  file: `number` is a Dafny `real`, exact decimal arithmetic, not IEEE 754 (`--real` forces it). Neither choice models
  overflow, underflow, general signed-zero arithmetic or rounding. Known special-producing forms use whole-unit
  opacity and bare special globals are refused; this keeps all previously admitted fallbacks. See the
  [numeric boundary](design/numbers-bitwise-nan.md). Within the finite envelope, an algebraic rewrite is proved
  equal on exact reals and can differ on doubles; the
  execution lane runs on doubles and its WITNESS stands. A PASS-proved on a real unit is a fact about exact arithmetic.
- Single-absence unions use `Option<T>`: None means the absent kind allowed by that type. Unions allowing both use `Nullish<T>` with distinct Null/Undef tags, including optional nullable fields and nullable default inputs. Same-file boundary conversions preserve the statically known tag. JSON.stringify stays uninterpreted over the tagged input and its absence schema. See [null/undefined design](design/null-undefined.md).
- Array access outside the bounds is a proof obligation, not `undefined`. A dictionary read of an absent key is
  `ext_absent_V()`.
- An effect is `effect(world, op, args) = (world', result)`. It is the only axiom. Two calls are two transitions;
  reordering two independent effects is reported as a difference.
- React props and captured records follow the existing value model. Exact memo erasure requires a pure scalar expression and dependency coverage; incomplete dependencies can preserve stale values and are never erased. Lane B exercises one mount render, its effects and each returned JSX handler, not a complete React renderer.
- Two syntactically identical lambdas are equal in Dafny; a changed lambda passed to an external is a changed argument.
- Addresses never count: two records with the same fields are one value. Two parameters are two objects; a function
  that changes a parameter returns its new value beside the result; a local alias of a parameter is never changed
  (`alias-mutation`), so a change through one name cannot hide from the other.
