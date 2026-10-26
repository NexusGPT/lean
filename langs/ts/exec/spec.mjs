// Lane B input specs: for one unit (a top-level function or Class.method), the shape of each parameter as the
// TypeScript checker sees it, so inputs can be generated without reading the body.
//   {kind:'number'|'string'|'boolean'|'bigint'|'null'|'undefined'|'literal'(values)|'array'(of)|'tuple'(items)
//    |'record'(fields:{name:{spec,optional}})|'union'(options)|'opaque'|'function'(arity)|'set'(of)|'map'(key,value)|'date'}
// Usage: node spec.mjs <file.ts> --unit <name> [--project <tsconfig>|--no-project]   -> JSON on stdout
import { ts, loadProgram, topLevelFunctions } from '../common.mjs';

export function specOf(file, unitName, opts = {}) {
  const { sf, checker } = loadProgram(file, { project: opts.project ?? true });
  const fns = topLevelFunctions(sf);
  const u = fns.get(unitName);
  if (!u) throw new Error(`no unit ${unitName}`);
  const TF = ts.TypeFlags;
  const seen = new Map();
  const defs = {};
  // the names the file mentions: a member a file never names is never asked, so only named members of a service are typed
  const named = new Set(); { const w = (n) => { if (ts.isIdentifier(n) || ts.isPrivateIdentifier(n)) named.add(n.text); ts.forEachChild(n, w); }; w(sf); }
  let budget = 20000; // shape nodes; a type with a very large closure (a database client) ends in opaque leaves
  function spec(t, depth = 0) {
    const f = t.flags;
    if (f & (TF.Any | TF.Unknown)) return { kind: 'opaque' };
    if (f & TF.Null) return { kind: 'null' };
    if (f & (TF.Undefined | TF.Void)) return { kind: 'undefined' };
    if (depth > 5 || budget-- <= 0) return { kind: 'opaque' };
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
    return out;
  }
  const params = u.params.map((p) => ({ name: ts.isIdentifier(p.name) ? p.name.text : p.name.getText(sf), optional: !!p.questionToken || !!p.initializer, spec: spec(checker.getTypeAtLocation(p.name)) }));
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
    const add = (name, node) => { try { const t = checker.getTypeAtLocation(node); const sg = checker.getSignaturesOfType(t, ts.SignatureKind.Call); members[name] = sg.length ? { kind: 'method', returns: spec(sg[0].getReturnType(), 1) } : { kind: 'field', spec: spec(t, 1), optional: false }; } catch {} };
    if (st.importClause.name) add('default', st.importClause.name);
    const nb = st.importClause.namedBindings;
    if (nb && ts.isNamedImports(nb)) for (const el of nb.elements) add((el.propertyName ?? el.name).text, el.name);
    if (Object.keys(members).length) imports[st.moduleSpecifier.text] = { kind: 'service', name: st.moduleSpecifier.text, members };
  }
  const returns = spec(rt);
  // only the shapes a `ref` points at are emitted; a shape is written inline where it first occurs
  const used = new Set(); const mark = (x) => { if (!x || typeof x !== 'object') return; if (Array.isArray(x)) return x.forEach(mark); if (x.kind === 'ref' && !used.has(x.key)) { used.add(x.key); mark(defs[x.key]); } for (const v of Object.values(x)) mark(v); };
  mark(params); mark(returns); mark(receiver); mark(imports);
  const usedDefs = {}; for (const k of used) usedDefs[k] = defs[k];
  return { unit: unitName, isMethod: !!u.cls, className: u.className ?? null, isStatic: !!u.isStatic, isAsync: !!u.isAsync, params, returns, defs: usedDefs, literals: literals.slice(0, 40), strings: strings.slice(0, 40), regexes: regexes.slice(0, 12), receiver, imports };
}

if (process.argv[1] && new URL(import.meta.url).pathname === (await import('node:path')).resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const file = a[0]; const unit = a[a.indexOf('--unit') + 1];
  const project = a.includes('--no-project') ? false : a.includes('--project') ? a[a.indexOf('--project') + 1] : true;
  console.log(JSON.stringify(specOf(file, unit, { project }), null, 1));
}
