# Certified correspondence before relational proof

The claim remains lean's equality: returned values, the reachable heap, ordered environment requests, pending work and
exceptional completions (an error by its class and message, never its stack: design/stack-text.md), on the same typed
inputs and matched initial world. These detectors never claim a witness. A failed condition returns `undecided` and
leaves translation and execution as they were. The implementation contains no learned component and reads no benchmark
label, kind or case identifier.

`rungs.mjs` separates pure detectors over parsed units and explicit environment facts from `certifyCorrespondence`, the
file-loading boundary shared by check.mjs (after lane B, before translation) and pr.mjs (once per unit, before the
admitted/refused split; the refused branch saves its certificate). It requires the same resolution directory, project and
compiler options on both sides. Each detector compares the whole module context, so imports, module cells, initializers,
declarations and siblings cannot change silently.

## The source guard (all three rungs)

A changed function differs in its source text. Lean observes a function VALUE by its name and its source (exec/fake.mjs
`render`: `{ $fn, src: fnHash }`), and module code can coerce one to a string. So the guard restores one invariant: no
expression of the module evaluates to a changed function object, or to a class whose source holds one, except where the
object is invoked. Each route to a function object is closed:

| Route | Closed by |
|---|---|
| its binding (top-level declaration) | every reference is a direct callee; shorthand and export specifiers resolve to it |
| a container holding the binding: global object, `exports`/`module`, module namespace (self import, `import()`, self `require`), a `this` outside a class | any such handle refuses; `module.exports = …` and `exports.x = …` are writes and pass |
| its member key (class method) | every read of a property of that name is a direct callee; no string spelling the name (a key handed to the world can come back); no computed read on a value whose type is open (any, unknown, object, a type parameter) or declares the name; no destructuring of the name; class methods are not enumerable, so key-free enumeration (`Object.values`, spread, for-in) never yields them |
| reflection | `getOwnPropertyDescriptor(s)`, `getOwnPropertyNames`, `__lookupGetter__`/`__lookupSetter__`, `getPrototypeOf`, `__proto__`, `Reflect`, `Proxy`, `arguments`, `caller`, `callee`, `eval`, `Function`, `with`, meta properties: refused |
| its class (whose source holds the method) | the class binding is only a `new` target, a member-access base, an `instanceof` right side, a heritage clause, an export or a type; no `.constructor` read; no `this` in a static member; no decorator declared in this module (it receives the class) |
| any other changed function: closure, function expression, object-literal method, class expression | refused (a closure is a value by construction) |

Removed from the handover's refused names, each with its reason: `toString`/`toLocaleString` (under the invariant no
`toString` can reach a changed function), `stack` (stack frames are not compared), `require` (only a self or computed
require is a container, refused as such), `__filename`/`__dirname` (rendered as the unit file by lane B).

World assumption, the same lane A makes: a world step (imported code, a host built-in) does not read the source text of a
module function it is handed. Lane A has no representation of function source at all; this rung is not weaker than it.

## Parsed correspondence (parsed-equal)

Two modules have identical parsed trees after removal of punctuation semicolons and ordinary trivia, retaining
empty-statement nodes, every other token, operator, declaration kind, literal spelling, template raw text, JSX text, JSDoc
and compiler directives; the source guard holds. Then the units have equal observations.

Proof: pair the identical grammar nodes and lexical environments. Evaluation chooses the same next node and evaluates
operands in the same order; identical binding structure selects the same cells; values, allocation correspondence,
writes and completions agree inductively; world steps receive corresponding arguments and worlds. The only operations
that read spelling rather than the tree are Function.prototype.toString (excluded by the source guard) and engine
messages. Engine messages are printed by V8 from the parse tree, not from source spelling: measured on node v24.18.0
for calls, member calls across lines, `new`, for-of, spread, destructuring, property reads of undefined, tagged
templates, `in` and `instanceof` (comments and whitespace inserted, message identical); the rung test "engine messages
are printed from the parse tree" pins four of these and goes red if a node release changes it. The handover's guard that
kept the raw text of every call and property read is therefore removed (it refused a comment inside any call).

Not covered: an ASI return, an empty statement after an if, const versus let, template whitespace (all distinct trees);
a string holding code is a string.

## Renaming (normalised)

The relation is alpha conversion of the unit's own variable, parameter and catch bindings, in any code (methods
included). Each renamable binding is replaced by its declaration index; identifiers are resolved by the checker's
symbol, never by text. Equal canonical trees give a bijection of those bindings under which every reference resolves to
the corresponding binding (a capture-changing rename resolves elsewhere, so the trees differ). Identifier evaluation
commutes with the bijection, so every step, value and completion corresponds, except where a NAME is observable. A
binding keeps its text there, so a rename there makes the trees differ and the rung undecided:

| Observable name | Where it is kept |
|---|---|
| engine message (`x.y is not a function`, `v is not iterable`, `Cannot destructure … of 'v'`) | callees of calls, `new` and tagged templates; for-of, spread and `yield*` operands; destructuring sources; heritage clauses; JSX tags |
| a property key | shorthand `{ x }` and shorthand destructuring: the checker resolves the name to the property, so it is never canonicalised |
| a function's inferred `.name` | a binding initialised, defaulted or assigned (`=`, `||=`, `&&=`, `??=`) with an anonymous function, arrow or class |
| a field | a parameter property (`constructor(private x)`) |
| `Cannot access 'x' before initialization` | a lexical binding referenced before its declaration ends, inside a function created before it ends, or declared in a switch case |

The unit's source changes, so the source guard applies as for parsed-equal, and the module outside the unit must be
tree-equal. The handover's narrow form (top-level primitive straight-line functions, `const`/`let` without a write,
independent declaration order) is kept as a second attempt when the alpha forms differ; its theorem is unchanged.

Stated as a theorem with checked conditions, not proved in Dafny. Not covered: renaming a member, a function or class
declaration, a label (all keep their text); a rename inside a closure (the closure's source changes: source guard).

## Callee congruence (congruence)

The caller tree (argument expressions and ordered call sites included) is identical. Direct same-file call names resolve
to the matched declaration. The reached graph is acyclic. Every reached unit satisfies the total primitive grammar,
extended only with direct calls to previously checked units. Each changed leaf callee has a lower-rung normalised
correspondence; unchanged callees have parsed correspondence. Every callee proof and its contract is in the evidence.
The remaining module context must correspond after replacing those proved declarations with matched placeholders. No
external assertion of a callee result is accepted. Contracts: empty effect trace, primitive parameters and results (no
alias-bearing values), no exceptional exit; calls stay in their order. Substituting the proved callee transition at
each corresponding call site gives equal results and worlds; structural induction proves the caller; recursion is
refused. Effectful and heap callee contracts and Dafny-proved callee summaries are not covered.

## Integration

The certificate names `provedBy` at the root and in lane A: `parsed-equal`, `normalised`, `congruence` or `dafny`, with
the rung's evidence (tree or normal-form hash, rewrites, environment, contract). Lane B runs as before (exec/run.mjs is
untouched) and its result is kept in `lanes.B`. A lane B WITNESS, an adapter, or a contradicted runtime model (library or
handler defects) takes precedence: the rung is not consulted.

Tests: `node --test langs/ts/tests/pairs/cheap_rungs_parsed/rungs.test.mjs` (detectors, refusals, the engine-message pin,
check.mjs certificates) and `node --test langs/ts/tests/pairs/cheap_rungs_parsed/pr.test.mjs` (a lint-refused PR unit).
