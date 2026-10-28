// The library rows of stage 5 (design/library-rows.md): built-ins the ordinary lane reads from the rows of
// translate/library.json whose `lane` is `ordinary`. The lint and the translator share these predicates, so the lint
// admits exactly the calls the translator reads.
import { ts, isArrayLike } from './common.mjs';

// in-place rows used as values: the removed element or run is the value, and the receiver changes
export const ARRAY_VALUE_MUTATORS = new Set(['pop', 'shift', 'splice']);
// the text depends on the host's locale data (ECMA-402): a world read, never a pure function
export const LOCALE_READS = new Set(['toLocaleString', 'toLocaleLowerCase', 'toLocaleUpperCase']);

const strip = (x) => { while (ts.isParenthesizedExpression(x) || ts.isAsExpression(x) || ts.isNonNullExpression(x) || ts.isSatisfiesExpression(x) || ts.isTypeAssertionExpression(x)) x = x.expression; return x; };
const nonNull = (t) => (t.flags & ts.TypeFlags.Union ? t.types.filter((x) => !(x.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null))) : [t]);
const FRESH_ARRAY_METHODS = new Set(['slice', 'concat', 'map', 'filter', 'flat', 'flatMap', 'toSorted', 'toReversed']);

// an array no other name reaches: a literal, `new Array(n)`, `Array(n)`, `Array.from`, `Array.of`, `Object.keys`,
// `Object.values`, `Object.entries`, a string's `split`, or an array method whose row returns a fresh array; `fill`
// returns its receiver, so it is fresh when its receiver is. isGlobal(id): the name is the global built-in.
export function freshArray(checker, x, isGlobal) {
  x = strip(x);
  if (x.flags & ts.NodeFlags.OptionalChain) return false;
  if (ts.isArrayLiteralExpression(x)) return !x.elements.some(ts.isSpreadElement) || x.elements.every((el) => !ts.isSpreadElement(el) || nonNull(checker.getTypeAtLocation(el.expression)).every((t) => isArrayLike(checker, t)));
  if (ts.isNewExpression(x)) return ts.isIdentifier(x.expression) && x.expression.text === 'Array' && isGlobal(x.expression);
  if (!ts.isCallExpression(x)) return false;
  const f = strip(x.expression);
  if (ts.isIdentifier(f)) return f.text === 'Array' && isGlobal(f);
  if (!ts.isPropertyAccessExpression(f)) return false;
  const r = f.expression, name = f.name.text;
  if (ts.isIdentifier(r) && isGlobal(r)) return (r.text === 'Array' && (name === 'from' || name === 'of')) || (r.text === 'Object' && ['keys', 'values', 'entries'].includes(name));
  const parts = nonNull(checker.getTypeAtLocation(r));
  if (!parts.length) return false;
  if (name === 'split') return parts.every((t) => !!(t.flags & ts.TypeFlags.StringLike));
  if (!parts.every((t) => isArrayLike(checker, t))) return false;
  if (FRESH_ARRAY_METHODS.has(name)) return true;
  return name === 'fill' && freshArray(checker, r, isGlobal);
}

