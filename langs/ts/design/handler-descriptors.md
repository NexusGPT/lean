# Handler descriptors: one reader, a Dafny rendering and an interpreter

The construct: a function value React holds as a handler (a JSX attribute `on[A-Z]`, or a `useCallback` argument)
whose body is a straight list of calls, slot setter calls, `const` locals and a return. JavaScript runs the body
when the event fires, with the event as its argument and the values the render captured.

## The reader (`langs/ts/handlers.mjs`)

`readHandler(checker, sf, cb, ctx)` knows TypeScript nodes only. It returns `null` or
`{ params, locals, steps }`: `params` the arrow's parameter symbols (identifiers, any count, no default, no rest);
`locals` a `const` with one identifier declarator and a pure initializer (`renderPure`), which later references
stand for when no call step lies between the declaration and the use (a call of the world may change the field the
initializer reads, so the read never moves past one); `steps`, in order, `set` (a setter `ctx.isSetter` names, with `next` or an `updater` arrow), `call`
(`import:m:x`, `global:x`, `member:x` on a pure receiver such as the event, `value` for a local function) and
`return`. Everything else keeps the handler unread: a branch, a loop, `await`, `try`, an assignment, `let`, a
destructuring, a call whose arguments are not pure. `ctx.isSetter` is the caller's: the translator names a setter of
a slot unit by its slot index; lane B names the setter of any `useState` destructuring by the call's position.

## Two renderings

Lane A (`translate.mjs`, `reactHandler`) renders the steps as the data `ReactHandler([...])`. A parameter is the atom
`ReactParam(k)`; a local is its initializer's tree. A set whose next value reads no parameter stays
`ReactSet(slot, <Dafny value>)`, its locals bound as a Dafny let before it; one that reads a parameter is the tree
`ReactSetExpr(slot, nextExpr)` (the destructor is `nextExpr`: Dafny requires one type per shared destructor name).
An updater over the event, or an updater after a `ReactSetExpr` on the same slot, has no Dafny value: the handler
stays opaque. The prelude grows by these two constructors only. For the parent of `jsx_handlers_symbolic`:

    ReactHandler([ReactSetExpr(0, ReactExpr("get:value", [ReactExpr("get:target", [ReactParam(0)])]))])
    ReactHandler([ReactCall("member:preventDefault", [ReactParam(0)], [], false), ReactSet(0, ext_Any_of_bool_bool(true))])
    ReactHandler([ReactSet(0, ext_Any_of_int_int((var next := (count + props.step); next))), ReactSet(1, ext_Any_of_int_int((var next := (count + props.step); next - 1)))])

Lane B (`exec/handlers-interp.mjs`) applies the same steps to the hook slots.

## The position link

The loader adds a `transformers.before` pass to `ts.transpileModule`: an `on[A-Z]` attribute value becomes
`__lean_h(pos, value, file)` and a `useState(...)` or `x.useState(...)` call `__lean_s(pos, call, file)`, each
returning its value unchanged. `useState` records setter -> slot; `__lean_s` stores `file:pos -> slot` on the current
hook frame (a deep child's frame has its own map). The checker the interpreter loads gives the static nodes the same
`pos`. The file path keeps two files' positions apart. The one caveat: `src2` replaces `import.meta` before
transpiling, so in a file that uses `import.meta` before a handler the positions shift and that handler is not
readable at run time (counted as fired, never as a defect).

## The interpreter

At each fire of the command sequences and of the finite lane, after the real invocation and before the commit, a
readable descriptor predicts the slots: start from the slots before the handler; a set evaluates its next value, an
updater its body with its parameter bound to the running slot value (chained sets compose); a call step is the
world's and is not applied. Atoms: a literal; a parameter (the real argument); a handler or render `const` with a
pure initializer (substituted); a state value (the first element of a `useState` destructuring: the slot before the
handler, which is the value the render captured, since every fire follows a commit); the props parameter or a
binding element of it. Operators: property read, `+ - * === !== < <= > >= && || ??`, `-`, `!`, conditional,
template. The prediction is compared with the slots the invocation left, every slot (a slot no step sets must be
unchanged). The interpreter's reads of fakes run in an erased window: the trace, the demand counter, the call
counters, the cache and the pending list are restored, so interpreting one side never makes the sides differ.

A fire is readable but not interpretable when the handler threw (a faulted request: the steps it ran are unknown), an
atom is outside the list, a call step calls a local function value (it may set slots), the evaluation drew a
primitive from a fake (a second draw is another value), or a next value is a function (the setter would call it).
The handlers in `observeJsx`'s one-render check are not interpreted: they fire one after another without a re-render,
so a captured state value can be older than the slots.

## Soundness

The proof lane compares descriptors as data: two handlers are equal when their steps are equal trees, and a changed
step, argument, parameter use or order is a different value, never silently equal. A parameter atom is the same
symbol on both sides, so `ReactParam(0)` means the same event in both. A local is substituted by its initializer,
which is pure (no call, no allocation, no deferred read), and no call step runs between the declaration and the use,
so reading it where it is used gives the value it held where it was declared. `const v = e.target.value; save(1);
setText(v)` stays opaque for that reason; with `save(1)` after `setText(v)` it is a descriptor. The interpreter only adds a check: a descriptor the engine contradicts yields
`ASK:handler-model` in `check.mjs` when lane A proved the unit, so a wrong descriptor can produce an ASK, never a
proof; lane B's own verdict is unchanged.

## What stays opaque

A handler with a branch, a loop, `await`, `try`, an assignment, `let`, a destructured or defaulted parameter, an
async arrow, a call on a call result, or an updater over the event: opaque by text and captures (`fn_`), as before.
