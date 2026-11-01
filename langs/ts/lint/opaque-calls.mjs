// The opacity ladder for calls, members, syntax and callbacks (lane w1c-opaque-calls, design/w1c-opaque-calls.md).
//
// A construct of one of these rules has no exact reading. It is not refused: the innermost statement of its unit's own
// body that holds it is one opaque step (translate/opaque.mjs opaqueForm), an uninterpreted transition of the world
// keyed by the statement's tokens and the text of every same-file unit it reaches, reading every name it mentions,
// writing every name it assigns, every reference-typed name in scope (the origins an alias inside it may have), every
// primitive a nested function of the unit assigns, with a result and a loop-control channel when it can return or jump.
// The lint keeps the rule and its message; the finding carries `opaque: statement` and stops nothing. Where no
// statement of the unit's own body holds the site (a parameter default, a concise arrow body, a field initialiser), or
// the construct acts outside its own text, the refusal stands with its reason (`opaqueWhy`): the unit is never one
// opaque function.
//
// The column, per rule: `form` is `statement`, or `none` when the refusal stands; `envelope` says whether what the
// construct leaves behind is a value of the model:
//   value      the rule refuses for a reason of control or effects (a function expression as a callback, a try local
//              shadowing a finally read, a delete used as a value): every value the step leaves is a value of its type,
//              as every value lean reads is (subset.md, "Modelling axioms");
//   boundary   the rule refuses because a value itself may be outside its declared type: a computed key or callee may
//              meet a name of Object.prototype (`h["toString"]` is a function where the type says number), a match
//              item is undefined when its group does not take part, a member the type does not declare reads
//              undefined, `**=` leaves the finite numbers, a type with no reading has no value. Every name a boundary
//              step may write is a handle read at the opaque `Any` at every read of the unit (common.mjs holdOpaque):
//              no exact reading meets a value the construct may have made outside the model, before or after the step.
// The three rules W1 keeps at `none` by design (dynamic-eval, prototype, `super` as a value under class/inheritance)
// belong to other lanes' families and are not in this table: their refusals stand.
import { ts } from '../common.mjs';

export const OPAQUE_CALLS = Object.freeze({
  'unsupported-call': { form: 'statement', envelope: 'boundary' }, // a computed callee may be a prototype function; a method with no row computes what its receiver's run-time class says
  'unsupported-member': { form: 'statement', envelope: 'boundary' }, // a member the type does not declare, a match item that may be undefined
  'unsupported-syntax': { form: 'statement', envelope: 'boundary' }, // a statement form, a build-time injection, a local component value: no value lean can type
  'unsupported-operator': { form: 'statement', envelope: 'boundary' }, // `**=`, `<<=` and the like: the number may leave the finite model
  'unsupported-type': { form: 'statement', envelope: 'boundary' }, // a type with no reading: its values have none either
  'dynamic-key': { form: 'statement', envelope: 'boundary' }, // a computed key may name Object.prototype (`__proto__` replaces the prototype), a missing field, a symbol
  'optional-chain': { form: 'statement', envelope: 'boundary' }, // an optional call through a computed, opaque, overloaded or class-field callee
  'union-type': { form: 'statement', envelope: 'boundary' }, // a union the translator cannot name (no site today)
  'function-value': { form: 'statement', envelope: 'value' }, // a callback handed to a same-file function: the statement's text and the callee's text
  'callback-form': { form: 'statement', envelope: 'value' }, // a function expression, a method reference, a named callback of another shape
  'callback-control': { form: 'statement', envelope: 'value' }, // a try or an inner-loop return inside an array callback
  'callback-result': { form: 'statement', envelope: 'value' }, // an effectful type guard, mixed flatMap results
  'exception-callback': { form: 'statement', envelope: 'value' }, // a throwing unit called through a callback inside the statement: the throw is the step's fault
  'exception-binding': { form: 'statement', envelope: 'value' }, // a try local shadowing a binding its finally reads
  'exception-return': { form: 'statement', envelope: 'value' }, // a returned alias its finally changes
  'conditional-effect': { form: 'statement', envelope: 'value' }, // an effect in a branch of a unit with no world channel: the step is the channel
  'operator-value-context': { form: 'statement', envelope: 'value' }, // an update or a sequence in a value context
  'instanceof-constructor': { form: 'statement', envelope: 'value' }, // a constructor value: the test is a boolean
  'iterator-protocol': { form: 'statement', envelope: 'value' }, // a custom Symbol.iterator method in a literal
  // delete: the member it removes is gone for every later read, anywhere. Where the type admits the member's absence (an
  // optional member, an entry of an index signature) the object stays a value of its type and the step's write of its
  // root carries the change; a required member leaves the type, which no step at the delete carries (deleteLeavesType)
  'delete': { form: 'statement', envelope: 'value' },
  // Object.freeze/seal/preventExtensions: what it changes is every LATER write to the object, anywhere (the unit's own
  // exact writes, a caller's after it returns), and those writes are outside the step: `Object.freeze(o); o.a = 2;
  // return 1` against `Object.freeze(o); return 1` would read equal while the first throws. No step at the freeze site
  // carries that, so the refusal stands (an exact reading of frozen objects is a reading, outside W1)
  'freeze': { form: 'none', why: 'a frozen object makes every later write to it throw, outside any step at the freeze: the refusal stands' },
  'assign-target': { form: 'statement', envelope: 'value' }, // Object.assign into what the unit was handed: the target and every reference in scope are written
});

