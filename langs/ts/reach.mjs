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
  // ----- an inherited method read on `this` (design/inherited-method.md) -----
  // `this.m(args)` where m is declared by a base class, in this file or another: the call runs the base method's body
  // on the receiver (ECMA-262 13.3.2 finds m on the prototype chain, 10.2.1 runs it). Lane A reads it as one transition
  // named by the declaring class, the method and the code the method's run reaches in its own file, so two sides share
  // the transition exactly when that code is the same text. The reading holds only where the transition can stand for
  // the call: the method has a body; no class between the receiver's class and the base (nor a subclass of the
  // receiver's class in this file) overrides a member the base code names on `this`; and the base code changes nothing
  // the caller reads from its receiver: it writes no member of `this`, calls no mutator on one, never hands `this` or
  // a non-primitive member of it to anyone, and uses no `super` and no computed member of `this`. A member it names
  // on `this` that another file declares is read the same way, its reach joining the key. Anything else: null, with
  // the reason, and the caller keeps its unkeyed name (the cell audit then says ASK).
  const reaches = new Map([[sf, reachOf]]);
  const reachFor = (s) => { if (!reaches.has(s)) reaches.set(s, makeReach(checker, s)); return reaches.get(s); };
  const heritageOf = (c) => { const h = c.heritageClauses?.find((x) => x.token === K.ExtendsKeyword)?.types?.[0]; if (!h) return null; let sym = checker.getSymbolAtLocation(h.expression); if (sym && sym.flags & ts.SymbolFlags.Alias) { try { sym = checker.getAliasedSymbol(sym); } catch { return null; } } const d = sym && (sym.valueDeclaration ?? sym.declarations?.[0]); return isClassLike(d) ? d : null; };
  const chainOf = (c) => { const out = []; for (let x = c, i = 0; x && i < 32; x = heritageOf(x), i++) out.push(x); return out; };
  const PRIMITIVE = TF.StringLike | TF.NumberLike | TF.BooleanLike | TF.BigIntLike | TF.Undefined | TF.Null | TF.Void | TF.EnumLike;
  const primitiveT = (t) => !!t && !(t.flags & (TF.Any | TF.Unknown)) && (t.flags & TF.Union ? t.types.every((x) => !!(x.flags & PRIMITIVE)) : !!(t.flags & PRIMITIVE));
  const MUTATING = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'set', 'add', 'delete', 'clear', 'fill', 'copyWithin']);
  const readOnlyUse = (top) => { const p = top.parent; if (!p) return false; if ((ts.isIfStatement(p) || ts.isWhileStatement(p) || ts.isDoStatement(p)) && p.expression === top) return true; if (ts.isConditionalExpression(p) && p.condition === top) return true; if (ts.isPrefixUnaryExpression(p) && p.operator === K.ExclamationToken) return true; if (ts.isTypeOfExpression(p)) return true; return ts.isBinaryExpression(p) && [K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.EqualsEqualsToken, K.ExclamationEqualsToken].includes(p.operatorToken.kind); };
  const memberDecls = (name, recvNode) => { let t; try { t = checker.getTypeAtLocation(recvNode); } catch { return null; } const p = t && checker.getPropertyOfType(t, name); return p ? (p.declarations ?? []) : null; };
  reachOf.inheritedKeyText = (call) => {
    const f = call.expression;
    if (!ts.isPropertyAccessExpression(f) || f.expression.kind !== K.ThisKeyword || !ts.isIdentifier(f.name)) return { why: 'not a method read on this' };
    let recvClass = f.parent; while (recvClass && !isClassLike(recvClass)) recvClass = recvClass.parent;
    if (!recvClass) return { why: 'no class around this' };
    const chain = chainOf(recvClass);
    const decls = memberDecls(f.name.text, f.expression);
    const impl = decls && decls.find((d) => ts.isMethodDeclaration(d) && d.body);
    if (!impl || decls.some((d) => !ts.isMethodDeclaration(d) || d.parent !== impl.parent)) return { why: `${f.name.text} is not one method with a body` };
    if (impl.getSourceFile().isDeclarationFile) return { why: `${f.name.text} is declared without a body` };
    const declClass = impl.parent, at = chain.indexOf(declClass);
    if (at <= 0) return { why: `${f.name.text} is not inherited along the extends chain` };
    const below = chain.slice(0, at); // the receiver's class and the classes between it and the base: their members shadow the base's
    const subclasses = []; const findSub = (n) => { if (isClassLike(n) && n !== recvClass && chainOf(n).includes(recvClass)) subclasses.push(n); ts.forEachChild(n, findSub); }; findSub(sf);
    const codeMember = (m) => ts.isMethodDeclaration(m) || ts.isGetAccessorDeclaration(m) || ts.isSetAccessorDeclaration(m);
    const shadows = (name, baseIsCode = true) => [...below, ...subclasses].some((c) => c.members.some((m) => memberName(m) === name && (codeMember(m) || baseIsCode))); // a method or accessor below runs instead of the base's member; any member below replaces a base method
    const texts = [], seen = new Set();
    let why = null;
    const visit = (decl, depth) => {
      if (why || seen.has(decl)) return; seen.add(decl);
      if (depth > 16) { why = 'inherited members nest too deep'; return; }
      const s = decl.getSourceFile();
      if (s.isDeclarationFile || !decl.body) { why = `${memberName(decl) ?? '?'} has no body to read`; return; }
      texts.push(reachFor(s).keyText(decl)); // the code text, wherever the file sits: two checkouts of one tree give one key
      // the base code's own `this`: the member's body and every method or accessor it runs on `this`, in any file
      const w = (n) => {
        if (why) return;
        if (isClassLike(n)) return; // `this` inside another class is another object
        if (n.kind === K.SuperKeyword) { why = `${memberName(decl) ?? '?'} uses super`; return; }
        if (n.kind === K.ThisKeyword) {
          const p = n.parent;
          if (!(ts.isPropertyAccessExpression(p) && p.expression === n && ts.isIdentifier(p.name))) { why = `${memberName(decl) ?? '?'} hands out this or reads a computed member of it`; return; }
          const name = p.name.text;
          let top = p; while (top.parent && (ts.isPropertyAccessExpression(top.parent) || ts.isElementAccessExpression(top.parent) || ts.isNonNullExpression(top.parent) || ts.isParenthesizedExpression(top.parent)) && top.parent.expression === top) top = top.parent;
          const callee = !!top.parent && ts.isCallExpression(top.parent) && top.parent.expression === top;
          const tp = top.parent;
          const written = !!tp && ((ts.isBinaryExpression(tp) && tp.left === top && tp.operatorToken.kind >= K.FirstAssignment && tp.operatorToken.kind <= K.LastAssignment) || ((ts.isPrefixUnaryExpression(tp) || ts.isPostfixUnaryExpression(tp)) && (tp.operator === K.PlusPlusToken || tp.operator === K.MinusMinusToken)) || ts.isDeleteExpression(tp));
          if (written) { why = `${memberName(decl) ?? '?'} writes this.${name}`; return; }
          if (callee && top !== p && ts.isPropertyAccessExpression(top) && MUTATING.has(top.name.text)) { why = `${memberName(decl) ?? '?'} calls ${top.name.text} on a member of this`; return; }
          if (!callee) { let t; try { t = checker.getTypeAtLocation(top); } catch { t = null; } if (!primitiveT(t) && !readOnlyUse(top)) { why = `${memberName(decl) ?? '?'} hands out this.${name}`; return; } }
          const ds = memberDecls(name, n) ?? [];
          const code = ds.filter(codeMember);
          if (shadows(name, code.length > 0)) { why = `${name} is overridden below ${declClass.name?.text ?? 'the base'}`; return; }
          if (callee && top === p && !code.length) { why = `${memberName(decl) ?? '?'} calls this.${name}, a function held in a field`; return; }
          const bodies = code.filter((d) => d.body); // an overload's signatures run nothing: the implementation does
          if (code.length && !bodies.length) { why = `${name} has no body to read`; return; }
          for (const d of bodies) visit(d, depth + 1); // a method or accessor it runs on this: its run joins the key and the scan
        }
        ts.forEachChild(n, w);
      };
      ts.forEachChild(decl, w);
    };
    if (shadows(f.name.text)) return { why: `${f.name.text} is overridden below the base` };
    visit(impl, 0);
    if (why) return { why };
    return { base: declClass.name?.text ?? 'anonymous', key: [...new Set(texts)].sort().join('\n\u0002') };
  };
  return reachOf;
}
