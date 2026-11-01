// The opacity ladder (W1, design/w1a-opaque-mutation.md): a construct lean has no exact reading for is one opaque step,
//
//   Opaque(id, reads) -> (writes, control, world')
//
// the effect axiom of subset.md ("Modelling axioms": effect(world, op, args) = (world', result)) applied to a piece
// of the program instead of an outside call. `id` names the construct by its source text (its tokens, so a comment
// or a line break is no change and every literal is); `reads` are the values it may read; `writes` the values it may
// change; `control` how it leaves (a return value, a jump code); the world threads every effect inside it. The same id
// with equal reads on both sides is the same transition: the two runs agree because the code and its inputs are the
// same, which is the theorem lean already proves for outside calls. Over-approximating reads and writes costs proofs,
// never soundness; missing one is the only way to a false equality (the --break test of every opaque pair).
//
// This file is shared by the W1 lanes: the column (OPAQUE), the key (opaqueText, opaqueKey), the step (opaqueForm),
// the certificate row (opaqueEntry), and, for the mutation family (lane w1a), the reference test the block of a
// unit starts from (heapOperation, blockStart).
import { createHash } from 'node:crypto';
import { ts } from '../common.mjs';
import { broken } from '../tests/break.mjs'; // the one --break convention (A6): LEAN_BREAK=<mechanism> removes that mechanism

const K = ts.SyntaxKind, TF = ts.TypeFlags;

// ----- the opaque column: the lint's rows (lint/lint.mjs OPAQUE_ROWS), one per rule, each W1 lane filling its own -----
export { OPAQUE_ROWS as OPAQUE, opaqueGrade } from '../lint/lint.mjs';
import { opaqueGrade } from '../lint/lint.mjs';
// the rule a translator refusal names (`<rule>: <why>`), when the column grades it
export const gradedRule = (message) => { const m = String(message).match(/(?:^|:\d+: )([a-z][a-z-]+): /); return m && opaqueGrade(m[1]) !== 'none' ? m[1] : null; };

// ----- the key -----
// The construct's text as its tokens joined by one space: comments and layout are no part of it, every literal is
// whole. (A regex dropping `//...` would cut a string such as "http://a" to `"http:`, and two different constructs
// would share one symbol.)
export function opaqueText(nodes, sf) {
  const out = [];
  const walk = (n) => {
    if (n.kind >= K.FirstJSDocNode && n.kind <= K.LastJSDocNode) return;
    const kids = n.getChildren(sf);
    if (!kids.length) { const t = n.getText(sf); if (t) out.push(t); return; }
    for (const k of kids) walk(k);
  };
  for (const n of nodes) walk(n);
  return out.join(' ');
}
export const opaqueKey = (parts) => createHash('sha1').update(parts.join('\n\u0000')).digest('hex');

// ----- the step -----
// inputs: [{ code, d }] the values read (self first when read), outputs: [{ name, d }] the names written, jump: the
// name of the loop-control code (0 falls through), ret: { name, d, terminal } the result channel (Option<d> unless the
// construct cannot fall through). `external` declares the bodiless function in the prelude and returns its name.
// LEAN_BREAK=opaque-drop-read removes the first read and LEAN_BREAK=opaque-drop-write the first written output (the
// value then flows past the step unchanged): the mechanisms the pair tests break, each must turn a change outside the
// step into a false proof the tests refuse (tests/break.mjs); never set outside them.
export function opaqueForm({ id, external, world, inputs, outputs, jump = null, ret = null }) {
  if (broken('opaque-drop-read') && inputs.length) inputs = inputs.slice(1);
  if (broken('opaque-drop-write') && outputs.length) outputs = outputs.slice(1);
  const inTypes = ['World', ...inputs.map((i) => i.d)];
  const outTypes = ['World', ...(jump ? ['int'] : []), ...(ret ? [ret.terminal ? ret.d : `Option<${ret.d}>`] : []), ...outputs.map((o) => o.d)];
  const name = external(id, inTypes, outTypes.length === 1 ? outTypes[0] : `(${outTypes.join(', ')})`);
  const args = [world, ...inputs.map((i) => i.code)];
  const outs = [world, ...(jump ? [jump] : []), ...(ret ? [ret.name] : []), ...outputs.map((o) => o.name)];
  return { name, line: outs.length === 1 ? `var ${outs[0]} := ${name}(${args.join(', ')});` : `var (${outs.join(', ')}) := ${name}(${args.join(', ')});` };
}
// The certificate row of one step (check.mjs lanes.A.opaque): the rule(s) graded, the line, the symbol, what it reads
// and writes, the construct (`block`, `statement`, `expression`), its span and the spans of the findings it grades
// ([startLine, startCol, endLine, endCol], 1-based; A5: a validator compares them), and the statements it covers.
export const opaqueEntry = ({ rule, line, id, reads, writes, construct, span = null, findings = [], statements = null }) => ({ rule, line, id, reads, writes, construct, span, findings, statements });
// the line the translator writes per step beside the Dafny text (`// OPAQUE <unit>: <json>`), and its reading
export const opaqueLine = (unit, entry) => `// OPAQUE ${unit}: ${JSON.stringify(entry)}`;
export function opaqueLines(text) {
  const out = new Map();
  for (const m of String(text).matchAll(/^\/\/ OPAQUE (\S+): (.*)$/gm)) { let e = null; try { e = JSON.parse(m[2]); } catch { continue; } if (!out.has(m[1])) out.set(m[1], []); out.get(m[1]).push(e); }
  return out;
}
// The opaque fraction of a unit (A5): the statements its opaque steps cover over the statements of its body, each
// counted once at every depth (a block statement and the statements inside it), so a step over the whole body is 1.
export function statementCount(nodes) {
  let n = 0;
  const w = (x) => { if (ts.isFunctionLike(x) || ts.isClassLike(x)) return; if (ts.isStatement(x) && !ts.isBlock(x)) n++; ts.forEachChild(x, w); };
  for (const x of nodes) { if (ts.isStatement(x) && !ts.isBlock(x)) n++; ts.forEachChild(x, w); }
  return n;
}

