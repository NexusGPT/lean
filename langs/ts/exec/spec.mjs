// Lane B input specs: for one unit (a top-level function or Class.method), the shape of each parameter as the
// TypeScript checker sees it, so inputs can be generated without reading the body.
//   {kind:'number'|'string'|'boolean'|'bigint'|'null'|'undefined'|'literal'(values)|'array'(of)|'tuple'(items)
//    |'record'(fields:{name:{spec,optional}})|'union'(options)|'opaque'|'function'(arity)|'set'(of)|'map'(key,value)|'date'}
// Usage: node spec.mjs <file.ts> --unit <name> [--project <tsconfig>|--no-project]   -> JSON on stdout
import { ts, loadProgram, topLevelFunctions } from '../common.mjs';
import { hookTable, hookRecordSpec } from '../hooks.mjs';
import { usage, mergeUsage, newNode } from './usage.mjs';
import { decoratorTable, importOf } from '../decorators.mjs';

export function specOf(file, unitName, opts = {}) {
  const { sf, checker } = opts.loaded ?? loadProgram(file, { project: opts.project ?? true });
  const fns = topLevelFunctions(sf);
  const u = fns.get(unitName);
  if (!u) throw new Error(`no unit ${unitName}`);
  const TF = ts.TypeFlags;
  const seen = new Map();
  const defs = {};
  // the names the file mentions: a member a file never names is never asked, so only named members of a service are typed
  const named = new Set(); { const w = (n) => { if (ts.isIdentifier(n) || ts.isPrivateIdentifier(n)) named.add(n.text); ts.forEachChild(n, w); }; w(sf); }
  // the keys a record with an index signature is drawn with (recordSpec): member names and string literals of the unit
  let openKeyList = null;
  const openKeys = () => {
    if (openKeyList) return openKeyList;
    const out = []; const proto = new Set(Object.getOwnPropertyNames(Object.prototype));
    const add = (k) => { if (k && k.length <= 40 && !proto.has(k) && !out.includes(k)) out.push(k); };
    const w = (n) => { if (ts.isPropertyAccessExpression(n)) add(n.name.text); else if (ts.isElementAccessExpression(n) && ts.isStringLiteralLike(n.argumentExpression)) add(n.argumentExpression.text); else if (ts.isStringLiteralLike(n) && !ts.isImportDeclaration(n.parent) && !ts.isExportDeclaration(n.parent) && !ts.isLiteralTypeNode(n.parent)) add(n.text); ts.forEachChild(n, w); };
    w(u.node ?? sf);
    return (openKeyList = out);
  };
  let budget = 20000; // shape nodes; a type with a very large closure (a database client) ends in opaque leaves
  function spec(t, depth = 0) {
    const f = t.flags;
    if (f & (TF.Any | TF.Unknown)) return { kind: 'opaque' };
    if (f & TF.Null) return { kind: 'null' };
    if (f & (TF.Undefined | TF.Void)) return { kind: 'undefined' };
    if (depth > 5 || budget-- <= 0) return { kind: 'opaque' };
    if (f & TF.TypeParameter) { // stage 5 rank 17: a type parameter is drawn as its declared constraint (every value of T has the constraint's members); unconstrained (or constrained to unknown, any, {} or object, which name no member) it stays opaque, so equal draws may coincide as before
      const c = checker.getBaseConstraintOfType(t);
      const bare = !c || (c.flags & (TF.Any | TF.Unknown)) || ((c.flags & TF.Object) && !checker.getPropertiesOfType(c).length && !checker.getIndexInfoOfType(c, ts.IndexKind.String) && !checker.isArrayType(c) && !checker.isTupleType(c)) || (c.flags & TF.NonPrimitive);
      if (!bare) return spec(c, depth + 1);
    } // a bare one falls through to the shape it always had (a named opaque, whose draws may coincide)
    if (f & TF.StringLiteral) return { kind: 'literal', values: [t.value] };
    if (f & TF.NumberLiteral) return { kind: 'literal', values: [t.value] };
    if (f & TF.BooleanLiteral) return { kind: 'literal', values: [t.intrinsicName === 'true'] };
    if (f & TF.StringLike) return { kind: 'string' };
    if (f & TF.NumberLike) return { kind: 'number' };
    if (f & TF.BigIntLike) return { kind: 'bigint' };
    if (f & TF.BooleanLike) return { kind: 'boolean' };
    if (f & TF.Null) return { kind: 'null' };
    if (f & (TF.Undefined | TF.Void)) return { kind: 'undefined' };
    if (f & TF.EnumLike) { const lits = (t.types ?? [t]).filter((x) => x.flags & (TF.StringLiteral | TF.NumberLiteral)).map((x) => x.value); return lits.length ? { kind: 'literal', values: lits } : { kind: 'number' }; }
    if (f & TF.Union) {
      const parts = t.types;
      const lits = parts.filter((x) => x.flags & (TF.StringLiteral | TF.NumberLiteral | TF.BooleanLiteral));
      if (lits.length === parts.length) return { kind: 'literal', values: lits.map((x) => (x.flags & TF.BooleanLiteral ? x.intrinsicName === 'true' : x.value)) };
      return { kind: 'union', options: parts.map((x) => spec(x, depth + 1)) };
    }
    if (f & (TF.Intersection | TF.Object)) {
      // a callable (also an intersection of callables, as decorators are typed) answers its return type; a class answers an instance
      const csigs = checker.getSignaturesOfType(t, ts.SignatureKind.Call);
      if (csigs.length) return { kind: 'function', arity: csigs[0].getParameters().length, returns: spec(csigs[0].getReturnType(), depth + 1) };
      const nsigs = checker.getSignaturesOfType(t, ts.SignatureKind.Construct);
      if (nsigs.length) return { kind: 'class', instance: spec(nsigs[0].getReturnType(), depth + 1) };
    }
    if (f & TF.Intersection) return recordSpec(t, depth);
    if (f & TF.Object) {
      if (checker.isTupleType(t)) return { kind: 'tuple', items: checker.getTypeArguments(t).map((a) => spec(a, depth + 1)) };
      if (checker.isArrayType(t)) return { kind: 'array', of: spec(checker.getTypeArguments(t)[0], depth + 1) };
      const name = t.symbol?.name;
      if (name === 'Set' || name === 'ReadonlySet') return { kind: 'set', of: spec(checker.getTypeArguments(t)[0], depth + 1) };
      if (name === 'Map' || name === 'ReadonlyMap') { const [k, v] = checker.getTypeArguments(t); return { kind: 'map', key: spec(k, depth + 1), value: spec(v, depth + 1) }; }
      if (['AsyncIterable', 'AsyncIterableIterator', 'AsyncGenerator'].includes(name)) return { kind: 'async-iterable', of: spec(checker.getTypeArguments(t)[0], depth + 1) };
      if (name === 'Date') return { kind: 'date' };
      if (name === 'Promise') return { kind: 'promise', of: spec(checker.getTypeArguments(t)[0], depth + 1) };
      const sigs = checker.getSignaturesOfType(t, ts.SignatureKind.Call);
      if (sigs.length) return { kind: 'function', arity: sigs[0].getParameters().length, returns: spec(sigs[0].getReturnType(), depth + 1) }; // what a call of it answers
      return recordSpec(t, depth);
    }
    if (f & TF.TypeParameter) return { kind: 'tparam' }; // a value of an unknown type: drawn from a small shared pool so that equal values occur
    return { kind: 'opaque' };
  }
  function recordSpec(t, depth) {
    const key = checker.typeToString(t);
    if (seen.has(key)) return { kind: 'ref', key }; // a recursive shape: the generator unfolds it to a bounded depth
    const props = checker.getPropertiesOfType(t);
    const hasMethods = props.some((p) => checker.getSignaturesOfType(checker.getTypeOfSymbolAtLocation(p, u.node), ts.SignatureKind.Call).length);
    const ix = checker.getIndexInfoOfType(t, ts.IndexKind.String);
    if (!props.length && ix) return { kind: 'dict', value: spec(ix.type, depth + 1) };
    if (!props.length) { const o = { kind: 'opaque', name: key.slice(0, 40) }; seen.set(key, o); return o; }
    if (hasMethods) {
      // a service: a handle whose members are typed, so a call of one of its methods answers a value of the declared
      // return type (an empty list, a record, null) and not a bare handle; the handle itself stays a fake
      const o = { kind: 'service', name: key.slice(0, 40), members: {} };
      seen.set(key, o); defs[key] = o;
      // a thenable (a query builder that is awaited): what `await` yields is the argument of its `then` callback
      const thenP = props.find((x) => x.name === 'then');
      if (thenP) { try { const ts0 = checker.getSignaturesOfType(checker.getTypeOfSymbolAtLocation(thenP, u.node), ts.SignatureKind.Call)[0]; const onf = ts0 && ts0.getParameters()[0]; const onfT = onf && checker.getTypeOfSymbolAtLocation(onf, u.node); const cbT = onfT && (onfT.flags & TF.Union ? onfT.types : [onfT]).find((x) => checker.getSignaturesOfType(x, ts.SignatureKind.Call).length); const cb = cbT && checker.getSignaturesOfType(cbT, ts.SignatureKind.Call)[0]; const v = cb && cb.getParameters()[0]; if (v) o.awaits = spec(checker.getTypeOfSymbolAtLocation(v, u.node), depth + 1); } catch {} }
      for (const p of props.filter((x) => named.has(x.name)).slice(0, 80)) {
        const pt = checker.getTypeOfSymbolAtLocation(p, u.node);
        const sigs = checker.getSignaturesOfType(pt, ts.SignatureKind.Call);
        o.members[p.name] = sigs.length ? { kind: 'method', returns: spec(sigs[0].getReturnType(), depth + 1) } : { kind: 'field', spec: spec(pt, depth + 1), optional: !!(p.flags & ts.SymbolFlags.Optional) };
      }
      return o;
    }
    const out = { kind: 'record', fields: {} };
    seen.set(key, out); defs[key] = out;
    for (const p of props) out.fields[p.name] = { spec: spec(checker.getTypeOfSymbolAtLocation(p, u.node), depth + 1), optional: !!(p.flags & ts.SymbolFlags.Optional) };
    // a record with an index signature beside its fields holds entries the fields do not name: up to two optional
    // entries of the signature's type, keyed by names the unit reads as members or writes as strings and the type does
    // not declare (a generic key when it names none), never '__proto__' nor another Object.prototype name
    if (ix) {
      const keys = openKeys().filter((k) => !props.some((p) => p.name === k)).slice(0, 2);
      for (const k of keys.length ? keys : ['k0']) out.fields[k] = { spec: spec(ix.type, depth + 1), optional: true };
    }
    return out;
  }
  const params = u.params.map((p) => ({ name: ts.isIdentifier(p.name) ? p.name.text : p.name.getText(sf), optional: !!p.questionToken || !!p.initializer, spec: spec(checker.getTypeAtLocation(p.name)) }));
  // a parameter read as an error: the unit tests `x instanceof C` where C is Error or a class that extends it, and x is the
  // parameter, or a local whose value comes from it or from a `.cause` of such a value (a walk down an error's cause
  // chain, ECMA-262 20.5.6.3 InstallErrorCause). A declared type of unknown, any or Error gives no Error instance to that
  // test (an unknown draws a fake, an Error type a plain record), so such a parameter also draws an Error whose `cause`
  // is another Error, to a drawn depth (gen.mjs 'error'); the declared draw stays one option of the union
  {
    const isErr = (x, d = 0) => { if (!x || d > 8) return false; if (x.symbol?.name === 'Error') return true; const tg = x.target ?? x; if (!(tg.objectFlags & (ts.ObjectFlags.Class | ts.ObjectFlags.Interface))) return false; return checker.getBaseTypes(tg).some((b) => isErr(b, d + 1)); }; // Error, or a class or interface that extends it
    const errorClass = (c) => { if (ts.isIdentifier(c) && c.text === 'Error') return true; let t = null; try { t = checker.getTypeAtLocation(c); } catch { return false; } const sig = t && checker.getSignaturesOfType(t, ts.SignatureKind.Construct)[0]; return !!sig && isErr(sig.getReturnType()); };
    const source = (e, d = 0) => { // the parameter a value comes from, through a local's initializer, its assignments, `.cause` and parentheses
      while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e) || (ts.isPropertyAccessExpression(e) && e.name.text === 'cause'))) e = e.expression;
      if (!e || !ts.isIdentifier(e) || d > 6) return -1;
      const decl = checker.getSymbolAtLocation(e)?.valueDeclaration;
      if (decl && ts.isParameter(decl)) return u.params.indexOf(decl);
      if (decl && ts.isVariableDeclaration(decl) && decl.initializer) return source(decl.initializer, d + 1);
      return -1;
    };
    const errorParams = new Set();
    const walkErr = (n) => { if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword && errorClass(n.right)) { const i = source(n.left); if (i >= 0) errorParams.add(i); } ts.forEachChild(n, walkErr); };
    if (u.body) walkErr(u.body);
    for (const i of errorParams) { const p = params[i]; if (p && (p.spec.kind === 'opaque' || p.spec.kind === 'record' || p.spec.kind === 'ref')) p.spec = { kind: 'union', options: [{ kind: 'error', chain: 6 }, p.spec] }; }
  }
  let rt = checker.getSignatureFromDeclaration(u.fn).getReturnType();
  if (rt.symbol?.name === 'Promise') rt = checker.getTypeArguments(rt)[0];
  const literals = []; const strings = []; const regexes = [];
  // every regular expression of the file (a unit often parses its input with a module-level pattern)
  const walkRe = (n) => { if (ts.isRegularExpressionLiteral(n)) { const m = n.text.match(/^\/(.*)\/[a-z]*$/s); if (m && !regexes.includes(m[1])) regexes.push(m[1]); } ts.forEachChild(n, walkRe); };
  walkRe(sf);
  // the unit's own literals join the input pools, so a comparison against a constant can go both ways
  // a name bound to a numeric constant outside the unit (a module const, a static readonly field) is a literal of the unit too
  // the literal a name or a `CONST.field` is bound to, when its declaration carries one (a module const, a static field, a
  // property of a const object literal); a number or a string
  const constOf = (n) => { try {
    const sym = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(n) ? n.name : n); const d = sym?.valueDeclaration; if (!d) return null;
    const init = (ts.isVariableDeclaration(d) || ts.isPropertyDeclaration(d) || ts.isPropertyAssignment(d)) ? d.initializer : ts.isEnumMember(d) ? d.initializer : null;
    if (!init) return null;
    let e = init; let neg = false; if (ts.isPrefixUnaryExpression(e) && e.operator === ts.SyntaxKind.MinusToken) { neg = true; e = e.operand; }
    if (ts.isAsExpression(e)) e = e.expression;
    if (ts.isNumericLiteral(e)) return neg ? -Number(e.text) : Number(e.text);
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return e.text;
  } catch {} return null; };
  let usesLength = false;
  const walk = (n) => {
    if (ts.isNumericLiteral(n)) { const v = Number(n.text); if (Number.isFinite(v) && !literals.includes(v)) literals.push(v, v + 1, v - 1); }
    if (ts.isPropertyAccessExpression(n) && n.name.text === 'length') usesLength = true;
    if (ts.isIdentifier(n) || ts.isPropertyAccessExpression(n)) { const v = constOf(n); if (typeof v === 'number' && Number.isFinite(v) && !literals.includes(v)) literals.push(v, v + 1, v - 1); else if (typeof v === 'string' && v.length <= 80 && !strings.includes(v)) strings.push(v); }
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && n.text.length <= 80 && !strings.includes(n.text)) strings.push(n.text);
    ts.forEachChild(n, walk);
  };
  walk(u.body);
  // a unit that compares lengths meets strings at those lengths: the boundary of a cut-off is where a change shows
  if (usesLength) for (const v of [...literals]) if (Number.isInteger(v) && v >= 0 && v <= 2000) { const str = 'x'.repeat(v); if (!strings.includes(str)) strings.push(str); }
  // the receiver's fields and methods, and every fake module's imported members, typed the same way
  const receiver = u.cls ? spec(checker.getTypeAtLocation(u.cls.name)) : null;
  const imports = {};
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !st.importClause || !ts.isStringLiteral(st.moduleSpecifier)) continue;
    const members = {};
    const add = (name, node) => { const row = hookTable().hooks.find((h) => h.package === st.moduleSpecifier.text && h.hook === name); if (row) { members[name] = { kind: 'method', returns: hookRecordSpec(row), hook: row.hook }; return; } try { const t = checker.getTypeAtLocation(node); const sg = checker.getSignaturesOfType(t, ts.SignatureKind.Call); members[name] = sg.length ? { kind: 'method', returns: spec(sg[0].getReturnType(), 1) } : { kind: 'field', spec: spec(t, 1), optional: false }; } catch {} };
    if (st.importClause.name) add('default', st.importClause.name);
    const nb = st.importClause.namedBindings;
    if (nb && ts.isNamedImports(nb)) for (const el of nb.elements) add((el.propertyName ?? el.name).text, el.name);
    if (Object.keys(members).length) imports[st.moduleSpecifier.text] = { kind: 'service', name: st.moduleSpecifier.text, members };
  }
  const returns = spec(rt);
  // an answer the unit casts: where a callee's declared answer names no shape (any, unknown), the unit's own cast is the
  // best type lane B has for it, so the answer is drawn at the cast type (`(await q()) as Row[]`, `f(x) as T`, a tagged
  // template cast, through `as unknown as T`). The callee is a parameter, a member of a parameter or of the receiver, or
  // an imported function. A callee whose answers the unit casts to two different types keeps the shapeless answer.
  {
    const isShapeless = (x) => !!x && x.kind === 'opaque';
    const loose = (tn) => { try { return !!(checker.getTypeFromTypeNode(tn).flags & (TF.Any | TF.Unknown)); } catch { return false; } };
    const importsByLocal = new Map(); // a local import name -> its module and exported name
    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) || !st.importClause || !ts.isStringLiteral(st.moduleSpecifier)) continue;
      if (st.importClause.name) importsByLocal.set(st.importClause.name.text, [st.moduleSpecifier.text, 'default']);
      const nb = st.importClause.namedBindings;
      if (nb && ts.isNamedImports(nb)) for (const el of nb.elements) importsByLocal.set(el.name.text, [st.moduleSpecifier.text, (el.propertyName ?? el.name).text]);
    }
    const recv = receiver?.members ? receiver : receiver?.instance?.members ? receiver.instance : null;
    const paramOf = (id) => { try { const d = checker.getSymbolAtLocation(id)?.valueDeclaration; const i = d ? u.params.indexOf(d) : -1; return i >= 0 ? params[i] : null; } catch { return null; } };
    const callable = (x) => (x && (x.kind === 'function' || x.kind === 'method') ? x : null);
    const calleeSpec = (c) => {
      if (ts.isIdentifier(c)) { const p = paramOf(c); if (p) return callable(p.spec); const imp = importsByLocal.get(c.text); return imp ? callable(imports[imp[0]]?.members?.[imp[1]]) : null; }
      if (ts.isPropertyAccessExpression(c)) {
        const m = c.name.text;
        if (c.expression.kind === ts.SyntaxKind.ThisKeyword) return callable(recv?.members?.[m]);
        if (ts.isIdentifier(c.expression)) { const p = paramOf(c.expression); const sv = p?.spec?.kind === 'ref' ? defs[p.spec.key] : p?.spec; return callable(sv?.members?.[m]); }
      }
      return null;
    };
    const found = new Map(); // a callee spec -> [{ awaited, cast }]
    const visit = (n) => {
      if ((ts.isAsExpression(n) || ts.isTypeAssertionExpression(n)) && !loose(n.type)) {
        let e = n.expression, awaited = false;
        for (;;) {
          if (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e)) e = e.expression;
          else if (ts.isAwaitExpression(e)) { awaited = true; e = e.expression; }
          else if ((ts.isAsExpression(e) || ts.isTypeAssertionExpression(e)) && loose(e.type)) e = e.expression;
          else break;
        }
        const callee = ts.isCallExpression(e) ? e.expression : ts.isTaggedTemplateExpression(e) ? e.tag : null;
        const target = callee ? calleeSpec(callee) : null;
        if (target) { let cast = null; try { cast = spec(checker.getTypeFromTypeNode(n.type)); } catch { cast = null; } if (cast && !isShapeless(cast)) { if (!found.has(target)) found.set(target, []); found.get(target).push({ awaited, cast }); } }
      }
      ts.forEachChild(n, visit);
    };
    if (u.body) visit(u.body);
    for (const [target, casts] of found) {
      if (casts.some((c) => c.awaited !== casts[0].awaited || JSON.stringify(c.cast) !== JSON.stringify(casts[0].cast))) continue; // two readings of one answer: the answer stays shapeless
      const { awaited, cast } = casts[0]; const r = target.returns;
      if (r?.kind === 'promise' && isShapeless(r.of)) { if (awaited) r.of = cast; else if (cast.kind === 'promise') r.of = cast.of; }
      else if (isShapeless(r) && !awaited) target.returns = cast;
    }
  }
  // the receiver's fields declared as a metadata reader of the decorator table (Nest's Reflector): lane B answers them
  // with a reader of the sandbox's metadata store, never with a fake
  const metadataReaders = [];
  if (u.cls) {
    const readerOf = (typeNode) => { if (!typeNode || !ts.isTypeReferenceNode(typeNode) || !ts.isIdentifier(typeNode.typeName)) return false; const imp = importOf(checker, typeNode.typeName); return !!imp && decoratorTable().metadata.some((r) => (r.via ?? []).some((x) => x.package === imp.pkg && x.export === imp.name)); };
    for (const m of u.cls.members) {
      if (ts.isPropertyDeclaration(m) && m.name && ts.isIdentifier(m.name) && readerOf(m.type)) metadataReaders.push(m.name.text);
      if (ts.isConstructorDeclaration(m)) for (const p of m.parameters) if (ts.isIdentifier(p.name) && ts.getModifiers?.(p)?.some((x) => [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.PublicKeyword, ts.SyntaxKind.ProtectedKeyword, ts.SyntaxKind.ReadonlyKeyword].includes(x.kind)) && readerOf(p.type)) metadataReaders.push(p.name.text);
    }
  }
  // only the shapes a `ref` points at are emitted; a shape is written inline where it first occurs
  const used = new Set(); const mark = (x) => { if (!x || typeof x !== 'object') return; if (Array.isArray(x)) return x.forEach(mark); if (x.kind === 'ref' && !used.has(x.key)) { used.add(x.key); mark(defs[x.key]); } for (const v of Object.values(x)) mark(v); };
  mark(params); mark(returns); mark(receiver); mark(imports);
  const usedDefs = {}; for (const k of used) usedDefs[k] = defs[k];
  // inputs shaped by what the unit reads (usage.mjs), on this file and on the other version's (`usageFrom`): only
  // where the declared type gives no shape, plus the compared literals a declared leaf admits drawn first
  let shaped = false;
  if (opts.usageFrom || opts.usage) {
    let use = null;
    try { use = usage(sf, unitName, checker); } catch { use = null; }
    if (opts.usageFrom) { try { const o = loadProgram(opts.usageFrom, { project: false }); use = mergeUsage(use, usage(o.sf, unitName, o.checker)); } catch { /* the other side has no such unit: this side's reads */ } }
    if (use) shaped = shapeByUsage({ params, receiver, defs: usedDefs }, use);
  }
  return { unit: unitName, shaped, isMethod: !!u.cls, thisParam: !!(u.params[0] && ts.isIdentifier(u.params[0].name) && u.params[0].name.text === 'this'), className: u.className ?? null, isStatic: !!u.isStatic, accessor: u.accessor ?? null, member: u.method ?? null, isAsync: !!u.isAsync, params, returns, defs: usedDefs, literals: literals.slice(0, 40), strings: strings.slice(0, 40), regexes: regexes.slice(0, 12), receiver, imports, ...(metadataReaders.length ? { metadataReaders } : {}) };
}