// where a mutator used as a value runs: the statement that runs it on every path, and the part of that statement in
// which no other read of the receiver may appear (the change is bound before the statement). null when the call sits
// under a condition, a short circuit's right side, an optional chain, a loop header or a callback.
export function unconditionalSite(e) {
  const K = ts.SyntaxKind;
  const shortCircuit = new Set([K.AmpersandAmpersandToken, K.BarBarToken, K.QuestionQuestionToken, K.AmpersandAmpersandEqualsToken, K.BarBarEqualsToken, K.QuestionQuestionEqualsToken]);
  let x = e;
  for (;;) {
    const p = x.parent;
    if (!p) return null;
    if (ts.isParenthesizedExpression(p) || ts.isAsExpression(p) || ts.isNonNullExpression(p) || ts.isSatisfiesExpression(p) || ts.isTypeAssertionExpression(p) || ts.isAwaitExpression(p) || ts.isTemplateSpan(p) || ts.isTemplateExpression(p) || ts.isArrayLiteralExpression(p) || ts.isTypeOfExpression(p) || (ts.isPrefixUnaryExpression(p) && p.operator !== K.PlusPlusToken && p.operator !== K.MinusMinusToken)) { x = p; continue; }
    if (ts.isBinaryExpression(p)) { if (p.right === x && shortCircuit.has(p.operatorToken.kind)) return null; if (p.left === x && p.operatorToken.kind >= K.FirstAssignment && p.operatorToken.kind <= K.LastAssignment) return null; x = p; continue; }
    if (ts.isConditionalExpression(p)) { if (p.condition !== x) return null; x = p; continue; }
    if (ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p) || ts.isCallExpression(p)) { if (p.questionDotToken || (p.flags & ts.NodeFlags.OptionalChain)) return null; x = p; continue; }
    if (ts.isPropertyAssignment(p) && p.initializer === x) { x = p.parent; continue; }
    if (ts.isVariableDeclaration(p) && p.initializer === x) { const st = p.parent?.parent; return st && ts.isVariableStatement(st) ? { stmt: st, scope: p } : null; }
    if (ts.isExpressionStatement(p) || ts.isReturnStatement(p)) return { stmt: p, scope: p };
    if (ts.isIfStatement(p) && p.expression === x) return { stmt: p, scope: x };
    return null;
  }
}

// how often a name with this symbol is read inside a node (the receiver itself counts once)
export function readsOf(checker, node, sym) {
  let k = 0;
  const w = (x) => { if (ts.isIdentifier(x) && checker.getSymbolAtLocation(x) === sym) k++; ts.forEachChild(x, w); };
  w(node);
  return k;
}

// a value whose JavaScript ToString is fixed by its own value: string, number, bigint, boolean (and their literals)
export const primitiveText = (t) => nonNull(t).length > 0 && !(t.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)) && nonNull(t).every((x) => !!(x.flags & (ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.BigIntLike | ts.TypeFlags.BooleanLike | ts.TypeFlags.EnumLike)));

