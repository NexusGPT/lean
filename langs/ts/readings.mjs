// The catalogue of readings: one entry per reading lean performs, the single table the lowering (lower.mjs) consults to
// decide what a unit is read as and, when a reading does not apply, which reading refuses it and why
// (design/admission-contract.md). A reading is how one construct becomes logic: its runtime, aliasing, exception and
// termination assumptions, the refusals that mark where it stops (the lint rules and the translator refusals that say
// "this construct, but not here"), and its version history. A version can be withdrawn with its reason: the lowering
// then refuses every unit that uses the reading, under rule `withdrawn`, in the lint and in the translator alike.
//
// Entry fields:
//   id, construct        the name and the construct it reads
//   kinds                syntax kinds (ts.SyntaxKind names) whose every node this reading reads; one reading per kind
//   uses(n, ts, ctx)     a test for a reading used inside a kind another reading owns (an operator, a form); ctx gives
//                        moduleState(id) and libraryReceiver(expr), the two tests that need the checker
//   always               the reading applies to every unit (the type reading)
//   lint                 lint rules this reading owns (a finding with the rule is this reading's refusal)
//   lintText             [rule, RegExp] pairs: a finding of another reading's rule whose message is this reading's
//   translate            RegExp sources of translator refusal messages (the text after `file:line: `) this reading owns
//   assumptions          { runtime, aliasing, exceptions, termination }
//   refusal              the sentence the lowering gives when the reading does not apply and the site has none of its own
//   design               the notes that define it
//   versions             [{ version, status: 'current' | 'withdrawn', reason? }], oldest first; the last one is the reading
//
// A finding, a refusal or a construct that matches no entry is refused all the same: the lowering names it
// `uncatalogued` (a rule or a message no entry owns) or `no-reading` (a syntax kind no entry reads), never reads it.

// the syntax kinds that carry no reading of their own: their parent's reading reads them (a block's braces, a
// parenthesis, a declaration list, the parts of a template, a clause of a switch or a try, a name in a declaration)
export const STRUCTURAL_KINDS = new Set([
  'ParenthesizedExpression', 'VariableDeclarationList', 'CaseBlock', 'TemplateSpan', 'TemplateHead', 'TemplateMiddle', 'TemplateTail',
  'JsxAttributes', 'JsxOpeningElement', 'JsxClosingElement', 'JsxOpeningFragment', 'JsxClosingFragment', 'JsxNamespacedName', 'HeritageClause',
  'ExpressionWithTypeArguments', 'OmittedExpression', 'SemicolonClassElement', 'EndOfFileToken',
]);

const rx = (...xs) => xs; // translator refusal patterns, written as regular expression sources anchored at the message start