// ----- references (the mutation family's block) -----
// A value of a primitive type cannot be shared; any other (an object, an array, a function, any, unknown, a type
// parameter) may be. A branded primitive (`string & { __b: 1 }`) is a primitive at run time.
const PRIM = TF.StringLike | TF.NumberLike | TF.BooleanLike | TF.BigIntLike | TF.EnumLike | TF.Null | TF.Undefined | TF.Void | TF.Never | TF.ESSymbolLike;
export function isReference(t) {
  if (!t) return true;
  if (t.isUnion()) return t.types.some(isReference);
  if (t.isIntersection()) return !t.types.some((x) => x.flags & PRIM);
  return !(t.flags & PRIM);
}
// a name of the unit (a parameter, a local, a captured local of an enclosing function), `this`, or `arguments`; a
// module binding, an import or a global is not one (a module cell is a world field: its changes are transitions)
const bindingOf = (checker, x) => {
  while (ts.isParenthesizedExpression(x) || ts.isNonNullExpression(x) || ts.isAsExpression(x) || ts.isTypeAssertionExpression?.(x) || ts.isSatisfiesExpression?.(x)) x = x.expression;
  while (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x)) { x = x.expression; while (ts.isParenthesizedExpression(x) || ts.isNonNullExpression(x) || ts.isAsExpression(x)) x = x.expression; }
  if (x.kind === K.ThisKeyword || x.kind === K.SuperKeyword) return x;
  if (!ts.isIdentifier(x)) return null;
  if (x.text === 'arguments') return x;
  const d = checker.getSymbolAtLocation(x)?.valueDeclaration;
  if (!d) return null;
  for (let p = d.parent; p; p = p.parent) if (ts.isFunctionLike(p) || ts.isClassStaticBlockDeclaration?.(p)) return x;
  return null;
};
const mentionsBinding = (checker, e) => { let hit = false; const w = (x) => { if (hit) return; if (bindingOf(checker, x) && (ts.isIdentifier(x) || x.kind === K.ThisKeyword || x.kind === K.SuperKeyword)) { hit = true; return; } ts.forEachChild(x, w); }; w(e); return hit; };
const ASSIGN = (k) => k >= K.FirstAssignment && k <= K.LastAssignment;
const NO_CONVERSION = new Set([K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.AmpersandAmpersandToken, K.BarBarToken, K.QuestionQuestionToken, K.CommaToken, K.InstanceOfKeyword]);
// The first operation in `node` that may change an object or make two names share one: it binds a reference to a name,
// writes a field or an element, deletes, hands a reference to a call or calls a method on one (a call may change what
// it is handed), calls a function value of the unit, builds a closure (it may do any of these later), runs a getter, or
// converts an object implicitly (its toString or valueOf runs). null when there is none: such a statement leaves every
// object as it was and every name apart from every other, so the value reading of it is exact and the state after it
// is the state the parameters arrived in, changed only in primitive names and in the world.
export function heapOperation(checker, node) {
  const typeOf = (x) => { try { return checker.getTypeAtLocation(x); } catch { return null; } };
  const ref = (x) => isReference(typeOf(x));
  let hit = null;
  const found = (x, why) => { hit = { node: x, why }; };
  const bindsReference = (name) => { if (ts.isIdentifier(name)) return ref(name); let any = false; const w = (x) => { if (any) return; if (ts.isBindingElement(x) && ts.isIdentifier(x.name) && ref(x.name)) any = true; ts.forEachChild(x, w); }; w(name); return any; }; // a pattern binds a reference when one of its names is one
  const walk = (x) => {
    if (hit || ts.isTypeNode(x)) return;
    if (ts.isFunctionLike(x) || ts.isClassLike(x)) return found(x, 'builds a closure');
    if ((ts.isVariableDeclaration(x) || ts.isParameter(x)) && x.name && bindsReference(x.name)) return found(x, 'binds a reference to a name');
    if (ts.isBinaryExpression(x) && ASSIGN(x.operatorToken.kind)) {
      const l = x.left;
      if (!ts.isIdentifier(l) || ref(l)) return found(x, ts.isIdentifier(l) ? 'binds a reference to a name' : 'writes a field, an element or a pattern');
    }
    if ((ts.isPrefixUnaryExpression(x) || ts.isPostfixUnaryExpression(x)) && (x.operator === K.PlusPlusToken || x.operator === K.MinusMinusToken) && !ts.isIdentifier(x.operand)) return found(x, 'writes a field or an element');
    if (ts.isDeleteExpression(x)) return found(x, 'deletes a field');
    if (ts.isYieldExpression(x)) return found(x, 'hands a value to the consumer');
    if (ts.isCallExpression(x) || ts.isNewExpression(x) || ts.isTaggedTemplateExpression(x) || ts.isDecorator(x)) {
      const callee = ts.isTaggedTemplateExpression(x) ? x.tag : x.expression;
      if (callee.kind === K.SuperKeyword || (ts.isPropertyAccessExpression(callee) && callee.expression.kind === K.SuperKeyword)) return found(x, 'calls the super constructor or method');
      const args = ts.isTaggedTemplateExpression(x) ? (ts.isTemplateExpression(x.template) ? x.template.templateSpans.map((s) => s.expression) : []) : (x.arguments ?? []);
      if (args.some((a) => ref(ts.isSpreadElement(a) ? a.expression : a))) return found(x, 'hands a reference to a call');
      if (ts.isIdentifier(callee) && bindingOf(checker, callee)) return found(x, 'calls a function value of the unit');
      if ((ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee)) && ref(callee.expression) && mentionsBinding(checker, callee.expression)) return found(x, 'calls a method on a reference');
    }
    if (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x)) {
      const sym = ts.isPropertyAccessExpression(x) ? checker.getSymbolAtLocation(x.name) : null;
      if (sym?.declarations?.some((d) => ts.isGetAccessorDeclaration(d) || ts.isSetAccessorDeclaration(d))) return found(x, 'runs an accessor');
      if (ts.isElementAccessExpression(x) && ref(x.argumentExpression)) return found(x, 'converts an object key');
    }
    if (ts.isBinaryExpression(x) && !ASSIGN(x.operatorToken.kind) && !NO_CONVERSION.has(x.operatorToken.kind) && (ref(x.left) || ref(x.right))) return found(x, 'converts an object implicitly');
    if (ts.isPrefixUnaryExpression(x) && [K.PlusToken, K.MinusToken, K.TildeToken].includes(x.operator) && ref(x.operand)) return found(x, 'converts an object implicitly');
    if (ts.isTemplateSpan(x) && ref(x.expression)) return found(x, 'converts an object implicitly');
    if ((ts.isSpreadElement(x) || ts.isSpreadAssignment(x)) && ref(x.expression)) return found(x, 'iterates or copies a reference');
    if (ts.isForInStatement(x) || ts.isForOfStatement(x)) { const init = x.initializer; if (!ts.isVariableDeclarationList(init)) return found(x, 'writes a loop target'); }
    ts.forEachChild(x, walk);
  };
  walk(node);
  return hit;
}
// The index where a unit's block starts: the first statement of the body list that holds a site (a graded finding) or
// may touch a reference (heapOperation), when the list holds a site at all; else -1. The statements before it are read
// exactly and change no object, so at the block's start every object is as the caller handed it: the parameters are
// two by two distinct trees (the value reading's own axiom, subset.md "Modelling axioms"), and no local holds a
// reference. The block then reads the names it mentions and the world, and is keyed by its text: equal keys and equal
// reads are equal states, and the same code from equal states runs the same.
export function blockStart(checker, statements, holdsSite) {
  if (!statements.some(holdsSite)) return -1;
  return statements.findIndex((s) => holdsSite(s) || !!heapOperation(checker, s));
}
