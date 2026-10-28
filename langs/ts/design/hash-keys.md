# The opaque module identity and the transition key cover the code a unit reaches

The construct: two names lane A gives to code it does not read. An opaque module unit (a unit whose module reads the
translator keeps as one transition, `moduleUnitShape(u).opaque`, or the fallback after an `Unsupported`) is the
bodiless `ext_Module_file_block_<key>_<name>(wld, args)`; a call into the outside in the heap core is
`Call_<name>_<key>(hw, args)` or `HCall_<method>_<key>(hw, receiver, args)`. Both keys were the whole file: the opaque
identity hashed `sf.text` (78ccd1a, `design/module-forms.md`) and the transition key hashed every class member and
object-literal method of the file (`design/heap-stage5.md` steps 15 and 18). Both were sound and wider than the unit:
an edit the unit can never run (a comment, another function, a constructor's parameter type) made the two sides two
functions, and lane A lost three proofs of the regress corpus on untouched units (nexus-928 `hasKnowledgePlaceholders`,
`isValidKnowledgePlaceholder`; nexus_7197 `sha256`).

## The reading

`langs/ts/reach.mjs` (`makeReach(checker, sf)`), one helper both keys call, so they agree by construction. From a
unit's node it closes over the declarations its run executes (ECMA-262 10.2.1: a call runs its callee's body; 13.3.2: a
member read finds the property on the object or its prototype chain): a same-file function it names, a module binding
it reads (the declaration with its initializer), an import it names (the import statement), a member of a class it
uses (`this.m`, `this.f`, `super.m`, a member of the file overriding that one in a subclass, the field initializers a
reached constructor runs), and the whole class (base classes included) it constructs or names as a value. Types do not
run, so a name in a type position reaches nothing. Beside that it collects the code a value may carry into the
outside: every value the reached code evaluates, unless it comes straight from the outside (an outside call's result,
a member of one, a local bound to one) or is only the receiver of a field read or write, is checked against each class
of the file (`isTypeAssignableTo`, through its properties, elements and type arguments, so `any`, `unknown` and `object`
take every class); a same-file function named as a value and an object-literal method built in reached code count too.
That code is closed the same way until no new class or function value appears. `eval`, `Function`, `Reflect` or `Proxy`
reach the whole file (a string may name any declaration), as `iteratorProgram` already reads them.

- the opaque identity is the hash of the reached declarations and the carried code (`decls`), sorted by text;
- the transition key is the hash of the carried code alone (`code`), per unit (the unit holding the call): the unit's
  own text and its directly called helpers are read by the theorem, so a refactor there still proves.

Pair excerpt (`hash_keys`, `module.*.ts`): `hasTag` reads `TAG`; the candidate changes `normalize`, `shout` and a
comment. Both sides now emit `ext_Module_file_block_1qmpxjr_hasTag_World_string(wld, text)` (identity, proved);
`hasMention` calls the changed `normalize`: `..._btp5ri_hasMention_..` against `..._dqenfo_hasMention_..`.

## Soundness

The keys must change whenever code the unit's run can execute changes. Its own text, its callees, the bindings it reads
and the members it uses are its run by definition. Code it does not name can run only through a value: an outside
call may run a method of an object it is handed, or of any object it reaches from one, so every class a touched value
may be an instance of (assignability, structural, so a record type that a class instance satisfies counts) keys every
transition of the unit. Cases considered: `enroll(t: Tally)` hands `t` to `keep` while `Tally.add` changes (key differs,
unproved, though lane B's fake never runs `add`); `this.fee` calls the changed `this.rate` (the receiver `this` is
handed, its class keys the transition); a decorated class's `this.reset()` (step 20) keeps its whole class in the key;
a method's own callee in the file reached from a carried class is in the key (the old key held class members only, so a
top-level helper called by a handed instance's method was not: this reading is narrower for the unit and wider there).
The reading's assumption, now stated: during the unit's run the outside runs file code only through values this run
touches, not through values other code handed it earlier (a framework holding an instance, an exported function
imported back). The old key made the same assumption for top-level functions; it held class members whole.

Out: nothing new is refused; the lint is unchanged. Other whole-file keys stay as they were (`sourceKey`'s whole
fallback, `numericKey`, `accessor_`, `cast_..._source_`, `Object_..._source_`): rows for a later lane.

## Lane B

Unchanged: it runs both modules for real. The pair's WITNESS units are its; `enroll` stays PASS-bounded (its fakes do
not call methods of objects they receive), which is why lane A must not prove it.

## Measurement

Pair `hash_keys` (check.mjs per case, both lanes): the three regress units on their real files PASS-proved; a sibling the
unit does not reach changes, PASS-proved (`hasTag`, `cost`); a reached sibling changes, WITNESS (`hasMention`,
`hasCode`, `priced`) or PASS-bounded with lane A unproved (`enroll`); through a class member and a base-class member,
`Cart.charge` and `Parser.strict` PASS-proved, `Cart.fee`, `Parser.loose` (the inherited `norm` changed) and
`Parser.name` WITNESS. On the base tree the five PASS-proved synthetic units are PASS-bounded (lane A unproved).

Instances (regress trees under `W/work`): nexus-928 `agent-prompt-knowledge.utils.ts:136` `hasKnowledgePlaceholders`,
`:143` `isValidKnowledgePlaceholder`, `:108` `extractKnowledgePlaceholders`, `:170` `replaceKnowledgePlaceholders`,
`:208` `extractUniqueCollectionNames`: each PASS-proved now (ASK:unproved at 6589b7d); `:242`
`extractCollectionNamesFromJson` reaches the changed `traverseJsonForCollections` and stays unproved (PASS-bounded).
nexus_7197 `vibe-custom-domain-routes-token.guard.ts:15` `sha256`: PASS-proved (the class's constructor changed).
