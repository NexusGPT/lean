// bare-return (narrowed, proved by erasure): a bare `return;` in a unit whose declared result does not admit undefined
// (`T`, `T | null`, `Promise<T>`), which strict mode rejects (TS2322) and lean refuses,
//
//     function pick(xs: Row[]): Row | null { if (!xs.length) return; ... }
//
// gets the undefined it returns written into the declared result:
//
//     function pick(xs: Row[]): Row | null | undefined { if (!xs.length) return; ... }
//
// The function returns undefined there whatever its annotation says (ECMA-262 14.10: a return with no expression
// completes with undefined), so the annotation is made true, not the code changed: a type annotation is erased when
// TypeScript emits JavaScript, and the transform checks that at the site (the file's emitted JavaScript is the same,
// under decorator metadata, where a method's result type becomes a run-time value, and under both readings of class
// fields: strict-annotate.mjs erased). A wider result is read by the callers, so the unit has none outside the file: it
// is not exported, not a member of an exported class (or the member is private), and the file exports it under no other
// name; the converter's round keeps the edit only when no new type error appears in the file (a caller here that needed
// the narrower type is a ts-strict finding, and the edit is undone). The `return;` itself stays: lean reads a bare
// return as undefined where the declared result admits it. A unit with no written result type (a callback typed by its
// context): listed.
// Why not `return undefined;`: where the declared type admits undefined the bare return is already read, and where it
// does not, `return undefined` is the same type error.
// What lane B cannot see: nothing: the emitted JavaScript is the parent's, byte for byte.
import { ts, K, src } from './util.mjs';
import { erased, applyText } from './strict-annotate.mjs';

const exported = (n) => !!(ts.getCombinedModifierFlags(n) & (ts.ModifierFlags.Export | ts.ModifierFlags.Default));

// the file names the declaration in an export (`export { f }`, `export default f`)
function exportedByName(sf, name) {
  let hit = false;
  const w = (n) => {
    if (hit) return;
    if (ts.isExportSpecifier(n) && (n.propertyName ?? n.name).text === name) hit = true;
    else if (ts.isExportAssignment(n) && ts.isIdentifier(n.expression) && n.expression.text === name) hit = true;
    else ts.forEachChild(n, w);
  };
  w(sf);
  return hit;
}

// the declaration a caller outside the file could reach the unit through, or null when there is none
function reachableFromOutside(sf, fn) {
  if (ts.isFunctionDeclaration(fn)) return exported(fn) || (fn.name && exportedByName(sf, fn.name.text)) ? 'the function is exported' : null;
  if (ts.isMethodDeclaration(fn) || ts.isGetAccessorDeclaration(fn)) {
    const cls = fn.parent;
    if (fn.modifiers?.some((m) => m.kind === K.PrivateKeyword) || (fn.name && ts.isPrivateIdentifier(fn.name))) return null;
    if (ts.isClassLike(cls) && (exported(cls) || (cls.name && exportedByName(sf, cls.name.text)))) return 'a method of an exported class';
    if (ts.isObjectLiteralExpression(cls)) return 'a method of an object literal, which may be handed on';
    return null;
  }
  if (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) {
    const d = fn.parent;
    if (!d || !ts.isVariableDeclaration(d) || d.initializer !== fn || !ts.isIdentifier(d.name)) return 'a function value with no name of its own';
    const stmt = d.parent?.parent;
    return stmt && (exported(stmt) || exportedByName(sf, d.name.text)) ? 'the function is exported' : null;
  }
  return 'not a function, method or named function value';
}

// `T` becomes `T | undefined`; `Promise<T>` of an async function becomes `Promise<T | undefined>`
function widened(sf, fn) {
  let t = fn.type;
  const isAsync = fn.modifiers?.some((m) => m.kind === K.AsyncKeyword);
  if (isAsync) {
    if (!ts.isTypeReferenceNode(t) || !ts.isIdentifier(t.typeName) || t.typeName.text !== 'Promise' || t.typeArguments?.length !== 1) return null;
    t = t.typeArguments[0];
  }
  const loose = ts.isFunctionTypeNode(t) || ts.isConstructorTypeNode(t) || ts.isConditionalTypeNode(t) || ts.isTypeOperatorNode(t) && t.operator === K.KeyOfKeyword || ts.isInferTypeNode(t);
  return { start: t.getStart(sf), end: t.end, text: loose ? `(${src(sf, t)}) | undefined` : `${src(sf, t)} | undefined` };
}

export default {
  name: 'explicit-return',
  rules: ['bare-return'],
  plan({ sf, node, file }) {
    if (!node || !ts.isReturnStatement(node) || node.expression) return { list: 'the finding is not on a bare return' };
    let fn = node.parent; while (fn && !ts.isFunctionLike(fn)) fn = fn.parent;
    if (!fn || !fn.body) return { list: 'no function' };
    if (!fn.type) return { list: 'the unit has no written result type (its context types it): a person writes it' };
    if (fn.asteriskToken) return { list: 'a generator' };
    const outside = reachableFromOutside(sf, fn);
    if (outside) return { list: `${outside}: a caller in another module reads the declared result` };
    const edit = widened(sf, fn);
    if (!edit) return { list: 'an async function whose result is not written `Promise<T>`' };
    if (!erased(file, sf.text, applyText(sf.text, [edit]))) return { list: 'the wider result would change the emitted JavaScript (decorator metadata reads it)' };
    return { edits: [edit], guard: 'erased: the emitted JavaScript is unchanged; the unit has no caller outside the file, and the round keeps it only with no new type error' };
  },
};
