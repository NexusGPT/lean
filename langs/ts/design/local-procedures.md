# Stage 5 rank 21: local procedures spliced at their calls

The construct: `let total = 0; const add = (s: string) => { total = total + s.split(" ").length; }; for (const line
of lines) add(line);`, or a nested `function keep(x) { if (x > 0) out.push(x); }` called in a loop. Before this rank the
lint refused every write to an outer local, array or record from inside a local function as `closure-mutation`, and the
translator read a local arrow as a pure lambda.

## The reading

A local procedure is a function declared inside the unit (a `const` arrow with a block body, or a nested function
declaration) whose name is used only as the callee of plain call statements of its arity: never passed, returned,
stored, called through `?.` or named in its own body. Its body returns no value and holds no `throw`, `try`, `await`,
`yield`, `this` or `arguments`. Each call is then the body run at that point with the parameters bound to the
arguments, in the unit's own scope (ECMA-262 10.2.1: the call creates a binding per parameter, the body's statements
run, control returns), so the translator splices it: `var <parameter>: T := <argument>;` for each parameter, then the
body's statements, in the core statement translator (`tr` and `faultTr`, `inlineCall`), and the declaration itself
emits nothing (`procDecl`). The loop analyses see through a call as through its body (`assignedOutside`, `freeVars`,
`isEffectCall`), and the procedure's own parameters and locals are its own, never a loop's state nor a free variable
(`insideProc`). The predicate, `localProcedure` in `common.mjs`, is shared by the lint and the translator.

A splice shadows: a name the body declares that the unit also declares outside the procedure would hide the unit's
binding after the call, so such a procedure is refused, with one exception, a parameter the body never assigns that
every call passes under that same name (`keep(x)` inside `for (const x of xs)`): the binding `var x := x` is the
identity. The lint checks a procedure's body as the unit's own statements (`loopCallbacks`, as a loop callback), so an
outer cell written there is the unit's.

One Dafny step of `for (const x of xs) keep(x)` with `function keep(x) { if (x > 0) out.push(x); }` (pair unit
`gather`):

```
var x: int := seq0[idx0];
var x: int := x;
var out := if x > 0 then (var out: seq<int> := out + [x]; out) else out;
gather_loop0(seq0, idx0 + 1, out)
```

What stays refused, each with an escape fixture (`fixtures/escapes/ts/local_procedures_*.ts`), rule
`closure-mutation`: a local function also handed to an array method or an outside call (as a value it is no
procedure), a parameter named like a unit local that some call passes something else. A procedure that returns a
value, or one called inside an expression, keeps the lambda reading (a later rank may splice `const y = f(a)` with a
trailing `return`).

## Measurement

Pair `local_procedures`: `countWords` (the body written inline in the loop, proved: the same loop helper), `gather`
(WITNESS), `tagged` (WITNESS), `bump` (untouched). The differential cases `langs/ts/tests/cases/local_procedures.ts`
run three procedures in Node and in Dafny on the same inputs. Census (`node langs/ts/census.mjs`, the rank 20 state as the base): nexus 23,823 to 23,827 of 26,520; langchainjs 3,584 to
3,584 of 4,871. The stage 5 table predicted 90 and 2 alone, an upper bound counting every local function that writes an outer
cell; the bounded reading (void, called as a statement, no shadowing) reaches four of them on nexus, the rest return values,
are handed away, or sit in units other keys hold.
