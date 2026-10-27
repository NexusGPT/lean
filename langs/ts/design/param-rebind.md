# A reassigned parameter (param-rebind)

The construct: a unit assigns one of its own parameters by name, `p = v`, `p += v`, `p ??= v`, `p++`, often to
give a default (`count = count ?? 1`), to clamp (`if (page < 1) page = 1`) or to normalise (`fields = { content:
fields }`). In JavaScript a parameter is a binding local to the call, initialised by the argument; assigning it
changes that binding only. Modules are strict code, so no `arguments` slot aliases it (and the lint refuses
`arguments`); the caller's variable and object are untouched.

## The reading

The parameter is a local that starts as the argument. Each write rebinds it and each read sees the latest write
before it, as for a `let`: a read before the write and a read after it are two values, in order. The core reading
(`--core`) needs nothing new: the statement translator already rebinds any name (`var p := v` shadows the
parameter), branches and bounded loops carry it as state through `assignedOutside`. The proof shape declares the
local first (`reassignedParams` beside `sigParams` in translate.mjs):

    function spread(n: int): int        // const before = n; n = n * 2; return before + n;
    { var before: int := n; var n: int := n * 2; (before + n) }

## What stays refused (param-assign, an escape each)

- a write inside a callback, a local function, a literal method or a `forEach` body (`param_rebind_callback`);
- a callback's or local function's own parameter (`param_rebind_callback_param`): outside the row, not shown exact;
- a rest parameter (`param_rebind_rest`) and a generator's parameter (`param_rebind_generator`);
- a parameter the unit also changes in place, directly or through a same-file call (`param_rebind_output`,
  `cast`): such a parameter is an output the caller takes back, and the rebound object would go back instead;
- a closure that reads the parameter and is created before a later write, or inside a loop that writes it
  (`param_rebind_closure`, `param_rebind_closure_loop`): the closure would keep the old value in the model.
- `this` cannot be assigned (TypeScript refuses `this = v`); a destructured parameter's names were already locals
  (binding elements, declared by `destructure`) and stay as they were.

## Soundness

- The value of `p` at each read is the argument rebound by every write before it on the path; the translation
  writes the same let-chain, so reads before and after a write are two values in order (pair unit `spread`).
- Nothing outside the unit sees the binding: the unit's signature, its outputs (mutated parameters) and the world
  do not change. An output parameter is refused, and the translator refuses one too (`reassignedParams` fails).
- A closure created after the last write and outside any loop that writes `p` sees one value whenever it runs, so
  capturing the value (Dafny) equals capturing the binding (JavaScript). Every other closure is refused.
- Loops: `for`, `for-of` and bounded `while` carry `p` like a local (pair unit `drained`, heap core included).

## Lane B

Lane B runs the real JavaScript, where the parameter is a local binding; nothing changes there. Pair param_rebind:
offsetOf WITNESS (a changed clamp); weightOf, spread, drained, bumped PASS-bounded.

## Instances (units.jsonl, refused by param-assign alone at 607de20; census after this lane)

- n8n `packages/@n8n/permissions/src/hasScope.ts:23` `scope = [scope]` under `!Array.isArray`: enters.
- n8n `packages/@n8n/nodes-langchain/nodes/vendors/OpenAi/actions/versionDescription.ts:35` `resource = 'recording'`
  in two branches: enters.
- n8n `packages/@n8n/nodes-langchain/nodes/trigger/ChatTrigger/error.ts:7` a constructor's `message` rebound in
  three branches: enters.
- langchainjs `libs/langchain-core/src/messages/chat.ts:51` `fields = { content: fields, role: role! }`: enters.
- n8n `packages/cli/src/services/naming.service.ts:36` `max = numSuffix` on a `reduce` callback's own parameter:
  stays out (a callback's own parameter).
