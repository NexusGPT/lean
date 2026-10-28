# Certified correspondence before relational proof

The claim remains equality of returned values, the reachable heap, ordered environment requests,
pending work and exceptional completions, on the same typed inputs and matched initial world.
These detectors never claim a witness. An unsuccessful condition returns `undecided` and leaves
translation and execution available. The implementation contains no learned component.

`rungs.mjs` separates pure detectors over parsed units and explicit environment facts from
`certifyCorrespondence`, the file-loading boundary shared by check and PR decisions. The latter
requires the same resolution directory, project and compiler options. Each detector compares the
entire module context, so imports, mutable cells, initializers, declarations and siblings cannot
silently change. These are same-environment unit claims, as for the existing world transitions;
they do not certify arbitrary changes in an external module or host implementation.

## Parsed correspondence theorem (parsed-equal)

Let two modules have identical parsed trees after removal of punctuation semicolons and ordinary
trivia, retaining empty-statement nodes, all other tokens, operators, declaration kinds, literal
spelling, template raw text, JSX text, JSDoc and compiler directives. Assume identical module
resolution and compiler settings and related initial worlds. If changed function objects cannot
be observed as values, and potentially failing expressions retain their raw spelling, then the
units have equal observations.

Proof: pair the identical grammar nodes and lexical environments. Evaluation rules choose the
same next node and evaluate operands in the same order. Identical binding structure selects the
same cells; values, allocation correspondence, writes and control completion agree inductively.
External steps receive corresponding arguments and worlds and use the same transition. The
relation also matches infinite executions, rather than treating a bounded run as a proof.
Source text and diagnostic quoting are the exceptions to this grammar induction. The source
guard checks every changed function, requires a named top-level declaration and allows references
only as direct callees. Methods, changed closures/function values and aliases are refused. A
whole-file guard rejects source-reflection/dynamic-scope names and meta properties. Calls,
construction, property/index reads, tagged templates, destructuring, spreads, for-of and throws
retain exact expression text to prevent engine messages quoting different spelling. This guard
is deliberately broader than the reached call graph.

No token-stream-only equivalence: an ASI return, an empty statement after an if, a changed const/let
and template whitespace remain distinct. No stripping type-directed JSDoc or compile directives.
No interpreting a string containing code as syntax.

## Rewrite theorem (normalised)

The supported relation is composition of binding alpha conversion, immutable lexical declaration
conversion (const/let), and independent declaration permutation. Conditions are mechanically
checked, not supplied by the benchmark label:

* A top-level synchronous nongeneric function declaration; simple explicitly primitive parameters;
  no optional/rest/default parameters. All names resolve to unique declarations.
* A straight-line initial sequence of single const/let declarations, followed by one return.
  Initializers and the return use bound variables, primitive literals, parentheses, supported
  primitive unary/binary operations and conditionals. No assignments, property reads, object
  coercions, callable parameters, allocations, closures, eval, throws, destructuring or unbound reads.
* Every initializer is checked before its binding enters the environment: no TDZ read. The grammar
  excludes later writes and all capture. Identifiers are canonicalized by their resolved symbols,
  not text; a capture-changing rename fails canonical correspondence.
* A declaration block is sorted only when every initializer depends on parameters/literals alone,
  not other locals or world steps. Otherwise declaration order remains fixed. Binding numbering
  happens after this certified permutation. Type annotations and parameter order remain intact.
* The source guard applies, and the rest of the module corresponds exactly.

Proof: alpha conversion is a bijection of initialized lexical cells, extended at each declaration;
identifier evaluation commutes with the bijection. The grammar has no name reflection or operation
that can quote a renamed binding in an engine error. Const and let have the same initialization
and reads when neither is subsequently written. Independent total primitive initializers have no
side effects or exceptional completion and do not read the cells being permuted, so adjacent
swaps commute. Each normalization step preserves the complete observation. Both normal forms
must then be identical parsed trees; transitivity gives equality of the original units.

This is a stated semantic theorem and checked rule implementation, not a claim that Dafny has
verified the JavaScript parser or implementation. It deliberately does not cover private member
renames, arbitrary declaration reorder, higher-order code or arbitrary alpha conversion.

## Callee congruence theorem (congruence)

The caller tree (including argument expressions and ordered call sites) is identical. Direct
same-file call names must resolve to the matched declaration. The reached graph is acyclic.
Every reached unit satisfies the same total primitive grammar, extended only with direct calls
to previously checked units. Each changed leaf callee has a lower-rung normalized correspondence;
unchanged callees have parsed correspondence. Every callee proof and its contract is in evidence.
The remaining module context must correspond after replacing those proved declarations with
matched placeholders. No external assertion of a callee result is accepted.

Contracts here are intentionally strong: empty effect trace, primitive parameters/results
(no alias-bearing values), and no exceptional exit. Calls stay in their original order; no
commutation of effectful steps is assumed. In topological order, substitute the proven equal
callee transition at each corresponding call site. The same argument values and empty-effect,
nonthrowing transition yield equal results and worlds. Structural induction proves the caller.
Recursion is refused, so a cycle cannot justify itself. Effectful/heap callee contracts and
previously proved Dafny summaries are future extensions; there is no unchecked summary door.

## Integration and limitations

The certificate names `provedBy` at the root and in lane A: parsed-equal, normalised, congruence,
or dafny. Bounded execution remains lane B and is retained separately. Existing witness, adapted
interface and contradicted-runtime-model paths take precedence in check. A rung failure is never
a witness or a new refusal of the existing relational pipeline.

Tests live with the new pairs. Run the detector and certificate suite with:

    node --test langs/ts/tests/pairs/cheap_rungs_parsed/rungs.test.mjs

The lane report records red runs, mutation checks, integration checks, full suite results and
frozen benchmark transitions. No benchmark kind or case identifier is consulted by a detector.