// ----- the library member rows (design/library-rows.md, "2026-10-28 library members") -----
// One row per library member the census names, with how lean reads it: `admitted` (exact, a transition, or an
// uninterpreted function the same on both sides) or `refused` (the lint names the rule and tells the developer what to
// write). The lint takes every message of these members from here, so a refusal and its row cannot drift apart;
// tests/pairs/library_members/validate.mjs runs each row against the engine on three inputs or more before it lands.
// `census` counts the findings of the census at 6661006 (nexus tree, n8n tree).
export const LIBRARY_MEMBER_ROWS = [
  { id: 'push-apply-value', member: 'Array.prototype.push used as a value (a.push.apply(a, b), a.push.call(a, x))', status: 'refused', rule: 'unsupported-member', section: 'push 23.1.3.23; Function.prototype.apply', census: { nexus: 0, n8n: 234 },
    why: 'the call goes through the function value `a.push`, so the receiver is the first operand and the changed array is not the receiver of a method call; the translator rebinds the receiver of a push statement only',
    message: (what) => `\`.${what}\` used as a value (\`a.${what}.apply(a, b)\`, \`a.${what}.call(a, x)\`) is not read; call it on the array: \`a.${what}(...b)\` or \`a.${what}(x)\`` },
  { id: 'tostring-object', member: 'toString() on a value that may be an object', status: 'refused', rule: 'unsupported-call', section: 'Object.prototype.toString; Number 21.1.3.6; String 22.1.3.29', census: { nexus: 4, n8n: 55 },
    why: 'an object reads Object.prototype.toString or its own toString, a prototype the unit does not own; a string, a number, a bigint and a boolean are fixed by their value (rows Number/BigInt/Boolean/String.prototype.toString)',
    message: (type) => `.toString() on ${type} reads Object.prototype.toString or the object's own toString, a prototype this unit does not own; narrow the value to a string, a number or a boolean first (typeof), or use a template literal on the narrowed value` },
  { id: 'locale-in-callback', member: 'toLocaleLowerCase / toLocaleUpperCase / toLocaleString inside an iteration callback', status: 'admitted', reading: 'transition', section: 'String.prototype.toLocaleLowerCase 22.1.3.26; Number.prototype.toLocaleString 21.1.3.4; ECMA-402', census: { nexus: 8, n8n: 29 },
    why: 'the host locale decides the text: a world read, one transition per element in index order; map, filter, find, findIndex, some, every, flatMap and reduce run their callback in that order, short circuits included',
    message: (name) => `.${name}() reads the host's locale (a world read); call it in a map, filter, find, findIndex, some, every, flatMap or reduce callback, or outside the callback (a sort comparator has no defined order of transitions)` },
  { id: 'match-index', member: 'RegExpExecArray.index and RegExpMatchArray.index', status: 'refused', rule: 'unsupported-member', section: 'RegExpBuiltinExec 22.2.7.2', census: { nexus: 24, n8n: 4 },
    why: 'the index of a match is a function of the pattern and the string only for a non-global, non-sticky literal bound to a const (execMatchMember); a match of a global pattern, of an exec loop or of matchAll depends on lastIndex or on the iterator',
    message: () => '`.index` of a match is read for a match of a non-global regular expression literal bound to a const (`const m = /re/.exec(s)`, `s.match(/re/)`), or take the first position with `s.search(/re/)`; a match from a global pattern, an exec loop or matchAll depends on lastIndex' },
  { id: 'match-groups', member: 'RegExpExecArray.groups and RegExpMatchArray.groups', status: 'refused', rule: 'unsupported-member', section: 'RegExpBuiltinExec 22.2.7.2', census: { nexus: 3, n8n: 25 },
    why: 'the named captures are an object built by the match; the sequence reading of a match carries the numbered captures only',
    message: () => '`.groups` of a match is not read; name the capture by position (`m[1]`) of a non-global regular expression literal match' },
  { id: 'method-on-union', member: 'a method called on a union whose members do not share it', status: 'refused', rule: 'unsupported-call', section: 'TypeScript narrowing; Array.isArray, typeof', census: { nexus: 0, n8n: 21 },
    why: 'on a value that is a string, an array or a record the method resolves differently, or throws; the call is read after the value is narrowed to one of them',
    message: (name, type) => `method .${name}() on ${type} is outside the subset; narrow the union with typeof or Array.isArray first so the call has one receiver type` },
  { id: 'matchall-named', member: 'String.prototype.matchAll with a pattern held in a name', status: 'admitted', reading: 'uninterpreted', section: 'String.prototype.matchAll 22.1.3.14, 22.2.6.9', census: { nexus: 15, n8n: 2 },
    why: 'matchAll starts at the pattern object\'s lastIndex and leaves the original unchanged; a const g pattern whose every use in the file is the pattern argument of matchAll, match, replace, replaceAll, split or search, and that no other file can reach, keeps lastIndex 0, so the matches are one function of the pattern and the string, the same on both sides',
    message: () => "matchAll starts at its pattern's lastIndex, which another call may have moved; pass a regular expression literal with the g flag, a string, or a const g pattern that nothing in the file runs with exec or test and that the file does not export" },
  { id: 'sort-default-statement', member: 'a.sort() as a statement with no comparator', status: 'refused', rule: 'unsupported-call', section: 'Array.prototype.sort 23.1.3.30', census: { nexus: 3, n8n: 6 },
    why: 'the statement form rebinds the receiver by the comparator\'s function; the value form `a = [...a].sort()` is read as the default sort, one function of the sequence',
    message: () => 'sort as a statement needs one comparator, an arrow of two parameters; with the default order write `xs = [...xs].sort()`' },
  { id: 'optional-chain-mutator', member: 'a?.pop() / a?.shift() / a?.splice() on a receiver that may be absent', status: 'refused', rule: 'unsupported-call', section: 'Array.prototype.pop 23.1.3.22, shift 23.1.3.27, splice 23.1.3.31; OptionalChain', census: { nexus: 4, n8n: 3 },
    why: 'the call reads as the removed value of the present receiver but does not rebind the receiver, so a later read of it would see the old array',
    message: (name) => `.${name}() in an optional chain changes a receiver that may be absent; check it first` },
  { id: 'world-field-mutator', member: 'this.field.pop() / shift() / splice() used as a value', status: 'refused', rule: 'unsupported-call', section: 'Array.prototype.pop 23.1.3.22, shift 23.1.3.27, splice 23.1.3.31', census: { nexus: 5, n8n: 4 },
    why: 'the array lives in the world (a field of this, a module cell, a parameter\'s element): the removal is a read and a write of the field in one statement, and the translator rebinds a local only',
    message: (name, what) => `.${name}() as a value changes \`${what}\`; call it on a local array or on a fresh one` },
];
export const memberRow = (id) => LIBRARY_MEMBER_ROWS.find((r) => r.id === id);