// the column of a rule of this lane, or null when the rule is not this lane's or its refusal stands
export function opaqueCallsForm(rule) {
  const c = OPAQUE_CALLS[rule];
  return c && c.form !== 'none' ? c : null;
}

// the innermost statement of `fn`'s own body (never a statement of a function nested in fn: the statement holding that
// function) that holds `node`; null when none does (a parameter, a concise arrow body, a field initialiser, or node is
// not inside fn). A block is never the innermost: its statements are the steps.
export function siteStatement(node, fn) {
  let st = null;
  for (let p = node; p; p = p.parent) {
    if (p === fn) return st;
    if (ts.isFunctionLike(p) || ts.isClassLike(p)) st = null; // a statement of a nested function is not fn's own
    else if (!st && !ts.isBlock(p) && ts.isStatement(p)) st = p;
  }
  return null;
}

// the key of a site statement, as the lint hands it to the translator: its start (without trivia) and its end
export const siteKey = (n, sf) => `${n.getStart(sf)}:${n.getEnd()}`;

const unparen = (x) => { while (ts.isParenthesizedExpression(x) || ts.isNonNullExpression(x)) x = x.expression; return x; };
// why a `delete` leaves its object outside its type, or null when the type admits the member's absence: a property the
// type declares without `?`, a literal key naming one, or a key whose type the checker cannot bound (a union of
// literals, any) on a receiver that declares members
export function deleteLeavesType(checker, node) {
  let d = node; while (d && !ts.isDeleteExpression(d)) d = d.parent;
  if (!d) return null;
  const t = unparen(d.expression);
  const optional = (sym) => !!sym && (!!(sym.flags & ts.SymbolFlags.Optional) || (sym.declarations ?? []).some((x) => !!x.questionToken));
  if (ts.isPropertyAccessExpression(t)) {
    const sym = checker.getSymbolAtLocation(t.name);
    if (!sym) return `\`delete ${t.getText()}\`: the member is not declared, so no type says it may be absent`;
    return optional(sym) ? null : `\`delete ${t.getText()}\` removes a required member: every later read of it, inside the unit or after it returns, sees undefined where the type says present`;
  }
  if (ts.isElementAccessExpression(t)) {
    const rt = checker.getTypeAtLocation(t.expression);
    const kt = checker.getTypeAtLocation(t.argumentExpression);
    const keys = kt.isUnion() ? kt.types : [kt];
    if (keys.every((k) => k.isStringLiteral() || k.isNumberLiteral())) { // each literal names one member: each must be optional or an index entry
      for (const k of keys) { const p = rt.getProperty(String(k.value)); if (p ? !optional(p) : !(rt.getStringIndexType() || rt.getNumberIndexType())) return `\`delete ${t.getText()}\` may remove the required member \`${k.value}\``; }
      return null;
    }
    const declared = rt.getProperties().filter((p) => !optional(p));
    if ((kt.flags & (ts.TypeFlags.String | ts.TypeFlags.Number)) && (rt.getStringIndexType() || rt.getNumberIndexType()) && !declared.length) return null; // an index entry of a dictionary that declares no required member
    return `\`delete ${t.getText()}\`: the key may name a required member of \`${checker.typeToString(rt)}\``;
  }
  return '`delete` of this target: no type says what it removes';
}

// where a finding of a rule this table grades is read: { stmt } (the step's statement), { why } (the refusal stands), or
// null (the rule is not this table's or its form is none). One decision, taken by the lint, handed to the translator by
// the statement's key (siteKey).
export function callsOpaqueSite(checker, rule, node, fn) {
  if (!opaqueCallsForm(rule) || !fn) return null;
  const stmt = siteStatement(node, fn);
  if (!stmt) return { why: 'no statement of the unit\'s own body holds it (a parameter, a concise body, a field initialiser): the unit is never one opaque function' };
  if (ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) return { why: 'it sits in a hoisted declaration, which runs before the statement that holds it' };
  if (rule === 'delete') { const why = deleteLeavesType(checker, node); if (why) return { why }; }
  return { stmt };
}