export const READINGS = [
  {
    id: 'names', construct: 'an identifier read as a value: a parameter or local, a unit of the file, a module constant, an import, a global',
    kinds: ['Identifier', 'MetaProperty'],
    lint: ['global-read', 'arguments', 'dynamic-eval'],
    translate: rx('^.* is a function value; call it$', '^[^ ]+\\.[^ ]+ is a function; call it$', '^new\\.target is not translated$'),
    assumptions: {
      runtime: 'a local or parameter is its Dafny variable; a module constant built from literals and + - * is its value, any other is a bodiless constant named by its declaration and the same-file code it reaches; an import or a value of another file is an uninterpreted external identical on both sides; a lib or runtime global read is a world read; import.meta is a world read',
      aliasing: 'a name is a value; a name that holds an object is read through the mutation reading, never through this one',
      exceptions: 'a read never throws (a temporal-dead-zone read is refused by declarations)',
      termination: 'a read terminates',
    },
    refusal: 'this name has no value reading here (a function held outside the unit, module state that changes, `arguments`, eval)',
    design: ['SEMANTICS.md', 'design/reach-keys.md', 'design/lib-globals.md', 'design/named-then.md'],
    versions: [
      { version: 0, status: 'withdrawn', reason: 'a module constant holding a function value, called by name, was one external keyed by its name: two different makers of the same name proved equal (research brief 20 section 2; design/reach-keys.md keys it by the reached code)' },
      { version: 1, status: 'current' },
    ],
  },
  {
    id: 'module-state', construct: 'a module `let`, an object-valued module constant, a static field of a class of the file: a cell of the world',
    uses: (n, ts, ctx) => ts.isIdentifier(n) && !!ctx.moduleState(n),
    lint: ['toplevel-effect', 'toplevel-state'],
    translate: rx('^a logical module assignment uses the opaque unit reading$', '^a logical static assignment is outside the reading$'),
    assumptions: {
      runtime: 'each read is a transition Module_file_get_<name>_<key> of the world, each write Module_file_set_...; the key hashes the declaration and the code its initializer reaches',
      aliasing: 'a cell is one value in the world; a unit that changes it through a mutator carries the change as a world transition',
      exceptions: 'a read or a write of a cell never throws',
      termination: 'reads and writes terminate',
    },
    refusal: 'module code that runs on import, or module state the reading cannot name, has no reading',
    design: ['design/module-forms.md', 'design/reach-keys.md', 'design/class-statics.md'],
    versions: [
      { version: 0, status: 'withdrawn', reason: 'a module cell keyed by its declaration text alone: a changed initializer dependency kept the same cell (research brief 20 section 2)' },
      { version: 1, status: 'current' },
    ],
  },
  {
    id: 'numbers', construct: 'number literals and arithmetic: integers in an integer file, exact reals in a real file, finite values',
    kinds: ['NumericLiteral', 'BigIntLiteral'],
    lint: ['division', 'number-special', 'unary-coercion'],
    translate: rx('^number literal .* is not an integer; use --real$', '^internal: an integer division was not placed under Math\\.floor$'),
    assumptions: {
      runtime: 'a file with a float literal or a bare `/` reads its numbers as Dafny reals (exact, not IEEE 754), every other file as integers; Math.floor and Math.trunc of a division are JavaScript-faithful helpers; a unit whose number may be NaN, an infinity or a -0 an operation makes is read as one opaque function keyed by its source',
      aliasing: 'numbers are values',
      exceptions: 'arithmetic never throws in the model (a division by zero is guarded by the opaque numeric unit)',
      termination: 'arithmetic terminates',
    },
    refusal: 'this arithmetic leaves the finite number model',
    design: ['design/special-numbers.md', 'design/signed-zero.md', 'design/numbers-bitwise-nan.md', 'design/prelude-unit.md'],
    versions: [
      { version: 0, status: 'withdrawn', reason: 'the number model held -0 and 0 as one value and integers past 2^53 exactly: two versions differing on the sign of a zero or on rounding proved equal (research brief 20 section 2; design/signed-zero.md)' },
      { version: 1, status: 'current' },
    ],
  },
  {
    id: 'bitwise', construct: 'bitwise and shift operators on numbers: ToInt32 and ToUint32 helpers over bv32',
    uses: (n, ts) => (ts.isBinaryExpression(n) && [ts.SyntaxKind.AmpersandToken, ts.SyntaxKind.BarToken, ts.SyntaxKind.CaretToken, ts.SyntaxKind.LessThanLessThanToken, ts.SyntaxKind.GreaterThanGreaterThanToken, ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken].includes(n.operatorToken.kind)) || (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.TildeToken),
    lint: ['bitwise'],
    assumptions: { runtime: 'operands are numbers; each operator is the ECMA-262 operation through ToInt32 or ToUint32, a literal shift count reduced to five bits', aliasing: 'values', exceptions: 'never throws on numbers', termination: 'terminates' },
    refusal: 'a bitwise operand that is not a number (a BigInt, an opaque coercion) has no reading',
    design: ['design/numbers-bitwise-nan.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'strings', construct: 'string literals and templates: seq<char> of BMP code units, the string methods the prelude defines',
    kinds: ['StringLiteral', 'NoSubstitutionTemplateLiteral', 'TemplateExpression'],
    lint: ['string-code-unit', 'string-order'],
    assumptions: { runtime: 'a string is its sequence of BMP characters; concat, length, index, slice, includes, indexOf, trim, case changes on ASCII, split and replace on literals are prelude functions, the rest uninterpreted externals', aliasing: 'values', exceptions: 'never throws', termination: 'terminates (the helpers decrease the length)' },
    refusal: 'a string outside the BMP model, or an ordering of a string against another type, has no reading',
    design: ['design/strings.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'tagged-template', construct: 'a tagged template: an uninterpreted function of the literal parts and the holes, named by the tag and the code it reaches',
    kinds: ['TaggedTemplateExpression'],
    lint: ['template'],
    assumptions: { runtime: 'one external tag_<tag>_<reach>_<holes> over the literal strings and the holes as Any', aliasing: 'the holes are passed as values', exceptions: 'a throwing tag is not modelled: the tag is an outside function whose result is uninterpreted', termination: 'the call is assumed to return' },
    refusal: 'a tag that is not a name has no reading',
    design: ['design/reach-keys.md'],
    versions: [
      { version: 0, status: 'withdrawn', reason: 'a tagged template keyed by its tag\'s text: a changed tag function of the same name kept the same external (research brief 20 section 2)' },
      { version: 1, status: 'current' },
    ],
  },
  {
    id: 'regex', construct: 'a regular expression literal: an opaque constant named by its text; the match members of a non-global literal as functions of the pattern and the string',
    kinds: ['RegularExpressionLiteral'],
    assumptions: { runtime: 'regex_<hash of the literal> of type Ext_RegExp; exec and match of a non-global literal read index and input as regex_index(pattern, string) and the string, groups.k of a group named once that takes part in every match as regex_group(pattern, string, k), groups as a presence test as whether the pattern names a group', aliasing: 'a literal is a new object, never shared', exceptions: 'a literal never throws', termination: 'terminates' },
    refusal: 'this regular expression form has no reading',
    design: ['design/library-rows.md', 'design/heap-stage5.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'equality', construct: '=== and == between values: equality of the value reading, the coercion table for == between primitives',
    uses: (n, ts) => ts.isBinaryExpression(n) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(n.operatorToken.kind),
    lint: ['loose-equality', 'reference-equality', 'mixed-types'],
    translate: rx('^loose equality on a non-primitive operand is not translated$'),
    assumptions: { runtime: '=== on primitives is Dafny ==; against a literal a mixed union compares on the literal\'s primitive arm; == between primitives follows ECMA-262 7.2.14 member by member', aliasing: 'two plain records or arrays compare by node identity only in the heap core; elsewhere reference equality is refused', exceptions: 'never throws', termination: 'terminates' },
    refusal: 'this equality compares references or mixes primitives with objects outside a literal test',
    design: ['design/mixed-vs-literal.md', 'design/null-undefined.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'logic-values', construct: 'booleans, conditionals, &&, || and ??: JavaScript truthiness by the static type, the deciding operand evaluated once',
    decisionExceptions: [{
      id: 'conditional-state-channels',
      sites: [{ who: 'lint', rule: 'conditional-effect' }, { who: 'translate', rule: 'conditional-effect' }],
      conditions: {
        argumentUpdatesInBranch: 'a same-file callee changes its argument under a conditional or short-circuit branch; branch results do not carry parameter updates',
        worldEffectInPureBranch: 'a logical right operand has a world effect while the emitting unit has no world channel',
      },
      reason: 'These are different state channels: admission protects callee argument updates, while emission requires the world channel of the enclosing unit. Neither condition implies the other.',
    }],
    kinds: ['TrueKeyword', 'FalseKeyword', 'ConditionalExpression'],
    uses: (n, ts) => ts.isBinaryExpression(n) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(n.operatorToken.kind),
    lint: ['conditional-effect'],
    assumptions: { runtime: 'truthiness per static type (a number is nonzero, a string nonempty, an Option Some and truthy); a branch with world transitions returns its world and value only when taken', aliasing: 'values', exceptions: 'a branch\'s throw is the exception reading\'s', termination: 'terminates when the operands do' },
    refusal: 'a same-file call that changes its arguments inside a conditional branch has no reading here',
    design: ['design/mixed-logic-values.md', 'SEMANTICS.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'absence', construct: 'null and undefined: Option<T> for one absence, Nullish<T> with distinct tags for both, Any_null and Any_undefined in Any',
    kinds: ['NullKeyword'],
    lint: [],
    translate: rx('^absent-number: '),
    assumptions: { runtime: 'a type admitting one absence is Option<T>, both Nullish<T>; an absence test tests the tag the operator tests; a dictionary read typed without undefined reads its key\'s presence', aliasing: 'values', exceptions: 'never throws', termination: 'terminates' },
    refusal: 'an absence test of a value whose absence the reading does not carry has no reading',
    design: ['design/null-undefined.md', 'design/absent-number.md', 'design/branch-types.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'non-null-assertion', construct: '`x!` on a value whose type excludes absence: the value itself',
    kinds: ['NonNullExpression'],
    lint: ['non-null-assertion'],
    assumptions: { runtime: 'erased: the value is read as it is', aliasing: 'the value itself', exceptions: 'none: on a type that admits absence it is refused, since the absent value would flow on or a read through it throw', termination: 'terminates' },
    refusal: '`x!` on a value that may be null or undefined checks nothing at run time',
    design: ['design/null-undefined.md'],
    versions: [
      { version: 0, status: 'withdrawn', reason: 'a non-null assertion on an absent value read as a value of the type: `u.name!` proved equal to `u.name! + ""` (research brief 20 section 2)' },
      { version: 1, status: 'current' },
    ],
  },
  {
    id: 'type-assertion', construct: '`e as T`, `<T>e`, `e satisfies T`: the value keeps its run-time type (the source\'s, or Any for any and unknown)',
    kinds: ['AsExpression', 'TypeAssertionExpression', 'SatisfiesExpression'],
    lint: ['type-assertion'],
    assumptions: { runtime: 'identity at run time; a narrowing assertion is read with the source\'s real type, a conversion to the asserted type only where the reading carries it', aliasing: 'the value itself', exceptions: 'never throws', termination: 'terminates' },
    refusal: 'a value whose type nothing checked, in a slot that reads it as its asserted type',
    design: ['design/type-assertions.md'],
    versions: [
      { version: 0, status: 'withdrawn', reason: 'a type assertion read as its asserted type: an unchecked value proved equal under a type it does not have (research brief 20 section 2)' },
      { version: 1, status: 'current' },
    ],
  },
  {
    id: 'types', construct: 'the TypeScript types of a unit as Dafny types: records as datatypes with an open rest, unions as sums or opaque, Set and Map as ordered carriers, functions as arrows',
    always: true,
    kinds: ['InterfaceDeclaration', 'TypeAliasDeclaration'], // a type declared inside a unit: erased at run time, read through the checker (design/local-declarations.md)
    lint: ['unsupported-type', 'ts-strict', 'unresolved-module', 'untyped-js'],
    translate: rx('^type nesting too deep$', '^type parameter .* is not one of this function\'s$', '^type parameter .* hides another of the same name$', '^array-like type .* has no element type$', '^reference-key: ', '^builtin-type: ', '^type .* is not translatable$', '^union type .* is not translatable$', '^a field named .* is the open record\'s own slot$', '^untyped-js: '),
    assumptions: { runtime: 'a record type is a datatype of its declared fields plus an opaque rest (and an index dictionary when it declares an index signature); a union with a runtime discriminator is a sum, any other union opaque; a type with methods is an opaque type with accessor externals', aliasing: 'the value reading copies records: a record is a value; identity is the heap core\'s', exceptions: 'none', termination: 'none (a type)' },
    refusal: 'this type has no Dafny reading',
    design: ['design/open-datatype.md', 'design/branch-types.md', 'design/ordered-collections.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'records', construct: 'object literals: a record datatype value (constructor defaults for the rest), a dictionary literal as the ordered carrier',
    kinds: ['ObjectLiteralExpression', 'PropertyAssignment', 'ShorthandPropertyAssignment'],
    lint: [],
    assumptions: { runtime: 'a literal builds the datatype of its contextual record type, members in source order, a missing optional field None, the rest MoreBuilt; a literal of a dictionary type is DictPut over its members in creation order', aliasing: 'a literal is fresh', exceptions: 'a member expression\'s throw is the exception reading\'s', termination: 'terminates when the members do' },
    refusal: 'this literal form has no record reading',
    design: ['design/open-datatype.md', 'design/dict-order.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'members', construct: 'a member read `a.f`: a datatype field, an array or string length, a Set or Map size, an accessor of an opaque type, a field of a type parameter through its constraint',
    kinds: ['PropertyAccessExpression'],
    lint: ['unsupported-member'],
    translate: rx('^property \\..* on .*: the constraint declares no such member$'),
    assumptions: { runtime: 'a declared field of a record is its datatype field; an undeclared key of an open record its dictionary entry; a field of an opaque value an uninterpreted accessor', aliasing: 'a read copies the value (the heap core reads the cell)', exceptions: 'a read of a declared member never throws; a getter of a class of the file is a unit call', termination: 'terminates (a getter is a unit)' },
    refusal: 'this member has no reading on this type',
    design: ['design/member-constraints.md', 'design/library-rows.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'keys', construct: 'element access and computed keys: an array or string index, a dictionary key, a finite union of declared keys as a case split, an open key as an uninterpreted lookup',
    kinds: ['ElementAccessExpression', 'ComputedPropertyName'],
    lint: ['dynamic-key'],
    translate: rx('^dynamic-key: ', '^tuple index must be a literal$', '^key .* is not a declared data field$', '^an absent key reads undefined, which this value type leaves out$', '^a computed key on a record with declared keys is a literal or a union of literals$', '^the fields of a computed key union have different types$'),
    assumptions: { runtime: 'a dictionary is OMap<string, V> in property order (array indexes first, then creation order); a key the dictionary does not own reads its Object.prototype member or undefined; an open record\'s undeclared key reads its index dictionary', aliasing: 'a read copies; a write rebuilds the owner (mutation reading)', exceptions: 'an index read past the end reads undefined, never throws', termination: 'terminates' },
    refusal: 'this key is not one the reading can name',
    design: ['design/open-datatype.md', 'design/dynamic-record-reads.md', 'design/open-key-read.md', 'design/hash-keys.md', 'design/dict-order.md', 'design/computed-literal-keys.md'],
    versions: [
      { version: 0, status: 'withdrawn', reason: 'an undeclared key read on a record with an index signature read as absent, and two unknown dictionary keys compared by their text: values the record carries outside its declared fields were dropped (research brief 20 section 2)' },
      { version: 1, status: 'current' },
    ],
  },
  {
    id: 'prototype', construct: 'plain objects: every record and dictionary has Object.prototype as its prototype; `in` and the own-key tests read own keys plus the names of Object.prototype',
    uses: (n, ts) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.InKeyword,
    lint: ['prototype', 'freeze'],
    translate: rx('^prototype: ', '^the plain-object test ', '^the own-key test ', '^`Object\\.prototype\\.hasOwnProperty\\.call` takes the object and one key$'),
    assumptions: { runtime: '`k in o` is an own key or a name of Object.prototype; a made prototype (Object.create, setPrototypeOf, `__proto__`) is followed by its reach and refuses `in` where it reaches', aliasing: 'a prototype is never shared state in the reading', exceptions: 'none', termination: 'terminates' },
    refusal: 'this reaches the prototype chain, which the plain-object reading does not hold',
    design: ['design/narrow-in.md', 'design/in-prototype.md', 'design/proto-names.md', 'design/proto-write.md'],
    versions: [
      { version: 0, status: 'withdrawn', reason: 'a prototype name on a dictionary read as absent: `d["toString"]` proved undefined while JavaScript reads a function (research brief 20 section 2; design/proto-names.md)' },
      { version: 1, status: 'current' },
    ],
  },
  {
    id: 'record-copy', construct: 'a copy of a record\'s own keys: `{ ...x }` and `Object.assign({}, x)`: the source itself with its rest, updated by the later members',
    kinds: ['SpreadAssignment'],
    lint: ['spread-source', 'assign-target'],
    translate: rx('^spread-source: '),
    assumptions: { runtime: 'a built source is read by its keys; any other record source enters whole (Spread_T(x), its rest included); a spread after other members is one uninterpreted construction keyed by the layout', aliasing: 'the copy is a new record; a nested object is shared, which the value reading does not see (the heap core does)', exceptions: 'a getter on the source is refused by the type reading', termination: 'terminates' },
    refusal: 'this copy takes keys the reading cannot name',
    design: ['design/open-datatype.md', 'design/spread-map.md'],
    versions: [
      { version: 0, status: 'withdrawn', reason: 'a record copy (a spread, Object.assign) read as its declared fields: a hand copy of the declared fields proved equal to the copy that carries every own key (research brief 20 section 2; design/open-datatype.md)' },
      { version: 1, status: 'current' },
    ],
  },
  {
    id: 'arrays', construct: 'array literals and spreads: a sequence; a spread the sequence of its source\'s elements (an array, a Set, a Map, their iterators, a fixed tuple)',
    kinds: ['SpreadElement', 'ArrayLiteralExpression'],
    lint: ['spread'],
    translate: rx('^spread arguments need an ordinary array$', '^a spread among other arguments is not translated$'),
    assumptions: { runtime: 'an array literal is the concatenation of its segments; a spread argument to an outside call is one sequence (call_seq_)', aliasing: 'elements are copied as values', exceptions: 'none', termination: 'terminates' },
    refusal: 'this spread has no sequence reading',
    design: ['design/tuple-spread.md', 'design/spread-outside-callees.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'destructuring', construct: 'object and array patterns: field reads in order, defaults where the field may be absent, a record rest as a remainder function',
    kinds: ['ObjectBindingPattern', 'ArrayBindingPattern', 'BindingElement'],
    lint: ['destructuring', 'record-rest', 'uninitialised'],
    translate: rx('^record rest needs a typed source record$', '^a computed key in a record rest pattern is not translated$', '^a rest element of a tuple or an opaque value is not translated$', '^pattern is not translated$'),
    assumptions: { runtime: 'each name binds its field or element; a default applies when the field is absent or undefined; a scalar record rest is the remaining fields, another rest an uninterpreted function of the source named by the excluded keys', aliasing: 'a bound object is another name for the source\'s part (an alias, refused for mutation)', exceptions: 'a pattern on an absent source is refused by the type reading', termination: 'terminates' },
    refusal: 'this pattern has no reading',
    design: ['design/record-rest-any.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'declarations', construct: '`const` and `let` declarations: Dafny `var` bindings in a chain, a block\'s names saved and restored around it',
    kinds: ['VariableStatement', 'VariableDeclaration', 'Parameter'],
    lint: ['var', 'definite-assignment', 'param-form'],
    translate: rx('^definite-assignment: '),
    assumptions: { runtime: 'a declaration binds its initializer; `let x;` takes the type of its first assignment as an Option; a name a block declares that hides an outer one is saved and rebound after the block', aliasing: 'a declaration of an object is an alias of its initializer\'s object', exceptions: 'a temporal-dead-zone read is refused (definite-assignment)', termination: 'terminates' },
    refusal: 'this declaration form has no reading',
    design: ['design/local-declarations.md'],
    versions: [
      { version: 0, status: 'withdrawn', reason: 'a `let v!: T` read before its write took an uninterpreted start value: `return v` proved equal to `return v + 0` (research brief 20 section 2)' },
      { version: 1, status: 'current' },
    ],
  },
  {
    id: 'control-flow', construct: 'blocks, if, switch, return, break and continue, labels, expression statements: one Dafny expression per statement list, branches as if-then-else',
    kinds: ['Block', 'EmptyStatement', 'IfStatement', 'SwitchStatement', 'CaseClause', 'DefaultClause', 'ReturnStatement', 'BreakStatement', 'ContinueStatement', 'LabeledStatement', 'ExpressionStatement'],
    lint: ['break-continue', 'label', 'bare-return'],
    translate: rx('^a path ends without a return$', '^statement .* cannot be an expression$', '^break or continue outside a loop$', '^an abrupt exit has no enclosing loop or switch$', '^a labelled exit lacks its completion channel$', '^a case declaration shadows a name the switch head assigns$', '^bare return$', '^statement expression is not translated$', '^a bare await statement has no effect in the core$'),
    assumptions: { runtime: 'a statement list is one expression; if/else an if-then-else carrying the names it assigns; a switch the first matching case and its fall-through; a jump leaves the blocks between it and its target', aliasing: 'the names a branch assigns leave it as a tuple', exceptions: 'a throw leaves through the exception reading', termination: 'terminates when its statements do' },
    refusal: 'this control transfer has no reading',
    design: ['design/for-desugar.md', 'design/bare-return-void.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'loops', construct: 'for, for-of, for-in, while, do: a recursive helper per loop with a decreasing measure, or one opaque block keyed by its text when no bound is known',
    kinds: ['ForStatement', 'ForOfStatement', 'ForInStatement', 'WhileStatement', 'DoStatement'],
    lint: ['for-of-non-array', 'for-in', 'key-order', 'for-in-delete'],
    translate: rx('^key-order: ', '^while needs `// @decreases <expr>`$', '^an effect in a for header$', '^in --real mode a for-loop counter starts at an integer literal$', '^async iterator abrupt completion needs an opaque loop$'),
    assumptions: { runtime: 'a for-of walks the sequence (an array, a string, a Set\'s items, a Map\'s entries in insertion order); a for-in walks the own keys in property order where the unit fixes them; a counted for is a counter helper', aliasing: 'the loop carries the names it assigns', exceptions: 'a throw in the body leaves through the exception reading', termination: 'a helper decreases its measure (the sequence index, the counter, a derived bound, a @decreases hint); a loop without one is an opaque block assumed to return, which the theorem never unfolds' },
    refusal: 'this loop has no bounded or opaque reading',
    design: ['design/loop-forms.md', 'design/loop-fuel.md', 'design/forin-order.md', 'design/for-desugar.md'],
    versions: [
      { version: 0, status: 'withdrawn', reason: 'a for-in read in the datatype\'s sorted field order: two objects whose keys were created in another order proved equal (research brief 20 section 2; design/forin-order.md)' },
      { version: 1, status: 'current' },
    ],
  },
  {
    id: 'exceptions', construct: 'throw and try: a fault flag on the world, checked after each statement that may fault; a complex try one opaque transition keyed by its text',
    kinds: ['ThrowStatement', 'TryStatement', 'CatchClause'],
    lint: ['exception-callback', 'exception-binding', 'exception-return', 'callback-control'],
    translate: rx('^throw is translated in --core mode only$', '^a throwing callback here has no fault channel; call the array method in a statement of the unit$'),
    assumptions: { runtime: 'a throw raises its value on the world; a catch binds the fault value as Any and clears the flag; finally runs before the saved completion; a throwing unit and its callers share the fault channel', aliasing: 'a thrown value is passed as Any', exceptions: 'the reading itself: an Error is its class and message, never its stack text', termination: 'terminates when the body does' },
    refusal: 'this throw or catch has no fault channel here',
    design: ['design/exceptions-across-calls.md', 'design/throwing-callbacks.md', 'design/fake-throw.md'],
    versions: [
      { version: 0, status: 'withdrawn', reason: 'a fault in a loop callback was lost: a callback that throws on one element proved equal to one that does not (research brief 20 section 2; design/throwing-callbacks.md)' },
      { version: 1, status: 'current' },
    ],
  },
  {
    id: 'calls', construct: 'calls: a same-file unit by its Dafny function (mutated parameters returned beside the result), an outside call as one transition of the world named by its callee and the code it reaches',
    kinds: ['CallExpression', 'NewExpression'],
    lint: ['unsupported-call', 'function-value', 'bound-function'],
    translate: rx('^callee .* was not translated$', '^.* needs .* arguments$', '^call through a computed callee is not translated$', '^`apply` takes its arguments as one array literal$', '^`call` and `apply` take the receiver first$', '^an array method called through .* is not the direct call here: ', '^the constructor of .* was not translated$', '^the argument for `.*`, which .* changes, must be a name or a fresh literal$'),
    assumptions: { runtime: 'a unit call is its function; an effectful callee threads the world; an outside call is call_args_<callee>_<reach>(world, args), the same request answering the same in the same world; `h.call(o, a)` on a unit is the direct call', aliasing: 'distinct parameters are distinct objects (the stated axiom); a mutated parameter is an output the caller rebinds', exceptions: 'a throwing callee\'s fault is routed as a direct call\'s', termination: 'a recursive cycle takes fuel; an outside call is assumed to return' },
    refusal: 'this call has no reading',
    design: ['SEMANTICS.md', 'design/reach-keys.md', 'design/inherited-method.md', 'design/push-apply.md', 'design/inline-callee.md'],
    versions: [
      { version: 0, status: 'withdrawn', reason: 'an inherited method call keyed by its name while a subclass overrides what the base calls: two different behaviours shared one transition (research brief 20 section 2; design/inherited-method.md)' },
      { version: 1, status: 'current' },
    ],
  },
  {
    id: 'library', construct: 'the library rows: array, string, Set, Map, Math and Object functions read by prelude helpers or as transitions (translate/library.json)',
    uses: (n, ts, ctx) => ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ctx.libraryReceiver(n.expression.expression),
    lint: ['collection-iterator', 'mutator-value', 'in-place-mutation', 'math-empty'],
    lintText: [
      ['unsupported-call', /(takes no argument|takes one (comparator|callback|pattern|value \(a start index stays out\))|needs a callback( and an initial value)?|takes plain arguments)$|^(Set|Map)\.(forEach|clear) is|^new [^ (]+\(\.\.\.\) reads an array|^\.[^ ]+\(\) (in an optional chain|as a value changes|reads the host's locale|on .* reads Object\.prototype)|^method \.[^ ]+\(\) on .* is outside the subset; narrow the union|^sort as a statement|^splice as a (value|statement)|^(lastIndexOf|toString|substr|matchAll|search|fill) /],
    ],
    translate: rx('^array method \\..*\\(\\) is not translated$', '^Set\\..*\\(\\) is not translated as an expression$', '^Map\\..*\\(\\) is not translated as an expression$', '^\\..*\\(\\) as a value needs a local array or a fresh one$', '^\\..*\\(\\) is not translated here$'),
    assumptions: { runtime: 'each row of the library table is a prelude helper (Filter, Map, Fold, Slice, StrFind, ...) or a world transition (a locale read, Math.random); lane B checks every row\'s result fact on every run', aliasing: 'a row says whether its result is fresh, the receiver or an element', exceptions: 'a row that may throw on correct inputs (JSON.parse, URL, BigInt) is a faulting call', termination: 'the helpers decrease their sequence' },
    refusal: 'this library call has no row',
    design: ['design/library-rows.md', 'design/ordered-collections.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'callbacks', construct: 'a function value: a pure arrow as a Dafny lambda, an array callback as a loop body, a callback handed outside as an opaque value named by its text and captures',
    kinds: ['ArrowFunction', 'FunctionExpression'],
    lint: ['callback-form', 'callback-result', 'foreach', 'async-predicate', 'async-reduce', 'async-callback'],
    translate: rx('^.* has no call signature to read as a callback$', '^.* returns a promise; an async callback needs an inline arrow under Promise\\.all$', '^.* changes its argument; a callback\'s argument is the array\'s element$', '^.* is generic; pass it through an inline arrow$', '^parseInt reads the index JavaScript passes as its radix$', '^.* has no reading as a callback$', '^.* is not a function$', '^.* has effects; it cannot be a callback$', '^.* is not a same-file function or a local function value$', '^an effect inside a callback; the order of its world transitions is not defined$', '^callback path ends without a return$'),
    assumptions: { runtime: 'a pure arrow is a lambda; an effectful array callback is a loop over the array, each step\'s transitions in index order; a callback handed to an outside call is Fn(code id, captured cells), equal only to the same code with equal captures', aliasing: 'a callback may not change an outer binding unless it is read as a loop body', exceptions: 'a synchronous array callback\'s throw is its unit\'s; a handed callback\'s happens inside the outside transition', termination: 'a lambda terminates when its body does; a loop body is one step of a bounded loop' },
    refusal: 'this function value has no reading',
    design: ['design/callback-patterns.md', 'design/effectful-callbacks.md', 'design/named-callbacks.md', 'design/array-callback-cells.md', 'design/handler-identity.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'local-functions', construct: 'a function declared inside a unit: a local procedure spliced at each call statement, or a local function value',
    kinds: ['FunctionDeclaration'],
    lint: ['generator'],
    translate: rx('^a nested function needs a name$'),
    assumptions: { runtime: 'a procedure\'s body is spliced at its call with its parameters bound (a new environment); any other nested function is a lambda value', aliasing: 'a procedure writes the unit\'s cells as its own statements', exceptions: 'a procedure never throws (it is not a procedure otherwise)', termination: 'a procedure does not recurse' },
    refusal: 'this nested function has no reading',
    design: ['design/local-procedures.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'mutation', construct: 'writes: a local rebound, a parameter\'s record or array rebuilt and returned as an output, a field of the receiver as a world cell, a delete of an optional field or a key',
    decisionExceptions: [
      {
        "id": "mutation-admission-vs-value-output",
        "sites": [
          {
            "who": "lint",
            "rule": "param-assign"
          },
          {
            "who": "translate",
            "rule": "param-assign"
          }
        ],
        "conditions": {
          "admissionRisk": "Source-level mutation and rebinding risk, before emission planning.",
          "valueOutputs": "Mutated operands of the emitted value ABI, including selected callback and receiver bindings."
        },
        "reason": "The same facts feed two projections with different purposes and traversal scopes; equating them changes admission or function outputs."
      },
      {
        "id": "element-shape-vs-selected-emission",
        "sites": [
          {
            "who": "lint",
            "rule": "alias-mutation",
            "message": "`${}` is the accumulator `reduce` hands its callback: it holds the array's first element when the call passes no initial value, a value the unit was handed, or what a step returned; a write through it is read only when the call passes an initial value it builds itself out of primitives (`{}`, `[]`, `new Map()`), every step returns the accumulator, and the write is one step deep (`acc[k] = v`) (escape reduce_accumulator_element)"
          },
          {
            "who": "lint",
            "rule": "alias-mutation",
            "message": "`${}` is the element `${}` hands its callback; a field written through it (`=`, `+=`, `-=`, `*=`, `++`, `--`) is read only in a `forEach` statement of one parameter over plain data records; write the element through its array in an index loop, `for (let i = 0; i < xs.length; i++) xs[i].f = v` (escape element_write_loop_callback)"
          },
          {
            "who": "translate",
            "rule": "alias-mutation",
            "message": "alias-mutation: `${}` is the element a loop or an array callback walks; this reading copies it, so a write through it would be lost: write the element through its array in an index loop, `xs[i].f = v` (escape element_write_loop_callback)"
          },
          {
            "who": "translate",
            "rule": "alias-mutation",
            "message": "alias-mutation: `${}` is the element a loop or an array callback walks; this reading copies it, so the write would be lost, and the heap core does not read this unit: write the element through its array in an index loop, `xs[i].f = v` (escape element_write_loop_callback)"
          }
        ],
        "conditions": {
          "heapShapeEligible": "The callback field-write shape can be handled by the heap planner.",
          "heapSelected": "The whole unit was selected for heap emission; otherwise loop-element writes lose identity in the value reader."
        },
        "reason": "Admission knows eligible shapes; value emission knows the actual planner selection. Owned reduce accumulators additionally distinguish ownership from safe write depth."
      }
    ],
    decisions: [
      { id: 'mutation-admission-risk', exception: 'mutation-admission-vs-value-output', condition: 'admissionRisk', reason: 'Source-level rebinding risk follows any mutator expression and nested argument roots, skipping nested functions; it does not define emitted return operands.' },
      { id: 'mutation-value-outputs', exception: 'mutation-admission-vs-value-output', condition: 'valueOutputs', reason: 'The value ABI follows emitted loop callbacks, statement mutators, declared receivers and receiver calls, direct argument names, and excludes suspended async-generator bodies.' },
      { id: 'element-heap-shape', exception: 'element-shape-vs-selected-emission', condition: 'heapShapeEligible', reason: 'Admission can permit a field-write shape the heap knows; only the later planner decides whether that whole unit is selected.' },
      { id: 'element-value-emission', exception: 'element-shape-vs-selected-emission', condition: 'heapSelected', reason: 'A unit actually emitted by the value reader must refuse writes through loop elements even when their syntax is heap-eligible; owned reduce accumulators remain distinct from source write-depth safety.' },
    ],
    kinds: ['DeleteExpression'],
    uses: (n, ts) => ts.isBinaryExpression(n) && n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && n.operatorToken.kind <= ts.SyntaxKind.LastAssignment,
    lint: ['alias-mutation', 'param-mutation', 'closure-mutation', 'global-mutation', 'index-assign', 'property-assign', 'receiver-mutation', 'receiver-write', 'opaque-mutation', 'param-assign', 'delete', 'unsupported-operator', 'read-after-call', 'copied-argument'],
    translate: rx('^read-after-call: ', '^copied-argument: ', '^property-assign: ', '^receiver-write: ', '^receiver-mutation: ', '^alias-mutation: ', '^param-assign: ', '^assignment through an optional field is not translated$', '^field .* is not a declared field of a record$', '^an element write through a value that is not an array$', '^index assignment on a non-array$', '^a compound assignment on an optional field is not translated$', '^assignment operator is not translated$', '^delete of a field of this is not translated; assign undefined$', '^delete of `.*`, a field that is not optional$', '^delete target is not translated$', '^element write through a path: the heap core reads it, the value reading does not$', '^assignment value needs a named array or dictionary$'),
    assumptions: { runtime: 'a write rebuilds its root along the path (x := x.(a := ...)); a parameter the unit changes is returned beside the result and rebound by the caller; the heap core reads writes through parameter nodes as steps on the object graph', aliasing: 'two parameters are distinct objects; a change through a local alias of an object the unit did not build is refused; a callback never changes an outer binding', exceptions: 'a write never throws in the reading (a frozen object is refused)', termination: 'terminates' },
    refusal: 'this write changes an object the reading cannot follow',
    design: ['design/element-writes.md', 'design/alias-result.md', 'design/param-rebind.md', 'design/receiver-write.md', 'design/heap-stage5.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'operators', construct: 'arithmetic, comparison, unary and update operators, typeof: Dafny operators on the value reading',
    kinds: ['BinaryExpression', 'PrefixUnaryExpression', 'PostfixUnaryExpression', 'TypeOfExpression'],
    lint: [],
    assumptions: { runtime: '+ on numbers adds and on a string joins (ToString of the other operand); < on strings is the code-unit order; typeof decides by the static type or is an uninterpreted read of an opaque value', aliasing: 'values', exceptions: 'never throws on the value reading\'s types', termination: 'terminates' },
    refusal: 'this operator has no reading on these operand types',
    design: ['design/operators-as-values.md', 'design/exact-type-tests.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'operators-as-values', construct: 'an assignment, an update or a comma used as a value: the value bound once, every operand captured in source order',
    kinds: ['CommaListExpression'],
    uses: (n, ts) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.CommaToken,
    lint: ['operator-value-context', 'update-expression', 'assignment-expression'],
    translate: rx('^assignment-expression: ', '^value updates need --core$'),
    assumptions: { runtime: 'each operand of the enclosing expression is bound before the step, in source order; the step\'s value is its result', aliasing: 'the target root is not written while its reference is evaluated', exceptions: 'none of its own', termination: 'terminates' },
    refusal: 'this value step has no reading in this context',
    design: ['design/operators-as-values.md', 'design/comma-operator.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'optional-chain', construct: '`a?.b` and `f?.(x)`: an Option of the read, the call and its transition only when the callee or receiver is present',
    decisionExceptions: [{
      id: 'optional-source-vs-emitted-callee',
      sites: [{ who: 'lint', rule: 'optional-chain', message: '<shape.why>' }, { who: 'translate', rule: 'optional-chain', message: 'optional-chain: ${}' }],
      conditions: {
        sourcePathAdmission: 'the directly walked source callee has an admissible local/plain-record path, one nongeneric signature and no surrounding value step',
        emittedCalleeShape: 'the lowered value has a declared field or local callee, with a nongeneric signature only when it can be absent, and no active synthetic value step',
      },
      reason: 'Source path admission and lowered field emission have different domains. Indirect class receiver paths can reach emission without that source walk; imposing the source path restriction there loses admitted units. Required callees need no optional branch signature. Both conditions share the type and signature facts.',
    }],
    uses: (n, ts) => !!n.questionDotToken,
    lint: ['optional-chain'],
    translate: rx('^optional-chain: ', '^\\?\\. on a type parameter is not translated$'),
    assumptions: { runtime: 'a?.b is if a.Some? then Some(a.value.b) else None; f?.(x) applies the present value once; a chain on an opaque value tests null and undefined', aliasing: 'values', exceptions: 'the call\'s throw only on the present branch', termination: 'terminates' },
    refusal: 'this optional chain has no reading',
    design: ['design/optional-call.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'promises', construct: 'async units and promises: await as a world transition, exact then/catch/finally/new Promise reactions sharing the fault channel, a returned outside promise as a handle',
    decisionExceptions: [{
      id: 'promise-opaque-return',
      sites: [{ who: 'translate', rule: 'promise-handler', message: 'promise-handler: a promise returned from an opaque block of a throwing handler is not read' }],
      conditions: {
        inlineStatementAdmission: 'the handler body uses inlinePromiseStatementKind and has no refused same-file mutation',
        opaqueFaultReturn: 'faultTr takes an opaque block return continuation whose handler return type is Promise',
      },
      reason: 'Statement admissibility is syntactic; the fault emitter additionally needs to settle a Promise returned by an opaque block. A valid statement can reach this separate emission limit.',
    }],
    kinds: ['AwaitExpression'],
    lint: ['promise', 'promise-handler', 'promise-thenable', 'promise-pending', 'promise-executor', 'promise-executor-escape', 'promise-unsettled', 'promise-all-order', 'async'],
    translate: rx('^promise-handler: ', '^promise-pending: ', '^promise-unsettled: ', '^promise-combinator: ', '^promise-executor: ', '^promise-executor-escape: ', '^promise-thenable: ', '^a promise a same-file async unit returns, stored as a handle', '^promise forms require an effectful core unit$', '^an opaque promise call requires an effectful unit$'),
    assumptions: { runtime: 'an awaited outside call is one transition yielding the settled value; an exact reaction reads its handler with the settled argument; Promise.all over map is a loop collecting by index; a non-async unit returning an outside promise returns that handle unsettled', aliasing: 'a handler may not mutate; a held promise of a value without identity is a handle', exceptions: 'a rejection is the fault flag; a handler\'s throw rejects the derived promise', termination: 'an await is assumed to settle (pending work is lane B\'s observation)' },
    refusal: 'this promise form has no exact or outside-call reading',
    design: ['design/promise-forms.md', 'design/promise-handle.md', 'design/void-promise.md', 'design/microtask-worker.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'promise-named-handler', construct: 'a named promise handler `p.then(h)`: h called with the settled argument (a unit by its function, an import as a transition, a module constant as a transition keyed by its reach)',
    uses: (n, ts) => ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ['then', 'catch', 'finally'].includes(n.expression.name.text) && n.arguments.length === 1 && (ts.isIdentifier(n.arguments[0]) || ts.isPropertyAccessExpression(n.arguments[0])),
    lint: [],
    lintText: [
      ['promise-handler', /^(use an arrow or a named same-file, module constant or imported function|call the member inside an arrow)/],
      ['promise-thenable', /^give a named handler a plain or native Promise return type$/],
    ],
    assumptions: { runtime: 'one decision, namedPromiseHandler (common.mjs), for the lint and the translator: a plain single signature with at most one parameter and a plain or native Promise result', aliasing: 'a handler unit that mutates is refused', exceptions: 'the handler\'s throw rejects the derived promise', termination: 'the handler is assumed to return' },
    refusal: 'this named handler has no exact reading',
    design: ['design/named-then.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'generators', construct: 'a pure generator as the sequence it yields; an async generator as one opaque program keyed by its text',
    kinds: ['YieldExpression'],
    lint: ['generator-use', 'generator-bound', 'generator-effect'],
    translate: rx('^async generators need --core$', '^generators need --core$'),
    assumptions: { runtime: 'a scalar generator consumed at once (for-of, spread, Array.from, yield*) is the sequence of its yields; an async generator one transition keyed by the code it reaches', aliasing: 'yields are scalars', exceptions: 'a generator\'s throw is its consumer\'s', termination: 'a generator is finite (recursive producers refused)' },
    refusal: 'this generator or its use has no step reading',
    design: ['design/generators.md', 'design/gen-walk.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'classes', construct: 'methods of a class of the file: units with an explicit receiver; fields a method assigns as world cells; `this` in a free function as a declared `this` parameter',
    decisionExceptions: [{
      id: 'receiver-scope-vs-self-type',
      sites: [
        { who: 'lint', rule: 'this', message: '`this` outside a class method; a free function declares its receiver as a `this` parameter' },
        { who: 'translate', rule: 'this', message: 'this: `this` outside a class method; a free function declares its receiver as a `this` parameter' },
      ],
      conditions: {
        lexicalReceiverAvailable: 'the lint traversal has a class receiver, an object-literal method receiver, or a declared this parameter',
        materializableUnitReceiver: 'selfType materializes a unit class receiver or declared this parameter; object-literal methods use their captured field environment instead',
      },
      reason: 'Lexical this validity and the availability of a unit self type have different domains. A literal method has lexical this but no unit self type. Combining them would reject valid literal methods or invent a receiver type.',
    }],
    kinds: ['ThisKeyword', 'SuperKeyword', 'Constructor', 'ClassDeclaration', 'ClassExpression', 'PropertyDeclaration'],
    lint: ['class', 'this', 'static-this', 'this-param', 'implicit-this'],
    translate: rx('^this-param: ', '^this: ', '^`this` outside a class method$'),
    assumptions: { runtime: 'a method is the unit Class.method of self and its parameters; a field a method assigns lives in the world (get/set transitions); `new C()` of a class of the file allocates a handle and runs the constructor unit', aliasing: 'self is a handle; fields are cells of the world', exceptions: 'a method\'s throw is its caller\'s', termination: 'a method terminates when its body does' },
    refusal: 'this class form or receiver has no reading',
    design: ['design/class-statics.md', 'design/this-param.md', 'design/inherited-method.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'object-literal-methods', construct: 'methods and getters of an object literal: function fields over the literal\'s immutable data',
    kinds: ['MethodDeclaration', 'GetAccessor', 'SetAccessor'],
    lint: ['object-method-mutation', 'object-method-capture', 'iterator-protocol'],
    assumptions: { runtime: 'a one-return method over scalar fields and parameters is an exact lambda; any other method an opaque value keyed by the literal\'s method texts and its captured data', aliasing: 'a literal method never changes its receiver or a captured binding', exceptions: 'an opaque method is called as a transition', termination: 'assumed to return' },
    refusal: 'this literal method has no reading',
    design: ['design/object-methods-getters.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'instanceof', construct: '`x instanceof C`: decided by the static type where it can be, else an uninterpreted test named by C and the classes the test can meet',
    uses: (n, ts) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword,
    lint: ['instanceof-constructor'],
    assumptions: { runtime: 'true for a nominal class in the type\'s ancestry, false for a primitive or a disjoint tag, else instanceof_<C>_<reach>(x)', aliasing: 'values', exceptions: 'a custom Symbol.hasInstance is refused', termination: 'terminates' },
    refusal: 'this constructor has no fixed identity',
    design: ['design/reach-keys.md'],
    versions: [
      { version: 0, status: 'withdrawn', reason: '`instanceof` keyed by the class\'s text: a changed heritage of the same name kept the same test (research brief 20 section 2)' },
      { version: 1, status: 'current' },
    ],
  },
  {
    id: 'react', construct: 'JSX elements as JsxElem values; hook calls as world transitions or slot reads; handlers as step descriptors',
    kinds: ['JsxElement', 'JsxSelfClosingElement', 'JsxFragment', 'JsxExpression', 'JsxText', 'JsxAttribute', 'JsxSpreadAttribute'],
    lint: ['hook-order', 'react-handler-capture', 'render-impure'],
    translate: rx('^a lazy initializer with more than a return is not read$', '^a hook result is taken apart field by field$', '^.* is not a field the hook table declares for .*$'),
    assumptions: { runtime: 'an element is JsxElem(tag, props, children); a listed hook a transition returning the table\'s record; useState in a slot unit a read of slot i, its setter a ReactSet step', aliasing: 'a closure captures the render\'s values (the capture table)', exceptions: 'none', termination: 'a render terminates' },
    refusal: 'this render or hook use breaks the Rules of React the reading relies on',
    design: ['design/react-handlers-memo.md', 'design/ref-cell.md', 'design/handler-descriptors.md', 'design/ui-layers.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'decorators', construct: 'a listed decorator: a route wrapper of guards and pipes, a metadata cell of the world (translate/decorators.json)',
    kinds: ['Decorator'],
    translate: rx('^the route wrapper is not read: ', '^a piped parameter is a plain required name$'),
    assumptions: { runtime: 'each guard gates the body, each pipe rebinds its parameter, all uninterpreted and identical on both sides; a metadata read is a transition keyed by the file\'s decoration', aliasing: 'none', exceptions: 'a denial is an uninterpreted result', termination: 'assumed' },
    refusal: 'this decorator has no row in the decorator table',
    design: ['design/decorators.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'proof-shape', construct: 'the --fn proof shape (methods with loops, kept for the fixtures) and the translator\'s invocation',
    translate: rx('^effectful callbacks need --core$', '^a push through a bucket map is read in --core mode$', '^unknown record enumeration needs the world; use --core$', '^.* loops, so it is a Dafny method and cannot be called inside an expression$', '^--fn is required unless --core is given$', '^no top-level function named ', '^no top-level function or class method named '),
    assumptions: { runtime: 'the proof shape reads loops as Dafny methods with user invariants; every production path uses --core', aliasing: 'as the core reading', exceptions: 'throw is core-only', termination: 'user-given @decreases and invariants, checked by Dafny' },
    refusal: 'this form is read in --core mode only',
    design: ['langs/ts/translate/translate.mjs (header)'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'unread-syntax', construct: 'the syntax the lint has no case for: refused by the default branch of its statement and expression switches',
    kinds: ['VoidExpression'],
    lint: ['unsupported-syntax', 'void'],
    translate: rx('^expression .* is not translated$', '^statement .* is not translated$'),
    assumptions: { runtime: 'none: nothing is read', aliasing: 'none', exceptions: 'none', termination: 'none' },
    refusal: 'this syntax has no reading',
    design: ['design/coverage-matrix.md'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'translator-internal', construct: 'the translator\'s own invariants (an effect in a unit not marked effectful, a missing helper): a defect of the translator, never a reading',
    translate: rx('^internal: ', '^no helper ', '^outside the subset:', '^.* reads or writes a metadata cell of the world in a unit not marked effectful$', '^hook .* is a world transition in a unit not marked effectful$'),
    assumptions: { runtime: 'none', aliasing: 'none', exceptions: 'none', termination: 'none' },
    refusal: 'the translator refused by an internal invariant; the unit is not read',
    design: ['langs/ts/translate/translate.mjs'],
    versions: [{ version: 1, status: 'current' }],
  },
  {
    id: 'callback-units', construct: 'a direct function argument listed as a unit, with stable bindings of enclosing units made explicit inputs',
    kinds: [],
    uses: (n, ts, ctx) => ctx.unit?.form === 'callback' && n === ctx.unit.body,
    lint: ['captured-mutable'],
    translate: [],
    assumptions: {
      runtime: 'identity comes from the original source call, its preceding literal arguments and argument index; callback parameters use their checker types; captured enclosing-unit bindings become explicit inputs, while module bindings retain the module-state reading',
      aliasing: 'a const binding is stable; a let or parameter is an input only if no possible write follows closure creation, including writes in another closure or a containing loop; object inputs retain the ordinary parameter and heap aliasing readings',
      exceptions: 'the callback body uses the ordinary unit exception reading; no capture operation invokes the callback or changes the surrounding call evaluation order; a mutable capture is refused before emission',
      termination: 'the callback body uses ordinary unit termination obligations; capturing a module-load argument terminates immediately and runs no callback body; lane B never invokes an enclosing unit to manufacture a closure',
    },
    refusal: 'an enclosing-unit binding may be written after this callback is created; capture a stable value',
    design: ['design/callback-units.md'],
    versions: [{ version: 1, status: 'current' }],
  },
];

// findings that never refuse: advice the lint attaches beside the gate (`--advice`, `--any-type`); no reading owns them
export const ADVICE_RULES = new Set(['nested-ternary', 'inner-html', 'any-type']);

const byId = new Map(READINGS.map((r) => [r.id, r]));
export const readingById = (id) => byId.get(id) ?? null;

// the withdrawals in force: the catalogue's own (a last version marked withdrawn) and LEAN_WITHDRAW, a list of
// `id=reason` separated by `;` (an operator withdraws a reading by name the moment it is found unsound, before any code
// changes); withdraw() adds one in this process (the withdrawal test)
const extra = new Map();
export function withdraw(id, reason) { if (!byId.has(id)) throw new Error(`no reading named ${id}`); extra.set(id, reason); return () => extra.delete(id); }
// the withdrawals in force as one string: a record made under other withdrawals is another record (lower.mjs memo)
export const withdrawalKey = () => `${[...extra].map(([k, v]) => `${k}=${v}`).join(';')}|${process.env.LEAN_WITHDRAW ?? ''}`;
export function withdrawnReason(id) {
  if (extra.has(id)) return extra.get(id);
  for (const part of String(process.env.LEAN_WITHDRAW ?? '').split(';')) { const i = part.indexOf('='); if (i > 0 && part.slice(0, i).trim() === id) return part.slice(i + 1).trim() || 'withdrawn by LEAN_WITHDRAW'; }
  const r = byId.get(id); const last = r?.versions[r.versions.length - 1];
  return last?.status === 'withdrawn' ? last.reason : null;
}
export const currentVersion = (r) => r.versions[r.versions.length - 1].version;

// the reading a syntax kind belongs to (one per kind), checked once at load: two entries claiming one kind is a defect
const KIND_OWNER = new Map();
for (const r of READINGS) for (const k of r.kinds ?? []) { if (KIND_OWNER.has(k)) throw new Error(`readings: kind ${k} claimed by ${KIND_OWNER.get(k)} and ${r.id}`); KIND_OWNER.set(k, r.id); }
export const readingOfKind = (kindName) => KIND_OWNER.get(kindName) ?? null;

const compiled = READINGS.map((r) => ({ id: r.id, lint: new Set(r.lint ?? []), lintText: r.lintText ?? [], translate: (r.translate ?? []).map((s) => new RegExp(s)) }));
const RULE_OWNER = new Map();
for (const c of compiled) for (const rule of c.lint) { if (RULE_OWNER.has(rule)) throw new Error(`readings: rule ${rule} owned by ${RULE_OWNER.get(rule)} and ${c.id}`); RULE_OWNER.set(rule, c.id); }
export const ownedRules = () => new Set(RULE_OWNER.keys());

// the reading a lint finding is the refusal of: a reading whose lintText claims the rule and the message, else the rule's
// owner; null when no entry owns the rule (the lowering names that `uncatalogued`)
export function readingOfFinding(rule, msg = '') {
  for (const c of compiled) for (const [r, re] of c.lintText) if (r === rule && re.test(msg)) return c.id;
  return RULE_OWNER.get(rule) ?? null;
}
// the reading a translator refusal is: its rule prefix (`rule: text`, the lint's rule the translator names) through the
// lint's table, else the first reading whose pattern matches; the message is the text after `file:line: `
export const translatorText = (message) => String(message).replace(/^[^\s:]+\.(?:[cm]?[jt]sx?):\d+: /, '');
export function readingOfRefusal(message) {
  const text = translatorText(message);
  const m = /^([a-z][a-z0-9-]*): ([\s\S]*)$/.exec(text);
  if (m && RULE_OWNER.has(m[1])) return readingOfFinding(m[1], m[2]);
  for (const c of compiled) if (c.translate.some((re) => re.test(text))) return c.id;
  return null;
}
