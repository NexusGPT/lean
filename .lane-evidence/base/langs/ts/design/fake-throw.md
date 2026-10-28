# Lane B: a fake read as an array, a throw in its callback, a cast answer

## The construct

A value from outside the file that the unit iterates with an array method, and whose callback may throw:

    const todo = (await sql`select ...`) as { brand: string; samples: string[] }[];
    slice.forEach((c, n) => { qs[`m${n}`] = mapQuestion(c); });   // mapQuestion reads c.samples.map(...).join(...)

Lane B hands such a value a fake (exec/fake.mjs): a proxy whose reads and calls are recorded and answered from the
seed and the path. Before this note a fake answered `forEach`, `map`, `reduce` like any member: a call ran the
callback once on two fresh fakes (`X.forEach#cb.arg0`), caught its throw and recorded `callback-throw`, then went on.
Array.prototype.forEach (ECMA-262 23.1.3.15) runs the callback once per index below the length read at the start and
lets an abrupt completion of the callback propagate. A forEach rewritten as a counted for over the same value was
therefore a WITNESS that was not a difference of the JavaScript: the parent returned, the candidate threw (pyka,
finding 6, `mapChainCategories`).

## The reading

1. An iteration method a fake answers: `forEach`, `map`, `filter`, `some`, `every`, `find`, `flatMap`, `reduce`. Called
   with a function, the fake is read as an array: the method reads the fake's length once and each element in order
   through the fake (`get X.0`, `get X.1`, the same reads an indexed loop over it makes, the same answers), runs the
   callback on `(element, index, fake)` (`reduce` on `(acc, element, index, fake)`, with the spec's TypeError on an
   empty fake and no initial value), and builds the real result (`map`, `filter`, `flatMap` a real array, one level
   flattened for `flatMap`; `some`, `every`, `find` stop where a real array stops). A throw inside the callback is never
   caught: it is the unit's throw. The method is not a recorded read: a real array finds it on its prototype.
   Called otherwise (a service's `find({ where })`), the member is the fake's plain answer, read and called as before.
   While a module loads the member is the plain answer too.
2. Opaque, as before: every other method (`findIndex`, `findLast`, `reduceRight`, `sort`, `slice`, ...), which answers
   the varied answer of a call, and every other callback handed to a fake (a listener, a decorator), which runs once on
   fresh fakes with its throw recorded as `callback-throw`: the world calls it, not the unit.
3. The length of a fake is its drawn shape (2, and 0 past depth 8) and is no longer recorded: it asks nothing of the
   world, as the iterator already asks nothing. forEach reads it once, a counted for once per step; both make the same
   requests.
4. A typed answer cast by the unit (exec/spec.mjs): where a callee's declared answer names no shape (`any`, `unknown`),
   `f(...) as T`, `(await f(...)) as T`, a tagged template cast and `as unknown as T` draw the answer at T, the unit's
   own cast being the best type lane B has for it. The callee is a parameter, a member of a parameter or of the receiver,
   or an imported function. A callee whose answers the unit casts to two different types keeps the shapeless answer. The
   spec is the candidate's, as every declared type of lane B is.

The elements are the same on both sides: `env.answer(path)` and `env.typed(path, spec)` hash `(seed, path)` alone
(`createHash(...).update(`${this.seed}:answer:${path}`)` in fake.mjs, `${this.seed}:typed:${path}` for a typed draw,
gen.mjs `case 'array'` naming each element `${path}[i]`), so a thrown element is thrown on both sides.

## Soundness

Lane B only; lane A, the lint and the theorem are untouched. A WITNESS is a difference of the two runs on one input:
the walk runs the callback as JavaScript runs it on an array, so a WITNESS it shows is one a real array shows. The
reading removes a false WITNESS (a throw caught on one side only). The callback handed to an iteration method is no
longer a recorded argument: a real array does not see its text, so two callbacks that behave alike over the drawn
elements agree, and two that differ show it in the outcome or the requests. Dropping the length record and drawing at a
cast type narrow what is observed or drawn; PASS-bounded states its fake policy and never becomes a proof.

## What lane B sees

- The repro (`fake-foreach-parent-category.ts` against `fake-foreach-candidate-category.ts`, `--n 30`): before,
  WITNESS at input 3 (`{ batch: 2 }`), the parent's trace `callback-throw ... Cannot read properties of null (reading
  'join')` then a return, the candidate a throw. With the walk alone: the same throw on both sides, WITNESS on the
  trace at index 13 (the counted for re-reads `length`). With the length unrecorded: WITNESS at input 5 (`{ batch: 0 }`),
  `todo.slice(0, 0)` answering a primitive, where forEach throws and the counted for skips: a real difference for an
  `unknown` answer. With the cast reading: PASS-bounded, the rows drawn as the cast's records.
- Pair `tests/pairs/fake_throw` (`exec/run.mjs --n 30`), verdicts before / with the walk and the cast but the length
  recorded / after: labels (forEach to counted for, a callback throwing on a fake element) WITNESS / WITNESS (trace,
  `get arg0.1` against `get arg0.length`) / PASS-bounded; safeLabels (a catch inside a map callback returning a
  default) WITNESS on the callback's text in the request / WITNESS / WITNESS on the outcome, a fault against a value;
  total (a reduce throwing on the second element, to a counted for) WITNESS / WITNESS (trace) / PASS-bounded; count
  untouched PASS-bounded throughout; queried (an `unknown` answer cast to records, forEach to counted for) WITNESS
  (the parent throws on a shapeless answer, the candidate returns `[]`) / PASS-bounded / PASS-bounded.
- Every other pair (1,007 lane B units of 154 pairs, run before the pair existed, `exec/run.mjs --n 30` on an
  instrumented copy): 2 units read a fake's length (module_forms dynamicRequire and computedEnvironment), none an
  iteration method of a fake or a cast answer; both PASS-bounded before, with the length recorded, and after. The 35
  check.mjs entries of alias_result and new_unit touch none of the three.

## Open

- `for (const x of fake)` draws its elements at `X[i]` without recording a read, an index read at `X.i` recorded; a
  forEach rewritten as a for-of over a fake still differs on the element paths.
- A TypeError raised by the engine inside the sandbox renders as `threw: {}` (seen in the repro's witness), so its
  message is not compared; an Error the unit constructs renders with its message.