// a regular expression the unit holds as a fresh object, with its flags: a literal, or `new RegExp(pattern, "<flags>")`
// whose flags are a string literal. isGlobal(id): the name is the global built-in.
export function freshRegexFlags(x, isGlobal) {
  x = strip(x);
  if (ts.isRegularExpressionLiteral(x)) return x.text.slice(x.text.lastIndexOf('/') + 1);
  if (ts.isNewExpression(x) && ts.isIdentifier(x.expression) && x.expression.text === 'RegExp' && isGlobal(x.expression) && x.arguments?.length === 2 && ts.isStringLiteralLike(x.arguments[1])) return x.arguments[1].text;
  return null;
}

// the String methods that take a pattern and leave its lastIndex where they found it: matchAll copies the pattern,
// split constructs a copy, search saves and restores lastIndex, match and replace(All) with the g flag set it to 0 first
// and end with it at 0 (RegExp.prototype [ @@match ], [ @@replace ], [ @@split ], 22.2.6.12 for search)
const LASTINDEX_SAFE = new Set(['matchAll', 'match', 'replace', 'replaceAll', 'split', 'search']);

// a `const` global pattern whose lastIndex stays 0: the declaration is a fresh g (not y) regular expression, the file
// does not export it, and every other mention of the name in the file is the first argument of one of LASTINDEX_SAFE on a
// string. Anything else (exec, test, a lastIndex write, a call, a store, an export) could move lastIndex or hand the object
// to code that does. Returns the flags, or null.
export function regexNeverAdvanced(checker, id, sf, isGlobal) {
  const sym = checker.getSymbolAtLocation(id), d = sym?.valueDeclaration;
  if (!d || !ts.isVariableDeclaration(d) || !ts.isIdentifier(d.name) || !(d.parent.flags & ts.NodeFlags.Const) || !d.initializer || d.getSourceFile() !== sf) return null;
  const flags = freshRegexFlags(d.initializer, isGlobal);
  if (flags === null || !flags.includes('g') || flags.includes('y')) return null;
  const stmt = d.parent.parent;
  if (stmt && ts.isVariableStatement(stmt) && stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) return null;
  if (stmt?.parent === sf && !ts.isExternalModule(sf)) return null; // a top-level const of a script file is a global every script sees
  let ok = true;
  const walk = (n) => {
    if (!ok) return;
    if (ts.isExportSpecifier(n) && !n.parent.parent.moduleSpecifier && (n.propertyName ?? n.name).text === d.name.text) { ok = false; return; } // `export { RE }`
    if (ts.isIdentifier(n) && n.text === d.name.text && n !== d.name) {
      const s = checker.getSymbolAtLocation(n) ?? checker.getShorthandAssignmentValueSymbol?.(n.parent);
      if (s === sym || (ts.isShorthandPropertyAssignment(n.parent) && checker.getShorthandAssignmentValueSymbol(n.parent) === sym)) {
        const p = n.parent, call = p && ts.isCallExpression(p) ? p : null;
        const safe = call && call.arguments[0] === n && ts.isPropertyAccessExpression(call.expression) && LASTINDEX_SAFE.has(call.expression.name.text) && !call.expression.questionDotToken && !!(checker.getTypeAtLocation(call.expression.expression).flags & ts.TypeFlags.StringLike);
        if (!safe) ok = false;
      }
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return ok ? flags : null;
}
