// The code a unit reaches: one reading the translator's opaque module identity and the heap core's transition key
// both take (design/hash-keys.md), so the two keys agree by construction.
//
// A unit's run executes its own text and the same-file declarations it names, transitively: the functions it calls,
// the module bindings it reads (their initializers), the members of a class it uses (`this.m`, `this.f`, `super.m`,
// a member that overrides one of them in a subclass of this file), the whole class it constructs or names as a
// value, the imports it names. A call into the outside may also run file code, but only through a value it is
// handed: an instance of a class of this file (its methods), a function of this file named as a value, an
// object-literal method built here. Which classes a value may be an instance of is read from its type: every
// expression the reached code evaluates, its properties and elements, against each class of the file
// (assignability, so `any`, `unknown` and `object` take every class). A value that comes straight from the outside
// (the result of an outside call, a member of it, a local bound to one) is the outside's own object, not one this
// unit hands it.
//
//   decls: the texts of every declaration the unit's run executes (its own text first among them)
//   code:  the texts of the code a value the unit touches may carry into the outside, closed the same way
//
// A use of `eval`, `Function`, `Reflect` or `Proxy` may name any declaration through a string, so it reaches the
// whole file. The reading's assumption, stated in the design note: during the unit's run the outside runs file code
// only through values this run touches, not through values other code handed it before the call.
import { ts } from './common.mjs';

const K = ts.SyntaxKind, TF = ts.TypeFlags;
const DYNAMIC = new Set(['eval', 'Function', 'Reflect', 'Proxy']);

const isClassLike = (n) => !!n && (ts.isClassDeclaration(n) || ts.isClassExpression(n));
const declName = (n) => !!n.parent && ts.isIdentifier(n) && n.parent.name === n && (ts.isDeclaration(n.parent) || ts.isBindingElement(n.parent)); // the name a declaration binds, not a value it evaluates
// the receiver of a field read or write (`this.f`, `x.f`): the object is read, not handed to anyone; the receiver of a
// call is handed to the method, which a transition may be
const fieldReceiver = (n) => { let x = n; while (x.parent && (ts.isParenthesizedExpression(x.parent) || ts.isNonNullExpression(x.parent))) x = x.parent; const p = x.parent; return !!p && (ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) && p.expression === x && !(ts.isCallExpression(p.parent) && p.parent.expression === p); };
const typePosition = (n) => { for (let p = n; p && !ts.isSourceFile(p); p = p.parent) { if (p.kind >= K.FirstTypeNode && p.kind <= K.LastTypeNode) return true; if (ts.isExpressionWithTypeArguments(p) && p.parent && ts.isHeritageClause(p.parent) && p.parent.token === K.ImplementsKeyword) return true; if (ts.isStatement(p) || ts.isClassElement(p)) return false; } return false; };

