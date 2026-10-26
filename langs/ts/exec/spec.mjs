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
  function spec(t, depth = 0) {
    if (depth > 5) return { kind: 'opaque' };
    const f = t.flags;
    if (f & (TF.Any | TF.Unknown)) return { kind: 'opaque' };
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
    if (f & TF.Intersection) return recordSpec(t, depth);
    if (f & TF.Object) {
      if (checker.isTupleType(t)) return { kind: 'tuple', items: checker.getTypeArguments(t).map((a) => spec(a, depth + 1)) };
      if (checker.isArrayType(t)) return { kind: 'array', of: spec(checker.getTypeArguments(t)[0], depth + 1) };
      const name = t.symbol?.name;
      if (name === 'Set' || name === 'ReadonlySet') return { kind: 'set', of: spec(checker.getTypeArguments(t)[0], depth + 1) };
      if (name === 'Map' || name === 'ReadonlyMap') { const [k, v] = checker.getTypeArguments(t); return { kind: 'map', key: spec(k, depth + 1), value: spec(v, depth + 1) }; }
      if (name === 'Date') return { kind: 'date' };
      if (name === 'Promise') return spec(checker.getTypeArguments(t)[0], depth + 1);
      const sigs = checker.getSignaturesOfType(t, ts.SignatureKind.Call);
      if (sigs.length) return { kind: 'function', arity: sigs[0].getParameters().length };
      return recordSpec(t, depth);
    }
    if (f & TF.TypeParameter) return { kind: 'opaque' };
    return { kind: 'opaque' };
  }
  function recordSpec(t, depth) {
    const key = checker.typeToString(t);
    if (seen.has(key)) return { kind: 'ref', key }; // a recursive shape: the generator unfolds it to a bounded depth
    const props = checker.getPropertiesOfType(t);
    const hasMethods = props.some((p) => checker.getSignaturesOfType(checker.getTypeOfSymbolAtLocation(p, u.node), ts.SignatureKind.Call).length);
    const ix = checker.getIndexInfoOfType(t, ts.IndexKind.String);
    if (!props.length && ix) return { kind: 'dict', value: spec(ix.type, depth + 1) };
    if (!props.length || hasMethods) { const o = { kind: 'opaque', name: key.slice(0, 40) }; seen.set(key, o); return o; }
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
  const walk = (n) => {
    if (ts.isNumericLiteral(n)) { const v = Number(n.text); if (Number.isFinite(v) && !literals.includes(v)) literals.push(v, v + 1, v - 1); }
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && n.text.length <= 80 && !strings.includes(n.text)) strings.push(n.text);
    ts.forEachChild(n, walk);
  };
  walk(u.body);
  return { unit: unitName, isMethod: !!u.cls, className: u.className ?? null, isStatic: !!u.isStatic, isAsync: !!u.isAsync, params, returns: spec(rt), defs, literals: literals.slice(0, 40), strings: strings.slice(0, 40), regexes: regexes.slice(0, 12) };
}

if (process.argv[1] && new URL(import.meta.url).pathname === (await import('node:path')).resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const file = a[0]; const unit = a[a.indexOf('--unit') + 1];
  const project = a.includes('--no-project') ? false : a.includes('--project') ? a[a.indexOf('--project') + 1] : true;
  console.log(JSON.stringify(specOf(file, unit, { project }), null, 1));
}