// ---- inputs shaped by usage ------------------------------------------------------------------------------------
// A boundary is attached to a spec as { cmp: [values], falsy: [values], radix }: `cmp` the values a comparison in
// the unit separates at (a compared literal, its integer neighbours, a string of a compared length, a value of a
// `typeof` the unit tests), walked first and in order by gen.mjs; `falsy` the falsy values a truthiness test
// separates at, mixed in. Values are JSON: `{t:'undefined'}`, `{t:'object'}`, `{t:'array'}`, `{t:'fn'}` stand for
// a fresh value of that kind, `{t:'draw'}` for the declared generator's own draw.
const U = { t: 'undefined' }, DRAW = { t: 'draw' };
const isUndef = (v) => v && typeof v === 'object' && v.undefined === true;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function admits(spec, v, optional, defs, d = 0) {
  if (!spec || d > 6) return false;
  if (spec.kind === 'ref') return admits(defs[spec.key], v, optional, defs, d + 1);
  if (v && typeof v === 'object' && v.t === 'undefined') return optional || spec.kind === 'undefined' || spec.kind === 'opaque' || (spec.kind === 'union' && spec.options.some((o) => admits(o, v, false, defs, d + 1)));
  if (v && typeof v === 'object') return v.t === 'draw' || ['opaque', 'record', 'dict'].includes(spec.kind) && v.t === 'object' || (['opaque', 'array'].includes(spec.kind) && v.t === 'array') || (['opaque', 'function'].includes(spec.kind) && v.t === 'fn') || (spec.kind === 'union' && spec.options.some((o) => admits(o, v, false, defs, d + 1)));
  switch (spec.kind) {
    case 'opaque': return true;
    case 'string': return typeof v === 'string';
    case 'number': return typeof v === 'number';
    case 'boolean': return typeof v === 'boolean';
    case 'null': return v === null;
    case 'literal': return spec.values.some((x) => x === v);
    case 'union': return spec.options.some((o) => admits(o, v, false, defs, d + 1));
    default: return false;
  }
}
// the boundary of one usage node against a spec: the compared values the spec admits, then a draw, then the falsy
function boundaryOf(node, spec, optional, defs) {
  const cmp = [], falsy = [];
  const add = (xs, v) => { if (xs.length < 24 && admits(spec, v, optional, defs) && !xs.some((x) => same(x, v))) xs.push(v); };
  for (const c of node.compares) {
    if (isUndef(c)) add(cmp, U);
    else if (typeof c === 'number') { add(cmp, c); if (Number.isInteger(c)) { add(cmp, c + 1); add(cmp, c - 1); } }
    else if (typeof c === 'boolean') { add(cmp, c); add(cmp, !c); }
    else add(cmp, c);
  }
  for (const s of node.includes) if (typeof s === 'string') add(cmp, s);
  const rep = { object: [{ t: 'object' }, null], string: [''], number: [0], boolean: [true, false], undefined: [U], function: [{ t: 'fn' }] };
  for (const t of node.typeofs) for (const v of rep[t] ?? []) add(cmp, v);
  if (node.len) for (const c of node.len.compares) if (typeof c === 'number' && Number.isInteger(c)) for (const L of [c, c + 1, c - 1]) if (L >= 0 && L <= 2000) add(cmp, 'x'.repeat(L));
  // a set of values that is not exhaustive also walks the declared draw, so the other branch runs too
  const draw = cmp.length && !(cmp.every((v) => typeof v === 'boolean') && cmp.length === 2) && !cmp.every((v) => typeof v === 'number');
  if (node.truthy) for (const v of [null, U, false, 0, '']) add(falsy, v);
  // a compared leaf also walks the falsy values its truthiness test separates at; a leaf only tested for truthiness
  // walks the declared draw first and turns after every compared leaf (rank 1)
  if (cmp.length) { for (const v of falsy) add(cmp, v); if (draw) add(cmp, DRAW); return { cmp, falsy, rank: 0 }; }
  return falsy.length ? { cmp: [DRAW, ...falsy], falsy, rank: 1 } : null;
}
// the lengths a `.length` comparison separates at, for an array
function lengthsOf(node) {
  const out = [];
  if (node && node.len) for (const c of node.len.compares) if (typeof c === 'number' && Number.isInteger(c)) for (const L of [c, c + 1, c - 1]) if (L >= 0 && L <= 256 && !out.includes(L)) out.push(L);
  return out.length ? { cmp: out, falsy: [] } : null;
}
// an input whose declared type gives no shape (any, unknown, an unresolved import): the shape its reads give it,
// beside the original handle
function shapeOpaque(node, base, defs, depth) {
  if (!node || depth > 6) return base;
  const options = [];
  const fields = Object.keys(node.fields);
  const arrayish = (node.elem || node.array) && !node.string;
  if (arrayish) options.push({ kind: 'array', of: shapeOpaque(node.elem ?? newNode(), { kind: 'opaque' }, defs, depth + 1), ...(lengthsOf(node) ? { lengths: lengthsOf(node) } : {}) });
  else if (fields.length) { const rec = { kind: 'record', refined: true, fields: {} }; for (const k of fields) rec.fields[k] = { spec: shapeOpaque(node.fields[k], { kind: 'opaque' }, defs, depth + 1), optional: true, ...(node.fields[k].inTested ? { presence: true } : {}) }; options.push(rec); }
  const lit = (t) => node.compares.some((c) => typeof c === t);
  if (!arrayish && (node.string || lit('string') || node.includes.length || node.len || node.typeofs.includes('string'))) options.push({ kind: 'string' });
  if (node.numeric || lit('number') || node.typeofs.includes('number')) options.push({ kind: 'number' });
  if (lit('boolean') || node.typeofs.includes('boolean')) options.push({ kind: 'boolean' });
  options.push(base);
  const out = options.length === 1 ? { ...base } : { kind: 'union', options, prefer: 0 };
  const b = boundaryOf(node, out, true, defs); if (b) out.boundary = b;
  return out;
}
function refineSpec(spec, node, optional, defs, depth = 0, visiting = new Set()) {
  if (!spec || !node || depth > 8) return spec;
  switch (spec.kind) {
    case 'ref': { const d = defs[spec.key]; if (d && !visiting.has(spec.key)) { visiting.add(spec.key); defs[spec.key] = refineSpec(d, node, optional, defs, depth + 1, visiting); visiting.delete(spec.key); } return spec; }
    case 'opaque': return shapeOpaque(node, spec, defs, depth);
    case 'dict': {
      const fields = Object.keys(node.fields); if (!fields.length) return spec;
      const rec = { kind: 'record', refined: true, fields: {} };
      for (const k of fields) rec.fields[k] = { spec: refineSpec(JSON.parse(JSON.stringify(spec.value)), node.fields[k], true, defs, depth + 1, visiting), optional: true, ...(node.fields[k].inTested ? { presence: true } : {}) };
      return { kind: 'union', options: [rec, spec], prefer: 0 };
    }
    case 'record':
      for (const [k, child] of Object.entries(node.fields)) if (spec.fields[k]) spec.fields[k].spec = refineSpec(spec.fields[k].spec, child, spec.fields[k].optional, defs, depth + 1, visiting);
      break;
    case 'array': { spec.of = refineSpec(spec.of, node.elem, false, defs, depth + 1, visiting); const L = lengthsOf(node); if (L) spec.lengths = L; return spec; }
    case 'union': spec.options = spec.options.map((o) => (['record', 'ref', 'array', 'dict', 'opaque'].includes(o.kind) ? refineSpec(o, node, false, defs, depth + 1, visiting) : o)); break;
    case 'string': case 'number': case 'boolean': case 'literal': case 'null': case 'undefined': break;
    default: return spec;
  }
  if (['union', 'string', 'number', 'boolean', 'literal'].includes(spec.kind)) { const b = boundaryOf(node, spec, optional, defs); if (b) spec.boundary = b; }
  return spec;
}
// refine the parameters and the receiver's fields in place; give every walked boundary its place in the walk (an
// odometer: the first boundary turns fastest); answers whether any input was shaped
function shapeByUsage(sp, use) {
  const { params, receiver, defs } = sp;
  params.forEach((p, i) => { const node = use.params[i]?.node; if (node) p.spec = refineSpec(p.spec, node, p.optional, defs); });
  if (receiver && receiver.kind === 'service' && use.this) for (const [k, child] of Object.entries(use.this.fields)) { const m = receiver.members[k]; if (m && m.kind === 'field') m.spec = refineSpec(m.spec, child, m.optional, defs); }
  // during the walk an optional field that leads to a boundary is present, and a union draws the option that leads to
  // one, so the compared leaves are reached; leaving them out stays one of the boundary's own values when compared
  const memo = new Map();
  const leads = (x, d = 0) => {
    if (!x || typeof x !== 'object' || d > 12) return false;
    if (memo.has(x)) return memo.get(x); memo.set(x, false);
    let r = !!(x.boundary || x.lengths || x.refined);
    if (x.kind === 'ref') r = leads(defs[x.key], d + 1);
    if (x.kind === 'record') for (const f of Object.values(x.fields)) { if (leads(f.spec, d + 1)) { f.shaped = true; r = true; } }
    if (x.kind === 'union') x.options.forEach((o, j) => { if (leads(o, d + 1)) { if (x.prefer == null) x.prefer = j; r = true; } });
    if (x.kind === 'array' && leads(x.of, d + 1)) r = true;
    memo.set(x, r); return r;
  };
  params.forEach((p) => leads(p.spec)); if (receiver && receiver.members) for (const m of Object.values(receiver.members)) if (m.kind === 'field') leads(m.spec);
  let any = false; const seen = new Set(); const order = [];
  const visit = (x, d = 0) => {
    if (!x || typeof x !== 'object' || d > 40 || seen.has(x)) return; seen.add(x);
    if (Array.isArray(x)) { x.forEach((y) => visit(y, d + 1)); return; }
    for (const key of ['boundary', 'lengths']) if (x[key] && x[key].cmp && !order.includes(x[key])) { any = true; order.push(x[key]); }
    if (x.prefer != null || x.refined) any = true;
    for (const [k, v] of Object.entries(x)) if (k !== 'boundary' && k !== 'lengths') visit(v, d + 1);
    if (x.kind === 'ref' && defs[x.key]) visit(defs[x.key], d + 1);
  };
  visit(params.map((p) => p.spec)); visit(receiver);
  let radix = 1;
  for (const rank of [0, 1]) for (const b of order) if ((b.rank ?? 0) === rank && b.cmp.length) { b.radix = radix; radix = Math.min(radix * b.cmp.length, 1e9); }
  return any;
}

if (process.argv[1] && new URL(import.meta.url).pathname === (await import('node:path')).resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const file = a[0]; const unit = a[a.indexOf('--unit') + 1];
  const project = a.includes('--no-project') ? false : a.includes('--project') ? a[a.indexOf('--project') + 1] : true;
  console.log(JSON.stringify(specOf(file, unit, { project, usage: a.includes('--usage'), usageFrom: a.includes('--usage-from') ? a[a.indexOf('--usage-from') + 1] : undefined }), null, 1));
}