export function makeReach(checker, sf) {
  // the classes of this file whose instances a value may be: top-level declarations and classes bound to a module const
  const classes = [];
  const findClasses = (n) => { if (isClassLike(n)) classes.push(n); ts.forEachChild(n, findClasses); };
  findClasses(sf);
  const instanceOf = new Map();
  for (const c of classes) { const sym = c.name ? checker.getSymbolAtLocation(c.name) : checker.getSymbolAtLocation(c); const t = sym ? checker.getDeclaredTypeOfSymbol(sym) : checker.getTypeAtLocation(c); instanceOf.set(c, t); }
  const memo = new Map();

  // the declaration a reference executes: an import statement, a top-level statement, or a member of a class
  function ownerOf(d) {
    if (!d || d.getSourceFile() !== sf) return null;
    if (ts.isImportSpecifier(d) || ts.isImportClause(d) || ts.isNamespaceImport(d) || ts.isImportEqualsDeclaration(d)) { let p = d; while (p && !ts.isImportDeclaration(p) && !ts.isImportEqualsDeclaration(p)) p = p.parent; return p ?? null; }
    for (let p = d; p && !ts.isSourceFile(p); p = p.parent) {
      if (p.parent && isClassLike(p.parent) && ts.isClassElement(p)) return p; // a member: its own text
      if (p.parent && ts.isSourceFile(p.parent)) return ts.isInterfaceDeclaration(p) || ts.isTypeAliasDeclaration(p) ? null : p; // types do not run
    }
    return null;
  }
  const classOfMember = (m) => (m.parent && isClassLike(m.parent) ? m.parent : null);
  const baseOf = (c) => { const h = c.heritageClauses?.find((x) => x.token === K.ExtendsKeyword)?.types?.[0]; if (!h) return null; const sym = checker.getSymbolAtLocation(h.expression); const d = sym && (sym.flags & ts.SymbolFlags.Alias ? null : sym.valueDeclaration ?? sym.declarations?.[0]); return isClassLike(d) && d.getSourceFile() === sf ? d : null; };
  const extendsClass = (c, base) => { for (let b = baseOf(c), i = 0; b && i < 32; b = baseOf(b), i++) if (b === base) return true; return false; };
  const memberName = (m) => (m.name && (ts.isIdentifier(m.name) || ts.isStringLiteral(m.name) || ts.isPrivateIdentifier(m.name)) ? m.name.text : null);
  // a class's header: its decorators and its heritage clauses (a decorator may replace a member, the base supplies the inherited ones)
  const headerOf = (c) => [...(ts.getDecorators?.(c) ?? []).map((d) => d.getText(sf)), ...(c.heritageClauses ?? []).map((h) => h.getText(sf))].join(' ');

  const objectish = (t) => !!(t.flags & (TF.Any | TF.Unknown | TF.NonPrimitive | TF.Object | TF.TypeParameter | TF.Intersection | TF.Union | TF.Index | TF.IndexedAccess | TF.Conditional));
  // the classes a value of type t may be or may lead to (through its properties, elements and type arguments)
  function classesOfType(t, out, seen, depth) {
    if (!t || seen.has(t) || depth > 3 || !objectish(t)) return;
    seen.add(t);
    for (const [c, inst] of instanceOf) if (!out.has(c) && (t.flags & (TF.Any | TF.Unknown) || checker.isTypeAssignableTo(inst, t))) out.add(c);
    if (t.flags & (TF.Any | TF.Unknown)) return;
    if (t.flags & (TF.Union | TF.Intersection)) for (const x of t.types) classesOfType(x, out, seen, depth);
    if (t.flags & TF.TypeParameter) { const c = checker.getBaseConstraintOfType(t); if (c && c !== t) classesOfType(c, out, seen, depth); }
    if (t.flags & TF.Object) {
      for (const a of checker.getTypeArguments?.(t) ?? []) classesOfType(a, out, seen, depth + 1);
      for (const p of checker.getPropertiesOfType(t).slice(0, 64)) { const d = p.valueDeclaration ?? p.declarations?.[0]; if (d && (ts.isMethodDeclaration(d) || ts.isMethodSignature(d))) continue; let pt; try { pt = checker.getTypeOfSymbol(p); } catch { continue; } classesOfType(pt, out, seen, depth + 1); }
      for (const info of checker.getIndexInfosOfType(t)) classesOfType(info.type, out, seen, depth + 1);
    }
  }
  // a value that comes straight from the outside: an outside call's result, a member of one, a local bound to one
  function fromOutside(e, depth = 0) {
    if (!e || depth > 8) return false;
    while (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e) || ts.isAwaitExpression(e)) e = e.expression;
    if (ts.isCallExpression(e) || ts.isNewExpression(e) || ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) {
      const callee = e.expression;
      if (ts.isIdentifier(callee)) return outsideName(callee);
      return fromOutside(callee, depth + 1);
    }
    if (ts.isIdentifier(e)) {
      if (outsideName(e)) return true;
      const d = checker.getSymbolAtLocation(e)?.valueDeclaration;
      return !!d && ts.isVariableDeclaration(d) && !!d.initializer && !!(ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const) && d.getSourceFile() === sf && !ts.isSourceFile(d.parent?.parent?.parent ?? sf) && fromOutside(d.initializer, depth + 1);
    }
    return false;
  }
  function outsideName(id) {
    const sym = checker.getSymbolAtLocation(id);
    if (!sym) return false;
    const d0 = sym.declarations?.[0];
    if (d0 && (ts.isImportSpecifier(d0) || ts.isImportClause(d0) || ts.isNamespaceImport(d0) || ts.isImportEqualsDeclaration(d0))) return true;
    const d = sym.valueDeclaration ?? d0;
    return !d || d.getSourceFile() !== sf;
  }

  // the closure of a set of roots: the declarations their runs execute, and the code their values may carry out
  function close(roots) {
    const owners = new Set(), wholeClasses = new Set(), carried = new Set(), valueFns = new Set(), literalMethods = new Set();
    let dynamic = false;
    const queue = [];
    const add = (o) => { if (o && !owners.has(o)) { owners.add(o); queue.push(o); } };
    const addClass = (c) => { if (!c || wholeClasses.has(c)) return; wholeClasses.add(c); add(c.parent && ts.isSourceFile(c.parent) ? c : ownerOf(c) ?? c); for (const m of c.members) add(m); addClass(baseOf(c)); }; // an instance runs its inherited members too
    const addMember = (m) => {
      add(m);
      const c = classOfMember(m); if (!c) return;
      const name = memberName(m);
      if (name !== null) for (const d of classes) if (extendsClass(d, c)) for (const x of d.members) if (memberName(x) === name) add(x); // an override in a subclass of this file
      if (ts.isConstructorDeclaration(m)) for (const x of c.members) if (ts.isPropertyDeclaration(x) && x.initializer) add(x); // field initializers run with the constructor
    };
    for (const r of roots) if (isClassLike(r)) addClass(r); else add(r); // a class root is its whole code
    while (queue.length) {
      const o = queue.shift();
      const w = (n) => {
        if (ts.isIdentifier(n) || ts.isPrivateIdentifier(n)) {
          if (ts.isIdentifier(n) && DYNAMIC.has(n.text) && outsideName(n) && !typePosition(n)) dynamic = true;
          if (!typePosition(n)) {
            const sym = checker.getSymbolAtLocation(n);
            for (const d of sym?.declarations ?? []) {
              const ow = ownerOf(d);
              if (!ow || ow === o || (n.pos >= ow.pos && n.end <= ow.end)) continue; // a local of the code walked
              const called = (ts.isCallExpression(n.parent) && n.parent.expression === n) || (ts.isNewExpression(n.parent) && n.parent.expression === n) || (ts.isPropertyAccessExpression(n.parent) && n.parent.name === n && ts.isCallExpression(n.parent.parent) && n.parent.parent.expression === n.parent);
              if (isClassLike(ow)) { addClass(ow); if (!called && !(ts.isPropertyAccessExpression(n.parent) && n.parent.expression === n)) carried.add(ow); continue; } // a class named as a value may be constructed by whoever receives it
              if (ow.parent && isClassLike(ow.parent)) addMember(ow); else add(ow);
              const fnLike = ts.isFunctionDeclaration(d) || ts.isMethodDeclaration(d) || ((ts.isVariableDeclaration(d) || ts.isPropertyDeclaration(d)) && !!d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)));
              if (!called && fnLike) valueFns.add(ow); // a function named as a value may be run by whoever receives it
            }
          }
        }
        if (n.kind === K.SuperKeyword) { let c = n.parent; while (c && !isClassLike(c)) c = c.parent; const b = c && baseOf(c); if (b) { if (ts.isCallExpression(n.parent) && n.parent.expression === n) { for (const m of b.members) if (ts.isConstructorDeclaration(m)) addMember(m); for (const m of b.members) if (ts.isPropertyDeclaration(m) && m.initializer) add(m); } } }
        if (ts.isElementAccessExpression(n) && !(ts.isStringLiteral(n.argumentExpression) || ts.isNumericLiteral(n.argumentExpression))) { const out = new Set(); classesOfType(checker.getTypeAtLocation(n.expression), out, new Set(), 2); for (const c of out) addClass(c); } // a computed member of an instance may be any member
        if (ts.isObjectLiteralExpression(n)) for (const p of n.properties) if (ts.isMethodDeclaration(p) || ts.isGetAccessorDeclaration(p) || ts.isSetAccessorDeclaration(p) || (ts.isPropertyAssignment(p) && (ts.isArrowFunction(p.initializer) || ts.isFunctionExpression(p.initializer)))) literalMethods.add(p);
        if ((ts.isExpression(n) || n.kind === K.ThisKeyword) && !ts.isLiteralExpression(n) && !declName(n) && !ts.isImportDeclaration(o) && !ts.isImportEqualsDeclaration(o) && !fieldReceiver(n) && !typePosition(n) && !fromOutside(n)) { let t; try { t = checker.getTypeAtLocation(n); } catch { t = null; } if (t && objectish(t)) { const key = t; let hit = memo.get(key); if (!hit) { hit = new Set(); classesOfType(t, hit, new Set(), 0); memo.set(key, hit); } for (const c of hit) carried.add(c); } }
        ts.forEachChild(n, w);
      };
      w(o);
      const c = classOfMember(o); if (c && !wholeClasses.has(c)) for (const dd of ts.getDecorators?.(c) ?? []) w(dd);
    }
    return { owners, carried, valueFns, literalMethods, dynamic };
  }
  const textOf = (o) => (isClassLike(o) ? `${headerOf(o)} class ${o.name?.text ?? ''}` : (classOfMember(o) ? `${classOfMember(o).name?.text ?? ''}[${headerOf(classOfMember(o))}].` : '') + o.getText(sf));
  const cache = new Map();
  // the reach of a unit's node (a top-level statement or a class member)
  function reachOf(root) {
    if (cache.has(root)) return cache.get(root);
    const own = close([root]);
    // the code the carried values bring, closed until no new class or function value appears
    let codeRoots = new Set([...own.carried, ...own.valueFns, ...own.literalMethods]);
    let code = close([...codeRoots]);
    for (let i = 0; i < 16; i++) {
      const more = [...code.carried, ...code.valueFns, ...code.literalMethods].filter((x) => !codeRoots.has(x));
      if (!more.length) break;
      for (const x of more) codeRoots.add(x);
      code = close([...codeRoots]);
    }
    const dynamic = own.dynamic || code.dynamic;
    const codeTexts = dynamic ? [sf.text] : [...new Set([...code.owners].map(textOf))].sort();
    const declTexts = dynamic ? [sf.text] : [...new Set([...own.owners, ...code.owners].map(textOf))].sort();
    const r = { decls: declTexts, code: codeTexts, classes: [...codeRoots].filter(isClassLike).map((c) => c.name?.text ?? '?') };
    cache.set(root, r);
    return r;
  }
  // whether evaluating `root` (an expression of a unit) can run a declaration of this file (a module binding with its
  // initializer, a function, a class or a member) or meet an instance of a class of this file; a name lane A gives such a
  // reference then carries its reach (design/reach-keys.md), never its text alone. An import, a global and a local of
  // the unit run no code of this file.
  reachOf.reachesFile = (root) => { const own = close([root]); return own.dynamic || own.carried.size > 0 || own.valueFns.size > 0 || [...own.owners].some((o) => o !== root && !ts.isImportDeclaration(o) && !ts.isImportEqualsDeclaration(o)); };
  // the key text of a reference: the code its evaluation can execute and the code its values may carry out
  reachOf.keyText = (root) => reachOf(root).decls.join('\n\u0000');
  return reachOf;
}
